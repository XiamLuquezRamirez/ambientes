/**
 * MotorPuzle — utilidades de animación compartidas (window.MotorPuzle).
 *
 *  - Animador: tweens con delta time que devuelven Promise y se cierran solos por tiempo si la
 *    pestaña está oculta (los frames de Phaser no corren).
 *  - Particulas: reserva fija de imágenes, sin crear objetos en cada efecto.
 *  - texturas(): chispa, estrella, polvo, confeti y destello generados una vez con Graphics.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function suave(u) { return u * u * (3 - 2 * u); }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function entraSuave(u) { return u * u * u; }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function rebote(u) {
        var c1 = 1.70158 * 1.4, c3 = c1 + 1;
        return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
    function rad(g) { return g * Math.PI / 180; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 150) : ms); }); }

    // ------------------------------------------------------------------ animador

    function Animador() { this.lista = []; }

    Animador.prototype.agregar = function (dur, fn) {
        var self = this;
        var d = reducido ? Math.min(dur, 200) : dur;
        return new Promise(function (resolve) {
            var a = { t: 0, dur: Math.max(1, d), fn: fn, resolve: resolve, hecho: false };
            a.timer = setTimeout(function () { self.fin(a); }, d + 450);
            self.lista.push(a);
        });
    };

    Animador.prototype.fin = function (a) {
        if (a.hecho) return;
        a.hecho = true;
        clearTimeout(a.timer);
        try { a.fn(1); } catch (e) { /* noop */ }
        a.resolve();
    };

    Animador.prototype.update = function (dt) {
        var vivos = [];
        var l = this.lista;
        this.lista = [];
        for (var i = 0; i < l.length; i++) {
            var a = l[i];
            if (a.hecho) continue;
            a.t += dt;
            var u = Math.min(1, a.t / a.dur);
            if (u >= 1) { this.fin(a); continue; }
            try { a.fn(u); } catch (e) { /* noop */ }
            vivos.push(a);
        }
        this.lista = vivos.concat(this.lista);
    };

    Animador.prototype.limpiar = function () {
        var l = this.lista;
        this.lista = [];
        l.forEach(function (a) { this.fin(a); }, this);
    };

    // ------------------------------------------------------------------ texturas de efectos

    function texturas(scene) {
        if (scene.textures.exists("p-chispa")) return;
        var g = scene.add.graphics();
        var hacer = function (clave, w, h, fn) {
            g.clear();
            fn(g);
            g.generateTexture(clave, w, h);
        };
        hacer("p-chispa", 32, 32, function (q) {
            for (var r = 16; r > 0; r -= 2) { q.fillStyle(0xffffff, 0.08 + (16 - r) / 16 * 0.5); q.fillCircle(16, 16, r); }
        });
        hacer("p-polvo", 48, 48, function (q) {
            for (var r = 24; r > 0; r -= 3) { q.fillStyle(0xffffff, 0.06 + (24 - r) / 24 * 0.12); q.fillCircle(24, 24, r); }
        });
        hacer("p-estrella", 40, 40, function (q) {
            var pts = [];
            for (var k = 0; k < 10; k++) {
                var t = -Math.PI / 2 + k * Math.PI / 5;
                var rr = k % 2 ? 8 : 19;
                pts.push({ x: 20 + Math.cos(t) * rr, y: 20 + Math.sin(t) * rr });
            }
            q.fillStyle(0xffffff, 1);
            q.fillPoints(pts, true, true);
        });
        hacer("p-confeti", 14, 22, function (q) { q.fillStyle(0xffffff, 1); q.fillRoundedRect(1, 1, 12, 20, 3); });
        hacer("p-destello", 64, 64, function (q) {
            q.fillStyle(0xffffff, 1);
            q.fillPoints([{ x: 32, y: 0 }, { x: 36, y: 28 }, { x: 64, y: 32 }, { x: 36, y: 36 }, { x: 32, y: 64 }, { x: 28, y: 36 }, { x: 0, y: 32 }, { x: 28, y: 28 }], true, true);
        });
        hacer("p-luz", 128, 128, function (q) {
            for (var r = 64; r > 0; r -= 4) { q.fillStyle(0xffffff, 0.03 + (64 - r) / 64 * 0.09); q.fillCircle(64, 64, r); }
        });
        g.destroy();
    }

    // ------------------------------------------------------------------ horno de texturas
    //
    // Phaser 4 vuelve a teselar cada Graphics en cada cuadro. Lo que no cambia cuadro a cuadro (el
    // paisaje, los muebles, los sólidos ya dibujados) se pinta una vez en un DynamicTexture y se
    // muestra como una imagen: mismo dibujo, casi sin costo por cuadro.

    var contador = 0;

    function lapiz(scene) {
        if (!scene.__lapizPuzle) scene.__lapizPuzle = scene.make.graphics({}, false);
        return scene.__lapizPuzle;
    }

    /**
     * Región de dibujo [x0, x0 + w] × [y0, y0 + h] en coordenadas locales. Con `mundo` la imagen
     * queda fija en (x0, y0); si no, su origen es el (0, 0) local (el ancla de un sólido).
     */
    function Horno(scene, x0, y0, w, h, opciones) {
        var o = opciones || {};
        this.scene = scene;
        this.mundo = !!o.mundo;
        this.key = "horno-puzle-" + (contador++);
        this.medir(x0, y0, w, h);
        this.dt = scene.textures.addDynamicTexture(this.key, this.w, this.h);
        this.img = scene.add.image(0, 0, this.key);
        this.ubicar();
        if (o.prof != null) this.img.setDepth(o.prof);
        if (o.suma) this.img.setBlendMode(global.Phaser.BlendModes.ADD);
    }

    Horno.prototype.medir = function (x0, y0, w, h) {
        this.x0 = Math.floor(x0);
        this.y0 = Math.floor(y0);
        this.w = Math.max(2, Math.ceil(w));
        this.h = Math.max(2, Math.ceil(h));
    };

    Horno.prototype.ubicar = function () {
        if (this.mundo) this.img.setOrigin(0, 0).setPosition(this.x0, this.y0);
        else this.img.setOrigin(-this.x0 / this.w, -this.y0 / this.h);
    };

    /** Mueve la región sin cambiar el tamaño de la textura (debe caber). */
    Horno.prototype.region = function (x0, y0) {
        this.x0 = Math.floor(x0);
        this.y0 = Math.floor(y0);
        this.ubicar();
    };

    /** fn(g) dibuja en coordenadas locales; reemplaza el contenido de la textura. */
    Horno.prototype.pintar = function (fn) {
        var g = lapiz(this.scene);
        g.clear();
        fn(g);
        this.dt.clear();
        this.dt.draw(g, -this.x0, -this.y0);
        if (this.dt.render) this.dt.render();
        return this.img;
    };

    Horno.prototype.vaciar = function () {
        this.dt.clear();
        if (this.dt.render) this.dt.render();
    };

    Horno.prototype.destruir = function () {
        this.img.destroy();
        if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    };

    /**
     * Un sólido horneado: imagen con el ancla del sólido en su origen. La textura se mide para las
     * dos orientaciones (girar no obliga a rehacerla). `img` se usa como cualquier objeto Phaser.
     */
    function Solido(scene, def, esc, extra, prof) {
        var S = global.SolidosPuzle;
        var a = S.rect2d(def, 0, esc), b = S.rect2d(def, 1, esc);
        var pad = (extra || 10) + 6;
        this.def = def;
        this.esc = esc;
        this.pad = pad;
        this.horno = new Horno(scene, Math.min(a.x0, b.x0) - pad, Math.min(a.y0, b.y0) - pad,
            Math.max(a.x1, b.x1) - Math.min(a.x0, b.x0) + pad * 2, Math.max(a.y1, b.y1) - Math.min(a.y0, b.y0) + pad * 2, { prof: prof });
        this.img = this.horno.img;
        this.firma = null;
    }

    /** op: opciones de SolidosPuzle.dibujar (sin esc). Solo vuelve a hornear si algo cambió. */
    Solido.prototype.pintar = function (orient, op) {
        var o = op || {};
        var firma = [orient, o.color, o.deco, o.brillo ? o.brillo.toFixed(2) : 0, o.fantasma ? 1 : 0, o.contorno, o.anchoContorno].join("|");
        if (firma === this.firma) return this.img;
        this.firma = firma;
        var self = this;
        var S = global.SolidosPuzle;
        var copia = {};
        Object.keys(o).forEach(function (k) { copia[k] = o[k]; });
        copia.esc = this.esc;
        return this.horno.pintar(function (g) { S.dibujar(g, self.def, orient, copia); });
    };

    Solido.prototype.destruir = function () { this.horno.destruir(); };

    // ------------------------------------------------------------------ partículas

    function Particulas(scene, n, prof) {
        this.lista = [];
        for (var i = 0; i < n; i++) {
            var im = scene.add.image(-100, -100, "p-chispa").setVisible(false).setDepth(prof || 600);
            this.lista.push({ img: im, vivo: false, t: 0 });
        }
        this.i = 0;
    }

    Particulas.prototype.emitir = function (x, y, o) {
        var Phaser = global.Phaser;
        var tipos = o.tipos || ["p-estrella"];
        for (var k = 0; k < (o.n || 8); k++) {
            var p = this.lista[this.i];
            this.i = (this.i + 1) % this.lista.length;
            var ang = o.angulo != null ? o.angulo + (Math.random() - 0.5) * (o.apertura || 1) : Math.random() * Math.PI * 2;
            var v = (o.vel || 260) * (0.5 + Math.random() * 0.7);
            var tx = tipos[Math.floor(Math.random() * tipos.length)];
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 1100) * (0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v;
            p.vy = Math.sin(ang) * v;
            p.grav = o.grav != null ? o.grav : 320;
            p.giro = (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.6) * (0.7 + Math.random() * 0.6);
            p.aleteo = !!o.aleteo;
            p.crece = !!o.crece;
            p.fase = Math.random() * 6;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.sumar ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 20), y + (Math.random() - 0.5) * (o.dispersionY != null ? o.dispersionY : (o.dispersion || 20)));
            p.img.setScale(p.esc).setAlpha(o.alfa || 1).setVisible(true).setRotation(Math.random() * 6);
            p.alfa = o.alfa || 1;
        }
    };

    Particulas.prototype.update = function (dt) {
        var s = dt / 1000;
        for (var i = 0; i < this.lista.length; i++) {
            var p = this.lista[i];
            if (!p.vivo) continue;
            p.t += dt;
            var u = p.t / p.vida;
            if (u >= 1) { p.vivo = false; p.img.setVisible(false); continue; }
            p.vy += p.grav * s;
            if (p.aleteo) { p.vx *= 0.985; p.vy = Math.min(p.vy, 170); }
            p.img.x += p.vx * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(p.alfa * (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3));
            var e = p.crece ? p.esc * (0.5 + u * 1.2) : p.esc * (u < 0.12 ? 0.4 + u * 5 : 1);
            p.img.setScale(p.aleteo ? e * Math.cos(p.t * 0.012 + p.fase) : e, e);
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    global.MotorPuzle = {
        W: W,
        H: H,
        FUENTE: "Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif",
        reducido: reducido,
        suave: suave,
        saleSuave: saleSuave,
        entraSuave: entraSuave,
        lerp: lerp,
        rebote: rebote,
        rad: rad,
        sleep: sleep,
        Animador: Animador,
        Particulas: Particulas,
        Horno: Horno,
        Solido: Solido,
        texturas: texturas
    };
})(typeof window !== "undefined" ? window : global);
