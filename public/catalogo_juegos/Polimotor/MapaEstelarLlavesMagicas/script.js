/**
 * El Mapa Estelar y las Llaves Mágicas — control del juego (Polimotor, Transición 5-6 años, Eje Coordinación y
 * orientación, temática Laberintos de coordinación, juego 2).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → PRESENTACIÓN (el mapa estelar aparece, Zoe 3D
 * entra, la nave de Zeus llega a la salida, la cámara recorre las tres llaves y el portal cerrado; Zeus: "¡Viajero del
 * espacio! …") → DEMO automática sin botón en un laberinto pequeño (tomar la nave, un cruce, un camino sin salida y el
 * regreso, las tres llaves, el portal) → Zoe se va → "¡COMENZAR!" → TRES MISIONES en el mismo laberinto (llave roja,
 * verde y azul, en ese orden) → el PORTAL (las llaves van a sus candados, el vórtice se abre, la nave lo cruza) →
 * FINAL (un planeta nuevo, la nave aterriza en la base, luces y fuegos; Zoe y Zeus celebran) → RESUMEN.
 *
 * Nada resta y nada se reinicia: chocar con un muro solo detiene la nave (el borde se enciende y Zeus anima a
 * corregir), un camino sin salida muestra una barrera suave y se puede volver, una llave que todavía no toca queda
 * dormida dentro de su burbuja. Durante la partida Zeus no se dibuja: va en la cabina de la nave y se oye su voz.
 *
 * Módulos: ReglasMapa (geometría y decisiones, puro) · SonidosMapa (Web Audio) · EscenarioMapa (Phaser) ·
 * ArrastreNave (ratón y dedo) · MapaDemo · NaveSprites (nave 3D) · Guia3D / Guia3DZeus (personajes 3D)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let labs = [];                // los dos laberintos de esta partida (se generan al azar)
let nivel = 0;
let nivelesHechos = 0;
let labDemo = null;
let estado = { recogidas: [] };
let mision = 0;
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let ocupado = false;          // una animación (llave, portal) tiene el control
let portalHecho = false;
let movido = false;
let tUltMov = 0;
let tInicio = 0;
let tSonidos = null;
let tMonitor = null;
let silencio = false;
let pistaCruce = { nodo: null, dada: false };
let ultimaVoz = {};
let ayuda = { voz: null, repetir: null, token: 0, nivel: 0 };

const TOTAL = 3;

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
    if (silencio) return false;
    return !!(sonido() && sonido().tieneTema() && sonido().evento(nombre, opts));
}

function sfx() {
    return window.SonidosMapa || null;
}

function efecto(nombre) {
    const s = sfx();
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioMapa && window.EscenarioMapa.listo() ? window.EscenarioMapa : null;
}

function arrastre() {
    return window.ArrastreNave || null;
}

function acc() {
    return gameConfig.accesibilidad || {};
}

function cfgJuego() {
    return gameConfig.juego || {};
}

function textos() {
    return gameConfig.textos || {};
}

function colorLlave(id) {
    const L = (gameConfig.llaves || []).filter(function (l) { return l.id === id; })[0];
    return L ? L.color : true;
}

/**
 * Los dos mapas de la partida, nuevos y al azar (ReglasMapa.generar con la dificultad de cada nivel en config.mapas).
 * Se generan al empezar (la presentación muestra el mapa que se va a jugar) y otra vez en VOLVER A JUGAR.
 */
function generarMapas() {
    labs = (gameConfig.mapas || []).map(function (m) {
        const def = ReglasMapa.generar(m, gameConfig.llaves || []);
        if (!def) console.warn("[Mapa] no se pudo generar el mapa", m.id);
        return ReglasMapa.construir(def, cfgJuego());
    });
}

function defMapa(i) {
    return (gameConfig.mapas || [])[i] || {};
}

function defMision(i) {
    return (gameConfig.misiones || [])[i] || {};
}

function labActual() {
    return escenario() ? escenario().laberinto() : null;
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false && !silencio;
}

function musicaModo(m) {
    if (audioFondo && typeof audioFondo.modo === "function") audioFondo.modo(m);
}

/** true si pasó al menos ms desde la última vez que se dijo esa clase de frase (y la marca). */
function tocaVoz(clave, ms) {
    const ahora = Date.now();
    if (ultimaVoz[clave] && ahora - ultimaVoz[clave] < ms) return false;
    ultimaVoz[clave] = ahora;
    return true;
}

