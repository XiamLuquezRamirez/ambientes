/**
 * MotorRobot — utilidades de animación compartidas por el laboratorio, el robot, la consola y la
 * escena (window.MotorRobot).
 *
 *  - Animador: tweens con delta time que devuelven Promise y se cierran solos por tiempo si la
 *    pestaña está oculta (los frames de Phaser no corren).
 *  - Particulas: reserva fija de imágenes, sin crear objetos en cada efecto.
 *  - img(): imagen a su tamaño de diseño (compensa la resolución del rasterizado SVG).
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    var D = function () { return global.DibujosRobot; };
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
    function hexA(n) { return typeof n === "number" ? n : parseInt(String(n).replace("#", ""), 16); }

    /** Mezcla dos colores 0xRRGGBB. */
    function mezclar(a, b, u) {
        var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(lerp(ar, br, u)) << 16) | (Math.round(lerp(ag, bg, u)) << 8) | Math.round(lerp(ab, bb, u));
    }

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

    // ------------------------------------------------------------------ imágenes y texturas

    function tex(scene, key) {
        if (!scene.textures.exists(key) && D().lienzo(key)) scene.textures.addCanvas(key, D().lienzo(key));
    }

    function img(scene, x, y, key, k) {
        var i = scene.add.image(x, y, key);
        i.base = (k || 1) / D().res(key);
        i.setScale(i.base);
        return i;
    }

    // ------------------------------------------------------------------ partículas

    function Particulas(scene, n, prof) {
        this.lista = [];
        for (var i = 0; i < n; i++) {
            var im = scene.add.image(-100, -100, "chispa").setVisible(false).setDepth(prof || 60);
            this.lista.push({ img: im, vivo: false, t: 0 });
        }
        this.i = 0;
    }

    Particulas.prototype.emitir = function (x, y, o) {
        var Phaser = global.Phaser;
        var tipos = o.tipos || ["estrella"];
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
            p.esc = (o.escala || 0.6) * (0.7 + Math.random() * 0.6) / D().res(tx);
            p.aleteo = !!o.aleteo;
            p.fase = Math.random() * 6;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.sumar ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 20), y + (Math.random() - 0.5) * (o.dispersion || 20));
            p.img.setScale(p.esc).setAlpha(1).setVisible(true).setRotation(Math.random() * 6);
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
            p.img.setAlpha(u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25);
            var e = p.esc * (u < 0.12 ? 0.4 + u * 5 : 1);
            p.img.setScale(p.aleteo ? e * Math.cos(p.t * 0.012 + p.fase) : e, e);
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    global.MotorRobot = {
        W: W,
        H: H,
        FUENTE: "Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif",
        /** Centro del torso del robot en el mundo de diseño. */
        ROBOT: { x: 800, y: 445 },
        reducido: reducido,
        suave: suave,
        saleSuave: saleSuave,
        entraSuave: entraSuave,
        lerp: lerp,
        rebote: rebote,
        rad: rad,
        sleep: sleep,
        hexA: hexA,
        mezclar: mezclar,
        Animador: Animador,
        Particulas: Particulas,
        tex: tex,
        img: img
    };
})(typeof window !== "undefined" ? window : global);
