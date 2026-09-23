let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let nubePersonajeActual = null;
let introTimers = [];

let cuerpoElegido = null;
let nivelElegido = null;
let preguntas = [];
let indicePregunta = 0;
let fallosPregunta = 0;
let juegoTerminado = false;
let tableroListo = false;
let esperandoFeedback = false;
let audioFondo = null;

function readText(ruta_local) {
    var texto = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", ruta_local, false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
        texto = xmlhttp.responseText;
    }
    return texto;
}

function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function cancelarIntroPendiente() {
    introTimers.forEach(function (id) {
        clearTimeout(id);
        clearInterval(id);
    });
    introTimers = [];
}

let introDesdeEmpecemos = false;

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

    window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
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
    document.body.classList.remove("esperando-inicio");
    $("#principal").css("display", "flex").hide().fadeIn(800);
    elegirCuerpo();
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
    introDesdeEmpecemos = true;
    mostrarIntro3d();

    let oculto = false;
    const ocultarPantalla = function () {
        if (oculto) return;
        oculto = true;
        pantalla.hidden = true;
        document.body.classList.remove("esperando-inicio");
    };
    pantalla.addEventListener("animationend", function (ev) {
        if (ev.animationName === "inicioDisuelve") ocultarPantalla();
    });
    setTimeout(ocultarPantalla, 1250);
}

function cerrar_anuncio() {
    empezarJuegoTrasIntro();
}


function reproducirAudio(ruta, volumen, loop) {
    if (!ruta) return null;
    try {
        const audio = new Audio(ruta);
        audio.volume = volumen != null ? volumen : 1;
        audio.loop = !!loop;
        const playPromise = audio.play();
        if (playPromise && playPromise.catch) playPromise.catch(function () {});
        if (loop) audioFondo = audio;
        return audio;
    } catch (e) {
        return null;
    }
}

function asegurarAudioFondo() {
    if (audioFondo) {
        const p = audioFondo.play();
        if (p && typeof p.catch === "function") p.catch(function () { /* noop */ });
        return audioFondo;
    }
    return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, volumenFondoPct() / 100, true);
}

function acc() {
    return gameConfig.accesibilidad || {};
}

function volumenFondoPct() {
    const n = Number(acc().volumenFondo);
    if (!isFinite(n)) return 20;
    return Math.max(0, Math.min(100, n));
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
        icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
    }
}

function setMenuVol(abierto) {
    const panel = document.getElementById("menu-vol-panel");
    const btn = document.getElementById("btn-menu-vol");
    if (!panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
}

function pintarMenuVol() {
    const pct = volumenFondoPct();
    const slider = document.getElementById("rango-volumen");
    const val = document.getElementById("vol-val");
    if (slider) slider.value = String(pct);
    if (val) val.textContent = String(pct);
    aplicarVolumenCalibrado(pct);
}

const ACC_OPCIONES = [
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarZonas", label: "Mostrar zonas" },
    { key: "resaltarObjetivo", label: "Resaltar objetivo" },
    { key: "pistaPorFallos", label: "Pistas por errores" },
    { key: "mostrarProgreso", label: "Mostrar progreso" },
];

function setMenuAcc(abierto) {
    const panel = document.getElementById("menu-acc-panel");
    const btn = document.getElementById("btn-menu-acc");
    if (!panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    if (abierto && typeof setMenuVol === "function") setMenuVol(false);
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
            aplicarAccesibilidadInicial();
        });
        ops.appendChild(lab);
    });
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
        aplicarAccesibilidadInicial();
    });
    rango.appendChild(slider);
    ops.appendChild(rango);
}

function enlazarMenuAcc() {
    const btn = document.getElementById("btn-menu-acc");
    const cerrar = document.getElementById("btn-cerrar-acc");
    if (btn) {
        btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-acc-panel");
            setMenuAcc(panel && panel.hidden);
        });
    }
    if (cerrar) cerrar.addEventListener("click", function () { setMenuAcc(false); });
    document.addEventListener("pointerdown", function (ev) {
        const menu = document.getElementById("menu-acc");
        if (menu && !menu.contains(ev.target)) setMenuAcc(false);
    });
    pintarMenuAcc();
}