// ------------------------------------------------------------------ personajes y voces

let tGesto = null;

function guia3d() {
    return window.Guia3D && window.Guia3D.listo() ? window.Guia3D : null;
}

function zeus3d() {
    return window.Guia3DZeus && window.Guia3DZeus.listo() ? window.Guia3DZeus : null;
}

function gestoGuia(gesto) {
    if (guia3d() && gesto && gesto !== "habla") guia3d().gesto(gesto);
    const g = document.getElementById("guia");
    if (!g) return;
    g.classList.remove("habla", "senala", "celebra", "duda");
    void g.offsetWidth;
    if (["habla", "senala", "celebra", "duda"].indexOf(gesto) >= 0) g.classList.add(gesto);
    clearTimeout(tGesto);
    tGesto = setTimeout(function () { g.classList.remove("habla", "senala", "celebra", "duda"); }, 1900);
}

function nubeZoe(texto) {
    const caja = document.getElementById("zoe-nube");
    const span = document.getElementById("zoe-nube-texto");
    if (!caja || !span) return;
    if (!texto) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.classList.toggle("larga", span.textContent.length > 110);
    caja.style.setProperty("--dx", "0px");
    caja.hidden = false;
    const r = caja.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    caja.style.setProperty("--dx", Math.round(dx) + "px");
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/** Habla Zoe (por defecto) o Zeus. Promise que termina con la voz. */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    if (quien === "zoe") nubeZoe(zoeEnEscena ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    const g3 = quien === "zoe" ? guia3d() : (zeusEnEscena ? zeus3d() : null);
    const fin = function () { if (g3) g3.hablar(false); };
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        setTimeout(fin, 1200);
        return Promise.resolve();
    }
    if (g3) g3.hablar(true);
    return TextoVoz.hablar(texto, quien).then(fin, fin);
}

// ------------------------------------------------------------------ intro 3D (igual que los demás Polimotor)

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
    const conversacion = textos().conversacion || [];
    const personajesCfg = window.INTRO_CONFIG.personajes || [];
    const colores = window.INTRO_CONFIG.dialogo.colores || {};
    window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
        const indiceP = Number(linea.personaje);
        const def = personajesCfg[isFinite(indiceP) ? indiceP : 0] || personajesCfg[0] || {};
        const id = def.id || (indiceP === 1 ? "zoe" : "zeus");
        const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indiceP] && introConfig.personajes[indiceP].nombre)
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
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    if (escenario()) escenario().reacomodar();
    iniciarPartida();
}

function empecemosJuego() {
    const pantalla = document.getElementById("pantalla-inicio");
    const btn = document.getElementById("btn-empecemos");
    if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
    if (btn) btn.disabled = true;
    TextoVoz.desbloquear();
    if (sfx()) sfx().desbloquear();
    asegurarAudioFondo();
    musicaModo("intro");
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
        if (escenario()) escenario().reacomodar();
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

/** Música del espacio (sintetizada en sonidos.js); TextoVoz le ajusta el volumen. */
function asegurarAudioFondo() {
    if (!audioFondo && sfx()) audioFondo = sfx().musica();
    if (audioFondo) {
        audioFondo.volume = TextoVoz.VOLUMEN_FONDO;
        audioFondo.play();
    }
    return audioFondo;
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
    }
    if (audioFondo) audioFondo.volume = vol;
    const icono = document.querySelector("#btn-menu-vol i");
    if (icono) {
        icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
    }
}

