/**
 * ZeusAnim — animaciones de Zeus en el vestidor (window.ZeusAnim).
 *
 * Trabaja sobre EscenarioPhaser.objetos() con tweens de Phaser 4. Cada acción devuelve una Promise con
 * respaldo por tiempo: si la pestaña está oculta y Phaser no avanza, el juego no se queda esperando.
 *
 *   reposo(on)        respira, balancea los brazos y parpadea mientras espera
 *   aparecer()        Zeus aparece en la tarima con brillos
 *   saludo()          levanta la mano y saluda
 *   hablando(on)      la boca se mueve mientras suena su voz
 *   reaccion(tipo)    "modelo" (gafas) · "sombrero" · "baile" (tenis) · "bufanda" — una por accesorio
 *   sorpresa()        "¡Uy!": cejas arriba, boquita redonda y un saltito atrás (respuesta incorrecta)
 *   alegria(veces)    salta con los brazos arriba
 *   desfile()         disfraz completo: gira, manos en la cintura, pose divertida y celebra
 * Brazos: el codo es un contenedor, así puede llevarse la mano a las gafas o al sombrero, o ponerse en jarra.
 */
(function (global) {
    "use strict";

    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var E = function () { return global.EscenarioPhaser; };
    var G = function () { return global.Personaje.GEOMETRIA; };
    var timerParpadeo = null;
    var reposoActivo = false;
    var ocupado = 0;
    var pasoParpadeo = 0;
    var ESPERAS_PARPADEO = [3200, 4100, 2600, 4700, 3600, 2900];

    function sc() { return E() && E().escena(); }
    function o() { return E() ? E().objetos() : {}; }
    function listo() { return !!(E() && E().listo()); }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    var CLAVES_TWEEN = ["targets", "duration", "delay", "ease", "yoyo", "repeat", "repeatDelay", "hold", "onComplete", "onUpdate", "onStart"];

    /** Valores finales de un tween (para fijarlos si Phaser no avanzó: pestaña oculta). */
    function aplicarFinal(cfg) {
        if (cfg.yoyo) return;
        var objetivos = [].concat(cfg.targets || []);
        Object.keys(cfg).forEach(function (k) {
            if (CLAVES_TWEEN.indexOf(k) >= 0) return;
            var v = cfg[k];
            if (v && typeof v === "object" && typeof v.to === "number") v = v.to;
            if (typeof v !== "number") return;
            objetivos.forEach(function (o) {
                if (!o || !o.scene) return;
                if (k === "scale" && o.setScale) o.setScale(v);
                else o[k] = v;
            });
        });
    }

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
            var fin = function () { if (!hecho) { hecho = true; resolve(); } };
            var prev = cfg.onComplete;
            cfg.onComplete = function () { if (typeof prev === "function") prev(); fin(); };
            var t = s.tweens.add(cfg);
            setTimeout(function () {
                if (hecho) return;
                if (t && t.isPlaying && t.isPlaying()) t.stop();
                aplicarFinal(cfg);
                if (typeof prev === "function") prev();
                fin();
            }, dur + 250);
        });
    }

    function boca(clave) {
        var b = o().boca;
        if (b && b.scene) b.setTexture("zeus-boca_" + clave);
    }

    function mundo(objeto) {
        var m = objeto.getWorldTransformMatrix();
        return { x: m.tx, y: m.ty };
    }

    function estrellasEn(objeto, n, colores, fuerza) {
        if (!objeto || !E()) return;
        var p = mundo(objeto);
        E().estrellas(p.x, p.y, n, colores, fuerza);
    }

    function empezar() { ocupado++; }
    function terminar() { ocupado = Math.max(0, ocupado - 1); }

    // ------------------------------------------------------------------ reposo

    function parpadeo(veces) {
        var ob = o();
        if (!ob.ojoIzq) return Promise.resolve();
        var ojos = [ob.ojoIzq, ob.ojoDer];
        var base = ob.ojoIzq.escalaBase;
        return tw({
            targets: ojos, scaleY: base * 0.08, duration: 85, yoyo: true,
            repeat: Math.max(0, (veces || 1) - 1), repeatDelay: 90, ease: "Quad.easeIn",
            onComplete: function () { ojos.forEach(function (j) { j.scaleY = base; }); }
        });
    }

    function guino() {
        var ob = o();
        if (!ob.ojoIzq) return Promise.resolve();
        var base = ob.ojoIzq.escalaBase;
        return tw({ targets: ob.ojoIzq, scaleY: base * 0.08, duration: 120, yoyo: true, hold: 260,
            onComplete: function () { ob.ojoIzq.scaleY = base; } });
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
        if (!s || !ob.brazoIzq) return;
        [ob.brazoIzq, ob.brazoDer].forEach(function (b, i) {
            s.tweens.killTweensOf([b, b.codo]);
            b.rotation = b.reposo;
            b.codo.rotation = 0;
            b.y = G().hombro.y;
            if (reducido) return;
            s.tweens.add({
                targets: b, rotation: b.reposo - b.k * 0.05,
                duration: 1700 + i * 230, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
            });
        });
    }

    function reposo(on) {
        var s = sc();
        var ob = o();
        if (!s || !ob.zeus) return;
        reposoActivo = !!on;
        s.tweens.killTweensOf([ob.cuerpo, ob.cabeza]);
        ob.cuerpo.setScale(ob.cuerpo.escalaBase);
        ob.cabeza.y = G().cabeza.y;
        ob.cabeza.x = G().cabeza.x;
        ob.cabeza.rotation = 0;
        if (!on) {
            clearTimeout(timerParpadeo);
            return;
        }
        if (!reducido) {
            s.tweens.add({ targets: ob.cuerpo, scaleY: ob.cuerpo.escalaBase * 1.01, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            s.tweens.add({ targets: ob.cabeza, y: G().cabeza.y - 6, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        balanceoBrazos();
        programarParpadeo();
    }

    // ------------------------------------------------------------------ ayudas de movimiento

    /** Mueve un brazo: rotación del hombro y del codo (radianes). */
    function brazo(b, sup, codo, ms, ease) {
        var s = sc();
        if (!s || !b) return Promise.resolve();
        s.tweens.killTweensOf([b, b.codo]);
        return Promise.all([
            tw({ targets: b, rotation: sup, duration: ms, ease: ease || "Sine.easeInOut" }),
            tw({ targets: b.codo, rotation: codo, duration: ms, ease: ease || "Sine.easeInOut" })
        ]);
    }

    /** Valores para el brazo izquierdo de Zeus (derecha de la pantalla); el derecho es el espejo. */
    function lado(b, sup, codo) { return [sup * b.k, codo * b.k]; }

    function brazoA(b, pose, ms, ease) {
        var v = POSES[pose] || POSES.reposo;
        var r = lado(b, v[0], v[1]);
        if (pose === "reposo") r = [b.reposo, 0];
        return brazo(b, r[0], r[1], ms, ease);
    }

    var POSES = {
        reposo: [-0.3, 0],
        arriba: [-2.75, 0],
        gafas: [-2.7, -0.3],       // la mano toca la patilla de las gafas (junto a la oreja)
        sombrero: [-2.95, 0.1],    // la mano sube hasta el ala del sombrero (más no alcanza: la cabeza es grande)
        jarra: [-0.8, 1.6],        // mano en la cadera
        pulgar: [-1.35, -1.1],     // brazo al frente, mano arriba (aprobación)
        baile: [-1.6, -0.9]
    };

    function rotarCabeza(valores, ms) {
        var cab = o().cabeza;
        if (!cab) return Promise.resolve();
        var cadena = Promise.resolve();
        valores.forEach(function (v) {
            cadena = cadena.then(function () { return tw({ targets: cab, rotation: v, duration: ms, ease: "Sine.easeInOut" }); });
        });
        return cadena;
    }

    function saltito(alto, veces, ms) {
        var ob = o();
        var a = (alto || 60) * ob.zeus.baseEscala;
        return tw({ targets: ob.zeus, y: ob.zeus.baseY - a, duration: ms || 220, yoyo: true, repeat: Math.max(0, (veces || 1) - 1), ease: "Quad.easeOut",
            onComplete: function () { ob.zeus.y = ob.zeus.baseY; } });
    }

    function volverAReposo() {
        var ob = o();
        return Promise.all([
            brazoA(ob.brazoIzq, "reposo", 320),
            brazoA(ob.brazoDer, "reposo", 320),
            tw({ targets: ob.cabeza, rotation: 0, x: G().cabeza.x, duration: 260 }),
            tw({ targets: ob.zeus, angle: 0, x: ob.zeus.baseX, duration: 260 })
        ]).then(function () {
            boca("sonrisa");
            balanceoBrazos();
        });
    }

    // ------------------------------------------------------------------ reacciones por accesorio

    /** Gafas: mira a los lados, inclina la cabeza, se toca las gafas como modelo y sonríe. */
    async function reaccionModelo() {
        var ob = o();
        boca("sonrisa");
        await Promise.all([
            tw({ targets: ob.cabeza, x: 14, rotation: 0.1, duration: 260, ease: "Sine.easeInOut" })
        ]);
        await tw({ targets: ob.cabeza, x: -14, rotation: -0.1, duration: 360, ease: "Sine.easeInOut" });
        await tw({ targets: ob.cabeza, x: 0, rotation: 0.14, duration: 260, ease: "Sine.easeInOut" });
        boca("risa");
        await Promise.all([brazoA(ob.brazoIzq, "gafas", 360, "Back.easeOut"), brazoA(ob.brazoDer, "jarra", 360)]);
        estrellasEn(ob.cabeza, 14, [0xffffff, 0xfff2a8, 0xff8fc7], 0.8);
        await sleep(650);
        await volverAReposo();
    }

    /** Sombrero: mueve la cabeza, se ajusta el ala y hace un gesto de aprobación con un guiño. */
    async function reaccionSombrero() {
        var ob = o();
        await rotarCabeza([-0.1, 0.1, 0], 170);
        await brazoA(ob.brazoIzq, "sombrero", 360, "Back.easeOut");
        // "se ajusta" el sombrero: se ladea y vuelve a su lugar
        var sombrero = E().piezas("sombrero")[0];
        await Promise.all([
            tw({ targets: ob.cabeza, rotation: -0.06, duration: 160, yoyo: true, repeat: 1 }),
            sombrero ? tw({ targets: sombrero, rotation: 0.14, y: sombrero.y - 12, duration: 180, yoyo: true, repeat: 1, ease: "Sine.easeInOut",
                onComplete: function () { sombrero.rotation = 0; } }) : Promise.resolve()
        ]);
        boca("risa");
        await Promise.all([brazoA(ob.brazoIzq, "reposo", 300), brazoA(ob.brazoDer, "pulgar", 360, "Back.easeOut")]);
        await guino();
        await sleep(300);
        await volverAReposo();
    }

    /** Tenis: levanta un pie, hace un pasito de baile y celebra. */
    async function reaccionBaile() {
        var ob = o();
        boca("risa");
        // levanta la punta del pie izquierdo y luego la del derecho
        await tw({ targets: ob.pieIzq, rotation: -0.45, duration: 180, yoyo: true, ease: "Quad.easeOut", onComplete: function () { ob.pieIzq.rotation = 0; } });
        await tw({ targets: ob.pieDer, rotation: 0.45, duration: 180, yoyo: true, ease: "Quad.easeOut", onComplete: function () { ob.pieDer.rotation = 0; } });
        await Promise.all([brazoA(ob.brazoIzq, "baile", 240), brazoA(ob.brazoDer, "baile", 240)]);
        var d = 26 * ob.zeus.baseEscala;
        for (var i = 0; i < 2; i++) {
            await Promise.all([
                tw({ targets: ob.zeus, x: ob.zeus.baseX + d, angle: 5, duration: 200, ease: "Sine.easeInOut" }),
                saltito(30, 1, 100)
            ]);
            await Promise.all([
                tw({ targets: ob.zeus, x: ob.zeus.baseX - d, angle: -5, duration: 200, ease: "Sine.easeInOut" }),
                saltito(30, 1, 100)
            ]);
        }
        await tw({ targets: ob.zeus, x: ob.zeus.baseX, angle: 0, duration: 160 });
        await Promise.all([brazoA(ob.brazoIzq, "arriba", 240, "Back.easeOut"), brazoA(ob.brazoDer, "arriba", 240, "Back.easeOut")]);
        estrellasEn(ob.pieIzq, 10, null, 0.8);
        estrellasEn(ob.pieDer, 10, null, 0.8);
        await saltito(70, 1, 230);
        await volverAReposo();
    }

    /** Bufanda: mueve los hombros, la bufanda ondea y hace una pose divertida sonriendo. */
    async function reaccionBufanda() {
        var ob = o();
        boca("risa");
        var y0 = G().hombro.y;
        var s = sc();
        s.tweens.killTweensOf([ob.brazoIzq, ob.brazoDer]);
        var cola = ob.bufandaCola;
        if (cola) s.tweens.killTweensOf(cola);
        var ondea = cola ? tw({ targets: cola, rotation: { from: -0.3, to: 0.3 }, duration: 260, yoyo: true, repeat: 2, ease: "Sine.easeInOut",
            onComplete: function () { cola.rotation = 0; } }) : Promise.resolve();
        await tw({ targets: [ob.brazoIzq, ob.brazoDer], y: y0 - 18, duration: 170, yoyo: true, repeat: 2, ease: "Sine.easeInOut",
            onComplete: function () { ob.brazoIzq.y = y0; ob.brazoDer.y = y0; } });
        await ondea;
        await Promise.all([
            tw({ targets: ob.zeus, angle: -5, duration: 260, ease: "Back.easeOut" }),
            tw({ targets: ob.cabeza, rotation: 0.12, duration: 260 }),
            brazoA(ob.brazoDer, "arriba", 300, "Back.easeOut"),
            brazoA(ob.brazoIzq, "jarra", 300)
        ]);
        estrellasEn(ob.cabeza, 12, [0x7cd3f7, 0xffffff, 0xffe066], 0.8);
        await sleep(600);
        if (E()) E().ondearBufanda(true);
        await volverAReposo();
    }

    var REACCIONES = { modelo: reaccionModelo, sombrero: reaccionSombrero, baile: reaccionBaile, bufanda: reaccionBufanda };

    async function reaccion(tipo) {
        if (!listo()) return;
        empezar();
        try {
            await (REACCIONES[tipo] || reaccionModelo)();
        } catch (e) {
            console.warn("[ZeusAnim]", tipo, e);
        }
        terminar();
    }

    // ------------------------------------------------------------------ otras acciones

    async function sorpresa() {
        if (!listo()) return;
        var ob = o();
        empezar();
        boca("sorpresa");
        var cejas = [ob.cejaIzq, ob.cejaDer];
        var cy = G().ceja.y;
        await Promise.all([
            tw({ targets: cejas, y: cy - 16, duration: 140, ease: "Back.easeOut" }),
            tw({ targets: ob.zeus, scaleY: ob.zeus.baseEscala * 0.96, scaleX: ob.zeus.baseEscala * 1.03, duration: 110, yoyo: true,
                onComplete: function () { ob.zeus.setScale(ob.zeus.baseEscala); } })
        ]);
        await rotarCabeza([-0.06, 0.06, 0], 110);
        await tw({ targets: cejas, y: cy, duration: 220, delay: 250 });
        boca("sonrisa");
        terminar();
    }

    async function saludo() {
        if (!listo()) return;
        var ob = o();
        empezar();
        var b = ob.brazoIzq;
        boca("abierta");
        await brazoA(b, "arriba", 420, "Back.easeOut");
        boca("sonrisa");
        await tw({ targets: b.codo, rotation: -0.5, duration: 200, yoyo: true, repeat: 2, ease: "Sine.easeInOut",
            onComplete: function () { b.codo.rotation = 0; } });
        estrellasEn(b.mano, 8, null, 0.6);
        await brazoA(b, "reposo", 420);
        balanceoBrazos();
        terminar();
    }

    async function aparecer() {
        if (!listo()) return;
        var ob = o();
        empezar();
        var base = ob.zeus.baseEscala;
        ob.zeus.setAlpha(0);
        ob.zeus.setScale(base * 0.86);
        var p = mundo(ob.cabeza);
        E().estrellas(ob.zeus.baseX, (p.y + ob.zeus.baseY) / 2, 22, null, 1.2);
        await tw({ targets: ob.zeus, alpha: 1, scale: base, duration: 650, ease: "Back.easeOut",
            onComplete: function () { ob.zeus.setScale(ob.zeus.baseEscala); } });
        terminar();
    }

    async function alegria(veces) {
        if (!listo()) return;
        var ob = o();
        empezar();
        boca("risa");
        await Promise.all([brazoA(ob.brazoIzq, "arriba", 260, "Back.easeOut"), brazoA(ob.brazoDer, "arriba", 260, "Back.easeOut")]);
        for (var i = 0; i < (veces || 2); i++) {
            estrellasEn(ob.cabeza, 16, null, 1);
            await saltito(70, 1, 230);
        }
        await volverAReposo();
        terminar();
    }

    /** Disfraz completo: gira un poco el cuerpo, manos en la cintura, pose divertida y celebra. */
    async function desfile() {
        if (!listo()) return;
        var ob = o();
        var base = ob.zeus.baseEscala;
        empezar();
        reposo(false);
        boca("sonrisa");
        // giro: se "voltea" a un lado y vuelve de frente
        await tw({ targets: ob.zeus, scaleX: base * 0.78, angle: 3, duration: 260, ease: "Sine.easeInOut" });
        await tw({ targets: ob.zeus, scaleX: -base * 0.78, duration: 220, ease: "Sine.easeInOut" });
        await tw({ targets: ob.zeus, scaleX: base, angle: 0, duration: 300, ease: "Back.easeOut",
            onComplete: function () { ob.zeus.setScale(ob.zeus.baseEscala); } });
        // manos en la cintura
        await Promise.all([brazoA(ob.brazoIzq, "jarra", 360, "Back.easeOut"), brazoA(ob.brazoDer, "jarra", 360, "Back.easeOut")]);
        await Promise.all([
            tw({ targets: ob.zeus, angle: 6, duration: 260, ease: "Back.easeOut" }),
            tw({ targets: ob.cabeza, rotation: -0.12, duration: 260 })
        ]);
        boca("risa");
        await guino();
        await sleep(500);
        // pose divertida: un brazo arriba y el otro en la cintura
        await Promise.all([
            tw({ targets: ob.zeus, angle: -4, duration: 240 }),
            tw({ targets: ob.cabeza, rotation: 0.1, duration: 240 }),
            brazoA(ob.brazoDer, "arriba", 280, "Back.easeOut")
        ]);
        estrellasEn(ob.cabeza, 18, null, 1.1);
        await sleep(500);
        await tw({ targets: ob.zeus, angle: 0, duration: 200 });
        await Promise.all([brazoA(ob.brazoIzq, "arriba", 240, "Back.easeOut"), brazoA(ob.brazoDer, "arriba", 240, "Back.easeOut")]);
        for (var i = 0; i < 2; i++) {
            estrellasEn(ob.cabeza, 14, null, 1);
            await saltito(80, 1, 240);
        }
        await volverAReposo();
        terminar();
        reposo(true);
    }

    // ------------------------------------------------------------------ hablar

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

    global.ZeusAnim = {
        reposo: reposo,
        aparecer: aparecer,
        saludo: saludo,
        hablando: hablando,
        reaccion: reaccion,
        sorpresa: sorpresa,
        alegria: alegria,
        desfile: desfile,
        parpadeo: parpadeo,
        boca: boca,
        brazoA: brazoA,
        POSES: POSES,
        ocupado: function () { return ocupado > 0; }
    };
})(window);
