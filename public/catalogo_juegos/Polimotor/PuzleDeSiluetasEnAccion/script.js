/**
 * El Puzle de Siluetas en Acción (Las poses del atleta) — control del juego (Polimotor, Transición 5-6 años).
 *
 * Flujo: pantalla de inicio → intro 3D (Zoe y Zeus) → PedniaEdad → presentación en el estadio
 * (Zoe salta y se vuelve sombra) → demo automática (si "Mostrar intro") → botón ¡A jugar!
 * → una pose por nivel (3 niveles) → transformación y movimiento → final → victoria.
 *
 * Módulos (cada uno en su archivo):
 *   Posturas (reglas puras y cinemática) · Personajes (dibujo de Zoe y Zeus) · Piezas (SVG de piezas y silueta)
 *   Tablero (escenario, bandeja, encaje) · Rotacion (flechas de giro) · Arrastre (puntero)
 *   SiluetaAnim (tweens, transformación y movimiento) · Estadio + EstadioPhaser (ambientación)
 *   SiluetasDemo (demostración)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let juegoTerminado = false;
let enDemo = false;
let bloqueo = false;
let rondas = [];
let rondaIdx = -1;
let ronda = null;
let seleccionId = null;
let logrados = 0;
let ultimaFrase = {};

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
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// ------------------------------------------------------------------ accesos a módulos

function sonido() {
    return (window.PedniaAudio && window.PedniaAudio.activo) ? window.PedniaAudio : null;
}

function sonarEvento(nombre, opts) {
    return !!(sonido() && sonido().tieneTema() && sonido().evento(nombre, opts));
}

function estadio() {
    return window.Estadio || null;
}

function acc() {
    return gameConfig.accesibilidad || {};
}

function cfgJuego() {
    return gameConfig.juego || {};
}

/** Opciones de validación del nivel actual (el nivel puede ajustar la tolerancia). */
function cfgValidacion() {
    const base = Object.assign({}, cfgJuego());
    if (ronda && ronda.etapa && ronda.etapa.toleranciaGrados) base.toleranciaGrados = ronda.etapa.toleranciaGrados;
    return base;
}

