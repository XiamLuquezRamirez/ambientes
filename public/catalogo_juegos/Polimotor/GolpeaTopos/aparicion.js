/**
 * Aparicion — saca topos de los agujeros durante la partida (window.Aparicion).
 *
 * Corre con el reloj de la escena Phaser (evento "update"): si la escena no avanza no salen topos
 * nuevos ni se esconden los que están afuera, y si la pestaña se oculta tampoco avanza.
 * Qué imagen y qué agujero lo decide ReglasTopos (puro); este módulo solo lleva los tiempos:
 *   - cada `intervaloMs` sale un topo nuevo si hay menos de `simultaneos` afuera;
 *   - cada topo se queda `visibleMs` y luego vuelve a su agujero sin castigo (onEscapo);
 *   - al tocar un topo visible decide acierto o error por la categoría de la imagen (onAcierto / onError).
 *
 * API: iniciar(cfg, { onAcierto, onError, onEscapo, aciertos }) · arrancar() · detener() · activo()
 *      golpe(hoyoId) → "acierto" | "error" | null · estadoActual()
 */
(function (global) {
    "use strict";

    var R = function () { return global.ReglasTopos; };
    var T = function () { return global.Topos; };
    var E = function () { return global.EscenarioTopos; };

    var cfg = null;
    var cb = {};
    var corriendo = false;
    var enganchado = false;
    var reloj = 0;
    var proximo = 0;
    var azar = Math.random;
    var memoria = { ultima: null, ultimoHoyo: null, distractoresSeguidos: 0 };
    var vencen = {};   // hoyoId → reloj en que se esconde

    function iniciar(config, callbacks) {
        cfg = config;
        cb = callbacks || {};
        if (typeof cb.semilla === "number") azar = R().crearAzar(cb.semilla);
        if (!enganchado && E() && E().escena()) {
            E().escena().events.on("update", paso);
            enganchado = true;
        }
    }

    function aciertos() {
        return typeof cb.aciertos === "function" ? cb.aciertos() : 0;
    }

    function arrancar() {
        corriendo = true;
        reloj = 0;
        proximo = 500;
        vencen = {};
        memoria = { ultima: null, ultimoHoyo: null, distractoresSeguidos: 0 };
    }

    function detener() {
        corriendo = false;
        vencen = {};
    }

    function afuera() {
        return T().visibles();
    }

    function sacar() {
        var e = R().etapa(cfg, aciertos());
        var vis = afuera();
        if (vis.length >= e.simultaneos) return false;
        var hoyo = R().elegirAgujero(cfg, vis.map(function (v) { return v.hoyo; }), memoria.ultimoHoyo, azar);
        if (!hoyo) return false;
        var imagen = R().elegirImagen(cfg, {
            aciertos: aciertos(),
            distractoresSeguidos: memoria.distractoresSeguidos,
            ultima: memoria.ultima,
            enPantalla: vis.map(function (v) { return v.imagen; }).filter(Boolean)
        }, azar);
        if (!imagen) return false;
        memoria.ultima = imagen;
        memoria.ultimoHoyo = hoyo;
        memoria.distractoresSeguidos = R().esParteCuerpo(cfg, imagen) ? 0 : memoria.distractoresSeguidos + 1;
        // el tiempo afuera empieza a contar cuando ya se ve el globo (≈ 0,6 s después)
        vencen[hoyo] = reloj + e.visibleMs + 600;
        T().salir(hoyo, imagen);
        if (typeof cb.onSale === "function") cb.onSale(hoyo, imagen);
        return true;
    }

    function paso(time, delta) {
        if (!corriendo) return;
        reloj += Math.min(delta || 16, 100);
        // los que ya cumplieron su tiempo vuelven al agujero (sin castigo)
        Object.keys(vencen).forEach(function (h) {
            if (reloj < vencen[h]) return;
            delete vencen[h];
            var est = T().estado(h);
            if (est === "visible" || est === "apareciendo") {
                var r = E().hoyo(h);
                var imagen = r ? r.imagen : null;
                T().esconder(h);
                if (typeof cb.onEscapo === "function") cb.onEscapo(h, imagen);
            }
        });
        if (reloj >= proximo) {
            var e = R().etapa(cfg, aciertos());
            var salio = sacar();
            proximo = reloj + (salio ? e.intervaloMs : 250);
        }
    }

    /** El niño tocó el agujero: solo cuenta si el topo está afuera con su globo. */
    function golpe(hoyoId) {
        if (!corriendo) return null;
        if (T().estado(hoyoId) !== "visible") return null;
        var r = E().hoyo(hoyoId);
        var imagen = r ? r.imagen : null;
        delete vencen[hoyoId];
        var res = R().evaluarGolpe(cfg, imagen);
        if (res === "acierto") {
            T().golpeAcierto(hoyoId);
            if (typeof cb.onAcierto === "function") cb.onAcierto(hoyoId, imagen);
            // tras un acierto el siguiente topo sale un poco antes (la colina no se queda vacía)
            proximo = Math.min(proximo, reloj + 450);
            return "acierto";
        }
        if (res === "error") {
            T().golpeError(hoyoId);
            if (typeof cb.onError === "function") cb.onError(hoyoId, imagen);
            return "error";
        }
        return null;
    }

    global.Aparicion = {
        iniciar: iniciar,
        arrancar: arrancar,
        detener: detener,
        golpe: golpe,
        activo: function () { return corriendo; },
        estadoActual: function () { return { reloj: reloj, proximo: proximo, memoria: Object.assign({}, memoria), vencen: Object.assign({}, vencen) }; }
    };
})(window);
