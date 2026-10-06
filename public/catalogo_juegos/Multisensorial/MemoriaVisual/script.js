let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introTimers = [];
let audioFondo = null;

let nivelElegido = null;
let rondas = [];
let rondaActual = 0;
let juegoTerminado = false;
let esperandoRespuesta = false;
let mostrandoMemoria = false;
let marcandoRespuesta = false;
let fallosRonda = 0;
let observaDicha = false;
let seleccionCambio = [];
let timerEntrada = null;

const TIPOS_RONDA = ["nuevo", "falta", "cambio"];

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

function acc() {
    return (gameConfig && gameConfig.accesibilidad) || {};
}

function textos() {
    return (gameConfig && gameConfig.textos) || {};
}

function textoNivel(clave) {
    const propios = (nivelElegido && nivelElegido.textos) || {};
    return propios[clave] || textos()[clave] || "";
}

function cancelarIntroPendiente() {
    introTimers.forEach(function (id) {
        clearTimeout(id);
        clearInterval(id);
    });
    introTimers = [];
}

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};

    const conversacion = textos().conversacion || [];
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
window.cerrar_anuncio = cerrar_anuncio;

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
    return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, TextoVoz.VOLUMEN_FONDO, true);
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
    { key: "mostrarFeedBack", label: "Mostrar feedback" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "verBotonVerDeNuevo", label: "Botón ver de nuevo" },
    { key: "cuentaRegresiva", label: "Cuenta 3-2-1" },
    { key: "animaciones_opciones", label: "Animar objetos" },
    { key: "mostrarNombres", label: "Mostrar nombres" },
    { key: "mostrarProgreso", label: "Mostrar progreso" }
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
        aplicarVisual();
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
            if (open) setMenuAcc(false);
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

function aplicarAccesibilidadInicial() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    document.body.classList.toggle("sin-nombres", a.mostrarNombres === false);
    const btnVer = document.getElementById("btn-ver");
    if (btnVer) btnVer.hidden = !a.verBotonVerDeNuevo;
    aplicarVisual();
    actualizarProgreso();
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = rondas.length;
    el.hidden = !acc().mostrarProgreso || !total || juegoTerminado;
    el.innerHTML = '<i class="fa-solid fa-brain"></i> ' + Math.min(rondaActual + 1, total) + " / " + total;
}

function px(valor, fallback) {
    const n = Number(valor);
    if (!isFinite(n) || n <= 0) return fallback;
    return n + "px";
}

function pxCero(valor, fallback) {
    const n = Number(valor);
    if (!isFinite(n) || n < 0) return fallback;
    return n + "px";
}

function aplicarVisual() {
    const v = acc();
    const root = document.documentElement;
    root.style.setProperty("--mv-img", px(v.tamanoImagen, "130px"));
    root.style.setProperty("--mv-img-opcion", px(v.tamanoImagenOpcion, "110px"));
    root.style.setProperty("--mv-letra", px(v.tamanoLetraBotones, "22px"));
    root.style.setProperty("--mv-letter-spacing", pxCero(v.letterSpacing, "2px"));
    root.style.setProperty("--mv-gap", px(v.espaciadoOpciones, "22px"));
}

function iniciarPartida() {
    PedniaEdad.iniciarNivel({
        niveles: (gameConfig && gameConfig.niveles) || [],
        elegirManual: elegirNivel,
        onElegido: function (nivel) {
            if (nivel) window.confirmarNivel(nivel.id);
        }
    });
}

function elegirNivel() {
    const t = textos();
    let botones = "";
    (gameConfig.niveles || []).forEach(function (nivel, i) {
        const color = i === 0 ? "success" : i === 1 ? "warning" : "primary";
        botones +=
            '<div class="col-12 text-center mb-2">' +
            '<button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
            "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
    });
    const titulo = t.eligeNivel || "Elige tu edad";
    TextoVoz.hablar(titulo, "zoe");
    Swal.fire({
        title: titulo,
        html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        heightAuto: false,
        scrollbarPadding: false,
        width: 420
    });
}

