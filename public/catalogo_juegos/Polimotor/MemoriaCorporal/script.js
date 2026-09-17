let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let nubePersonajeActual = null;
let audioFondo = null;

let cuerpoElegido = null;
let nivelElegido = null;
let rondaActual = 0;
let juegoTerminado = false;
let esperandoRespuesta = false;
let secuenciaObjetivo = [];
let opcionesRonda = [];
let huecoIndex = 0;
let mostrandoMemoria = false;
let marcandoRespuesta = false;
let fallosRonda = 0;
let instruccionDicha = false;
let timerEntradaOpciones = null;

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

function renderPersonajes(personajes) {
    const container = document.getElementById("personajes-container");
    container.innerHTML = "";
    const posiciones = personajes.length === 1 ? ["uno"] : ["izquierda", "derecha"];

    personajes.forEach(function (personaje, index) {
        const div = document.createElement("div");
        div.className = "personaje-char personaje-char-" + posiciones[index];
        div.style.backgroundImage = "url(" + personaje.gif_idle + ")";
        div.dataset.index = index;
        container.appendChild(div);
    });
}

function obtenerGifsPersonajes(personajes) {
    const urls = [];
    personajes.forEach(function (personaje) {
        [personaje.gif_idle, personaje.gif_hablando].forEach(function (gif) {
            if (gif && urls.indexOf(gif) === -1) {
                urls.push(gif);
            }
        });
    });
    return urls;
}

function preloadGifsEnCSS(personajes) {
    const urls = obtenerGifsPersonajes(personajes);
    const content = urls.map(function (gif) {
        return 'url("' + gif + '")';
    }).join(" ");

    let style = document.getElementById("preload-gifs-style");
    if (!style) {
        style = document.createElement("style");
        style.id = "preload-gifs-style";
        document.head.appendChild(style);
    }
    style.textContent =
        "#personajes-container::after {" +
        "position:absolute;width:0;height:0;overflow:hidden;z-index:-1;opacity:0;pointer-events:none;" +
        "content:" + content + ";" +
        "}";
}

function preloadGifs(personajes) {
    const urls = obtenerGifsPersonajes(personajes);
    preloadGifsEnCSS(personajes);
    return Promise.all(urls.map(function (gif) {
        return new Promise(function (resolve) {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = gif;
        });
    }));
}

function setPersonajesVisual(index) {
    const personajes = introConfig.personajes;
    const chars = document.querySelectorAll(".personaje-char");
    chars.forEach(function (el, i) {
        if (i === index) {
            el.style.backgroundImage = "url(" + personajes[i].gif_hablando + ")";
            el.classList.add("activo");
            el.classList.remove("inactivo");
        } else {
            el.style.backgroundImage = "url(" + personajes[i].gif_idle + ")";
            el.classList.add("inactivo");
            el.classList.remove("activo");
        }
    });
}

function aplicarClaseNube(index) {
    const nube = document.querySelector(".nube");
    const personajes = introConfig.personajes;
    nube.classList.remove("nube-centro", "nube-izquierda", "nube-derecha");
    if (personajes.length === 1) nube.classList.add("nube-centro");
    else if (index === 0) nube.classList.add("nube-izquierda");
    else nube.classList.add("nube-derecha");
}

let introTimers = [];

function agendarIntro(fn, ms) {
    const id = setTimeout(fn, ms);
    introTimers.push(id);
    return id;
}

function cancelarIntroPendiente() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
}

function fijarNubeEnPosicion() {
    if (cerrardo || conversacionCancelada) return;
    const nube = document.querySelector(".nube");
    nube.style.animationName = "none";
    nube.style.bottom = "57%";
}

function cambiarNubeAPersonaje(index) {
    if (cerrardo || conversacionCancelada) return;
    setPersonajesVisual(index);
    aplicarClaseNube(index);
    nubePersonajeActual = index;
    fijarNubeEnPosicion();
    const nube = document.querySelector(".nube");
    if (nube) nube.style.opacity = "1";
}

function resetPersonajesIdle() {
    if (!introConfig) return;
    introConfig.personajes.forEach(function (personaje, index) {
        const el = document.querySelector('.personaje-char[data-index="' + index + '"]');
        if (el) {
            el.style.backgroundImage = "url(" + personaje.gif_idle + ")";
            el.classList.remove("activo", "inactivo");
        }
    });
}