/** Control de sonido de la cabecera: apaga y enciende efectos, música y voces. */
function alternarSonido() {
    silencio = !silencio;
    if (sfx()) sfx().silenciar(silencio);
    if (silencio && typeof TextoVoz !== "undefined") TextoVoz.detener();
    if (sonido() && typeof sonido().cancelarPendientes === "function" && silencio) sonido().cancelarPendientes();
    const btn = document.getElementById("btn-sonido");
    if (btn) {
        btn.classList.toggle("apagado", silencio);
        btn.setAttribute("aria-pressed", silencio ? "true" : "false");
        btn.title = silencio ? "Activar el sonido" : "Silenciar";
        const i = btn.querySelector("i");
        if (i) i.className = silencio ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
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
    { key: "ayudaAutomatica", label: "Ayuda visual (destellos)" },
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
    const btnSonido = document.getElementById("btn-sonido");
    if (btnSonido) btnSonido.addEventListener("click", alternarSonido);
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
    pintarMision();
}

// ------------------------------------------------------------------ Zoe (izquierda) y Zeus (derecha, solo en el final)

let zoeEnEscena = false;
let zeusEnEscena = false;

function ubicar(pj, z, derecha) {
    if (!pj || !z) return;
    const ancho = Math.max(z.width * 1.05, 170);
    const alto = Math.min(Math.max(z.height, 260), ancho / 0.5, window.innerHeight * 0.58);
    const left = derecha ? Math.min(window.innerWidth - ancho - 4, z.left + z.width * 0.02) : Math.max(4, z.left - z.width * 0.02);
    pj.style.left = Math.round(left) + "px";
    pj.style.top = Math.round(z.bottom - alto) + "px";
    pj.style.width = Math.round(ancho) + "px";
    pj.style.height = Math.round(alto) + "px";
}

function ubicarZoe() {
    ubicar(document.querySelector("#guia .guia-pj"), escenario() ? escenario().zonaZoe() : null, false);
}

function ubicarZeus() {
    ubicar(document.querySelector("#guia-zeus .guia-pj"), escenario() ? escenario().zonaZeus() : null, true);
}

function caminarHasta(pj, x, ms, lado, g) {
    if (g) {
        g.mirar(lado);
        g.caminar(true);
    }
    const x0 = parseFloat(pj.style.left) || 0;
    const t0 = performance.now();
    pj.dataset.caminando = "1";
    return new Promise(function (resolve) {
        const paso = function () {
            const u = Math.min(1, (performance.now() - t0) / ms);
            pj.style.left = Math.round(x0 + (x - x0) * u) + "px";
            if (u < 1) {
                setTimeout(paso, 16);
                return;
            }
            delete pj.dataset.caminando;
            if (g) {
                g.caminar(false);
                g.mirar(null);
            }
            resolve();
        };
        paso();
    });
}

function duracionPasos(distancia) {
    const reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reducido ? 200 : Math.max(1300, Math.min(2600, distancia * 6));
}

async function zoeEntra() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !escenario()) return;
    if (zoeEnEscena) {
        ubicarZoe();
        return;
    }
    zoeEnEscena = true;
    document.body.classList.add("zoe-grande");
    ubicarZoe();
    const destino = parseFloat(pj.style.left) || 0;
    const ancho = parseFloat(pj.style.width) || 200;
    pj.style.left = Math.round(-ancho - 20) + "px";
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha", guia3d());
}

async function zoeSale() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !zoeEnEscena) return;
    nubeZoe("");
    const ancho = parseFloat(pj.style.width) || 200;
    const desde = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, -ancho - 20, duracionPasos(desde + ancho), "izquierda", guia3d());
    zoeEnEscena = false;
    document.body.classList.remove("zoe-grande");
}

async function zeusEntra() {
    const pj = document.querySelector("#guia-zeus .guia-pj");
    if (!pj || !escenario()) return;
    zeusEnEscena = true;
    document.body.classList.add("zeus-visible");
    ubicarZeus();
    const destino = parseFloat(pj.style.left) || 0;
    pj.style.left = Math.round(window.innerWidth + 20) + "px";
    await caminarHasta(pj, destino, duracionPasos(window.innerWidth - destino), "izquierda", zeus3d());
}

async function zeusSale() {
    const pj = document.querySelector("#guia-zeus .guia-pj");
    if (!pj || !zeusEnEscena) return;
    const desde = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, window.innerWidth + 20, duracionPasos(window.innerWidth - desde), "derecha", zeus3d());
    zeusEnEscena = false;
    document.body.classList.remove("zeus-visible");
}

// ------------------------------------------------------------------ indicador de misión (abajo a la izquierda)

