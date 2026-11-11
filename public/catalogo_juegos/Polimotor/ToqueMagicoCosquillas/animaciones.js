/**
 * ZoeAnim — animaciones de Zoe en el espejo y efectos de cosquillas (window.ZoeAnim).
 *
 * Trabaja sobre los objetos de EspejoPhaser.objetos() con tweens de Phaser 4. Cada reacción devuelve una
 * Promise con respaldo setTimeout: si la pestaña está oculta y Phaser no avanza, el juego no se queda esperando.
 *
 *   reposo(on)          respiración, balanceo suave y parpadeo automático
 *   aparecer()          Zoe aparece en el espejo con brillos
 *   saludo()            levanta la mano y saluda
 *   reaccion(parte)     ojos | nariz | boca | manos | orejas | cabello | barriga | rodillas | pies
 *                       (cada parte con su cosquilla propia)
 *   negar()             mueve la cabeza suave: "esa no es"
 *   cosquilla()         toque en otra parte del cuerpo: un meneíto (ni acierto ni error)
 *   alegria()           salta con los brazos arriba (fin de ronda y final)
 */
(function (global) {
    "use strict";

    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var E = function () { return global.EspejoPhaser; };
    var timerParpadeo = null;
    var reposoActivo = false;
    var ocupado = 0;
    var pasoParpadeo = 0;
    var ESPERAS_PARPADEO = [3200, 4100, 2600, 4700, 3600, 2900];

    function sc() { return E() && E().escena(); }
    function o() { return E() ? E().objetos() : {}; }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    /** Tween con Promise; si Phaser no avanza (pestaña oculta), resuelve igual por tiempo. */
    function tw(cfg) {
        var s = sc();
        if (!s) return Promise.resolve();
        var dur = (cfg.duration || 300) * ((cfg.repeat || 0) + 1) * (cfg.yoyo ? 2 : 1) + (cfg.delay || 0);
        if (reducido) {
            cfg.duration = Math.min(cfg.duration || 300, 80);
            dur = Math.min(dur, 400);
        }
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () {
                if (hecho) return;
                hecho = true;
                resolve();
            };
            var prev = cfg.onComplete;
            cfg.onComplete = function () {
                if (typeof prev === "function") prev();
                fin();
            };
            s.tweens.add(cfg);
            setTimeout(fin, dur + 250);
        });
    }

    function boca(clave) {
        var b = o().boca;
        if (b && b.scene) b.setTexture("zoe-boca_" + clave);
    }

    function mundo(obj) {
        var m = obj.getWorldTransformMatrix();
        return { x: m.tx, y: m.ty };
    }

    // ------------------------------------------------------------------ reposo

    function parpadeo(veces) {
        var ob = o();
        if (!ob.ojoIzq) return Promise.resolve();
        var ojos = [ob.ojoIzq, ob.ojoDer];
        var base = ob.ojoIzq.escalaBase;
        return tw({
            targets: ojos, scaleY: base * 0.08, duration: 85, yoyo: true,
            repeat: Math.max(0, (veces || 1) - 1), repeatDelay: 90, ease: "Quad.easeIn",
            onComplete: function () { ojos.forEach(function (j) { j.setScale(base); }); }
        });
    }

    function programarParpadeo() {
        clearTimeout(timerParpadeo);
        if (!reposoActivo) return;
        var espera = ESPERAS_PARPADEO[pasoParpadeo++ % ESPERAS_PARPADEO.length];
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
                targets: b, rotation: b.reposo + (b.lado === "izq" ? -0.05 : 0.05),
                duration: 1700 + i * 230, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
            });
        });
    }

    function reposo(on) {
        var s = sc();
        var ob = o();
        if (!s || !ob.zoe) return;
        reposoActivo = !!on;
        s.tweens.killTweensOf(ob.cuerpo);
        ob.cuerpo.setScale(ob.cuerpo.escalaBase);
        if (!on) {
            clearTimeout(timerParpadeo);
            return;
        }
        if (!reducido) {
            // Respiración: el cuerpo se estira un poquito y la cabeza sube con él.
            s.tweens.add({
                targets: ob.cuerpo, scaleY: ob.cuerpo.escalaBase * 1.012, duration: 1500,
                yoyo: true, repeat: -1, ease: "Sine.easeInOut"
            });
            s.tweens.killTweensOf(ob.cabeza);
            ob.cabeza.y = -560;
            ob.cabeza.rotation = 0;
            s.tweens.add({ targets: ob.cabeza, y: -566, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        balanceoBrazos();
        programarParpadeo();
    }

    // ------------------------------------------------------------------ helpers de acciones

    function empezar() {
        ocupado++;
    }

    function terminar() {
        ocupado = Math.max(0, ocupado - 1);
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

    function estrellasEn(obj, n, colores, fuerza) {
        if (!obj || !E()) return;
        var p = mundo(obj);
        E().estrellas(p.x, p.y, n, colores, fuerza);
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

    // ------------------------------------------------------------------ reacciones por parte

    async function reaccionOjos() {
        var ob = o();
        var s = sc();
        E().brillo("ojos", { fuerte: true });
        estrellasEn(ob.ojoIzq, 10, [0xffe066, 0xffffff, 0x7cf3ff]);
        estrellasEn(ob.ojoDer, 10, [0xffe066, 0xffffff, 0xff8fc7]);
        // Cejas divertidas: suben y bajan dos veces mientras parpadea.
        var cejas = [ob.cejaIzq, ob.cejaDer];
        s.tweens.killTweensOf(cejas);
        var cejasTw = tw({ targets: cejas, y: "-=16", duration: 160, yoyo: true, repeat: 1, repeatDelay: 120, ease: "Back.easeOut",
            onComplete: function () { cejas.forEach(function (c) { c.y = -204; }); } });
        boca("abierta");
        await parpadeo(3);
        boca("risa");
        estrellasEn(ob.ojoDer, 8, null, 0.7);
        await cejasTw;
        await sleep(380);
        boca("sonrisa");
    }

    async function reaccionNariz() {
        var ob = o();
        var base = ob.nariz.escalaBase;
        E().brillo("nariz", { fuerte: true });
        estrellasEn(ob.nariz, 14, [0xff8fc7, 0xffe066, 0xffffff], 0.8);
        boca("abierta");
        var ojos = [ob.ojoIzq, ob.ojoDer];
        var bEsc = ob.ojoIzq.escalaBase;
        // Ojos entrecerrados de cosquilla mientras la nariz rebota.
        tw({ targets: ojos, scaleY: bEsc * 0.4, duration: 120, hold: 650, yoyo: true,
            onComplete: function () { ojos.forEach(function (j) { j.setScale(bEsc); }); } });
        var rebote = tw({ targets: ob.nariz, scale: base * 1.7, duration: 170, yoyo: true, repeat: 2, ease: "Back.easeOut",
            onComplete: function () { ob.nariz.setScale(base); } });
        await rotarCabeza([0.09, -0.09, 0.07, -0.05, 0], 130);
        await rebote;
        boca("risa");
        await sleep(350);
        boca("sonrisa");
    }

    async function reaccionBoca() {
        var ob = o();
        var base = ob.boca.escalaBase;
        E().brillo("boca", { fuerte: true });
        estrellasEn(ob.boca, 12, [0xffe066, 0xff8fc7, 0xffffff], 0.8);
        var claves = ["abierta", "risa", "abierta", "risa", "abierta", "risa"];
        var cabeza = rotarCabeza([0.06, -0.06, 0.05, 0], 200);
        for (var i = 0; i < claves.length; i++) {
            boca(claves[i]);
            await sleep(reducido ? 40 : 140);
        }
        await tw({ targets: ob.boca, scale: base * 1.25, duration: 200, yoyo: true, ease: "Back.easeOut",
            onComplete: function () { ob.boca.setScale(base); } });
        estrellasEn(ob.boca, 8, null, 0.6);
        await cabeza;
        await sleep(350);
        boca("sonrisa");
    }

    async function reaccionManos() {
        var ob = o();
        var G = global.Personaje.GEOMETRIA;
        E().brillo("manos", { fuerte: true });
        boca("risa");
        var izq = ob.brazoIzq;
        var der = ob.brazoDer;
        for (var i = 0; i < 3; i++) {
            await brazosA(G.brazoAplauso, -G.brazoAplauso, reducido ? 60 : 190, "Quad.easeIn");
            estrellasEn(izq.mano, 10, [0xffe066, 0x9df59a, 0x7cf3ff, 0xff8fc7], 0.9);
            await brazosA(G.brazoAplauso - 0.25, -G.brazoAplauso + 0.25, reducido ? 60 : 150, "Quad.easeOut");
        }
        await brazosA(G.brazoAplauso, -G.brazoAplauso, 170, "Quad.easeIn");
        estrellasEn(izq.mano, 18, null, 1.1);
        await sleep(200);
        await brazosA(izq.reposo, der.reposo, 380, "Back.easeOut");
        boca("sonrisa");
        balanceoBrazos();
    }

    function estrellasZona(id, n, colores, fuerza) {
        var p = E() && E().mundoDe(id);
        if (p) E().estrellas(p.x, p.y, n, colores, fuerza);
    }

    function tic() {
        if (typeof global.sonarEvento === "function") global.sonarEvento("tic");
    }

    async function reaccionOrejas() {
        var ob = o();
        var orejas = [ob.orejaIzq, ob.orejaDer];
        var base = ob.orejaIzq.escalaBase;
        E().brillo("orejas", { fuerte: true });
        estrellasZona("oreja_izq", 10, [0x7cf3ff, 0xffe066, 0xffffff], 0.8);
        estrellasZona("oreja_der", 10, [0x7cf3ff, 0xff8fc7, 0xffffff], 0.8);
        boca("abierta");
        // Las orejas se agrandan y se menean, como si escucharan algo.
        var crecen = tw({ targets: orejas, scaleY: base * 1.3, duration: 180, yoyo: true, repeat: 1,
            onComplete: function () { orejas.forEach(function (j) { j.scaleY = base; }); } });
        var menean = tw({ targets: orejas, angle: { from: -20, to: 20 }, duration: 130, yoyo: true, repeat: 3,
            onComplete: function () { orejas.forEach(function (j) { j.angle = 0; }); } });
        await rotarCabeza([0.12, -0.12, 0.08, 0], 180);
        await Promise.all([crecen, menean]);
        boca("risa");
        await sleep(350);
        boca("sonrisa");
    }

    async function reaccionCabello() {
        var ob = o();
        E().brillo("cabello", { fuerte: true });
        estrellasZona("cabello", 16, [0xffe066, 0xff8fc7, 0xffffff], 0.9);
        boca("risa");
        // Las coletas bailan hacia afuera (la derecha está en espejo: ángulo contrario).
        var izq = tw({ targets: ob.coletaIzq, rotation: { from: -0.45, to: 0.35 }, duration: 170, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
            onComplete: function () { ob.coletaIzq.rotation = 0; } });
        var der = tw({ targets: ob.coletaDer, rotation: { from: 0.45, to: -0.35 }, duration: 170, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
            onComplete: function () { ob.coletaDer.rotation = 0; } });
        await rotarCabeza([0.08, -0.08, 0.08, -0.08, 0], 170);
        await Promise.all([izq, der]);
        estrellasZona("coleta_izq", 8, null, 0.6);
        estrellasZona("coleta_der", 8, null, 0.6);
        await sleep(250);
        boca("sonrisa");
    }

    async function reaccionBarriga() {
        var ob = o();
        var base = ob.zoe.baseEscala;
        E().brillo("barriga", { fuerte: true });
        estrellasZona("barriga", 14, [0xffe066, 0xff8fc7, 0xffffff], 0.9);
        boca("risa");
        var risa = rotarCabeza([0.06, -0.06, 0.06, -0.06, 0], 140);
        // Se ríe con todo el cuerpo: se ensancha y se encoge (pies quietos en el piso).
        await tw({ targets: ob.zoe, scaleX: base * 1.06, scaleY: base * 0.95, duration: 150, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
            onComplete: function () { ob.zoe.setScale(ob.zoe.baseEscala); } });
        await risa;
        boca("abierta");
        await sleep(160);
        boca("risa");
        await sleep(300);
        boca("sonrisa");
    }

    async function reaccionRodillas() {
        var ob = o();
        var base = ob.zoe.baseEscala;
        var alto = 80 * base;
        E().brillo("rodillas", { fuerte: true });
        estrellasZona("rodilla_izq", 10, null, 0.7);
        estrellasZona("rodilla_der", 10, null, 0.7);
        boca("abierta");
        for (var i = 0; i < 2; i++) {
            // Dobla las rodillas (se agacha) y salta.
            await tw({ targets: ob.zoe, scaleY: base * 0.92, scaleX: base * 1.03, duration: 140, ease: "Quad.easeOut" });
            boca("risa");
            await tw({ targets: ob.zoe, y: ob.zoe.baseY - alto, scaleY: base * 1.03, scaleX: base * 0.98, duration: 220, ease: "Quad.easeOut" });
            await tw({ targets: ob.zoe, y: ob.zoe.baseY, scaleY: base, scaleX: base, duration: 200, ease: "Quad.easeIn" });
            if (typeof global.sonarEvento === "function") global.sonarEvento("bote");
            estrellasZona("pie_izq", 6, null, 0.5);
            estrellasZona("pie_der", 6, null, 0.5);
        }
        ob.zoe.setScale(base);
        ob.zoe.y = ob.zoe.baseY;
        await sleep(250);
        boca("sonrisa");
    }

    async function reaccionPies() {
        var ob = o();
        E().brillo("pies", { fuerte: true });
        boca("risa");
        // Zapateo: la punta de cada zapato sube y baja, alternando.
        for (var i = 0; i < 4; i++) {
            var izq = i % 2 === 0;
            var pie = izq ? ob.pieIzq : ob.pieDer;
            await tw({ targets: pie, rotation: izq ? -0.38 : 0.38, duration: 120, yoyo: true, ease: "Quad.easeOut",
                onComplete: function () { ob.pieIzq.rotation = 0; ob.pieDer.rotation = 0; } });
            tic();
            estrellasZona(izq ? "pie_izq" : "pie_der", 8, [0x7cf3ff, 0xffe066, 0xff8fc7], 0.7);
        }
        await rotarCabeza([0.07, -0.07, 0], 160);
        boca("sonrisa");
    }

    var REACCIONES = {
        ojos: reaccionOjos,
        nariz: reaccionNariz,
        boca: reaccionBoca,
        manos: reaccionManos,
        orejas: reaccionOrejas,
        cabello: reaccionCabello,
        barriga: reaccionBarriga,
        rodillas: reaccionRodillas,
        pies: reaccionPies
    };

    async function reaccion(parte) {
        if (!E() || !E().listo() || !REACCIONES[parte]) return;
        empezar();
        E().luces("acierto");
        try {
            await REACCIONES[parte]();
        } catch (e) {
            console.warn("[ZoeAnim]", parte, e);
        }
        terminar();
    }

    // ------------------------------------------------------------------ otras acciones

    async function negar() {
        if (!E() || !E().listo()) return;
        empezar();
        boca("abierta");
        await rotarCabeza([-0.07, 0.07, -0.05, 0.04, 0], 120);
        boca("sonrisa");
        terminar();
    }

    async function cosquilla() {
        if (!E() || !E().listo()) return;
        var ob = o();
        empezar();
        var base = ob.zoe.baseEscala;
        boca("risa");
        await tw({ targets: ob.zoe, scaleX: base * 1.03, scaleY: base * 0.98, duration: 110, yoyo: true, repeat: 1,
            onComplete: function () { ob.zoe.setScale(ob.zoe.baseEscala); } });
        boca("sonrisa");
        terminar();
    }

    async function saludo() {
        if (!E() || !E().listo()) return;
        var ob = o();
        var G = global.Personaje.GEOMETRIA;
        empezar();
        var b = ob.brazoIzq;
        sc().tweens.killTweensOf(b);
        boca("abierta");
        await tw({ targets: b, rotation: G.brazoSaludo, duration: 420, ease: "Back.easeOut" });
        boca("sonrisa");
        await tw({ targets: b, rotation: G.brazoSaludo + 0.3, duration: 220, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
        estrellasEn(b.mano, 8, null, 0.6);
        await tw({ targets: b, rotation: b.reposo, duration: 420, ease: "Sine.easeInOut" });
        balanceoBrazos();
        terminar();
    }

    async function aparecer() {
        if (!E() || !E().listo()) return;
        var ob = o();
        empezar();
        var base = ob.zoe.baseEscala;
        ob.zoe.setAlpha(0);
        ob.zoe.setScale(base * 0.86);
        E().destello(0.7);
        var r = E().rect();
        E().estrellas(r.vx + r.vw / 2, r.vy + r.vh * 0.45, 22, null, 1.2);
        await tw({ targets: ob.zoe, alpha: 1, scale: base, duration: 650, ease: "Back.easeOut",
            onComplete: function () { ob.zoe.setScale(ob.zoe.baseEscala); } });
        terminar();
    }

    async function alegria(veces) {
        if (!E() || !E().listo()) return;
        var ob = o();
        var G = global.Personaje.GEOMETRIA;
        empezar();
        boca("risa");
        var alto = 70 * ob.zoe.baseEscala;
        await brazosA(G.brazoSaludo, -G.brazoSaludo, 260, "Back.easeOut");
        for (var i = 0; i < (veces || 2); i++) {
            estrellasEn(ob.cabeza, 16, null, 1);
            await tw({ targets: ob.zoe, y: ob.zoe.baseY - alto, duration: 230, yoyo: true, ease: "Quad.easeOut",
                onComplete: function () { ob.zoe.y = ob.zoe.baseY; } });
        }
        await brazosA(ob.brazoIzq.reposo, ob.brazoDer.reposo, 360, "Sine.easeInOut");
        boca("sonrisa");
        balanceoBrazos();
        terminar();
    }

    // ------------------------------------------------------------------ hablar (la boca se mueve mientras suena la voz)

    var tHabla = null;
    var pasoHabla = 0;
    function hablando(on) {
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
            boca(pasoHabla % 3 === 0 ? "sonrisa" : (pasoHabla % 2 ? "abierta" : "risa"));
        }, 170);
    }

    // ------------------------------------------------------------------ final: desfile en la pasarela

    /**
     * Zoe da un salto y cae en la pasarela: sale del espejo al cuarto. Queda al 80 % para verse del
     * tamaño de Zeus (en el espejo estaba agrandada para que los toques fueran fáciles).
     */
    async function salir() {
        if (!E() || !E().listo()) return;
        var ob = o();
        empezar();
        var base = ob.zoe.baseEscala;
        var final = base * 0.8;
        boca("risa");
        await tw({ targets: ob.zoe, y: ob.zoe.baseY - 90 * base, scaleX: base * 1.02, scaleY: base * 1.02, duration: 280, ease: "Quad.easeOut" });
        ob.zoe.baseEscala = final;
        await tw({ targets: ob.zoe, y: ob.zoe.baseY, scaleX: final, scaleY: final, duration: 320, ease: "Bounce.easeOut" });
        estrellasEn(ob.zoe, 12, null, 1);
        terminar();
    }

    /** Camina de x actual a x destino con pasos (saltitos), brazos que se balancean y pies que pisan. */
    function caminar(xDestino, ms) {
        var ob = o();
        var s = sc();
        var base = ob.zoe.baseEscala;
        var pasos = Math.max(2, Math.round(ms / 300));
        var G = global.Personaje.GEOMETRIA;
        s.tweens.killTweensOf([ob.brazoIzq, ob.brazoDer]);
        var brazos = Promise.all([
            tw({ targets: ob.brazoIzq, rotation: { from: -G.brazoReposo - 0.25, to: -G.brazoReposo + 0.25 }, duration: 300, yoyo: true, repeat: Math.ceil(pasos / 2) - 1 }),
            tw({ targets: ob.brazoDer, rotation: { from: G.brazoReposo - 0.25, to: G.brazoReposo + 0.25 }, duration: 300, yoyo: true, repeat: Math.ceil(pasos / 2) - 1 })
        ]);
        var saltitos = tw({ targets: ob.zoe, y: ob.zoe.baseY - 18 * base, duration: 150, yoyo: true, repeat: pasos - 1, ease: "Sine.easeOut",
            onComplete: function () { ob.zoe.y = ob.zoe.baseY; } });
        var vaiven = tw({ targets: ob.zoe, angle: { from: -3, to: 3 }, duration: 300, yoyo: true, repeat: Math.ceil(pasos / 2) - 1,
            onComplete: function () { ob.zoe.angle = 0; } });
        var avance = tw({ targets: ob.zoe, x: xDestino, duration: ms, ease: "Sine.easeInOut" });
        return Promise.all([brazos, saltitos, vaiven, avance]).then(function () {
            ob.brazoIzq.rotation = ob.brazoIzq.reposo;
            ob.brazoDer.rotation = ob.brazoDer.reposo;
        });
    }

    async function pose(tipo) {
        var ob = o();
        var G = global.Personaje.GEOMETRIA;
        boca("risa");
        estrellasEn(ob.cabeza, 14, null, 1);
        if (tipo === "arriba") {
            await brazosA(G.brazoSaludo, -G.brazoSaludo, 260, "Back.easeOut");
            await sleep(450);
        } else if (tipo === "saludo") {
            await tw({ targets: ob.brazoIzq, rotation: G.brazoSaludo, duration: 300, ease: "Back.easeOut" });
            await tw({ targets: ob.brazoIzq, rotation: G.brazoSaludo + 0.3, duration: 180, yoyo: true, repeat: 1 });
        } else {
            await rotarCabeza([0.12, 0], 220);
            await parpadeo(1);
        }
        await brazosA(ob.brazoIzq.reposo, ob.brazoDer.reposo, 260, "Sine.easeInOut");
        boca("sonrisa");
    }

    /**
     * Desfile: centro → derecha (brazos arriba) → izquierda (saluda) → centro (guiño). Dura unos 6 s.
     * El ancho del recorrido sale del lienzo (sin el espejo, Zoe camina por todo el centro del cuarto).
     */
    async function desfilar() {
        if (!E() || !E().listo()) return;
        var ob = o();
        var W = sc().scale.width;
        var d = Math.min(W * 0.24, 240);
        empezar();
        reposo(false);
        var cx = ob.zoe.baseX;
        await caminar(cx + d, reducido ? 200 : 1300);
        await pose("arriba");
        await caminar(cx - d, reducido ? 200 : 1900);
        await pose("saludo");
        await caminar(cx, reducido ? 200 : 1200);
        await pose("guino");
        terminar();
        reposo(true);
    }

    global.ZoeAnim = {
        salir: salir,
        desfilar: desfilar,
        hablando: hablando,
        reposo: reposo,
        parpadeo: parpadeo,
        aparecer: aparecer,
        saludo: saludo,
        reaccion: reaccion,
        negar: negar,
        cosquilla: cosquilla,
        alegria: alegria,
        boca: boca,
        ocupada: function () { return ocupado > 0; }
    };
})(window);
