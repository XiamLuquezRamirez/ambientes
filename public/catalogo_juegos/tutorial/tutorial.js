/**
 * PedniaTutorial — helpers compartidos de demostración (Multisensorial).
 * Depende de TextoVoz si está cargado.
 */
(function (global) {
    "use strict";

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function mostrarIntroActiva(acc) {
        return !!(acc && acc.mostrarIntro);
    }

    async function hablarDemo(texto, minMs) {
        const minimo = minMs != null ? minMs : 2800;
        if (!texto || typeof TextoVoz === "undefined" || typeof TextoVoz.hablar !== "function") {
            await sleep(minimo);
            return;
        }
        const p = TextoVoz.hablar(String(texto), "zoe");
        const voz = (p && typeof p.then === "function")
            ? p.catch(function () { /* noop */ })
            : Promise.resolve();
        await Promise.all([
            Promise.race([voz, sleep(14000)]),
            sleep(minimo)
        ]);
    }

    function mostrarZoe() {
        const el = document.getElementById("tutorial-zoe");
        if (!el) return;
        el.hidden = false;
        el.setAttribute("aria-hidden", "false");
        void el.offsetWidth;
        el.classList.add("is-visible");
    }

    function ocultarZoe(forzar) {
        const el = document.getElementById("tutorial-zoe");
        if (!el) return;
        el.classList.remove("is-visible");
        setTimeout(function () {
            if (forzar || !document.body.classList.contains("demo-activa")) {
                el.hidden = true;
                el.setAttribute("aria-hidden", "true");
            }
        }, 650);
    }

    function activarDemo() {
        document.body.classList.add("demo-activa");
        mostrarZoe();
    }

    function detenerDemo() {
        document.body.classList.remove("demo-activa");
        document.querySelectorAll(".is-demo-target").forEach(function (el) {
            el.classList.remove("is-demo-target");
        });
        ocultarZoe(true);
    }

    global.PedniaTutorial = {
        sleep: sleep,
        mostrarIntroActiva: mostrarIntroActiva,
        hablarDemo: hablarDemo,
        mostrarZoe: mostrarZoe,
        ocultarZoe: ocultarZoe,
        activarDemo: activarDemo,
        detenerDemo: detenerDemo
    };
})(window);
