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

    function activarDemo3d() {
        document.body.classList.add("demo-activa");
    }

    function detenerDemo() {
        document.body.classList.remove("demo-activa");
        document.querySelectorAll(".is-demo-target").forEach(function (el) {
            el.classList.remove("is-demo-target");
        });
        ocultarZoe(true);
    }

    function entrarPersonaje() {
        if (!global.Tutorial3d || typeof global.Tutorial3d.start !== "function") {
            return Promise.resolve("zoe");
        }
        return Promise.resolve(global.Tutorial3d.start()).catch(function () {
            return "zoe";
        });
    }

    function despedirPersonaje() {
        if (global.Tutorial3d && typeof global.Tutorial3d.despedir === "function") {
            return Promise.resolve(global.Tutorial3d.despedir()).catch(function () {});
        }
        if (global.Tutorial3d && typeof global.Tutorial3d.stop === "function") {
            global.Tutorial3d.stop();
        }
        return Promise.resolve();
    }

    function moverHacia(el, destino, ms) {
        return new Promise(function (resolve) {
            if (!el || !destino) {
                resolve();
                return;
            }
            const a = el.getBoundingClientRect();
            const b = destino.getBoundingClientRect();
            const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
            const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
            const dur = ms != null ? ms : 1100;
            el.style.zIndex = "40";
            el.style.transition = "transform " + dur + "ms ease";
            el.style.transform = "translate(" + dx + "px," + dy + "px)";
            setTimeout(function () {
                el.style.transition = "";
                el.style.transform = "";
                el.style.zIndex = "";
                resolve();
            }, dur + 40);
        });
    }

    async function correr(opts) {
        opts = opts || {};
        const cancelado = typeof opts.cancelado === "function" ? opts.cancelado : function () { return false; };
        if (cancelado()) return;
        activarDemo3d();
        const quien = await entrarPersonaje();
        if (cancelado()) {
            await despedirPersonaje();
            detenerDemo();
            return;
        }
        if (typeof opts.onTexto === "function") opts.onTexto(opts.texto);
        await hablarDemo(opts.texto, opts.minMs != null ? opts.minMs : 700);
        if (cancelado()) {
            await despedirPersonaje();
            detenerDemo();
            return;
        }
        if (typeof opts.jugar === "function") {
            try { await opts.jugar(quien); } catch (e) { /* noop */ }
        }
        if (cancelado()) {
            await despedirPersonaje();
            detenerDemo();
            return;
        }
        if (typeof opts.onTexto === "function") opts.onTexto(opts.textoFin);
        await hablarDemo(opts.textoFin, opts.minMs != null ? opts.minMs : 700);
        await despedirPersonaje();
        detenerDemo();
    }

    global.PedniaTutorial = {
        sleep: sleep,
        mostrarIntroActiva: mostrarIntroActiva,
        hablarDemo: hablarDemo,
        mostrarZoe: mostrarZoe,
        ocultarZoe: ocultarZoe,
        activarDemo: activarDemo,
        detenerDemo: detenerDemo,
        entrarPersonaje: entrarPersonaje,
        despedirPersonaje: despedirPersonaje,
        moverHacia: moverHacia,
        correr: correr
    };
})(window);
