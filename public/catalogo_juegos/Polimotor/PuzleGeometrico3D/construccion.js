/**
 * ConstruccionPuzle — la estructura que crece en el centro del mundo (window.ConstruccionPuzle).
 *
 * Dibuja la plataforma de construcción con sus luces, las posiciones del nivel (cada una con su
 * Graphics en el orden de pintado isométrico), la guía fantasma que respira, los resaltes de las
 * posiciones válidas mientras se arrastra, la sombra del bloque, la regla de altura junto a la
 * grúa y los efectos de encaje (descenso, asentamiento, onda luminosa, polvo). No decide nada:
 * la escena le dice qué posición mostrar o llenar.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorPuzle; };
    var S = function () { return global.SolidosPuzle; };
    var R = function () { return global.ReglasPuzle; };
    var Phaser = global.Phaser;

    var CENTRO_X = 812, PISO_Y = 702, TOPE_Y = 150, ANCHO_MAX = 470;
    // tope de escala: más grande, la losa llegaba hasta los árboles y la obra se veía muy alta
    var ESC_MAX = 1.1;
    var REGLA_X = 1046;

    function Construccion(scene) {
        this.scene = scene;
        this.anim = new (M().Animador)();
        this.lista = [];
        this.g = {};
        this.puestas = {};
        this.esc = 1;
        this.origen = { x: CENTRO_X, y: PISO_Y };
        this.sol = {};
        this.hBase = new (M().Horno)(scene, 240, 300, 1160, 560, { mundo: true, prof: 100 });
        this.gLucesBase = scene.add.graphics().setDepth(101);
        this.gSombraTorre = scene.add.graphics().setDepth(102);
        this.gResaltes = scene.add.graphics().setDepth(103).setBlendMode(Phaser.BlendModes.ADD);
        this.gSombra = scene.add.graphics().setDepth(104);
        this.gOnda = scene.add.graphics().setDepth(165).setBlendMode(Phaser.BlendModes.ADD);
        this.gRegla = scene.add.graphics().setDepth(168);
        this.fantasma = null;
        this.solFantasma = null;
        this.luzCuspide = scene.add.image(0, 0, "p-luz").setDepth(166).setTint(0xffd43b).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
        this.banderas = [];
        this.particulas = new (M().Particulas)(scene, 50, 620);
        this.guiaId = null;
        this.guiaModo = "normal";
        this.pistaFlash = 0;
        this.brillos = {};
        this.capaLuz = {};
        this.reglaFoco = null;
        this.luzBase = 0;
        this.luzBaseObj = 0;
        this.oro = 0;
    }

    // ------------------------------------------------------------------ nivel

    /**
     * lista: posiciones de ReglasPuzle.piezasNivel. nivel: { escala, clave }. aspecto(id) → { color, deco }
     * para pintar lo que se vaya poniendo.
     */
    Construccion.prototype.configurar = function (lista, nivel, aspecto) {
        var self = this;
        this.anim.limpiar();
        Object.keys(this.sol).forEach(function (k) { self.sol[k].destruir(); });
        this.banderas.forEach(function (b) { b.destroy(); });
        this.banderas = [];
        this.g = {};
        this.sol = {};
        this.puestas = {};
        this.brillos = {};
        this.capaLuz = {};
        this.lista = lista.slice();
        this.nivel = nivel || {};
        this.clave = this.nivel.clave || "";
        this.aspecto = aspecto;
        this.esc = Number(this.nivel.escala) || 1;
        this.oro = 0;
        this.luzBase = 0;
        this.luzBaseObj = 0.25;
        this.luzCuspide.setAlpha(0);
        this.guia(null);
        // caja total y origen: centrada en x y apoyada en el piso
        var t = { x0: Infinity, y0: Infinity, z0: 0, x1: -Infinity, y1: -Infinity, z1: 0 };
        lista.forEach(function (p) {
            t.x0 = Math.min(t.x0, p.caja.x0); t.y0 = Math.min(t.y0, p.caja.y0);
            t.x1 = Math.max(t.x1, p.caja.x1); t.y1 = Math.max(t.y1, p.caja.y1);
            t.z1 = Math.max(t.z1, p.caja.z1);
        });
        this.total = t;
        // las figuras se generan al azar: la escala del nivel es un tope y se achica si no cabe
        var e1 = [];
        [t.x0, t.x1].forEach(function (x) { [t.y0, t.y1].forEach(function (y) { [0, t.z1].forEach(function (z) { e1.push(S().proyectar(x, y, z, 1)); }); }); });
        var ancho1 = Math.max.apply(null, e1.map(function (q) { return q.x; })) - Math.min.apply(null, e1.map(function (q) { return q.x; }));
        var alto1 = Math.max.apply(null, e1.map(function (q) { return q.y; })) - Math.min.apply(null, e1.map(function (q) { return q.y; }));
        this.esc = Math.max(0.6, Math.min(this.esc, ESC_MAX, ANCHO_MAX / ancho1, (PISO_Y - TOPE_Y) / alto1));
        var esquinas = [];
        [t.x0, t.x1].forEach(function (x) { [t.y0, t.y1].forEach(function (y) { [0, t.z1].forEach(function (z) { esquinas.push(S().proyectar(x, y, z, self.esc)); }); }); });
        var minX = Math.min.apply(null, esquinas.map(function (q) { return q.x; }));
        var maxX = Math.max.apply(null, esquinas.map(function (q) { return q.x; }));
        var maxY = Math.max.apply(null, esquinas.map(function (q) { return q.y; }));
        var minY = Math.min.apply(null, esquinas.map(function (q) { return q.y; }));
        var oy = PISO_Y - maxY;
        if (oy + minY < TOPE_Y) oy = TOPE_Y - minY;
        this.origen = { x: CENTRO_X - (minX + maxX) / 2, y: oy };
        // orden de pintado: fijo por nivel (las cajas no cambian)
        var orden = R().ordenPintado(lista.map(function (p) { return { id: p.id, caja: p.caja, orden: p.orden }; }));
        this.rango = {};
        orden.forEach(function (id, i) { self.rango[id] = i; });
        // cada posición es un sólido horneado (se pinta cuando el bloque llega)
        lista.forEach(function (p) {
            var so = new (M().Solido)(self.scene, p.def, self.esc, 12, 110 + self.rango[p.id] * 2);
            var a = self.punto(p.id);
            so.img.setPosition(a.x, a.y).setVisible(false);
            self.sol[p.id] = so;
            self.g[p.id] = so.img;
        });
        this.pintarPlataforma();
        this.pintarRegla(0);
    };

    Construccion.prototype.pieza = function (id) { return this.lista.filter(function (p) { return p.id === id; })[0] || null; };

    /** Ancla en pantalla (centro proyectado de su caja) de una posición. */
    Construccion.prototype.punto = function (id) {
        var p = this.pieza(id);
        if (!p) return { x: CENTRO_X, y: PISO_Y };
        var c = S().centroCaja(p.caja);
        var q = S().proyectar(c[0], c[1], c[2], this.esc);
        return { x: this.origen.x + q.x, y: this.origen.y + q.y };
    };

    /** y de pantalla de la altura z en la regla. */
    Construccion.prototype.yAltura = function (z) {
        var q = S().proyectar(this.total.x1, this.total.y0, z, this.esc);
        return this.origen.y + q.y;
    };

    // ------------------------------------------------------------------ plataforma y luces de la base

    Construccion.prototype.pintarPlataforma = function () {
        var self = this;
        this.hBase.pintar(function (g) { self.dibujarPlataforma(g); });
    };

    /** Sombra en el pasto, losa de obra con cuadrícula y la posición de las luces del borde. */
    Construccion.prototype.dibujarPlataforma = function (g) {
        var t = this.total;
        var m = 0.7;
        var losa = { tipo: "caja", w: (t.x1 - t.x0) + m * 2, d: (t.y1 - t.y0) + m * 2, h: 0.38 };
        var c = [t.x0 - m + losa.w / 2, t.y0 - m + losa.d / 2, -losa.h / 2];
        var q = S().proyectar(c[0], c[1], c[2], this.esc);
        // la losa se apoya en el suelo: un claro de tierra alrededor y una sombra pegada a su base
        // (una sombra corrida hacia un lado la hacía ver flotando)
        var piso = -losa.h;
        var tierra = S().huella({ x0: t.x0 - m - 0.55, y0: t.y0 - m - 0.45, x1: t.x1 + m + 0.55, y1: t.y1 + m + 0.55 }, this.esc, this.origen, piso);
        g.fillStyle(0x6fbf4f, 0.5);
        g.fillPoints(S().huella({ x0: t.x0 - m - 0.75, y0: t.y0 - m - 0.65, x1: t.x1 + m + 0.75, y1: t.y1 + m + 0.75 }, this.esc, this.origen, piso), true, true);
        g.fillStyle(0xd9b38c, 1);
        g.fillPoints(tierra, true, true);
        g.lineStyle(3, 0xb08968, 0.7);
        g.strokePoints(tierra, true, true);
        var contacto = S().huella({ x0: t.x0 - m - 0.08, y0: t.y0 - m - 0.08, x1: t.x1 + m + 0.16, y1: t.y1 + m + 0.16 }, this.esc, this.origen, piso);
        g.fillStyle(0x5c3d24, 0.35);
        g.fillPoints(contacto.map(function (p) { return { x: p.x + 1, y: p.y + 2 }; }), true, true);
        // la losa es un sólido más (ancla en el centro de su caja)
        S().dibujar(g, losa, 0, { esc: this.esc, color: "#dee2e6", deco: "ladrillos", dx: this.origen.x + q.x, dy: this.origen.y + q.y });
        // cuadrícula de obra en la cara de arriba
        g.lineStyle(1.5, 0x868e96, 0.35);
        for (var x = Math.ceil(t.x0 - m); x <= t.x1 + m; x += 1) {
            var a = S().proyectar(x, t.y0 - m, 0, this.esc), b = S().proyectar(x, t.y1 + m, 0, this.esc);
            g.lineBetween(this.origen.x + a.x, this.origen.y + a.y, this.origen.x + b.x, this.origen.y + b.y);
        }
        for (var y = Math.ceil(t.y0 - m); y <= t.y1 + m; y += 1) {
            var a2 = S().proyectar(t.x0 - m, y, 0, this.esc), b2 = S().proyectar(t.x1 + m, y, 0, this.esc);
            g.lineBetween(this.origen.x + a2.x, this.origen.y + a2.y, this.origen.x + b2.x, this.origen.y + b2.y);
        }
        // luces del borde frontal (se encienden con cada bloque)
        this.lucesBase = [];
        var n = 14;
        for (var i = 0; i < n; i++) {
            var u = (i + 0.5) / n;
            var p3 = u < 0.5 ? [t.x0 - m + (t.x1 - t.x0 + 2 * m) * (u * 2), t.y1 + m, -0.19] : [t.x1 + m, t.y1 + m - (t.y1 - t.y0 + 2 * m) * ((u - 0.5) * 2), -0.19];
            var pp = S().proyectar(p3[0], p3[1], p3[2], this.esc);
            this.lucesBase.push({ x: this.origen.x + pp.x, y: this.origen.y + pp.y, luz: 0, obj: 0 });
        }
    };

    Construccion.prototype.pintarLucesBase = function (ts) {
        var g = this.gLucesBase;
        g.clear();
        var self = this;
        this.lucesBase.forEach(function (l, i) {
            var on = Math.max(l.luz, self.oro);
            g.fillStyle(0x495057, 1);
            g.fillCircle(l.x, l.y, 6);
            g.fillStyle(S().mezclar(0x868e96, self.oro > 0.3 ? 0xffd43b : 0x8ce99a, on), 1);
            g.fillCircle(l.x, l.y, 4.5);
            if (on > 0.05) {
                g.fillStyle(0xffffff, 0.25 * on * (0.7 + 0.3 * Math.sin(ts * 5 + i)));
                g.fillCircle(l.x, l.y, 9);
            }
        });
    };

    // ------------------------------------------------------------------ regla de altura

    Construccion.prototype.pintarRegla = function (ts) {
        var g = this.gRegla;
        g.clear();
        var self = this;
        var y0 = this.yAltura(0), y1 = this.yAltura(this.total.z1);
        g.fillStyle(0x1f2a44, 0.55);
        g.fillRoundedRect(REGLA_X - 9, y1 - 14, 18, y0 - y1 + 28, 9);
        g.fillStyle(0xffffff, 0.9);
        g.fillRoundedRect(REGLA_X - 5, y1 - 10, 10, y0 - y1 + 20, 5);
        // relleno hasta la altura alcanzada
        var alc = this.alturaVis || 0;
        var ya = this.yAltura(alc);
        g.fillStyle(this.oro > 0.3 ? 0xffd43b : 0x51cf66, 1);
        g.fillRoundedRect(REGLA_X - 5, ya, 10, Math.max(0, y0 - ya + 4), 5);
        // una marca por capa
        R().capas(this.lista).forEach(function (c) {
            var tope = 0;
            self.lista.forEach(function (p) { if (p.capa === c) tope = Math.max(tope, p.caja.z1); });
            var y = self.yAltura(tope);
            var llena = !!self.capaLuz[c];
            var foco = self.reglaFoco === c;
            var r = foco ? 9 + Math.sin(ts * 8) * 2 : 7;
            g.fillStyle(0x1f2a44, 1);
            g.fillCircle(REGLA_X, y, r + 2);
            g.fillStyle(llena ? (self.oro > 0.3 ? 0xffd43b : 0x51cf66) : foco ? 0xffe066 : 0xdee2e6, 1);
            g.fillCircle(REGLA_X, y, r);
        });
    };

    /** La regla resalta la capa a la que va el bloque que se arrastra (null: ninguna). */
    Construccion.prototype.focoAltura = function (id) {
        var p = id ? this.pieza(id) : null;
        this.reglaFoco = p ? p.capa : null;
    };

    // ------------------------------------------------------------------ guía fantasma

    /** modo: normal · lista (la pieza elegida es la que va) · perfecta (y además bien girada). */
    Construccion.prototype.guia = function (id, modo) {
        var cambio = (id || null) !== this.guiaId || (modo || "normal") !== this.guiaModo;
        this.guiaId = id || null;
        this.guiaModo = modo || "normal";
        if (!cambio && (this.fantasma || !this.guiaId)) return;
        if (this.solFantasma) { this.solFantasma.destruir(); this.solFantasma = null; this.fantasma = null; }
        if (!this.guiaId) return;
        var p = this.pieza(this.guiaId);
        var col = this.guiaModo === "perfecta" ? 0x8ce99a : this.guiaModo === "lista" ? 0xffe066 : 0xfff3bf;
        var color = this.aspecto ? this.aspecto(p.id).color : "#ffffff";
        var so = new (M().Solido)(this.scene, p.def, this.esc, 16, 110 + this.rango[p.id] * 2 + 1);
        so.pintar(p.orient, { color: color, fantasma: true, contorno: col, anchoContorno: 3.2 * Math.max(0.8, this.esc) });
        var a = this.punto(p.id);
        so.img.setPosition(a.x, a.y);
        this.solFantasma = so;
        this.fantasma = so.img;
    };

    /** Destello de la guía (pista después de un error o con el botón de ayuda). */
    Construccion.prototype.pista = function () { this.pistaFlash = 1; };

    // ------------------------------------------------------------------ resaltes y sombra al arrastrar

    /** Huellas que brillan suave: posiciones donde la pieza que se arrastra podría ir. */
    Construccion.prototype.resaltar = function (ids, focoId, fuerza, ts) {
        var g = this.gResaltes, self = this;
        g.clear();
        (ids || []).forEach(function (id) {
            var p = self.pieza(id);
            if (!p) return;
            var h = S().huella(p.caja, self.esc, self.origen);
            var foco = id === focoId;
            g.fillStyle(foco ? 0x8ce99a : 0xfff3bf, (foco ? 0.25 + 0.35 * (fuerza || 0) : 0.14) * (0.8 + 0.2 * Math.sin((ts || 0) * 6)));
            g.fillPoints(h, true, true);
            g.lineStyle(3, foco ? 0x8ce99a : 0xfff3bf, foco ? 0.9 : 0.45);
            g.strokePoints(h, true, true);
        });
    };

    /**
     * Sombra del bloque que se arrastra: sobre la huella de su posición si está cerca, si no una
     * mancha bajo el bloque que se desplaza por el área de construcción.
     */
    Construccion.prototype.sombra = function (pieza, x, y, cercaId, fuerza) {
        var g = this.gSombra;
        g.clear();
        if (!pieza) return;
        if (cercaId) {
            var p = this.pieza(cercaId);
            var h = S().huella(p.caja, this.esc, this.origen);
            g.fillStyle(0x1f2a44, 0.18 + 0.22 * (fuerza || 0));
            g.fillPoints(h, true, true);
            return;
        }
        var r = S().rect2d(pieza.def, R().indice(pieza.rot), this.esc);
        var piso = Math.min(PISO_Y + 10, y + r.h * 0.6 + 60);
        g.fillStyle(0x1f2a44, 0.16);
        g.fillEllipse(x + 10, piso, Math.max(60, r.w * 0.8), Math.max(18, r.w * 0.22));
    };

    Construccion.prototype.apagarArrastre = function () {
        this.gResaltes.clear();
        this.gSombra.clear();
        this.reglaFoco = null;
    };

    // ------------------------------------------------------------------ encaje

    /** Pinta una posición llena (con brillo opcional 0..1, o dorado en la celebración). */
    Construccion.prototype.pintar = function (id, brillo) {
        var p = this.pieza(id);
        var so = this.sol[id];
        var pu = this.puestas[id];
        if (!p || !so || !pu) return;
        // el dorado y el brillo se redondean: el sólido solo se vuelve a hornear si cambian
        var oro = Math.round(this.oro * 20) / 20;
        var col = oro > 0.02 ? "#" + S().mezclar(S().hexA(pu.color), 0xffd43b, oro * 0.45).toString(16).padStart(6, "0") : pu.color;
        so.pintar(p.orient, { color: col, deco: pu.deco, brillo: Math.round((brillo || 0) * 20) / 20 });
    };

    /**
     * La pieza encaja: se acerca a su lugar, se alinea, baja suave, se asienta y deja una onda de
     * luz en la superficie de unión. desde: { x, y, esc } donde quedó al soltar.
     */
    Construccion.prototype.encajar = function (id, aspecto, desde) {
        var self = this;
        var p = this.pieza(id);
        var g = this.g[id];
        if (!p || !g) return Promise.resolve();
        this.puestas[id] = { color: aspecto.color, deco: aspecto.deco, forma: aspecto.forma };
        if (this.guiaId === id) this.guia(null);
        this.apagarArrastre();
        this.pintar(id, 0);
        var a = this.punto(id);
        var x0 = desde ? desde.x : a.x, y0 = desde ? desde.y : a.y - 80;
        var e0 = desde && desde.esc ? desde.esc : 1;
        var alto = 46 * this.esc + 10;
        g.setVisible(true).setPosition(x0, y0).setScale(e0).setAlpha(1).setRotation(0);
        g.setDepth(158);
        return this.anim.agregar(220, function (u) {
            var s = M().saleSuave(u);
            g.setPosition(M().lerp(x0, a.x, s), M().lerp(y0, a.y - alto, s));
            g.setScale(M().lerp(e0, 1, s));
            g.setRotation(Math.sin(u * Math.PI) * 0.04);
        }).then(function () {
            g.setDepth(110 + self.rango[id] * 2);
            return self.anim.agregar(260, function (u) {
                var s = M().entraSuave(u);
                g.setPosition(a.x, a.y - alto * (1 - s));
                g.setRotation(0);
            });
        }).then(function () {
            self.onda(p);
            self.polvo(p);
            return self.anim.agregar(260, function (u) {
                var aplasta = Math.sin(u * Math.PI) * (1 - u);
                g.setScale(1 + aplasta * 0.06, 1 - aplasta * 0.1);
                g.setPosition(a.x, a.y + aplasta * 3);
            });
        }).then(function () {
            g.setScale(1).setPosition(a.x, a.y);
            self.brillos[id] = 1;
            var n = Object.keys(self.puestas).length;
            var hasta = Math.round(n / Math.max(1, self.lista.length) * self.lucesBase.length);
            self.lucesBase.forEach(function (l, i) { l.obj = i < hasta ? 1 : 0; });
            self.alturaObj = R().altura(self.lista, self.puestas);
        });
    };

    /** Onda luminosa sobre la superficie donde se apoya el bloque. */
    Construccion.prototype.onda = function (p) {
        var self = this;
        var g = this.gOnda;
        var h = S().huella(p.caja, this.esc, this.origen);
        var cx = (h[0].x + h[2].x) / 2, cy = (h[0].y + h[2].y) / 2;
        this.anim.agregar(700, function (u) {
            g.clear();
            var k = 1 + u * 0.9;
            g.lineStyle(5 * (1 - u) + 1, 0xfff3bf, 1 - u);
            g.strokePoints(h.map(function (q) { return { x: cx + (q.x - cx) * k, y: cy + (q.y - cy) * k }; }), true, true);
            g.lineStyle(3, 0x8ce99a, (1 - u) * 0.8);
            g.strokePoints(h.map(function (q) { return { x: cx + (q.x - cx) * (1 + u * 0.4), y: cy + (q.y - cy) * (1 + u * 0.4) }; }), true, true);
        }).then(function () { g.clear(); });
        this.particulas.emitir(cx, cy - 6, { n: 8, tipos: ["p-destello", "p-chispa"], vel: 180, grav: 40, vida: 600, escala: 0.35, sumar: true, tintes: [0xfff3bf, 0xffffff, 0x8ce99a] });
    };

    /** Polvo suave en las esquinas al asentarse. */
    Construccion.prototype.polvo = function (p) {
        var self = this;
        S().huella(p.caja, this.esc, this.origen).forEach(function (q) {
            self.particulas.emitir(q.x, q.y, { n: 3, tipos: ["p-polvo"], vel: 50, grav: -20, vida: 800, escala: 0.6, crece: true, alfa: 0.5, tintes: [0xf1f3f5, 0xe9ecef] });
        });
    };

    /** La capa recién completada se ilumina y suelta partículas. */
    Construccion.prototype.iluminarCapa = function (capa) {
        var self = this;
        this.capaLuz[capa] = true;
        this.lista.forEach(function (p) {
            if (p.capa !== capa || !self.puestas[p.id]) return;
            self.brillos[p.id] = 1.4;
            var a = self.punto(p.id);
            self.particulas.emitir(a.x, a.y - 10, { n: 7, tipos: ["p-estrella", "p-chispa"], vel: 200, grav: 160, vida: 900, escala: 0.4, sumar: true, tintes: [0xffe066, 0xffffff, 0x8ce99a] });
        });
    };

    /** Toda la figura terminada: luz dorada, la cúspide brilla y (castillo) aparecen las banderas. */
    Construccion.prototype.completar = function () {
        var self = this;
        var alto = null;
        this.lista.forEach(function (p) { if (!alto || p.caja.z1 > alto.caja.z1) alto = p; });
        if (alto) {
            var a = this.punto(alto.id);
            var top = S().proyectar(0, 0, (alto.caja.z1 - alto.caja.z0) / 2, this.esc);
            this.luzCuspide.setPosition(a.x, a.y + top.y + 4);
        }
        if (this.clave === "castillo") this.ponerBanderas();
        return this.anim.agregar(1400, function (u) {
            self.oro = M().suave(u);
            self.luzCuspide.setAlpha(M().suave(u)).setScale(0.6 + u * 1.4);
            Object.keys(self.puestas).forEach(function (id) { self.pintar(id, 0.15 * Math.sin(u * Math.PI)); });
        });
    };

    Construccion.prototype.ponerBanderas = function () {
        var self = this;
        var techo = (this.nivel && this.nivel.techo) || 0xff6b6b;
        this.lista.forEach(function (p) {
            if (p.def.tipo !== "cilindro") return;
            // si la torre tiene un techo encima, la bandera va en la punta del techo
            var arriba = p;
            self.lista.forEach(function (q2) {
                if (q2 !== p && Math.abs(q2.caja.z0 - p.caja.z1) < 0.03 && q2.caja.x0 < p.caja.x1 && p.caja.x0 < q2.caja.x1 && q2.caja.y0 < p.caja.y1 && p.caja.y0 < q2.caja.y1) arriba = q2;
            });
            var c = S().centroCaja(p.caja);
            var q = S().proyectar(c[0], c[1], arriba.caja.z1, self.esc);
            var b = self.scene.add.container(self.origen.x + q.x, self.origen.y + q.y).setDepth(110 + self.rango[arriba.id] * 2 + 1);
            var g = self.scene.add.graphics();
            g.lineStyle(4, 0x495057, 1);
            g.lineBetween(0, 0, 0, -58);
            g.fillStyle(0xffd43b, 1);
            g.fillCircle(0, -60, 4);
            var tela = self.scene.add.graphics();
            tela.fillStyle(techo, 1);
            tela.fillTriangle(0, -56, 40, -46, 0, -34);
            tela.fillStyle(0xffffff, 0.5);
            tela.fillTriangle(0, -52, 16, -47, 0, -42);
            b.add([g, tela]);
            b.setScale(0.1);
            b.tela = tela;
            self.banderas.push(b);
            self.anim.agregar(500, function (u) { b.setScale(M().rebote(u)); });
        });
    };

    /** Brillo de todas las piezas (cinemática): u 0..1. */
    Construccion.prototype.brillarTodo = function (u) {
        var self = this;
        this.oro = Math.max(this.oro, u);
        Object.keys(this.puestas).forEach(function (id) { self.pintar(id, 0.16 * u); });
        this.luzCuspide.setAlpha(Math.max(this.luzCuspide.alpha, u));
    };

    /** Destello grande desde la cúspide. */
    Construccion.prototype.destello = function () {
        var self = this;
        var l = this.scene.add.image(this.luzCuspide.x, this.luzCuspide.y, "p-luz").setDepth(630).setTint(0xfff3bf).setBlendMode(Phaser.BlendModes.ADD);
        this.particulas.emitir(this.luzCuspide.x, this.luzCuspide.y, { n: 24, tipos: ["p-estrella", "p-destello"], vel: 420, grav: 120, vida: 1400, escala: 0.55, sumar: true, tintes: [0xffd43b, 0xffffff, 0xfff3bf] });
        return this.anim.agregar(1100, function (u) {
            l.setScale(0.5 + u * 9).setAlpha(1 - u);
        }).then(function () { l.destroy(); });
    };

    /** Transición al nivel siguiente: la figura se encoge y vuela hacia el plano. */
    Construccion.prototype.salida = function (hacia) {
        var self = this;
        var meta = hacia || { x: 1240, y: 230 };
        var ids = Object.keys(this.g);
        var inicio = {};
        ids.forEach(function (id) { inicio[id] = { x: self.g[id].x, y: self.g[id].y }; });
        this.banderas.forEach(function (b) { b.setVisible(false); });
        this.guia(null);
        return this.anim.agregar(900, function (u) {
            var s = M().entraSuave(u);
            ids.forEach(function (id) {
                var g = self.g[id];
                g.setPosition(M().lerp(inicio[id].x, meta.x + (inicio[id].x - CENTRO_X) * 0.25, s), M().lerp(inicio[id].y, meta.y + (inicio[id].y - PISO_Y) * 0.25, s));
                g.setScale(1 - 0.75 * s).setAlpha(1 - s * 0.9);
            });
            self.luzCuspide.setAlpha(self.luzCuspide.alpha * (1 - s));
            self.alfaBase(1 - s * 0.6);
            self.gRegla.setAlpha(1 - s);
        }).then(function () {
            ids.forEach(function (id) { self.g[id].setVisible(false); });
            self.alfaBase(1);
            self.gRegla.setAlpha(1);
        });
    };

    Construccion.prototype.alfaBase = function (a) {
        [this.hBase.img, this.gLucesBase, this.gSombraTorre].forEach(function (g) { g.setAlpha(a); });
    };

    /** La plataforma nueva aparece con un pequeño impulso. */
    Construccion.prototype.aparecer = function () {
        var self = this;
        this.alfaBase(0);
        this.gRegla.setAlpha(0);
        return this.anim.agregar(600, function (u) {
            self.alfaBase(u);
            self.gRegla.setAlpha(u);
        });
    };

    /** Deshace una posición (la demostración no cuenta). */
    Construccion.prototype.deshacer = function (id) {
        var p = this.pieza(id);
        delete this.puestas[id];
        if (p) delete this.capaLuz[p.capa];
        delete this.brillos[id];
        if (this.g[id]) this.g[id].setVisible(false);
        if (this.sol[id]) this.sol[id].firma = null;
        this.alturaObj = R().altura(this.lista, this.puestas);
        var n = Object.keys(this.puestas).length;
        var hasta = Math.round(n / Math.max(1, this.lista.length) * this.lucesBase.length);
        this.lucesBase.forEach(function (l, i) { l.obj = i < hasta ? 1 : 0; });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    Construccion.prototype.update = function (dt, ts) {
        var self = this;
        this.anim.update(dt);
        this.particulas.update(dt);
        this.alturaVis = (this.alturaVis || 0) + ((this.alturaObj || 0) - (this.alturaVis || 0)) * Math.min(1, dt / 300);
        this.lucesBase.forEach(function (l) { l.luz += (l.obj - l.luz) * Math.min(1, dt / 300); });
        this.pintarLucesBase(ts);
        this.pintarRegla(ts);
        // guía que respira (más fuerte si la pieza elegida es la que va, y en la pista)
        if (this.fantasma && this.fantasma.visible) {
            this.pistaFlash = Math.max(0, this.pistaFlash - dt / 1800);
            var base = this.guiaModo === "normal" ? 0.55 : 0.8;
            var resp = base + 0.25 * Math.sin(ts * 3.2) + this.pistaFlash * 0.4 * Math.abs(Math.sin(ts * 10));
            this.fantasma.setAlpha(Math.min(1, resp));
            this.fantasma.setScale(1 + 0.015 * Math.sin(ts * 3.2) + this.pistaFlash * 0.03);
        }
        // brillo pasajero de piezas recién puestas o de su capa
        Object.keys(this.brillos).forEach(function (id) {
            var b = self.brillos[id];
            b -= dt / 700;
            if (b <= 0) { delete self.brillos[id]; self.pintar(id, 0); return; }
            self.brillos[id] = b;
            self.pintar(id, Math.min(0.6, b * 0.45));
        });
        // sombra de la construcción en el pasto: crece con la altura
        var gs = this.gSombraTorre;
        gs.clear();
        if (this.alturaVis > 0.05) {
            var t = this.total;
            var h = S().huella({ x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1 }, this.esc, this.origen, 0);
            var largo = this.alturaVis * 16 * this.esc;
            gs.fillStyle(0x1f2a44, 0.12);
            gs.fillPoints([h[1], h[2], { x: h[2].x + largo, y: h[2].y + largo * 0.25 }, { x: h[1].x + largo, y: h[1].y + largo * 0.25 }], true, true);
        }
        // la cúspide titila y las banderas ondean
        if (this.luzCuspide.alpha > 0.05 && !this.saliendo) this.luzCuspide.setScale(2 + Math.sin(ts * 3) * 0.25);
        this.banderas.forEach(function (b, i) { if (b.tela) b.tela.setScale(1 + Math.sin(ts * 6 + i) * 0.12, 1); });
    };

    global.ConstruccionPuzle = Construccion;
    global.ConstruccionPuzle.CENTRO_X = CENTRO_X;
    global.ConstruccionPuzle.PISO_Y = PISO_Y;
})(typeof window !== "undefined" ? window : global);