function enlazarMenuVol() {
    const btn = document.getElementById("btn-menu-vol");
    const cerrar = document.getElementById("btn-cerrar-vol");
    const slider = document.getElementById("rango-volumen");
    if (btn) {
        btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-vol-panel");
            const open = panel && panel.hidden;
            setMenuVol(open);
            if (open && typeof setMenuAcc === "function") setMenuAcc(false);
        });
    }
    if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
    if (slider) {
        slider.addEventListener("input", function () {
            const n = Number(slider.value);
            const val = document.getElementById("vol-val");
            if (val) val.textContent = String(n);
            aplicarVolumenCalibrado(n);
        });
    }
    document.addEventListener("pointerdown", function (ev) {
        const menu = document.getElementById("menu-vol");
        if (menu && !menu.contains(ev.target)) setMenuVol(false);
    });
    pintarMenuVol();
}

function pxCero(valor, fallback) {
    const n = Number(valor);
    if (!isFinite(n) || n < 0) return fallback;
    return n + "px";
}

function aplicarLetterSpacing() {
    document.documentElement.style.setProperty("--mc-letter-spacing", pxCero(acc().letterSpacing, "2px"));
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = preguntas.length;
    el.hidden = !acc().mostrarProgreso || !tableroListo || !total;
    el.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> ' + Math.min(indicePregunta + 1, total) + " / " + total;
}

function aplicarAccesibilidadInicial() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    document.body.classList.toggle("mostrar-zonas", !!a.mostrarZonas);
    aplicarLetterSpacing();
    actualizarProgreso();
}

function cuerpoActual() {
    return gameConfig.cuerpos[cuerpoElegido];
}

function rutaCompleto() {
    const c = cuerpoActual();
    return c.carpeta + "/" + (c.completo || "completo.png");
}

function preguntaActual() {
    return preguntas[indicePregunta] || null;
}

function elegirCuerpo() {
    const textos = gameConfig.textos;
    const cuerpos = gameConfig.cuerpos;
    TextoVoz.hablar(textos.eligeCuerpo, "zoe");
    Swal.fire({
        title: textos.eligeCuerpo,
        html:
            '<hr><div class="row">' +
            '<div class="col-6 text-center"><button class="btn btn-warning btn-eleccion" onclick="confirmarCuerpo(\'nina\')">' + cuerpos.nina.nombre + '</button></div>' +
            '<div class="col-6 text-center"><button class="btn btn-info btn-eleccion" onclick="confirmarCuerpo(\'nino\')">' + cuerpos.nino.nombre + '</button></div>' +
            "</div><hr>",
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        heightAuto: false,
        scrollbarPadding: false
    });
}

function confirmarCuerpo(tipo) {
    cuerpoElegido = tipo;
    Swal.close();
    setTimeout(function () {
        PedniaEdad.iniciarNivel({
            niveles: (gameConfig && gameConfig.niveles) || [],
            elegirManual: elegirNivel,
            onElegido: function (nivel) {
                if (nivel) window.confirmarNivel(nivel.id);
            }
        });
    }, 50);
}
window.confirmarCuerpo = confirmarCuerpo;

function elegirNivel() {
    const textos = gameConfig.textos;
    let botones = "";
    gameConfig.niveles.forEach(function (nivel, i) {
        const color = i === 0 ? "success" : i === 1 ? "warning" : "primary";
        botones +=
            '<div class="col-4 text-center">' +
            '<button class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
            nivel.titulo + "<br><small>" + nivel.edad + "</small></button></div>";
    });

    TextoVoz.hablar(textos.eligeNivel, "zoe");
    Swal.fire({
        title: textos.eligeNivel,
        html: '<hr><div class="row">' + botones + "</div><hr>",
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        heightAuto: false,
        scrollbarPadding: false
    });
}

function confirmarNivel(id) {
    nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
    Swal.close();
    setTimeout(iniciarEscenario, 50);
}
window.confirmarNivel = confirmarNivel;

