/**
 * PanelMaquina — placa superior del taller (window.PanelMaquina): número de nivel y nombre de la
 * máquina, y una fila de indicadores (uno por pieza: rueda, polea o correa a escala) que se
 * encienden al ensamblarla. Así el niño ve cuántas piezas faltan.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorMaquina; };
    var D = function () { return global.DibujosMaquina; };
    var Phaser = global.Phaser;
    var CX = 800, Y0 = 10;

    function Panel(scene, variante) {
        this.scene = scene;
        this.v = variante;
        this.objs = [];
        this.iconos = [];
        this.placa = scene.add.graphics().setDepth(700);
        this.nivelTxt = scene.add.text(CX, Y0 + 24, "", {
            fontFamily: M().FUENTE, fontSize: "26px", fontStyle: "700", color: "#ffffff", stroke: "#0b3954", strokeThickness: 6
        }).setOrigin(0.5).setDepth(702);
        this.visible = true;
    }

    /** destinos: ReglasMaquina.destinos(geo), en orden. */
    Panel.prototype.configurar = function (indice, total, nivel, destinos) {
        var s = this.scene, self = this;
        this.objs.forEach(function (o) { o.destroy(); });
        this.objs = [];
        this.iconos = [];
        this.nivelTxt.setText("NIVEL " + (indice + 1) + " · " + String(nivel.nombre || "").toUpperCase());
        var n = destinos.length;
        var paso = 40;
        var anchoIconos = n * paso;
        var ancho = Math.max(this.nivelTxt.width + 70, anchoIconos + 60);
        this.ancho = ancho;
        var g = this.placa;
        g.clear();
        g.fillStyle(0x0b1d3a, 0.3);
        g.fillRoundedRect(CX - ancho / 2 + 5, Y0 + 7, ancho, 92, 24);
        g.fillStyle(0x1c7ed6, 1);
        g.fillRoundedRect(CX - ancho / 2, Y0, ancho, 92, 24);
        g.fillStyle(0x4dabf7, 1);
        g.fillRoundedRect(CX - ancho / 2 + 8, Y0 + 5, ancho - 16, 12, 6);
        g.lineStyle(4, 0xffd43b, 1);
        g.strokeRoundedRect(CX - ancho / 2, Y0, ancho, 92, 24);
        g.fillStyle(0x0b4f91, 1);
        g.fillRoundedRect(CX - anchoIconos / 2 - 10, Y0 + 48, anchoIconos + 20, 38, 19);
        destinos.forEach(function (d, i) {
            var x = CX - anchoIconos / 2 + paso * (i + 0.5);
            var y = Y0 + 67;
            var key, esc;
            if (d.tipo === "engranaje") {
                key = D().silueta(s, d.z, 12);
                esc = (d.talla === "grande" ? 30 : (d.talla === "mediano" ? 25 : 20)) / ((d.z * 12 / 2 + 12) * 2);
            } else if (d.tipo === "polea") {
                key = D().siluetaPolea(s, 5.5 * 12, 12);
                esc = (d.talla === "grande" ? 24 : 18) / ((5.5 * 12 + 6.6) * 2);
            } else {
                key = D().rollo(s);
                esc = 0.24;
            }
            var ic = s.add.image(x, y, key).setScale(esc).setDepth(703).setTint(0x5c7ea8);
            if (d.tipo === "correa") ic.setTint(0x5c7ea8);
            var luz = s.add.image(x, y, "p-chispa").setDepth(702.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ce99a).setScale(0.9).setAlpha(0);
            self.objs.push(ic, luz);
            self.iconos.push({ id: d.id, img: ic, luz: luz, on: 0, color: d.tipo === "engranaje" ? D().hexA(self.v.color[d.talla]) : (d.tipo === "polea" ? D().hexA(self.v.color.polea) : 0xced4da), pop: 0 });
        });
        this.mostrarProgreso(this.progreso !== false);
    };

    Panel.prototype.colocar = function (id) {
        var ic = this.iconos.filter(function (i) { return i.id === id; })[0];
        if (!ic) return;
        ic.on = 1;
        ic.pop = 1;
        ic.img.setTint(ic.color);
    };

    Panel.prototype.quitar = function (id) {
        var ic = this.iconos.filter(function (i) { return i.id === id; })[0];
        if (!ic) return;
        ic.on = 0;
        ic.img.setTint(0x5c7ea8);
    };

    Panel.prototype.mostrarProgreso = function (on) {
        this.progreso = !!on;
        this.iconos.forEach(function (i) { i.img.setVisible(!!on); i.luz.setVisible(!!on); });
    };

    Panel.prototype.mostrar = function (on) {
        var a = on ? 1 : 0;
        this.placa.setAlpha(a);
        this.nivelTxt.setAlpha(a);
        this.iconos.forEach(function (i) { i.img.setAlpha(a); i.luz.setAlpha(0); });
        this.visible = !!on;
    };

    Panel.prototype.update = function (dt, ts) {
        if (!this.visible) return;
        this.iconos.forEach(function (i) {
            if (i.pop > 0) i.pop = Math.max(0, i.pop - dt / 500);
            var e = 1 + Math.sin(i.pop * Math.PI) * 0.6;
            i.img.setScale(i.img.scaleX / (i.e || 1) * e);
            i.e = e;
            i.luz.setAlpha(i.on ? 0.35 + 0.2 * Math.sin(ts * 3 + i.img.x) + i.pop * 0.5 : 0);
        });
    };

    global.PanelMaquina = Panel;
})(typeof window !== "undefined" ? window : global);