function pintarMision(animarId) {
    const caja = document.getElementById("nivel");
    if (!caja) return;
    caja.hidden = !acc().mostrarProgreso;
    const hechas = estado.recogidas;
    const todas = hechas.length >= TOTAL;
    caja.querySelectorAll(".nivel-paso").forEach(function (it) {
        const id = it.dataset.llave;
        if (id) {
            it.classList.toggle("hecho", hechas.indexOf(id) >= 0);
            it.classList.toggle("actual", jugando && !todas && defMision(mision).llave === id && hechas.indexOf(id) < 0);
        } else {
            it.classList.toggle("actual", jugando && todas && !portalHecho);
            it.classList.toggle("hecho", portalHecho);
        }
        if (animarId && (id === animarId || (!id && animarId === "portal"))) {
            it.classList.remove("gana");
            void it.offsetWidth;
            it.classList.add("gana");
        }
    });
    const rot = document.getElementById("nivel-rotulo");
    const det = document.getElementById("nivel-mision");
    const n = Math.min(TOTAL, mision + 1);
    const pre = enDemo ? "" : "NIVEL " + (nivel + 1) + " DE " + Math.max(1, labs.length) + " · ";
    if (rot) rot.textContent = pre + (todas ? (textos().progresoPortal || "¡AL PORTAL!") : (textos().progreso || "MISIÓN") + " " + n + " DE " + TOTAL);
    if (det) det.textContent = todas ? (portalHecho ? "¡Misión completada!" : "Abre el portal galáctico") : (defMision(mision).nombre || "");
    caja.setAttribute("aria-label", todas ? "Las tres llaves conseguidas: lleva la nave al portal" : "Misión " + n + " de " + TOTAL + ": " + (defMision(mision).nombre || "") + "; " + hechas.length + " llaves conseguidas");
}

// ------------------------------------------------------------------ carteles y botón central

