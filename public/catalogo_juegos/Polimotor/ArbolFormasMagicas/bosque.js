/**
 * FondoBosque — el bosque de fondo de "El Árbol de las Formas Mágicas" (window.FondoBosque).
 *
 * Arma los planos en profundidad (cielo, sol, nubes, montañas, bosque lejano, bruma, árboles
 * medios, pradera, hierba y helechos del primer plano, viñeta) y los hace reaccionar al juego:
 *
 *   - paralaje: cada plano se corre un poco según el puntero o el fruto arrastrado (los lejanos
 *     poco, los cercanos más; el primer plano al revés), lo que da sensación de profundidad;
 *   - enfoque: al arrastrar, la viñeta oscurece apenas el fondo y el fruto resalta;
 *   - magia: con cada fruto encajado se abren flores en la pradera, de la más cercana al árbol
 *     hacia afuera, y el cielo se aclara;
 *   - ondas: cada encaje manda una onda de luz por el suelo desde el pie del árbol;
 *   - hora del día por nivel: mañana (nivel 1), mediodía (nivel 2) y atardecer dorado (nivel 3);
 *   - celebración: arcoíris, bandada de pájaros y nubes más rápidas.
 *
 * No toca la lógica del juego: la escena le pasa el estado en update() y le avisa los eventos.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    var D = function () { return global.DibujosArbol; };

    function lerp(a, b, u) { return a + (b - a) * u; }
    function suave(u) { return u * u * (3 - 2 * u); }
    function acercar(actual, objetivo, dt, ms) { return actual + (objetivo - actual) * Math.min(1, dt / ms); }

    // Luz de cada nivel: posición del sol, color y fuerza del velo sobre el cielo, tinte de los rayos.
    // lejos/cerca: tinte (multiplica) de los planos lejanos y de los cercanos; calido: luz cálida sumada.
    var HORAS = [
        { sol: { x: 250, y: 150 }, solTinte: 0xffffff, velo: 0xbfe6ff, veloA: 0.12, rayos: 0xfff3bf, nube: 0xffffff, lejos: 0xe4f0ff, cerca: 0xf2f8ff, calido: 0 },
        { sol: { x: 470, y: 80 }, solTinte: 0xffffff, velo: 0xffffff, veloA: 0.0, rayos: 0xfffbe0, nube: 0xffffff, lejos: 0xffffff, cerca: 0xffffff, calido: 0.05 },
        { sol: { x: 330, y: 270 }, solTinte: 0xffb070, velo: 0xff8a50, veloA: 0.38, rayos: 0xffc070, nube: 0xffd0b0, lejos: 0xffc3a0, cerca: 0xffe2c4, calido: 0.32 }
    ];

    function mezclar(a, b, u) {
        var r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, u));
        var g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, u));
        var c = Math.round(lerp(a & 255, b & 255, u));
        return (r << 16) | (g << 8) | c;
    }

    function FondoBosque(scene, Phaser) {
        this.scene = scene;
        this.Phaser = Phaser;
        this.t = 0;
        this.par = { x: 0, y: 0 };
        this.enfoque = 0;
        this.hora = 0;
        this.horaU = 1;
        this.horaDesde = HORAS[0];
        this.arco = 0;
        this.arcoObj = 0;
        this.viento = 1;
        this.crear();
    }

    /** Imagen a su tamaño de diseño, compensando la resolución del SVG rasterizado. */
    FondoBosque.prototype.img = function (x, y, key, k) {
        var i = this.scene.add.image(x, y, key);
        i.base = (k || 1) / D().res(key);
        i.setScale(i.base);
        return i;
    };

    FondoBosque.prototype.crear = function () {
        var self = this, P = this.Phaser;
        // cielo y sol
        this.cielo = this.img(W / 2, 0, "cielo", 1).setOrigin(0.5, 0).setDepth(0);
        this.sol = this.img(HORAS[0].sol.x, HORAS[0].sol.y, "sol", 1.4).setDepth(0.05).setBlendMode(P.BlendModes.ADD);
        this.solHalo = this.img(HORAS[0].sol.x, HORAS[0].sol.y, "luz", 4).setDepth(0.04).setBlendMode(P.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0.35);
        this.arcoiris = this.img(800, 560, "arcoiris", 1.25).setOrigin(0.5, 1).setDepth(0.12).setAlpha(0);
        this.nubes = [[180, 120, 0, 1, 6], [760, 70, 1, 0.8, 4], [1260, 150, 2, 0.9, 5], [1560, 60, 1, 0.6, 3]].map(function (n) {
            var c = self.img(n[0], n[1], "nube-" + n[2], n[3]).setDepth(0.1).setAlpha(0.95);
            c.vel = n[4];
            c.y0 = n[1];
            c.fase = Math.random() * 6;
            return c;
        });
        // velo de color de la hora (sobre cielo, nubes y montañas)
        this.velo = this.scene.add.rectangle(W / 2, 330, W + 200, 660, 0xffffff, 0).setDepth(0.25);
        this.montanas = this.img(W / 2, 600, "montanas", 1).setOrigin(0.5, 1).setDepth(0.2);
        this.bosqueLejano = this.img(W / 2, 640, "bosque-lejano", 1).setOrigin(0.5, 1).setDepth(0.3);
        this.bruma = this.img(W / 2, 560, "luz", 1).setDepth(0.35).setAlpha(0.35);
        this.bruma.setScale((W + 400) / 256 / D().res("luz"), 120 / 256 / D().res("luz"));
        // árboles medios a los lados del claro (se mecen)
        this.medios = [[70, 690, 0, 1.05], [250, 650, 1, 0.82], [1350, 650, 2, 0.85], [1540, 700, 0, 1.1]].map(function (a, i) {
            var m = self.img(a[0], a[1], "arbol-medio-" + a[2], a[3]).setOrigin(0.5, 1).setDepth(0.5);
            if (i >= 2) m.setFlipX(true);
            m.fase = Math.random() * 6;
            m.x0 = a[0];
            m.rebote = 0;
            return m;
        });
        this.pradera = this.img(W / 2, H + 10, "pradera", 1).setOrigin(0.5, 1).setDepth(0.6);
        this.crearFlores();
        // la viñeta oscurece solo el fondo: el árbol y los frutos quedan por encima
        // luz cálida de la hora (se suma desde el lado del sol)
        this.luzHora = this.img(300, 300, "luz", 1).setDepth(1.75).setBlendMode(P.BlendModes.ADD).setTint(0xff9a4a).setAlpha(0);
        this.luzHora.setScale(2200 / 256 / D().res("luz"), 1500 / 256 / D().res("luz"));
        this.vineta = this.img(W / 2, H / 2, "vineta", 1).setDepth(1.8);
        this.vineta.setScale((W + 120) / 320 / D().res("vineta"), (H + 80) / 180 / D().res("vineta"));
        this.vineta.setAlpha(0.55);
        // primer plano: hierba alta (detrás de frutos y cintas) y helechos en las esquinas
        this.pasto = this.img(W / 2, H + 34, "pasto-frente", 1).setOrigin(0.5, 1).setDepth(7.4);
        this.helechos = [[60, H + 20, false, 1.15], [1540, H + 20, true, 1.15]].map(function (h) {
            var f = self.img(h[0], h[1], "helecho", h[3]).setOrigin(0.5, 1).setDepth(44).setFlipX(h[2]);
            f.x0 = h[0];
            f.fase = Math.random() * 6;
            return f;
        });
        // ondas de luz por el suelo y pájaros (reserva fija)
        this.ondas = [0, 1, 2].map(function () {
            return self.img(800, 790, "anillo", 1).setDepth(0.75).setBlendMode(P.BlendModes.ADD).setVisible(false);
        });
        this.ondaI = 0;
        this.destelloPradera = this.img(800, 760, "luz", 1).setDepth(0.72).setBlendMode(P.BlendModes.ADD).setAlpha(0);
        this.destelloPradera.setScale(1500 / 256 / D().res("luz"), 360 / 256 / D().res("luz"));
        this.destelloT = 0;
        this.alAbrirFlor = null;
        this.pajaros = [0, 1, 2, 3, 4].map(function () {
            var b = self.img(-100, -100, "pajaro", 0.8).setDepth(0.4).setVisible(false);
            b.vivo = false;
            return b;
        });
    };

    /** Flores de la pradera: empiezan en capullo y se abren con la magia, del árbol hacia afuera. */
    FondoBosque.prototype.crearFlores = function () {
        var self = this;
        var rnd = (function (s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(91);
        var puntos = [];
        for (var i = 0; i < 80 && puntos.length < 30; i++) {
            var x = 120 + rnd() * 1360, y = 640 + rnd() * 240;
            // fuera del tronco y de los lugares del pasto (no tapar frutos ni cintas)
            if (Math.abs(x - 800) < 280 && y < 900) continue;
            if (Math.abs(x - 478) < 110 && y > 660) continue;
            if (Math.abs(x - 1122) < 110 && y > 660) continue;
            puntos.push({ x: x, y: y });
        }
        puntos.sort(function (a, b) { return Math.abs(a.x - 800) - Math.abs(b.x - 800); });
        this.flores = puntos.map(function (p, i) {
            var k = 0.42 + (p.y - 640) / 240 * 0.3;
            var f = self.img(p.x, p.y, "flor-" + (i % 4), k).setOrigin(0.5, 1).setDepth(0.7 + p.y / 100000);
            f.k = k;
            f.abierta = 0;
            f.obj = 0;
            f.fase = rnd() * 6;
            f.orden = i / puntos.length;
            return f;
        });
    };

    // ------------------------------------------------------------------ eventos del juego

    /** Hora del día del nivel (0, 1 o 2): el cambio es gradual. */
    FondoBosque.prototype.ponerHora = function (i) {
        var h = Math.max(0, Math.min(HORAS.length - 1, i | 0));
        if (h === this.hora) return;
        this.horaDesde = this.horaActual();
        this.hora = h;
        this.horaU = 0;
    };

    FondoBosque.prototype.horaActual = function () {
        var a = this.horaDesde, b = HORAS[this.hora], u = suave(Math.min(1, this.horaU));
        return {
            sol: { x: lerp(a.sol.x, b.sol.x, u), y: lerp(a.sol.y, b.sol.y, u) },
            solTinte: u < 0.5 ? a.solTinte : b.solTinte,
            velo: u < 0.5 ? a.velo : b.velo,
            veloA: lerp(a.veloA, b.veloA, u),
            rayos: mezclar(a.rayos, b.rayos, u),
            nube: mezclar(a.nube, b.nube, u),
            lejos: mezclar(a.lejos, b.lejos, u),
            cerca: mezclar(a.cerca, b.cerca, u),
            calido: lerp(a.calido, b.calido, u)
        };
    };

    /** Onda de luz que sale del pie del árbol y recorre la pradera. */
    FondoBosque.prototype.onda = function (color) {
        var o = this.ondas[this.ondaI];
        this.ondaI = (this.ondaI + 1) % this.ondas.length;
        o.setVisible(true).setTint(color || 0xfff3a0);
        this.destelloPradera.setTint(color || 0xfff3a0);
        this.destelloT = 1;
        o.t = 0;
        o.activa = true;
        this.medios.forEach(function (m, i) { m.rebote = 1 + i * 0.15; });
    };

    /** Unos pájaros salen de la copa y cruzan el cielo. */
    FondoBosque.prototype.bandada = function (n) {
        var lado = Math.random() < 0.5 ? -1 : 1;
        var cuantos = Math.min(n || 3, this.pajaros.length);
        for (var i = 0; i < cuantos; i++) {
            var b = this.pajaros[i];
            b.vivo = true;
            b.t = -i * 220;
            b.x = 800 + (Math.random() - 0.5) * 200;
            b.y = 200 + Math.random() * 80;
            b.vx = lado * (170 + Math.random() * 60);
            b.vy = -40 - Math.random() * 30;
            b.setFlipX(lado < 0).setVisible(false).setAlpha(0.85);
        }
    };

    /** Arcoíris: 0 oculto, 1 pleno. */
    FondoBosque.prototype.ponerArcoiris = function (v) { this.arcoObj = v; };

    FondoBosque.prototype.reiniciar = function () {
        this.flores.forEach(function (f) { f.obj = 0; });
        this.arcoObj = 0;
        this.viento = 1;
    };

    // ------------------------------------------------------------------ bucle

    /**
     * estado.magia     0..1 progreso del nivel (abre flores, aclara el cielo)
     * estado.foco      {x, y} punto de atención (puntero o fruto arrastrado) para el paralaje
     * estado.arrastra  true mientras hay un fruto en la mano
     * estado.fiesta    true durante la celebración
     */
    FondoBosque.prototype.update = function (dt, ts, estado) {
        var e = estado || {};
        var s = dt / 1000;
        this.t += dt;
        // paralaje suave hacia el foco
        var fx = e.foco ? (e.foco.x - W / 2) / (W / 2) : 0;
        var fy = e.foco ? (e.foco.y - H / 2) / (H / 2) : 0;
        this.par.x = acercar(this.par.x, Math.max(-1, Math.min(1, fx)), dt, 380);
        this.par.y = acercar(this.par.y, Math.max(-1, Math.min(1, fy)), dt, 380);
        var px = this.par.x, py = this.par.y;
        this.montanas.x = W / 2 - px * 7;
        this.montanas.y = 600 - py * 3;
        this.bosqueLejano.x = W / 2 - px * 12;
        this.bosqueLejano.y = 640 - py * 4;
        this.bruma.x = W / 2 - px * 10;
        this.cielo.x = W / 2 - px * 3;
        this.medios.forEach(function (m) {
            m.x = m.x0 - px * 20;
            if (m.rebote > 0) m.rebote = Math.max(0, m.rebote - s * 1.6);
            var r = Math.min(1, m.rebote);
            m.rotation = Math.sin(ts * 0.9 + m.fase) * 0.018 + Math.sin(ts * 9) * 0.03 * r;
            m.setScale(m.base * (1 + 0.03 * r * Math.sin(ts * 12)), m.base * (1 - 0.03 * r * Math.sin(ts * 12)));
        });
        this.helechos.forEach(function (f) {
            f.x = f.x0 + px * 26;
            f.rotation = Math.sin(ts * 1.1 + f.fase) * 0.04;
        });
        this.pasto.x = W / 2 + px * 8;
        this.pasto.setScale(this.pasto.base, this.pasto.base * (1 + Math.sin(ts * 1.3) * 0.025));

        // hora del día
        if (this.horaU < 1) this.horaU = Math.min(1, this.horaU + s / 2.2);
        var h = this.horaActual();
        var magia = e.magia || 0;
        this.sol.setPosition(h.sol.x - px * 4, h.sol.y - py * 2).setTint(h.solTinte);
        this.sol.setScale(this.sol.base * (1 + 0.03 * Math.sin(ts * 1.2)));
        this.solHalo.setPosition(this.sol.x, this.sol.y).setTint(h.rayos).setAlpha(0.3 + magia * 0.15 + (e.fiesta ? 0.15 : 0));
        this.velo.setFillStyle(h.velo, Math.max(0, h.veloA - magia * 0.06));
        this.montanas.setTint(h.lejos);
        this.bosqueLejano.setTint(h.lejos);
        this.medios.forEach(function (m) { m.setTint(h.cerca); });
        this.pradera.setTint(h.cerca);
        this.pasto.setTint(h.cerca);
        this.helechos.forEach(function (f) { f.setTint(h.cerca); });
        this.cielo.setTint(mezclar(0xffffff, h.velo, h.veloA));
        this.luzHora.setPosition(h.sol.x, h.sol.y + 150).setAlpha(h.calido + magia * 0.05);
        var self = this;
        this.viento = acercar(this.viento, e.fiesta ? 3.5 : 1, dt, 600);
        this.nubes.forEach(function (c) {
            c.x += c.vel * self.viento * s;
            if (c.x > W + 220) c.x = -220;
            c.y = c.y0 + Math.sin(ts * 0.2 + c.fase) * 6 - py * 2;
            c.setTint(h.nube);
        });

        // enfoque al arrastrar
        this.enfoque = acercar(this.enfoque, e.arrastra ? 1 : 0, dt, 220);
        this.vineta.setAlpha(0.5 + this.enfoque * 0.3 - (e.fiesta ? 0.25 : 0));
        this.bruma.setAlpha(0.3 + 0.08 * Math.sin(ts * 0.4));

        // flores: se abren tantas como magia haya (del árbol hacia afuera)
        this.flores.forEach(function (f) {
            if (e.fiesta) f.obj = 1;
            else f.obj = f.orden < magia * 0.92 + 0.08 ? 1 : 0;
            var antes = f.abierta;
            f.abierta = acercar(f.abierta, f.obj, dt, 260);
            if (antes < 0.5 && f.abierta >= 0.5 && f.obj && self.alAbrirFlor) self.alAbrirFlor(f.x, f.y - 20 * f.k / 0.5);
            var pop = f.obj && antes < 0.95 ? Math.sin(f.abierta * Math.PI) * 0.25 : 0;
            var k = f.k * (0.38 + 0.62 * f.abierta + pop);
            f.setScale(k / D().res(f.texture.key) * 1, k / D().res(f.texture.key));
            f.setTint(f.abierta > 0.5 ? 0xffffff : 0x7cc35a);
            f.rotation = Math.sin(ts * 1.4 + f.fase) * 0.06;
        });

        // destello de la pradera tras una onda
        if (this.destelloT > 0) this.destelloT = Math.max(0, this.destelloT - s * 1.1);
        this.destelloPradera.setAlpha(Math.sin(this.destelloT * Math.PI) * 0.45);

        // ondas por el suelo
        this.ondas.forEach(function (o) {
            if (!o.activa) return;
            o.t += dt;
            var u = o.t / 1400;
            if (u >= 1) { o.activa = false; o.setVisible(false); return; }
            o.setScale(o.base * (0.6 + u * 8.5), o.base * (0.18 + u * 1.9));
            o.setAlpha((1 - u) * (1 - u) * 1);
        });

        // pájaros: vuelan y aletean
        this.pajaros.forEach(function (b, i) {
            if (!b.vivo) return;
            b.t += dt;
            if (b.t < 0) return;
            b.setVisible(true);
            b.x += b.vx * s;
            b.y += b.vy * s + Math.sin(b.t * 0.006 + i) * 0.6;
            b.vy *= 0.995;
            b.setScale(b.base, b.base * (0.35 + 0.65 * Math.abs(Math.sin(b.t * 0.018 + i))));
            if (b.x < -120 || b.x > W + 120 || b.y < -80) { b.vivo = false; b.setVisible(false); }
        });

        // arcoíris
        this.arco = acercar(this.arco, this.arcoObj, dt, 700);
        this.arcoiris.setAlpha(this.arco * 0.85);
        this.arcoiris.x = 800 - px * 5;
    };

    /** Tinte de los rayos de luz de la escena según la hora (los rayos los maneja la escena). */
    FondoBosque.prototype.tinteRayos = function () { return this.horaActual().rayos; };

    global.FondoBosque = FondoBosque;
})(typeof window !== "undefined" ? window : global);
