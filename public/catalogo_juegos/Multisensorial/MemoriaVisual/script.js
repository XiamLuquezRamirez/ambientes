let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introTimers = [];
let audioFondo = null;

const R = window.MemoriaVisualRetos;

let nivelElegido = null;
let retosNivel = [];
let retoActual = 0;
let retoToken = 0;
let juegoTerminado = false;
let esperandoRespuesta = false;
let marcandoRespuesta = false;
let erroresReto = 0;
let pistaActiva = false;
/** Secuencia: baldosas ya tocadas en orden. Intercambio: objetos seleccionados. */
let progresoReto = [];
let ultimaLinea = null;
let tokenVoz = 0;
let timersReto = [];

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

function audios() {
    return (gameConfig && gameConfig.audios) || {};
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
    if (window.MemoriaVisualSfx) window.MemoriaVisualSfx.desbloquear();
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
    return reproducirAudio(audios().fondo, TextoVoz.VOLUMEN_FONDO, true);
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
    { key: "verBotonRepetir", label: "Botón escuchar otra vez" },
    { key: "barraTiempo", label: "Barra de tiempo" },
    { key: "animaciones_opciones", label: "Animar objetos" },
    { key: "efectosSonido", label: "Efectos de sonido" },
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
    const btnRepetir = document.getElementById("btn-repetir");
    if (btnRepetir) btnRepetir.hidden = a.verBotonRepetir === false;
    if (window.MemoriaVisualSfx) window.MemoriaVisualSfx.activar(a.efectosSonido !== false);
    aplicarVisual();
    pintarInsignias();
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

/* ---------- Progreso: una insignia por reto ---------- */

function iconoProgreso() {
    const icono = String((nivelElegido && nivelElegido.progreso && nivelElegido.progreso.icono) || "fa-medal");
    return /^fa-[a-z0-9-]+$/.test(icono) ? icono : "fa-medal";
}

function pintarInsignias(recien) {
    const el = document.getElementById("insignias");
    if (!el) return;
    const total = retosNivel.length;
    el.hidden = acc().mostrarProgreso === false || !total;
    let html = "";
    for (let i = 0; i < total; i++) {
        let clase = "";
        if (i < retoActual) clase = " llena";
        else if (i === retoActual && !juegoTerminado) clase = " actual";
        if (recien && i === retoActual - 1) clase += " recien";
        html += '<i class="fa-solid ' + iconoProgreso() + " insignia" + clase + '" aria-hidden="true"></i>';
    }
    el.innerHTML = html;
    el.setAttribute("aria-label", "Reto " + Math.min(retoActual + 1, total) + " de " + total);
}

/* ---------- Nivel ---------- */

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

/** Sortea el contenido de todos los retos al inicio: la sesión evita repetir objetos entre retos. */
function prepararNivel() {
    const sesion = R.crearSesion();
    retosNivel = R.resolverRetos(gameConfig, nivelElegido).map(function (def) {
        return { def: def, ctx: R.prepararReto(gameConfig, nivelElegido, def, sesion) };
    });
    retoActual = 0;
}

function confirmarNivel(id) {
    nivelElegido = (gameConfig.niveles || []).find(function (n) {
        return String(n.id) === String(id);
    });
    Swal.close();
    if (!nivelElegido) return;
    juegoTerminado = false;
    prepararNivel();
    precargarFrasesNivel();
    aplicarAccesibilidadInicial();
    if (acc().mostrarIntro && window.PedniaTutorial) {
        correrDemo().then(function () {
            if (!juegoTerminado) correrReto();
        });
        return;
    }
    correrReto();
}
window.confirmarNivel = confirmarNivel;

/* ---------- Voz ---------- */

function lineaReto(reto, clave, datos) {
    const l = R.linea(reto.def.textos && reto.def.textos[clave], "zoe");
    if (!l || !l.texto) return null;
    return {
        texto: R.plantilla(l.texto, datos || R.datosReto(gameConfig, reto.ctx)),
        personaje: l.personaje
    };
}

function precargarFrasesNivel() {
    if (typeof TextoVoz === "undefined" || typeof TextoVoz.encolarFrases !== "function") return;
    const frases = [];
    retosNivel.forEach(function (reto) {
        const ctx = reto.ctx;
        ["intro", "observacion", "ocultamiento", "pregunta", "acierto", "pista"].forEach(function (clave) {
            const l = lineaReto(reto, clave);
            if (l) frases.push(l);
        });
        if (reto.def.entrada === "nombrando") {
            ctx.mostrar.forEach(function (id, i) {
                const clave = i === 0 ? "nombrarPrimero" : (i === ctx.mostrar.length - 1 ? "nombrarUltimo" : "nombrarSiguiente");
                const l = lineaReto(reto, clave, R.datosObjeto(gameConfig, id));
                if (l) frases.push(l);
            });
        }
        // El error nombra el objeto tocado: se precargan las variantes posibles.
        const tocables = ctx.mecanica === "oculto" ? (ctx.opciones || []) : (ctx.desafio || ctx.mostrar).filter(Boolean);
        const vistos = {};
        tocables.forEach(function (id) {
            if (ctx.correcto.indexOf(id) !== -1) return;
            const l = lineaReto(reto, "error", R.datosToque(gameConfig, ctx, id));
            if (l && !vistos[l.texto]) {
                vistos[l.texto] = true;
                frases.push(l);
            }
        });
    });
    if (nivelElegido && nivelElegido.cierre) frases.push({ texto: nivelElegido.cierre, personaje: "zoe" });
    if (frases.length) TextoVoz.encolarFrases(frases);
}

function marcarHablando(personaje) {
    ["zoe", "zeus"].forEach(function (pj) {
        const el = document.getElementById("guia-" + pj);
        if (el) el.classList.toggle("hablando", pj === personaje);
    });
}

function hablarLinea(l, mostrar) {
    if (!l || !l.texto) return Promise.resolve();
    if (mostrar !== false) setEnunciado(l.texto);
    if (typeof TextoVoz === "undefined") return Promise.resolve();
    const t = ++tokenVoz;
    marcarHablando(l.personaje);
    return TextoVoz.hablar(l.texto, l.personaje).then(function () {
        if (t === tokenVoz) marcarHablando(null);
    });
}

function feedbackActivo() {
    return acc().mostrarFeedBack !== false;
}

function repetirAudio() {
    if (!ultimaLinea || juegoTerminado || !esperandoRespuesta) return;
    hablarLinea(ultimaLinea);
}

/* ---------- Efectos de sonido y animación ---------- */

function efectosSonidoActivos() {
    return acc().efectosSonido !== false;
}

function sfx(nombre, arg) {
    if (!efectosSonidoActivos() || !window.MemoriaVisualSfx) return false;
    return window.MemoriaVisualSfx.sonar(nombre, arg);
}

function animacionesActivas() {
    if (!acc().animaciones_opciones) return false;
    try {
        return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
        return true;
    }
}

/** Reinicia una clase de animación y la retira al terminar. */
function pulso(el, clase, ms) {
    if (!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, ms || 700);
}

function animarWaapi(el, frames, opciones) {
    if (!el || typeof el.animate !== "function" || !animacionesActivas()) return Promise.resolve();
    try {
        return el.animate(frames, opciones).finished.catch(function () {});
    } catch (e) {
        return Promise.resolve();
    }
}

function centro(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function cancelado(token) {
    return juegoTerminado || token !== retoToken;
}

/* ---------- Escena y utilería ---------- */

function setEscena(escena) {
    const p = document.getElementById("principal");
    if (!p) return;
    Array.prototype.slice.call(p.classList).forEach(function (c) {
        if (c.indexOf("escena-") === 0) p.classList.remove(c);
    });
    if (escena) p.classList.add("escena-" + escena);
}

function guiaImg(pj) {
    const guias = (gameConfig && gameConfig.guias) || {};
    return guias[pj] || ("../../img/" + pj + "_normal.gif");
}

function limpiarUtileria() {
    const u = document.getElementById("utileria");
    destinoZeus = null;
    if (!u) return;
    u.className = "utileria";
    u.innerHTML = "";
}

function montarUtileria(reto) {
    limpiarUtileria();
    const u = document.getElementById("utileria");
    const def = reto.def;
    if (!u) return;
    if (def.ocultamiento === "mochila") {
        u.innerHTML = '<img class="mochila" id="mochila" src="img/mochila_abierta.svg" alt="Mochila" draggable="false">';
    } else if (def.zeusSostiene) {
        u.innerHTML = '<img class="zeus-globos" src="' + attrEsc(guiaImg("zeus")) + '" alt="Zeus" draggable="false">';
    } else if (def.zeusCamina) {
        u.className = "utileria utileria-caminito";
        u.innerHTML = '<img class="zeus-camino" id="zeus-camino" src="' + attrEsc(guiaImg("zeus")) + '" alt="Zeus" draggable="false" style="visibility:hidden">' +
            '<span class="meta-picnic" aria-hidden="true"></span>';
    }
}

let destinoZeus = null;

/** Zeus en el caminito: `destino` es "inicio", "meta" o una baldosa. */
function moverZeus(destino, saltar, instantaneo) {
    const z = document.getElementById("zeus-camino");
    const wrap = document.getElementById("tablero-wrap");
    const tablero = document.getElementById("tablero");
    if (!z || !wrap || !tablero) return;
    const rw = wrap.getBoundingClientRect();
    const zw = z.offsetWidth || 92;
    const zh = z.offsetHeight || 92;
    let x;
    let y;
    if (destino === "inicio") {
        const rt = tablero.getBoundingClientRect();
        x = rt.left - rw.left + 10;
        y = rt.top - rw.top + rt.height / 2 - zh / 2;
    } else if (destino === "meta") {
        const meta = wrap.querySelector(".meta-picnic");
        if (!meta) return;
        const rm = meta.getBoundingClientRect();
        x = rm.left - rw.left + rm.width / 2 - zw / 2;
        y = rm.top - rw.top - zh * 0.55;
    } else {
        const rb = destino.getBoundingClientRect();
        x = rb.left - rw.left + rb.width / 2 - zw / 2;
        y = rb.top - rw.top - zh * 0.6;
    }
    destinoZeus = destino;
    if (instantaneo) z.style.transition = "none";
    z.style.left = x + "px";
    z.style.top = y + "px";
    z.style.visibility = "";
    if (instantaneo) {
        void z.offsetWidth;
        z.style.transition = "";
    }
    if (saltar) {
        if (animacionesActivas()) pulso(z, "salta", 600);
        sfx("salto");
    }
}

/* ---------- Objetos y tablero ---------- */

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

function htmlNumero(numero) {
    return numero ? '<span class="objeto-num" aria-hidden="true">' + numero + "</span>" : "";
}

function crearObjeto(id, opciones) {
    const op = opciones || {};
    const el = document.createElement("button");
    el.type = "button";
    el.className = "objeto" + (op.clase ? " " + op.clase : "");
    el.dataset.id = id;
    if (op.indice != null) el.dataset.idx = String(op.indice);
    el.innerHTML = htmlObjeto(id) + htmlNumero(op.numero);
    el.addEventListener("click", function () { alTocar(el, op.zona || "tablero"); });
    return el;
}

/** Lo tapado por la hoja gigante, o el pedestal vacío con humo que deja el ladrón de sombras. */
function crearHueco(cubrirCon, indice, numero) {
    const el = document.createElement("div");
    const hoja = cubrirCon === "hoja";
    el.className = "objeto objeto-hueco objeto-hueco-" + (hoja ? "hoja" : "humo");
    el.dataset.idx = String(indice);
    el.innerHTML = '<span class="hueco-espacio" aria-hidden="true"></span>' +
        (hoja
            ? '<img class="hoja-gigante" src="img/hoja.svg" alt="Hoja" draggable="false">'
            : '<span class="hueco-humo" aria-hidden="true"></span>') +
        '<span class="objeto-nombre">?</span>' + htmlNumero(numero);
    const img = el.querySelector(".hoja-gigante");
    if (img) {
        img.addEventListener("animationend", function fin(ev) {
            if (ev.animationName !== "hojaCae") return;
            img.removeEventListener("animationend", fin);
            img.classList.add("caida");
        });
    }
    return el;
}

function animarEntrada(contenedor) {
    const hijos = contenedor.querySelectorAll(".objeto");
    if (!animacionesActivas()) return 0;
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

/** `lista` admite null: hueco tapado (hoja) o vacío (ladrón de sombras). */
function pintarTablero(lista, opciones) {
    const op = opciones || {};
    const tablero = document.getElementById("tablero");
    tablero.className = "tablero" + (op.clase ? " " + op.clase : "");
    tablero.innerHTML = "";
    lista.forEach(function (id, i) {
        const numero = op.numerar ? i + 1 : null;
        tablero.appendChild(id
            ? crearObjeto(id, { indice: i, numero: numero, clase: op.claseObjeto })
            : crearHueco(op.cubrirCon, i, numero));
    });
    return op.sinAnimar ? 0 : animarEntrada(tablero);
}

function pintarOpciones(ids) {
    const caja = document.getElementById("opciones");
    caja.hidden = false;
    caja.innerHTML = "";
    ids.forEach(function (id) {
        caja.appendChild(crearObjeto(id, { clase: "objeto-opcion", zona: "opciones" }));
    });
    return animarEntrada(caja);
}

function limpiarOpciones() {
    const caja = document.getElementById("opciones");
    caja.hidden = true;
    caja.innerHTML = "";
}

function tarjetas(zona) {
    return Array.prototype.slice.call(document.querySelectorAll("#" + (zona || "tablero") + " button.objeto"));
}

function tarjetaDe(id, zona) {
    return tarjetas(zona).find(function (b) { return b.dataset.id === id; }) || null;
}

function claseTablero(reto, fase) {
    const def = reto.def;
    const clases = [];
    if (fase === "observacion" || reto.ctx.mecanica !== "intruso" || def.conservarOrden) clases.push("tablero-fila");
    if (def.sinMarco) clases.push("tablero-globos");
    return clases.join(" ");
}

function setEnunciado(texto) {
    const el = document.getElementById("enunciado");
    if (el) el.textContent = texto || "";
}

function setTitulo(texto) {
    const el = document.getElementById("reto-titulo");
    if (el) el.textContent = texto || "";
}

function setRespuesta(activa) {
    esperandoRespuesta = !!activa;
    ["escenario", "zona-inferior"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("esperando", esperandoRespuesta);
    });
    const btn = document.getElementById("btn-repetir");
    if (btn) btn.disabled = !esperandoRespuesta || !ultimaLinea;
}

function puedeResponder() {
    return esperandoRespuesta && !juegoTerminado && !marcandoRespuesta;
}

function programar(fn, ms) {
    const id = setTimeout(fn, ms);
    timersReto.push(id);
    return id;
}

function limpiarTimersReto() {
    timersReto.forEach(function (id) {
        clearTimeout(id);
        clearInterval(id);
    });
    timersReto = [];
}

function msReto(valor, fallback) {
    const n = Number(valor);
    return isFinite(n) && n >= 0 ? n : fallback;
}

/* ---------- Barra de tiempo y cubiertas ---------- */

function iniciarBarra(ms) {
    const barra = document.getElementById("barra-tiempo");
    if (!barra || acc().barraTiempo === false) return;
    const relleno = barra.querySelector("span");
    barra.classList.add("activa");
    relleno.style.animation = "none";
    void relleno.offsetWidth;
    relleno.style.animation = "barraVacia " + ms + "ms linear forwards";
}

function ocultarBarra() {
    const barra = document.getElementById("barra-tiempo");
    if (!barra) return;
    barra.classList.remove("activa");
    barra.querySelector("span").style.animation = "none";
}

function mostrarCubierta(tipo) {
    const c = document.getElementById("cubierta");
    if (!c) return;
    c.className = "cubierta cubierta-" + tipo;
    c.hidden = false;
    setApagon(tipo === "apagon");
    void c.offsetWidth;
    c.classList.add("visible");
}

/** El escenario sube por encima del HUD y del cinturón para que el apagón cubra toda la pantalla. */
function setApagon(activo) {
    const esc = document.getElementById("escenario");
    if (esc) esc.classList.toggle("con-apagon", !!activo);
}

function ocultarCubierta(animar) {
    const c = document.getElementById("cubierta");
    if (!c || c.hidden) return Promise.resolve();
    if (!animar) {
        c.classList.remove("visible", "saliendo");
        c.hidden = true;
        setApagon(false);
        return Promise.resolve();
    }
    // La nube primero sigue de largo y después se disipa.
    const pasa = c.classList.contains("cubierta-nube") ? sleep(450) : Promise.resolve();
    if (c.classList.contains("cubierta-nube")) c.classList.add("saliendo");
    return pasa.then(function () {
        c.classList.remove("visible");
        return sleep(450);
    }).then(function () {
        if (!c.classList.contains("visible")) {
            c.hidden = true;
            c.classList.remove("saliendo");
            setApagon(false);
        }
    });
}

/** Foco que recorre cada objeto durante la observación (5-6 años). */
function correrRecorrido(ms) {
    const lista = tarjetas();
    if (!lista.length) return;
    const paso = Math.max(500, Math.floor(ms / lista.length));
    lista.forEach(function (el, i) {
        programar(function () {
            lista.forEach(function (b) { b.classList.remove("objeto-foco"); });
            el.classList.add("objeto-foco");
        }, i * paso);
    });
    programar(function () {
        lista.forEach(function (b) { b.classList.remove("objeto-foco"); });
    }, lista.length * paso);
}

function iniciarTictac(ms) {
    let n = 0;
    const id = setInterval(function () { sfx("tic", n++ % 2 === 0); }, 500);
    timersReto.push(id);
    programar(function () { clearInterval(id); }, ms);
}

/* ---------- Marcas y feedback ---------- */

function mostrarMarcaOk(el) {
    quitarMarca(el);
    const marca = document.createElement("span");
    marca.className = "objeto-marca objeto-marca-ok";
    marca.setAttribute("aria-hidden", "true");
    marca.innerHTML = '<span class="objeto-marca-circulo"><i class="fa-solid fa-check"></i></span>';
    el.appendChild(marca);
}

function quitarMarca(el) {
    if (!el) return;
    const m = el.querySelector(".objeto-marca");
    if (m) m.remove();
}

function celebrar(el) {
    if (!el) return;
    el.classList.remove("objeto-entra", "objeto-pista", "objeto-seleccionado");
    el.style.animationDelay = "";
    el.classList.add("objeto-ok", "objeto-acierto");
    mostrarMarcaOk(el);
}

function umbralPista() {
    const n = Number(acc().erroresAntesDePista);
    return isFinite(n) && n >= 0 ? n : 2;
}

/** "automatica" (3-4 años): brilla sola tras los errores. "lupa" (5-6): el niño decide usarla. */
function modoPista() {
    return (nivelElegido && nivelElegido.pista) || "automatica";
}

function objetivosPista(reto) {
    const ctx = reto.ctx;
    if (ctx.mecanica === "oculto") {
        return tarjetas("opciones").filter(function (b) { return b.dataset.id === ctx.correcto[0]; });
    }
    if (ctx.mecanica === "secuencia") {
        const siguiente = ctx.orden[progresoReto.length];
        return tarjetas().filter(function (b) { return b.dataset.id === siguiente; });
    }
    return tarjetas().filter(function (b) {
        return ctx.correcto.indexOf(b.dataset.id) !== -1 && progresoReto.indexOf(b.dataset.id) === -1;
    });
}

function marcarPista(reto) {
    document.querySelectorAll(".objeto-pista").forEach(function (b) { b.classList.remove("objeto-pista"); });
    if (!pistaActiva) return;
    objetivosPista(reto).forEach(function (b) { b.classList.add("objeto-pista"); });
}

function activarPista(reto) {
    pistaActiva = true;
    marcarPista(reto);
    return hablarLinea(lineaReto(reto, "pista"));
}

function prepararLupa() {
    const btn = document.getElementById("btn-lupa");
    if (!btn) return;
    btn.hidden = modoPista() !== "lupa";
    btn.disabled = true;
    btn.classList.remove("lista");
}

function habilitarLupa() {
    const btn = document.getElementById("btn-lupa");
    if (!btn || btn.hidden) return;
    btn.disabled = false;
    btn.classList.add("lista");
}

function usarLupa() {
    const reto = retosNivel[retoActual];
    if (!reto || !puedeResponder() || pistaActiva) return;
    const token = retoToken;
    const btn = document.getElementById("btn-lupa");
    if (btn) {
        btn.disabled = true;
        btn.classList.remove("lista");
    }
    sfx("magia");
    activarPista(reto).then(function () {
        if (token === retoToken) restaurarPregunta();
    });
}

function restaurarPregunta() {
    if (!juegoTerminado && esperandoRespuesta && ultimaLinea) setEnunciado(ultimaLinea.texto);
}

function efectoError(reto, el) {
    const def = reto.def;
    const tipo = def.efectoError || "vibrar";
    if (tipo === "hojaSacude") {
        const hoja = document.querySelector("#tablero .hoja-gigante");
        if (hoja) pulso(hoja, "hoja-sacude", 550);
    } else if (tipo === "marco") {
        pulso(el, "objeto-marco", 1600);
    } else if (tipo === "estirar") {
        pulso(el, "objeto-estira", 600);
    } else {
        pulso(el, "objeto-error", 450);
    }
    if (efectosSonidoActivos() && !sfx(def.sonidoError)) reproducirAudio(audios().error);
}

function marcarError(reto, el) {
    const token = retoToken;
    marcandoRespuesta = true;
    erroresReto += 1;
    efectoError(reto, el);

    let voz = Promise.resolve();
    const umbral = umbralPista();
    const alcanzado = umbral > 0 && erroresReto >= umbral && !pistaActiva;
    if (alcanzado && modoPista() === "automatica") {
        voz = activarPista(reto);
    } else {
        if (alcanzado && modoPista() === "lupa") habilitarLupa();
        if (feedbackActivo()) {
            voz = hablarLinea(lineaReto(reto, "error", R.datosToque(gameConfig, reto.ctx, el.dataset.id)));
        }
    }

    sleep(800).then(function () {
        if (!cancelado(token)) marcandoRespuesta = false;
    });
    voz.then(function () {
        if (token === retoToken) restaurarPregunta();
    });
}

/* ---------- Efectos de acierto (documento, respuesta del sistema) ---------- */

function volarArriba(el, ms) {
    return animarWaapi(el, [
        { transform: "none", opacity: 1 },
        { transform: "translate(26px, -40vh) rotate(-6deg)", opacity: 1, offset: 0.5 },
        { transform: "translate(-12px, -110vh) rotate(5deg)", opacity: 0.9 }
    ], { duration: ms || 1700, easing: "ease-in", fill: "forwards" });
}

function lanzarConfeti(el) {
    const colores = ["#ff5252", "#ffd740", "#40c4ff", "#69f0ae", "#e040fb", "#ffab40"];
    for (let i = 0; i < 16; i++) {
        const s = document.createElement("span");
        const ang = (Math.PI * 2 * i) / 16;
        const r = 70 + Math.random() * 70;
        s.className = "chispa";
        s.style.background = colores[i % colores.length];
        s.style.setProperty("--dx", Math.round(Math.cos(ang) * r) + "px");
        s.style.setProperty("--dy", Math.round(Math.sin(ang) * r) + "px");
        el.appendChild(s);
        setTimeout(function () { s.remove(); }, 1000);
    }
}

function reponerEnHueco(reto, id) {
    const ctx = reto.ctx;
    const hueco = document.querySelector('#tablero .objeto-hueco[data-idx="' + ctx.indice + '"]');
    if (!hueco) return null;
    const nuevo = crearObjeto(id, {
        indice: ctx.indice,
        numero: reto.def.numerar ? ctx.indice + 1 : null
    });
    hueco.replaceWith(nuevo);
    return nuevo;
}

function apagarOtrasOpciones(reto) {
    tarjetas("opciones").forEach(function (b) {
        if (b.dataset.id !== reto.ctx.correcto[0]) b.classList.add("objeto-apagado");
    });
}

function animarIntercambio(reto) {
    const ctx = reto.ctx;
    const a = tarjetaDe(ctx.correcto[0]);
    const b = tarjetaDe(ctx.correcto[1]);
    if (!a || !b) return Promise.resolve();
    [a, b].forEach(function (el) { el.classList.remove("objeto-seleccionado", "objeto-pista"); });
    const dx = centro(b).x - centro(a).x;
    function arco(d, alto) {
        return [
            { transform: "none" },
            { transform: "translate(" + (d / 2) + "px, " + alto + "px) rotate(180deg) scale(1.12)", offset: 0.5 },
            { transform: "translate(" + d + "px, 0) rotate(360deg)" }
        ];
    }
    const op = { duration: 1200, easing: "ease-in-out", fill: "forwards" };
    sfx("magia");
    return Promise.all([animarWaapi(a, arco(dx, -110), op), animarWaapi(b, arco(-dx, -60), op)]);
}

async function efectoAcierto(reto, el) {
    const def = reto.def;
    const ctx = reto.ctx;
    const tipo = def.efectoAcierto;

    if (ctx.mecanica === "secuencia") {
        ctx.orden.forEach(function (id) { celebrar(tarjetaDe(id)); });
        sfx("magia");
        return;
    }

    if (tipo === "globo" && el) {
        celebrar(el);
        await sleep(650);
        const globito = document.createElement("span");
        globito.className = "globito";
        el.appendChild(globito);
        sfx("salto");
        await volarArriba(el, 1700);
        return;
    }

    if (tipo === "burbuja" && el) {
        celebrar(el);
        quitarMarca(el);
        const burbuja = document.createElement("span");
        burbuja.className = "burbuja-atrapa";
        el.appendChild(burbuja);
        sfx("burbuja");
        await sleep(600);
        await volarArriba(el, 1500);
        return;
    }

    if (tipo === "confeti" && el) {
        const img = el.querySelector(".objeto-img");
        const nombre = el.querySelector(".objeto-nombre");
        const antes = datoObjeto(ctx.original);
        lanzarConfeti(el);
        sfx("explota");
        if (img) img.style.visibility = "hidden";
        await sleep(300);
        if (img) {
            img.src = antes.img;
            img.style.visibility = "";
        }
        if (nombre) nombre.textContent = antes.nombre;
        el.classList.add("objeto-ok");
        pulso(el, "objeto-destello", 900);
        return;
    }

    if (tipo === "hojaVuela") {
        if (el) celebrar(el);
        apagarOtrasOpciones(reto);
        const hoja = document.querySelector("#tablero .hoja-gigante");
        if (hoja) hoja.classList.add("hoja-vuela");
        sfx("viento");
        await sleep(650);
        const nuevo = reponerEnHueco(reto, ctx.correcto[0]);
        if (nuevo) {
            celebrar(nuevo);
            sfx("magia");
        }
        return;
    }

    if (tipo === "aparece") {
        if (el) celebrar(el);
        apagarOtrasOpciones(reto);
        await sleep(300);
        const nuevo = reponerEnHueco(reto, ctx.correcto[0]);
        if (nuevo) {
            nuevo.classList.add("objeto-ok");
            pulso(nuevo, "objeto-destello", 900);
            sfx("magia");
        }
        return;
    }

    if (tipo === "intercambiar") {
        await animarIntercambio(reto);
        pintarTablero(ctx.mostrar, { clase: claseTablero(reto, "observacion"), numerar: def.numerar, sinAnimar: true });
        ctx.correcto.forEach(function (id) { celebrar(tarjetaDe(id)); });
        return;
    }

    if (el) celebrar(el);
}

function celebrarGuias(reto) {
    if (!reto.def.celebranGuias) return;
    ["guia-zoe", "guia-zeus"].forEach(function (id) {
        pulso(document.getElementById(id), "salta", 1400);
    });
}

function reaccion3d(reto) {
    const r = reto.def.reaccion;
    const T = window.Tutorial3d;
    if (!r || !T || typeof T.reaccionar !== "function" || !animacionesActivas()) return;
    try {
        const p = T.reaccionar(r.personaje || "zoe", [].concat(r.clip || "Celebrar"), { maxMs: 2600 });
        if (p && typeof p.catch === "function") p.catch(function () {});
    } catch (e) { /* noop */ }
}

async function resolverAcierto(reto, el) {
    const token = retoToken;
    setRespuesta(false);
    marcandoRespuesta = true;
    pistaActiva = false;
    marcarPista(reto);
    prepararLupa();
    if (efectosSonidoActivos()) reproducirAudio(audios().acierto);
    const efecto = efectoAcierto(reto, el);
    celebrarGuias(reto);
    reaccion3d(reto);
    const voz = feedbackActivo() ? hablarLinea(lineaReto(reto, "acierto")) : Promise.resolve();
    await Promise.all([sleep(2400), voz, efecto]);
    if (cancelado(token)) return;
    retoActual += 1;
    pintarInsignias(true);
    await sleep(900);
    if (cancelado(token)) return;
    marcandoRespuesta = false;
    correrReto();
}

/* ---------- Respuestas por mecánica ---------- */

function alTocar(el, zona) {
    if (!puedeResponder()) return;
    const reto = retosNivel[retoActual];
    if (!reto) return;
    const ctx = reto.ctx;
    const id = el.dataset.id;

    if (ctx.mecanica === "oculto") {
        if (zona !== "opciones") return;
        pulso(el, "objeto-toque", 380);
        if (id === ctx.correcto[0]) resolverAcierto(reto, el);
        else marcarError(reto, el);
        return;
    }
    if (zona !== "tablero") return;
    pulso(el, "objeto-toque", 380);

    if (ctx.mecanica === "intruso" || ctx.mecanica === "transformacion") {
        if (id === ctx.correcto[0]) resolverAcierto(reto, el);
        else marcarError(reto, el);
        return;
    }

    if (ctx.mecanica === "secuencia") {
        if (progresoReto.indexOf(id) !== -1) return;
        const esperado = ctx.orden[progresoReto.length];
        if (id !== esperado) {
            marcarError(reto, el);
            return;
        }
        progresoReto.push(id);
        encender(el, progresoReto.length - 1, 600);
        el.classList.add("objeto-ok");
        moverZeus(el, true);
        if (progresoReto.length === ctx.orden.length) {
            setRespuesta(false);
            marcandoRespuesta = true;
            programar(function () { moverZeus("meta", true); }, 700);
            programar(function () { resolverAcierto(reto, null); }, 1300);
        } else {
            marcarPista(reto);
        }
        return;
    }

    if (ctx.mecanica === "intercambio") {
        const pos = progresoReto.indexOf(id);
        if (pos !== -1) {
            progresoReto.splice(pos, 1);
            el.classList.remove("objeto-seleccionado");
            marcarPista(reto);
            return;
        }
        if (ctx.correcto.indexOf(id) === -1) {
            marcarError(reto, el);
            return;
        }
        progresoReto.push(id);
        el.classList.add("objeto-seleccionado");
        sfx("ding", progresoReto.length);
        marcarPista(reto);
        if (progresoReto.length === ctx.correcto.length) resolverAcierto(reto, null);
    }
}

/* ---------- Fases del reto ---------- */

function encender(el, indice, ms) {
    if (!el) return;
    el.classList.add("encendida");
    sfx("ding", indice);
    setTimeout(function () { el.classList.remove("encendida"); }, ms);
}

/** Mochila: Zoe nombra cada objeto mientras aparece («Guardamos la manzana... la pelota... ¡y el carro!»). */
async function entradaNombrando(reto, ms, token) {
    const def = reto.def;
    const ctx = reto.ctx;
    pintarTablero(ctx.mostrar, { clase: claseTablero(reto, "observacion"), sinAnimar: true });
    const lista = tarjetas();
    lista.forEach(function (el) { el.style.visibility = "hidden"; });
    const inicio = Date.now();
    iniciarBarra(ms);
    let dicho = "";
    for (let i = 0; i < lista.length; i++) {
        if (cancelado(token)) return;
        const el = lista[i];
        el.style.visibility = "";
        if (animacionesActivas()) pulso(el, "objeto-entra", 450);
        sfx(def.sonidoEntrada || "pop", i);
        const clave = i === 0 ? "nombrarPrimero" : (i === lista.length - 1 ? "nombrarUltimo" : "nombrarSiguiente");
        const l = lineaReto(reto, clave, R.datosObjeto(gameConfig, el.dataset.id));
        if (l) {
            dicho = dicho ? dicho + " " + l.texto : l.texto;
            setEnunciado(dicho);
            await Promise.all([hablarLinea(l, false), sleep(700)]);
        } else {
            await sleep(900);
        }
    }
    const resto = ms - (Date.now() - inicio);
    if (resto > 0) await sleep(resto);
    ocultarBarra();
}

async function faseObservacion(reto, token) {
    const def = reto.def;
    const ctx = reto.ctx;
    const ms = msReto(def.observacionMs, 6000);
    if (def.entrada === "nombrando" && def.textos && def.textos.nombrarPrimero) {
        await entradaNombrando(reto, ms, token);
        return;
    }
    const destello = def.entrada === "destello";
    const entrada = pintarTablero(ctx.mostrar, {
        clase: claseTablero(reto, "observacion"),
        numerar: def.numerar,
        sinAnimar: destello
    });
    if (destello) {
        tarjetas().forEach(function (el) { pulso(el, "objeto-destello", 900); });
        sfx("magia");
        await sleep(900);
    } else {
        await sleep(entrada);
    }
    if (cancelado(token)) return;
    iniciarBarra(ms);
    if (def.recorrido) correrRecorrido(ms);
    if (def.tictac) iniciarTictac(ms);
    if (def.llamarAtencion) {
        tarjetas().forEach(function (el, i) {
            programar(function () {
                pulso(el, "objeto-llama", 750);
                sfx("pop", i);
            }, 300 + i * 900);
        });
    }
    await Promise.all([sleep(ms), hablarLinea(lineaReto(reto, "observacion"))]);
    ocultarBarra();
}

function volarHacia(el, destino, retraso) {
    const a = centro(el);
    const b = destino.getBoundingClientRect();
    const dx = b.left + b.width / 2 - a.x;
    const dy = b.top + b.height * 0.45 - a.y;
    return animarWaapi(el, [
        { transform: "none", opacity: 1 },
        { transform: "translate(" + (dx * 0.5) + "px, " + (dy * 0.5 - 70) + "px) scale(0.75)", opacity: 1, offset: 0.5 },
        { transform: "translate(" + dx + "px, " + dy + "px) scale(0.15)", opacity: 0 }
    ], { duration: 650, delay: retraso, easing: "ease-in", fill: "forwards" });
}

function saltarDesde(el, origen, retraso) {
    const a = centro(el);
    const b = origen.getBoundingClientRect();
    const dx = b.left + b.width / 2 - a.x;
    const dy = b.top + b.height * 0.45 - a.y;
    setTimeout(function () { sfx("pop", Number(el.dataset.idx) || 0); }, retraso);
    return animarWaapi(el, [
        { transform: "translate(" + dx + "px, " + dy + "px) scale(0.15)", opacity: 0 },
        { transform: "translate(" + (dx * 0.5) + "px, " + (dy * 0.5 - 90) + "px) scale(0.85)", opacity: 1, offset: 0.55 },
        { transform: "none", opacity: 1 }
    ], { duration: 600, delay: retraso, easing: "ease-out", fill: "backwards" });
}

/** Mochila: los objetos entran, se cierra (cremallera), da dos saltitos y se abre con el intruso. */
async function ocultarEnMochila(reto, desafio, ms, token) {
    const mochila = document.getElementById("mochila");
    if (mochila) {
        await Promise.all(tarjetas().map(function (el, i) { return volarHacia(el, mochila, i * 140); }));
    }
    if (cancelado(token)) return;
    document.getElementById("tablero").innerHTML = "";
    if (mochila) mochila.src = "img/mochila_cerrada.svg";
    sfx("cremallera");
    await sleep(600);
    if (cancelado(token)) return;
    if (mochila && animacionesActivas()) pulso(mochila, "salta", 1100);
    sfx("suspenso");
    await sleep(Math.max(1200, ms - 1400));
    if (cancelado(token)) return;
    if (mochila) mochila.src = "img/mochila_abierta.svg";
    sfx("magia");
    pintarTablero(reto.ctx.desafio, desafio);
    if (mochila) {
        await Promise.all(tarjetas().map(function (el, i) { return saltarDesde(el, mochila, i * 120); }));
    }
}

const SONIDO_OCULTAR = { mochila: "cremallera", nube: "puff", cortina: "puff", humo: "arrastre", apagon: "apagon" };

async function faseOcultamiento(reto, token) {
    const def = reto.def;
    const ctx = reto.ctx;
    const ms = msReto(def.ocultamientoMs, 1500);
    const tipo = def.ocultamiento || "fundido";
    const desafio = {
        clase: claseTablero(reto, "desafio"),
        numerar: def.numerar,
        cubrirCon: def.cubrirCon,
        sinAnimar: true
    };
    const voz = hablarLinea(lineaReto(reto, "ocultamiento"));
    if (tipo === "mochila") {
        await Promise.all([ocultarEnMochila(reto, desafio, ms, token), voz]);
        return;
    }
    const sonido = def.sonidoOcultamiento || SONIDO_OCULTAR[tipo];
    if (sonido) sfx(sonido);
    if (tipo === "ninguno") {
        pintarTablero(ctx.desafio, desafio);
        await Promise.all([sleep(ms), voz]);
        return;
    }
    mostrarCubierta(tipo);
    await sleep(tipo === "nube" ? 650 : 500);
    if (cancelado(token)) return;
    pintarTablero(ctx.desafio, desafio);
    await Promise.all([sleep(Math.max(0, ms - 500)), voz]);
    if (cancelado(token)) return;
    await ocultarCubierta(true);
}

async function faseSecuencia(reto, token) {
    const def = reto.def;
    const ctx = reto.ctx;
    const entrada = pintarTablero(ctx.mostrar, { clase: "tablero-fila tablero-caminito", claseObjeto: "baldosa" });
    await sleep(entrada + 100);
    if (cancelado(token)) return;
    moverZeus("inicio", false, true);
    await sleep(500);
    const ms = msReto(def.encendidoMs, 1000);
    for (let i = 0; i < ctx.orden.length; i++) {
        if (cancelado(token)) return;
        encender(tarjetaDe(ctx.orden[i]), i, ms);
        await sleep(ms + 350);
    }
    await sleep(msReto(def.ocultamientoMs, 600));
}

function preguntar(reto) {
    const token = retoToken;
    ultimaLinea = lineaReto(reto, "pregunta");
    const entrada = reto.ctx.mecanica === "oculto" ? pintarOpciones(reto.ctx.opciones) : 0;
    hablarLinea(ultimaLinea);
    if (!entrada) {
        setRespuesta(true);
        return;
    }
    programar(function () {
        if (!cancelado(token)) setRespuesta(true);
    }, entrada);
}

async function correrReto() {
    if (!nivelElegido || juegoTerminado) return;
    if (retoActual >= retosNivel.length) {
        terminarJuego();
        return;
    }
    const token = ++retoToken;
    const reto = retosNivel[retoActual];
    limpiarTimersReto();
    ultimaLinea = null;
    setRespuesta(false);
    marcandoRespuesta = false;
    erroresReto = 0;
    pistaActiva = false;
    progresoReto = [];
    pintarInsignias();
    setTitulo(reto.def.titulo);
    setEscena(reto.def.escena);
    limpiarOpciones();
    prepararLupa();
    ocultarCubierta(false);
    ocultarBarra();
    const tablero = document.getElementById("tablero");
    tablero.className = "tablero";
    tablero.innerHTML = "";
    montarUtileria(reto);
    setEnunciado("");

    await hablarLinea(lineaReto(reto, "intro"));
    if (cancelado(token)) return;
    if (reto.ctx.mecanica === "secuencia") {
        await faseSecuencia(reto, token);
    } else {
        await faseObservacion(reto, token);
        if (cancelado(token)) return;
        await faseOcultamiento(reto, token);
    }
    if (cancelado(token)) return;
    preguntar(reto);
}

/* ---------- Demostración (mecánica del intruso) ---------- */

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
    const insignias = document.getElementById("insignias");
    if (insignias) insignias.hidden = true;
    const primero = retosNivel[0];
    setEscena(primero ? primero.def.escena : null);
    limpiarUtileria();
    setTitulo("");
    setEnunciado(textos().demostracion);
    await PedniaTutorial.correr({
        texto: textos().demostracion,
        textoFin: textos().demostracionFin,
        cancelado: function () { return !!juegoTerminado; },
        onTexto: setEnunciado,
        jugar: async function () {
            const dormir = PedniaTutorial.sleep;
            pintarTablero(objetos, { clase: "tablero-fila" });
            iniciarBarra(2600);
            await dormir(2600);
            ocultarBarra();
            if (juegoTerminado) return;
            mostrarCubierta("fundido");
            await dormir(500);
            pintarTablero(R.barajar(objetos.concat([nuevo]), Math.random), { sinAnimar: true });
            await dormir(700);
            await ocultarCubierta(true);
            if (juegoTerminado) return;
            const pregunta = textos().preguntaDemo || "¿Cuál objeto no estaba antes?";
            setEnunciado(pregunta);
            await PedniaTutorial.hablarDemo(pregunta, 600);
            if (juegoTerminado) return;
            const objetivo = tarjetaDe(nuevo);
            await animarManoEn(objetivo, function () { celebrar(objetivo); });
            await dormir(900);
            if (typeof PedniaTutorial.quitarManos === "function") PedniaTutorial.quitarManos();
            document.querySelectorAll(".demo-dedo").forEach(function (n) { n.remove(); });
            document.getElementById("tablero").innerHTML = "";
        }
    });
    pintarInsignias();
}

/* ---------- Cierre ---------- */

/** «¡Eres un Superagente…!» → «¡Ana, eres un Superagente…!» si el kiosco envía el nombre. */
function cierrePersonalizado(cierre) {
    const perfil = window.__PEDNIA_PERFIL__ || {};
    const nombre = String(perfil.nombre || "").trim().split(/\s+/)[0];
    if (!nombre || !cierre) return cierre;
    const cuerpo = cierre.charAt(0) === "¡" ? cierre.slice(1) : cierre;
    return "¡" + nombre + ", " + cuerpo.charAt(0).toLowerCase() + cuerpo.slice(1) + (cierre.charAt(0) === "¡" ? "" : "!");
}

function mostrarPremio() {
    const premio = nivelElegido && nivelElegido.premio;
    const trofeo = document.querySelector("#final .trofeo");
    if (!trofeo || !premio || !premio.img) return;
    trofeo.src = premio.img;
    trofeo.alt = premio.tipo === "diploma" ? "Diploma" : "Medalla";
    trofeo.classList.add("premio-" + (premio.tipo || "medalla"));
}

function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    limpiarTimersReto();
    setRespuesta(false);
    prepararLupa();
    if (typeof Swal !== "undefined") Swal.close();
    pintarInsignias();
    reproducirAudio(audios().cierre);
    const cierre = cierrePersonalizado((nivelElegido && nivelElegido.cierre) || textos().cierre || "");
    hablarLinea({ texto: cierre, personaje: "zoe" }, false);
    const texto = document.getElementById("texto_final");
    if (texto) texto.textContent = cierre;
    mostrarPremio();
    ["guia-zoe", "guia-zeus"].forEach(function (id) {
        pulso(document.getElementById(id), "salta", 1400);
    });
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
    const rutas = ["img/hoja.svg", "img/mochila_abierta.svg", "img/mochila_cerrada.svg"];
    const objetos = (gameConfig && gameConfig.objetos) || {};
    Object.keys(objetos).forEach(function (id) { rutas.push(objetos[id].img); });
    ((gameConfig && gameConfig.niveles) || []).forEach(function (n) {
        if (n.premio && n.premio.img) rutas.push(n.premio.img);
    });
    rutas.forEach(function (src) {
        const img = new Image();
        img.src = src;
    });
}

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    const guias = gameConfig.guias || {};
    ["zoe", "zeus"].forEach(function (pj) {
        const img = document.getElementById("guia-" + pj);
        if (img && guias[pj]) img.src = guias[pj];
    });
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
    const btnRepetir = document.getElementById("btn-repetir");
    if (btnRepetir) btnRepetir.addEventListener("click", repetirAudio);
    const btnLupa = document.getElementById("btn-lupa");
    if (btnLupa) btnLupa.addEventListener("click", usarLupa);
    window.addEventListener("resize", function () {
        if (destinoZeus && document.getElementById("zeus-camino")) {
            const destino = typeof destinoZeus === "string" || document.contains(destinoZeus) ? destinoZeus : "inicio";
            moverZeus(destino, false, true);
        }
    });
});