function textos() {
    return gameConfig.textos || {};
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

/** Elige una frase de una lista sin repetir la anterior. */
function frase(clave) {
    const v = textos()[clave];
    if (!Array.isArray(v)) return v || "";
    if (v.length < 2) return v[0] || "";
    let i = Math.floor(Math.random() * v.length);
    if (i === ultimaFrase[clave]) i = (i + 1) % v.length;
    ultimaFrase[clave] = i;
    return v[i];
}

function guia(pj) {
    const img = document.getElementById("info-guia-img");
    if (!img) return;
    const src = "../../img/" + (pj === "zeus" ? "zeus" : "zoe") + "_normal.gif";
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    SiluetaAnim.clase(img.parentNode, "habla", 700);
}

function hablar(texto, pj) {
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    guia(pj || "zoe");
    return TextoVoz.hablar(texto, pj || "zoe");
}

// ------------------------------------------------------------------ intro 3D (igual que los demás Polimotor)

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
    const conversacion = textos().conversacion || [];
    const personajesCfg = window.INTRO_CONFIG.personajes || [];
    const colores = window.INTRO_CONFIG.dialogo.colores || {};
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
            texto: TextoVoz.textoPlano(linea.texto)
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
    introOmitida = true;
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
    TextoVoz.detener();
    asegurarAudioFondo();
    TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
    $("#fondo_blanco").stop(true, true).hide();
    destruirIntro3d();
    $("#principal").css("display", "flex").hide().fadeIn(800, function () { Tablero.reacomodar(); });
    Tablero.reacomodar();
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

// ------------------------------------------------------------------ audio y menús

function reproducirAudio(ruta, volumen, loop) {
    if (!ruta) return null;
    if (sonido()) {
        const vol = volumen != null ? volumen : 1;
        if (loop) {
            const musica = sonido().musica(ruta);
            if (musica) {
                musica.volume = vol;
                musica.play();
                audioFondo = musica;
                return musica;
            }
        } else if (sonido().archivo(ruta, vol)) {
            return null;
        }
    }
    try {
        const audio = new Audio(ruta);
        audio.volume = volumen != null ? volumen : 1;
        audio.loop = !!loop;
        const p = audio.play();
        if (p && p.catch) p.catch(function () {});
        if (loop) audioFondo = audio;
        return audio;
    } catch (e) {
        return null;
    }
}

function asegurarAudioFondo() {
    if (audioFondo) {
        const p = audioFondo.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
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
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "resaltarDestino", label: "Iluminar la parte de la sombra" },
    { key: "pistaPorFallos", label: "Pistas por errores" },
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
        input.checked = op.key === "mostrarFeedBack" ? gameConfig.mostrarFeedBack !== false : !!acc()[op.key];
        input.addEventListener("change", function () {
            if (op.key === "mostrarFeedBack") gameConfig.mostrarFeedBack = input.checked;
            else gameConfig.accesibilidad[op.key] = input.checked;
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

function enlazarMenus() {
    const btnAcc = document.getElementById("btn-menu-acc");
    const cerrarAcc = document.getElementById("btn-cerrar-acc");
    if (btnAcc) {
        btnAcc.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-acc-panel");
            setMenuAcc(panel && panel.hidden);
        });
    }
    if (cerrarAcc) cerrarAcc.addEventListener("click", function () { setMenuAcc(false); });

    const btnVol = document.getElementById("btn-menu-vol");
    const cerrarVol = document.getElementById("btn-cerrar-vol");
    const slider = document.getElementById("rango-volumen");
    if (btnVol) {
        btnVol.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-vol-panel");
            const abrir = panel && panel.hidden;
            setMenuVol(abrir);
            if (abrir) setMenuAcc(false);
        });
    }
    if (cerrarVol) cerrarVol.addEventListener("click", function () { setMenuVol(false); });
    if (slider) {
        slider.addEventListener("input", function () {
            const n = Number(slider.value);
            const val = document.getElementById("vol-val");
            if (val) val.textContent = String(n);
            aplicarVolumenCalibrado(n);
        });
    }
    document.addEventListener("pointerdown", function (ev) {
        const menuAcc = document.getElementById("menu-acc");
        const menuVol = document.getElementById("menu-vol");
        if (menuAcc && !menuAcc.contains(ev.target)) setMenuAcc(false);
        if (menuVol && !menuVol.contains(ev.target)) setMenuVol(false);
    });
    pintarMenuAcc();
    pintarMenuVol();
}

function aplicarAccesibilidadInicial() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    const n = Number(a.letterSpacing);
    document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    actualizarProgreso();
    if (ronda) marcarObjetivos();
}

// ------------------------------------------------------------------ edad y partida

function iniciarPartida() {
    PedniaEdad.iniciarNivel({
        niveles: gameConfig.niveles || [],
        elegirManual: elegirNivel,
        onElegido: function () {
            iniciarJuego();
        }
    });
}

