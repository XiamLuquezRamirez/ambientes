let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let nubePersonajeActual = null;

let cuerpoElegido = null;
let nivelElegido = null;
let piezasEstado = [];
let piezaSeleccionada = null;
let dragActivo = null;
let fantasma = null;
let longPressTimer = null;
let zoomAbierto = false;
let juegoTerminado = false;
let audioFondo = null;
let tableroListo = false;
let verDeNuevoTimer = null;
let siluetaOcultaAntes = false;
let pistaPiezaId = null;

const COLORES = {
    cabeza: "#f4a261",
    tronco: "#e76f51",
    brazo_izq: "#2a9d8f",
    brazo_der: "#2a9d8f",
    mano_izq: "#8ab17d",
    mano_der: "#8ab17d",
    pierna_izq: "#457b9d",
    pierna_der: "#457b9d",
    piernas: "#457b9d",
    pies: "#1d3557"
};

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
        $("#principal").fadeOut(1000);
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
            $("#principal").css("display", "flex").hide().fadeIn(1000);
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

function rutaPieza(archivo, variante) {
    const base = gameConfig.cuerpos[cuerpoElegido].carpeta + "/" + nivelElegido.id;
    if (variante) return base + "/" + variante + "/" + archivo;
    return base + "/" + archivo;
}

function layoutSvg() {
    const cuerpo = gameConfig.cuerpos[cuerpoElegido];
    if (!cuerpo || !cuerpo.svg || !nivelElegido) return null;
    return cuerpo.svg[nivelElegido.id] || null;
}

function nombrePieza(p) {
    if (p && p.nombre) return p.nombre;
    const nombres = {
        cabeza: "Cabeza",
        tronco: "Tronco",
        brazo_izq: "Brazo izquierdo",
        brazo_der: "Brazo derecho",
        mano_izq: "Mano izquierda",
        mano_der: "Mano derecha",
        pierna_izq: "Pierna izquierda",
        pierna_der: "Pierna derecha",
        piernas: "Piernas",
        pies: "Pies"
    };
    return (p && nombres[p.id]) || (p && p.id) || "";
}

function piezasDelNivel() {
    if (!nivelElegido) return [];
    const layout = layoutSvg();
    if (layout && Array.isArray(layout.piezas) && layout.piezas.length) {
        return layout.piezas;
    }
    if (Array.isArray(nivelElegido.piezas)) return nivelElegido.piezas;
    return [];
}

function limpiarSiluetaSvg() {
    const svg = document.getElementById("figura-svg");
    const lienzo = document.getElementById("lienzo");
    if (svg) svg.remove();
    if (lienzo) lienzo.style.aspectRatio = "";
    document.body.classList.remove("modo-svg");
}

function modoSvgActivo() {
    return !!layoutSvg();
}

function archivoSvgPieza(id) {
    const layout = layoutSvg();
    if (!layout || !layout.piezas) return null;
    const p = layout.piezas.find(function (x) { return x.id === id; });
    return p ? p.archivo : null;
}

function destinoEl(id) {
    if (modoSvgActivo()) {
        return document.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]');
    }
    return document.querySelector('.zona-drop[data-id="' + id + '"]');
}

function destinosDrop() {
    if (modoSvgActivo()) {
        return document.querySelectorAll("#figura-svg .svg-parte");
    }
    return document.querySelectorAll(".zona-drop");
}

