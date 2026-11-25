/**
 * MonstruoTragabolas — el monstruito por piezas (window.MonstruoTragabolas).
 *
 * Cuerpo, brazos y gorrito son imágenes (DibujosMonstruo); ojos, cejas, boca y mejillas son Graphics que se
 * redibujan en cada cuadro según su estado. Todo cuelga de un Container: respirar, saltar y aplastarse mueve todo
 * junto. Coordenadas locales: centro del cuerpo en (0, 0), boca en (0, BOCA_Y).
 *
 * Estados: "espera" (boca abierta, respira, parpadea, mira la bandeja), "hambre" (abre más la boca, mueve las
 * manos, saltitos), "come" (cierra, infla las mejillas, mastica, sonríe y salta), "celebra" (brazos arriba,
 * saltitos), "risa" (un fallo: se ríe sin perder la sonrisa).
 */
(function (global) {
    "use strict";

    var BOCA_Y = 58;
    var OJO_X = 64, OJO_Y = -58;
    var TINTA = 0x1b5e5f;
    var PIEL = 0x4fd3c0;

    function lerp(a, b, u) { return a + (b - a) * u; }
    function acercar(v, obj, dt, vel) { return v + (obj - v) * (1 - Math.exp(-dt * vel / 1000)); }
    function bez(p0, p1, p2, u) { var v = 1 - u; return v * v * p0 + 2 * v * u * p1 + u * u * p2; }
    function cub(p0, p1, p2, p3, u) { var v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; }

    function Monstruo(scene, o) {
        var D = global.DibujosMonstruo;
        this.scene = scene;
        this.anim = o.anim;
        this.x = o.x;
        this.y = o.y;
        this.escala = o.escala || 1;
        this.cont = scene.add.container(o.x, o.y).setDepth(o.depth || 20);

        var img = function (key, x, y) {
            var i = scene.add.image(x, y, key);
            i.base = 1 / D.res(key);
            i.setScale(i.base);
            return i;
        };
        this.brazoI = img("monBrazo", -150, 40).setOrigin(0.5, 0.11);
        this.brazoD = img("monBrazo", 150, 40).setOrigin(0.5, 0.11);
        this.brazoD.setFlipX(true);
        this.cuerpo = img("monCuerpo", 0, 0).setOrigin(230 / 460, 250 / 480);
        this.gMejillas = scene.add.graphics();
        this.gCara = scene.add.graphics();
        this.gBoca = scene.add.graphics();
        this.sombrero = img("gorro", 48, -168).setOrigin(0.5, 0.9).setRotation(0.22).setVisible(false);
        this.cont.add([this.brazoI, this.brazoD, this.cuerpo, this.gMejillas, this.gBoca, this.gCara, this.sombrero]);
        this.cont.setScale(this.escala);

        this.t = Math.random() * 1000;
        this.estado = "espera";
        this.apertura = 0.85;      // 0 cerrada · 1 abierta · 1.25 muy abierta
        this.aperturaObj = 0.85;
        this.mejillas = 0;         // inflado 0..1
        this.mastica = 0;          // 0..1 mientras mastica (onda en la boca)
        this.feliz = 0;            // ojos "^ ^"
        this.cejas = 0;            // 1 = levantadas (sorpresa / hambre)
        this.parpadeo = 0;         // 0 abierto · 1 cerrado
        this.tParpadeo = 1800;
        this.mirada = { x: 0, y: 1 };
        this.miradaObj = { x: 0, y: 1 };
        this.objetivo = null;      // punto del mundo que miran los ojos
        this.brazos = 0;           // 0 normal · 1 arriba
        this.brazosObj = 0;
        this.saltoY = 0;
        this.aplasta = 0;          // -1 estirado · 1 aplastado
        this.meneo = 0;
        this.risa = 0;
        this.pausado = false;
    }

    Monstruo.prototype.boca = function () {
        return { x: this.cont.x, y: this.cont.y + (BOCA_Y + this.saltoY / this.escala) * this.escala };
    };

    Monstruo.prototype.colocar = function (x, y, escala) {
        this.x = x; this.y = y;
        if (escala) this.escala = escala;
        this.cont.setPosition(x, y).setScale(this.escala);
    };

    Monstruo.prototype.mirar = function (p) { this.objetivo = p ? { x: p.x, y: p.y } : null; };
    Monstruo.prototype.gorro = function (on) { this.sombrero.setVisible(!!on); };

    Monstruo.prototype.hambre = function (on) {
        if (this.estado === "come" || this.estado === "celebra") return;
        this.estado = on ? "hambre" : "espera";
    };

    /** La bola entró: cierra la boca, mejillas infladas, mastica, traga, sonríe y salta. */
    Monstruo.prototype.comer = function () {
        var self = this;
        this.estado = "come";
        this.objetivo = null;
        return this.anim.agregar(1750, function (u) {
            if (u < 0.1) {                         // ¡ñam! cierra de golpe
                self.aperturaObj = 0;
                self.apertura = lerp(self.apertura, 0, 0.5);
                self.aplasta = Math.sin(u / 0.1 * Math.PI) * 0.6;
                self.mejillas = u / 0.1 * 0.9;
                self.feliz = u / 0.1;
            } else if (u < 0.66) {                 // mastica tres veces
                var k = (u - 0.1) / 0.56;
                self.mejillas = 0.75 + 0.25 * Math.abs(Math.sin(k * Math.PI * 3));
                self.mastica = 1;
                self.aplasta = Math.sin(k * Math.PI * 6) * 0.25;
                self.feliz = 1;
            } else if (u < 0.8) {                  // traga
                var g = (u - 0.66) / 0.14;
                self.mastica = 1 - g;
                self.mejillas = lerp(0.8, 0, g);
                self.aplasta = -Math.sin(g * Math.PI) * 0.35;
                self.brazosObj = 1;
            } else {                               // sonríe y salta de felicidad
                var s = (u - 0.8) / 0.2;
                self.mastica = 0;
                self.mejillas = 0;
                self.saltoY = -Math.sin(s * Math.PI) * 46;
                self.aperturaObj = 0.55;
                self.feliz = 1;
                self.brazosObj = 1;
            }
            if (u >= 1) {
                self.saltoY = 0;
                self.aplasta = 0;
                self.mastica = 0;
                self.mejillas = 0;
                self.feliz = 0;
                self.brazosObj = 0;
                self.estado = "espera";
                self.aperturaObj = 0.85;
            }
        });
    };

    /** Celebración: brazos arriba, boca sonriente y saltitos (ms). */
    Monstruo.prototype.celebrar = function (ms) {
        var self = this;
        this.estado = "celebra";
        this.brazosObj = 1;
        this.objetivo = null;
        var dur = ms || 2400;
        var saltos = Math.max(2, Math.round(dur / 600));
        return this.anim.agregar(dur, function (u) {
            self.feliz = 1;
            self.aperturaObj = 0.7;
            var k = u * saltos;
            self.saltoY = -Math.abs(Math.sin(k * Math.PI)) * 52;
            self.aplasta = Math.sin(k * Math.PI * 2) * 0.18;
            self.meneo = Math.sin(u * Math.PI * saltos) * 0.08;
            if (u >= 1) {
                self.saltoY = 0; self.aplasta = 0; self.meneo = 0; self.feliz = 0;
                self.brazosObj = 0; self.estado = "espera"; self.aperturaObj = 0.85;
            }
        });
    };

    /** La bola pasó de largo: el monstruito se ríe (no se asusta ni se pone triste). */
    Monstruo.prototype.reir = function () {
        var self = this;
        if (this.estado === "come" || this.estado === "celebra") return Promise.resolve();
        this.estado = "risa";
        return this.anim.agregar(900, function (u) {
            self.risa = Math.sin(u * Math.PI);
            self.meneo = Math.sin(u * Math.PI * 6) * 0.06 * (1 - u);
            self.feliz = u < 0.85 ? 1 : 0;
            self.aperturaObj = 0.5;
            if (u >= 1) { self.risa = 0; self.meneo = 0; self.feliz = 0; self.estado = "espera"; self.aperturaObj = 0.85; }
        });
    };

    /** Saltito de presentación. */
    Monstruo.prototype.saltito = function (alto) {
        var self = this;
        return this.anim.agregar(520, function (u) {
            self.saltoY = -Math.sin(u * Math.PI) * (alto || 30);
            self.aplasta = u < 0.15 ? u / 0.15 * 0.3 : (u > 0.85 ? (1 - u) / 0.15 * 0.3 : -0.15);
            if (u >= 1) { self.saltoY = 0; self.aplasta = 0; }
        });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    Monstruo.prototype.update = function (dt) {
        if (this.pausado) return;
        this.t += dt;
        var t = this.t;
        var hambre = this.estado === "hambre";

        // boca: abierta en espera, más abierta con hambre; "respira" un poquito
        if (this.estado === "espera") this.aperturaObj = 0.85 + Math.sin(t / 700) * 0.05;
        if (hambre) this.aperturaObj = 1.2 + Math.sin(t / 160) * 0.05;
        if (this.estado !== "come") this.apertura = acercar(this.apertura, this.aperturaObj, dt, 9);
        this.cejas = acercar(this.cejas, hambre ? 1 : 0, dt, 8);
        this.brazos = acercar(this.brazos, this.brazosObj, dt, 7);

        // parpadeo
        this.tParpadeo -= dt;
        if (this.tParpadeo < 0) {
            this.parpadeo = 1;
            this.tParpadeo = 2200 + Math.random() * 2600;
        }
        this.parpadeo = Math.max(0, this.parpadeo - dt / 140);

        // mirada: a lo que se le pidió (bola, vuelo) o a la bandeja
        var obj = this.objetivo;
        var mx = 0, my = 0.7;
        if (obj) {
            var lx = (obj.x - this.cont.x) / this.escala, ly = (obj.y - this.cont.y) / this.escala - OJO_Y;
            var d = Math.hypot(lx, ly) || 1;
            mx = lx / d; my = ly / d;
        } else if (this.estado === "espera") {
            mx = Math.sin(t / 1900) * 0.5; my = 0.75;
        }
        this.mirada.x = acercar(this.mirada.x, mx, dt, 10);
        this.mirada.y = acercar(this.mirada.y, my, dt, 10);

        // cuerpo: respira, cabecea, salta
        var resp = Math.sin(t / 620) * 0.022;
        var hop = hambre ? -Math.abs(Math.sin(t / 210)) * 12 : 0;
        var sx = 1 - resp * 0.5 + this.aplasta * 0.12;
        var sy = 1 + resp - this.aplasta * 0.14;
        this.cont.setScale(this.escala * sx, this.escala * sy);
        this.cont.y = this.y + this.saltoY + hop * this.escala;
        this.cont.x = this.x;
        this.cont.rotation = Math.sin(t / 1300) * 0.025 + this.meneo;

        // brazos: saludan suave; con hambre se mueven más; celebrando, arriba
        var ondaI = Math.sin(t / (hambre ? 170 : 520)) * (hambre ? 0.35 : 0.12);
        var ondaD = Math.sin(t / (hambre ? 170 : 520) + 1.6) * (hambre ? 0.35 : 0.12);
        var arriba = this.brazos;
        this.brazoI.rotation = lerp(0.32 + ondaI, 2.55 + ondaI * 1.3, arriba);
        this.brazoD.rotation = lerp(-0.32 - ondaD, -2.55 - ondaD * 1.3, arriba);
        this.brazoI.y = lerp(40, 18, arriba);
        this.brazoD.y = lerp(40, 18, arriba);

        this.dibujarCara();
        this.dibujarBoca();
    };

    Monstruo.prototype.dibujarCara = function () {
        var g = this.gCara;
        g.clear();
        var feliz = this.feliz > 0.5 || this.risa > 0.3;
        var parp = this.parpadeo;
        var self = this;
        [-1, 1].forEach(function (s) {
            var cx = s * OJO_X, cy = OJO_Y;
            // cejas
            var cejaY = cy - 58 - self.cejas * 12;
            g.lineStyle(7, TINTA, 1);
            g.beginPath();
            g.arc(cx + s * 2, cejaY + 26, 28, Math.PI * 1.22, Math.PI * 1.78, false);
            g.strokePath();
            if (feliz) {
                // ojo feliz: arquito "^"
                g.lineStyle(8, TINTA, 1);
                g.beginPath();
                g.arc(cx, cy + 10, 26, Math.PI * 1.12, Math.PI * 1.88, false);
                g.strokePath();
                return;
            }
            var ry = 45 * (1 - parp * 0.92);
            g.fillStyle(0xffffff, 1);
            g.fillEllipse(cx, cy, 84, ry * 2);
            g.lineStyle(6, TINTA, 1);
            g.strokeEllipse(cx, cy, 84, ry * 2);
            if (ry < 10) return;
            var px = cx + self.mirada.x * 13, py = cy + self.mirada.y * 13 * (ry / 45);
            var rr = Math.min(25, ry * 0.6);
            g.fillStyle(0x3a2a5c, 1);
            g.fillCircle(px, py, rr);
            g.fillStyle(0x15102a, 1);
            g.fillCircle(px, py, rr * 0.62);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(px - rr * 0.36, py - rr * 0.38, rr * 0.36);
            g.fillCircle(px + rr * 0.34, py + rr * 0.3, rr * 0.15);
        });
    };

    Monstruo.prototype.dibujarBoca = function () {
        var g = this.gBoca, m = this.gMejillas;
        g.clear();
        m.clear();
        var a = this.apertura;
        var t = this.t;
        var by = BOCA_Y;

        // mejillas: rubor y, al comer, cachetes inflados
        var inf = this.mejillas;
        [-1, 1].forEach(function (s) {
            if (inf > 0.02) {
                var r = 26 + 34 * inf;
                m.fillStyle(PIEL, 1);
                m.fillCircle(s * (104 + 14 * inf), by - 8, r);
                m.lineStyle(6, TINTA, 1);
                m.beginPath();
                // solo el borde de afuera: el de adentro se funde con la cara
                var a0 = s > 0 ? -1.25 : Math.PI - 1.25;
                m.arc(s * (104 + 14 * inf), by - 8, r, a0, a0 + 2.5, false);
                m.strokePath();
            }
            m.fillStyle(0xff8fab, 0.55 + 0.35 * inf);
            m.fillEllipse(s * (108 + 12 * inf), by - 18 + 4 * inf, 54 + 22 * inf, 30 + 12 * inf);
        });

        if (a < 0.1 || this.mastica > 0.5) {
            // boca cerrada: sonrisa (ondulada mientras mastica)
            var pts = [];
            var w = 132, onda = this.mastica;
            for (var i = 0; i <= 24; i++) {
                var u = i / 24, x = lerp(-w / 2, w / 2, u);
                var y = by + 6 + Math.sin(u * Math.PI) * 26 + (onda ? Math.sin(u * Math.PI * 4 + t / 60) * 6 : 0);
                pts.push({ x: x, y: y });
            }
            g.lineStyle(9, TINTA, 1);
            g.strokePoints(pts, false);
            g.fillStyle(TINTA, 1);
            g.fillCircle(-w / 2, by + 6, 4.5);
            g.fillCircle(w / 2, by + 6, 4.5);
            return;
        }

        var h = 18 + 92 * a;
        var w2 = (150 + 46 * Math.min(1.25, a)) / 2;
        var top = by - h * 0.28, bot = by + h * 0.72;
        var risa = this.risa;
        var borde = [];
        var n = 26;
        // labio de arriba: arquito suave
        for (var k = 0; k <= n; k++) {
            var uu = k / n;
            borde.push({ x: lerp(-w2, w2, uu), y: bez(top, top - 14 - risa * 6, top, uu) });
        }
        // de la comisura derecha, por abajo, a la izquierda
        for (var q = 1; q < n; q++) {
            var v = q / n;
            borde.push({ x: cub(w2, w2 * 0.95, -w2 * 0.95, -w2, v), y: cub(top, bot + h * 0.32, bot + h * 0.32, top, v) });
        }
        g.fillStyle(0x7a1f43, 1);
        g.fillPoints(borde, true);
        // garganta
        g.fillStyle(0x3d0f22, 1);
        g.fillEllipse(0, top + h * 0.42, w2 * 0.9, h * 0.52);
        // lengua
        g.fillStyle(0xff8fab, 1);
        g.fillEllipse(0, bot - h * 0.06, w2 * 1.1, h * 0.42);
        g.fillStyle(0xffb3c6, 1);
        g.fillEllipse(-w2 * 0.12, bot - h * 0.14, w2 * 0.34, h * 0.12);
        g.lineStyle(3, 0xe64980, 0.6);
        g.lineBetween(0, bot - h * 0.2, 0, bot + h * 0.05);
        // dientitos redondos
        g.fillStyle(0xffffff, 1);
        var dh = Math.min(24, 10 + h * 0.18);
        g.fillRoundedRect(-w2 * 0.46 - 13, top - 9, 26, dh, 8);
        g.fillRoundedRect(w2 * 0.46 - 13, top - 9, 26, dh, 8);
        // contorno
        g.lineStyle(7, TINTA, 1);
        g.strokePoints(borde, true);
    };

    Monstruo.prototype.destruir = function () { this.cont.destroy(); };

    global.MonstruoTragabolas = {
        BOCA_Y: BOCA_Y,
        crear: function (scene, o) { return new Monstruo(scene, o); }
    };
})(typeof window !== "undefined" ? window : global);