function esperarBoton(texto, icono) {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = texto || "¡COMENZAR!";
    btn.querySelector("i").className = icono || "fa-solid fa-play";
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

let tCartel = null;

/**
 * Cartel del centro. Con mini, es una píldora de una línea arriba al centro (avisos de la partida: misión nueva, llave
 * conseguida, al portal) para no tapar el mapa; el cartel grande queda para el cambio de nivel y el final.
 */
function mostrarCartel(titulo, sub, ms, mini) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
    c.classList.toggle("mini", !!mini);
    c.style.removeProperty("--acento");
    if (mini && typeof mini === "string") c.style.setProperty("--acento", mini);
    document.getElementById("escenario-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("escenario-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.hidden = false;
    c.classList.remove("sale");
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
    if (ms) tCartel = setTimeout(ocultarCartel, ms);
}

function ocultarCartel() {
    const c = document.getElementById("escenario-cartel");
    if (!c || c.hidden) return;
    c.classList.add("sale");
    setTimeout(function () {
        c.hidden = true;
        c.classList.remove("sale");
    }, 380);
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

/**
 * Presentación: el mapa aparece, Zoe entra, la nave de Zeus llega a la salida y la cámara recorre las tres llaves y
 * el portal cerrado mientras Zeus explica la misión.
 */
async function presentar() {
    const e = escenario();
    if (!e) return;
    // sin cartel de título: el mapa y Zoe presentan el juego
    efecto("brillo");
    await zoeEntra();
    efecto("aparece");
    await e.aparecerNave();
    gestoGuia("saluda");
    nubeZoe(textos().introNube);
    const voz = hablar(textos().introZeus, "zeus");
    await e.recorrido(function (f, id) {
        if (f === "llave") efecto("llave", id);
        else if (f === "portal") efecto("candado", 0);
    });
    await Promise.race([voz, sleep(6000)]);
    nubeZoe("");
    await sleep(300);
}

/** Arranque único (el selector de edad puede avisar más de una vez). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenarioListo;
    const e = escenario();
    if (!e) return;
    musicaModo("intro");
    generarMapas();
    labDemo = ReglasMapa.construir(gameConfig.demoLaberinto, cfgJuego());
    estado = { recogidas: [] };
    await e.cargarLaberinto(labs[0], { animar: true });
    arrancarSonidos();
    await presentar();

    if (acc().mostrarIntro && window.MapaDemo) {
        await e.transicion(1000);
        estado = { recogidas: [] };
        portalHecho = false;
        await e.cargarLaberinto(labDemo, { animar: true });
        e.activarLlave(labDemo.llaves[0].id);
        await e.aparecerNave();
        enDemo = true;
        try {
            await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.MapaDemo.correr, apiDemo()) : window.MapaDemo.correr(apiDemo()));
        } catch (err) {
            console.warn("[Mapa] demo", err);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡COMENZAR!", "fa-solid fa-rocket");
    musicaModo("espacio");
    nuevaPartida();
}

// ------------------------------------------------------------------ sonidos continuos (motor y portal)

function arrancarSonidos() {
    if (sfx()) sfx().motor(true);
    clearInterval(tSonidos);
    tSonidos = setInterval(function () {
        if (!sfx() || !escenario()) return;
        const p = escenario().piloto();
        sfx().motorVelocidad(p.visible ? p.empuje : 0);
        sfx().portal(juegoTerminado ? 0 : escenario().portalActividad());
    }, 90);
}

function pararSonidos() {
    clearInterval(tSonidos);
    tSonidos = null;
    if (sfx()) {
        sfx().motor(false);
        sfx().portal(0);
    }
}

// ------------------------------------------------------------------ partida y misiones

/** Partida desde cero: nivel 1. (VOLVER A JUGAR también entra por aquí.) */
function nuevaPartida() {
    nivel = 0;
    nivelesHechos = 0;
    movido = false;
    tInicio = Date.now();
    return cargarNivel(0);
}

/**
 * Carga un mapa: transición, el laberinto brota, cartel con el nivel, la nave llega a la salida y empieza la misión 1
 * de ese mapa (las tres llaves vuelven a estar en el laberinto nuevo).
 */
async function cargarNivel(i) {
    const e = escenario();
    if (!e) return;
    nivel = i;
    jugando = false;
    ocupado = true;
    portalHecho = false;
    estado = { recogidas: [] };
    mision = 0;
    pistaCruce = { nodo: null, dada: false };
    limpiarAyuda();
    document.body.classList.add("demo-lock");
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    nubeZoe("");
    await e.transicion(1000);
    await e.cargarLaberinto(labs[i], { animar: true });
    pintarMision();
    const mapa = defMapa(i);
    mostrarCartel(mapa.titulo || ("NIVEL " + (i + 1)), mapa.nombre || "", 2400);
    efecto("aparece");
    await e.aparecerNave();
    if (i > 0) await Promise.race([hablar(textos().nivelNuevo, "zoe"), sleep(5500)]);
    else await sleep(1200);
    tUltMov = Date.now();
    jugando = true;
    ocupado = false;
    e.bloquear(false);
    document.body.classList.remove("demo-lock");
    if (arrastre()) arrastre().habilitar(true);
    comenzarMision(0);
}

/** Anuncia una misión: cartel, la llave de esa misión despierta y Zeus da la instrucción. */
function comenzarMision(i) {
    const e = escenario();
    if (!e) return;
    mision = i;
    const def = defMision(i);
    e.activarLlave(def.llave);
    pintarMision();
    mostrarCartel(def.titulo || ("MISIÓN " + (i + 1)), def.nombre || "", 2200, colorLlave(def.llave));
    efecto("brillo");
    programarAyuda();
    hablar(def.instruccion, "zeus");
}

/** La nave tocó la llave que tocaba: animación de recolección, órbita, candado y la siguiente misión. */
async function recolectar(id) {
    const e = escenario();
    if (!e) return;
    ocupado = true;
    limpiarAyuda();
    if (arrastre()) arrastre().cancelar();
    e.bloquear(true);
    efecto("llave", id);
    sonarEvento("acierto", { vol: 0.35 });
    await e.recogerLlave(id);
    estado.recogidas.push(id);
    pintarMision(id);
    const paso = document.querySelector('#nivel .nivel-paso[data-llave="' + id + '"]');
    if (window.PedniaFx && paso && !enDemo) window.PedniaFx.celebracion(paso.getBoundingClientRect());
    const todas = estado.recogidas.length >= TOTAL;
    if (todas) e.brillarLlaves();
    e.bloquear(false);
    ocupado = false;
    if (enDemo) {
        if (todas) efecto("exito");
        else e.activarLlave(labActual().llaves[estado.recogidas.length].id);
        return;
    }
    if (arrastre()) arrastre().habilitar(true);
    const def = defMision(mision);
    mostrarCartel(def.logro ? "¡LLAVE " + (def.llave || "").toUpperCase() + "!" : "¡Muy bien!", "", 1600, colorLlave(def.llave));
    await Promise.race([hablar(def.logro, "zoe"), sleep(6500)]);
    if (juegoTerminado || !jugando) return;
    if (!todas) {
        comenzarMision(mision + 1);
    } else {
        efecto("exito");
        pintarMision("portal");
        mostrarCartel(textos().progresoPortal || "¡AL PORTAL!", "", 2000, "#c084fc");
        hablar(textos().portalListo, "zeus");
        programarAyuda();
    }
}

/** Las tres llaves vuelan a sus candados, el portal se abre; en la partida la nave lo cruza y viene el final. */
async function abrirPortal() {
    const e = escenario();
    if (!e || portalHecho) return;
    portalHecho = true;
    ocupado = true;
    limpiarAyuda();
    if (arrastre()) arrastre().cancelar();
    e.bloquear(true);
    pintarMision("portal");
    await e.abrirPortal(function (f, i) {
        if (f === "candado") efecto("candado", i);
        else if (f === "vortice") efecto("portalAbre");
    });
    if (enDemo) {
        e.bloquear(false);
        ocupado = false;
        return;
    }
    efecto("teletransporte");
    await e.cruzarPortal();
    nivelesHechos = nivel + 1;
    if (nivel < labs.length - 1) {
        // nivel superado: el portal lleva a un nuevo mapa estelar
        efecto("exito");
        mostrarCartel("¡" + (defMapa(nivel).titulo || "NIVEL") + " SUPERADO!", "", 2600);
        await Promise.race([hablar(textos().nivelSuperado, "zeus"), sleep(5000)]);
        if (!juegoTerminado) cargarNivel(nivel + 1);
        return;
    }
    terminarJuego();
}

// ------------------------------------------------------------------ eventos de la escena

function alZona(z) {
    if (!(jugando || enDemo) || ocupado || juegoTerminado || !z) return;
    const e = escenario();
    const lab = labActual();
    if (!e || !lab) return;
    if (z.tipo === "cruce") {
        efecto("cruce");
        e.destellosCruce(z.nodo);
        pistaCruce = { nodo: z.nodo, dada: false };
    } else if (z.tipo === "sinSalida") {
        e.barrera(z.nodo);
        efecto("barrera");
        if (enDemo ? tocaVoz("demoSinSalida", 60000) : tocaVoz("sinSalida", Number(cfgJuego().vozSinSalidaMs) || 8000)) {
            hablar(textos().sinSalida, "zeus");
        }
    } else if (z.tipo === "llave") {
        const d = ReglasMapa.decidirLlave(lab, estado, z.llave);
        if (d === "recoger") {
            recolectar(z.llave);
        } else if (d === "dormida") {
            e.rebotarLlave(z.llave);
            efecto("dormida");
            const act = ReglasMapa.llaveActual(lab, estado);
            if (!enDemo && act && tocaVoz("dormida", Number(cfgJuego().vozDormidaMs) || 7000)) {
                hablar((textos().llaveDormida || "").replace("{color}", act.nombre), "zoe");
            }
        }
    } else if (z.tipo === "portal") {
        if (ReglasMapa.decidirPortal(lab, estado) === "abrir") {
            abrirPortal();
        } else {
            e.portalRechazo();
            efecto("alerta");
            if (!enDemo && tocaVoz("portal", 7000)) hablar(textos().portalCerrado, "zeus");
        }
    }
}

/** Empujó un muro: el borde ya se encendió en la escena y suena el aviso; no hay voz. */
function alPared() {
    if (!jugando) return;
    efecto("alerta");          // solo el sonido del choque: sin voz ni mensaje
    programarAyudaSuave();
}

function alMover() {
    tUltMov = Date.now();
    if (!jugando) return;
    movido = true;
    programarAyudaSuave();
}

// ------------------------------------------------------------------ entrada (callbacks de arrastre.js)

function puedeTomar() {
    return jugando && !ocupado && !juegoTerminado && !enDemo;
}

function alTomar() {
    limpiarAyuda();
    efecto("propulsion");
    sonarEvento("agarrar", { vol: 0.35 });
}

function alSoltar() {
    if (!jugando || ocupado) return;
    programarAyuda();
}

function alTocarFuera(w) {
    if (!jugando || ocupado || !escenario()) return;
    // tocó lejos de la nave: onda donde tocó y la nave destella para mostrar dónde poner el dedo
    const e = escenario();
    const p = e.piloto();
    const c = e.iso(p.x, p.y, 0.62);
    if (w) e.onda(w.x, w.y, 0x7dd3fc, 0.4);
    e.chispas(c.x, c.y, 10, 0.6);
    efecto("brillo");
}

// ------------------------------------------------------------------ ayuda gradual (sin resolver la actividad)

function limpiarAyuda() {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
}

let tSuave = 0;

function programarAyudaSuave() {
    if (Date.now() - tSuave < 600) return;
    tSuave = Date.now();
    ayuda.nivel = 0;
    programarAyuda();
}

/**
 * Sin moverse durante ayudaMs: si nunca tomó la nave, Zoe explica cómo arrastrarla y la nave destella; si ya juega,
 * la llave de la misión lanza un destello (con la ayuda visual activa) y Zeus repite la misión. En un cruce manda la
 * pista del cruce (monitor), no esta.
 */
function programarAyuda() {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    const token = ayuda.token;
    const vigente = function () { return token === ayuda.token && jugando && !juegoTerminado && !ocupado && !(arrastre() && arrastre().arrastrando()); };
    const pista = function () {
        if (!vigente() || !escenario()) return;
        const e = escenario();
        const p = e.piloto();
        const enCruce = p.zona && p.zona.tipo === "cruce";
        if (!enCruce) {
            if (!movido) {
                const c = e.iso(p.x, p.y, 0.62);
                e.chispas(c.x, c.y, 12, 0.6);
                e.onda(c.x, c.y, 0xfde68a, 0.8);
                hablar(textos().pistaArrastra, "zoe");
            } else {
                const lab = labActual();
                const act = lab ? ReglasMapa.llaveActual(lab, estado) : null;
                if (act) {
                    if (acc().ayudaAutomatica) e.resaltarLlave(act.id);
                    efecto("brillo");
                    hablar(defMision(mision).instruccion, "zeus");
                } else {
                    hablar(textos().portalListo, "zeus");
                }
            }
        }
        ayuda.nivel = Math.min(2, ayuda.nivel + 1);
        ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 13000);
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 11000);
}

/** Vigila el cruce: si la nave se queda quieta en un cruce, Zoe da una pista verbal (una vez por llegada). */
function monitorCruce() {
    clearInterval(tMonitor);
    tMonitor = setInterval(function () {
        if (!jugando || ocupado || juegoTerminado || !escenario()) return;
        const p = escenario().piloto();
        if (!p.zona || p.zona.tipo !== "cruce" || pistaCruce.nodo !== p.zona.nodo || pistaCruce.dada) return;
        if (Date.now() - tUltMov < (Number(cfgJuego().pistaCruceMs) || 6500)) return;
        pistaCruce.dada = true;
        if (acc().ayudaAutomatica) escenario().destellosCruce(p.zona.nodo);
        efecto("cruce");
        hablar(textos().cruce, "zoe");
    }, 400);
}

// ------------------------------------------------------------------ final y resumen

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    limpiarAyuda();
    if (arrastre()) arrastre().habilitar(false);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-final");
    pintarMision("portal");
    const e = escenario();
    musicaModo("final");
    pararSonidos();
    await e.finalCinematica(function (f, i) {
        if (f === "aterriza") efecto("aterriza");
        else if (f === "luz") efecto("luz", i);
    });
    efecto("fanfarria");
    const fiesta = function () {
        e.fuegos(4);
        efecto("fiesta");
        if (window.PedniaFx) window.PedniaFx.celebracion({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight * 0.6 });
    };
    fiesta();
    mostrarCartel(textos().finalTitulo || "¡MISIÓN COMPLETADA!", textos().finalSub || "");
    await Promise.all([zoeEntra(), zeusEntra()]);
    gestoGuia("celebra");
    if (zeus3d()) zeus3d().gesto("celebra");
    const tFiesta = setInterval(fiesta, 2800);
    await Promise.all([Promise.race([hablar(textos().cierre, "zoe", null, textos().finalNube || "¡ESPECTACULAR PLANIFICACIÓN!"), sleep(14000)]), sleep(4000)]);
    nubeZoe("");
    if (zeus3d()) zeus3d().gesto("saluda");
    await Promise.race([hablar(textos().finalZeus, "zeus"), sleep(5000)]);
    if (guia3d()) guia3d().gesto("final");
    if (zeus3d()) zeus3d().gesto("final");
    await sleep(1200);
    clearInterval(tFiesta);
    ocultarCartel();
    mostrarResumen();
}

