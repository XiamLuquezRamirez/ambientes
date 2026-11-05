/**
 * Validador de posiciones, independiente del generador (spec §4): comprueba
 * una distribución ya hecha sin saber cómo se construyó. Así el generador
 * puede cambiar de algoritmo y las reglas siguen siendo las mismas.
 */
(function (global) {
    "use strict";

    /** Radio visual de la estrella y de su número, en px de la resolución base. */
    var RADIO_ESTRELLA = 34;
    /** Holgura táctil: el dedo de un niño de 5 años tapa bastante más que el icono. */
    var RADIO_TACTIL = 48;

    function distancia(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * @param {{x:number,y:number}[]} puntos
     * @param {{x:number,y:number,ancho:number,alto:number}} area zona jugable
     * @param {number} separacion mínima entre centros
     * @param {{x:number,y:number,ancho:number,alto:number}[]} [vetadas] zonas de UI
     * @returns {{ok:boolean, fallos:string[]}}
     */
    function revisar(puntos, area, separacion, vetadas) {
        var fallos = [];
        var lista = puntos || [];
        var zonas = vetadas || [];
        var i, j, d;

        if (!lista.length) fallos.push("sin-puntos");

        for (i = 0; i < lista.length; i++) {
            var p = lista[i];
            if (!p || !isFinite(p.x) || !isFinite(p.y)) {
                fallos.push("punto-invalido:" + i);
                continue;
            }
            /* Dentro del área con el radio táctil completo: si el borde corta la
               estrella, el niño no puede tocarla entera. */
            if (p.x - RADIO_TACTIL < area.x ||
                p.x + RADIO_TACTIL > area.x + area.ancho ||
                p.y - RADIO_TACTIL < area.y ||
                p.y + RADIO_TACTIL > area.y + area.alto) {
                fallos.push("fuera-de-area:" + i);
            }
            for (j = 0; j < zonas.length; j++) {
                var z = zonas[j];
                if (p.x + RADIO_TACTIL > z.x && p.x - RADIO_TACTIL < z.x + z.ancho &&
                    p.y + RADIO_TACTIL > z.y && p.y - RADIO_TACTIL < z.y + z.alto) {
                    fallos.push("sobre-ui:" + i);
                }
            }
        }

        for (i = 0; i < lista.length; i++) {
            for (j = i + 1; j < lista.length; j++) {
                d = distancia(lista[i], lista[j]);
                /* Dos comprobaciones distintas a propósito: la separación pedida
                   es de diseño (que se vea aireado) y puede bajar por nivel; el
                   solape de discos táctiles no se negocia en ningún nivel. */
                if (d < separacion) fallos.push("muy-cerca:" + i + "-" + j);
                if (d < RADIO_TACTIL * 2) fallos.push("solapadas:" + i + "-" + j);
            }
        }

        return { ok: fallos.length === 0, fallos: fallos };
    }

    global.ConstelacionValidador = {
        RADIO_ESTRELLA: RADIO_ESTRELLA,
        RADIO_TACTIL: RADIO_TACTIL,
        distancia: distancia,
        revisar: revisar
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ConstelacionValidador;
})(typeof window !== "undefined" ? window : globalThis);
