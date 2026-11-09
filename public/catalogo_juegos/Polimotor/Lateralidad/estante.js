/**
 * LateralidadEstante — nivel 4: "Ordena el Estante".
 *
 * Hay un objeto fijo en el centro de la repisa y el niño coloca otro a su
 * izquierda o a su derecha. La referencia ya no es la pantalla sino otro
 * objeto, que es el paso siguiente de la lateralidad: la relativa.
 */
(function (global) {
    "use strict";

    const ETIQUETA = { izquierda: "Izquierda", derecha: "Derecha" };

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

    function ponerImg(host, url, alt) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = alt || "";
        img.draggable = false;
        host.appendChild(img);
        return img;
    }

    /**
     * Monta la repisa: hueco izquierdo, ancla fija en el centro, hueco derecho,
     * y abajo el objeto que hay que colocar.
     * cfg: { ancla, pieza, api:{imgUrl,nombreObj} }
     */
    function montar(host, cfg) {
        host.innerHTML = "";
        host.className = "tablero estante";

        const mueble = crear("estante-mueble", host);
        const repisa = crear("estante-repisa", mueble);

        const huecos = {};
        const huecoIzq = crear("estante-hueco izquierda", repisa);
        huecoIzq.dataset.zona = "izquierda";
        huecos.izquierda = huecoIzq;

        /* El ancla ocupa el centro y es la referencia de la consigna. */
        const centro = crear("estante-ancla", repisa);
        if (cfg.ancla && cfg.api) {
            ponerImg(centro, cfg.api.imgUrl(cfg.ancla),
                cfg.api.nombreObj ? cfg.api.nombreObj(cfg.ancla) : "");
        }

        const huecoDer = crear("estante-hueco derecha", repisa);
        huecoDer.dataset.zona = "derecha";
        huecos.derecha = huecoDer;

        /* Carteles bajo cada hueco. */
        Object.keys(huecos).forEach(function (z) {
            const c = crear("estante-cartel", huecos[z]);
            c.textContent = ETIQUETA[z];
        });

        crear("estante-tabla", mueble);

        /* La pieza a colocar espera en la mesa de abajo. */
        const mesa = crear("estante-mesa", host);
        const pieza = crear("estante-pieza", mesa);
        if (cfg.pieza && cfg.api) {
            ponerImg(pieza, cfg.api.imgUrl(cfg.pieza),
                cfg.api.nombreObj ? cfg.api.nombreObj(cfg.pieza) : "");
        }

        return { host: host, huecos: huecos, pieza: pieza, repisa: repisa };
    }

    /** Deja una estrellita que se apaga, para marcar el recorrido del dedo. */
    function chispa(x, y) {
        if (reducirMovimiento()) return;
        const s = document.createElement("span");
        s.className = "estante-chispa";
        s.textContent = "★";
        s.style.left = x + "px";
        s.style.top = y + "px";
        s.style.setProperty("--giro", Math.round(Math.random() * 360) + "deg");
        s.style.setProperty("--dx", (Math.random() * 26 - 13).toFixed(1) + "px");
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 760);
    }

    /** Hueco bajo el punto (x,y) de la pantalla, si lo hay. */
    function huecoEn(escena, x, y) {
        let encontrado = null;
        Object.keys(escena.huecos).forEach(function (z) {
            const r = escena.huecos[z].getBoundingClientRect();
            const m = 24;
            if (x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m) {
                encontrado = z;
            }
        });
        return encontrado;
    }

    /**
     * La pieza se arrastra hasta el hueco. También se puede tocar un hueco
     * directamente, para quien no logre el arrastre.
     */
    function esperarEleccion(escena, onPick) {
        escena.activo = true;

        Object.keys(escena.huecos).forEach(function (z) {
            const hueco = escena.huecos[z];
            hueco.classList.add("elegible");
            hueco.setAttribute("role", "button");
            hueco.tabIndex = 0;
            const elegir = function (ev) {
                ev.preventDefault();
                if (!escena.activo) return;
                onPick(z);
            };
            hueco.addEventListener("click", elegir);
            hueco.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") elegir(ev);
            });
        });

        /* Arrastre de la pieza con el dedo o el ratón. */
        const pieza = escena.pieza;
        pieza.classList.add("arrastrable");
        let gesto = null;

        pieza.addEventListener("pointerdown", function (ev) {
            if (!escena.activo || ev.button > 0) return;
            ev.preventDefault();
            try { pieza.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            gesto = { x0: ev.clientX, y0: ev.clientY };
            pieza.classList.add("arrastrando");
        });

        pieza.addEventListener("pointermove", function (ev) {
            if (!gesto) return;
            const dx = ev.clientX - gesto.x0;
            const dy = ev.clientY - gesto.y0;
            pieza.style.transform = "translate(" + dx + "px," + dy + "px)";

            /* Rastro de estrellitas, espaciado para que no sature. */
            const ahora = Date.now();
            if (ahora - (gesto.ultima || 0) > 55) {
                gesto.ultima = ahora;
                chispa(ev.clientX, ev.clientY);
            }

            const sobre = huecoEn(escena, ev.clientX, ev.clientY);
            Object.keys(escena.huecos).forEach(function (z) {
                escena.huecos[z].classList.toggle("encima", z === sobre);
            });
        });

        const soltar = function (ev) {
            if (!gesto) return;
            gesto = null;
            pieza.classList.remove("arrastrando");
            const sobre = huecoEn(escena, ev.clientX, ev.clientY);
            Object.keys(escena.huecos).forEach(function (z) {
                escena.huecos[z].classList.remove("encima");
            });
            if (sobre && escena.activo) {
                onPick(sobre);
            } else {
                pieza.style.transform = "";
            }
        };
        pieza.addEventListener("pointerup", soltar);
        pieza.addEventListener("pointercancel", function () {
            gesto = null;
            pieza.classList.remove("arrastrando");
            pieza.style.transform = "";
        });
    }

    function congelar(escena) {
        escena.activo = false;
        Object.keys(escena.huecos).forEach(function (z) {
            escena.huecos[z].classList.remove("elegible");
        });
    }

    function reactivar(escena) {
        escena.activo = true;
        Object.keys(escena.huecos).forEach(function (z) {
            escena.huecos[z].classList.add("elegible");
        });
    }

    /** La pieza vuela desde la mesa hasta el hueco elegido y se queda. */
    function colocar(escena, zona) {
        const hueco = escena.huecos[zona];
        if (!hueco) return Promise.resolve();
        const desde = escena.pieza.getBoundingClientRect();
        const hasta = hueco.getBoundingClientRect();
        const dx = (hasta.left + hasta.width / 2) - (desde.left + desde.width / 2);
        const dy = (hasta.top + hasta.height / 2) - (desde.top + desde.height / 2);
        escena.pieza.style.transform = "translate(" + dx + "px," + dy + "px)";
        escena.pieza.classList.add("volando");
        return sleep(reducirMovimiento() ? 110 : 620).then(function () {
            hueco.classList.add("lleno");
        });
    }

    /** Hueco equivocado: la pieza regresa a la mesa. */
    function devolver(escena, zona) {
        const hueco = escena.huecos[zona];
        if (hueco) {
            hueco.classList.add("mal");
            setTimeout(function () { hueco.classList.remove("mal"); }, 600);
        }
        escena.pieza.style.transform = "";
        escena.pieza.classList.remove("volando");
        return sleep(reducirMovimiento() ? 110 : 560);
    }

    function imagenDe(host, url, alt) {
        let img = host.querySelector("img");
        if (!url) {
            if (img) img.remove();
            return;
        }
        if (!img) {
            ponerImg(host, url, alt);
            return;
        }
        img.src = url;
        img.alt = alt || "";
    }

    /** Otra pieza en la misma repisa. Los huecos ya escuchan el toque. */
    function renovar(escena, cfg) {
        if (!escena || !escena.pieza || !escena.pieza.isConnected) return false;
        const centro = escena.host.querySelector(".estante-ancla");
        if (!centro || !cfg.api) return false;
        imagenDe(centro, cfg.api.imgUrl(cfg.ancla),
            cfg.api.nombreObj ? cfg.api.nombreObj(cfg.ancla) : "");
        imagenDe(escena.pieza, cfg.api.imgUrl(cfg.pieza),
            cfg.api.nombreObj ? cfg.api.nombreObj(cfg.pieza) : "");
        escena.pieza.style.transform = "";
        escena.pieza.classList.remove("volando", "arrastrando");
        Object.keys(escena.huecos).forEach(function (z) {
            escena.huecos[z].classList.remove("lleno", "mal", "encima");
        });
        reactivar(escena);
        return true;
    }

    global.LateralidadEstante = {
        montar: montar,
        renovar: renovar,
        esperarEleccion: esperarEleccion,
        congelar: congelar,
        reactivar: reactivar,
        colocar: colocar,
        devolver: devolver
    };
})(typeof window !== "undefined" ? window : this);