function extraerHijosSvg(texto) {
    if (!texto) return [];
    const doc = new DOMParser().parseFromString(texto, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") return [];
    const hijos = [];
    for (let i = 0; i < root.childNodes.length; i++) {
        const n = root.childNodes[i];
        if (n.nodeType === 1) hijos.push(n);
    }
    return hijos;
}

function appendCapaSvg(destino, archivo, variante, clase) {
    const capa = document.createElementNS(destino.namespaceURI, "g");
    capa.setAttribute("class", clase);
    extraerHijosSvg(readText(rutaPieza(archivo, variante))).forEach(function (nodo) {
        capa.appendChild(document.importNode(nodo, true));
    });
    destino.appendChild(capa);
    return capa;
}

function armarSiluetaSvg(layout) {
    if (!layout || !layout.lienzo) return;
    const lienzo = document.getElementById("lienzo");
    if (!lienzo) return;

    const NS = "http://www.w3.org/2000/svg";
    const W = layout.lienzo.w;
    const H = layout.lienzo.h;
    const anterior = document.getElementById("figura-svg");
    if (anterior) anterior.remove();

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("id", "figura-svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("xmlns", NS);

    (layout.piezas || []).forEach(function (p) {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("class", "svg-parte");
        g.setAttribute("data-id", p.id);
        g.style.transform = "translate(" + Number(p.x || 0) + "%, " + Number(p.y || 0) + "%)";
        appendCapaSvg(g, p.archivo, "gris", "svg-parte-gris");
        appendCapaSvg(g, p.archivo, "color", "svg-parte-color");
        svg.appendChild(g);
    });

    lienzo.insertBefore(svg, lienzo.firstChild);
    document.body.classList.add("modo-svg");
    lienzo.style.aspectRatio = W + " / " + H;
    const escala = (Number(layout.escala) || 100) / 100;
    svg.style.transform = escala === 1 ? "" : "scale(" + escala + ")";
}

function rutaCuerpo(tipo) {
    const cuerpo = gameConfig.cuerpos[cuerpoElegido];
    const archivo = cuerpo[tipo] || (tipo + ".png");
    return cuerpo.carpeta + "/" + archivo;
}

function aplicarImagen(elEsImg, el, png, onFail) {
    if (elEsImg) {
        el.onerror = function () {
            if (onFail) onFail();
        };
        el.src = png;
        return;
    }

    const img = new Image();
    img.onload = function () {
        el.style.backgroundImage = "url('" + png.replace(/'/g, "\\'") + "')";
    };
    img.onerror = function () {
        if (onFail) onFail();
    };
    img.src = png;
}

function aplicarImagenFondo(el, archivo, nombre, color) {
    aplicarImagen(false, el, rutaPieza(archivo), function () {
        el.style.backgroundImage = "none";
        el.style.backgroundColor = color;
    });
}

function acc() {
    return gameConfig.accesibilidad || {};
}

const ACC_OPCIONES = [
    { key: "altoContraste", label: "Alto contraste" },
    { key: "modoTap", label: "Tocar en vez de arrastrar" },
    { key: "zoomLongPress", label: "Ampliar pieza al mantener" },
    { key: "huecosPunteados", label: "Borde punteado" },
    { key: "grillaFija", label: "Piezas en grilla" },
    { key: "resaltarDestino", label: "Resaltar destino" },
    { key: "verBotonVerDeNuevo", label: "Botón ver de nuevo" },
    { key: "pistaPorFallos", label: "Pistas por errores" },
    { key: "mostrarProgreso", label: "Mostrar progreso" }
];

function setMenuAcc(abierto) {
    const wrap = document.getElementById("menu-acc");
    const panel = document.getElementById("menu-acc-panel");
    const btn = document.getElementById("btn-menu-acc");
    if (!wrap || !panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    wrap.classList.toggle("abierto", abierto);
}

function pintarMenuAcc() {
    const caja = document.getElementById("menu-acc-ops");
    if (!caja) return;
    if (!caja.dataset.listo) {
        ACC_OPCIONES.forEach(function (item) {
            const lab = document.createElement("label");
            lab.className = "menu-acc-op";
            const inp = document.createElement("input");
            inp.type = "checkbox";
            inp.dataset.acc = item.key;
            inp.addEventListener("change", function () {
                if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
                gameConfig.accesibilidad[item.key] = inp.checked;
                aplicarAccesibilidadInicial();
            });
            const texto = document.createElement("span");
            texto.textContent = item.label;
            lab.appendChild(inp);
            lab.appendChild(texto);
            caja.appendChild(lab);
        });
        caja.dataset.listo = "1";
    }
    caja.querySelectorAll("input[data-acc]").forEach(function (inp) {
        inp.checked = !!acc()[inp.dataset.acc];
    });
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
    if (cerrar) {
        cerrar.addEventListener("click", function () {
            setMenuAcc(false);
        });
    }
    document.addEventListener("pointerdown", function (ev) {
        const menu = document.getElementById("menu-acc");
        if (menu && !menu.contains(ev.target)) setMenuAcc(false);
    });
    pintarMenuAcc();
}

function aplicarGrillaBandeja() {
    const bandeja = document.getElementById("bandeja");
    if (!bandeja || !tableroListo) return;
    const suelta = acc().grillaFija === false;
    bandeja.classList.toggle("bandeja-soltada", suelta);
    bandeja.querySelectorAll(".pieza").forEach(function (ficha) {
        if (suelta) {
            ficha.style.left = Math.floor(Math.random() * 55) + "%";
            ficha.style.top = Math.floor(Math.random() * 55) + "%";
        } else {
            ficha.style.left = "";
            ficha.style.top = "";
        }
    });
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = piezasEstado.length;
    const hechas = piezasEstado.filter(function (p) { return p.colocada; }).length;
    el.hidden = !acc().mostrarProgreso || !tableroListo || !total;
    el.innerHTML = '<i class="fa-solid fa-puzzle-piece"></i> ' + hechas + " / " + total;
}

function aplicarAccesibilidadInicial() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    document.body.classList.toggle("modo-tap", !!a.modoTap);
    document.body.classList.toggle("sin-punteado", a.huecosPunteados === false);
    document.body.classList.toggle("grilla-fija", a.grillaFija !== false);

    const btnVer = document.getElementById("btn-ver");
    if (btnVer) {
        btnVer.hidden = !a.verBotonVerDeNuevo;
    }
    aplicarGrillaBandeja();
    actualizarProgreso();
    mostrarReferenciaAyuda();
    pintarMenuAcc();
    if (tableroListo) sizePiezasAHuecos();
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
    elegirNivel();
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
    iniciarEscenario();
}
window.confirmarNivel = confirmarNivel;

function iniciarEscenario() {
    tableroListo = false;
    pistaPiezaId = null;
    ocultarVistaCompleta();
    const piezas = piezasDelNivel();
    piezasEstado = piezas.map(function (p) {
        return {
            id: p.id,
            nombre: nombrePieza(p),
            archivo: p.archivo,
            zona: p.zona || null,
            x: p.x,
            y: p.y,
            w: p.w,
            h: p.h,
            colocada: false,
            enBandeja: false,
            fallos: 0,
            color: COLORES[p.id] || "#90caf9"
        };
    });

    aplicarAccesibilidadInicial();

    const silueta = document.getElementById("img-silueta");
    const layout = layoutSvg();

    if (layout) {
        silueta.hidden = true;
        armarSiluetaSvg(layout);
    } else {
        limpiarSiluetaSvg();
        silueta.hidden = false;
        silueta.style.display = "block";
        aplicarImagen(true, silueta, rutaCuerpo("silueta"), function () {
            silueta.hidden = true;
        });
    }

    const completo = document.getElementById("img-completo");
    if (completo) {
        completo.hidden = true;
        completo.removeAttribute("src");
    }

    document.getElementById("zonas").innerHTML = "";
    document.getElementById("piezas-colocadas").innerHTML = "";
    document.getElementById("bandeja").innerHTML = "";
    document.getElementById("escenario").style.visibility = "hidden";

    mostrarFiguraCompleta();
}

function mostrarColorSvg() {
    document.querySelectorAll("#figura-svg .svg-parte.sombra").forEach(function (g) {
        g.classList.remove("sombra");
    });
}

function restaurarSombraSvg() {
    document.querySelectorAll("#figura-svg .svg-parte").forEach(function (g) {
        if (!g.classList.contains("colocada")) g.classList.add("sombra");
    });
}

async function mostrarFiguraCompleta() {
    document.getElementById("escenario").style.visibility = "visible";
    if (modoSvgActivo()) mostrarColorSvg();
    await sleep(acc().tiempoMostrarCompleto || 2000);
    if (modoSvgActivo()) restaurarSombraSvg();
    armarTablero();
}

function piezasVisiblesConfig() {
    const n = Number(acc().piezasVisibles);
    if (!n || n < 1) return 1;
    if (n > 10) return 10;
    return Math.floor(n);
}

function piezasPendientesBandeja() {
    return piezasEstado.filter(function (p) {
        return !p.colocada && !p.enBandeja;
    });
}

function piezasActivasEnBandeja() {
    return piezasEstado.filter(function (p) {
        return !p.colocada && p.enBandeja;
    });
}

function animarEntradaFichas(selector) {
    document.querySelectorAll(selector).forEach(function (ficha, i) {
        setTimeout(function () {
            ficha.classList.add("pieza-visible");
            ficha.classList.remove("pieza-entrada");
        }, 90 * i);
    });
}

function posicionarFichasSuelta(fichas) {
    if (acc().grillaFija !== false) return;
    fichas.forEach(function (ficha) {
        ficha.style.left = Math.floor(Math.random() * 55) + "%";
        ficha.style.top = Math.floor(Math.random() * 55) + "%";
    });
}

function crearFichaBandeja(pieza) {
    const bandeja = document.getElementById("bandeja");
    const svg = modoSvgActivo();
    const ficha = document.createElement("div");

    pieza.enBandeja = true;
    ficha.className = "pieza pieza-entrada";
    ficha.dataset.id = pieza.id;
    ficha.setAttribute("aria-label", pieza.nombre);

    if (svg) {
        pintarFichaSvg(ficha, pieza);
    } else {
        aplicarImagenFondo(ficha, pieza.archivo, pieza.nombre, pieza.color);
    }

    enlazarPieza(ficha, pieza);
    bandeja.appendChild(ficha);
    return ficha;
}

function agregarPiezasABandeja(cantidad) {
    const pendientes = piezasPendientesBandeja();
    const aMostrar = pendientes.slice(0, cantidad);
    if (!aMostrar.length) return;

    const bandeja = document.getElementById("bandeja");
    bandeja.classList.toggle("bandeja-soltada", acc().grillaFija === false);

    const nuevasFichas = aMostrar.map(function (pieza) {
        return crearFichaBandeja(pieza);
    });

    posicionarFichasSuelta(nuevasFichas);

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            nuevasFichas.forEach(function (ficha) {
                aplicarTamanoHueco(ficha, ficha.dataset.id);
            });
            animarEntradaFichas("#bandeja .pieza.pieza-entrada");
        });
    });
}