function maquina2(contenedor, texto, intervalo, callback) {
    if (!texto) {
        if (callback) callback();
        return;
    }
    var i = 1;
    $("#" + contenedor).html(texto.substr(0, 1) + "_");
    var timer = setInterval(function () {
        if (conversacionCancelada) {
            clearInterval(timer);
            if (callback) callback();
            return;
        }
        if (i < texto.length) {
            $("#" + contenedor).html(texto.substr(0, i++) + "_");
        } else {
            clearInterval(timer);
            $("#" + contenedor).html(texto);
            if (callback) callback();
        }
    }, intervalo);
}

function mostrarNubeYConversacion() {
    if (cerrardo || conversacionCancelada) return;
    const primeraLinea = introConfig.conversacion[0];
    const indiceInicial = primeraLinea && primeraLinea.personaje != null ? primeraLinea.personaje : 0;
    let conversacionLista = false;

    aplicarClaseNube(indiceInicial);
    nubePersonajeActual = indiceInicial;

    const nube = document.querySelector(".nube");
    nube.style.animationName = "moverArriba";
    nube.style.animationDirection = "normal";
    nube.style.display = "block";

    function iniciarConversacion() {
        if (conversacionLista || cerrardo || conversacionCancelada) return;
        conversacionLista = true;
        fijarNubeEnPosicion();
        if (cerrardo || conversacionCancelada) return;
        document.querySelector(".nube").style.opacity = "1";
        reproducirConversacion();
    }

    nube.addEventListener("animationend", function (e) {
        if (cerrardo || conversacionCancelada) return;
        if (e.animationName === "moverArriba") iniciarConversacion();
    });
    agendarIntro(iniciarConversacion, 2800);
}

function iniciarAnimacionIntro() {
    if (cerrardo || conversacionCancelada) return;
    const overlay = document.querySelector(".overlay");
    const chars = document.querySelectorAll(".personaje-char");
    const cantidad = introConfig.personajes.length;
    overlay.style.display = "block";
    if (cantidad === 1) {
        chars[0].style.animationName = "entradaIzquierda";
        agendarIntro(mostrarNubeYConversacion, 3500);
        return;
    }
    chars[0].style.animationName = "entradaIzquierda";
    agendarIntro(function () {
        if (cerrardo || conversacionCancelada) return;
        chars[1].style.animationName = "entradaDerecha";
    }, 1200);
    agendarIntro(mostrarNubeYConversacion, 4800);
}

function salirPersonajes(callback) {
    const chars = document.querySelectorAll(".personaje-char");
    const cantidad = introConfig.personajes.length;
    if (cantidad === 1) {
        chars[0].style.animationName = "salidaIzquierda";
        setTimeout(callback, 2800);
        return;
    }
    chars[0].style.animationName = "salidaIzquierda";
    chars[1].style.animationName = "salidaDerecha";
    setTimeout(callback, 2800);
}

async function reproducirConversacion() {
    const cfg = introConfig.configuracion || {};
    const intervalo = cfg.intervalo || 50;
    const pausaFinal = cfg.pausaFinal || 3000;
    const lineas = introConfig.conversacion;

    for (let i = 0; i < lineas.length; i++) {
        if (conversacionCancelada || cerrardo) return;
        const linea = lineas[i];
        const indicePersonaje = linea.personaje != null ? linea.personaje : 0;
        $("#bienvenida").html("");
        cambiarNubeAPersonaje(indicePersonaje);
        const pVoz = TextoVoz.hablar(linea.texto, TextoVoz.personajeDeIndice(indicePersonaje));
        await new Promise(function (resolve) {
            maquina2("bienvenida", linea.texto, intervalo, resolve);
        });
        if (conversacionCancelada || cerrardo) {
            TextoVoz.detener();
            return;
        }
        await pVoz;
        if (conversacionCancelada || cerrardo) return;
    }

    if (!cerrardo && !conversacionCancelada) {
        document.querySelector("#btnomitir").style.display = "none";
        await sleep(pausaFinal);
        cerrar_anuncio();
    }
}