function iniciarEscenario() {
    juegoTerminado = false;
    esperandoFeedback = false;
    fallosPregunta = 0;
    indicePregunta = 0;
    preguntas = (nivelElegido && Array.isArray(nivelElegido.preguntas))
        ? nivelElegido.preguntas.slice()
        : [];

    const cuerpo = cuerpoActual();
    const src = rutaCompleto();
    const img = document.getElementById("img-completo");
    img.onload = function () {
        sizeLienzo();
    };
    img.src = src;
    img.alt = "Figura de " + (cuerpo.nombre || cuerpoElegido);

    sizeLienzo();
    armarZonas();
    document.getElementById("escenario").style.visibility = "visible";
    tableroListo = true;
    aplicarAccesibilidadInicial();
    mostrarPreguntaActual();
    cargarMascaraFigura(src);

    const wrap = document.querySelector(".lienzo-wrap");
    if (wrap && typeof ResizeObserver !== "undefined" && !wrap._obsLienzo) {
        wrap._obsLienzo = new ResizeObserver(function () {
            if (tableroListo) sizeLienzo();
        });
        wrap._obsLienzo.observe(wrap);
    }
}

function sizeLienzo() {
    const wrap = document.querySelector(".lienzo-wrap");
    const lienzo = document.getElementById("lienzo");
    const cuerpo = cuerpoActual();
    if (!wrap || !lienzo || !cuerpo || !cuerpo.lienzo) return;

    const ar = Number(cuerpo.lienzo.w) / Number(cuerpo.lienzo.h);
    const maxH = Math.max(120, wrap.clientHeight - 8);
    const maxW = Math.max(120, Math.min(wrap.clientWidth - 8, 480));
    let h = maxH;
    let w = h * ar;
    if (w > maxW) {
        w = maxW;
        h = w / ar;
    }
    lienzo.style.width = Math.floor(w) + "px";
    lienzo.style.height = Math.floor(h) + "px";
    lienzo.style.aspectRatio = "";
}

function armarZonas() {
    const contenedor = document.getElementById("zonas");
    contenedor.innerHTML = "";
    contenedor.removeAttribute("style");
    const mapa = (cuerpoActual() && cuerpoActual().zonas) || {};

    Object.keys(mapa).forEach(function (id) {
        const z = mapa[id];
        const el = document.createElement("div");
        el.className = "zona-toque";
        el.dataset.id = id;
        el.style.left = z.x + "%";
        el.style.top = z.y + "%";
        el.style.width = z.w + "%";
        el.style.height = z.h + "%";
        contenedor.appendChild(el);
    });
}

function limpiarEstadosZona() {
    document.querySelectorAll(".zona-toque").forEach(function (z) {
        z.classList.remove("objetivo", "pista", "acierto");
    });
}

function actualizarAyudasVisuales() {
    limpiarEstadosZona();
    const pregunta = preguntaActual();
    if (!pregunta || juegoTerminado) return;

    const targets = pregunta.targets || [];
    if (acc().resaltarObjetivo) {
        targets.forEach(function (id) {
            const el = document.querySelector('.zona-toque[data-id="' + id + '"]');
            if (el) el.classList.add("objetivo");
        });
    }

    const umbral = gameConfig.fallosParaPista || 2;
    if (acc().pistaPorFallos !== false && fallosPregunta >= umbral) {
        targets.forEach(function (id) {
            const el = document.querySelector('.zona-toque[data-id="' + id + '"]');
            if (el) el.classList.add("pista");
        });
    }
}

function mostrarPreguntaActual() {
    const pregunta = preguntaActual();
    const enunciado = document.getElementById("enunciado");
    if (!pregunta) {
        if (enunciado) enunciado.textContent = "";
        return;
    }
    if (enunciado) enunciado.textContent = pregunta.texto;
    TextoVoz.hablar(pregunta.texto, "zoe");
    fallosPregunta = 0;
    actualizarProgreso();
    actualizarAyudasVisuales();
    document.body.classList.remove("bloqueado");
}

let mascaraFigura = null;
let mascaraAncho = 0;
let mascaraAlto = 0;

