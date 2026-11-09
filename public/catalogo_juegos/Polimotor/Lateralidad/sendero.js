/**
 * LateralidadSendero — nivel 1: "El Sendero".
 *
 * Unas puertas al final de caminos de colores. El niño elige un lado, el
 * personaje recorre ese camino y la puerta se abre. Si acierta, se lleva lo
 * que buscaba. Si no, igual se ve lo que había detrás (otro objeto) y la
 * puerta se cierra para volver a intentar.
 *
 * El módulo solo dibuja y resuelve el nivel: quién pregunta, la voz y el
 * feedback los pone script.js, que lo invoca con un reto ya instanciado.
 */
(function (global) {
    "use strict";

    const ETIQUETA = { izquierda: "Izquierda", centro: "Centro", derecha: "Derecha" };

    /** Orden visual de las zonas, siempre de izquierda a derecha. */
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

    /* ── Estado del recorrido ─────────────────────────────────── */

    const NS = "http://www.w3.org/2000/svg";

    let estado = null;
    let escenaActiva = null;

    /** Llega hasta aquí sobre la curva: el resto es el umbral de la puerta. */
    /* Se queda en el camino, delante de la puerta, sin tapar el letrero ni el premio. */
    const LLEGADA = 0.72;

    /**
     * Prepara un recorrido de `total` tramos.
     * api: { imgUrl, nombreObj, sonar } lo aporta script.js.
     */
    function iniciar(opciones) {
        estado = {
            total: opciones.total || 3,
            hecho: opciones.hecho || 0,
            recogidos: (estado && estado.recogidos) || [],
            api: opciones.api || {}
        };
        return estado;
    }

    /** Mapa superior con un punto por tramo; marca los ya recorridos. */
    function pintarMapa(host) {
        const mapa = crear("sendero-mapa", host);
        for (let i = 0; i < estado.total; i++) {
            const p = crear("sendero-hito" + (i < estado.hecho ? " hecho" : ""), mapa);
            if (i < estado.hecho) p.textContent = "★";
        }
        return mapa;
    }

    function svgEl(nombre, clase) {
        const el = document.createElementNS(NS, nombre);
        if (clase) el.setAttribute("class", clase);
        return el;
    }

    function puntoCurva(g, t) {
        const u = 1 - t;
        return {
            x: u * u * g.x0 + 2 * u * t * g.cx + t * t * g.x1,
            y: u * u * g.y0 + 2 * u * t * g.cy + t * t * g.y1
        };
    }

    /** Pone los pies del personaje sobre un punto de la pista. */
    function ponerCaminante(escena, x, y) {
        const w = escena.caminante.offsetWidth || 80;
        const h = escena.caminante.offsetHeight || 80;
        escena.caminante.style.transform =
            "translate(" + (x - w / 2).toFixed(1) + "px," + (y - h).toFixed(1) + "px)";
    }

    /** El césped del fondo empieza justo en la base de las torres. */
    function medirSuelo(pista) {
        const base = pista.isConnected && pista.querySelector(".sendero-ramales");
        if (!base) return;
        const b = base.getBoundingClientRect().bottom;
        document.documentElement.style.setProperty("--suelo-sendero", Math.round(b - 2) + "px");
    }

    /**
     * Dibuja los caminos desde la plaza hasta cada puerta. El trazo gordo e
     * invisible es la zona que se puede tocar, no solo la puerta.
     */
    function trazarCaminos(escena) {
        const pista = escena.pista;
        const rect = pista.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 40) return;

        const previo = pista.querySelector(".sendero-caminos");
        if (previo) previo.remove();

        const svg = svgEl("svg", "sendero-caminos");
        svg.setAttribute("viewBox", "0 0 " + rect.width.toFixed(1) + " " + rect.height.toFixed(1));
        svg.setAttribute("aria-hidden", "true");

        const origenX = rect.width / 2;
        const origenY = rect.height - Math.max(28, rect.height * 0.07);
        const ancho = Math.max(26, Math.min(42, rect.width * 0.038));

        medirSuelo(pista);
        /* La entrada animada del reto desplaza la escena un momento. */
        setTimeout(function () { medirSuelo(pista); }, 700);

        escena.geom = {};
        escena.trazos = {};
        escena.hits = {};

        const zonas = Object.keys(escena.ramales);
        ORDEN.forEach(function (z) {
            if (zonas.indexOf(z) < 0) return;
            const puerta = escena.ramales[z].querySelector(".sendero-puerta");
            if (!puerta) return;
            const dr = puerta.getBoundingClientRect();
            const x1 = (dr.left + dr.width / 2) - rect.left;
            const y1 = (dr.bottom - rect.top) + 10;
            const geom = {
                x0: origenX,
                y0: origenY,
                cx: origenX + (x1 - origenX) * 0.12,
                cy: origenY - (origenY - y1) * 0.58,
                x1: x1,
                y1: y1
            };
            escena.geom[z] = geom;
            const d = "M " + geom.x0.toFixed(1) + " " + geom.y0.toFixed(1) +
                " Q " + geom.cx.toFixed(1) + " " + geom.cy.toFixed(1) +
                " " + geom.x1.toFixed(1) + " " + geom.y1.toFixed(1);

            function via(clase, grosor) {
                const p = svgEl("path", clase);
                p.setAttribute("d", d);
                p.setAttribute("fill", "none");
                p.setAttribute("stroke-linecap", "round");
                if (grosor) p.setAttribute("stroke-width", String(grosor));
                svg.appendChild(p);
                return p;
            }

            const borde = via("sendero-borde " + z, ancho + 16);
            const cinta = via("sendero-via " + z, ancho);
            const guia = via("sendero-guia", 5);
            const hit = via("sendero-hit", ancho + 36);
            hit.dataset.zona = z;
            escena.trazos[z] = { borde: borde, via: cinta, guia: guia, hit: hit };
            escena.hits[z] = hit;
        });

        const plaza = svgEl("ellipse", "sendero-plaza");
        plaza.setAttribute("cx", origenX.toFixed(1));
        plaza.setAttribute("cy", origenY.toFixed(1));
        plaza.setAttribute("rx", String(Math.round(ancho * 1.45)));
        plaza.setAttribute("ry", String(Math.round(ancho * 0.58)));
        svg.appendChild(plaza);

        pista.insertBefore(svg, pista.firstChild);
        escena.origen = { x: origenX, y: origenY };

        if (!escena.enRuta) {
            const t = escena.tCamino || 0;
            const z = escena.zonaActual;
            if (z && escena.geom[z] && t > 0.05) {
                const p = puntoCurva(escena.geom[z], t);
                ponerCaminante(escena, p.x, p.y);
            } else {
                ponerCaminante(escena, origenX, origenY);
            }
        }
        if (escena.onPick) enlazarHits(escena);
    }

    function resaltar(escena, zona, on) {
        const ramal = escena.ramales[zona];
        if (ramal) ramal.classList.toggle("resaltado", on);
        const trazo = escena.trazos && escena.trazos[zona];
        if (!trazo) return;
        trazo.borde.classList.toggle("resaltado", on);
        trazo.via.classList.toggle("resaltado", on);
    }

    function enlazarHits(escena) {
        Object.keys(escena.hits || {}).forEach(function (z) {
            const hit = escena.hits[z];
            if (hit.dataset.listo === "1") return;
            hit.dataset.listo = "1";
            hit.style.pointerEvents = escena.activo ? "stroke" : "none";
            const elegir = function (ev) {
                ev.preventDefault();
                if (!escena.activo || !escena.onPick) return;
                escena.onPick(z);
            };
            hit.addEventListener("click", elegir);
            hit.addEventListener("pointerenter", function () {
                if (escena.activo) resaltar(escena, z, true);
            });
            hit.addEventListener("pointerleave", function () {
                resaltar(escena, z, false);
            });
        });
    }

    function aplicarHits(escena, activos) {
        Object.keys(escena.hits || {}).forEach(function (z) {
            escena.hits[z].style.pointerEvents = activos ? "stroke" : "none";
            if (!activos) resaltar(escena, z, false);
        });
    }

    /**
     * Dibuja una bifurcación: un camino de color por lado, con su puerta al
     * final. Lo que guarda cada puerta no se ve hasta abrirla.
     */
    function bifurcacion(host, cfg) {
        if (escenaActiva && escenaActiva.observer) escenaActiva.observer.disconnect();

        const zonas = ordenar(cfg.zonas);
        host.innerHTML = "";
        host.className = "tablero sendero";

        pintarMapa(host);

        const pista = crear("sendero-pista", host);
        const ramales = crear("sendero-ramales", pista);

        const porZona = {};
        zonas.forEach(function (z) {
            const ramal = crear("sendero-ramal " + z, ramales);
            ramal.dataset.zona = z;

            const marco = crear("sendero-marco", ramal);
            crear("sendero-techo", marco);

            /* Una puerta cerrada: lo que guarda se ve solo al abrirla. */
            const puerta = crear("sendero-puerta", marco);
            const hueco = crear("sendero-hueco", puerta);
            const premio = crear("sendero-premio", hueco);
            const id = cfg.premios && cfg.premios[z];
            if (id && estado.api.imgUrl) {
                const img = document.createElement("img");
                img.src = estado.api.imgUrl(id);
                img.alt = estado.api.nombreObj ? estado.api.nombreObj(id) : "";
                img.draggable = false;
                premio.appendChild(img);
                premio.dataset.objeto = id;
            }
            const hoja = crear("sendero-hoja", puerta);
            const bisagraA = crear("sendero-bisagra a", hoja);
            const bisagraB = crear("sendero-bisagra b", hoja);
            bisagraA.setAttribute("aria-hidden", "true");
            bisagraB.setAttribute("aria-hidden", "true");
            crear("sendero-pomo", hoja);
            crear("sendero-felpudo", marco);

            const cartel = crear("sendero-cartel", ramal);
            cartel.textContent = ETIQUETA[z] || z;

            porZona[z] = ramal;
        });

        /* Arranca en la plaza, donde se juntan los caminos. */
        const caminante = crear("sendero-caminante", pista);
        crear("sendero-sombra-pj", caminante);
        const img = document.createElement("img");
        img.className = "sendero-gif";
        img.src = cfg.personajeImg;
        img.alt = "";
        img.draggable = false;
        caminante.appendChild(img);
        if (window.LateralidadPersonaje) {
            window.LateralidadPersonaje.montar(caminante, cfg.personaje || "zeus").then(function () {
                if (caminante.isConnected) caminante.classList.add("tiene-3d");
            }).catch(function () { /* se queda el gif */ });
        }

        const escena = {
            host: host,
            pista: pista,
            ramales: porZona,
            caminante: caminante,
            zonas: zonas,
            geom: {},
            hits: {},
            trazos: {},
            enRuta: false,
            tCamino: 0
        };
        escenaActiva = escena;

        trazarCaminos(escena);
        if (typeof ResizeObserver !== "undefined") {
            escena.observer = new ResizeObserver(function () { trazarCaminos(escena); });
            escena.observer.observe(pista);
        }
        return escena;
    }

    /**
     * Habilita los ramales como botones y espera la elección del niño. Los
     * listeners quedan puestos una sola vez; congelar/reactivar solo cambian
     * si se atienden, para que un fallo pueda reintentarse.
     */
    function esperarEleccion(escena, onPick) {
        escena.activo = true;
        escena.onPick = onPick;
        Object.keys(escena.ramales).forEach(function (z) {
            const ramal = escena.ramales[z];
            ramal.classList.add("elegible");
            ramal.setAttribute("role", "button");
            ramal.tabIndex = 0;
            if (ramal.dataset.listo === "1") return;
            ramal.dataset.listo = "1";
            const elegir = function (ev) {
                ev.preventDefault();
                if (!escena.activo) return;
                onPick(z);
            };
            ramal.addEventListener("click", elegir);
            ramal.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") elegir(ev);
            });
            ramal.addEventListener("pointerenter", function () {
                if (escena.activo) resaltar(escena, z, true);
            });
            ramal.addEventListener("pointerleave", function () {
                resaltar(escena, z, false);
            });
        });
        enlazarHits(escena);
        aplicarHits(escena, true);
    }

    /** Apaga la interacción mientras se resuelve la respuesta. */
    function congelar(escena) {
        escena.activo = false;
        Object.keys(escena.ramales).forEach(function (z) {
            escena.ramales[z].classList.remove("elegible");
            resaltar(escena, z, false);
        });
        aplicarHits(escena, false);
    }

    /** Vuelve a abrir los ramales tras un fallo, para reintentar. */
    function reactivar(escena) {
        escena.activo = true;
        Object.keys(escena.ramales).forEach(function (z) {
            escena.ramales[z].classList.add("elegible");
        });
        aplicarHits(escena, true);
    }

    /**
     * Mira hacia donde va, no hacia el paso de cada frame: el camino sale
     * casi recto y si no, en el centro queda caminando de espaldas.
     */
    function orientar(caminante, geom, haciaPuerta) {
        caminante.classList.remove("mira-izq", "mira-der", "mira-arriba");
        const dx = geom.x1 - geom.x0;
        if (Math.abs(dx) > 36) {
            const aLaIzquierda = haciaPuerta ? dx < 0 : dx > 0;
            caminante.classList.add(aLaIzquierda ? "mira-izq" : "mira-der");
            return;
        }
        if (haciaPuerta) caminante.classList.add("mira-arriba");
    }

    /** Recorre la curva del camino. `desde` y `hasta` van de 0 (plaza) a 1 (puerta). */
    function animarPorCurva(escena, zona, desde, hasta) {
        const geom = escena.geom && escena.geom[zona];
        if (!geom) return Promise.resolve();
        orientar(escena.caminante, geom, hasta > desde);
        if (reducirMovimiento()) {
            const fin = puntoCurva(geom, hasta);
            ponerCaminante(escena, fin.x, fin.y);
            escena.tCamino = hasta;
            return Promise.resolve();
        }
        const dur = 820;
        const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        escena.enRuta = true;
        escena.caminante.classList.add("andando");
        return new Promise(function (resolve) {
            function frame(now) {
                const t = Math.min(1, (now - t0) / dur);
                const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                const u = desde + (hasta - desde) * e;
                const p = puntoCurva(geom, u);
                ponerCaminante(escena, p.x, p.y);
                if (t < 1) {
                    requestAnimationFrame(frame);
                    return;
                }
                escena.enRuta = false;
                escena.tCamino = hasta;
                escena.caminante.classList.remove("andando");
                resolve();
            }
            requestAnimationFrame(frame);
        });
    }

    /** El personaje camina por el camino hasta la puerta elegida y la abre. */
    function caminarA(escena, zona) {
        const ramal = escena.ramales[zona];
        if (!ramal) return Promise.resolve();
        escena.zonaActual = zona;
        return animarPorCurva(escena, zona, escena.tCamino || 0, LLEGADA).then(function () {
            ramal.classList.add("abierta");
            return sleep(reducirMovimiento() ? 80 : 560);
        });
    }

    /**
     * La puerta equivocada ya está abierta: se sostiene el otro objeto el
     * tiempo suficiente para verlo antes de cerrar.
     */
    function mostrarOtro(escena, zona) {
        const ramal = escena.ramales[zona];
        if (ramal) ramal.classList.add("fallo");
        return sleep(reducirMovimiento() ? 180 : 980);
    }

    /** Cierra la puerta y el personaje regresa por el mismo camino a la plaza. */
    function volver(escena, zona) {
        const ramal = escena.ramales[zona];
        if (ramal) ramal.classList.remove("abierta", "fallo", "error");
        return animarPorCurva(escena, zona, escena.tCamino || LLEGADA, 0).then(function () {
            escena.caminante.classList.remove("mira-izq", "mira-der", "mira-arriba");
        });
    }

    /** Premio recogido: sale de la puerta y suma una estrella. */
    function recoger(escena, zona) {
        const ramal = escena.ramales[zona];
        const premio = ramal && ramal.querySelector(".sendero-premio");
        if (!premio || !premio.dataset.objeto) return Promise.resolve();
        premio.classList.add("recogido");
        estado.recogidos.push(premio.dataset.objeto);
        return sleep(reducirMovimiento() ? 100 : 480);
    }

    /** Marca el tramo como superado y avanza el mapa. */
    function avanzar(escena) {
        estado.hecho = Math.min(estado.total, estado.hecho + 1);
        const hitos = escena.host.querySelectorAll(".sendero-hito");
        const h = hitos[estado.hecho - 1];
        if (h) {
            h.classList.add("hecho", "recien");
            h.textContent = "★";
        }
        return sleep(reducirMovimiento() ? 80 : 300);
    }

    function ponerPremio(ramal, id) {
        const premio = ramal.querySelector(".sendero-premio");
        if (!premio) return;
        premio.classList.remove("recogido");
        premio.dataset.objeto = id || "";
        let img = premio.querySelector("img");
        if (!id || !estado || !estado.api || !estado.api.imgUrl) {
            if (img) img.remove();
            return;
        }
        if (!img) {
            img = document.createElement("img");
            img.draggable = false;
            premio.appendChild(img);
        }
        img.src = estado.api.imgUrl(id);
        img.alt = estado.api.nombreObj ? estado.api.nombreObj(id) : "";
    }

    /**
     * Otra ronda del mismo sendero: mismas puertas y el mismo personaje.
     * Cierra, vuelve a la plaza y cambia lo que hay detrás. No rearma la vista.
     */
    function renovar(escena, cfg) {
        if (!escena || !escena.caminante || !escena.caminante.isConnected) return false;
        const zonas = ordenar(cfg.zonas);
        const actuales = ordenar(Object.keys(escena.ramales || {}));
        if (!zonas.length || zonas.join(",") !== actuales.join(",")) return false;

        Object.keys(escena.ramales).forEach(function (z) {
            escena.ramales[z].classList.remove("abierta", "fallo", "error", "resaltado");
        });

        /* El mapa cuenta retos, no rondas: la estrella del acierto no se queda. */
        const hitos = escena.host.querySelectorAll(".sendero-hito");
        for (let i = 0; i < hitos.length; i++) {
            const ya = estado && i < estado.hecho;
            hitos[i].classList.toggle("hecho", !!ya);
            hitos[i].classList.remove("recien");
            hitos[i].textContent = ya ? "★" : "";
        }

        const zona = escena.zonaActual;
        const lejos = (escena.tCamino || 0) > 0.02 && escena.ramales[zona];
        if (!lejos) {
            zonas.forEach(function (z) { ponerPremio(escena.ramales[z], cfg.premios && cfg.premios[z]); });
            escena.tCamino = 0;
            escena.enRuta = false;
            escena.caminante.classList.remove("mira-izq", "mira-der", "mira-arriba", "andando");
            if (escena.origen) ponerCaminante(escena, escena.origen.x, escena.origen.y);
            reactivar(escena);
            return Promise.resolve();
        }
        return volver(escena, zona).then(function () {
            zonas.forEach(function (z) { ponerPremio(escena.ramales[z], cfg.premios && cfg.premios[z]); });
            reactivar(escena);
        });
    }

    /** Camina, abre, enseña el otro objeto, cierra y vuelve a la plaza. */
    function rechazar(escena, zona) {
        return caminarA(escena, zona)
            .then(function () { return mostrarOtro(escena, zona); })
            .then(function () { return volver(escena, zona); });
    }

    /** Borra el recorrido anterior (al empezar una partida nueva). */
    function reiniciar() {
        if (escenaActiva && escenaActiva.observer) escenaActiva.observer.disconnect();
        if (window.LateralidadPersonaje) window.LateralidadPersonaje.liberar();
        escenaActiva = null;
        estado = null;
    }

    global.LateralidadSendero = {
        iniciar: iniciar,
        reiniciar: reiniciar,
        bifurcacion: bifurcacion,
        renovar: renovar,
        esperarEleccion: esperarEleccion,
        congelar: congelar,
        reactivar: reactivar,
        caminarA: caminarA,
        mostrarOtro: mostrarOtro,
        volver: volver,
        recoger: recoger,
        avanzar: avanzar,
        rechazar: rechazar,
        estado: function () { return estado; }
    };
})(typeof window !== "undefined" ? window : this);
