/**
 * BandejaPuzle — estación de materiales a la izquierda (window.BandejaPuzle).
 *
 * Un mueble del taller con focos arriba y un compartimento por bloque. Cada compartimento muestra
 * el bloque (tipo, forma, color y tamaño a escala), se ilumina al elegirlo, deja ver la silueta
 * cuando el bloque sale y muestra un visto cuando quedó en la construcción. Los focos de la
 * estación reaccionan a EventosPuzle. La entrada (tocar y arrastrar) la maneja la escena con las
 * zonas de cada compartimento.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorPuzle; };
    var S = function () { return global.SolidosPuzle; };
    var R = function () { return global.ReglasPuzle; };
    var EV = function () { return global.EventosPuzle; };
    var Phaser = global.Phaser;

    var MARCO = { x0: 214, x1: 506, y0: 104, y1: 624 };
    var AREA = { x0: 230, x1: 490, y0: 160, y1: 610 };

    function Bandeja(scene, variante) {
        var self = this;
        this.scene = scene;
        this.v = variante || {};
        var est = this.v.estacion || {};
        this.marco = S().hexA(est.marco || "#ff922b");
        this.oscuro = S().hexA(est.oscuro || "#c25e0a");
        this.luz = S().hexA(est.luz || "#ffe066");
        this.fichas = [];
        this.huecos = [];
        this.celda = { w: 120, h: 120 };
        this.focos = [];
        this.flash = { color: this.luz, t: 0 };
        // mueble y compartimentos horneados (solo cambian con el estado); encima, lo que late cada cuadro
        this.hMueble = new (M().Horno)(scene, MARCO.x0 - 4, MARCO.y0 - 4, MARCO.x1 - MARCO.x0 + 50, MARCO.y1 - MARCO.y0 + 40, { mundo: true, prof: 200 });
        this.hHuecos = new (M().Horno)(scene, AREA.x0 - 4, AREA.y0 - 4, AREA.x1 - AREA.x0 + 8, AREA.y1 - AREA.y0 + 8, { mundo: true, prof: 201 });
        this.gHuecos = scene.add.graphics().setDepth(201.5);
        this.gFocos = scene.add.graphics().setDepth(202);
        this.pintarMueble();
        this.titulo = scene.add.text((MARCO.x0 + MARCO.x1) / 2, 140, "MATERIALES", {
            fontFamily: M().FUENTE, fontSize: "22px", fontStyle: "700", color: "#ffffff",
            stroke: "#" + this.oscuro.toString(16).padStart(6, "0"), strokeThickness: 5
        }).setOrigin(0.5).setDepth(203);
        for (var i = 0; i < 7; i++) this.focos.push({ x: MARCO.x0 + 30 + i * ((MARCO.x1 - MARCO.x0 - 60) / 6), y: MARCO.y0 + 10, luz: 0, fase: i * 0.9 });
        this.zonas = [];
        var b = EV();
        this.quitar = [];
        if (b) {
            this.quitar.push(b.on("bloque_seleccionado", function () { self.destellar(0xffe066); }));
            this.quitar.push(b.on("bloque_ensamblado", function () { self.destellar(0x8ce99a); }));
            this.quitar.push(b.on("capa_completada", function () { self.destellar(0x74c0fc, 1.6); }));
            this.quitar.push(b.on("construccion_completada", function () { self.destellar(0xffd43b, 3); }));
        }
    }

    Bandeja.MARCO = MARCO;

    Bandeja.prototype.pintarMueble = function () {
        var self = this;
        this.hMueble.pintar(function (g) { self.dibujarMueble(g); });
    };

    Bandeja.prototype.dibujarMueble = function (g) {
        var w = MARCO.x1 - MARCO.x0, h = MARCO.y1 - MARCO.y0;
        // patas y sombra
        g.fillStyle(0x1f2a44, 0.2);
        g.fillEllipse(MARCO.x0 + w / 2 + 10, MARCO.y1 + 12, w + 30, 26);
        g.fillStyle(this.oscuro, 1);
        g.fillRoundedRect(MARCO.x0 + 6, MARCO.y0 + 10, w, h, 26);
        g.fillStyle(this.marco, 1);
        g.fillRoundedRect(MARCO.x0, MARCO.y0, w, h, 26);
        g.fillStyle(S().mezclar(this.marco, 0xffffff, 0.25), 1);
        g.fillRoundedRect(MARCO.x0 + 8, MARCO.y0 + 6, w - 16, 18, 9);
        // fondo del estante
        g.fillStyle(0xfff8f0, 1);
        g.fillRoundedRect(AREA.x0 - 6, AREA.y0 - 8, AREA.x1 - AREA.x0 + 12, AREA.y1 - AREA.y0 + 14, 18);
        g.lineStyle(4, this.oscuro, 1);
        g.strokeRoundedRect(MARCO.x0, MARCO.y0, w, h, 26);
        // tornillos
        [[MARCO.x0 + 16, MARCO.y1 - 14], [MARCO.x1 - 16, MARCO.y1 - 14]].forEach(function (p) {
            g.fillStyle(0xe9ecef, 1); g.fillCircle(p[0], p[1], 5);
        });
    };

    Bandeja.prototype.destellar = function (color, fuerza) {
        this.flash = { color: color, t: fuerza || 1 };
    };

    /** Compartimentos según la cantidad de bloques: 2 columnas hasta 6 bloques, luego 3. */
    Bandeja.prototype.armarHuecos = function (n) {
        var cols = n <= 6 ? 2 : 3;
        var filas = Math.ceil(n / cols);
        var gap = 10;
        var cw = (AREA.x1 - AREA.x0 - gap * (cols - 1)) / cols;
        var ch = Math.min(150, (AREA.y1 - AREA.y0 - gap * (filas - 1)) / filas);
        var top = AREA.y0 + ((AREA.y1 - AREA.y0) - (ch * filas + gap * (filas - 1))) / 2;
        this.celda = { w: cw, h: ch };
        this.huecos = [];
        for (var f = 0; f < filas; f++) {
            for (var c = 0; c < cols; c++) this.huecos.push({ x: AREA.x0 + cw / 2 + c * (cw + gap), y: top + ch / 2 + f * (ch + gap) });
        }
        var self = this;
        this.zonas.forEach(function (z) { z.destroy(); });
        this.zonas = this.huecos.map(function (h, i) {
            var z = self.scene.add.zone(h.x, h.y, cw, ch).setDepth(215);
            z.setInteractive({ draggable: true, useHandCursor: true });
            z.setData("hueco", i);
            return z;
        });
    };

    /**
     * Bloques del nivel. lista: [{ id, forma, def, rot, color, deco, hueco }]; esc: escala de la
     * construcción (los bloques se dibujan a esa escala y se reducen para caber en la bandeja).
     */
    Bandeja.prototype.configurar = function (lista, esc) {
        var self = this;
        this.fichas.forEach(function (f) { f.solido.destruir(); f.silueta.destruir(); });
        this.firmaHuecos = null;
        this.esc = esc || 1;
        this.armarHuecos(lista.length);
        // Cada bloque cabe en su compartimento, pero los tamaños se comprimen sin perder el orden: el
        // bloque más grande se sigue viendo más grande que el cubo (reconocer tamaños es parte del juego).
        var ajustes = lista.map(function (p) {
            var r0 = S().rect2d(p.def, 0, self.esc), r1 = S().rect2d(p.def, 1, self.esc);
            var w = Math.max(r0.w, r1.w), h = Math.max(r0.h, r1.h);
            return Math.min(1.6, (self.celda.w - 16) / w, (self.celda.h - 16) / h);
        });
        var comun = Math.min.apply(null, ajustes);
        this.fichas = lista.map(function (p, i) {
            var fit = Math.min(ajustes[i], comun * Math.pow(ajustes[i] / comun, 0.45));
            // bloque y silueta horneados: se vuelven a pintar solo al girar
            var solido = new (M().Solido)(self.scene, p.def, self.esc, 10, 212);
            var silueta = new (M().Solido)(self.scene, p.def, self.esc * fit, 8, 211);
            var g = solido.img, sil = silueta.img.setAlpha(0);
            var f = {
                id: p.id, forma: p.forma, def: p.def, rot: p.rot || 0, color: p.color, deco: p.deco,
                hueco: p.hueco != null ? p.hueco : i, g: g, sil: sil, solido: solido, silueta: silueta, fit: fit, esc: fit, escObj: fit, k: 0,
                estado: "disponible", fase: i * 0.8, sacudir: 0, giro: 0, flota: 0
            };
            self.dibujar(f);
            var c = self.puntoHueco(f);
            g.setPosition(c.x, c.y).setScale(0.01);
            sil.setPosition(c.x, c.y);
            return f;
        });
        this.zonas.forEach(function (z, i) {
            var f = self.fichas.filter(function (x) { return x.hueco === i; })[0];
            z.setData("ficha", f ? f.id : null);
            if (z.input) z.input.enabled = !!f;
        });
    };

    Bandeja.prototype.ficha = function (id) { return this.fichas.filter(function (f) { return f.id === id; })[0] || null; };
    Bandeja.prototype.fichaDeZona = function (zona) { return this.ficha(zona.getData("ficha")); };

    Bandeja.prototype.puntoHueco = function (f) {
        return this.huecos[f.hueco % Math.max(1, this.huecos.length)] || { x: 360, y: 380 };
    };

    /** Redibuja el bloque con su orientación actual (y la silueta que queda al sacarlo). */
    Bandeja.prototype.dibujar = function (f, brillo) {
        f.solido.pintar(R().indice(f.rot), { color: f.color, deco: f.deco, brillo: brillo || 0 });
        f.silueta.pintar(R().indice(f.rot), { color: "#adb5bd", fantasma: true, contorno: 0x868e96, anchoContorno: 2.5 });
    };

    Bandeja.prototype.update = function (dt, ts) {
        var self = this;
        var k = Math.min(1, dt / 110);
        this.flash.t = Math.max(0, this.flash.t - dt / 900);
        this.fichas.forEach(function (f) {
            f.k += (1 - f.k) * Math.min(1, dt / 220);
            // fuera de la bandeja la escala la lleva la escena (crece al tamaño de la guía)
            var enEscena = f.estado === "arrastrando" || f.estado === "cerca" || f.estado === "soltada" || f.estado === "volviendo" || f.estado === "ensamblando";
            if (!enEscena) f.esc += (f.escObj - f.esc) * k;
            f.sacudir = Math.max(0, f.sacudir - dt / 500);
            f.giro = Math.max(0, f.giro - dt / 260);
            // fuera de la bandeja: la escena lo mueve (incluye "cerca", el bloque correcto junto a su lugar)
            var fuera = f.estado === "arrastrando" || f.estado === "cerca" || f.estado === "soltada" || f.estado === "volviendo" || f.estado === "ensamblando";
            var sil = f.estado === "arrastrando" || f.estado === "cerca" || f.estado === "soltada" || f.estado === "volviendo" ? 0.75 : 0;
            f.sil.setAlpha(f.sil.alpha + (sil - f.sil.alpha) * k);
            if (f.estado === "ensamblada") { f.g.setVisible(false); return; }
            if (!fuera) {
                var h = self.puntoHueco(f);
                var flota = f.estado === "seleccionada" ? -6 + Math.sin(ts * 4) * 3 : Math.sin(ts * 1.6 + f.fase) * 2;
                var tiembla = f.sacudir > 0 ? Math.sin(ts * 50) * 6 * f.sacudir : 0;
                f.g.setPosition(h.x + tiembla, h.y + flota);
                var pop = 1 + Math.sin(f.giro * Math.PI) * 0.1;
                f.g.setScale(f.esc * f.k * pop).setRotation(f.giro > 0 ? Math.sin(f.giro * Math.PI) * 0.12 : 0);
                f.g.setAlpha(f.estado === "bloqueada" ? 0.55 : 1);
            }
        });
        this.pintarHuecos(ts);
        this.pintarFocos(ts);
    };

    /** Compartimentos: se hornean cuando cambia algún estado; el borde del elegido late encima. */
    Bandeja.prototype.pintarHuecos = function (ts) {
        var self = this;
        var w = this.celda.w, h = this.celda.h;
        var por = {};
        this.fichas.forEach(function (f) { por[f.hueco] = f; });
        var activo = function (f) { return f && (f.estado === "seleccionada" || f.estado === "rotando" || f.estado === "arrastrando" || f.estado === "cerca" || f.estado === "volviendo"); };
        var firma = this.huecos.map(function (c, i) { var f = por[i]; return f ? (activo(f) ? "s" : f.estado.charAt(0) + f.estado.charAt(2)) : "-"; }).join("");
        if (firma !== this.firmaHuecos) {
            this.firmaHuecos = firma;
            this.hHuecos.pintar(function (g) { self.dibujarHuecos(g, por, activo); });
        }
        var gl = this.gHuecos;
        gl.clear();
        var p = 0.5 + 0.5 * Math.sin(ts * 6);
        this.huecos.forEach(function (c, i) {
            if (!activo(por[i])) return;
            gl.lineStyle(5, 0xffd43b, 0.55 + 0.45 * p);
            gl.strokeRect(c.x - w / 2 + 3, c.y - h / 2 + 3, w - 6, h - 6);
        });
    };

    Bandeja.prototype.dibujarHuecos = function (g, por, activo) {
        var self = this;
        var w = this.celda.w, h = this.celda.h;
        this.huecos.forEach(function (c, i) {
            var f = por[i];
            var x = c.x - w / 2, y = c.y - h / 2;
            g.fillStyle(0xf1e3d3, 1);
            g.fillRoundedRect(x, y, w, h, 14);
            g.fillStyle(0xe6d2bb, 1);
            g.fillRoundedRect(x + 4, y + h - 16, w - 8, 12, 6);
            g.lineStyle(3, S().mezclar(self.oscuro, 0xffffff, 0.35), 1);
            g.strokeRoundedRect(x, y, w, h, 14);
            if (!f) return;
            if (f.estado === "ensamblada") {
                g.fillStyle(0x2f9e44, 0.22);
                g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 12);
                g.lineStyle(7, 0x2f9e44, 1);
                g.beginPath();
                g.moveTo(c.x - 18, c.y);
                g.lineTo(c.x - 5, c.y + 13);
                g.lineTo(c.x + 20, c.y - 14);
                g.strokePath();
            } else if (activo(f)) {
                g.fillStyle(0xffe066, 0.28);
                g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 12);
                g.lineStyle(4, 0xffd43b, 0.9);
                g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 14);
            } else if (f.estado === "bloqueada") {
                g.fillStyle(0x000000, 0.08);
                g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 12);
            } else {
                g.lineStyle(2.5, self.luz, 0.45);
                g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 11);
            }
        });
    };

    Bandeja.prototype.pintarFocos = function (ts) {
        var g = this.gFocos, self = this;
        g.clear();
        var fl = this.flash;
        this.focos.forEach(function (f, i) {
            var ambiente = 0.35 + 0.35 * Math.max(0, Math.sin(ts * 2.4 - f.fase));
            var on = Math.max(ambiente, Math.min(1, fl.t) * (0.6 + 0.4 * Math.sin(ts * 14 + i)));
            var col = fl.t > 0.05 ? S().mezclar(self.luz, fl.color, Math.min(1, fl.t)) : self.luz;
            g.fillStyle(0x343a40, 1);
            g.fillRoundedRect(f.x - 9, f.y - 4, 18, 10, 3);
            g.fillStyle(S().mezclar(0x868e96, col, on), 1);
            g.fillCircle(f.x, f.y + 8, 8);
            g.fillStyle(0xffffff, 0.5 * on);
            g.fillCircle(f.x - 2, f.y + 6, 3);
        });
    };

    /** Todos los bloques bloqueados (animaciones de cierre) o no. */
    Bandeja.prototype.bloquear = function (on) {
        this.fichas.forEach(function (f) {
            if (on && (f.estado === "disponible" || f.estado === "seleccionada")) f.estado = "bloqueada";
            else if (!on && f.estado === "bloqueada") f.estado = "disponible";
        });
        this.zonas.forEach(function (z) { if (z.input) z.input.enabled = !on && !!z.getData("ficha"); });
    };

    /** Las fichas del nivel que termina se van encogiendo. */
    Bandeja.prototype.vaciar = function () {
        var self = this;
        return new Promise(function (resolve) {
            var t0 = Date.now();
            var paso = function () {
                var u = Math.min(1, (Date.now() - t0) / 400);
                self.fichas.forEach(function (f) { if (f.estado !== "ensamblada") f.g.setScale(f.esc * (1 - u)); });
                if (u < 1) setTimeout(paso, 16); else resolve();
            };
            paso();
        });
    };

    Bandeja.prototype.destruir = function () {
        this.quitar.forEach(function (f) { f(); });
        this.quitar = [];
    };

    global.BandejaPuzle = Bandeja;
})(typeof window !== "undefined" ? window : global);