function verificarSiguienteLote() {
    if (juegoTerminado || piezasActivasEnBandeja().length > 0) return;

    const pendientes = piezasPendientesBandeja();
    if (!pendientes.length) return;

    agregarPiezasABandeja(Math.min(piezasVisiblesConfig(), pendientes.length));
}

function armarTablero() {
    const zonas = document.getElementById("zonas");
    const bandeja = document.getElementById("bandeja");
    zonas.innerHTML = "";
    bandeja.innerHTML = "";
    const svg = modoSvgActivo();

    piezasEstado.forEach(function (pieza) {
        pieza.enBandeja = false;

        if (!svg && pieza.zona) {
            const zona = document.createElement("div");
            zona.className = "zona-drop";
            zona.dataset.id = pieza.id;
            zona.style.left = pieza.zona.x + "%";
            zona.style.top = pieza.zona.y + "%";
            zona.style.width = pieza.zona.w + "%";
            zona.style.height = pieza.zona.h + "%";
            zona.addEventListener("pointerup", function (ev) {
                ev.stopPropagation();
                if (!acc().modoTap || !piezaSeleccionada || juegoTerminado) return;
                intentarColocar(piezaSeleccionada, zona.dataset.id);
            });
            zonas.appendChild(zona);
        }
    });

    agregarPiezasABandeja(piezasVisiblesConfig());

    mostrarReferenciaAyuda();
    tableroListo = true;
    actualizarProgreso();
}