let introGifsListos = false;
let zoomInicioListo = false;
let introDesdeEmpecemos = false;

function intentarLanzarIntro() {
    if (!zoomInicioListo || !introGifsListos || introDesdeEmpecemos) return;
    introDesdeEmpecemos = true;
    iniciarAnimacionIntro();
}

function empecemosJuego() {
    const pantalla = document.getElementById("pantalla-inicio");
    const btn = document.getElementById("btn-empecemos");
    if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
    if (btn) btn.disabled = true;
    TextoVoz.desbloquear();
    asegurarAudioFondo();
    TextoVoz.precargar();
    zoomInicioListo = true;
    pantalla.classList.add("is-out");
    intentarLanzarIntro();

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
    if (cerrardo) return;
    conversacionCancelada = true;
    cerrardo = true;
    cancelarIntroPendiente();
    TextoVoz.detener();
    asegurarAudioFondo();
    TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);

    const nube = document.querySelector(".nube");
    nube.style.animationName = "moverabajo";
    resetPersonajesIdle();
    $("#fondo_blanco").stop(true, true).hide();
    setTimeout(function () {
        nube.style.display = "none";
        salirPersonajes(function () {
            document.querySelector(".overlay").style.display = "none";
            $("#principal").css("display", "flex").hide().fadeIn(1000);
            iniciarPartida();
        });
    }, 2000);
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

function feedbackActivo() {
    return acc().mostrarFeedBack !== false;
}

function cfgFeedback(tipo) {
    const fb = acc().feedback || {};
    const item = fb[tipo] || {};
    const t = textos();
    const defaults = {
        acierto: { texto: "¡Muy bien! Recordaste la secuencia de movimientos.", gif: "../../images/correcto.gif" },
        error: { texto: "¡Inténtalo otra vez! Recuerda el orden de los movimientos.", gif: "../../images/incorrecto.gif" }
    };
    const def = defaults[tipo] || {};
    return {
        texto: t[tipo] || item.texto || def.texto || "",
        gif: item.gif || def.gif || "",
        duracion: fb.duracion || 2000
    };
}

function hablarFeedback(tipo) {
    if (!feedbackActivo()) return Promise.resolve();
    const cfg = cfgFeedback(tipo);
    return hablarTexto(cfg.texto);
}

