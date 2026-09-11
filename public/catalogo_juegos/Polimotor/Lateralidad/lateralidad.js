/**
 * Capa de Lateralidad sobre el motor de Reconocimiento.
 *
 * Convención L/R (Latelaridad.md): figura infantil de frente.
 * Derecha/izquierda = anatomía de la figura (espejo en pantalla):
 *   derecha de la figura → mitad izquierda de la pantalla
 *   izquierda de la figura → mitad derecha de la pantalla
 * IDs config: *_der / *_izq siguen esa anatomía.
 */
(function () {
    const HINT_MS = 3200;
    const INTRO_LADOS_MS = 2400;

    let hintTimer = null;
    let ladosTimer = null;
    let introGen = 0;
    let pendienteHint = null;
    let introLadosActivo = false;

    function $(id) {
        return document.getElementById(id);
    }

    function ensureUi() {
        const lienzo = $("lienzo");
        if (!lienzo) return null;

        let lados = $("lateralidad-lados");
        if (!lados) {
            lados = document.createElement("div");
            lados.id = "lateralidad-lados";
            lados.setAttribute("aria-hidden", "true");
            // Anatomía de la figura de frente (espejo):
            // derecha de la figura = izquierda visual; izquierda = derecha visual.
            lados.innerHTML =
                '<div class="lateralidad-lado fig-derecha">' +
                "<span>DERECHA</span><small>de la figura</small></div>" +
                '<div class="lateralidad-lado fig-izquierda">' +
                "<span>IZQUIERDA</span><small>de la figura</small></div>";
            lienzo.appendChild(lados);
        }

        let banda = $("lateralidad-banda");
        if (!banda) {
            banda = document.createElement("div");
            banda.id = "lateralidad-banda";
            banda.setAttribute("aria-hidden", "true");
            lienzo.appendChild(banda);
        }

        let hint = $("lateralidad-hint");
        if (!hint) {
            hint = document.createElement("div");
            hint.id = "lateralidad-hint";
            hint.setAttribute("aria-hidden", "true");
            lienzo.appendChild(hint);
        }

        return { lados: lados, banda: banda, hint: hint };
    }

    function hideHint() {
        const ui = ensureUi();
        if (!ui) return;
        if (hintTimer) {
            clearTimeout(hintTimer);
            hintTimer = null;
        }
        ui.hint.style.display = "none";
        ui.banda.style.display = "none";
        ui.hint.classList.remove("lado-derecha", "lado-izquierda");
        ui.banda.classList.remove("lado-derecha", "lado-izquierda");
    }

    function showLadosIntro(thenHint) {
        const ui = ensureUi();
        if (!ui) return;
        if (ladosTimer) clearTimeout(ladosTimer);
        const gen = ++introGen;
        hideHint();
        ui.lados.style.display = "block";
        ladosTimer = setTimeout(function () {
            if (gen !== introGen) return;
            ui.lados.style.display = "none";
            ladosTimer = null;
            introLadosActivo = false;
            if (typeof thenHint === "function") thenHint();
        }, INTRO_LADOS_MS);
    }

    function centroZona(targetId) {
        const el = document.querySelector('.zona-toque[data-id="' + targetId + '"]');
        const lienzo = $("lienzo");
        if (!el || !lienzo) return null;
        const zr = el.getBoundingClientRect();
        const lr = lienzo.getBoundingClientRect();
        if (zr.width < 2 || zr.height < 2) return null;
        return {
            x: ((zr.left + zr.right) / 2 - lr.left) / lr.width * 100,
            y: ((zr.top + zr.bottom) / 2 - lr.top) / lr.height * 100
        };
    }

    function ladoDesdePregunta(pregunta) {
        if (pregunta.lado === "derecha" || pregunta.lado === "izquierda") {
            return pregunta.lado;
        }
        const t = (pregunta.texto || "").toLowerCase();
        if (t.indexOf("derecha") !== -1 || t.indexOf("derecho") !== -1) return "derecha";
        if (t.indexOf("izquierda") !== -1 || t.indexOf("izquierdo") !== -1) return "izquierda";
        const target = (pregunta.targets && pregunta.targets[0]) || "";
        if (target.indexOf("_der") !== -1) return "derecha";
        if (target.indexOf("_izq") !== -1) return "izquierda";
        return null;
    }

    function showHintForPregunta(pregunta) {
        const ui = ensureUi();
        if (!ui || !pregunta || !pregunta.flecha) {
            hideHint();
            return;
        }

        const lado = ladoDesdePregunta(pregunta);
        if (!lado) {
            hideHint();
            return;
        }

        const target = (pregunta.targets && pregunta.targets[0]) || null;
        const centro = target ? centroZona(target) : null;

        if (hintTimer) {
            clearTimeout(hintTimer);
            hintTimer = null;
        }

        ui.banda.classList.remove("lado-derecha", "lado-izquierda");
        ui.banda.classList.add(lado === "derecha" ? "lado-derecha" : "lado-izquierda");
        ui.banda.style.display = "block";

        ui.hint.classList.remove("lado-derecha", "lado-izquierda");
        ui.hint.classList.add(lado === "derecha" ? "lado-derecha" : "lado-izquierda");
        ui.hint.innerHTML =
            "<span>" + (lado === "derecha" ? "DERECHA" : "IZQUIERDA") + "</span>" +
            '<span class="hint-punta" aria-hidden="true">▼</span>';

        if (centro) {
            ui.hint.style.left = centro.x + "%";
            ui.hint.style.top = Math.max(10, centro.y - 4) + "%";
        } else {
            // Anatomía espejo: derecha de la figura ≈ 25% (izquierda visual)
            ui.hint.style.left = lado === "derecha" ? "25%" : "75%";
            ui.hint.style.top = "42%";
        }
        ui.hint.style.display = "flex";

        hintTimer = setTimeout(hideHint, HINT_MS);
    }

    function wrap(name, after) {
        const original = window[name];
        if (typeof original !== "function") {
            console.warn("[Lateralidad] no se pudo enganchar", name);
            return;
        }
        window[name] = function () {
            const result = original.apply(this, arguments);
            try {
                after();
            } catch (e) {
                console.warn("[Lateralidad]", e);
            }
            return result;
        };
    }

    function boot() {
        ensureUi();

        const _iniciar = window.iniciarEscenario;
        if (typeof _iniciar !== "function") {
            console.warn("[Lateralidad] iniciarEscenario ausente");
            return;
        }

        window.iniciarEscenario = function () {
            introLadosActivo = true;
            pendienteHint = null;
            const result = _iniciar.apply(this, arguments);
            showLadosIntro(function () {
                introLadosActivo = false;
                if (pendienteHint) {
                    showHintForPregunta(pendienteHint);
                    pendienteHint = null;
                }
            });
            return result;
        };

        wrap("mostrarPreguntaActual", function () {
            const q = typeof window.preguntaActual === "function" ? window.preguntaActual() : null;
            requestAnimationFrame(function () {
                if (introLadosActivo) {
                    pendienteHint = q;
                    hideHint();
                    return;
                }
                showHintForPregunta(q);
            });
        });

        wrap("resolverAcierto", hideHint);
        wrap("resolverError", hideHint);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
