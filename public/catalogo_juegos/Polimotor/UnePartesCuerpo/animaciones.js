/**
 * ZeusAnim — animaciones de Zeus en "Une las Partes del Cuerpo" (window.ZeusAnim).
 *
 * Tomado de "¿Dónde se pone?" (mismo Zeus por partes), sin las reacciones de los accesorios.
 * Trabaja sobre EscenarioUne.objetos() con tweens de Phaser 4. Cada acción devuelve una Promise con
 * respaldo por tiempo: si la pestaña está oculta y Phaser no avanza, el juego no se queda esperando.
 * Los puntos de conexión cuelgan de las partes de Zeus, así que siguen cada movimiento.
 *
 *   reposo(on)       respira, balancea un poco los brazos y parpadea
 *   aparecer()       Zeus aparece sobre la tarima con brillos
 *   saludo()         levanta la mano y saluda
 *   hablando(on)     la boca se mueve mientras habla
 *   contento()       sonrisa grande y saltito (cada acierto)
 *   sorpresa()       "¡Uy!": cejas arriba y boquita redonda (conexión equivocada)
 *   alegria(veces)   salta con los brazos arriba
 *   celebrar()       final: gira, brazos arriba, saltos y estrellas
 */
(function (global) {
    "use strict";

    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var E = function () { return global.EscenarioUne; };
    var G = function () { return global.Personaje.GEOMETRIA; };
    var timerParpadeo = null;
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

    function aplicarFinal(cfg) {
        if (cfg.yoyo) return;
        var objetivos = [].concat(cfg.targets || []);
        Object.keys(cfg).forEach(function (k) {
            if (CLAVES_TWEEN.indexOf(k) >= 0) return;
            var v = cfg[k];
            if (v && typeof v === "object" && typeof v.to === "number") v = v.to;
            if (typeof v !== "number") return;
            objetivos.forEach(function (ob) {
                if (!ob || !ob.scene) return;
                if (k === "scale" && ob.setScale) ob.setScale(v);
                else ob[k] = v;
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
        if (!ob.ojoIzq || reducido) return;
        var ojos = [ob.ojoIzq, ob.ojoDer];
        var base = ob.ojoIzq.escalaBase;
        sc().tweens.add({
            targets: ojos, scaleY: base * 0.08, duration: 85, yoyo: true,
            repeat: Math.max(0, (veces || 1) - 1), repeatDelay: 120,
            onComplete: function () { ojos.forEach(function (j) { j.scaleY = base; }); }
        });
    }

    function programarParpadeo() {
        clearTimeout(timerParpadeo);
        var espera = ESPERAS_PARPADEO[pasoParpadeo % ESPERAS_PARPADEO.length];
        pasoParpadeo++;
        timerParpadeo = setTimeout(function () {
            if (!ocupado) parpadeo(pasoParpadeo % 4 === 0 ? 2 : 1);
            programarParpadeo();
        }, espera);
    }

    /** Balanceo muy leve: la mano y el brazo tienen puntos de conexión, no deben escaparse del dedo. */
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
                targets: b, rotation: b.reposo - b.k * 0.025,
                duration: 1900 + i * 230, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
            });
        });
    }

    function reposo(on) {
        var s = sc();
        var ob = o();
        if (!s || !ob.zeus) return;
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
            s.tweens.add({ targets: ob.cuerpo, scaleY: ob.cuerpo.escalaBase * 1.008, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            s.tweens.add({ targets: ob.cabeza, y: G().cabeza.y - 4, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        balanceoBrazos();
        programarParpadeo();
    }

    // ------------------------------------------------------------------ movimientos

    function brazo(b, sup, codo, ms, ease) {
        var s = sc();
        if (!s || !b) return Promise.resolve();
        s.tweens.killTweensOf([b, b.codo]);
        return Promise.all([
            tw({ targets: b, rotation: sup, duration: ms, ease: ease || "Sine.easeInOut" }),
            tw({ targets: b.codo, rotation: codo, duration: ms, ease: ease || "Sine.easeInOut" })
        ]);
    }

    var POSES = {
        arriba: [-2.75, 0],
        jarra: [-0.8, 1.6]
    };

    function brazoA(b, pose, ms, ease) {
        if (pose === "reposo") return brazo(b, b.reposo, 0, ms, ease);
        var v = POSES[pose];
        return brazo(b, v[0] * b.k, v[1] * b.k, ms, ease);
    }

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

    async function contento() {
        if (!listo()) return;
        empezar();
        boca("risa");
        await saltito(36, 1, 200);
        await sleep(250);
        boca("sonrisa");
        terminar();
    }

    async function sorpresa() {
        if (!listo()) return;
        var ob = o();
        empezar();
        boca("sorpresa");
        var cejas = [ob.cejaIzq, ob.cejaDer];
        var cy = G().ceja.y;
        await tw({ targets: cejas, y: cy - 16, duration: 140, ease: "Back.easeOut" });
        await rotarCabeza([-0.05, 0.05, 0], 110);
        await tw({ targets: cejas, y: cy, duration: 220, delay: 250 });
        boca("sonrisa");
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

    /** Celebración final: se voltea, manos en la cintura, brazos arriba y saltos con estrellas. */
    async function celebrar() {
        if (!listo()) return;
        var ob = o();
        var base = ob.zeus.baseEscala;
        empezar();
        reposo(false);
        boca("risa");
        await tw({ targets: ob.zeus, scaleX: base * 0.78, angle: 3, duration: 240, ease: "Sine.easeInOut" });
        await tw({ targets: ob.zeus, scaleX: -base * 0.78, duration: 200, ease: "Sine.easeInOut" });
        await tw({ targets: ob.zeus, scaleX: base, angle: 0, duration: 280, ease: "Back.easeOut",
            onComplete: function () { ob.zeus.setScale(ob.zeus.baseEscala); } });
        await Promise.all([brazoA(ob.brazoIzq, "jarra", 320, "Back.easeOut"), brazoA(ob.brazoDer, "jarra", 320, "Back.easeOut")]);
        await rotarCabeza([-0.1, 0.1, 0], 200);
        await Promise.all([brazoA(ob.brazoIzq, "arriba", 260, "Back.easeOut"), brazoA(ob.brazoDer, "arriba", 260, "Back.easeOut")]);
        for (var i = 0; i < 3; i++) {
            estrellasEn(ob.cabeza, 16, null, 1.1);
            await saltito(80, 1, 240);
        }
        await volverAReposo();
        terminar();
        reposo(true);
    }

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
        contento: contento,
        sorpresa: sorpresa,
        alegria: alegria,
        celebrar: celebrar,
        hablando: hablando
    };
})(window);