function cargarMascaraFigura(src) {
    mascaraFigura = null;
    mascaraAncho = 0;
    mascaraAlto = 0;
    return new Promise(function (resolve) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                mascaraFigura = ctx.getImageData(0, 0, canvas.width, canvas.height);
                mascaraAncho = canvas.width;
                mascaraAlto = canvas.height;
            } catch (e) {
                mascaraFigura = null;
            }
            resolve();
        };
        img.onerror = function () {
            resolve();
        };
        img.src = src;
    });
}

function puntoEnImagen(clientX, clientY) {
    const img = document.getElementById("img-completo");
    if (!img || !img.naturalWidth) return null;
    const rect = img.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        return null;
    }
    return {
        x: ((clientX - rect.left) / rect.width) * img.naturalWidth,
        y: ((clientY - rect.top) / rect.height) * img.naturalHeight
    };
}

function pixelFiguraOpaco(ix, iy) {
    if (!mascaraFigura) return true;
    const x = Math.max(0, Math.min(mascaraAncho - 1, Math.floor(ix)));
    const y = Math.max(0, Math.min(mascaraAlto - 1, Math.floor(iy)));
    const i = (y * mascaraAncho + x) * 4;
    const r = mascaraFigura.data[i];
    const g = mascaraFigura.data[i + 1];
    const b = mascaraFigura.data[i + 2];
    const a = mascaraFigura.data[i + 3];
    return a >= 64 && (r + g + b) > 40;
}

function areaZona(id) {
    const z = cuerpoActual().zonas[id];
    if (!z) return Number.MAX_VALUE;
    return Number(z.w) * Number(z.h);
}

function zonasBajoPunto(clientX, clientY) {
    const extra = Number(acc().hitboxExtra || 0);
    const hits = [];

    document.querySelectorAll(".zona-toque").forEach(function (zona) {
        const r = zona.getBoundingClientRect();
        if (
            clientX >= r.left - extra &&
            clientX <= r.right + extra &&
            clientY >= r.top - extra &&
            clientY <= r.bottom + extra
        ) {
            hits.push({
                id: zona.dataset.id,
                area: areaZona(zona.dataset.id)
            });
        }
    });

    hits.sort(function (a, b) {
        return a.area - b.area;
    });
    return hits.map(function (h) {
        return h.id;
    });
}

function feedbackActivo() {
    return !gameConfig || gameConfig.mostrarFeedBack !== false;
}

function cfgFeedback(tipo) {
    const fb = (gameConfig && gameConfig.feedback) || {};
    const item = fb[tipo] || {};
    const ttxt = (gameConfig && gameConfig.textos) || {};
    const defaults = {
        acierto: { texto: "¡Muy bien! Encontraste la parte del cuerpo.", gif: "../../images/correcto.gif" },
        error: { texto: "¡Inténtalo otra vez! Observa muy bien la figura.", gif: "../../images/incorrecto.gif" }
    };
    const def = defaults[tipo] || {};
    return {
        texto: ttxt[tipo] || item.texto || def.texto || "",
        gif: item.gif || def.gif || "",
        duracion: fb.duracion || 1800
    };
}

/** Swal + TTS en errores. Acierto: solo sonido (caller). */
function mostrarFeedback(tipo) {
    if (tipo === "acierto") return Promise.resolve();
    if (!feedbackActivo()) {
        const cfgSilent = cfgFeedback(tipo);
        if (cfgSilent.texto && typeof TextoVoz !== "undefined") {
            return TextoVoz.hablar(cfgSilent.texto, tipo === "error" ? "zeus" : "zoe").catch(function () {});
        }
        return Promise.resolve();
    }
    const cfg = cfgFeedback(tipo);
    const pj = tipo === "error" ? "zeus" : "zoe";
    const minMs = cfg.duracion || 1800;
    const pVoz = (cfg.texto && typeof TextoVoz !== "undefined")
        ? TextoVoz.hablar(cfg.texto, pj)
        : Promise.resolve();
    const opts = {
        position: "center",
        title: cfg.texto,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        heightAuto: false,
        scrollbarPadding: false,
        width: 420,
        customClass: { popup: "modal-feedback" }
    };
    if (cfg.gif) {
        opts.imageUrl = cfg.gif.split("?")[0] + "?t=" + Date.now();
        opts.imageWidth = 250;
        opts.imageHeight = 250;
    }
    Swal.fire(opts);
    const topeMs = Math.max(minMs + 2500, 6000);
    return Promise.race([
        Promise.all([pVoz.catch(function () {}), sleep(minMs)]),
        sleep(topeMs)
    ]).then(function () {
        try { Swal.close(); } catch (e) { /* noop */ }
    }, function () {
        try { Swal.close(); } catch (e) { /* noop */ }
    });
}

