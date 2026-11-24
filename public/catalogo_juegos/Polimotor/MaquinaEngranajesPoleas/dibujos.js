/**
 * DibujosMaquina — texturas de las piezas (window.DibujosMaquina).
 *
 * Cada rueda dentada se dibuja UNA vez con su geometría real (z dientes, módulo base, radio
 * primitivo m·z/2, cabeza +m, raíz −1,25·m, diente de media paso en el primitivo) en un
 * DynamicTexture y después solo se gira la imagen: girar no vuelve a teselar nada. Lo mismo para
 * poleas, el rollo de la correa, el aro magnético y el brillo. Una pieza es un contenedor con
 * resplandor, sombra (la misma textura en negro), la rueda y un reflejo fijo que no gira.
 */
(function (global) {
    "use strict";

    var DOS_PI = Math.PI * 2;

    function hexA(c) {
        if (typeof c === "number") return c;
        return parseInt(String(c || "#888888").replace("#", ""), 16);
    }

    function mezclar(a, b, u) {
        var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(ar + (br - ar) * u) << 16) | (Math.round(ag + (bg - ag) * u) << 8) | Math.round(ab + (bb - ab) * u);
    }

    function lapiz(scene) {
        if (!scene.__lapizDibujos) scene.__lapizDibujos = scene.make.graphics({}, false);
        return scene.__lapizDibujos;
    }

    /** Hornea fn(g) (dibujo centrado en 0,0) en una textura w × h con nombre `key`. */
    function hornear(scene, key, w, h, fn) {
        if (scene.textures.exists(key)) return key;
        var g = lapiz(scene);
        g.clear();
        fn(g);
        var dt = scene.textures.addDynamicTexture(key, Math.ceil(w), Math.ceil(h));
        dt.draw(g, w / 2, h / 2);
        if (dt.render) dt.render();
        g.clear();
        return key;
    }

    function circulo(r, n, a0) {
        var pts = [];
        for (var i = 0; i < n; i++) {
            var a = (a0 || 0) + i / n * DOS_PI;
            pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        return pts;
    }

    function sector(r0, r1, a0, a1, n) {
        var pts = [], k;
        for (k = 0; k <= n; k++) { var a = a0 + (a1 - a0) * k / n; pts.push({ x: Math.cos(a) * r1, y: Math.sin(a) * r1 }); }
        for (k = n; k >= 0; k--) { var b = a0 + (a1 - a0) * k / n; pts.push({ x: Math.cos(b) * r0, y: Math.sin(b) * r0 }); }
        return pts;
    }

    // ------------------------------------------------------------------ geometría del diente

    /**
     * Contorno de la rueda: por diente, flanco desde la raíz (±0,30 paso) al primitivo (±0,25 paso,
     * grosor = medio paso) y a la cabeza (±0,16 paso); el hueco baja a la raíz con dos puntos más.
     * El diente k queda centrado en el ángulo 2πk/z (fase 0 = diente apuntando a la derecha).
     */
    function contorno(z, m) {
        var r = m * z / 2, ra = r + m, rf = r - 1.25 * m;
        var p = DOS_PI / z;
        var pts = [];
        var pol = function (rr, a) { pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr }); };
        for (var k = 0; k < z; k++) {
            var c = k * p;
            pol(rf, c - 0.32 * p);
            pol(r - 0.35 * m, c - 0.28 * p);
            pol(r, c - 0.25 * p);
            pol(ra - 0.25 * m, c - 0.19 * p);
            pol(ra, c - 0.13 * p);
            pol(ra, c + 0.13 * p);
            pol(ra - 0.25 * m, c + 0.19 * p);
            pol(r, c + 0.25 * p);
            pol(r - 0.35 * m, c + 0.28 * p);
            pol(rf, c + 0.32 * p);
            pol(rf, c + 0.5 * p);
        }
        return { pts: pts, r: r, ra: ra, rf: rf };
    }

    // ------------------------------------------------------------------ rueda dentada

    function dibujarEngranaje(g, z, m, color, deco) {
        var c = contorno(z, m);
        var base = hexA(color);
        var oscuro = mezclar(base, 0x1a1a2e, 0.42);
        var claro = mezclar(base, 0xffffff, 0.28);
        var cara = mezclar(base, 0xffffff, 0.1);
        // cuerpo con dientes y borde
        g.fillStyle(base, 1);
        g.fillPoints(c.pts, true, true);
        g.lineStyle(Math.max(2, m * 0.22), oscuro, 1);
        g.strokePoints(c.pts, true, true);
        // aro interior en relieve
        var rAro = c.rf - 0.55 * m;
        g.fillStyle(oscuro, 0.35);
        g.fillCircle(0, 0, rAro + 1.5);
        g.fillStyle(cara, 1);
        g.fillCircle(0, 0, rAro - 1);
        g.lineStyle(Math.max(2, m * 0.16), mezclar(base, 0x000000, 0.25), 0.7);
        g.strokeCircle(0, 0, rAro);
        var rCubo = Math.max(2.4 * m, c.r * 0.26);
        var hueco = mezclar(base, 0x14142a, 0.62);
        var nRayos = z >= 18 ? 6 : (z >= 13 ? 5 : 4);
        var a, i;
        if (deco === "agujeros") {
            var rr = (rAro + rCubo) / 2;
            var tam = Math.min((rAro - rCubo) * 0.36, rr * Math.sin(Math.PI / nRayos) * 0.7);
            for (i = 0; i < nRayos; i++) {
                a = i / nRayos * DOS_PI + Math.PI / nRayos;
                g.fillStyle(hueco, 1);
                g.fillCircle(Math.cos(a) * rr, Math.sin(a) * rr, tam);
                g.lineStyle(2, claro, 0.8);
                g.strokeCircle(Math.cos(a) * rr, Math.sin(a) * rr, tam);
            }
        } else if (deco === "estrella") {
            var pts = [];
            for (i = 0; i < nRayos * 2; i++) {
                a = i / (nRayos * 2) * DOS_PI;
                var rad = i % 2 ? rCubo * 1.25 : rAro * 0.86;
                pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
            }
            g.fillStyle(claro, 1);
            g.fillPoints(pts, true, true);
            g.lineStyle(2, mezclar(base, 0x000000, 0.2), 0.6);
            g.strokePoints(pts, true, true);
            for (i = 0; i < nRayos; i++) {
                a = i / nRayos * DOS_PI + Math.PI / nRayos;
                g.fillStyle(hueco, 0.85);
                g.fillCircle(Math.cos(a) * rAro * 0.72, Math.sin(a) * rAro * 0.72, Math.max(3, m * 0.42));
            }
        } else {
            // rayos: ventanas entre radios
            var ancho = DOS_PI / nRayos;
            for (i = 0; i < nRayos; i++) {
                a = i * ancho;
                var ven = sector(rCubo + m * 0.7, rAro - m * 0.75, a + ancho * 0.17, a + ancho * 0.83, 10);
                g.fillStyle(hueco, 1);
                g.fillPoints(ven, true, true);
                g.lineStyle(2, claro, 0.7);
                g.strokePoints(ven, true, true);
            }
        }
        // cubo metálico, tornillos y agujero del eje
        g.fillStyle(0x5c6677, 1);
        g.fillCircle(0, 0, rCubo + 2);
        g.fillStyle(0xd7dde6, 1);
        g.fillCircle(0, 0, rCubo);
        g.fillStyle(0xf4f7fb, 1);
        g.fillCircle(-rCubo * 0.18, -rCubo * 0.2, rCubo * 0.62);
        g.fillStyle(0xd7dde6, 1);
        g.fillCircle(0, 0, rCubo * 0.55);
        for (i = 0; i < 4; i++) {
            a = i / 4 * DOS_PI + Math.PI / 4;
            g.fillStyle(0x8a94a6, 1);
            g.fillCircle(Math.cos(a) * rCubo * 0.72, Math.sin(a) * rCubo * 0.72, Math.max(2, m * 0.2));
        }
        g.fillStyle(0x2a3140, 1);
        g.fillCircle(0, 0, Math.max(4, m * 0.62));
        g.fillRect(-Math.max(1.5, m * 0.12), -Math.max(4, m * 0.62) - m * 0.28, Math.max(3, m * 0.24), m * 0.4);
        // una marca blanca en la cara para que el giro se note
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(rAro - m * 0.55, 0, Math.max(2.5, m * 0.24));
        return c;
    }

    function engranaje(scene, talla, z, m, color, deco) {
        var key = "eng-" + talla + "-" + z + "-" + m + "-" + String(color).replace("#", "") + "-" + deco;
        var ra = m * z / 2 + m;
        var lado = Math.ceil(ra * 2 + 8);
        return hornear(scene, key, lado, lado, function (g) { dibujarEngranaje(g, z, m, color, deco); });
    }

    /** Silueta (sombra del eje): solo el contorno lleno, para teñir. */
    function silueta(scene, z, m) {
        var key = "sil-" + z + "-" + m;
        var ra = m * z / 2 + m;
        var lado = Math.ceil(ra * 2 + 8);
        return hornear(scene, key, lado, lado, function (g) {
            var c = contorno(z, m);
            g.fillStyle(0xffffff, 1);
            g.fillPoints(c.pts, true, true);
            g.fillStyle(0x000000, 1);
        });
    }

    // ------------------------------------------------------------------ poleas y correa

    function dibujarPolea(g, r, m, color) {
        var base = hexA(color);
        var oscuro = mezclar(base, 0x1a1a2e, 0.45);
        var ceja = r + m * 0.55;
        g.fillStyle(0x4a5262, 1);
        g.fillCircle(0, 0, ceja);
        g.fillStyle(0xaab3c2, 1);
        g.fillCircle(0, 0, ceja - 2);
        g.fillStyle(0x3a3f4d, 1);
        g.fillCircle(0, 0, r + 1);
        g.fillStyle(base, 1);
        g.fillCircle(0, 0, r - m * 0.35);
        g.lineStyle(2, oscuro, 0.9);
        g.strokeCircle(0, 0, r - m * 0.35);
        var rCubo = Math.max(m * 1.4, r * 0.3);
        for (var i = 0; i < 4; i++) {
            var a = i / 4 * DOS_PI;
            var ven = sector(rCubo + m * 0.35, r - m * 0.85, a + 0.35, a + DOS_PI / 4 - 0.35, 8);
            g.fillStyle(oscuro, 1);
            g.fillPoints(ven, true, true);
        }
        g.fillStyle(0xd7dde6, 1);
        g.fillCircle(0, 0, rCubo);
        g.fillStyle(0x2a3140, 1);
        g.fillCircle(0, 0, Math.max(3, m * 0.5));
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(-1.5, -(r - m * 0.6), 3, m * 0.5);
    }

    function polea(scene, talla, r, m, color) {
        var key = "pol-" + talla + "-" + Math.round(r) + "-" + m + "-" + String(color).replace("#", "");
        var lado = Math.ceil((r + m * 0.55) * 2 + 8);
        return hornear(scene, key, lado, lado, function (g) { dibujarPolea(g, r, m, color); });
    }

    function siluetaPolea(scene, r, m) {
        var key = "silp-" + Math.round(r) + "-" + m;
        var lado = Math.ceil((r + m * 0.55) * 2 + 8);
        return hornear(scene, key, lado, lado, function (g) {
            g.fillStyle(0xffffff, 1);
            g.fillCircle(0, 0, r + m * 0.55);
        });
    }

    /** Rollo de correa para la bandeja: un aro de goma con dibujo de banda. */
    function rollo(scene) {
        return hornear(scene, "correa-rollo", 150, 110, function (g) {
            g.fillStyle(0x000000, 0.18);
            g.fillEllipse(4, 10, 132, 84);
            g.lineStyle(17, 0x2d3142, 1);
            g.strokeEllipse(0, 0, 118, 74);
            g.lineStyle(9, 0x474d63, 1);
            g.strokeEllipse(0, 0, 118, 74);
            for (var i = 0; i < 18; i++) {
                var a = i / 18 * DOS_PI;
                var x = Math.cos(a) * 59, y = Math.sin(a) * 37;
                g.fillStyle(0x7d86a3, 1);
                g.fillCircle(x, y, 2.6);
            }
            g.fillStyle(0xffd43b, 1);
            g.fillRoundedRect(-22, -48, 44, 16, 6);
            g.fillStyle(0x2d3142, 1);
            g.fillRect(-12, -42, 24, 4);
        });
    }

    // ------------------------------------------------------------------ efectos

    /** Aro magnético blanco (radio 100) para teñir: anillo con halo. */
    function aro(scene) {
        return hornear(scene, "aro-iman", 236, 236, function (g) {
            for (var k = 0; k < 7; k++) {
                g.lineStyle(4, 0xffffff, 0.06 + k * 0.012);
                g.strokeCircle(0, 0, 112 - k * 2);
            }
            g.lineStyle(10, 0xffffff, 1);
            g.strokeCircle(0, 0, 100);
            g.lineStyle(3, 0xffffff, 0.6);
            g.strokeCircle(0, 0, 90);
            for (var i = 0; i < 12; i++) {
                var a = i / 12 * DOS_PI;
                g.fillStyle(0xffffff, 1);
                g.fillCircle(Math.cos(a) * 100, Math.sin(a) * 100, 6.5);
            }
        });
    }

    /** Reflejo fijo (no gira) sobre la cara de una rueda: luz arriba a la izquierda, sombra abajo. */
    function reflejo(scene) {
        return hornear(scene, "reflejo-rueda", 220, 220, function (g) {
            for (var r = 100; r > 0; r -= 5) {
                g.fillStyle(0xffffff, 0.012 + (100 - r) / 100 * 0.05);
                g.fillCircle(-26 * (1 - r / 100), -30 * (1 - r / 100), r);
            }
        });
    }

    /**
     * Correa abierta (ReglasMaquina.correa) dibujada en g. s = desplazamiento de la banda (las
     * marcas corren con las poleas). tension 0..1: al ponerla, el aro crece desde el centro y se tensa.
     */
    function dibujarCorrea(g, c, s, o) {
        var R = global.ReglasMaquina;
        var op = o || {};
        var grosor = op.grosor || 10;
        var n = Math.max(48, Math.round(c.largo / 7));
        var t = op.tension == null ? 1 : op.tension;
        var cx = (c.p.x + c.q.x) / 2, cy = (c.p.y + c.q.y) / 2;
        var k = t >= 1 ? 1 : 0.2 + 0.8 * (1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2));
        var pts = [];
        for (var i = 0; i < n; i++) {
            var p = R.puntoCorrea(c, i / n * c.largo);
            pts.push({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k });
        }
        g.lineStyle(grosor + 4, 0x15171f, op.alfa == null ? 0.9 : op.alfa);
        g.strokePoints(pts, true, true);
        g.lineStyle(grosor, op.color || 0x2d3142, op.alfa == null ? 1 : op.alfa);
        g.strokePoints(pts, true, true);
        g.lineStyle(Math.max(1.5, grosor * 0.22), op.claro || 0x5c6584, 0.9);
        g.strokePoints(pts, true, true);
        if (t < 0.6) return;
        var paso = op.paso || 20;
        var nm = Math.floor(c.largo / paso);
        g.fillStyle(op.marca || 0x9aa6c8, 1);
        for (var m = 0; m < nm; m++) {
            var q = R.puntoCorrea(c, m * paso + s);
            g.fillCircle(cx + (q.x - cx) * k, cy + (q.y - cy) * k, Math.max(1.6, grosor * 0.2));
        }
    }

    /** Pieza en un contenedor: resplandor, sombra, cuerpo que gira y reflejo fijo. */
    function crearPieza(scene, def, variante, opciones) {
        var o = opciones || {};
        var mb = o.moduloBase || 12;
        var cont = scene.add.container(0, 0);
        var pieza = { id: def.id, tipo: def.tipo, talla: def.talla, para: def.para, cont: cont, ang: Math.random() * DOS_PI, radio: 60 };
        var key;
        if (def.tipo === "engranaje") {
            var z = o.dientes[def.talla];
            key = engranaje(scene, def.talla, z, mb, variante.color[def.talla], variante.deco[def.talla]);
            pieza.radio = mb * z / 2 + mb;
            pieza.z = z;
        } else if (def.tipo === "polea") {
            var r = o.radioPolea(def.talla, mb);
            key = polea(scene, def.talla, r, mb, variante.color.polea);
            pieza.radio = r + mb * 0.55;
            pieza.r = r;
        } else {
            key = rollo(scene);
            pieza.radio = 62;
        }
        pieza.brillo = scene.add.image(0, 0, "p-luz").setBlendMode(global.Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0);
        pieza.brillo.setScale(pieza.radio * 2.6 / 128);
        pieza.sombra = scene.add.image(7, 10, key).setTint(0x0a1530).setAlpha(0.32);
        pieza.img = scene.add.image(0, 0, key);
        cont.add([pieza.brillo, pieza.sombra, pieza.img]);
        if (def.tipo !== "correa") {
            pieza.luz = scene.add.image(0, 0, reflejo(scene)).setBlendMode(global.Phaser.BlendModes.ADD).setAlpha(0.7);
            pieza.luz.setScale(pieza.radio * 0.9 / 100);
            cont.add(pieza.luz);
        }
        pieza.girar = function (a) {
            pieza.ang = a;
            if (pieza.tipo === "correa") return;
            pieza.img.setRotation(a);
            pieza.sombra.setRotation(a);
        };
        pieza.girar(pieza.ang);
        return pieza;
    }

    global.DibujosMaquina = {
        hexA: hexA,
        mezclar: mezclar,
        hornear: hornear,
        circulo: circulo,
        sector: sector,
        contorno: contorno,
        engranaje: engranaje,
        silueta: silueta,
        polea: polea,
        siluetaPolea: siluetaPolea,
        rollo: rollo,
        aro: aro,
        reflejo: reflejo,
        dibujarEngranaje: dibujarEngranaje,
        dibujarPolea: dibujarPolea,
        dibujarCorrea: dibujarCorrea,
        crearPieza: crearPieza
    };
})(typeof window !== "undefined" ? window : global);
