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

function renderPersonajes(personajes) {
    const container = document.getElementById("personajes-container");
    container.innerHTML = "";
    const posiciones = personajes.length === 1 ? ["uno"] : ["izquierda", "derecha"];

    personajes.forEach(function (personaje, index) {
        const div = document.createElement("div");
        div.className = "personaje-char " + posiciones[index];
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

    personajesCssPreload(personajes);
}

function personajesCssPreload(personajes) {
    let reglas = "";
    personajes.forEach(function (personaje, index) {
        reglas +=
            '.personaje-char[data-index="' + index + '"]::before {' +
            "position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;" +
            'content:url("' + personaje.gif_idle + '") url("' + personaje.gif_hablando + '");' +
            "}";
    });

    let style = document.getElementById("preload-personajes-style");
    if (!style) {
        style = document.createElement("style");
        style.id = "preload-personajes-style";
        document.head.appendChild(style);
    }
    style.textContent = reglas;
}

function preloadGifs(personajes) {
    const urls = obtenerGifsPersonajes(personajes);
    preloadGifsEnCSS(personajes);

    let container = document.getElementById("preload-gifs");
    if (!container) {
        container = document.createElement("div");
        container.id = "preload-gifs";
        container.className = "preload-gifs";
        document.body.appendChild(container);
    }
    container.innerHTML = "";

    const promesas = urls.map(function (gif) {
        return new Promise(function (resolve) {
            const img = document.createElement("img");
            img.onload = resolve;
            img.onerror = resolve;
            img.src = gif;
            container.appendChild(img);
        });
    });

    return Promise.all(promesas);
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
    if (personajes.length === 1) {
        nube.classList.add("nube-centro");
    } else if (index === 0) {
        nube.classList.add("nube-izquierda");
    } else {
        nube.classList.add("nube-derecha");
    }
}

function esperarFrame() {
    return new Promise(function (resolve) {
        requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
        });
    });
}

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
    nube.style.bottom = "38%";
}

async function fadeNube(opacidad) {
    const nube = document.querySelector(".nube");
    const duracion = (introConfig.configuracion && introConfig.configuracion.duracionCambioNube) || 350;
    nube.style.transition = "opacity " + (duracion / 1000) + "s ease";
    nube.style.opacity = String(opacidad);
    await sleep(duracion);
}