function iluminarZonas(ids) {
    ids.forEach(function (id) {
        const el = document.querySelector('.zona-toque[data-id="' + id + '"]');
        if (el) {
            el.classList.remove("pista", "objetivo");
            el.classList.add("acierto");
        }
    });
}

function onToqueFigura(ev) {
    if (!tableroListo || juegoTerminado || esperandoFeedback) return;
    const pregunta = preguntaActual();
    if (!pregunta) return;

    const pt = puntoEnImagen(ev.clientX, ev.clientY);
    if (!pt) return;
    if (!pixelFiguraOpaco(pt.x, pt.y)) return;

    const ids = zonasBajoPunto(ev.clientX, ev.clientY);
    if (!ids.length) return;

    const targets = pregunta.targets || [];
    const acertadas = ids.filter(function (id) {
        return targets.indexOf(id) !== -1;
    });

    if (acertadas.length) {
        resolverAcierto([acertadas[0]]);
    } else {
        resolverError();
    }
}

function resolverAcierto(idsTocadas) {
    esperandoFeedback = true;
    document.body.classList.add("bloqueado");
    iluminarZonas(idsTocadas);
    reproducirAudio(gameConfig.audios && gameConfig.audios.acierto);
    mostrarFeedback("acierto").then(function () {
        indicePregunta += 1;
        esperandoFeedback = false;
        document.body.classList.remove("bloqueado");
        if (indicePregunta >= preguntas.length) {
            terminarJuego();
            return;
        }
        mostrarPreguntaActual();
    }).catch(function () {
        esperandoFeedback = false;
        document.body.classList.remove("bloqueado");
    });
}

function resolverError() {
    fallosPregunta += 1;
    actualizarAyudasVisuales();
    reproducirAudio(gameConfig.audios && gameConfig.audios.error);
    esperandoFeedback = true;
    document.body.classList.add("bloqueado");
    mostrarFeedback("error").then(function () {
        esperandoFeedback = false;
        document.body.classList.remove("bloqueado");
        actualizarAyudasVisuales();
    }).catch(function () {
        esperandoFeedback = false;
        document.body.classList.remove("bloqueado");
    });
}

function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    const cierre = (gameConfig.textos && gameConfig.textos.cierre) || "";
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

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
    aplicarAccesibilidadInicial();
    TextoVoz.iniciar(gameConfig, introConfig, {
        obtenerAudioFondo: function () { return audioFondo; },
        volumenFondo: volumenFondoPct() / 100
    });
    enlazarMenuVol();
    enlazarMenuAcc();
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

    const lienzo = document.getElementById("lienzo");
    lienzo.addEventListener("pointerup", onToqueFigura);

    document.getElementById("escenario").style.visibility = "hidden";

    const btnEmpecemos = document.getElementById("btn-empecemos");
    if (btnEmpecemos) btnEmpecemos.addEventListener("click", empecemosJuego);

    sincronizarDialogoIntro3d();
    const btnOmitirIntro = document.getElementById("btn-omitir-intro3d");
    if (btnOmitirIntro) {
        btnOmitirIntro.addEventListener("click", omitirIntro3d);
    }
    const btnContinuarIntro = document.getElementById("btn-continuar-intro3d");
    if (btnContinuarIntro) {
        btnContinuarIntro.addEventListener("click", function (ev) {
            ev.preventDefault();
            empezarJuegoTrasIntro();
        });
    }
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
});