function normalizarRondas(nivel) {
    const objetos = (gameConfig && gameConfig.objetos) || {};
    return ((nivel && nivel.rondas) || []).map(function (r) {
        const ronda = Object.assign({}, r);
        if (TIPOS_RONDA.indexOf(ronda.tipo) === -1) ronda.tipo = "nuevo";
        ronda.objetos = (ronda.objetos || []).filter(function (id) { return !!objetos[id]; });
        return ronda;
    }).filter(function (r) {
        if (!r.objetos.length) return false;
        if (r.tipo === "nuevo") return !!objetos[r.nuevo] && r.objetos.indexOf(r.nuevo) === -1;
        if (r.tipo === "falta") return r.objetos.indexOf(r.falta) !== -1;
        return Array.isArray(r.intercambio) && r.intercambio.length === 2 &&
            r.objetos.indexOf(r.intercambio[0]) !== -1 && r.objetos.indexOf(r.intercambio[1]) !== -1;
    });
}

function confirmarNivel(id) {
    nivelElegido = (gameConfig.niveles || []).find(function (n) {
        return String(n.id) === String(id);
    });
    Swal.close();
    if (!nivelElegido) return;
    rondas = normalizarRondas(nivelElegido);
    rondaActual = 0;
    juegoTerminado = false;
    observaDicha = false;
    fallosRonda = 0;
    precargarFrasesNivel();
    aplicarAccesibilidadInicial();
    if (acc().mostrarIntro && window.PedniaTutorial) {
        correrDemo().then(function () {
            if (!juegoTerminado) iniciarRonda();
        });
        return;
    }
    iniciarRonda();
}
window.confirmarNivel = confirmarNivel;

function precargarFrasesNivel() {
    if (typeof TextoVoz === "undefined" || typeof TextoVoz.encolarFrases !== "function") return;
    const propios = (nivelElegido && nivelElegido.textos) || {};
    const frases = Object.keys(propios).map(function (k) {
        return { texto: propios[k], personaje: "zoe" };
    });
    if (frases.length) TextoVoz.encolarFrases(frases);
}

function hablarZoe(texto) {
    if (!texto || typeof TextoVoz === "undefined") return Promise.resolve();
    return TextoVoz.hablar(texto, "zoe");
}

function feedbackActivo() {
    return acc().mostrarFeedBack !== false;
}

function hablarFeedback(texto) {
    if (!feedbackActivo()) return Promise.resolve();
    return hablarZoe(texto);
}

function datoObjeto(id) {
    return ((gameConfig && gameConfig.objetos) || {})[id] || { nombre: id, img: "img/" + id + ".png" };
}