async function cambiarNubeAPersonaje(index) {
    if (cerrardo || conversacionCancelada) return;
    const personajes = introConfig.personajes;
    setPersonajesVisual(index);

    if (personajes.length === 1 || nubePersonajeActual === index) {
        aplicarClaseNube(index);
        nubePersonajeActual = index;
        return;
    }

    $("#bienvenida").html("");
    fijarNubeEnPosicion();
    if (cerrardo || conversacionCancelada) return;

    const nube = document.querySelector(".nube");
    nube.style.opacity = "1";
    await esperarFrame();
    if (cerrardo || conversacionCancelada) return;
    await fadeNube(0);
    if (cerrardo || conversacionCancelada) return;

    aplicarClaseNube(index);
    nubePersonajeActual = index;

    await esperarFrame();
    await fadeNube(1);
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
    var i = 0,
        timer = setInterval(function () {
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

    setPersonajesVisual(indiceInicial);
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
        agendarIntro(function () {
            if (cerrardo || conversacionCancelada) return;
            reproducirConversacion();
        }, 400);
    }

    nube.addEventListener("animationend", function (e) {
        if (cerrardo || conversacionCancelada) return;
        if (e.animationName === "moverArriba") {
            iniciarConversacion();
        }
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
    const pausaEntreLineas = cfg.pausaEntreLineas || 2000;
    const pausaFinal = cfg.pausaFinal || 3000;
    const lineas = introConfig.conversacion;

    for (let i = 0; i < lineas.length; i++) {
        if (conversacionCancelada || cerrardo) return;

        const linea = lineas[i];
        const indicePersonaje = linea.personaje != null ? linea.personaje : 0;
        await cambiarNubeAPersonaje(indicePersonaje);

        await new Promise(function (resolve) {
            maquina2("bienvenida", linea.texto, intervalo, resolve);
        });

        if (conversacionCancelada || cerrardo) return;

        if (i < lineas.length - 1) {
            await sleep(pausaEntreLineas);
        }
    }

    if (!cerrardo && !conversacionCancelada) {
        document.querySelector("#btnomitir").style.display = "none";
        await sleep(pausaFinal);
        cerrar_anuncio();
    }
}

function iniciarIntro() {
    agendarIntro(function () {
        if (cerrardo || conversacionCancelada) return;
        $("#principal").fadeToggle(1000);
        $("#fondo_blanco").fadeToggle(3000);
        agendarIntro(function () {
            if (cerrardo || conversacionCancelada) return;
            iniciarAnimacionIntro();
        }, 200);
    }, 200);
}

function cerrar_anuncio() {
    if (cerrardo) return;
    conversacionCancelada = true;
    cerrardo = true;
    cancelarIntroPendiente();

    reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, 0.2, true);

    const nube = document.querySelector(".nube");
    nube.style.animationName = "moverabajo";
    resetPersonajesIdle();
    $("#fondo_blanco").fadeToggle(3000);
    setTimeout(function () {
        nube.style.display = "none";
        salirPersonajes(function () {
            document.querySelector(".overlay").style.display = "none";
            $("#principal").fadeToggle(1000);
            elegirCuerpo();
        });
    }, 2000);
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

function acc() {
    return gameConfig.accesibilidad || {};
}

const ACC_BOTONES = [
    { key: "altoContraste", label: "Contraste" },
    { key: "mostrarZonas", label: "Zonas" },
    { key: "resaltarObjetivo", label: "Resaltar" },
    { key: "pistaPorFallos", label: "Pistas" },
    { key: "mostrarProgreso", label: "Progreso" },
    { key: "hitboxExtra", label: "Hitbox", valores: [0, 12, 24] }
];

function accActiva(item) {
    const a = acc();
    if (item.valores) return Number(a[item.key] || 0) > 0;
    return !!a[item.key];
}

function textoBotonAcc(item) {
    if (item.valores) return item.label + " " + (acc()[item.key] || 0);
    return item.label;
}

function pintarPanelAcc() {
    const panel = document.getElementById("panel-acc");
    if (!panel) return;
    panel.innerHTML = "";
    ACC_BOTONES.forEach(function (item) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.key = item.key;
        btn.textContent = textoBotonAcc(item);
        btn.classList.toggle("activo", accActiva(item));
        btn.addEventListener("click", function () {
            alternarAcc(item);
        });
        panel.appendChild(btn);
    });
}

function alternarAcc(item) {
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    if (item.valores) {
        const actual = Number(acc()[item.key] || 0);
        const i = item.valores.indexOf(actual);
        gameConfig.accesibilidad[item.key] = item.valores[(i + 1) % item.valores.length];
    } else {
        gameConfig.accesibilidad[item.key] = !acc()[item.key];
    }
    aplicarAccesibilidadInicial();
    if (tableroListo) actualizarAyudasVisuales();
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = preguntas.length;
    el.hidden = !acc().mostrarProgreso || !tableroListo || !total;
    el.textContent = Math.min(indicePregunta + 1, total) + " / " + total;
}

function aplicarAccesibilidadInicial() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    document.body.classList.toggle("mostrar-zonas", !!a.mostrarZonas);
    pintarPanelAcc();
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
    setTimeout(elegirNivel, 50);
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
    nivelElegido = gameConfig.niveles.find(function (n) { return n.id === id; });
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
    const lienzo = document.getElementById("lienzo");
    if (cuerpo.lienzo) {
        lienzo.style.aspectRatio = cuerpo.lienzo.w + " / " + cuerpo.lienzo.h;
    }

    const img = document.getElementById("img-completo");
    img.src = rutaCompleto();
    img.alt = "Figura de " + (cuerpo.nombre || cuerpoElegido);

    armarZonas();
    document.getElementById("escenario").style.visibility = "visible";
    tableroListo = true;
    aplicarAccesibilidadInicial();
    mostrarPreguntaActual();
}

function armarZonas() {
    const contenedor = document.getElementById("zonas");
    contenedor.innerHTML = "";
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
    fallosPregunta = 0;
    actualizarProgreso();
    actualizarAyudasVisuales();
    document.body.classList.remove("bloqueado");
}

function zonasBajoPunto(clientX, clientY) {
    const lienzo = document.getElementById("lienzo");
    const rect = lienzo.getBoundingClientRect();
    const extra = Number(acc().hitboxExtra || 0);
    const ids = [];

    document.querySelectorAll(".zona-toque").forEach(function (zona) {
        const r = zona.getBoundingClientRect();
        if (
            clientX >= r.left - extra &&
            clientX <= r.right + extra &&
            clientY >= r.top - extra &&
            clientY <= r.bottom + extra
        ) {
            ids.push(zona.dataset.id);
        }
    });

    if (!ids.length) {
        if (
            clientX < rect.left ||
            clientX > rect.right ||
            clientY < rect.top ||
            clientY > rect.bottom
        ) {
            return [];
        }
    }
    return ids;
}

function feedbackActivo() {
    return !gameConfig || gameConfig.mostrarFeedBack !== false;
}

function cfgFeedback(tipo) {
    const fb = (gameConfig && gameConfig.feedback) || {};
    const item = fb[tipo] || {};
    const defaults = {
        acierto: { texto: "¡Muy bien! Encontraste la parte del cuerpo.", gif: "../../images/correcto.gif" },
        error: { texto: "¡Inténtalo otra vez! Observa muy bien la figura.", gif: "../../images/incorrecto.gif" }
    };
    const def = defaults[tipo] || {};
    return {
        texto: item.texto || def.texto || "",
        gif: item.gif || def.gif || "",
        duracion: fb.duracion || 1800
    };
}

function mostrarFeedback(tipo) {
    if (!feedbackActivo()) return Promise.resolve();
    const cfg = cfgFeedback(tipo);
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
        customClass: { popup: "modal-feedback" }
    };
    if (cfg.gif) {
        opts.imageUrl = cfg.gif.split("?")[0] + "?t=" + Date.now();
        opts.imageWidth = 250;
        opts.imageHeight = 250;
    }
    return Swal.fire(opts);
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

    const ids = zonasBajoPunto(ev.clientX, ev.clientY);
    if (!ids.length) return;

    const targets = pregunta.targets || [];
    const acertadas = ids.filter(function (id) {
        return targets.indexOf(id) !== -1;
    });

    if (acertadas.length) {
        resolverAcierto(acertadas);
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
        if (indicePregunta >= preguntas.length) {
            terminarJuego();
            return;
        }
        mostrarPreguntaActual();
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
    });
}

function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);

    setTimeout(function () {
        $("#principal").fadeToggle(500);
        setTimeout(function () {
            document.getElementById("final").style.backgroundImage = "url(../../images/victoria.gif)";
            document.getElementById("texto_final").innerText = gameConfig.textos.cierre;
            $("#final").fadeToggle(1000);
        }, 500);
    }, 400);
}

$(document).ready(function () {
    introConfig = JSON.parse(readText("intro.json"));
    gameConfig = JSON.parse(readText("config.json"));
    aplicarAccesibilidadInicial();

    const lienzo = document.getElementById("lienzo");
    lienzo.addEventListener("pointerup", onToqueFigura);

    document.getElementById("escenario").style.visibility = "hidden";

    preloadGifs(introConfig.personajes).then(function () {
        renderPersonajes(introConfig.personajes);
        iniciarIntro();
    });
});
