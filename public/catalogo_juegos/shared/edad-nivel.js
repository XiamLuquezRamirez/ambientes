/**
 * PedniaEdad — edad de partida: SuperAdmin (preview) elige; kiosco usa BD.
 * Fuentes (en orden): __PEDNIA_PERFIL__, padre, #kiosco-perfil-params del padre, ?edad=
 */
(function (global) {
    "use strict";

    function safeParseJson(text) {
        try {
            return JSON.parse(text || "null");
        } catch (e) {
            return null;
        }
    }

    function perfilDesdeDom(doc) {
        if (!doc) return null;
        try {
            const el = doc.getElementById("kiosco-perfil-params")
                || doc.getElementById("cj-perfil-payload");
            if (!el) return null;
            const p = safeParseJson(el.textContent);
            return p && typeof p === "object" ? p : null;
        } catch (e) {
            return null;
        }
    }

    function perfilDesdeParent() {
        try {
            if (!global.parent || global.parent === global) return null;
            if (global.parent.__PEDNIA_PERFIL__ && typeof global.parent.__PEDNIA_PERFIL__ === "object") {
                return global.parent.__PEDNIA_PERFIL__;
            }
            return perfilDesdeDom(global.parent.document);
        } catch (e) {
            return null;
        }
    }

    function perfil() {
        const local = global.__PEDNIA_PERFIL__;
        if (local && typeof local === "object") return local;
        return perfilDesdeParent() || perfilDesdeDom(global.document);
    }

    function edadDesdeQuery() {
        try {
            const search = (global.location && global.location.search) || "";
            let raw = null;
            if (typeof URLSearchParams !== "undefined") {
                raw = new URLSearchParams(search).get("edad");
            } else {
                const m = /(?:^\?|&)edad=([^&]*)/.exec(search);
                raw = m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
            }
            if (raw == null || raw === "") return null;
            const n = parseInt(String(raw), 10);
            return isFinite(n) ? n : null;
        } catch (e) {
            return null;
        }
    }

    function parseEdad(valor) {
        if (valor == null || valor === "") return null;
        const n = parseInt(String(valor), 10);
        return isFinite(n) ? n : null;
    }

    function esPreviewCatalogo() {
        const p = perfil();
        return !!(p && p.fuente === "preview_superadmin");
    }

    function edadSesion() {
        const p = perfil();
        const desdePerfil = parseEdad(p && p.edad);
        if (desdePerfil != null) return desdePerfil;
        return edadDesdeQuery();
    }

    function porEtiquetaEdad(lista, pred) {
        return lista.find(function (n) {
            return pred(String(n.edad || "").toLowerCase());
        });
    }

    /**
     * Resuelve un nivel desde edad numérica, etiqueta o id.
     * Buckets por etiqueta: ≤3 → "3 años", 4 → "4 años", ≥5 → "5-6 años".
     * (Los id de nivel pueden ser conteos de piezas, no la edad.)
     */
    function resolverNivel(niveles, edad) {
        const lista = Array.isArray(niveles) ? niveles : [];
        if (!lista.length) return null;

        const raw = edad == null ? "" : String(edad).trim().toLowerCase();
        if (!raw) {
            return porEtiquetaEdad(lista, function (e) { return e.indexOf("3") === 0; })
                || lista[0];
        }

        const porEtiqueta = lista.find(function (n) {
            return String(n.edad || "").toLowerCase() === raw;
        });
        if (porEtiqueta) return porEtiqueta;

        // Edad numérica → buckets por etiqueta (los id pueden ser # de piezas, no la edad).
        const num = parseInt(raw, 10);
        if (isFinite(num) && String(num) === raw.replace(/\s+/g, "")) {
            if (num <= 3) {
                return porEtiquetaEdad(lista, function (e) { return e.indexOf("3") === 0; })
                    || lista.find(function (n) { return String(n.id) === "3"; })
                    || lista[0];
            }
            if (num === 4) {
                return porEtiquetaEdad(lista, function (e) { return e.indexOf("4") === 0; })
                    || lista.find(function (n) { return String(n.id) === "4"; })
                    || lista[0];
            }
            return porEtiquetaEdad(lista, function (e) {
                return e.indexOf("5") === 0 || e.indexOf("6") !== -1;
            })
                || lista.find(function (n) { return String(n.id) === "5"; })
                || lista[lista.length - 1];
        }

        const porId = lista.find(function (n) { return String(n.id) === raw; });
        if (porId) return porId;

        return lista[0];
    }

    /**
     * @param {{ niveles: Array, onElegido: function, elegirManual: function }} opts
     */
    function iniciarNivel(opts) {
        const opciones = opts || {};
        const niveles = opciones.niveles || [];
        const onElegido = typeof opciones.onElegido === "function" ? opciones.onElegido : function () {};
        const elegirManual = typeof opciones.elegirManual === "function" ? opciones.elegirManual : null;

        if (esPreviewCatalogo()) {
            if (elegirManual) {
                elegirManual();
                return;
            }
        }

        const edad = edadSesion();
        if (edad == null) {
            console.warn("[PedniaEdad] Sin edad de sesión; usando nivel 3 años");
        }
        onElegido(resolverNivel(niveles, edad == null ? 3 : edad));
    }

    global.PedniaEdad = {
        perfil: perfil,
        esPreviewCatalogo: esPreviewCatalogo,
        edadSesion: edadSesion,
        resolverNivel: resolverNivel,
        iniciarNivel: iniciarNivel,
    };
})(typeof window !== "undefined" ? window : this);
