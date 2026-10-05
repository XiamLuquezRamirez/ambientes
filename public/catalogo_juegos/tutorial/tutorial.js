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

    function conTope(promesa, ms, valor) {
        return Promise.race([
            Promise.resolve(promesa).catch(function () { return valor; }),
            sleep(ms).then(function () { return valor; })
        ]);
    }

    function entrarPersonaje() {
        if (!global.Tutorial3d || typeof global.Tutorial3d.start !== "function") {
            return Promise.resolve("zoe");
        }
        // Esperar a que el personaje esté en sitio. Tope alto solo para la 1.ª carga del GLB.
        // No hablar antes: start() ya teletransporta si el walk se atrasa.
        return conTope(global.Tutorial3d.start(), 10000, "zoe");
    }

    function despedirPersonaje() {
        if (global.Tutorial3d && typeof global.Tutorial3d.despedir === "function") {
            return conTope(global.Tutorial3d.despedir(), 2500, undefined).then(function () {
                if (global.Tutorial3d && typeof global.Tutorial3d.stop === "function") {
                    const root = document.getElementById("tutorial-3d");
                    if (root && root.classList.contains("is-visible")) {
                        global.Tutorial3d.stop();
                    }
                }
            });
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

    // Punta = centro del anillo azul (Mano-bolita / movimiento), medido sobre 500×500.
    const MANO_TIP_X = 0.287;
    const MANO_TIP_Y = 0.181;
    const MANO_FASES = {
        viajar: "Mano.png",
        llegar: "Mano-bolita-movimiento.gif",
        presionar: "Mano-bolita.gif"
    };
    const manoListas = Object.create(null);

    function manoBaseUrl() {
        const scripts = document.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src || "";
            const m = src.match(/^(.*\/tutorial\/)tutorial\.js(?:\?.*)?$/i);
            if (m) return m[1] + "img/";
        }
        return "../../tutorial/img/";
    }

    function urlMano(archivo) {
        return manoBaseUrl() + archivo;
    }

    function precargarManos() {
        Object.keys(MANO_FASES).forEach(function (fase) {
            const archivo = MANO_FASES[fase];
            if (manoListas[archivo]) return;
            const img = new Image();
            manoListas[archivo] = new Promise(function (resolve) {
                img.onload = function () { resolve(img); };
                img.onerror = function () { resolve(img); };
                img.src = urlMano(archivo);
            });
        });
        return Promise.all(Object.keys(MANO_FASES).map(function (f) {
            return manoListas[MANO_FASES[f]];
        }));
    }

    function esperarMano(archivo, topeMs) {
        const p = manoListas[archivo] || precargarManos().then(function () {
            return manoListas[archivo];
        });
        return Promise.race([p, sleep(topeMs != null ? topeMs : 1200)]);
    }

    function quitarManos() {
        document.querySelectorAll(".demo-dedo").forEach(function (n) { n.remove(); });
    }

    function crearMano() {
        quitarManos();
        const el = document.createElement("div");
        el.className = "demo-dedo";
        el.setAttribute("aria-hidden", "true");
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.src = urlMano(MANO_FASES.viajar);
        el.appendChild(img);
        el._manoImg = img;
        el._manoFase = "viajar";
        document.body.appendChild(el);
        return el;
    }

    function faseMano(el, fase) {
        if (!el || !el._manoImg) return;
        const archivo = MANO_FASES[fase] || MANO_FASES.viajar;
        if (el._manoFase === fase && el._manoImg.getAttribute("src") && el._manoImg.getAttribute("src").indexOf(archivo) >= 0) {
            return;
        }
        el._manoFase = fase;
        el._manoImg.src = urlMano(archivo);
        el.classList.toggle("is-pressed", fase === "presionar");
    }

    function puntaManoEn(el, x, y) {
        if (!el) return;
        const w = el.offsetWidth || 160;
        const h = el.offsetHeight || 160;
        el.style.left = (x - w * MANO_TIP_X) + "px";
        el.style.top = (y - h * MANO_TIP_Y) + "px";
    }

    function centroDe(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /**
     * Mano viaja → llega (gif movimiento) → queda pressada (Mano-bolita.gif).
     */
    async function animarMano(opts) {
        opts = opts || {};
        const reducir = opts.reducir != null
            ? !!opts.reducir
            : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const cancelado = typeof opts.cancelado === "function" ? opts.cancelado : function () { return false; };

        function resolverPunto(p) {
            if (typeof p === "function") p = p();
            if (!p) return null;
            if (p.nodeType === 1) return centroDe(p);
            if (typeof p.x === "number" && typeof p.y === "number") return { x: p.x, y: p.y };
            return null;
        }

        const destino = resolverPunto(opts.punto);
        if (!destino) return;

        await esperarMano(MANO_FASES.viajar, 1500);
        if (cancelado()) return;

        const el = crearMano();
        const ox = opts.desdeOffset && opts.desdeOffset.x != null ? opts.desdeOffset.x : 140;
        const oy = opts.desdeOffset && opts.desdeOffset.y != null ? opts.desdeOffset.y : 160;
        const holdMs = opts.holdMs != null ? opts.holdMs : (reducir ? 200 : 1000);
        const viajeMs = opts.viajeMs != null ? opts.viajeMs : (reducir ? 40 : 900);

        faseMano(el, "viajar");
        // Sin transición en el punto de partida (si no, el primer frame ya anima desde 0,0).
        el.style.transition = "none";
        puntaManoEn(el, reducir ? destino.x : destino.x + ox, reducir ? destino.y : destino.y + oy);
        void el.offsetWidth;

        if (cancelado()) {
            quitarManos();
            return;
        }

        if (!reducir) {
            el.style.transition = "left " + viajeMs + "ms cubic-bezier(0.2, 0.8, 0.2, 1), top " + viajeMs + "ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        }
        puntaManoEn(el, destino.x, destino.y);
        await sleep(viajeMs);
        if (cancelado()) {
            quitarManos();
            return;
        }

        // Gif de movimiento (precargado) y luego queda “presionado”.
        await esperarMano(MANO_FASES.llegar, 800);
        faseMano(el, "llegar");
        await sleep(opts.llegarMs != null ? opts.llegarMs : (reducir ? 40 : 280));
        if (cancelado()) {
            quitarManos();
            return;
        }
        faseMano(el, "presionar");
        if (typeof opts.onPresionar === "function") {
            try { opts.onPresionar(el); } catch (e) { /* noop */ }
        }

        const arrastre = opts.arrastre;
        if (arrastre && (arrastre.dx || arrastre.dy)) {
            const dur = arrastre.durMs != null ? arrastre.durMs : (reducir ? 180 : 700);
            el.style.transition = reducir
                ? "none"
                : "left " + dur + "ms ease, top " + dur + "ms ease";
            puntaManoEn(el, destino.x + (arrastre.dx || 0), destino.y + (arrastre.dy || 0));
            if (typeof opts.onDuranteArrastre === "function") {
                try { opts.onDuranteArrastre(el, arrastre); } catch (e2) { /* noop */ }
            }
            await sleep(reducir ? 200 : Math.max(holdMs, dur + 400));
            if (cancelado()) {
                quitarManos();
                return;
            }
            el.style.transition = reducir
                ? "none"
                : "left 0.55s ease, top 0.55s ease";
            puntaManoEn(el, destino.x, destino.y);
            await sleep(reducir ? 120 : 700);
        } else {
            await sleep(holdMs);
        }

        if (typeof opts.onSoltar === "function") {
            try { opts.onSoltar(el); } catch (e3) { /* noop */ }
        }
        quitarManos();
    }

    async function correr(opts) {
        opts = opts || {};
        const cancelado = typeof opts.cancelado === "function" ? opts.cancelado : function () { return false; };
        if (cancelado()) return;
        // Manos en paralelo al personaje (no bloquea el arranque).
        precargarManos();
        if (global.Tutorial3d && typeof global.Tutorial3d.preload === "function") {
            try { global.Tutorial3d.preload(); } catch (e) { /* noop */ }
        }
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

    // Precarga apenas se carga el script (antes de elegir edad).
    precargarManos();
    if (document.readyState === "complete") {
        if (global.Tutorial3d && typeof global.Tutorial3d.preload === "function") {
            try { global.Tutorial3d.preload(); } catch (e0) { /* noop */ }
        }
    } else {
        window.addEventListener("load", function () {
            if (global.Tutorial3d && typeof global.Tutorial3d.preload === "function") {
                try { global.Tutorial3d.preload(); } catch (e1) { /* noop */ }
            }
        });
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
        quitarManos: quitarManos,
        crearMano: crearMano,
        faseMano: faseMano,
        puntaManoEn: puntaManoEn,
        centroDe: centroDe,
        precargarManos: precargarManos,
        animarMano: animarMano,
        correr: correr
    };
})(window);
