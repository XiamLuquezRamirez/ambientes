/* Coordinación Visual — pelota al aro por rutas ortogonales fijas (JSON) */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let recorridos = [];
    let rutasFijas = null;
    let indiceRecorrido = 0;
    let juegoTerminado = false;
    let esperandoFeedback = false;

    let canvas = null;
    let ctx = null;
    let pelotaEl = null;
    let aroImgEl = null;
    let aroEncesteEl = null;
    let aroBaseEl = null;
    let aroConjuntoEl = null;
    let audioCache = Object.create(null);
    let imagenesPromise = null;
    let gifEncesteListo = false;
    const imagenesPrecargadas = Object.create(null);

    let pelota = { x: 0, y: 0 };
    let ultimoValido = { x: 0, y: 0 };
    let arrastrando = false;
    let pointerId = null;
    let redrawPendiente = false;
    let rafId = null;
    let progresoCamino = 0;
    let alertaDesvio = 0;
    let pelotaVisible = true;
    let encestando = false;
    let avisoSaliendoActivo = false;
    let demoActiva = false;
    let demoRafId = null;
    let demoVozPromise = null;

    function readText(ruta) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function acc() {
        return (gameConfig && gameConfig.accesibilidad) || {};
    }

    function textos() {
        return (gameConfig && gameConfig.textos) || {};
    }

    function mensajeSaliendo() {
        return textos().saliendo || "Ten cuidado, te estás saliendo de la línea.";
    }

    function mostrarInstruccionBase() {
        const enunciado = document.getElementById("enunciado");
        if (!enunciado) return;
        if (esRecorridoDemo()) {
            enunciado.textContent = textos().demostracion ||
                "¡Vamos a un tutorial! Mira cómo se hace: la pelota sigue la línea hasta la canasta.";
        } else {
            enunciado.textContent = textos().instruccion ||
                "Arrastra la pelota hasta la canasta siguiendo la línea.";
        }
        enunciado.classList.remove("aviso-saliendo");
        avisoSaliendoActivo = false;
    }

    function ritmoFondoAlerta(activo) {
        if (!audioFondo) return;
        try {
            audioFondo.playbackRate = activo ? 1.35 : 1;
        } catch (e) { /* noop */ }
    }

    function avisarSaliendo() {
        const enunciado = document.getElementById("enunciado");
        const msg = mensajeSaliendo();
        const primeraVez = !avisoSaliendoActivo;
        if (enunciado) {
            enunciado.textContent = msg;
            enunciado.classList.add("aviso-saliendo");
        }
        avisoSaliendoActivo = true;
        ritmoFondoAlerta(true);
        // Suena cada vez que entra al aviso (al cambiar el texto).
        if (primeraVez && typeof TextoVoz !== "undefined" && feedbackActivo()) {
            TextoVoz.hablar(msg, "zoe");
        }
    }

    function limpiarAvisoSaliendo() {
        if (!avisoSaliendoActivo) {
            alertaDesvio = 0;
            return;
        }
        ritmoFondoAlerta(false);
        mostrarInstruccionBase();
    }

    function volumenFondoPct() {
        const n = Number(acc().volumenFondo);
        if (!isFinite(n)) return 20;
        return Math.max(0, Math.min(100, n));
    }

    function aplicarLetterSpacing() {
        const n = Number(acc().letterSpacing);
        const valor = isFinite(n) && n >= 0 ? n : 2;
        document.documentElement.style.setProperty("--mc-letter-spacing", valor + "px");
    }

    function aplicarAccesibilidadInicial() {
        const a = acc();
        document.body.classList.toggle("alto-contraste", !!a.altoContraste);
        document.body.classList.toggle("modo-tap", !!a.modoTap);
        const estilo = a.altoContrasteEstilo || {};
        if (estilo.bordePelota) {
            document.documentElement.style.setProperty("--acc-borde-pelota", estilo.bordePelota);
        }
        if (estilo.bordeArco) {
            document.documentElement.style.setProperty("--acc-borde-arco", estilo.bordeArco);
        }
        if (estilo.fondo) {
            document.documentElement.style.setProperty("--acc-fondo", estilo.fondo);
        }
        aplicarFondoEscenario();
        aplicarLetterSpacing();
        if (typeof programarRedibujo === "function") programarRedibujo();
    }

    function aplicarFondoEscenario() {
        const wrap = document.getElementById("lienzo-wrap");
        if (!wrap) return;
        const esc = (gameConfig && gameConfig.escenario) || {};
        const url = esc.fondo || "images/fondo.png";
        const estilo = acc().altoContrasteEstilo || {};
        if (acc().altoContraste) {
            // Conserva el fondo y lo oscurece bastante (velo).
            const velo = estilo.fondo || "rgba(0,0,0,0.82)";
            wrap.style.backgroundImage =
                "linear-gradient(" + velo + ", " + velo + "), url(\"" + url + "\")";
            wrap.style.backgroundColor = "#000000";
        } else {
            wrap.style.backgroundImage = 'url("' + url + '")';
            wrap.style.backgroundColor = "";
        }
    }

    function feedbackActivo() {
        return acc().mostrarFeedBack !== false;
    }

    function rutasFalsasActivas() {
        return !!acc().rutasFalsas;
    }

    function cantidadRutasFalsas(nivel) {
        const nDistNivel = Number(nivel && nivel.distractores != null ? nivel.distractores : 0);
        const nCfg = Number(acc().rutasFalsasCantidad);
        const fallback = isFinite(nCfg) && nCfg > 0 ? nCfg : 2;
        if (!rutasFalsasActivas()) return 0;
        return Math.max(nDistNivel, fallback);
    }

    function anchoCamino() {
        const base = Number(nivelElegido && nivelElegido.anchoCamino != null
            ? nivelElegido.anchoCamino
            : 10);
        const extra = Number(acc().anchoCaminoExtra);
        const ajuste = isFinite(extra) ? extra : 0;
        return clamp(base + ajuste, 4, 28);
    }

    function umbralEnceste() {
        const u = Number(acc().umbralEnceste);
        if (!isFinite(u)) return 0.5;
        return clamp(u, 0.1, 1);
    }

    function aplicarVolumenCalibrado(pct) {
        const n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        const vol = n / 100;
        if (typeof TextoVoz !== "undefined" && typeof TextoVoz.definirVolumenFondo === "function") {
            TextoVoz.definirVolumenFondo(vol);
        } else if (audioFondo) {
            audioFondo.volume = vol;
        }
        const icono = document.querySelector("#btn-menu-vol i");
        if (icono) {
            icono.className = n <= 0
                ? "fa-solid fa-volume-xmark"
                : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
    }

    function setMenuVol(abierto) {
        const panel = document.getElementById("menu-vol-panel");
        const btn = document.getElementById("btn-menu-vol");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        if (abierto) setMenuAcc(false);
    }

    function pintarMenuVol() {
        const pct = volumenFondoPct();
        const slider = document.getElementById("rango-volumen");
        const val = document.getElementById("vol-val");
        if (slider) slider.value = String(pct);
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
    }

    function enlazarMenuVol() {
        pintarMenuVol();
        const btn = document.getElementById("btn-menu-vol");
        const cerrar = document.getElementById("btn-cerrar-vol");
        const slider = document.getElementById("rango-volumen");
        if (btn) {
            btn.addEventListener("click", function () {
                const panel = document.getElementById("menu-vol-panel");
                setMenuVol(panel && panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) {
            slider.addEventListener("input", function () {
                aplicarVolumenCalibrado(slider.value);
                const val = document.getElementById("vol-val");
                if (val) val.textContent = String(slider.value);
            });
        }
    }

    const ACC_OPCIONES = [
        { key: "altoContraste", label: "Alto contraste" },
        { key: "modoTap", label: "Modo toque (sin arrastrar)" },
        { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
        { key: "mostrarFeedBack", label: "Mostrar feedback al anotar" },
        { key: "rutasFalsas", label: "Rutas falsas / sin salida" }
    ];

    function setMenuAcc(abierto) {
        const panel = document.getElementById("menu-acc-panel");
        const btn = document.getElementById("btn-menu-acc");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        if (abierto) setMenuVol(false);
    }

    function pintarMenuAcc() {
        const ops = document.getElementById("menu-acc-ops");
        if (!ops) return;
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        ops.innerHTML = "";

        ACC_OPCIONES.forEach(function (op) {
            const lab = document.createElement("label");
            lab.className = "menu-acc-op";
            lab.innerHTML = '<input type="checkbox"> ' + op.label;
            const input = lab.querySelector("input");
            input.checked = !!acc()[op.key];
            input.addEventListener("change", function () {
                gameConfig.accesibilidad[op.key] = input.checked;
                if (op.key === "rutasFalsas") {
                    regenerarDistractoresActuales();
                }
                if (op.key === "mostrarIntro") {
                    sincronizarDialogoIntro3d();
                }
                aplicarAccesibilidadInicial();
            });
            ops.appendChild(lab);
        });

        const a = acc();
        const minExtra = Number(a.anchoCaminoExtraMin);
        const maxExtra = Number(a.anchoCaminoExtraMax);
        const rangoMin = isFinite(minExtra) ? minExtra : -6;
        const rangoMax = isFinite(maxExtra) ? maxExtra : 10;

        const rangoAncho = document.createElement("label");
        rangoAncho.className = "menu-acc-op menu-acc-rango";
        const extra = Number(a.anchoCaminoExtra);
        const extraVal = isFinite(extra) ? extra : 0;
        rangoAncho.innerHTML = "<span>Ancho de ruta <strong>" +
            (extraVal >= 0 ? "+" : "") + extraVal + "</strong></span>";
        const sliderAncho = document.createElement("input");
        sliderAncho.type = "range";
        sliderAncho.min = String(rangoMin);
        sliderAncho.max = String(rangoMax);
        sliderAncho.step = "1";
        sliderAncho.value = String(extraVal);
        sliderAncho.addEventListener("input", function () {
            const n = Number(sliderAncho.value);
            gameConfig.accesibilidad.anchoCaminoExtra = n;
            rangoAncho.querySelector("strong").textContent = (n >= 0 ? "+" : "") + n;
            programarRedibujo();
        });
        rangoAncho.appendChild(sliderAncho);
        ops.appendChild(rangoAncho);

        const rango = document.createElement("label");
        rango.className = "menu-acc-op menu-acc-rango";
        const actual = Number(acc().letterSpacing);
        const valor = isFinite(actual) && actual >= 0 ? actual : 2;
        rango.innerHTML = "<span>Espaciado de letras <strong>" + valor + "</strong></span>";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "10";
        slider.step = "1";
        slider.value = String(valor);
        slider.addEventListener("input", function () {
            const n = Number(slider.value);
            gameConfig.accesibilidad.letterSpacing = n;
            rango.querySelector("strong").textContent = String(n);
            aplicarLetterSpacing();
        });
        rango.appendChild(slider);
        ops.appendChild(rango);
    }

    function enlazarMenuAcc() {
        pintarMenuAcc();
        const btn = document.getElementById("btn-menu-acc");
        const cerrar = document.getElementById("btn-cerrar-acc");
        if (btn) {
            btn.addEventListener("click", function () {
                const panel = document.getElementById("menu-acc-panel");
                setMenuAcc(panel && panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setMenuAcc(false); });
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (t) { clearTimeout(t); });
        introTimers = [];
    }

    function asegurarAudioFondo() {
        const ruta = gameConfig.audios && gameConfig.audios.fondo;
        if (!ruta) return;
        if (!audioFondo) {
            audioFondo = new Audio(ruta);
            audioFondo.loop = true;
        }
        audioFondo.volume = volumenFondoPct() / 100;
        try { audioFondo.playbackRate = 1; } catch (e) { /* noop */ }
        const p = audioFondo.play();
        if (p && typeof p.catch === "function") p.catch(function () { /* noop */ });
    }

    function reproducirAudio(ruta, vol, loop) {
        if (!ruta) return;
        let a = audioCache[ruta];
        if (!a) {
            a = new Audio(ruta);
            audioCache[ruta] = a;
        }
        try {
            a.pause();
            a.currentTime = 0;
            a.loop = !!loop;
            a.volume = vol == null ? 0.85 : vol;
            const p = a.play();
            if (p && typeof p.catch === "function") p.catch(function () { /* noop */ });
        } catch (e) { /* noop */ }
    }

    function mostrarFeedback(tipo, mensaje, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            const fb = gameConfig.feedback || {};
            const dur = Number(fb.duracion) || 1400;
            const nodo = fb[tipo] || {};
            const hablar = !opts.silencio && mensaje && typeof TextoVoz !== "undefined";
            if (typeof Swal === "undefined" || !feedbackActivo()) {
                if (hablar) {
                    TextoVoz.hablar(mensaje, tipo === "acierto" ? "zoe" : "zeus");
                }
                setTimeout(resolve, dur);
                return;
            }
            if (hablar) {
                TextoVoz.hablar(mensaje, tipo === "acierto" ? "zoe" : "zeus");
            }
            // Diferir: en modo toque el mismo click que falló cerraba el Swal al soltar.
            setTimeout(function () {
                Swal.fire({
                    imageUrl: nodo.gif || "",
                    imageWidth: 180,
                    showConfirmButton: false,
                    timer: dur,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    heightAuto: false,
                    scrollbarPadding: false,
                    background: "transparent",
                    backdrop: "rgba(255,255,255,0.35)"
                }).then(resolve);
            }, 80);
        });
    }

    /* ── Intro 3D compartida ──────────────────────────────────── */

    function sincronizarDialogoIntro3d() {
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};

        const conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        const personajesCfg = window.INTRO_CONFIG.personajes || [];
        const colores = (window.INTRO_CONFIG.dialogo.colores) || {};

        function textoPlano(html) {
            if (!html) return "";
            const tmp = document.createElement("div");
            tmp.innerHTML = String(html).replace(/<br\s*\/?>/gi, " ");
            return String(tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
        }

        const lineas = conversacion.map(function (linea) {
            const indice = Number(linea.personaje);
            const def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
            const id = def.id || (indice === 1 ? "zoe" : "zeus");
            const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indice] && introConfig.personajes[indice].nombre)
                || (id === "zoe" ? "Zoe" : "Zeus");

            return {
                personaje: id,
                nombre: nombre,
                color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
                texto: textoPlano(linea.texto)
            };
        });

        window.INTRO_CONFIG.dialogo.lineas = lineas;
    }

    function mostrarIntro3d() {
        const root = document.getElementById("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        const root = document.getElementById("intro3d-root");
        if (root) {
            root.classList.add("is-closing");
            setTimeout(function () {
                root.hidden = true;
                if (window.__introPhaser) {
                    try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                    window.__introPhaser = null;
                }
                if (typeof window.__intro3dDispose === "function") {
                    window.__intro3dDispose();
                }
                root.remove();
            }, 450);
        }
    }

    function omitirIntro3d() {
        if (cerrardo) return;
        const root = document.getElementById("intro3d-root");
        if (!root || root.hidden) {
            empezarJuegoTrasIntro();
            return;
        }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrardo) return;
        cerrardo = true;
        conversacionCancelada = true;
        cancelarIntroPendiente();
        TextoVoz.detener();
        asegurarAudioFondo();
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        $("#principal").css("display", "flex").hide().fadeIn(800, function () {
            ajustarCanvas();
            programarRedibujo();
        });
        iniciarPartida();
    }

    function empecemosJuego() {
        const pantalla = document.getElementById("pantalla-inicio");
        const btn = document.getElementById("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        TextoVoz.desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        TextoVoz.precargar();
        pantalla.classList.add("is-out");
        setTimeout(function () {
            pantalla.hidden = true;
            document.body.classList.remove("esperando-inicio");
            mostrarIntro3d();
        }, 900);
    }

    /* ── Geometría ────────────────────────────────────────────── */

    function clamp(n, a, b) {
        return Math.max(a, Math.min(b, n));
    }

    function dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function distPuntoSegmento(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return { dist: dist(p, a), punto: { x: a.x, y: a.y }, t: 0, seg: 0 };
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: a.x + t * dx, y: a.y + t * dy };
        return { dist: dist(p, proj), punto: proj, t: t };
    }

    function proyectarEnPath(p, pathPts) {
        let mejor = null;
        let acumulado = 0;
        for (let i = 0; i < pathPts.length - 1; i++) {
            const a = pathPts[i];
            const b = pathPts[i + 1];
            const segLen = dist(a, b);
            const r = distPuntoSegmento(p, a, b);
            const progreso = acumulado + r.t * segLen;
            if (!mejor || r.dist < mejor.dist) {
                mejor = {
                    dist: r.dist,
                    punto: r.punto,
                    progreso: progreso
                };
            }
            acumulado += segLen;
        }
        if (mejor) mejor.largoTotal = acumulado;
        return mejor;
    }

    function dentroDelCamino(p, pathPts, radio) {
        const proy = proyectarEnPath(p, pathPts);
        return !!(proy && proy.dist <= radio);
    }

    function puntosPath(path) {
        return (path || []).map(function (p) {
            return { x: Number(p[0]), y: Number(p[1]) };
        });
    }

    function barajar(lista) {
        const arr = (lista || []).slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function clonarRuta(lab, indice) {
        return {
            id: (lab && lab.id) ? String(lab.id) : ("ruta-" + (indice + 1)),
            path: (lab.path || []).map(function (p) { return [Number(p[0]), Number(p[1])]; }),
            distractores: (lab.distractores || []).map(function (rama) {
                return (rama || []).map(function (p) { return [Number(p[0]), Number(p[1])]; });
            })
        };
    }

    function poolRutasNivel(nivel) {
        const id = String((nivel && nivel.id) || "");
        if (rutasFijas && Array.isArray(rutasFijas[id])) return rutasFijas[id];
        return [];
    }

    /** Ajusta extremos a inicioLinea / aro manteniendo tramos ortogonales. */
    function anclarExtremosOrtogonales(path) {
        const ini = (gameConfig && gameConfig.inicioLinea) || {};
        const meta = metaFija();
        const start = {
            x: Number(ini.x != null ? ini.x : 10),
            y: Number(ini.y != null ? ini.y : 78)
        };
        const out = (path || []).map(function (p) {
            return [Number(p[0]), Number(p[1])];
        });
        if (out.length < 2) {
            return [[start.x, start.y], [meta.x, meta.y]];
        }

        out[0] = [start.x, start.y];
        // Primer tramo ortogonal hacia el 2º punto.
        if (Math.abs(out[1][0] - start.x) >= Math.abs(out[1][1] - start.y)) {
            out[1][1] = start.y;
        } else {
            out[1][0] = start.x;
        }

        const last = out.length - 1;
        out[last] = [meta.x, meta.y];
        // Último tramo ortogonal desde el penúltimo.
        if (Math.abs(out[last - 1][0] - meta.x) >= Math.abs(out[last - 1][1] - meta.y)) {
            out[last - 1][1] = meta.y;
        } else {
            out[last - 1][0] = meta.x;
        }
        return out;
    }

    function ajustarDistractoresAPath(path, distractores, maxRamas) {
        const ramas = (distractores || []).map(function (rama) {
            return (rama || []).map(function (p) { return [Number(p[0]), Number(p[1])]; });
        });
        if (maxRamas == null || !isFinite(maxRamas)) return ramas;
        return ramas.slice(0, Math.max(0, Math.floor(maxRamas)));
    }

    function mostrarIntroActiva() {
        return !!acc().mostrarIntro;
    }

    function rutaDemoNivel(nivel) {
        const id = String((nivel && nivel.id) || "");
        if (rutasFijas && rutasFijas.demo && rutasFijas.demo[id]) {
            return rutasFijas.demo[id];
        }
        return null;
    }

    function esRecorridoDemo(lab) {
        const r = lab || recorridoActual();
        return !!(r && r.esDemo);
    }

    function mostrarPersonajeTutorial3d() {
        if (!window.Tutorial3d || typeof window.Tutorial3d.start !== "function") {
            return Promise.resolve("zoe");
        }
        return Promise.resolve(window.Tutorial3d.start()).catch(function () {
            return "zoe";
        });
    }

    function ocultarPersonajeTutorial3d() {
        if (window.Tutorial3d && typeof window.Tutorial3d.stop === "function") {
            window.Tutorial3d.stop();
        }
    }

    function despedirPersonajeTutorial3d() {
        if (window.Tutorial3d && typeof window.Tutorial3d.despedir === "function") {
            return Promise.resolve(window.Tutorial3d.despedir()).catch(function () {});
        }
        ocultarPersonajeTutorial3d();
        return Promise.resolve();
    }

    function detenerDemostracion() {
        demoActiva = false;
        demoVozPromise = null;
        if (demoRafId != null) {
            cancelAnimationFrame(demoRafId);
            demoRafId = null;
        }
        document.body.classList.remove("demo-activa");
        ocultarPersonajeTutorial3d();
    }

    function pausarAnimacionDemo() {
        demoActiva = false;
        if (demoRafId != null) {
            cancelAnimationFrame(demoRafId);
            demoRafId = null;
        }
        document.body.classList.remove("demo-activa");
    }

    function densificarPathOrtogonal(pathPts, paso) {
        const pts = [];
        const step = Math.max(0.4, Number(paso) || 1.2);
        if (!pathPts || pathPts.length < 2) return pts;
        pts.push({ x: pathPts[0].x, y: pathPts[0].y });
        for (let i = 1; i < pathPts.length; i++) {
            const a = pathPts[i - 1];
            const b = pathPts[i];
            const len = dist(a, b);
            if (len < 0.001) continue;
            const n = Math.max(1, Math.ceil(len / step));
            for (let s = 1; s <= n; s++) {
                const t = s / n;
                pts.push({
                    x: a.x + (b.x - a.x) * t,
                    y: a.y + (b.y - a.y) * t
                });
            }
        }
        return pts;
    }

    function longitudPath(pathPts) {
        let L = 0;
        for (let i = 1; i < pathPts.length; i++) {
            L += dist(pathPts[i - 1], pathPts[i]);
        }
        return L;
    }

    function hablarPromesa(texto, quien) {
        if (!texto || typeof TextoVoz === "undefined" || typeof TextoVoz.hablar !== "function") {
            return Promise.resolve();
        }
        try {
            const p = TextoVoz.hablar(String(texto), quien || "zoe");
            return (p && typeof p.then === "function") ? p : Promise.resolve();
        } catch (e) {
            return Promise.resolve();
        }
    }

    function completarDemostracion() {
        if (esperandoFeedback || juegoTerminado) return;
        esperandoFeedback = true;
        // Para la pelota, pero el personaje se queda hasta el final y luego se va.
        pausarAnimacionDemo();

        const lab = recorridoActual();
        const geo = inicioMeta(lab);
        pelota = { x: geo.meta.x, y: geo.meta.y };
        if (pelotaDentroDelAro(pelota)) pelotaVisible = false;
        programarRedibujo();

        const mensaje = textos().demostracionFin ||
            "¡Ahora te toca a ti! Sigue la línea hasta la canasta.";
        const vozPendiente = demoVozPromise || Promise.resolve();
        demoVozPromise = null;

        Promise.resolve(vozPendiente).catch(function () {}).then(function () {
            if (juegoTerminado) return Promise.resolve();
            return despedirPersonajeTutorial3d();
        }).then(function () {
            if (juegoTerminado) return;
            return mostrarAroEnceste().then(function () {
                pelotaVisible = false;
                posicionarPelotaDom();
                return mostrarFeedback("acierto", mensaje);
            }).then(function () {
                esperandoFeedback = false;
                avanzarRecorrido();
            });
        });
    }

    function iniciarAnimacionDemo(muestras) {
        if (!demoActiva || juegoTerminado || !muestras || muestras.length < 2) {
            if (demoActiva) completarDemostracion();
            return;
        }

        const largo = longitudPath(muestras);
        // Un poco más lento para que el niño pueda seguir el recorrido.
        const durMs = clamp(largo * 78, 6200, 12000);
        const t0 = performance.now();
        let idx = 0;

        function frame(now) {
            if (!demoActiva || juegoTerminado) return;
            const u = clamp((now - t0) / durMs, 0, 1);
            const target = Math.min(muestras.length - 1, Math.floor(u * (muestras.length - 1)));
            while (idx < target) idx += 1;
            const p = muestras[idx];
            pelota = { x: p.x, y: p.y };
            ultimoValido = { x: p.x, y: p.y };
            progresoCamino = u;
            posicionarPelotaDom();

            if (u >= 1 || idx >= muestras.length - 1) {
                completarDemostracion();
                return;
            }
            demoRafId = requestAnimationFrame(frame);
        }

        demoRafId = requestAnimationFrame(frame);
    }

    function iniciarDemostracion() {
        const lab = recorridoActual();
        if (!esRecorridoDemo(lab) || demoActiva || juegoTerminado) return;

        if (demoRafId != null) {
            cancelAnimationFrame(demoRafId);
            demoRafId = null;
        }
        demoActiva = true;
        document.body.classList.add("demo-activa");

        const msg = textos().demostracion ||
            "¡Vamos a un tutorial! Mira cómo se hace: la pelota sigue la línea hasta la canasta.";
        const enunciado = document.getElementById("enunciado");
        if (enunciado) {
            enunciado.textContent = msg;
            enunciado.classList.remove("aviso-saliendo");
        }

        const geo = inicioMeta(lab);
        const muestras = densificarPathOrtogonal(geo.pts, 1.1);
        if (muestras.length >= 2) {
            pelota = { x: muestras[0].x, y: muestras[0].y };
            ultimoValido = { x: muestras[0].x, y: muestras[0].y };
            pelotaVisible = true;
            programarRedibujo();
        }

        // Entra → habla → pelota recorre → al final del tutorial se va.
        mostrarPersonajeTutorial3d().then(function (quien) {
            if (!demoActiva || juegoTerminado || !esRecorridoDemo()) return;
            demoVozPromise = hablarPromesa(msg, quien || "zoe");
            setTimeout(function () {
                if (!demoActiva || juegoTerminado || !esRecorridoDemo()) return;
                if (muestras.length < 2) {
                    completarDemostracion();
                    return;
                }
                iniciarAnimacionDemo(muestras);
            }, 1000);
        });
    }

    function generarRecorridosNivel(nivel) {
        const cantidad = Number(nivel.cantidad != null ? nivel.cantidad : 3);
        const pool = poolRutasNivel(nivel);
        if (!pool.length) {
            console.warn("[CoordinacionVisual] Sin rutas fijas para edad", nivel && nivel.id);
            return [];
        }
        const elegidos = barajar(pool).slice(0, Math.min(cantidad, pool.length));
        const nDist = cantidadRutasFalsas(nivel);
        const lista = elegidos.map(function (lab, i) {
            const clon = clonarRuta(lab, i);
            clon.path = anclarExtremosOrtogonales(clon.path);
            clon.distractores = nDist > 0
                ? ajustarDistractoresAPath(clon.path, clon.distractores, nDist)
                : [];
            clon.esDemo = false;
            return clon;
        });

        if (mostrarIntroActiva()) {
            const demoSrc = rutaDemoNivel(nivel);
            if (demoSrc) {
                const demo = clonarRuta(demoSrc, 0);
                demo.id = String(demoSrc.id || ("demo-" + nivel.id));
                demo.path = anclarExtremosOrtogonales(demo.path);
                demo.distractores = nDist > 0
                    ? ajustarDistractoresAPath(demo.path, demo.distractores, nDist)
                    : [];
                demo.esDemo = true;
                lista.unshift(demo);
            }
        }
        return lista;
    }

    function regenerarDistractoresActuales() {
        if (!recorridos.length || !nivelElegido) return;
        const nDist = cantidadRutasFalsas(nivelElegido);
        if (nDist <= 0) {
            recorridos.forEach(function (lab) { lab.distractores = []; });
            programarRedibujo();
            return;
        }
        const pool = poolRutasNivel(nivelElegido);
        recorridos.forEach(function (lab) {
            const origen = pool.find(function (p) { return String(p.id) === String(lab.id); });
            lab.distractores = origen
                ? ajustarDistractoresAPath(lab.path, origen.distractores, nDist)
                : [];
        });
        programarRedibujo();
    }

    function recorridoActual() {
        return recorridos[indiceRecorrido] || null;
    }

    /* ── Geometría (proyección / red) ─────────────────────────── */

    function cfgAro() {
        return (gameConfig && gameConfig.aro) || {};
    }

    function puntoRimDesdeDom() {
        if (!aroImgEl || !canvas) return null;
        const wrap = canvas.getBoundingClientRect();
        const aro = aroImgEl.getBoundingClientRect();
        if (!wrap.width || !wrap.height || !aro.width || !aro.height) return null;

        const a = cfgAro();
        const fx = Number(a.rimFracX != null ? a.rimFracX : 0.5);
        const fy = Number(a.rimFracY != null ? a.rimFracY : 0.2);
        const x = ((aro.left + aro.width * fx - wrap.left) / wrap.width) * 100;
        const y = ((aro.top + aro.height * fy - wrap.top) / wrap.height) * 100;
        if (!isFinite(x) || !isFinite(y)) return null;
        return {
            x: clamp(x, 70, 96),
            y: clamp(y, 12, 70)
        };
    }

    function metaFija() {
        const desdeDom = puntoRimDesdeDom();
        if (desdeDom) return desdeDom;
        const a = cfgAro();
        return {
            x: Number(a.metaX != null ? a.metaX : 89),
            y: Number(a.metaY != null ? a.metaY : 38)
        };
    }

    function radioMeta() {
        const a = cfgAro();
        return Number(a.radioMeta != null ? a.radioMeta : 6.5);
    }

    /** Zona amplia para detectar llegada al aro. */
    function pelotaEnZonaAro(pos) {
        return dist(pos, metaFija()) <= radioMeta();
    }

    /** Más del umbral (config) del balón dentro del centro del aro. */
    function pelotaDentroDelAro(pos) {
        const meta = metaFija();
        const rPelota = radioPelota();
        const rAro = radioMeta();
        const parteFuera = rPelota * (1 - umbralEnceste());
        return dist(pos, meta) <= Math.max(0.8, rAro - parteFuera);
    }

    function coloresCamino() {
        const c = (gameConfig && gameConfig.coloresCamino) || {};
        if (acc().altoContraste) {
            const hc = acc().altoContrasteEstilo || {};
            const relleno = hc.linea || "#000000";
            const borde = hc.borde || "#E5FF00";
            const alerta = hc.alerta || "#e53935";
            return {
                linea: lerpColor(relleno, alerta, alertaDesvio),
                borde: borde,
                distractores: hc.distractores || relleno,
                bordeDistractores: hc.bordeDistractores || borde
            };
        }
        const blanco = c.linea || "#ffffff";
        const rojo = c.alerta || "#e53935";
        const bordeBase = c.borde || "#94a3b8";
        return {
            linea: lerpColor(blanco, rojo, alertaDesvio),
            borde: lerpColor(bordeBase, "#7f1d1d", alertaDesvio * 0.85),
            distractores: blanco,
            bordeDistractores: bordeBase
        };
    }

    function proyectarEnRed(p, red) {
        let mejor = null;
        for (let i = 0; i < red.length; i++) {
            const r = proyectarEnPath(p, red[i]);
            if (r && (!mejor || r.dist < mejor.dist)) {
                mejor = r;
                mejor.indiceRed = i;
            }
        }
        return mejor;
    }

    function redDePasillos(lab) {
        const red = [puntosPath(lab && lab.path)];
        (lab && lab.distractores || []).forEach(function (rama) {
            const pts = puntosPath(rama);
            if (pts.length >= 2) red.push(pts);
        });
        return red;
    }

    function anchoPelota() {
        const nivel = Number(nivelElegido && nivelElegido.anchoPelota);
        if (isFinite(nivel) && nivel > 0) return nivel;
        const cfg = (gameConfig && gameConfig.pelota) || {};
        // Compat: si solo hay radio, el ancho visual es diámetro.
        if (cfg.radio != null && isFinite(Number(cfg.radio))) {
            return Number(cfg.radio) * 2;
        }
        return 5.5;
    }

    function radioPelota() {
        return anchoPelota() / 2;
    }

    function inicioMeta(lab) {
        const pts = puntosPath(lab && lab.path);
        const meta = metaFija();
        if (pts.length < 2) {
            return {
                inicio: { x: 10, y: 78 },
                meta: meta,
                pts: pts
            };
        }
        return {
            inicio: { x: pts[0].x, y: pts[0].y },
            meta: meta,
            pts: pts
        };
    }

    /* ── Canvas / dibujo ──────────────────────────────────────── */

    function aNorm(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100
        };
    }

    function px(n, eje) {
        return eje === "x"
            ? (n / 100) * canvas.width
            : (n / 100) * canvas.height;
    }

    function aplicarEstiloAro() {
        // Posición/tamaño del aro: solo CSS (.aro-conjunto, .aro-base, .aro-img).
        // Aquí solo se asegura la fuente de la base.
        if (aroBaseEl) {
            const baseSrc = (cfgAro().base) || "images/base.png";
            if (aroBaseEl.getAttribute("src") !== baseSrc) {
                aroBaseEl.src = baseSrc;
            }
        }
    }

    function sincronizarRutasConAro() {
        if (!recorridos.length) return;
        recorridos.forEach(function (lab) {
            lab.path = anclarExtremosOrtogonales(lab.path);
        });
    }

    function mostrarAroNormal() {
        encestando = false;
        if (aroConjuntoEl) aroConjuntoEl.classList.remove("is-enceste");
        if (aroImgEl) {
            aroImgEl.hidden = false;
            aroImgEl.style.visibility = "";
            aroImgEl.src = (cfgAro().imagen) || "images/aro.gif";
        }
        if (aroEncesteEl) {
            aroEncesteEl.hidden = true;
        }
        if (aroBaseEl) {
            aroBaseEl.hidden = false;
            aroBaseEl.src = (cfgAro().base) || "images/base.png";
        }
    }

    function reiniciarGifEnceste() {
        if (!aroEncesteEl) return;
        const src = (cfgAro().imagenEnceste) || "images/aro2.gif";
        aroEncesteEl.hidden = false;
        aroEncesteEl.style.visibility = "visible";
        // Reinicia la animación desde caché (sin ?play=… que forzaba redescarga).
        try {
            aroEncesteEl.removeAttribute("src");
            // eslint-disable-next-line no-unused-expressions
            aroEncesteEl.offsetWidth;
        } catch (e) { /* noop */ }
        aroEncesteEl.src = src;
    }

    function mostrarAroEnceste() {
        return new Promise(function (resolve) {
            const a = cfgAro();
            const ms = Number(a.msEnceste != null ? a.msEnceste : 1800);
            encestando = true;

            if (aroConjuntoEl) aroConjuntoEl.classList.add("is-enceste");
            if (aroImgEl) aroImgEl.hidden = true;
            if (aroBaseEl) aroBaseEl.hidden = false;

            reiniciarGifEnceste();

            if (pelotaDentroDelAro(pelota)) {
                pelotaVisible = false;
                posicionarPelotaDom();
            }
            programarRedibujo();
            setTimeout(resolve, ms);
        });
    }

    function urlsGifsCriticos() {
        const a = cfgAro();
        const fb = (gameConfig && gameConfig.feedback) || {};
        return [
            a.imagen || "images/aro.gif",
            a.imagenEnceste || "images/aro2.gif",
            (fb.acierto && fb.acierto.gif) || "../../images/correcto.gif",
            (fb.error && fb.error.gif) || "../../images/incorrecto.gif"
        ].filter(Boolean);
    }

    /** Precarga GIFs vía CSS (content:url) — mismo patrón que Laberintos. */
    function preloadGifsEnCSS(urls) {
        const lista = [];
        (urls || []).forEach(function (u) {
            if (u && lista.indexOf(u) === -1) lista.push(u);
        });
        if (!lista.length) return;
        let style = document.getElementById("preload-gifs-juego");
        if (!style) {
            style = document.createElement("style");
            style.id = "preload-gifs-juego";
            document.head.appendChild(style);
        }
        style.textContent =
            "body::after{content:" +
            lista.map(function (u) { return 'url("' + u + '")'; }).join(" ") +
            ";position:absolute;width:0;height:0;overflow:hidden;opacity:0;" +
            "pointer-events:none;z-index:-1;}";
    }

    function precargarGifsJuego() {
        const urls = urlsGifsCriticos();
        preloadGifsEnCSS(urls);

        const encesteSrc = (cfgAro().imagenEnceste) || "images/aro2.gif";
        return new Promise(function (resolve) {
            if (!aroEncesteEl) {
                gifEncesteListo = true;
                resolve(null);
                return;
            }
            aroEncesteEl.hidden = true;
            const done = function () {
                gifEncesteListo = true;
                imagenesPrecargadas[encesteSrc] = aroEncesteEl;
                resolve(aroEncesteEl);
            };
            if (aroEncesteEl.complete && aroEncesteEl.naturalWidth) {
                done();
                return;
            }
            aroEncesteEl.onload = function () {
                aroEncesteEl.onload = null;
                done();
            };
            aroEncesteEl.onerror = function () {
                aroEncesteEl.onerror = null;
                resolve(null);
            };
            if (aroEncesteEl.getAttribute("src") !== encesteSrc) {
                aroEncesteEl.src = encesteSrc;
            } else if (aroEncesteEl.complete) {
                done();
            }
        });
    }

    function cargarImagenes() {
        if (imagenesPromise) return imagenesPromise;
        const pel = (gameConfig && gameConfig.pelota) || {};
        if (pelotaEl) {
            pelotaEl.src = (pel.imagen) || "images/balon.png";
        }
        mostrarAroNormal();
        aplicarFondoEscenario();
        imagenesPromise = precargarGifsJuego();
        return imagenesPromise;
    }

    function posicionarPelotaDom() {
        if (!pelotaEl) return;
        // Solo se oculta cuando ya entró más del 50% al centro del aro (enceste).
        if (!pelotaVisible) {
            pelotaEl.hidden = true;
            return;
        }
        pelotaEl.hidden = false;
        pelotaEl.style.width = anchoPelota() + "%";
        pelotaEl.style.left = pelota.x + "%";
        pelotaEl.style.top = pelota.y + "%";
    }

    function lerpColor(hexA, hexB, t) {
        function parse(h) {
            const s = String(h || "").replace("#", "");
            return [
                parseInt(s.slice(0, 2), 16),
                parseInt(s.slice(2, 4), 16),
                parseInt(s.slice(4, 6), 16)
            ];
        }
        const a = parse(hexA);
        const b = parse(hexB);
        const u = clamp(t, 0, 1);
        const r = Math.round(a[0] + (b[0] - a[0]) * u);
        const g = Math.round(a[1] + (b[1] - a[1]) * u);
        const bl = Math.round(a[2] + (b[2] - a[2]) * u);
        return "rgb(" + r + "," + g + "," + bl + ")";
    }

    function dibujarPolilinea(pts, color, anchoPct, dashed) {
        if (!pts || pts.length < 2 || !ctx) return;
        const w = px(anchoPct, "y");
        if (!isFinite(w) || w <= 0) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash(dashed ? [18, 16] : []);
        ctx.beginPath();
        const x0 = px(pts[0].x, "x");
        const y0 = px(pts[0].y, "y");
        if (!isFinite(x0) || !isFinite(y0)) {
            ctx.restore();
            return;
        }
        ctx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) {
            const x = px(pts[i].x, "x");
            const y = px(pts[i].y, "y");
            if (!isFinite(x) || !isFinite(y)) continue;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    function redibujar() {
        if (!canvas || !ctx) return;
        if (canvas.width < 8 || canvas.height < 8) return;
        const lab = recorridoActual();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (lab) {
            const geo = inicioMeta(lab);
            const cols = coloresCamino();
            const ancho = anchoCamino();
            const borde = ancho + 1.6;
            // Toda la red (principal + distractores) en capas:
            // primero paredes, luego relleno → cruces sin “costura”.
            const red = [geo.pts].concat(
                (lab.distractores || []).map(puntosPath).filter(function (pts) {
                    return pts.length >= 2;
                })
            );
            red.forEach(function (pts) {
                dibujarPolilinea(pts, cols.borde, borde, false);
            });
            red.forEach(function (pts) {
                dibujarPolilinea(pts, cols.linea, ancho, false);
            });
        }

        posicionarPelotaDom();
    }

    function ajustarCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) {
            // Aún no hay layout visible (p. ej. durante fadeIn).
            return false;
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        aplicarEstiloAro();
        sincronizarRutasConAro();
        const lab = recorridoActual();
        if (lab && !arrastrando && !esperandoFeedback && !encestando && !demoActiva) {
            const geo = inicioMeta(lab);
            pelota = { x: geo.inicio.x, y: geo.inicio.y };
            ultimoValido = { x: geo.inicio.x, y: geo.inicio.y };
            pelotaVisible = true;
        }
        redibujar();
        return true;
    }

    function programarRedibujo() {
        if (redrawPendiente) return;
        redrawPendiente = true;
        rafId = requestAnimationFrame(function () {
            redrawPendiente = false;
            redibujar();
        });
    }

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el || !recorridos.length) return;
        el.hidden = false;
        if (esRecorridoDemo()) {
            el.innerHTML = '<i class="fa-solid fa-eye"></i> Demo';
            return;
        }
        const reales = recorridos.filter(function (r) { return !r.esDemo; });
        const idxReal = reales.indexOf(recorridoActual());
        const n = idxReal >= 0 ? idxReal + 1 : 1;
        el.innerHTML = '<i class="fa-solid fa-circle"></i> ' +
            n + " / " + reales.length;
    }

    function resetPelotaEnInicio() {
        const lab = recorridoActual();
        if (!lab) return;
        detenerDemostracion();
        lab.path = anclarExtremosOrtogonales(lab.path);
        const geo = inicioMeta(lab);
        // Pelota exactamente en el primer punto de la línea.
        pelota = { x: geo.inicio.x, y: geo.inicio.y };
        ultimoValido = { x: geo.inicio.x, y: geo.inicio.y };
        progresoCamino = 0;
        alertaDesvio = 0;
        pelotaVisible = true;
        arrastrando = false;
        pointerId = null;
        if (canvas) canvas.classList.remove("arrastrando");
        ritmoFondoAlerta(false);
        mostrarAroNormal();
        mostrarInstruccionBase();
        programarRedibujo();
    }

    function cargarRecorridoActual() {
        esperandoFeedback = false;
        resetPelotaEnInicio();
        actualizarProgreso();
        if (esRecorridoDemo()) {
            // Espera un frame de layout antes de animar.
            requestAnimationFrame(function () {
                iniciarDemostracion();
            });
        }
    }

    function falloCamino(msg, opts) {
        if (esperandoFeedback || juegoTerminado || demoActiva || esRecorridoDemo()) return;
        esperandoFeedback = true;
        arrastrando = false;
        pointerId = null;
        if (canvas) canvas.classList.remove("arrastrando");

        alertaDesvio = 1;
        programarRedibujo();
        pelota = { x: ultimoValido.x, y: ultimoValido.y };
        alertaDesvio = 0;
        pelotaVisible = true;
        programarRedibujo();
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);

        const mensaje = msg || textos().error || "¡Inténtalo otra vez! Sigue la línea con cuidado.";
        // Si ya habló el aviso de salida, no repetir TTS en el feedback.
        mostrarFeedback("error", mensaje, { silencio: !!(opts && opts.silencio) }).then(function () {
            esperandoFeedback = false;
            alertaDesvio = 0;
            ritmoFondoAlerta(false);
            programarRedibujo();
        });
    }

    function avanzarRecorrido() {
        indiceRecorrido += 1;
        if (indiceRecorrido >= recorridos.length) {
            terminarJuego();
            return;
        }
        cargarRecorridoActual();
    }

    function exitoMeta() {
        if (esperandoFeedback || juegoTerminado) return;
        if (esRecorridoDemo() || demoActiva) return;
        esperandoFeedback = true;
        arrastrando = false;
        pointerId = null;
        if (canvas) canvas.classList.remove("arrastrando");

        const lab = recorridoActual();
        const geo = inicioMeta(lab);
        // Lleva el balón al centro del aro; se oculta solo si ya entró >50%.
        pelota = { x: geo.meta.x, y: geo.meta.y };
        alertaDesvio = 0;
        if (pelotaDentroDelAro(pelota)) {
            pelotaVisible = false;
        }
        programarRedibujo();

        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        const mensaje = textos().acierto || "¡Muy bien! Llevaste la pelota hasta la canasta.";

        mostrarAroEnceste().then(function () {
            pelotaVisible = false;
            posicionarPelotaDom();
            return mostrarFeedback("acierto", mensaje);
        }).then(function () {
            esperandoFeedback = false;
            avanzarRecorrido();
        });
    }

    function terminarJuego() {
        if (juegoTerminado) return;
        juegoTerminado = true;
        detenerDemostracion();
        if (typeof Swal !== "undefined") Swal.close();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
        const cierre = textos().cierre || "¡Excelente! Completaste los recorridos.";
        if (feedbackActivo()) {
            TextoVoz.hablar(cierre, Math.random() < 0.5 ? "zoe" : "zeus");
        }
        setTimeout(function () {
            const caja = document.getElementById("final");
            const texto = document.getElementById("texto_final");
            if (texto) texto.textContent = cierre;
            if (caja) {
                caja.hidden = false;
                caja.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") {
                iniciarSecuenciaVictoria();
            } else if (typeof iniciarVictoria === "function") {
                iniciarVictoria();
            }
        }, 400);
    }

    function cercaDePelota(p) {
        return dist(p, pelota) <= radioPelota() * 2.4;
    }

    function limiteSalida() {
        // Fallo en cuanto el borde del balón toca el borde de la pista.
        const half = anchoCamino() / 2;
        return Math.max(0.15, half - radioPelota());
    }

    function moverPelotaA(p) {
        const lab = recorridoActual();
        if (!lab) return;
        const half = anchoCamino() / 2;
        const limite = limiteSalida();
        const red = redDePasillos(lab);
        const proy = proyectarEnRed(p, red);
        if (!proy) return;

        const desvio = proy.dist;
        // Empieza a salir = borde del balón cruza el borde de la pista.
        const empiezaASalir = desvio > limite;

        // Color + texto + voz de aviso lo antes posible.
        const avisoVisual = Math.max(0.05, limite * 0.55);
        alertaDesvio = empiezaASalir
            ? 1
            : (desvio >= avisoVisual
                ? clamp((desvio - avisoVisual) / Math.max(0.001, limite - avisoVisual), 0, 1)
                : 0);

        if (alertaDesvio > 0) {
            avisarSaliendo();
        } else {
            limpiarAvisoSaliendo();
        }

        if (empiezaASalir) {
            // Ya sonó en avisarSaliendo(); no repetir TTS del feedback.
            falloCamino(mensajeSaliendo(), { silencio: true });
            return;
        }

        pelota = { x: p.x, y: p.y };
        if (desvio <= half) {
            ultimoValido = { x: proy.punto.x, y: proy.punto.y };
            progresoCamino = proy.progreso || 0;
        }
        programarRedibujo();

        if (pelotaEnZonaAro(pelota)) {
            exitoMeta();
        }
    }

    function onPointerDown(ev) {
        if (esperandoFeedback || juegoTerminado || demoActiva || esRecorridoDemo()) return;
        const lab = recorridoActual();
        if (!lab) return;
        const p = aNorm(ev.clientX, ev.clientY);

        if (acc().modoTap) {
            moverPelotaA(p);
            ev.preventDefault();
            return;
        }

        if (!cercaDePelota(p)) return;
        arrastrando = true;
        pointerId = ev.pointerId;
        canvas.setPointerCapture(ev.pointerId);
        canvas.classList.add("arrastrando");
        ev.preventDefault();
    }

    function onPointerMove(ev) {
        if (acc().modoTap || demoActiva || esRecorridoDemo()) return;
        if (!arrastrando || ev.pointerId !== pointerId) return;
        if (esperandoFeedback || juegoTerminado) return;
        moverPelotaA(aNorm(ev.clientX, ev.clientY));
        ev.preventDefault();
    }

    function onPointerUp(ev) {
        if (acc().modoTap || demoActiva || esRecorridoDemo()) return;
        if (ev.pointerId !== pointerId) return;
        const estaba = arrastrando;
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }

        if (!estaba || esperandoFeedback || juegoTerminado) return;

        const lab = recorridoActual();
        if (lab) {
            if (pelotaEnZonaAro(pelota)) {
                exitoMeta();
                return;
            }
        }

        if (nivelElegido && nivelElegido.soltarEsFallo) {
            falloCamino("¡No sueltes! Sigue el camino sin levantar el dedo.");
        }
    }

    function enlazarCanvas() {
        canvas = document.getElementById("lienzo");
        ctx = canvas.getContext("2d");
        pelotaEl = document.getElementById("pelota-img");
        aroImgEl = document.getElementById("aro-img");
        aroEncesteEl = document.getElementById("aro-enceste");
        aroBaseEl = document.getElementById("aro-base");
        aroConjuntoEl = document.getElementById("aro-conjunto");
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        window.addEventListener("resize", function () {
            ajustarCanvas();
        });
        if (typeof ResizeObserver !== "undefined") {
            const wrap = document.getElementById("lienzo-wrap");
            if (wrap) {
                const ro = new ResizeObserver(function () {
                    ajustarCanvas();
                });
                ro.observe(wrap);
            }
        }
        ajustarCanvas();
    }

    function resolverNivel(edad) {
        const niveles = (gameConfig && gameConfig.niveles) || [];
        if (!niveles.length) return null;
        const raw = edad == null ? "" : String(edad).trim().toLowerCase();
        if (!raw) return niveles[0];

        const porEtiqueta = niveles.find(function (n) {
            return String(n.edad || "").toLowerCase() === raw;
        });
        if (porEtiqueta) return porEtiqueta;

        const num = parseInt(raw, 10);
        if (isFinite(num)) {
            if (num <= 3) return niveles.find(function (n) { return String(n.id) === "3"; }) || niveles[0];
            if (num === 4) return niveles.find(function (n) { return String(n.id) === "4"; }) || niveles[0];
            return niveles.find(function (n) { return String(n.id) === "5"; }) || niveles[niveles.length - 1];
        }

        return niveles.find(function (n) { return String(n.id) === raw; }) || niveles[0];
    }

    function iniciarPartida() {
        juegoTerminado = false;
        indiceRecorrido = 0;
        nivelElegido = resolverNivel(gameConfig.edad);
        if (!nivelElegido) {
            console.warn("[CoordinacionVisual] Sin nivel configurado");
            return;
        }
        recorridos = generarRecorridosNivel(nivelElegido);
        cargarImagenes().then(function () {
            function intentarLayout(intento) {
                if (ajustarCanvas()) {
                    sincronizarRutasConAro();
                    cargarRecorridoActual();
                    return;
                }
                if (intento < 30) {
                    setTimeout(function () { intentarLayout(intento + 1); }, 50);
                } else {
                    cargarRecorridoActual();
                    ajustarCanvas();
                }
            }
            requestAnimationFrame(function () { intentarLayout(0); });
        });
    }

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        sincronizarDialogoIntro3d();
        aplicarAccesibilidadInicial();

        try {
            const rutaJson = (gameConfig && gameConfig.rutasFijas) || "rutas-fijas.json";
            rutasFijas = JSON.parse(readText(rutaJson));
        } catch (e) {
            rutasFijas = null;
            console.warn("[CoordinacionVisual] No se pudieron cargar rutas fijas", e);
        }

        // Precarga temprana: enceste, acierto y error (evita corte la 1ª vez).
        pelotaEl = document.getElementById("pelota-img");
        aroImgEl = document.getElementById("aro-img");
        aroEncesteEl = document.getElementById("aro-enceste");
        aroBaseEl = document.getElementById("aro-base");
        aroConjuntoEl = document.getElementById("aro-conjunto");
        cargarImagenes();

        if (window.speechSynthesis) {
            try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
            window.speechSynthesis.addEventListener("voiceschanged", function () {
                window.speechSynthesis.getVoices();
            });
        }

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100
        });

        enlazarMenuVol();
        enlazarMenuAcc();
        enlazarCanvas();

        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

        const btnEmpecemos = document.getElementById("btn-empecemos");
        if (btnEmpecemos) btnEmpecemos.addEventListener("click", empecemosJuego);

        const btnOmitirIntro = document.getElementById("btn-omitir-intro3d");
        if (btnOmitirIntro) btnOmitirIntro.addEventListener("click", omitirIntro3d);

        const btnContinuarIntro = document.getElementById("btn-continuar-intro3d");
        if (btnContinuarIntro) {
            btnContinuarIntro.addEventListener("click", function (ev) {
                ev.preventDefault();
                empezarJuegoTrasIntro();
            });
        }

        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") {
                window.__PEDNIA_PERFIL__ = ev.data.perfil;
            }
        });
    });
})();