function feedbackActivo() {
    return acc().mostrarFeedBack !== false;
}

function cfgFeedback(tipo) {
    const fb = acc().feedback || {};
    const item = fb[tipo] || {};
    const defaults = {
        acierto: { texto: "¡Muy bien! Esa parte va ahí.", gif: "../../images/correcto.gif" },
        error: { texto: "¡Inténtalo otra vez! Observa dónde puede ir.", gif: "../../images/incorrecto.gif" }
    };
    const def = defaults[tipo] || {};
    return {
        texto: item.texto || def.texto || "",
        gif: item.gif || def.gif || "",
        duracion: fb.duracion || 2000
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

function enlazarPieza(el, pieza) {
    el.addEventListener("pointerdown", function (ev) {
        if (pieza.colocada || juegoTerminado) return;
        ev.preventDefault();

        if (acc().zoomLongPress && !acc().modoTap) {
            longPressTimer = setTimeout(function () {
                abrirZoom(pieza, el);
            }, 650);
        }

        if (acc().modoTap) {
            ev.stopPropagation();
            seleccionarPieza(pieza.id);
            return;
        }

        el.setPointerCapture(ev.pointerId);
        iniciarArrastre(ev, el, pieza);
    });

    el.addEventListener("pointermove", function (ev) {
        if (!dragActivo || dragActivo.id !== pieza.id) return;
        moverFantasma(ev);
        resaltarZona(pieza.id);
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });

    el.addEventListener("pointerup", function (ev) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        if (zoomAbierto) {
            cerrarZoom();
            cancelarArrastre(el);
            return;
        }
        if (!dragActivo || dragActivo.id !== pieza.id) return;
        finalizarArrastre(ev, el, pieza);
    });

    el.addEventListener("pointercancel", function () {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        cancelarArrastre(el);
        quitarResalte();
    });
}

function bboxPiezaSvg(id) {
    const parte = destinoEl(id);
    const capa = parte && (parte.querySelector(".svg-parte-color") || parte);
    if (!capa || typeof capa.getBBox !== "function") return null;
    try {
        const bb = capa.getBBox();
        if (!bb.width || !bb.height) return null;
        return bb;
    } catch (e) {
        return null;
    }
}

function pintarFichaSvg(ficha, pieza) {
    const archivo = archivoSvgPieza(pieza.id);
    if (!archivo || !ficha) return;
    const NS = "http://www.w3.org/2000/svg";
    const bb = bboxPiezaSvg(pieza.id);
    const layout = layoutSvg();
    const meta = layout && layout.piezas ? layout.piezas.find(function (p) { return p.id === pieza.id; }) : null;
    const vx = bb ? bb.x : 0;
    const vy = bb ? bb.y : 0;
    const vw = bb ? bb.width : (meta && meta.w) || 100;
    const vh = bb ? bb.height : (meta && meta.h) || 100;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", vx + " " + vy + " " + vw + " " + vh);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    extraerHijosSvg(readText(rutaPieza(archivo, "color"))).forEach(function (nodo) {
        svg.appendChild(document.importNode(nodo, true));
    });
    ficha.innerHTML = "";
    ficha.style.backgroundImage = "none";
    ficha.appendChild(svg);
}