function mostrarFeedback(tipo) {
    if (!feedbackActivo()) return Promise.resolve();
    const cfg = cfgFeedback(tipo);
    const pj = tipo === "error" ? "zeus" : "zoe";
    const vozP = TextoVoz.hablar(cfg.texto, pj);
    const opts = {
        position: "center",
        title: cfg.texto,
        showConfirmButton: false,
        timer: cfg.duracion,
        allowOutsideClick: false,
        allowEscapeKey: false,
        heightAuto: false,
        scrollbarPadding: false,
        width: 420,
        customClass: { popup: tipo === "acierto" ? "modal-feedback modal-ok" : "modal-feedback modal-error" }
    };
    if (cfg.gif) {
        opts.imageUrl = cfg.gif.split("?")[0] + "?t=" + Date.now();
        opts.imageWidth = 250;
        opts.imageHeight = 250;
    }
    return Promise.all([Swal.fire(opts), vozP]);
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

function enlazarMenuVol() {
    const btn = document.getElementById("btn-menu-vol");
    const cerrar = document.getElementById("btn-cerrar-vol");
    const slider = document.getElementById("rango-volumen");
    if (btn) {
        btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-vol-panel");
            setMenuVol(panel && panel.hidden);
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
    const btnVer = document.getElementById("btn-ver");
    if (btnVer) btnVer.hidden = !a.verBotonVerDeNuevo;
    aplicarVisual();
    actualizarProgreso();
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = nivelElegido && nivelElegido.rondas ? nivelElegido.rondas.length : 0;
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
    root.style.setProperty("--mc-img", px(v.tamanoImagen, "120px"));
    root.style.setProperty("--mc-img-pista", px(v.tamanoImagenPista, "64px"));
    root.style.setProperty("--mc-letra", px(v.tamanoLetraBotones, "16px"));
    root.style.setProperty("--mc-letter-spacing", pxCero(v.letterSpacing, "2px"));
    root.style.setProperty("--mc-gap", px(v.espaciadoOpciones, "24px"));
    root.style.setProperty("--mc-opcion-w", px(v.anchoOpcion, "220px"));
    root.style.setProperty("--mc-opcion-h", px(v.altoOpcion, "200px"));
}

function iniciarPartida() {
    const pedido = String(gameConfig.cuerpo || "nina").toLowerCase();
    cuerpoElegido = pedido === "nino" || pedido === "niño" ? "nino" : "nina";
    document.body.dataset.cuerpo = cuerpoElegido;
    nivelElegido = resolverNivel(gameConfig.edad);
    rondaActual = 0;
    juegoTerminado = false;
    instruccionDicha = false;
    fallosRonda = 0;
    aplicarVisual();
    iniciarRonda();
}

function resolverNivel(edad) {
    const niveles = (gameConfig && gameConfig.niveles) || [];
    const raw = edad == null ? "" : String(edad).trim().toLowerCase();
    const id = raw.replace(/\s*años?$/, "").replace(/-6$/, "");
    return niveles.find(function (n) { return String(n.id) === id; })
        || niveles.find(function (n) { return String(n.edad || "").toLowerCase() === raw; })
        || niveles[0]
        || null;
}

function textos() {
    return (gameConfig && gameConfig.textos) || {};
}

function vozAleatoria() {
    return Math.random() < 0.5 ? "zoe" : "zeus";
}

function hablarTexto(texto) {
    return hablarConVoz(texto, vozAleatoria());
}

function hablarConVoz(texto, personaje) {
    if (!texto || typeof TextoVoz === "undefined") return Promise.resolve();
    return TextoVoz.hablar(texto, personaje);
}

function umbralAtenuar() {
    const n = Number(acc().respuestasMaximasAntesDeAtenuar);
    return isFinite(n) && n >= 0 ? n : 1;
}

function datoMovimiento(id) {
    return (gameConfig.movimientos && gameConfig.movimientos[id]) || { nombre: id, archivo: id + ".png" };
}

function carpetaCuerpo() {
    const cuerpo = (gameConfig.cuerpos || {})[cuerpoElegido] || {};
    return (cuerpo.carpeta || ("img/" + (cuerpoElegido || "nina"))).replace(/\/$/, "");
}

function rutaMovimiento(id) {
    const m = datoMovimiento(id);
    const archivo = m.archivo || (id + ".png");
    return carpetaCuerpo() + "/" + archivo;
}

function attrEsc(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

function htmlFigura(id) {
    const m = datoMovimiento(id);
    return '<img class="paso-img" src="' + attrEsc(rutaMovimiento(id)) + '" alt="' + attrEsc(m.nombre) + '" onerror="this.classList.add(\'is-broken\')">';
}

function htmlPaso(id, extraClass) {
    const m = datoMovimiento(id);
    return '<div class="paso-mov ' + (extraClass || "") + '" data-mov="' + id + '">' +
        htmlFigura(id) +
        "<span>" + attrEsc(m.nombre) + "</span></div>";
}

function htmlHueco() {
    return '<div class="paso-mov paso-hueco" aria-label="Falta un movimiento"><span class="paso-hueco-marca">?</span></div>';
}

function htmlSecuencia(ids) {
    return ids.map(function (id) { return htmlPaso(id); }).join('<span class="paso-flecha" aria-hidden="true"></span>');
}

function htmlSecuenciaConHueco(ids, hueco) {
    return ids.map(function (id, i) {
        return i === hueco ? htmlHueco() : htmlPaso(id, "paso-mini");
    }).join("");
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

function distractoresMovimiento(correctoId, cantidad) {
    const catalogo = Object.keys(gameConfig.movimientos || {}).filter(function (id) {
        return id !== correctoId;
    });
    return barajar(catalogo).slice(0, cantidad);
}

function setEnunciado(texto) {
    const el = document.getElementById("enunciado");
    if (el) el.innerHTML = texto || "";
}

function bloqueMemoria() {
    return document.querySelector(".memoria-bloque");
}

function iniciarFaseMemoria() {
    const bloque = bloqueMemoria();
    if (bloque) bloque.classList.add("fase-memoria");
}

function terminarFaseMemoria() {
    const bloque = bloqueMemoria();
    if (bloque) bloque.classList.remove("fase-memoria");
    const cuenta = document.getElementById("cuenta");
    if (cuenta) {
        cuenta.hidden = true;
        cuenta.innerHTML = "";
    }
}

async function iniciarRonda() {
    if (!nivelElegido || juegoTerminado) return;
    const rondas = nivelElegido.rondas || [];
    if (rondaActual >= rondas.length) {
        terminarJuego();
        return;
    }
    esperandoRespuesta = false;
    mostrandoMemoria = false;
    marcandoRespuesta = false;
    fallosRonda = 0;
    secuenciaObjetivo = rondas[rondaActual].slice();
    huecoIndex = secuenciaObjetivo.length - 1;
    actualizarProgreso();
    document.getElementById("opciones").innerHTML = "";
    document.getElementById("secuencia").hidden = true;
    terminarFaseMemoria();
    aplicarAccesibilidadInicial();

    if (!instruccionDicha) {
        instruccionDicha = true;
        setEnunciado(textos().instruccion || "");
        await hablarTexto(textos().instruccion);
        if (juegoTerminado) return;
    }

    await mostrarSecuenciaObjetivo();
    if (juegoTerminado) return;
    mostrarOpciones();
}

async function mostrarSecuenciaObjetivo() {
    const caja = document.getElementById("secuencia");
    const cuenta = document.getElementById("cuenta");
    mostrandoMemoria = true;
    esperandoRespuesta = false;
    iniciarFaseMemoria();
    document.getElementById("opciones").hidden = true;
    setEnunciado(textos().memoriza || "¡Memoriza esta secuencia!");
    caja.hidden = false;
    caja.classList.add("secuencia-viva");
    caja.innerHTML = htmlSecuencia(secuenciaObjetivo);
    await hablarTexto(textos().memoriza);
    if (juegoTerminado) return;
    if (acc().cuentaRegresiva !== false) {
        cuenta.hidden = false;
        const etiqueta = textos().seOcultan || "Se ocultarán en...";
        const vozConteo = vozAleatoria();
        cuenta.innerHTML = '<span class="cuenta-label">' + etiqueta + "</span>";
        await hablarConVoz(etiqueta, vozConteo);
        if (juegoTerminado) return;
        const segundos = 3;
        const espera = 3000;
        const fraseConteo = (typeof TextoVoz !== "undefined" && TextoVoz.textoConteo)
            ? TextoVoz.textoConteo(segundos)
            : "tres. dos. uno.";
        let resolverInicio = null;
        const audioInicio = new Promise(function (resolve) { resolverInicio = resolve; });
        const pVoz = (typeof TextoVoz !== "undefined")
            ? TextoVoz.hablar(fraseConteo, vozConteo, {
                duracionMs: espera,
                onInicio: function () { if (resolverInicio) resolverInicio(); }
            })
            : (resolverInicio(), Promise.resolve());
        await audioInicio;
        if (juegoTerminado) {
            if (typeof TextoVoz !== "undefined") TextoVoz.detener();
            return;
        }
        for (let n = segundos; n >= 1; n--) {
            cuenta.innerHTML = '<span class="cuenta-label">' + etiqueta + "</span><strong>" + n + "</strong>";
            await sleep(Math.round(espera / segundos));
            if (juegoTerminado) {
                if (typeof TextoVoz !== "undefined") TextoVoz.detener();
                return;
            }
        }
        await pVoz;
        cuenta.hidden = true;
        cuenta.innerHTML = "";
        await sleep(1000);
        if (juegoTerminado) return;
    } else {
        cuenta.hidden = true;
        await sleep(2500);
        if (juegoTerminado) return;
    }
    caja.classList.remove("secuencia-viva");
    caja.hidden = true;
    caja.innerHTML = "";
    terminarFaseMemoria();
    document.getElementById("opciones").hidden = false;
    mostrandoMemoria = false;
}

function mostrarOpciones() {
    mostrarOpcionesFalta();
}

function mostrarOpcionesFalta() {
    const correcto = secuenciaObjetivo[huecoIndex];
    const n = nivelElegido.opciones || 4;
    const dist = distractoresMovimiento(correcto, n - 1);
    opcionesRonda = barajar([{ id: correcto, ok: true }].concat(
        dist.map(function (id) { return { id: id, ok: false }; })
    ));
    setEnunciado(textos().queFalta || "¿Qué movimiento falta?");
    hablarTexto(textos().queFalta);
    const pista = document.getElementById("secuencia");
    pista.hidden = false;
    pista.classList.remove("secuencia-viva", "secuencia-ok");
    pista.classList.add("secuencia-pista");
    pista.innerHTML = htmlSecuenciaConHueco(secuenciaObjetivo, huecoIndex);
    pintarOpcionesFalta(opcionesRonda);
}

function pintarOpcionesFalta(lista) {
    const caja = document.getElementById("opciones");
    const cols = lista.length === 4 ? 2 : (lista.length <= 3 ? Math.max(lista.length, 1) : 3);
    const animar = !!acc().animaciones_opciones;
    if (timerEntradaOpciones) {
        clearTimeout(timerEntradaOpciones);
        timerEntradaOpciones = null;
    }
    caja.className = "opciones opciones-falta";
    caja.style.setProperty("--mc-cols", String(cols));
    caja.innerHTML = "";
    lista.forEach(function (op, i) {
        const m = datoMovimiento(op.id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opcion-seq opcion-mov";
        if (op.ok) btn.dataset.ok = "1";
        btn.innerHTML = htmlFigura(op.id) + '<span class="opcion-nombre">' + attrEsc(m.nombre) + "</span>";
        btn.addEventListener("click", function () {
            elegirOpcion(op, btn);
        });
        if (animar) {
            btn.classList.add("opcion-entra");
            btn.style.animationDelay = (i * 140) + "ms";
        }
        caja.appendChild(btn);
    });
    if (animar) {
        esperandoRespuesta = false;
        timerEntradaOpciones = setTimeout(function () {
            timerEntradaOpciones = null;
            if (!juegoTerminado && !mostrandoMemoria) esperandoRespuesta = true;
        }, lista.length * 140 + 420);
    } else {
        esperandoRespuesta = true;
    }
}

function mostrarMarca(btn, tipo) {
    quitarMarca(btn);
    const marca = document.createElement("span");
    marca.className = "opcion-marca opcion-marca-" + tipo;
    marca.setAttribute("aria-hidden", "true");
    const icono = tipo === "ok" ? "fa-check" : "fa-xmark";
    marca.innerHTML = '<span class="opcion-marca-circulo"><i class="fa-solid ' + icono + '"></i></span>';
    btn.appendChild(marca);
}

function quitarMarca(btn) {
    if (!btn) return;
    const m = btn.querySelector(".opcion-marca");
    if (m) m.remove();
}

function revelarSecuenciaAcierto() {
    const pista = document.getElementById("secuencia");
    if (!pista) return;
    pista.hidden = false;
    pista.classList.remove("secuencia-pista");
    pista.classList.add("secuencia-ok");
    pista.innerHTML = htmlSecuencia(secuenciaObjetivo);
    const pasos = pista.querySelectorAll(".paso-mov");
    if (pasos.length) pasos[pasos.length - 1].classList.add("paso-acierto");
}

function elegirOpcion(op, btn) {
    if (!esperandoRespuesta || juegoTerminado || mostrandoMemoria || marcandoRespuesta) return;
    esperandoRespuesta = false;
    marcandoRespuesta = true;
    if (op.ok) {
        btn.classList.add("opcion-ok");
        mostrarMarca(btn, "ok");
        revelarSecuenciaAcierto();
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto);
        Promise.all([sleep(1200), hablarFeedback("acierto")]).then(function () {
            marcandoRespuesta = false;
            rondaActual += 1;
            iniciarRonda();
        });
    } else {
        btn.classList.add("opcion-error");
        mostrarMarca(btn, "error");
        reproducirAudio(gameConfig.audios && gameConfig.audios.error);
        fallosRonda += 1;
        if (fallosRonda >= umbralAtenuar()) atenuarOpcionLejana(btn);
        hablarFeedback("error");
        sleep(900).then(function () {
            if (juegoTerminado) return;
            quitarMarca(btn);
            btn.classList.remove("opcion-error");
            marcandoRespuesta = false;
            esperandoRespuesta = true;
        });
    }
}

function atenuarOpcionLejana(btnErr) {
    const botones = Array.prototype.slice.call(document.querySelectorAll(".opcion-seq"));
    const otros = botones.filter(function (b) {
        return b !== btnErr
            && b.dataset.ok !== "1"
            && !b.classList.contains("opcion-ok")
            && !b.classList.contains("opcion-tenue");
    });
    if (!otros.length) return;
    otros[otros.length - 1].classList.add("opcion-tenue");
}

function verDeNuevo() {
    if (!secuenciaObjetivo.length || juegoTerminado || mostrandoMemoria || marcandoRespuesta) return;
    mostrarSecuenciaObjetivo().then(function () {
        if (juegoTerminado) return;
        restaurarPista();
        const caja = document.getElementById("opciones");
        if (caja) caja.hidden = false;
        esperandoRespuesta = true;
    });
}

function restaurarPista() {
    setEnunciado(textos().queFalta || "¿Qué movimiento falta?");
    hablarTexto(textos().queFalta);
    const pista = document.getElementById("secuencia");
    if (!pista) return;
    pista.hidden = false;
    pista.classList.remove("secuencia-viva", "secuencia-ok");
    pista.classList.add("secuencia-pista");
    pista.innerHTML = htmlSecuenciaConHueco(secuenciaObjetivo, huecoIndex);
}

function generarConfetis() {
    var caja = document.getElementById("confetis");
    if (!caja) return;
    caja.innerHTML = "";
    var colores = ["#e53935", "#ffeb3b", "#43a047", "#1e88e5", "#fb8c00", "#8e24aa", "#ec407a", "#00acc1"];
    var total = 72;
    var i;
    for (i = 0; i < total; i++) {
        var pieza = document.createElement("span");
        var ancho = 6 + Math.floor(Math.random() * 8);
        var alto = 8 + Math.floor(Math.random() * 14);
        var esCirculo = Math.random() < 0.28;
        pieza.className = "confeti" + (esCirculo ? " es-circulo" : "");
        pieza.style.left = (Math.random() * 100) + "%";
        pieza.style.backgroundColor = colores[i % colores.length];
        pieza.style.width = ancho + "px";
        pieza.style.height = (esCirculo ? ancho : alto) + "px";
        var caidas = ["caer-confeti", "caer-confeti-izq", "caer-confeti-der"];
        pieza.style.animationName = caidas[i % 3];
        pieza.style.animationDuration = (2.4 + Math.random() * 2.8) + "s";
        pieza.style.animationDelay = (Math.random() * 1.6) + "s";
        caja.appendChild(pieza);
    }
}

function pintar_exito() {
    var el = document.getElementById("final");
    el.style.display = "flex";
    void el.offsetWidth;
    generarConfetis();
    setTimeout(function () {
        document.getElementById("meta-item").style.bottom = "0px";
        setTimeout(function () {
            document.getElementById("trompeta-img").style.left = "0px";
            document.getElementById("trompeta-img2").style.right = "0px";
            document.getElementById("meta-item-nivel").classList.add("clase_scale");
        }, 400);
    }, 200);
}

function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    const cierre = (gameConfig.textos && gameConfig.textos.cierre) || "";
    hablarTexto(cierre);
    document.getElementById("texto_final").innerText = cierre;
    setTimeout(function () {
        pintar_exito();
    }, 400);
}

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
    aplicarVisual();
    aplicarAccesibilidadInicial();
    TextoVoz.iniciar(gameConfig, introConfig, {
        obtenerAudioFondo: function () { return audioFondo; },
        volumenFondo: volumenFondoPct() / 100
    });
    enlazarMenuVol();
    if (window.speechSynthesis) {
        try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        window.speechSynthesis.addEventListener("voiceschanged", function () {
            window.speechSynthesis.getVoices();
        });
    }
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
    const btnEmpecemos = document.getElementById("btn-empecemos");
    if (btnEmpecemos) btnEmpecemos.addEventListener("click", empecemosJuego);
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
    preloadGifs(introConfig.personajes).then(function () {
        renderPersonajes(introConfig.personajes);
        introGifsListos = true;
        intentarLanzarIntro();
    });
});
