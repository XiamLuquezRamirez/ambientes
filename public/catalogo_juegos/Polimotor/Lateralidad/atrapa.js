/**
 * LateralidadAtrapa — nivel 2: "Atrapa en el Aire".
 *
 * Un objeto cae desde uno de los lados y el niño mueve la cesta a ese lado
 * para atraparlo. Refuerza la lateralidad dinámica: hay que leer de dónde
 * viene el movimiento y responder con una acción, no con una etiqueta.
 */
(function (global) {
    "use strict";

    const ETIQUETA = { izquierda: "Izquierda", centro: "Centro", derecha: "Derecha" };
    const ORDEN = ["izquierda", "centro", "derecha"];

    function ordenar(zonas) {
        return ORDEN.filter(function (z) { return (zonas || []).indexOf(z) >= 0; });
    }

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

    /** Posición horizontal de cada carril, en porcentaje del cielo. */
    function pct(zona, zonas) {
        const i = zonas.indexOf(zona);
        if (i < 0) return 50;
        return ((i + 0.5) / zonas.length) * 100;
    }

    /**
     * La cesta nace en el centro. Si lo que cae también es el centro, no hay
     * nada que mover: arranca en un lado, al azar, y hay que llevarla allá.
     */
    function partidaDe(origen, zonas) {
        if (origen !== "centro") return "centro";
        const lados = (zonas || []).filter(function (z) { return z !== "centro"; });
        if (!lados.length) return "centro";
        return lados[Math.floor(Math.random() * lados.length)];
    }

    /**
     * Monta el cielo con sus carriles, la cesta abajo y el objeto que caerá.
     * cfg: { zonas, objeto, origen, api:{imgUrl,nombreObj} }
     */
    function montar(host, cfg) {
        const zonas = ordenar(cfg.zonas);
        host.innerHTML = "";
        host.className = "tablero atrapa";

        const cielo = crear("atrapa-cielo", host);

        /* Un tubo por zona. Solo se ve el nombre del lado: lo que cae es
           sorpresa hasta que el niño elige. */
        const carriles = {};
        zonas.forEach(function (z) {
            const carril = crear("atrapa-carril " + z, cielo);
            carril.dataset.zona = z;
            crear("atrapa-boca", carril);
            const cartel = crear("atrapa-cartel", carril);
            cartel.textContent = ETIQUETA[z] || z;
            carriles[z] = carril;
        });

        /* El objeto espera oculto; aparece al caer por el tubo elegido. */
        const cayendo = crear("atrapa-objeto", cielo);
        if (cfg.objeto && cfg.api && cfg.api.imgUrl) {
            const img = document.createElement("img");
            img.src = cfg.api.imgUrl(cfg.objeto);
            img.alt = cfg.api.nombreObj ? cfg.api.nombreObj(cfg.objeto) : "";
            img.draggable = false;
            cayendo.appendChild(img);
        }
        cayendo.style.left = pct(cfg.origen, zonas) + "%";

        /* Si el tubo correcto es el del centro, la cesta no puede nacer ahí. */
        const suelo = crear("atrapa-suelo", host);
        const cesta = crear("atrapa-cesta", suelo);
        crear("atrapa-cesta-boca", cesta);
        crear("atrapa-cesta-cuerpo", cesta);
        const partida = partidaDe(cfg.origen, zonas);
        cesta.style.left = pct(partida, zonas) + "%";

        return {
            host: host, cielo: cielo, suelo: suelo,
            cesta: cesta, objeto: cayendo,
            carriles: carriles, zonas: zonas,
            origen: cfg.origen,
            partida: partida
        };
    }

    /** El tubo de origen se ilumina: por ahí va a caer algo. */
    function anunciar(escena) {
        const carril = escena.carriles[escena.origen];
        if (carril) carril.classList.add("activo");
        return sleep(reducirMovimiento() ? 100 : 500);
    }

    /** Los carriles se vuelven tocables; resuelve con la zona elegida. */
    function esperarEleccion(escena, onPick) {
        escena.activo = true;
        escena.zonas.forEach(function (z) {
            const carril = escena.carriles[z];
            carril.classList.add("elegible");
            carril.setAttribute("role", "button");
            carril.tabIndex = 0;
            const elegir = function (ev) {
                ev.preventDefault();
                if (!escena.activo) return;
                onPick(z);
            };
            carril.addEventListener("click", elegir);
            carril.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") elegir(ev);
            });
        });
    }

    function congelar(escena) {
        escena.activo = false;
        escena.zonas.forEach(function (z) {
            escena.carriles[z].classList.remove("elegible");
        });
    }

    function reactivar(escena) {
        escena.activo = true;
        escena.zonas.forEach(function (z) {
            escena.carriles[z].classList.add("elegible");
        });
    }

    /** La cesta se desliza al carril elegido. */
    function moverCesta(escena, zona) {
        escena.cesta.style.left = pct(zona, escena.zonas) + "%";
        return sleep(reducirMovimiento() ? 100 : 420);
    }

    /** Sacude la escena, como una cámara que acusa el golpe. */
    function sacudir(escena, fuerte) {
        if (reducirMovimiento()) return;
        const host = escena.host;
        host.classList.remove("sacude", "sacude-fuerte");
        void host.offsetWidth;
        host.classList.add(fuerte ? "sacude-fuerte" : "sacude");
        setTimeout(function () {
            host.classList.remove("sacude", "sacude-fuerte");
        }, 600);
    }

    /**
     * El objeto cae por el tubo que el niño eligió. Si es el correcto, la
     * cesta lo recibe; si no, se estrella contra el suelo.
     */
    function caer(escena, zona, ok) {
        const o = escena.objeto;
        o.style.left = pct(zona, escena.zonas) + "%";
        o.classList.add("asomando");
        return sleep(reducirMovimiento() ? 60 : 260).then(function () {
            o.classList.add("cayendo");
            return sleep(reducirMovimiento() ? 100 : 620);
        }).then(function () {
            if (ok) {
                o.classList.add("atrapado");
                escena.cesta.classList.add("recibe");
                sacudir(escena, false);
                return sleep(reducirMovimiento() ? 100 : 520).then(function () {
                    escena.cesta.classList.remove("recibe");
                });
            }
            o.classList.add("al-suelo");
            sacudir(escena, true);
            return sleep(reducirMovimiento() ? 120 : 640).then(function () {
                o.classList.remove("al-suelo", "cayendo", "asomando");
                escena.cesta.style.left = pct(escena.partida || "centro", escena.zonas) + "%";
                return sleep(reducirMovimiento() ? 60 : 280);
            });
        });
    }

    /**
     * Otra ronda en el mismo cielo: cambian el tubo y la cesta, no el escenario.
     * Devuelve una promesa; false si hay que montar de cero.
     */
    function renovar(escena, cfg) {
        if (!escena || !escena.cesta || !escena.cesta.isConnected) return false;
        const zonas = ordenar(cfg.zonas);
        if (!zonas.length || zonas.join(",") !== (escena.zonas || []).join(",")) return false;

        escena.origen = cfg.origen;
        let img = escena.objeto.querySelector("img");
        if (cfg.objeto && cfg.api && cfg.api.imgUrl) {
            if (!img) {
                img = document.createElement("img");
                img.draggable = false;
                escena.objeto.appendChild(img);
            }
            img.src = cfg.api.imgUrl(cfg.objeto);
            img.alt = cfg.api.nombreObj ? cfg.api.nombreObj(cfg.objeto) : "";
        }
        escena.objeto.classList.remove("asomando", "cayendo", "atrapado", "al-suelo");
        escena.objeto.style.left = pct(cfg.origen, zonas) + "%";
        escena.zonas.forEach(function (z) {
            escena.carriles[z].classList.remove("activo");
        });
        escena.partida = partidaDe(cfg.origen, zonas);
        escena.cesta.classList.remove("recibe");
        escena.cesta.style.left = pct(escena.partida, zonas) + "%";
        return anunciar(escena).then(function () { reactivar(escena); });
    }

    global.LateralidadAtrapa = {
        montar: montar,
        renovar: renovar,
        anunciar: anunciar,
        esperarEleccion: esperarEleccion,
        congelar: congelar,
        reactivar: reactivar,
        moverCesta: moverCesta,
        caer: caer
    };
})(typeof window !== "undefined" ? window : this);