function tamanoZona(id) {
    if (modoSvgActivo()) {
        const parte = destinoEl(id);
        if (parte) {
            const r = parte.getBoundingClientRect();
            if (r.width > 1 && r.height > 1) {
                return {
                    w: Math.round(r.width),
                    h: Math.round(r.height)
                };
            }
        }
    }
    const zona = document.querySelector('.zona-drop[data-id="' + id + '"]');
    if (!zona) return { w: 72, h: 72 };
    const r = zona.getBoundingClientRect();
    return {
        w: Math.max(40, Math.round(r.width)),
        h: Math.max(40, Math.round(r.height))
    };
}

function aplicarTamanoHueco(el, id) {
    if (!el) return;
    const t = tamanoZona(id);
    el.style.width = t.w + "px";
    el.style.height = t.h + "px";
}

function sizePiezasAHuecos() {
    document.querySelectorAll("#bandeja .pieza").forEach(function (p) {
        aplicarTamanoHueco(p, p.dataset.id);
    });
}

function reducirParaEncaje(el, id) {
    aplicarTamanoHueco(el, id);
}

function restaurarTamanoPiezas() {
    document.querySelectorAll("#bandeja .pieza").forEach(function (p) {
        p.classList.remove("encaje");
        aplicarTamanoHueco(p, p.dataset.id);
    });
}

function seleccionarPieza(id) {
    avisarPiezaActiva(id);
    piezaSeleccionada = id;
    restaurarTamanoPiezas();
    document.querySelectorAll(".pieza").forEach(function (p) {
        const activa = p.dataset.id === id;
        p.classList.toggle("seleccionada", activa);
        if (activa) reducirParaEncaje(p, id);
    });
    resaltarZona(id);
}

function iniciarArrastre(ev, el, pieza) {
    avisarPiezaActiva(pieza.id);
    dragActivo = { id: pieza.id, el: el };
    el.classList.add("arrastrando");
    reducirParaEncaje(el, pieza.id);
    const t = tamanoZona(pieza.id);
    if (modoSvgActivo()) {
        fantasma = el.cloneNode(true);
        fantasma.className = "pieza-fantasma";
    } else {
        fantasma = document.createElement("div");
        fantasma.className = "pieza-fantasma";
        fantasma.style.backgroundImage = el.style.backgroundImage;
        fantasma.style.backgroundColor = el.style.backgroundColor || "transparent";
    }
    fantasma.style.width = t.w + "px";
    fantasma.style.height = t.h + "px";
    document.body.appendChild(fantasma);
    moverFantasma(ev);
    resaltarZona(pieza.id);
}