function elegirNivel() {
    let botones = "";
    (gameConfig.niveles || []).forEach(function (nivel) {
        botones +=
            '<div class="col-12 text-center mb-2">' +
            '<button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
            "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
    });
    const titulo = textos().eligeNivel || "Elige tu edad";
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

function confirmarNivel(id) {
    const nivel = (gameConfig.niveles || []).find(function (n) { return String(n.id) === String(id); });
    Swal.close();
    if (!nivel) return;
    iniciarJuego();
}
window.confirmarNivel = confirmarNivel;

function barajar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

/** 3 rondas: una silueta al azar de cada nivel, en orden (nivel 1, 2 y 3). */
function armarRondas() {
    rondas = [];
    (gameConfig.etapas || []).forEach(function (etapa) {
        const lista = etapa.posturas || [];
        if (!lista.length) return;
        rondas.push({ etapa: etapa, postura: lista[Math.floor(Math.random() * lista.length)] });
    });
}

function textoRonda(i) {
    return "Ronda " + (i + 1) + " de " + rondas.length;
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    armarRondas();
    Tablero.reacomodar();
    document.body.classList.add("demo-lock");
    ponerMision("", textos().nombreCorto || "Las poses del atleta");

    if (estadio()) await estadio().presentar({ postura: gameConfig.demo });
    if (introOmitida || !introDesdeEmpecemos) {
        ponerMision("Desafío", textos().nombreCorto);
        await hablar(textos().desafio, "zoe");
    }

    if (acc().mostrarIntro && window.SiluetasDemo) {
        enDemo = true;
        try {
            await window.SiluetasDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[Siluetas] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        await esperarBotonComenzar();
    }
    document.body.classList.remove("demo-lock");
    empezarRonda(0);
}

function esperarBotonComenzar() {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = textos().botonComenzar || "¡A jugar!";
    wrap.hidden = false;
    return new Promise(function (resolve) {
        const listo = function () {
            btn.removeEventListener("click", listo);
            sonarEvento("aparece");
            wrap.classList.add("sale");
            setTimeout(function () {
                wrap.hidden = true;
                wrap.classList.remove("sale");
                resolve();
            }, 350);
        };
        btn.addEventListener("click", listo);
    });
}

// ------------------------------------------------------------------ carga de una pose

/** Desfase inicial de cada pieza: las piezas llegan desordenadas y giradas. */
function desordenInicial(postura, etapa, cruda) {
    const fijos = (cruda && cruda.desorden) || null;
    const lista = (etapa && etapa.giroInicial) || [45, 60, 90];
    const angulos = {};
    postura.piezas.forEach(function (p) {
        let d;
        if (fijos && fijos[p.id] != null) {
            d = Number(fijos[p.id]);
        } else {
            let opciones = lista;
            // La cabeza gira menos: es la primera pieza y la de giro más difícil de leer.
            if (p.tipo === "cabeza") opciones = lista.filter(function (x) { return x <= 90; });
            if (!opciones.length) opciones = [45];
            d = opciones[Math.floor(Math.random() * opciones.length)] * (Math.random() < 0.5 ? -1 : 1);
        }
        angulos[p.id] = Posturas.anguloInicial(p.angulo, d);
    });
    return angulos;
}

/** Prepara una pose: silueta, bandeja desordenada e información. */
async function cargarPostura(cruda, etapa, opts) {
    opts = opts || {};
    const postura = Posturas.normalizarPostura(cruda);
    ronda = {
        etapa: etapa || { titulo: "Demostración", resaltarPaso: true },
        cruda: cruda,
        postura: postura,
        pasoIdx: -1,
        fallos: {},
        dijo: {},
        ayudas: 0,
        demo: !!opts.demo
    };
    seleccionId = null;
    Rotacion.ocultar();
    const ids = postura.piezas.map(function (p) { return p.id; });
    Tablero.cargar(postura, desordenInicial(postura, etapa, opts.demo ? cruda : null), barajar(ids));
    document.body.classList.toggle("pj-zeus", postura.personaje === "zeus");
    document.body.classList.toggle("pj-zoe", postura.personaje !== "zeus");
    const fig = Tablero.figura();
    if (fig) SiluetaAnim.clase(fig, "aparece", 900);
    const libres = Tablero.capa("libres");
    if (libres) SiluetaAnim.clase(libres, "entran", 1200);
    actualizarContador();
    return sleep(700);
}

function totalPiezas() {
    return ronda ? ronda.postura.piezas.length : 0;
}

function colocadasN() {
    return Object.keys(Tablero.colocadas()).length;
}

function actualizarContador() {
    const el = document.getElementById("contador");
    if (el) el.textContent = colocadasN() + " / " + totalPiezas();
    if (estadio() && ronda) estadio().progreso(colocadasN(), totalPiezas(), ronda.postura.nombre);
}

function pasoActual() {
    return ronda && ronda.pasos ? ronda.pasos[ronda.pasoIdx] || [] : (ronda ? ronda.postura.pasos[ronda.pasoIdx] || [] : []);
}

function enPaso(id) {
    return pasoActual().indexOf(id) !== -1;
}

/** Clave de textos de un paso según el tipo de su primera pieza. */
function claveDePaso(grupo) {
    const p = ronda && Posturas.pieza(ronda.postura, grupo[0]);
    if (!p) return "";
    return { cabeza: "cabeza", tronco: "tronco", brazo: "brazos", pierna: "piernas", tenis: "tenis" }[p.tipo] || "";
}

function ponerMision(kicker, texto) {
    const k = document.getElementById("mision-nivel");
    const t = document.getElementById("mision-texto");
    if (k) {
        k.textContent = kicker || "";
        k.hidden = !kicker;
    }
    if (t) t.textContent = texto || "";
    const pasos = document.getElementById("mision-pasos");
    if (pasos) {
        pasos.innerHTML = "";
        if (ronda) {
            ronda.postura.pasos.forEach(function (g, i) {
                const s = document.createElement("span");
                s.className = "mision-paso" + (i < ronda.pasoIdx ? " hecho" : i === ronda.pasoIdx ? " actual" : "");
                pasos.appendChild(s);
            });
        }
    }
    const m = document.getElementById("info");
    if (m) SiluetaAnim.clase(m, "info-cambia", 600);
}

/** Las piezas del paso brillan en la bandeja; las demás se atenúan. */
function marcarObjetivos() {
    if (!ronda) return;
    const grupo = pasoActual();
    const libres = Tablero.libres();
    Object.keys(libres).forEach(function (id) {
        const el = libres[id].el;
        const en = grupo.indexOf(id) !== -1;
        el.classList.toggle("en-paso", en && (!!ronda.etapa.resaltarPaso || ronda.demo));
        el.classList.toggle("fuera-paso", !en);
    });
    resaltarDestinos();
}

/** La parte de la silueta donde va la pieza elegida emite un contorno luminoso. */
function resaltarDestinos() {
    if (!ronda) return;
    let ids = [];
    if (seleccionId && (acc().resaltarDestino !== false || ronda.demo)) {
        const e = Tablero.estado(seleccionId);
        if (e) ids = Posturas.compatibles(ronda.postura, e.p, Tablero.colocadas()).map(function (s) { return s.id; });
    }
    Tablero.resaltar(ids, "objetivo");
}

function iniciarPaso(i, silencioso) {
    if (!ronda) return;
    ronda.pasoIdx = i;
    const grupo = pasoActual();
    const t = textos();
    const clave = claveDePaso(grupo);
    const titulo = (t.titulosPaso && t.titulosPaso[clave]) || "";
    const kicker = ronda.demo ? "Demostración" : textoRonda(rondaIdx) + " · " + ronda.postura.nombre;
    ponerMision(kicker, titulo);
    marcarObjetivos();
    if (!silencioso) return hablar(t.paso && t.paso[clave], "zoe");
    return Promise.resolve();
}

async function empezarRonda(i) {
    if (juegoTerminado) return;
    rondaIdx = i;
    const r = rondas[i];
    if (!r) {
        terminarJuego();
        return;
    }
    bloqueo = true;
    // Cada ronda es un nivel: rótulo "Ronda N de 3 · Nivel N" antes de su silueta.
    if (estadio()) {
        const voz = hablar(r.etapa.intro, "zoe");
        await Promise.all([estadio().etapa(textoRonda(i), r.etapa.titulo + " · " + r.etapa.subtitulo, r.postura.nombre, 2600), voz]);
    }
    await cargarPostura(r.postura, r.etapa);
    actualizarProgreso();
    await hablar(r.postura.audio || textos().nuevaPostura, r.postura.personaje === "zeus" ? "zeus" : "zoe");
    bloqueo = false;
    iniciarPaso(0, false);
}

// ------------------------------------------------------------------ selección, giro y arrastre

function puedeTocar(id) {
    return !!ronda && !bloqueo && !juegoTerminado && !!Tablero.estado(id) && (!enDemo || ronda.demo);
}

function avisoFueraDePaso(id) {
    const e = Tablero.estado(id);
    if (e) SiluetaAnim.clase(e.el, "sacudir", 520);
    sonarEvento("regreso");
    const pedida = pasoActual().find(function (g) { return !Tablero.colocadas()[g]; });
    const p = pedida && Posturas.pieza(ronda.postura, pedida);
    if (p) {
        hablar(Posturas.texto(textos().otraPieza, { pieza: Posturas.nombre(p) }), "zoe");
        const pe = Tablero.estado(pedida);
        if (pe) SiluetaAnim.clase(pe.el, "ayuda", 1600);
    }
}

function onTocar(id) {
    if (enDemo) return false;
    if (!puedeTocar(id)) return false;
    if (!enPaso(id)) {
        avisoFueraDePaso(id);
        return false;
    }
    if (seleccionId !== id) seleccionar(id);
    return true;
}

function seleccionar(id, silencioso) {
    if (seleccionId && seleccionId !== id) soltarSeleccion(false);
    seleccionId = id;
    const e = Tablero.estado(id);
    if (!e) return;
    if (e.angMeta == null) e.angMeta = e.ang;
    Tablero.alFrente(e);
    e.el.classList.add("elegida");
    sonarEvento("agarrar");
    if (estadio()) estadio().seleccion();
    Tablero.llevar(e, { esc: 1 }, 240, "salida").then(function () {
        if (seleccionId === id && !Arrastre.activo()) Rotacion.mostrar(e);
    });
    Rotacion.mostrar(e);
    resaltarDestinos();
    comprobarOrientacion(id, false);
    if (!silencioso && !ronda.demo && !ronda.dijo[e.p.clave]) {
        ronda.dijo[e.p.clave] = true;
        hablar(Posturas.texto(textos().seleccion, { pieza: Posturas.nombre(e.p) }), "zoe");
    }
}

/** Quita la selección; la pieza vuelve a su tamaño de bandeja (si estaba en su casilla). */
function soltarSeleccion(volver) {
    const e = seleccionId && Tablero.estado(seleccionId);
    seleccionId = null;
    Rotacion.ocultar();
    if (e) {
        e.el.classList.remove("elegida", "orientada");
        if (volver !== false) Tablero.regresar(e);
        else Tablero.llevar(e, { cx: e.casa.cx, cy: e.casa.cy, esc: e.escCasa }, 320, "salida");
    }
    Tablero.resaltar([], "listo");
    Tablero.resaltar([], "cerca");
    resaltarDestinos();
}

function onFondo() {
    if (enDemo || bloqueo || !seleccionId) return;
    soltarSeleccion(true);
}

/** ¿La pieza ya tiene la inclinación de su hueco? Señal visual de proximidad. */
function comprobarOrientacion(id, avisar) {
    const e = Tablero.estado(id);
    if (!e || !ronda) return null;
    const hueco = Posturas.orientada(ronda.postura, e.p, e.angMeta != null ? e.angMeta : e.ang, Tablero.colocadas(), cfgValidacion());
    const antes = !!e.orientada;
    e.orientada = !!hueco;
    e.el.classList.toggle("orientada", !!hueco);
    Rotacion.marcarOrientada(!!hueco);
    Tablero.resaltar(hueco ? [hueco.id] : [], "listo");
    if (avisar && hueco && !antes) {
        sonarEvento("aparece");
        const pt = Tablero.aPantalla(e.cx, e.cy);
        if (estadio()) estadio().orientada(pt.x, pt.y);
        if (!ronda.demo && !ronda.dijo["orientada"]) {
            ronda.dijo["orientada"] = true;
            hablar(textos().orientada, "zoe");
        }
    }
    return hueco;
}

/** Gira la pieza elegida un paso (dir -1 contra el reloj, +1 como el reloj). */
function onGirar(dir) {
    if (!seleccionId || bloqueo || juegoTerminado) return;
    if (enDemo && !(ronda && ronda.demo)) return;
    const e = Tablero.estado(seleccionId);
    if (!e) return;
    const paso = Number(cfgJuego().pasoGiro) || 15;
    e.angMeta = (e.angMeta != null ? e.angMeta : e.ang) + dir * paso;
    Tablero.llevar(e, { ang: e.angMeta }, 150, "salida");
    sonarEvento("tic");
    comprobarOrientacion(seleccionId, true);
}

function onInicio(id, e) {
    Rotacion.ocultar();
    Tablero.alFrente(e);
    if (e.esc < 1) Tablero.llevar(e, { esc: 1 }, 160, "salida");
    sonarEvento("agarrar");
}

function onMover(id, e) {
    if (!ronda) return;
    const c = Tablero.centroFigura(e);
    let cerca = null;
    Posturas.compatibles(ronda.postura, e.p, Tablero.colocadas()).forEach(function (s) {
        const d = Posturas.distancia(c, s.centro);
        if (d < 110 && (!cerca || d < cerca.d)) cerca = { s: s, d: d };
    });
    Tablero.resaltar(cerca ? [cerca.s.id] : [], "cerca");
    e.el.classList.toggle("cerca", !!cerca && !!e.orientada);
}

async function onSoltar(id, e, arrastrado) {
    if (!ronda) return;
    Tablero.resaltar([], "cerca");
    e.el.classList.remove("cerca");
    if (!arrastrado) {
        if (seleccionId === id) Rotacion.mostrar(e);
        return;
    }
    const ang = e.angMeta != null ? e.angMeta : e.ang;
    const r = Posturas.evaluarSoltado(ronda.postura, e.p, Tablero.centroFigura(e), ang, Tablero.colocadas(), cfgValidacion());
    if (r.resultado === "encaje") {
        await colocar(id, r.hueco, {});
        return;
    }
    sonarEvento("soltar");
    if (r.resultado === "nada") {
        // Lejos de la sombra: vuelve a la bandeja sin aviso de error.
        await Tablero.regresar(e);
        sonarEvento("regreso");
        if (seleccionId === id) Rotacion.mostrar(e);
        return;
    }
    // Error sin castigo: rebote suave, la zona objetivo sigue visible y Zeus da una pista.
    ronda.fallos[id] = (ronda.fallos[id] || 0) + 1;
    if (estadio()) estadio().error();
    if (r.hueco) {
        Tablero.resaltar([r.hueco.id], "mira");
        setTimeout(function () { Tablero.resaltar([], "mira"); }, 1800);
    }
    const vuelta = Tablero.regresar(e).then(function () { sonarEvento("bote"); });
    hablar(textoError(r, e.p), "zeus");
    await vuelta;
    if (seleccionId === id) {
        Rotacion.mostrar(e);
        resaltarDestinos();
    }
    mostrarPistaSiToca(id);
}

function textoError(r, p) {
    const t = textos();
    const vars = { pieza: Posturas.nombre(p) };
    switch (r.resultado) {
        case "forma": return p.tipo === "pierna" ? t.errorFormaPierna : t.errorFormaBrazo;
        case "lado": return t.errorLado;
        case "orientacion": return Posturas.texto(t.errorOrientacion, vars);
        case "vecino": {
            const v = r.hueco && Posturas.pieza(ronda.postura, r.hueco.une);
            return Posturas.texto(t.errorVecino, { vecino: v ? Posturas.nombre(v) : "la pieza vecina" });
        }
        default: return Posturas.texto(t.errorLugar, vars);
    }
}

function huecoDe(e) {
    const lista = Posturas.compatibles(ronda.postura, e.p, Tablero.colocadas());
    return lista.find(function (s) { return s.id === e.id; }) || lista[0] || null;
}

function mostrarPistaSiToca(id) {
    const a = acc();
    if (a.pistaPorFallos === false || !ronda) return;
    const umbral = Number(a.fallosPista) > 0 ? Number(a.fallosPista) : 2;
    if ((ronda.fallos[id] || 0) < umbral) return;
    const e = Tablero.estado(id);
    const h = e && huecoDe(e);
    if (!h) return;
    Tablero.mostrarPista(h);
    setTimeout(function () { hablar(Posturas.texto(textos().pista, { pieza: Posturas.nombre(e.p) }), "zoe"); }, 1300);
}

/** Botón de ayuda: destaca la pieza pedida, ilumina su lugar y, la segunda vez, muestra la sombra punteada. */
function pedirAyuda() {
    if (!ronda || bloqueo || enDemo || juegoTerminado) return;
    sonarEvento("aparece");
    const btn = document.getElementById("btn-ayuda");
    if (btn) SiluetaAnim.clase(btn, "pulsado", 400);
    let id = seleccionId;
    if (!id || !Tablero.estado(id)) {
        id = pasoActual().find(function (x) { return Tablero.estado(x); });
    }
    const e = id && Tablero.estado(id);
    if (!e) return;
    ronda.ayudas += 1;
    SiluetaAnim.clase(e.el, "ayuda", 2200);
    const h = huecoDe(e);
    if (h) {
        Tablero.resaltar([h.id], "mira");
        setTimeout(function () { Tablero.resaltar([], "mira"); }, 2400);
        if (ronda.ayudas >= 2) Tablero.mostrarPista(h);
    }
    const texto = ronda.ayudas === 1 && ronda.postura.pista
        ? ronda.postura.pista
        : Posturas.texto(textos().ayuda, { pieza: Posturas.nombre(e.p) });
    hablar(texto, "zeus");
}

// ------------------------------------------------------------------ encaje

async function colocar(id, hueco, opts) {
    opts = opts || {};
    bloqueo = true;
    const e = Tablero.estado(id);
    if (seleccionId === id) seleccionId = null;
    Rotacion.ocultar();
    Tablero.resaltar([], "listo");
    Tablero.resaltar([], "objetivo");
    Tablero.quitarPista(hueco.id);
    await Tablero.encajar(e, hueco);
    sonarEvento("encaje");
    const c = Tablero.figuraAEscenario(hueco.centro);
    const pt = Tablero.aPantalla(c.x, c.y);
    if (estadio()) estadio().acierto(pt.x, pt.y);
    actualizarContador();
    marcarObjetivos();
    if (!opts.silencio && !ronda.demo) hablar(frase("colocada"), ronda.postura.personaje);
    await sleep(ronda.demo ? 300 : 500);
    bloqueo = false;
    if (ronda.demo) return;
    const hechas = Tablero.colocadas();
    if (pasoActual().every(function (x) { return hechas[x]; })) {
        if (ronda.pasoIdx + 1 < ronda.postura.pasos.length) {
            await sleep(350);
            iniciarPaso(ronda.pasoIdx + 1, false);
        } else {
            completarPostura();
        }
    }
}

/** Orden en que los segmentos recuperan el color (el mismo orden de colocación). */
function ordenVida() {
    return [].concat.apply([], ronda.postura.pasos);
}

/** La silueta cobra vida y el atleta hace su movimiento. */
async function darVida() {
    const fig = Tablero.figura();
    const postura = ronda.postura;
    sonarEvento("correcto");
    await SiluetaAnim.transformar({
        figura: fig,
        piezas: ordenVida(),
        elPieza: Tablero.encajada,
        alArticular: function (id) {
            const p = Posturas.pieza(postura, id);
            if (!p) return;
            const pt = Tablero.chispa(p.pivote, "#7cf3ff");
            if (window.EstadioPhaser) window.EstadioPhaser.brillo(pt.x, pt.y, 0x7cf3ff, 6);
            sonarEvento("tic");
        }
    });
    if (estadio()) estadio().posturaLista(Tablero.rectFigura(), postura.nombre);
    await SiluetaAnim.actuar({
        cuerpo: postura.cuerpo,
        aplicar: Tablero.posar,
        tipo: postura.animacion,
        cancelado: function () { return juegoTerminado && !ronda; }
    });
}

async function completarPostura() {
    bloqueo = true;
    Rotacion.ocultar();
    ponerMision(ronda.etapa.titulo, "¡Pose completa!");
    const voz = hablar(frase("posturaLista"), "zoe");
    await darVida();
    logrados += 1;
    actualizarProgreso();
    await Promise.race([voz, sleep(1800)]);
    await sleep(500);
    bloqueo = false;
    empezarRonda(rondaIdx + 1);
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = rondas.length;
    el.hidden = !acc().mostrarProgreso || !total || enDemo;
    el.innerHTML = '<i class="fa-solid fa-medal"></i> ' + Math.min(logrados, total) + " / " + total;
}

// ------------------------------------------------------------------ final

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    Rotacion.ocultar();
    ponerMision("¡Campeón!", "¡Armaste todas las poses del atleta!");
    document.body.classList.add("demo-lock");
    const voz = hablar(textos().final, "zoe");
    if (estadio()) {
        await estadio().final({
            rectFigura: Tablero.rectFigura,
            rutina: function () {
                if (!ronda) return Promise.resolve();
                return SiluetaAnim.actuar({ cuerpo: ronda.postura.cuerpo, aplicar: Tablero.posar, tipo: "carrera", vueltas: 1 })
                    .then(function () {
                        return SiluetaAnim.actuar({ cuerpo: ronda.postura.cuerpo, aplicar: Tablero.posar, tipo: "salto" });
                    });
            }
        }).catch(function () {});
    }
    await Promise.race([voz, sleep(3500)]);
    mostrarVictoria();
}

function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
    if (feedbackActivo()) TextoVoz.hablar(cierre, "zeus");
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
        if (estadio()) estadio().limpiar();
    }, 400);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    return {
        cancelado: function () { return juegoTerminado; },
        textos: textos,
        demo: function () { return gameConfig.demo || null; },
        cargar: function (postura) {
            return cargarPostura(postura, { titulo: "Demostración", resaltarPaso: true, giroInicial: [45, 60, 90] }, { demo: true });
        },
        paso: function (i) { iniciarPaso(i, true); },
        mision: function (kicker, texto) { ponerMision(kicker, texto); },
        hablar: hablar,
        destacar: function (id, on) {
            const e = Tablero.estado(id);
            if (e) e.el.classList.toggle("demo-foco", !!on);
        },
        centroPieza: function (id) {
            const e = Tablero.estado(id);
            return e ? Tablero.aPantalla(e.cx, e.cy) : null;
        },
        seleccionar: function (id) { seleccionar(id, true); },
        planGiro: function (id) {
            const e = Tablero.estado(id);
            const h = e && huecoDe(e);
            if (!e || !h) return { veces: 0, dir: 1 };
            return SiluetasDemo.plan(e.angMeta != null ? e.angMeta : e.ang, h.angulo, Number(cfgJuego().pasoGiro) || 15);
        },
        boton: function (dir) { return Rotacion.boton(dir); },
        girar: function (dir) { Rotacion.pulsar(dir); },
        mirarRodilla: function (on) {
            const ids = ronda ? ronda.postura.piezas.filter(function (p) { return p.tipo === "pierna"; }).map(function (p) { return p.id; }) : [];
            Tablero.resaltar(on ? ids : [], "mira");
        },
        /** Arrastre automático hasta la sombra; onFrame(puntoPantalla) para que la mano siga a la pieza. */
        llevar: async function (id, ms, onFrame) {
            const e = Tablero.estado(id);
            const h = e && huecoDe(e);
            if (!e || !h) return;
            Rotacion.ocultar();
            Tablero.alFrente(e);
            sonarEvento("agarrar");
            const c = Tablero.figuraAEscenario(h.centro);
            await Tablero.llevar(e, {
                cx: c.x,
                cy: c.y,
                esc: 1,
                onFrame: function (est) {
                    if (typeof onFrame === "function") onFrame(Tablero.aPantalla(est.cx, est.cy));
                }
            }, ms || 1200, "suave");
            await colocar(id, h, { silencio: true });
        },
        completar: function () {
            return darVida();
        },
        terminar: function () {
            ronda = null;
            seleccionId = null;
            Rotacion.ocultar();
            Tablero.cargar(Posturas.normalizarPostura({ brazos: [], piernas: [] }), {}, []);
            Tablero.capa("silueta").innerHTML = "";
            const c = document.getElementById("contador");
            if (c) c.textContent = "0 / 0";
        }
    };
}

