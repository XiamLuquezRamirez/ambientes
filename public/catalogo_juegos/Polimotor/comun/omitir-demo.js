/**
 * PedniaOmitirDemo — botón «Omitir demo» común a los juegos de Polimotor.
 *
 * Uso con una demo que recibe un `api` (demo.js de cada juego):
 *
 *     var omitida = await PedniaOmitirDemo.correr(window.XDemo.correr, apiDemo(tk), { alOmitir: fn });
 *
 * - Muestra el botón mientras corre la demo y lo quita al terminar.
 * - Al tocarlo: calla la voz (TextoVoz), quita la mano de PedniaTutorial, llama a `alOmitir`
 *   (o, si no hay, a `api.terminar`) y resuelve enseguida: el juego sigue su flujo normal
 *   (Zoe se va, «¡Comenzar a jugar!»).
 * - Desde ese momento el `api` que ve la demo deja de servir: las funciones con «cancel» en el
 *   nombre devuelven true y todas las demás lanzan un error, así la demo se corta en su próximo paso
 *   y no vuelve a mover nada ni a hablar.
 *
 * Para demos escritas dentro de script.js (sin api): `var c = PedniaOmitirDemo.mostrar(alOmitir)`,
 * `c.omitida()`, `c.esperar(promesa)` y `c.ocultar()`.
 */