function moverFantasma(ev) {
    if (!fantasma) return;
    const w = fantasma.offsetWidth || 140;
    const h = fantasma.offsetHeight || 140;
    fantasma.style.left = ev.clientX - w / 2 + "px";
    fantasma.style.top = ev.clientY - h / 2 + "px";
}

function cancelarArrastre(el) {
    dragActivo = null;
    if (el) el.classList.remove("arrastrando");
    restaurarTamanoPiezas();
    if (fantasma) {
        fantasma.remove();
        fantasma = null;
    }
}

function finalizarArrastre(ev, el, pieza) {
    const zonaId = zonaBajoPunto(ev.clientX, ev.clientY, pieza.id);
    cancelarArrastre(el);
    quitarResalte();
    if (!zonaId) {
        rebotar(el);
        return;
    }
    intentarColocar(pieza.id, zonaId);
}

function capaHitSvg(parte) {
    if (!parte) return null;
    if (parte.classList.contains("sombra")) {
        return parte.querySelector(".svg-parte-gris") || parte;
    }
    return parte.querySelector(".svg-parte-color") || parte;
}

function puntoEnRect(rect, x, y) {
    if (!rect || rect.width < 1 || rect.height < 1) return false;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function solapaRect(a, b) {
    if (!a || !b || a.width < 1 || a.height < 1 || b.width < 1 || b.height < 1) return 0;
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return (w * h) / (a.width * a.height);
}

function puntoEnPinturaSvg(parte, x, y) {
    const svg = parte.closest("#figura-svg");
    if (!svg) return false;
    const hermanos = svg.querySelectorAll(".svg-parte");
    const previo = [];
    for (let i = 0; i < hermanos.length; i++) {
        if (hermanos[i] === parte) continue;
        previo.push([hermanos[i], hermanos[i].style.pointerEvents]);
        hermanos[i].style.pointerEvents = "none";
    }
    const lista = document.elementsFromPoint(x, y);
    for (let i = 0; i < previo.length; i++) {
        previo[i][0].style.pointerEvents = previo[i][1];
    }
    for (let i = 0; i < lista.length; i++) {
        const el = lista[i];
        if (el.closest && el.closest(".svg-parte") === parte) return true;
    }
    return false;
}

function umbralSolape() {
    const p = Number(acc().porcentajeAcierto);
    if (p > 0 && p <= 100) return p / 100;
    return 0.6;
}

function rectCapaDestino(destino) {
    if (!destino) return null;
    if (destino.classList.contains("svg-parte")) {
        const capa = capaHitSvg(destino);
        return (capa || destino).getBoundingClientRect();
    }
    return destino.getBoundingClientRect();
}

function mejorDestinoPorSolape(fichaRect) {
    let mejor = { id: null, solape: 0 };
    if (!fichaRect || fichaRect.width < 1 || fichaRect.height < 1) return mejor;
    destinosDrop().forEach(function (d) {
        if (d.classList.contains("colocada") || d.style.visibility === "hidden") return;
        const s = solapaRect(fichaRect, rectCapaDestino(d));
        if (s > mejor.solape) mejor = { id: d.dataset.id, solape: s };
    });
    return mejor;
}

function zonaBajoPunto(x, y, piezaId) {
    const umbral = umbralSolape();
    if (fantasma) {
        const fichaRect = fantasma.getBoundingClientRect();
        if (piezaId) {
            const correcta = destinoEl(piezaId);
            if (correcta && !correcta.classList.contains("colocada")) {
                const s = solapaRect(fichaRect, rectCapaDestino(correcta));
                if (s > umbral) return piezaId;
            }
        }
        const mejor = mejorDestinoPorSolape(fichaRect);
        if (mejor.id && mejor.id !== piezaId && mejor.solape > umbral) return mejor.id;
        return null;
    }

    if (modoSvgActivo()) {
        if (piezaId) {
            const correcta = destinoEl(piezaId);
            if (
                correcta &&
                !correcta.classList.contains("colocada") &&
                (puntoEnPinturaSvg(correcta, x, y) || puntoEnRect(rectCapaDestino(correcta), x, y))
            ) {
                return piezaId;
            }
        }
        const lista = document.elementsFromPoint(x, y);
        for (let i = 0; i < lista.length; i++) {
            const el = lista[i];
            const parte = el.closest ? el.closest(".svg-parte") : null;
            if (!parte || !parte.closest("#figura-svg") || parte.classList.contains("colocada")) continue;
            return parte.dataset.id;
        }
        return null;
    }

    let encontrada = null;
    destinosDrop().forEach(function (zona) {
        if (puntoEnRect(zona.getBoundingClientRect(), x, y)) encontrada = zona.dataset.id;
    });
    return encontrada;
}

function resaltarZona(id) {
    if (!acc().resaltarDestino) return;
    destinosDrop().forEach(function (z) {
        z.classList.toggle("resalte", z.dataset.id === id && !z.classList.contains("colocada"));
    });
}

function quitarResalte() {
    destinosDrop().forEach(function (z) {
        z.classList.remove("resalte");
    });
}

function intentarColocar(piezaId, zonaId) {
    const pieza = piezasEstado.find(function (p) { return p.id === piezaId; });
    if (!pieza || pieza.colocada) return;

    if (piezaId === zonaId) {
        colocarPieza(pieza);
    } else {
        fallarPieza(pieza);
    }

    piezaSeleccionada = null;
    restaurarTamanoPiezas();
    document.querySelectorAll(".pieza").forEach(function (p) {
        p.classList.remove("seleccionada");
    });
    quitarResalte();
}

function colocarPieza(pieza) {
    pieza.colocada = true;
    pieza.enBandeja = false;
    if (pistaPiezaId === pieza.id) pistaPiezaId = null;
    const ficha = document.querySelector('.pieza[data-id="' + pieza.id + '"]');
    if (ficha) {
        ficha.classList.remove("pieza-visible", "pieza-entrada", "seleccionada", "arrastrando");
        ficha.classList.add("pieza-saliendo");
        setTimeout(function () {
            if (ficha.parentNode) ficha.remove();
            verificarSiguienteLote();
        }, 300);
    } else {
        verificarSiguienteLote();
    }

    if (modoSvgActivo()) {
        const parte = destinoEl(pieza.id);
        if (parte) {
            parte.classList.add("colocada");
            parte.classList.remove("sombra", "pista-1", "pista-2");
        }
    } else if (pieza.zona) {
        const colocada = document.createElement("div");
        colocada.className = "pieza-colocada";
        colocada.style.left = pieza.zona.x + "%";
        colocada.style.top = pieza.zona.y + "%";
        colocada.style.width = pieza.zona.w + "%";
        colocada.style.height = pieza.zona.h + "%";
        aplicarImagenFondo(colocada, pieza.archivo, pieza.nombre, pieza.color);
        document.getElementById("piezas-colocadas").appendChild(colocada);

        const zona = destinoEl(pieza.id);
        if (zona) zona.style.visibility = "hidden";
    }

    actualizarProgreso();
    reproducirAudio(gameConfig.audios && gameConfig.audios.acierto);
    mostrarFeedback("acierto").then(function () {
        if (piezasEstado.every(function (p) { return p.colocada; })) {
            terminarJuego();
        }
    });
}

function intentosPista(nivel) {
    if (nivel === 2) {
        const n = Number(acc().fallosPista2);
        return n > 0 ? n : 3;
    }
    const n = Number(acc().fallosPista1);
    return n > 0 ? n : 2;
}

function quitarPistasVisuales() {
    destinosDrop().forEach(function (z) {
        z.classList.remove("pista-1");
        z.classList.remove("pista-2");
    });
}

function reiniciarPista() {
    quitarPistasVisuales();
    if (pistaPiezaId) {
        const previa = piezasEstado.find(function (p) { return p.id === pistaPiezaId; });
        if (previa) previa.fallos = 0;
    }
    pistaPiezaId = null;
}

function avisarPiezaActiva(id) {
    if (pistaPiezaId && pistaPiezaId !== id) reiniciarPista();
}

function fallarPieza(pieza) {
    if (pistaPiezaId && pistaPiezaId !== pieza.id) reiniciarPista();
    pieza.fallos += 1;
    const ficha = document.querySelector('.pieza[data-id="' + pieza.id + '"]');
    rebotar(ficha);
    mostrarFeedback("error");
    reproducirAudio(gameConfig.audios && gameConfig.audios.error);

    const zona = destinoEl(pieza.id);
    if (!zona || acc().pistaPorFallos === false) return;
    const n1 = intentosPista(1);
    const n2 = intentosPista(2);
    if (pieza.fallos >= n2) {
        zona.classList.add("pista-2");
        zona.classList.remove("pista-1");
        pistaPiezaId = pieza.id;
    } else if (pieza.fallos >= n1) {
        zona.classList.add("pista-1");
        zona.classList.remove("pista-2");
        pistaPiezaId = pieza.id;
    }
}

function rebotar(el) {
    if (!el) return;
    el.classList.remove("rebote");
    void el.offsetWidth;
    el.classList.add("rebote");
    setTimeout(function () {
        el.classList.remove("rebote");
    }, 560);
}

function abrirZoom(pieza, el) {
    zoomAbierto = true;
    const overlay = document.getElementById("zoom-pieza");
    overlay.innerHTML = '<div class="pieza-zoom-inner"></div>';
    const inner = overlay.querySelector(".pieza-zoom-inner");
    const svg = el.querySelector("svg");
    if (svg) {
        inner.appendChild(svg.cloneNode(true));
    } else {
        inner.style.backgroundImage = el.style.backgroundImage;
        inner.style.backgroundColor = pieza.color;
    }
    overlay.hidden = false;
}

function cerrarZoom() {
    zoomAbierto = false;
    document.getElementById("zoom-pieza").hidden = true;
}

function mostrarReferenciaAyuda() {
    const caja = document.getElementById("referencia-completa");
    if (caja) caja.hidden = true;
}

function verDeNuevo() {
    if (!tableroListo || !nivelElegido || !cuerpoElegido || juegoTerminado) return;
    if (modoSvgActivo()) {
        mostrarColorSvg();
        document.body.classList.add("viendo-completo");
        clearTimeout(verDeNuevoTimer);
        verDeNuevoTimer = setTimeout(ocultarVistaCompleta, acc().tiempoVerDeNuevo || 2000);
        return;
    }
    const silueta = document.getElementById("img-silueta");
    if (silueta) silueta.hidden = true;
    document.body.classList.add("viendo-completo");
    clearTimeout(verDeNuevoTimer);
    verDeNuevoTimer = setTimeout(ocultarVistaCompleta, acc().tiempoVerDeNuevo || 2000);
}

function ocultarVistaCompleta() {
    clearTimeout(verDeNuevoTimer);
    verDeNuevoTimer = null;
    if (modoSvgActivo()) restaurarSombraSvg();
    const silueta = document.getElementById("img-silueta");
    if (silueta && !modoSvgActivo()) silueta.hidden = siluetaOcultaAntes;
    document.body.classList.remove("viendo-completo");
}

function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    ocultarVistaCompleta();
    reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);

    setTimeout(function () {
        $("#principal").fadeOut(500);
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
    enlazarMenuAcc();

    document.getElementById("btn-ver").addEventListener("click", function () {
        if (!acc().verBotonVerDeNuevo) return;
        verDeNuevo();
    });

    document.getElementById("lienzo").addEventListener("pointerup", function (ev) {
        if (!acc().modoTap || !piezaSeleccionada || juegoTerminado) return;
        if (ev.target.closest && ev.target.closest(".pieza")) return;
        const zonaId = zonaBajoPunto(ev.clientX, ev.clientY, piezaSeleccionada);
        if (zonaId) {
            intentarColocar(piezaSeleccionada, zonaId);
        }
    });
    const zoomPieza = document.getElementById("zoom-pieza");
    if (zoomPieza) {
        zoomPieza.addEventListener("click", cerrarZoom);
    }

    const lienzo = document.getElementById("lienzo");
    if (lienzo && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(function () {
            if (tableroListo) sizePiezasAHuecos();
        }).observe(lienzo);
    }

    preloadGifs(introConfig.personajes).then(function () {
        renderPersonajes(introConfig.personajes);
        iniciarIntro();
    });
});