// ------------------------------------------------------------------ arranque

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    sincronizarDialogoIntro3d();
    aplicarAccesibilidadInicial();
    if (window.speechSynthesis) {
        try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
    }
    if (sonido()) sonido().usarTema(gameConfig.audios && gameConfig.audios.tema);
    TextoVoz.iniciar(gameConfig, introConfig, {
        obtenerAudioFondo: function () { return audioFondo; },
        volumenFondo: volumenFondoPct() / 100
    });
    enlazarMenus();
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

    if (estadio()) estadio().montar();
    const svg = document.getElementById("escenario-svg");
    Tablero.montar(svg);
    Rotacion.montar({ capa: Tablero.capa("controles"), onGirar: onGirar });
    Arrastre.configurar({
        svg: svg,
        onTocar: onTocar,
        onInicio: onInicio,
        onMover: onMover,
        onSoltar: onSoltar,
        onFondo: onFondo
    });
    const btnAyuda = document.getElementById("btn-ayuda");
    if (btnAyuda) btnAyuda.addEventListener("click", pedirAyuda);

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
    let tResize = null;
    window.addEventListener("resize", function () {
        clearTimeout(tResize);
        tResize = setTimeout(function () {
            if (Arrastre.activo()) return;
            Tablero.reacomodar();
            const e = seleccionId && Tablero.estado(seleccionId);
            if (e) Rotacion.mostrar(e);
        }, 120);
    });
    document.addEventListener("keydown", function (ev) {
        if (!seleccionId || enDemo) return;
        if (ev.key === "ArrowLeft" || ev.key === "q") { ev.preventDefault(); Rotacion.pulsar(-1); }
        if (ev.key === "ArrowRight" || ev.key === "e") { ev.preventDefault(); Rotacion.pulsar(1); }
        if (ev.key === "Escape") soltarSeleccion(true);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