function formatoTiempo(ms) {
    const s = Math.max(1, Math.round((ms || 0) / 1000));
    return s < 60 ? s + " s" : Math.floor(s / 60) + " min " + (s % 60) + " s";
}

/** Panel del final: las tres misiones, el portal y la misión completada. */
function mostrarResumen() {
    const panel = document.getElementById("resumen");
    const lista = document.getElementById("resumen-lista");
    if (!panel || !lista) return;
    lista.innerHTML = "";
    const filas = (gameConfig.misiones || []).map(function (m) {
        const L = (gameConfig.llaves || []).filter(function (l) { return l.id === m.llave; })[0] || {};
        return { icono: "fa-key", color: L.color || "#facc15", texto: m.resumen, ok: estado.recogidas.indexOf(m.llave) >= 0 };
    });
    filas.push({ icono: "fa-hurricane", color: "#c084fc", texto: textos().resumenPortal || "Portal galáctico desbloqueado", ok: portalHecho });
    filas.push({ icono: "fa-map", color: "#facc15", texto: (textos().resumenNiveles || "Dos mapas estelares resueltos") + " (" + nivelesHechos + " de " + labs.length + ")", ok: nivelesHechos >= labs.length });
    filas.push({ icono: "fa-user-astronaut", color: "#22d3ee", texto: textos().resumenMision || "Misión completada", ok: portalHecho, dato: formatoTiempo(Date.now() - tInicio) });
    filas.forEach(function (f, i) {
        const li = document.createElement("li");
        li.className = "resumen-item" + (f.ok ? " ok" : "");
        li.style.setProperty("--i", i);
        li.style.setProperty("--medalla", f.color);
        li.innerHTML = '<span class="resumen-icono" aria-hidden="true"><i class="fa-solid ' + f.icono + '"></i></span>' +
            '<span class="resumen-texto"><strong></strong></span>' +
            '<span class="resumen-check" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>';
        li.querySelector("strong").textContent = f.texto + (f.dato ? " · " + f.dato : "");
        lista.appendChild(li);
    });
    panel.hidden = false;
    sonarEvento("victoria");
    if (sonido()) sonido().agacharMusica(0.35);
    const btn = document.getElementById("btn-otra-vez");
    if (btn) btn.focus();
}

