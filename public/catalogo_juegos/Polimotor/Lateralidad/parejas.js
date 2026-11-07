/**
 * LateralidadParejas — nivel 3: "¿Quién está al lado?".
 *
 * Una fila de amigos en una banca. La consigna señala a uno de ellos y
 * pregunta quién está a su derecha o a su izquierda; el niño toca a ese
 * compañero. La referencia es otro objeto de la fila, no la pantalla, así
 * que entrena la lateralidad relativa sin pedir que el niño se imagine
 * girado, que era lo confuso del espejo.
 */
(function (global) {
    "use strict";

    function reducirMovimiento() {
        return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    function crear(clase, padre) {
        const d = document.createElement("div");
        d.className = clase;
        if (padre) padre.appendChild(d);
        return d;
    }

    /**
     * Monta la fila de amigos sobre la banca.
     * cfg: { orden:[ids], ancla, api:{imgUrl,nombreObj} }
     */
    function llenarFila(fila, cfg) {
        const porId = {};
        fila.innerHTML = "";
        (cfg.orden || []).forEach(function (id, i) {
            const puesto = crear("parejas-puesto", fila);
            puesto.dataset.objeto = id;
            puesto.style.setProperty("--i", i);

            const carta = crear("parejas-carta", puesto);
            if (cfg.api && cfg.api.imgUrl) {
                const img = document.createElement("img");
                img.src = cfg.api.imgUrl(id);
                img.alt = cfg.api.nombreObj ? cfg.api.nombreObj(id) : "";
                img.draggable = false;
                carta.appendChild(img);
            }

            /* El de referencia lleva una marca para que se distinga. */
            if (id === cfg.ancla) {
                puesto.classList.add("es-ancla");
                const flecha = crear("parejas-marca", puesto);
                flecha.textContent = "★";
            }

            porId[id] = puesto;
        });
        return porId;
    }

    function montar(host, cfg) {
        host.innerHTML = "";
        host.className = "tablero parejas";

        const escena = crear("parejas-escena", host);
        const fila = crear("parejas-fila", escena);
        const porId = llenarFila(fila, cfg);
        crear("parejas-banca", escena);

        return { host: host, fila: fila, puestos: porId, ancla: cfg.ancla };
    }

    /** Otra fila en la misma banca. Hay que volver a enganchar los toques. */
    function renovar(escena, cfg) {
        if (!escena || !escena.fila || !escena.fila.isConnected) return false;
        escena.puestos = llenarFila(escena.fila, cfg);
        escena.ancla = cfg.ancla;
        escena.activo = false;
        return true;
    }

    /** Los compañeros (menos el de referencia) se vuelven tocables. */
    function esperarEleccion(escena, onPick) {
        escena.activo = true;
        Object.keys(escena.puestos).forEach(function (id) {
            if (id === escena.ancla) return;
            const puesto = escena.puestos[id];
            puesto.classList.add("elegible");
            puesto.setAttribute("role", "button");
            puesto.tabIndex = 0;
            const elegir = function (ev) {
                ev.preventDefault();
                if (!escena.activo) return;
                onPick(id);
            };
            puesto.addEventListener("click", elegir);
            puesto.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") elegir(ev);
            });
        });
    }

    function congelar(escena) {
        escena.activo = false;
        Object.keys(escena.puestos).forEach(function (id) {
            escena.puestos[id].classList.remove("elegible");
        });
    }

    function reactivar(escena) {
        escena.activo = true;
        Object.keys(escena.puestos).forEach(function (id) {
            if (id !== escena.ancla) escena.puestos[id].classList.add("elegible");
        });
    }

    /** El elegido salta y se enlaza con el de referencia. */
    function acertar(escena, id) {
        const puesto = escena.puestos[id];
        if (puesto) puesto.classList.add("ok");
        const ancla = escena.puestos[escena.ancla];
        if (ancla) ancla.classList.add("ok-ancla");
        return sleep(reducirMovimiento() ? 100 : 560);
    }

    /** El equivocado se sacude y vuelve a su sitio. */
    function fallar(escena, id) {
        const puesto = escena.puestos[id];
        if (puesto) {
            puesto.classList.add("mal");
            setTimeout(function () { puesto.classList.remove("mal"); }, 600);
        }
        return sleep(reducirMovimiento() ? 100 : 620);
    }

    global.LateralidadParejas = {
        montar: montar,
        renovar: renovar,
        esperarEleccion: esperarEleccion,
        congelar: congelar,
        reactivar: reactivar,
        acertar: acertar,
        fallar: fallar
    };
})(typeof window !== "undefined" ? window : this);
