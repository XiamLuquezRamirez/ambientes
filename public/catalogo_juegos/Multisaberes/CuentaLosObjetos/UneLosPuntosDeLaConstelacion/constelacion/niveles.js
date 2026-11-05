/**
 * Datos de los 5 niveles. Solo configuración: la mecánica es la misma para
 * todos y vive en las escenas, así que añadir un nivel es añadir una entrada.
 */
(function (global) {
    "use strict";

    /**
     * `separacion` es la distancia mínima entre centros de estrella, en px de
     * la resolución base. Baja al crecer el número de estrellas: con 15 no cabe
     * la holgura que sí cabe con 4, y aun así nunca se solapan porque el radio
     * de la estrella es 34.
     */
    var NIVELES = [
        {
            id: 1,
            estrellas: 4,
            separacion: 300,
            titulo: "NIVEL 1: LA SEÑAL PERDIDA",
            planeta: { nombre: "Azulón", color: "#38bdf8" },
            cielo: { alto: "#132a6b", bajo: "#050b24" },
            nebulosa: { a: "#1d4ed8", b: "#6d28d9" }
        },
        {
            id: 2,
            estrellas: 5,
            separacion: 265,
            titulo: "NIVEL 2: EL RASTRO DE POLVO",
            planeta: { nombre: "Rojizo", color: "#f87171" },
            cielo: { alto: "#6b2213", bajo: "#1a0705" },
            nebulosa: { a: "#b91c1c", b: "#c2410c" }
        },
        {
            id: 3,
            estrellas: 7,
            separacion: 225,
            titulo: "NIVEL 3: EL ANILLO DE HIELO",
            planeta: { nombre: "Glacial", color: "#22d3ee" },
            cielo: { alto: "#0b5a74", bajo: "#03161f" },
            nebulosa: { a: "#0891b2", b: "#1d4ed8" }
        },
        {
            id: 4,
            estrellas: 10,
            separacion: 185,
            titulo: "NIVEL 4: LA NUBE DORADA",
            planeta: { nombre: "Solaris", color: "#fbbf24" },
            cielo: { alto: "#6b3d10", bajo: "#1a0e03" },
            nebulosa: { a: "#b45309", b: "#a16207" }
        },
        {
            id: 5,
            estrellas: 15,
            separacion: 150,
            titulo: "NIVEL 5: LA GRAN CONSTELACIÓN",
            planeta: { nombre: "Violeta", color: "#a855f7" },
            cielo: { alto: "#4c1d95", bajo: "#140331" },
            nebulosa: { a: "#7e22ce", b: "#a21caf" }
        }
    ];

    function total() { return NIVELES.length; }

    function porIndice(i) { return NIVELES[i] || null; }

    function porId(id) {
        for (var i = 0; i < NIVELES.length; i++) {
            if (NIVELES[i].id === Number(id)) return NIVELES[i];
        }
        return null;
    }

    global.ConstelacionNiveles = {
        NIVELES: NIVELES,
        total: total,
        porIndice: porIndice,
        porId: porId
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ConstelacionNiveles;
})(typeof window !== "undefined" ? window : globalThis);