function attrEsc(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

function htmlObjeto(id) {
    const o = datoObjeto(id);
    return '<img class="objeto-img" src="' + attrEsc(o.img) + '" alt="' + attrEsc(o.nombre) + '" draggable="false" onerror="this.classList.add(\'is-broken\')">' +
        '<span class="objeto-nombre">' + attrEsc(o.nombre) + "</span>";
}

function crearObjeto(id, opciones) {
    const op = opciones || {};
    const el = document.createElement(op.onClick ? "button" : "div");
    if (op.onClick) el.type = "button";
    el.className = "objeto" + (op.clase ? " " + op.clase : "");
    el.dataset.id = id;
    el.innerHTML = htmlObjeto(id);
    if (op.onClick) {
        el.addEventListener("click", function () { op.onClick(id, el); });
    }
    return el;
}

function animarEntrada(contenedor) {
    const hijos = contenedor.querySelectorAll(".objeto");
    if (!acc().animaciones_opciones) return 0;
    hijos.forEach(function (el, i) {
        el.classList.add("objeto-entra");
        el.style.animationDelay = (i * 120) + "ms";
        el.addEventListener("animationend", function fin(ev) {
            if (ev.animationName !== "objetoEntra") return;
            el.removeEventListener("animationend", fin);
            el.classList.remove("objeto-entra");
            el.style.animationDelay = "";
        });
    });
    return hijos.length * 120 + 420;
}

function pintarTablero(ids, opciones) {
    const op = opciones || {};
    const tablero = document.getElementById("tablero");
    tablero.className = "tablero" + (op.clase ? " " + op.clase : "");
    tablero.innerHTML = "";
    ids.forEach(function (id) {
        tablero.appendChild(crearObjeto(id, { onClick: op.onClick }));
    });
    return animarEntrada(tablero);
}

function pintarOpciones(ids, onClick) {
    const caja = document.getElementById("opciones");
    caja.hidden = false;
    caja.innerHTML = "";
    ids.forEach(function (id) {
        caja.appendChild(crearObjeto(id, { onClick: onClick, clase: "objeto-opcion" }));
    });
    return animarEntrada(caja);
}

function limpiarOpciones() {
    const caja = document.getElementById("opciones");
    caja.hidden = true;
    caja.innerHTML = "";
}

async function ocultarTablero() {
    const tablero = document.getElementById("tablero");
    tablero.classList.add("tablero-oculto");
    await sleep(380);
    tablero.innerHTML = "";
    tablero.classList.remove("tablero-oculto");
}

function habilitarRespuesta(retrasoMs) {
    if (timerEntrada) {
        clearTimeout(timerEntrada);
        timerEntrada = null;
    }
    if (!retrasoMs) {
        esperandoRespuesta = true;
        return;
    }
    esperandoRespuesta = false;
    timerEntrada = setTimeout(function () {
        timerEntrada = null;
        if (!juegoTerminado && !mostrandoMemoria) esperandoRespuesta = true;
    }, retrasoMs);
}

function setEnunciado(texto) {
    const el = document.getElementById("enunciado");
    if (el) el.innerHTML = texto || "";
}

function bloqueMemoria() {
    return document.querySelector(".memoria-bloque");
}

function barajar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

/** Baraja evitando que el objeto destacado quede siempre al final (pista involuntaria). */
function barajarSinPista(ids, destacado) {
    let lista = barajar(ids);
    for (let intento = 0; intento < 6 && ids.length > 2 && lista[lista.length - 1] === destacado; intento++) {
        lista = barajar(ids);
    }
    return lista;
}

function ordenIntercambiado(ronda) {
    const orden = ronda.objetos.slice();
    const a = orden.indexOf(ronda.intercambio[0]);
    const b = orden.indexOf(ronda.intercambio[1]);
    const t = orden[a];
    orden[a] = orden[b];
    orden[b] = t;
    return orden;
}

function msNivel(clave, fallback) {
    const n = Number(nivelElegido && nivelElegido[clave]);
    return isFinite(n) && n >= 0 ? n : fallback;
}

async function cuentaRegresiva() {
    const cuenta = document.getElementById("cuenta");
    const etiqueta = textos().seOcultan || "Los objetos se esconderán en...";
    cuenta.hidden = false;
    cuenta.innerHTML = '<span class="cuenta-label">' + etiqueta + "</span>";
    await hablarZoe(etiqueta);
    if (juegoTerminado) return;
    const segundos = 3;
    const espera = 3000;
    const fraseConteo = (typeof TextoVoz !== "undefined" && TextoVoz.textoConteo)
        ? TextoVoz.textoConteo(segundos)
        : "tres. dos. uno.";
    let resolverInicio = null;
    const audioInicio = new Promise(function (resolve) { resolverInicio = resolve; });
    const pVoz = (typeof TextoVoz !== "undefined")
        ? TextoVoz.hablar(fraseConteo, "zoe", {
            duracionMs: espera,
            onInicio: function () { if (resolverInicio) resolverInicio(); }
        })
        : (resolverInicio(), Promise.resolve());
    await audioInicio;
    for (let n = segundos; n >= 1; n--) {
        if (juegoTerminado) {
            if (typeof TextoVoz !== "undefined") TextoVoz.detener();
            return;
        }
        cuenta.innerHTML = '<span class="cuenta-label">' + etiqueta + "</span><strong>" + n + "</strong>";
        await sleep(Math.round(espera / segundos));
    }
    await pVoz;
    cuenta.hidden = true;
    cuenta.innerHTML = "";
}

/** Muestra los objetos a memorizar, cuenta y los esconde. */
async function faseMemoria(ronda) {
    mostrandoMemoria = true;
    esperandoRespuesta = false;
    const bloque = bloqueMemoria();
    if (bloque) bloque.classList.add("fase-memoria");
    limpiarOpciones();
    pintarTablero(ronda.objetos, { clase: "tablero-fila" });

    const texto = observaDicha ? textoNivel("memoriza") : textoNivel("observa");
    observaDicha = true;
    setEnunciado(texto);
    await hablarZoe(texto);
    if (juegoTerminado) return;

    if (acc().cuentaRegresiva !== false) {
        await cuentaRegresiva();
    } else {
        await sleep(msNivel("tiempoMemoria", 5000));
    }
    if (juegoTerminado) return;

    await ocultarTablero();
    if (bloque) bloque.classList.remove("fase-memoria");
    const cuenta = document.getElementById("cuenta");
    cuenta.hidden = true;
    cuenta.innerHTML = "";
    setEnunciado("");
    await sleep(msNivel("pausaOculto", 1500));
    mostrandoMemoria = false;
}

function preguntaDe(ronda) {
    if (ronda.pregunta) return ronda.pregunta;
    if (ronda.tipo === "falta") return textos().preguntaFalta || "¿Cuál objeto falta?";
    if (ronda.tipo === "cambio") return textos().preguntaCambio || "¿Qué objetos cambiaron de lugar?";
    return textos().preguntaNuevo || "¿Cuál objeto no estaba antes?";
}

function aciertoDe(ronda) {
    if (ronda.acierto) return ronda.acierto;
    if (ronda.tipo === "falta") return textos().aciertoFalta;
    if (ronda.tipo === "cambio") return textos().aciertoCambio;
    return textos().aciertoNuevo;
}

function errorDe(ronda) {
    if (ronda.error) return ronda.error;
    if (ronda.tipo === "cambio") return textos().errorCambio;
    return textos().errorObjetos;
}

function preguntar(ronda) {
    seleccionCambio = [];
    const pregunta = preguntaDe(ronda);
    setEnunciado(pregunta);
    hablarZoe(pregunta);
    let retraso = 0;

    if (ronda.tipo === "falta") {
        const restantes = ronda.objetos.filter(function (id) { return id !== ronda.falta; });
        pintarTablero(restantes, { clase: "tablero-fila tablero-pista" });
        const opciones = Array.isArray(ronda.opciones) && ronda.opciones.indexOf(ronda.falta) !== -1
            ? ronda.opciones
            : [ronda.falta];
        retraso = pintarOpciones(barajar(opciones), function (id, el) {
            elegirSimple(ronda, id, el, ronda.falta);
        });
    } else if (ronda.tipo === "cambio") {
        limpiarOpciones();
        retraso = pintarTablero(ordenIntercambiado(ronda), {
            clase: "tablero-fila",
            onClick: function (id, el) { elegirCambio(ronda, id, el); }
        });
    } else {
        limpiarOpciones();
        const lista = barajarSinPista(ronda.objetos.concat([ronda.nuevo]), ronda.nuevo);
        retraso = pintarTablero(lista, {
            onClick: function (id, el) { elegirSimple(ronda, id, el, ronda.nuevo); }
        });
    }
    habilitarRespuesta(retraso);
}

function mostrarMarca(el, tipo) {
    quitarMarca(el);
    const marca = document.createElement("span");
    marca.className = "objeto-marca objeto-marca-" + tipo;
    marca.setAttribute("aria-hidden", "true");
    const icono = tipo === "ok" ? "fa-check" : "fa-xmark";
    marca.innerHTML = '<span class="objeto-marca-circulo"><i class="fa-solid ' + icono + '"></i></span>';
    el.appendChild(marca);
}

function quitarMarca(el) {
    if (!el) return;
    const m = el.querySelector(".objeto-marca");
    if (m) m.remove();
}

function celebrar(el) {
    el.classList.remove("objeto-entra");
    el.style.animationDelay = "";
    el.classList.add("objeto-ok", "objeto-acierto");
    mostrarMarca(el, "ok");
}

function puedeResponder() {
    return esperandoRespuesta && !juegoTerminado && !mostrandoMemoria && !marcandoRespuesta;
}

function marcarError(ronda, el) {
    el.classList.add("objeto-error");
    mostrarMarca(el, "error");
    reproducirAudio(gameConfig.audios && gameConfig.audios.error);
    fallosRonda += 1;
    const umbral = umbralAtenuar();
    if (umbral > 0 && fallosRonda % umbral === 0) el.classList.add("objeto-tenue");
    hablarFeedback(errorDe(ronda));
    marcandoRespuesta = true;
    esperandoRespuesta = false;
    sleep(900).then(function () {
        if (juegoTerminado) return;
        quitarMarca(el);
        el.classList.remove("objeto-error");
        marcandoRespuesta = false;
        esperandoRespuesta = true;
    });
}

function umbralAtenuar() {
    const n = Number(acc().respuestasMaximasAntesDeAtenuar);
    return isFinite(n) && n >= 0 ? n : 2;
}

function resolverAcierto(ronda, revelar) {
    esperandoRespuesta = false;
    marcandoRespuesta = true;
    reproducirAudio(gameConfig.audios && gameConfig.audios.acierto);
    Promise.all([sleep(1500), hablarFeedback(aciertoDe(ronda))]).then(async function () {
        if (juegoTerminado) return;
        if (typeof revelar === "function") {
            revelar();
            await sleep(1300);
            if (juegoTerminado) return;
        }
        marcandoRespuesta = false;
        rondaActual += 1;
        iniciarRonda();
    });
}

function elegirSimple(ronda, id, el, correcto) {
    if (!puedeResponder()) return;
    if (id !== correcto) {
        marcarError(ronda, el);
        return;
    }
    celebrar(el);
    if (ronda.tipo === "falta") {
        document.querySelectorAll("#opciones .objeto").forEach(function (b) {
            if (b !== el) b.classList.add("objeto-apagado");
        });
        resolverAcierto(ronda, function () {
            limpiarOpciones();
            pintarTablero(ronda.objetos, { clase: "tablero-fila" });
            const hueco = document.querySelector('#tablero .objeto[data-id="' + ronda.falta + '"]');
            if (hueco) celebrar(hueco);
        });
        return;
    }
    resolverAcierto(ronda);
}

function elegirCambio(ronda, id, el) {
    if (!puedeResponder()) return;
    const pos = seleccionCambio.indexOf(id);
    if (pos !== -1) {
        seleccionCambio.splice(pos, 1);
        el.classList.remove("objeto-seleccionado");
        return;
    }
    if (ronda.intercambio.indexOf(id) === -1) {
        marcarError(ronda, el);
        return;
    }
    seleccionCambio.push(id);
    el.classList.add("objeto-seleccionado");
    if (seleccionCambio.length < ronda.intercambio.length) return;
    document.querySelectorAll("#tablero .objeto").forEach(function (b) {
        if (ronda.intercambio.indexOf(b.dataset.id) !== -1) {
            b.classList.remove("objeto-seleccionado");
            celebrar(b);
        }
    });
    resolverAcierto(ronda, function () {
        pintarTablero(ronda.objetos, { clase: "tablero-fila" });
        ronda.intercambio.forEach(function (oid) {
            const b = document.querySelector('#tablero .objeto[data-id="' + oid + '"]');
            if (b) celebrar(b);
        });
    });
}

async function iniciarRonda() {
    if (!nivelElegido || juegoTerminado) return;
    if (rondaActual >= rondas.length) {
        terminarJuego();
        return;
    }
    esperandoRespuesta = false;
    marcandoRespuesta = false;
    fallosRonda = 0;
    aplicarAccesibilidadInicial();
    const ronda = rondas[rondaActual];
    await faseMemoria(ronda);
    if (juegoTerminado) return;
    preguntar(ronda);
}

function verDeNuevo() {
    const ronda = rondas[rondaActual];
    if (!ronda || juegoTerminado || mostrandoMemoria || marcandoRespuesta || !esperandoRespuesta) return;
    if (timerEntrada) {
        clearTimeout(timerEntrada);
        timerEntrada = null;
    }
    if (typeof TextoVoz !== "undefined") TextoVoz.detener();
    faseMemoria(ronda).then(function () {
        if (!juegoTerminado) preguntar(ronda);
    });
}

function animarManoEn(el, onPresionar) {
    if (!el || !window.PedniaTutorial) return Promise.resolve();
    return PedniaTutorial.animarMano({
        punto: function () {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
        },
        holdMs: 1200,
        onPresionar: onPresionar
    });
}

async function correrDemo() {
    const demo = (nivelElegido && nivelElegido.demo) || {};
    const objetos = (demo.objetos && demo.objetos.length) ? demo.objetos : ["sol", "flor"];
    const nuevo = demo.nuevo || "estrella";
    const prog = document.getElementById("progreso");
    if (prog) prog.hidden = true;
    setEnunciado(textos().demostracion);
    await PedniaTutorial.correr({
        texto: textos().demostracion,
        textoFin: textos().demostracionFin,
        cancelado: function () { return !!juegoTerminado; },
        onTexto: setEnunciado,
        jugar: async function () {
            const dormir = PedniaTutorial.sleep;
            pintarTablero(objetos, { clase: "tablero-fila" });
            await dormir(2600);
            if (juegoTerminado) return;
            await ocultarTablero();
            await dormir(900);
            if (juegoTerminado) return;
            pintarTablero(barajarSinPista(objetos.concat([nuevo]), nuevo));
            const pregunta = textos().preguntaNuevo || "¿Cuál objeto no estaba antes?";
            setEnunciado(pregunta);
            await PedniaTutorial.hablarDemo(pregunta, 600);
            if (juegoTerminado) return;
            const objetivo = document.querySelector('#tablero .objeto[data-id="' + nuevo + '"]');
            await animarManoEn(objetivo, function () { if (objetivo) celebrar(objetivo); });
            await dormir(900);
            if (typeof PedniaTutorial.quitarManos === "function") PedniaTutorial.quitarManos();
            document.querySelectorAll(".demo-dedo").forEach(function (n) { n.remove(); });
            document.getElementById("tablero").innerHTML = "";
        }
    });
    actualizarProgreso();
}

function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    actualizarProgreso();
    reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    const cierre = textos().cierre || "";
    hablarZoe(cierre);
    const texto = document.getElementById("texto_final");
    if (texto) texto.textContent = cierre;
    setTimeout(function () {
        const caja = document.getElementById("final");
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

function precargarImagenes() {
    const objetos = (gameConfig && gameConfig.objetos) || {};
    Object.keys(objetos).forEach(function (id) {
        const img = new Image();
        img.src = objetos[id].img;
    });
}

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    sincronizarDialogoIntro3d();
    precargarImagenes();
    aplicarVisual();
    aplicarAccesibilidadInicial();
    TextoVoz.iniciar(gameConfig, introConfig, {
        obtenerAudioFondo: function () { return audioFondo; },
        volumenFondo: volumenFondoPct() / 100
    });
    enlazarMenuVol();
    enlazarMenuAcc();
    if (window.speechSynthesis) {
        try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        window.speechSynthesis.addEventListener("voiceschanged", function () {
            window.speechSynthesis.getVoices();
        });
    }
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
    const btnVer = document.getElementById("btn-ver");
    if (btnVer) {
        btnVer.addEventListener("click", function () {
            if (!acc().verBotonVerDeNuevo) return;
            verDeNuevo();
        });
    }
});
