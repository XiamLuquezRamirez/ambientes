/**
 * ZoeAnim — reposo y reacciones de Zoe (window.ZoeAnim).
 *
 * Las rodillas van pintadas en el cuerpo, así que “flexionar” es agacharse y rebotar:
 * separar la pierna en dos piezas abriría un corte. La risa de la barriga y el meneo
 * de las orejas sí usan piezas propias.
 */
(function (global) {
    "use strict";

    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var E = function () { return global.LinternaPhaser; };
    var timerParpadeo = null;
    var reposoActivo = false;
    var ocupado = 0;
    var pasoParpadeo = 0;
    var ESPERAS = [2800, 3600, 2400, 4200, 3100];

    function sc() { return E() && E().escena(); }
    function o() { return E() ? E().objetos() : {}; }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    function tw(cfg) {
        var s = sc();
        if (!s) return Promise.resolve();
        var dur = (cfg.duration || 300) * ((cfg.repeat || 0) + 1) * (cfg.yoyo ? 2 : 1) + (cfg.delay || 0);
        if (reducido) {
            cfg.duration = Math.min(cfg.duration || 300, 80);
            dur = Math.min(dur, 360);
        }
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () { if (!hecho) { hecho = true; resolve(); } };
            var prev = cfg.onComplete;
            cfg.onComplete = function () {
                if (typeof prev === "function") prev();
                fin();
            };
            s.tweens.add(cfg);
            setTimeout(fin, dur + 220);
        });
    }

    function boca(clave) {
        var b = o().boca;
        if (b && b.scene) b.setTexture("zoe-boca_" + clave);
    }

    function parpadeo(veces) {
        var ob = o();
        if (!ob.ojoIzq) return Promise.resolve();
        var ojos = [ob.ojoIzq, ob.ojoDer];
        var base = ob.ojoIzq.escalaBase;
        return tw({
            targets: ojos,
            scaleY: base * 0.08,
            duration: 80,
            yoyo: true,
            repeat: Math.max(0, (veces || 1) - 1),
            onComplete: function () { ojos.forEach(function (j) { j.setScale(base); }); }
        });
    }

    function programarParpadeo() {
        clearTimeout(timerParpadeo);
        if (!reposoActivo) return;
        var espera = ESPERAS[pasoParpadeo++ % ESPERAS.length];
        timerParpadeo = setTimeout(function () {
            if (!ocupado) parpadeo(pasoParpadeo % 4 === 0 ? 2 : 1);
            programarParpadeo();
        }, espera);
    }

    function balanceoBrazos() {
        var s = sc();
        var ob = o();
        if (!s || !ob.brazoIzq || reducido) return;
        [ob.brazoIzq, ob.brazoDer].forEach(function (b, i) {
            s.tweens.killTweensOf(b);
            b.rotation = b.reposo;
            s.tweens.add({
                targets: b,
                rotation: b.reposo + (b.lado === "izq" ? -0.06 : 0.06),
                duration: 1600 + i * 200,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        });
    }

    function tridimensional() {
        return !!(global.Zoe3D && global.Zoe3D.listo && global.Zoe3D.listo());
    }

    function reposo(on) {
        if (tridimensional()) {
            reposoActivo = !!on;
            clearTimeout(timerParpadeo);
            if (on) global.Zoe3D.reposo();
            return;
        }
        var s = sc();
        var ob = o();
        if (!s || !ob.zoe) return;
        reposoActivo = !!on;
        s.tweens.killTweensOf(ob.cuerpo);
        if (ob.cuerpo) ob.cuerpo.setScale(ob.cuerpo.escalaBase);
        if (!on) {
            clearTimeout(timerParpadeo);
            return;
        }
        if (!reducido && ob.cuerpo) {
            s.tweens.add({
                targets: ob.cuerpo,
                scaleY: ob.cuerpo.escalaBase * 1.015,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
            s.tweens.killTweensOf(ob.cabeza);
            ob.cabeza.y = -560;
            ob.cabeza.rotation = 0;
            s.tweens.add({
                targets: ob.cabeza,
                y: -566,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        }
        balanceoBrazos();
        programarParpadeo();
    }

    function rotarCabeza(valores, ms) {
        var s = sc();
        var cab = o().cabeza;
        if (!s || !cab) return Promise.resolve();
        var cadena = Promise.resolve();
        valores.forEach(function (v) {
            cadena = cadena.then(function () {
                return tw({ targets: cab, rotation: v, duration: ms, ease: "Sine.easeInOut" });
            });
        });
        return cadena;
    }

    function brazosA(rotIzq, rotDer, ms, ease) {
        var s = sc();
        var ob = o();
        if (!s || !ob.brazoIzq) return Promise.resolve();
        s.tweens.killTweensOf(ob.brazoIzq);
        s.tweens.killTweensOf(ob.brazoDer);
        return Promise.all([
            tw({ targets: ob.brazoIzq, rotation: rotIzq, duration: ms, ease: ease || "Sine.easeInOut" }),
            tw({ targets: ob.brazoDer, rotation: rotDer, duration: ms, ease: ease || "Sine.easeInOut" })
        ]);
    }

    async function reaccionBarriga() {
        var ob = o();
        var base = ob.zoe.baseEscala;
        if (E()) E().brillo("barriga");
        boca("risa");
        var risa = rotarCabeza([0.07, -0.07, 0.06, -0.05, 0], 130);
        await tw({
            targets: ob.zoe,
            scaleX: base * 1.07,
            scaleY: base * 0.94,
            duration: 150,
            yoyo: true,
            repeat: 3,
            ease: "Sine.easeInOut",
            onComplete: function () { ob.zoe.setScale(base); }
        });
        await risa;
        boca("sonrisa");
    }

    async function reaccionRodillas() {
        var ob = o();
        var base = ob.zoe.baseEscala;
        var alto = 70 * base;
        if (E()) E().brillo("rodillas");
        boca("abierta");
        for (var i = 0; i < 2; i++) {
            await tw({ targets: ob.zoe, scaleY: base * 0.9, scaleX: base * 1.04, duration: 140, ease: "Quad.easeOut" });
            boca("risa");
            await tw({
                targets: ob.zoe,
                y: ob.zoe.baseY - alto,
                scaleY: base * 1.04,
                scaleX: base * 0.98,
                duration: 200,
                ease: "Quad.easeOut"
            });
            await tw({
                targets: ob.zoe,
                y: ob.zoe.baseY,
                scaleY: base,
                scaleX: base,
                duration: 180,
                ease: "Quad.easeIn",
                onComplete: function () {
                    ob.zoe.y = ob.zoe.baseY;
                    ob.zoe.setScale(base);
                }
            });
        }
        ob.zoe.setScale(base);
        ob.zoe.y = ob.zoe.baseY;
        boca("sonrisa");
    }

    async function reaccionOrejas() {
        var ob = o();
        var base = ob.orejaIzq.escalaBase;
        var orejas = [ob.orejaIzq, ob.orejaDer];
        if (E()) E().brillo("orejas");
        boca("abierta");
        var crecen = tw({
            targets: orejas,
            scaleY: base * 1.28,
            duration: 160,
            yoyo: true,
            repeat: 1,
            onComplete: function () { orejas.forEach(function (j) { j.scaleY = base; }); }
        });
        var menean = tw({
            targets: orejas,
            angle: { from: -16, to: 16 },
            duration: 120,
            yoyo: true,
            repeat: 3,
            onComplete: function () { orejas.forEach(function (j) { j.angle = 0; }); }
        });
        await rotarCabeza([0.16, -0.14, 0.08, 0], 160);
        await Promise.all([crecen, menean]);
        boca("risa");
        await sleep(200);
        boca("sonrisa");
    }

    async function reaccionManos() {
        var ob = o();
        if (E()) E().brillo("manos");
        boca("risa");
        await brazosA(ob.brazoIzq.reposo + 0.75, ob.brazoDer.reposo - 0.75, 200);
        await brazosA(ob.brazoIzq.reposo, ob.brazoDer.reposo, 220);
        boca("sonrisa");
    }

    async function reaccionPies() {
        var ob = o();
        if (E()) E().brillo("pies");
        var y0 = ob.pieIzq.y;
        var y1 = ob.pieDer.y;
        boca("abierta");
        await tw({
            targets: [ob.pieIzq, ob.pieDer],
            y: y0 - 18,
            duration: 140,
            yoyo: true,
            repeat: 2,
            onComplete: function () {
                ob.pieIzq.y = y0;
                ob.pieDer.y = y1;
            }
        });
        boca("sonrisa");
    }

    async function reaccionHombros() {
        var ob = o();
        if (E()) E().brillo("hombros");
        boca("abierta");
        await brazosA(-0.15, 0.15, 220);
        await brazosA(ob.brazoIzq.reposo, ob.brazoDer.reposo, 240);
        boca("sonrisa");
    }

    async function reaccionOjos() {
        if (E()) E().brillo("ojos");
        boca("abierta");
        await parpadeo(3);
        await rotarCabeza([0.08, -0.06, 0], 150);
        boca("sonrisa");
    }

    async function reaccionBoca() {
        if (E()) E().brillo("boca");
        boca("risa");
        await rotarCabeza([0.06, -0.06, 0.04, 0], 130);
        await sleep(240);
        boca("sonrisa");
    }

    async function reaccionCabello() {
        var ob = o();
        if (E()) E().brillo("cabello");
        var colas = [ob.coletaIzq, ob.coletaDer].filter(Boolean);
        boca("abierta");
        await tw({
            targets: colas,
            angle: 20,
            duration: 130,
            yoyo: true,
            repeat: 3,
            onComplete: function () { colas.forEach(function (c) { c.angle = 0; }); }
        });
        await rotarCabeza([0.14, -0.1, 0], 150);
        boca("sonrisa");
    }

    var REACCIONES = {
        barriga: reaccionBarriga,
        manos: reaccionManos,
        pies: reaccionPies,
        rodillas: reaccionRodillas,
        hombros: reaccionHombros,
        orejas: reaccionOrejas,
        ojos: reaccionOjos,
        boca: reaccionBoca,
        cabello: reaccionCabello
    };

    async function reaccion(parte) {
        if (tridimensional()) {
            if (E()) E().brillo(parte);
            ocupado++;
            try {
                await global.Zoe3D.reaccion(parte);
            } finally {
                ocupado = Math.max(0, ocupado - 1);
                global.Zoe3D.reposo();
            }
            return;
        }
        if (!E() || !E().listo() || !REACCIONES[parte]) return;
        ocupado++;
        reposo(false);
        try {
            await REACCIONES[parte]();
        } finally {
            ocupado = Math.max(0, ocupado - 1);
            reposo(true);
        }
    }

    async function negar() {
        if (tridimensional()) {
            ocupado++;
            try { await global.Zoe3D.negar(); }
            finally { ocupado = Math.max(0, ocupado - 1); }
            return;
        }
        if (!E() || !E().listo()) return;
        ocupado++;
        boca("abierta");
        await rotarCabeza([0.08, -0.08, 0], 140);
        boca("sonrisa");
        ocupado = Math.max(0, ocupado - 1);
    }

    async function saludo() {
        if (tridimensional()) {
            ocupado++;
            try { await global.Zoe3D.saludo(); }
            finally { ocupado = Math.max(0, ocupado - 1); }
            return;
        }
        if (!E() || !E().listo()) return;
        var ob = o();
        var geo = global.Personaje.GEOMETRIA;
        ocupado++;
        var b = ob.brazoIzq;
        if (sc()) sc().tweens.killTweensOf(b);
        boca("abierta");
        await tw({ targets: b, rotation: geo.brazoSaludo, duration: 380, ease: "Back.easeOut" });
        boca("sonrisa");
        await tw({ targets: b, rotation: geo.brazoSaludo + 0.28, duration: 180, yoyo: true, repeat: 2 });
        await tw({ targets: b, rotation: b.reposo, duration: 360 });
        ocupado = Math.max(0, ocupado - 1);
        balanceoBrazos();
    }

    async function aparecer() {
        if (tridimensional()) {
            var vista = o();
            if (!vista.zoe) return;
            vista.zoe.setAlpha(0);
            await tw({ targets: vista.zoe, alpha: 1, duration: 620 });
            return;
        }
        if (!E() || !E().listo()) return;
        var ob = o();
        var base = ob.zoe.baseEscala || ob.zoe.scaleX || 1;
        ob.zoe.baseEscala = base;
        ob.zoe.setAlpha(0);
        ob.zoe.setScale(base * 0.9);
        await tw({
            targets: ob.zoe,
            alpha: 1,
            scale: base,
            duration: 620,
            ease: "Back.easeOut",
            onComplete: function () { ob.zoe.setScale(base); ob.zoe.setAlpha(1); }
        });
    }

    async function alegria(veces) {
        if (tridimensional()) {
            ocupado++;
            var cabeza = global.Zoe3D.zona("cabello");
            var n = veces || 2;
            for (var i = 0; i < n; i++) {
                if (E() && cabeza) E().estrellas(cabeza.x, cabeza.y, 8, [0xffe066, 0xffffff]);
            }
            try { await global.Zoe3D.alegria(); }
            finally { ocupado = Math.max(0, ocupado - 1); }
            return;
        }
        if (!E() || !E().listo()) return;
        var ob = o();
        var geo = global.Personaje.GEOMETRIA;
        ocupado++;
        reposo(false);
        boca("risa");
        var alto = 64 * ob.zoe.baseEscala;
        await brazosA(geo.brazoSaludo, -geo.brazoSaludo, 240, "Back.easeOut");
        for (var i = 0; i < (veces || 2); i++) {
            if (E()) E().estrellas(ob.zoe.x, ob.zoe.y - 200 * ob.zoe.baseEscala, 8, [0xffe066, 0xffffff]);
            await tw({
                targets: ob.zoe,
                y: ob.zoe.baseY - alto,
                duration: 220,
                yoyo: true,
                ease: "Quad.easeOut",
                onComplete: function () { ob.zoe.y = ob.zoe.baseY; }
            });
        }
        await brazosA(ob.brazoIzq.reposo, ob.brazoDer.reposo, 320);
        boca("sonrisa");
        ocupado = Math.max(0, ocupado - 1);
        reposo(true);
    }

    var tHabla = null;
    var pasoHabla = 0;
    function hablando(on) {
        if (tridimensional()) {
            global.Zoe3D.hablar(!!on);
            return;
        }
        clearInterval(tHabla);
        tHabla = null;
        if (!on) {
            if (!ocupado) boca("sonrisa");
            return;
        }
        if (reducido) return;
        tHabla = setInterval(function () {
            if (ocupado) return;
            pasoHabla++;
            boca(pasoHabla % 2 ? "abierta" : "sonrisa");
        }, 180);
    }

    global.ZoeAnim = {
        reposo: reposo,
        reaccion: reaccion,
        negar: negar,
        saludo: saludo,
        aparecer: aparecer,
        alegria: alegria,
        hablando: hablando
    };
})(window);