/** VOLVER A JUGAR: el mismo laberinto desde la salida, sin repetir la presentación ni la demo. */
async function jugarOtraVez() {
    const panel = document.getElementById("resumen");
    if (panel) panel.hidden = true;
    nubeZoe("");
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.remove("en-final");
    zoeSale();
    zeusSale();
    juegoTerminado = false;
    if (escenario()) escenario().ocultarFinal();
    musicaModo("espacio");
    arrancarSonidos();
    generarMapas();       // mapas nuevos en cada partida
    nuevaPartida();
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    const e = escenario();
    const def = gameConfig.demoLaberinto || {};
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        preparar: function () { e.bloquear(false); },
        ruta: function () {
            return (def.ruta || []).map(function (id, k) {
                const n = labDemo.nodos[id];
                const esSinSalida = labDemo.sinSalida.indexOf(id) >= 0;
                const esCruce = labDemo.cruces.indexOf(id) >= 0;
                return { id: id, x: n.x, y: n.y, pausa: esSinSalida ? 1400 : (esCruce && k < 3 ? 700 : 0) };
            });
        },
        nave: function () { const p = e.piloto(); return { x: p.x, y: p.y }; },
        pantallaNave: function () { return e.puntoNavePantalla(); },
        guiar: function (x, y) { e.guiarA(x, y); },
        ocupado: function () { return ocupado; },
        tomar: function () {
            efecto("propulsion");
            sonarEvento("agarrar", { vol: 0.35 });
        },
        soltar: function () { e.soltar(); },
        felicitar: async function () {
            gestoGuia("celebra");
            efecto("exito");
            mostrarCartel(textos().demostracionBien || "¡Así se hace!", "", 1800, true);
            await sleep(1600);
        },
        cerrar: async function () {
            await Promise.race([hablar(textos().demoFin, "zoe", "celebra"), sleep(5000)]);
        },
        terminar: async function () {
            e.bloquear(true);
            nubeZoe("");
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenarioListo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261119vol"));
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
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); pararSonidos(); });

    nubeZoe("");
    pintarMision();

    if (window.EscenarioMapa) {
        escenarioListo = window.EscenarioMapa.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioMapa.on({
                mueve: alMover,
                pared: alPared,
                zona: alZona
            });
            if (arrastre()) arrastre().iniciar({ puedeTomar: puedeTomar, alTomar: alTomar, alSoltar: alSoltar, alTocarFuera: alTocarFuera });
            monitorCruce();
            return ok;
        });
    }

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
    const btnOtra = document.getElementById("btn-otra-vez");
    if (btnOtra) btnOtra.addEventListener("click", jugarOtraVez);
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (zoeEnEscena && pj && !pj.dataset.caminando) ubicarZoe();
            const pz = document.querySelector("#guia-zeus .guia-pj");
            if (zeusEnEscena && pz && !pz.dataset.caminando) ubicarZeus();
        }, 80);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