(function (global) {
    "use strict";

    var doc = global.document;
    var actual = null;

    function estilos() {
        if (doc.getElementById("omitir-demo-estilos")) return;
        var st = doc.createElement("style");
        st.id = "omitir-demo-estilos";
        // Mismo aspecto y lugar que el «Omitir» de la intro 3D (#btn-omitir-intro3d): amarillo, arriba a la izquierda.
        st.textContent =
            "#btn-omitir-demo{position:fixed;top:18px;left:18px;z-index:1700;display:inline-flex;align-items:center;" +
            "gap:.35em;width:auto;margin:0;padding:6pt 10pt;border:1px solid #ffc107;border-radius:8pt;" +
            "background:#ffc107;color:#000;font:400 24px/1.5 Fredoka,'Arial Rounded MT Bold',Arial,sans-serif;" +
            "cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
            "animation:omitirDemoEntra .3s ease-out both;transition:background-color .15s,scale .1s}" +
            "#btn-omitir-demo:hover{background:#ffca2c;border-color:#ffc720}" +
            "#btn-omitir-demo:active{scale:.96}" +
            "#btn-omitir-demo:focus-visible{outline:4px solid rgba(255,193,7,.5);outline-offset:2px}" +
            "#btn-omitir-demo .omitir-demo-icono{display:inline-flex}" +
            "#btn-omitir-demo .omitir-demo-icono svg{width:.8em;height:.8em;fill:currentColor}" +
            "@keyframes omitirDemoEntra{from{opacity:0}to{opacity:1}}" +
            "@media (prefers-reduced-motion:reduce){#btn-omitir-demo{animation:none}}" +
            "body.demo-omitida .demo-dedo,body.demo-omitida #mano-demo{display:none!important}";
        (doc.head || doc.documentElement).appendChild(st);
    }

    function crearBoton(alClick) {
        estilos();
        var b = doc.createElement("button");
        b.type = "button";
        b.id = "btn-omitir-demo";
        b.setAttribute("aria-label", "Omitir demostración");
        b.innerHTML =
            '<span class="omitir-demo-texto">Omitir</span>' +
            '<span class="omitir-demo-icono" aria-hidden="true"><svg viewBox="0 0 24 24">' +
            '<path d="M4 5.5v13l9-6.5zM13 5.5v13l9-6.5z"/></svg></span>';
        var tocado = false;
        var accion = function (ev) {
            if (ev) { ev.preventDefault(); ev.stopPropagation(); }
            if (tocado) return;
            tocado = true;
            alClick();
        };
        b.addEventListener("click", accion);
        b.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
        (doc.body || doc.documentElement).appendChild(b);
        colocar(b);
        return b;
    }

    /*
     * Lugares posibles, en orden: el de la intro 3D primero. Se usa el primero que no tape nada del juego
     * (en algunos juegos arriba a la izquierda está el enunciado).
     */
    var LUGARES = [
        { top: "18px", left: "18px" },
        { bottom: "18px", left: "50%", transform: "translateX(-50%)" },
        { top: "18px", left: "50%", transform: "translateX(-50%)" },
        { bottom: "18px", left: "18px" }
    ];

    function ponerEn(b, l) {
        b.style.top = l.top || "auto";
        b.style.bottom = l.bottom || "auto";
        b.style.left = l.left || "auto";
        b.style.transform = l.transform || "none";
    }

    function pinta(el, cs) {
        var tag = el.tagName;
        if (tag === "IMG" || tag === "SVG" || tag === "svg" || tag === "CANVAS" || tag === "VIDEO" ||
            tag === "BUTTON" || tag === "INPUT") return true;
        if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
        var bg = cs.backgroundColor;
        if (bg && bg !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(bg)) return true;
        if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") return true;
        for (var n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
        }
        return false;
    }

    function seVe(el) {
        for (var e = el; e && e !== doc.documentElement; e = e.parentElement) {
            var cs = global.getComputedStyle(e);
            if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
        }
        return true;
    }

    /** true si el botón tapa algo del juego que se ve (no cuentan los fondos grandes ni la mano de la demo). */
    function tapaAlgo(b) {
        var r = b.getBoundingClientRect();
        var area = (global.innerWidth || 1) * (global.innerHeight || 1);
        var todos = doc.body ? doc.body.getElementsByTagName("*") : [];
        for (var i = 0; i < todos.length; i++) {
            var el = todos[i];
            if (el === b || b.contains(el) || el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
            var er = el.getBoundingClientRect();
            if (!er.width || !er.height) continue;
            if (er.right <= r.left || er.left >= r.right || er.bottom <= r.top || er.top >= r.bottom) continue;
            if (er.width * er.height > area * 0.35) continue;
            if (el.closest && el.closest(".demo-dedo, #btn-omitir-intro3d")) continue;
            var cs = global.getComputedStyle(el);
            if (!pinta(el, cs) || !seVe(el)) continue;
            return true;
        }
        return false;
    }

    function colocar(b) {
        try {
            for (var i = 0; i < LUGARES.length; i++) {
                ponerEn(b, LUGARES[i]);
                if (!tapaAlgo(b)) break;
                if (i === LUGARES.length - 1) ponerEn(b, LUGARES[0]);
            }
        } catch (e) {
            ponerEn(b, LUGARES[0]);
        }
    }

    function callarYLimpiar() {
        try { if (global.TextoVoz && global.TextoVoz.detener) global.TextoVoz.detener(); } catch (e) { /* noop */ }
        try { if (global.speechSynthesis) global.speechSynthesis.cancel(); } catch (e) { /* noop */ }
        quitarManos();
    }

    function quitarManos() {
        try { if (global.PedniaTutorial && global.PedniaTutorial.quitarManos) global.PedniaTutorial.quitarManos(); } catch (e) { /* noop */ }
        try { doc.querySelectorAll(".demo-dedo").forEach(function (n) { n.remove(); }); } catch (e) { /* noop */ }
    }

    function sinFallar(p) {
        return Promise.resolve(p).then(function () {}, function () {});
    }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    /* Mientras la demo omitida da su último paso no debe volver a sonar ninguna voz. */
    var hablarOriginal = null;
    function silenciar(on) {
        var tv = global.TextoVoz;
        if (!tv) return;
        if (on && !hablarOriginal && typeof tv.hablar === "function") {
            hablarOriginal = tv.hablar;
            tv.hablar = function () { return Promise.resolve(); };
        } else if (!on && hablarOriginal) {
            tv.hablar = hablarOriginal;
            hablarOriginal = null;
        }
    }

    var ESPERA_MAX_MS = 8000;

    /**
     * Botón suelto: devuelve un control con omitida(), esperar(promesa) y ocultar().
     * alOmitir se llama en cuanto se toca el botón (para cortar la demo de la escena, si se puede).
     */
    function mostrar(alOmitir) {
        if (actual) actual.ocultar();
        var omitida = false;
        var avisos = [];
        var boton = null;
        var control = {
            omitida: function () { return omitida; },
            /**
             * Resuelve false cuando `promesa` termina sola. Si se toca el botón, espera (máx. 8 s, con la mano
             * oculta y sin voz) a que la demo dé su último paso y resuelve true: así nada de la demo queda
             * moviéndose cuando el juego sigue. `extra()` puede dar más promesas que esperar en ese momento.
             */
            esperar: function (promesa, extra) {
                var fin = sinFallar(promesa);
                Promise.resolve(promesa).catch(function (err) {
                    if (!omitida) console.warn("[OmitirDemo] la demo falló", err);
                });
                return new Promise(function (resolve) {
                    var listo = false;
                    var salir = function (v) { if (!listo) { listo = true; resolve(v); } };
                    var trasOmitir = function () {
                        var lista = [fin];
                        try { if (extra) lista = lista.concat(extra() || []); } catch (e) { /* noop */ }
                        Promise.race([Promise.all(lista.map(sinFallar)), sleep(ESPERA_MAX_MS)])
                            .then(function () { salir(true); });
                    };
                    if (omitida) { trasOmitir(); return; }
                    avisos.push(trasOmitir);
                    fin.then(function () { if (!omitida) salir(false); });
                });
            },
            ocultar: function () {
                if (boton) { boton.remove(); boton = null; }
                if (actual === control) actual = null;
                if (omitida) {
                    quitarManos();
                    silenciar(false);
                    if (doc.body) doc.body.classList.remove("demo-omitida");
                }
            }
        };
        boton = crearBoton(function () {
            omitida = true;
            if (boton) { boton.remove(); boton = null; }
            // mientras la demo termina su paso la mano queda oculta (la escena podría volver a ponerla)
            if (doc.body) doc.body.classList.add("demo-omitida");
            callarYLimpiar();
            silenciar(true);
            try { if (typeof alOmitir === "function") alOmitir(); } catch (e) { console.warn("[OmitirDemo] alOmitir", e); }
            avisos.splice(0).forEach(function (f) { f(); });
        });
        actual = control;
        return control;
    }

    function ErrorOmitida() {
        var e = new Error("demo omitida");
        e.omitida = true;
        return e;
    }

    var ES_VOZ = /decir|hablar|habla|voz|narra/i;

    /**
     * Envuelve el api de la demo: tras omitir, cancelado() → true y lo demás lanza.
     * `enCurso` guarda las promesas que devolvió el api y aún no terminan (menos las de voz).
     */
    function envolverApi(api, control, enCurso) {
        if (!api || typeof api !== "object" || typeof Proxy !== "function") return api;
        return new Proxy(api, {
            get: function (obj, clave, recv) {
                var v = Reflect.get(obj, clave, recv);
                if (typeof v !== "function") return v;
                return function () {
                    if (control.omitida()) {
                        if (/cancel/i.test(String(clave))) return true;
                        throw ErrorOmitida();
                    }
                    var r = v.apply(obj, arguments);
                    if (enCurso && r && typeof r.then === "function" && !ES_VOZ.test(String(clave))) {
                        enCurso.add(r);
                        var fuera = function () { enCurso.delete(r); };
                        r.then(fuera, fuera);
                    }
                    return r;
                };
            }
        });
    }

    /**
     * Corre `fn(api)` con el botón a la vista. Resuelve true si se omitió, false si terminó sola.
     *
     * Al omitir: la voz y la mano se quitan al instante; luego se espera (máx. 8 s) a que la demo y
     * el paso del api que estaba en marcha terminen, para que nada de la demo siga moviéndose en la
     * partida; después se llama la limpieza (`opciones.alOmitir` o `api.terminar`) y se resuelve.
     */
    function correr(fn, api, opciones) {
        var o = opciones || {};
        var limpiar = o.alOmitir;
        if (typeof limpiar !== "function" && api && typeof api.terminar === "function") {
            limpiar = function () { return api.terminar(); };
        }
        var enCurso = new Set();
        var control = mostrar(null);
        var envuelta = envolverApi(api, control, enCurso);
        var tarea;
        try {
            tarea = Promise.resolve(fn(envuelta));
        } catch (e) {
            tarea = Promise.reject(e);
        }
        var pendientes = function () { return Array.from(enCurso); };
        return control.esperar(tarea, pendientes).then(function (omitida) {
            if (!omitida) { control.ocultar(); return false; }
            callarYLimpiar();
            var r;
            try { r = limpiar && limpiar(); } catch (e) { console.warn("[OmitirDemo] limpieza", e); }
            return Promise.race([sinFallar(r), sleep(3000)]).then(function () {
                control.ocultar();
                return true;
            });
        });
    }

    global.PedniaOmitirDemo = {
        correr: correr,
        mostrar: mostrar,
        envolverApi: envolverApi,
        /**
         * Para demos escritas en script.js: muestra el botón mientras `promesa` corre y lo quita al final.
         * Resuelve true si se omitió (tras esperar el último paso de la demo, máx. 8 s).
         */
        esperar: function (promesa, alOmitir) {
            var c = mostrar(alOmitir);
            return c.esperar(promesa).then(function (omitida) { c.ocultar(); return omitida; });
        },
        /** true mientras el botón está a la vista. */
        activo: function () { return !!actual; },
        ocultar: function () { if (actual) actual.ocultar(); }
    };
})(window);
