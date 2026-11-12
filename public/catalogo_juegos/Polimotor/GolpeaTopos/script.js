/**
 * Golpea a los Topos — control del juego (Polimotor, Transición 5-6 años, reconocimiento de partes del cuerpo).
 *
 * Flujo (mismo modelo que "Une las Partes del Cuerpo"): pantalla de inicio → intro 3D (Zeus y Zoe) →
 * PedniaEdad → presentación en el campamento (título, Zoe entra caminando, salen
 * topos de ejemplo: una parte del cuerpo marcada en verde y un objeto tachado en rojo) → demo automática
 * con la mano (nariz sí, cepillo no, mano sí) → "¡Comenzar a jugar!" → partida con cuenta
 * regresiva → objetivo cumplido = celebración y victoria; tiempo agotado = pantalla amable con lo encontrado
 * y "¡Jugar otra vez!".
 *
 * Módulos (cada uno en su archivo):
 *   ReglasTopos (reglas puras) · IconosTopos (dibujos de los globos)
 *   Topos (topos, globos y sus estados) · EscenarioTopos (escena Phaser: colina, agujeros, mazo, efectos)
 *   Aparicion (saca topos con el reloj de la escena) · Temporizador (cuenta regresiva)
 *   ToposDemo (micro-tutorial) · Guia3D (Zoe 3D)
 *
 * Quién habla: Zoe (3D) presenta, explica y celebra. Zeus solo sale en la intro 3D; durante la partida su voz
 * recuerda mirar el globito y avisa (con cariño) cuando se toca un objeto, en la nube de abajo.
 * Sin botones de pausa ni de pantalla completa (pedido del usuario).
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let aciertos = 0;
let errores = 0;
let escapados = 0;
let ultimaFrase = {};
let vozLibreDesde = 0;
let avisoDado = false;
let ayuda = { t: null, hoyo: null };

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

function escenario() {
    return window.EscenarioTopos && window.EscenarioTopos.listo() ? window.EscenarioTopos : null;
}

function topos() {
    return window.Topos || null;
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

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

function imagenCfg(id) {
    return ReglasTopos.imagen(gameConfig, id) || { nombre: "" };
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

// ------------------------------------------------------------------ guía (Zoe), nube de Zeus y letrero

let tGesto = null;

function guia3d() {
    return window.Guia3D && window.Guia3D.listo() ? window.Guia3D : null;
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

/** Borde izquierdo (pantalla) del globo más a la izquierda de la fila de atrás. */
function bordeGlobos() {
    if (!escenario()) return 0;
    const l = escenario().diseno();
    const cv = document.querySelector("#escenario-phaser canvas");
    if (!cv || !l.W) return 0;
    const k = cv.getBoundingClientRect().width / l.W;
    let x = Infinity;
    escenario().hoyos().forEach(function (h) {
        if (h.fila === 0) x = Math.min(x, h.x);
    });
    if (!isFinite(x)) return 0;
    const g = escenario().puntoGlobo(escenario().hoyos().find(function (h) { return h.x === x; }).id);
    return g ? g.x - (l.globo * 0.55 + 6) * k : 0;
}

/** Nube sobre la cabeza de Zoe cuando está grande en la escena (presentación, demo y final). */
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
    caja.style.setProperty("--dy", "0px");
    // No tapa los globos de la fila de atrás: su borde derecho llega hasta el primer globo.
    const limite = bordeGlobos();
    caja.style.maxWidth = limite ? Math.max(220, limite - 16) + "px" : "";
    caja.hidden = false;
    const r = caja.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    if (limite && r.right + dx > limite) dx = Math.max(8 - r.left, limite - r.right);
    caja.style.setProperty("--dx", Math.round(dx) + "px");
    // nunca por debajo de los botones y el letrero de arriba: si no cabe, baja (aunque tape un poco a Zoe)
    const hud = document.querySelector(".hud-top");
    const techo = hud ? hud.getBoundingClientRect().bottom + 8 : 8;
    caja.style.setProperty("--dy", Math.max(0, Math.round(techo - r.top)) + "px");
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/** Nube de la barra de abajo (Zoe; o Zeus cuando no está en la escena, con su color). */
function globo(texto, quien) {
    if (zoeEsGrande && quien !== "zeus") {
        nubeZoe(texto);
        texto = "";
    } else if (quien !== "zeus") {
        nubeZoe("");
    }
    const caja = document.getElementById("guia-globo");
    const span = document.getElementById("guia-texto");
    if (!caja || !span) return;
    if (zoeEsGrande && quien === "zeus") return;
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto || "") : (texto || "");
    caja.classList.toggle("vacio", !texto);
    caja.classList.toggle("de-zeus", quien === "zeus" && !!texto);
    const largo = span.textContent.length;
    caja.classList.toggle("largo", largo > 70 && largo <= 120);
    caja.classList.toggle("muy-largo", largo > 120);
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/**
 * Habla Zoe (por defecto) o Zeus. Devuelve una Promise que termina con la voz.
 * `nube` (opcional): texto corto para la nube cuando la voz dice algo largo.
 */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    // Zeus no sale en la escena: lo que dice va en la nube de abajo con su etiqueta.
    globo(nube || texto, quien);
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
    });
}

/** Voz corta durante la partida: no se encima con la anterior (si hay otra sonando, se salta). */
function decirRapido(texto, pj) {
    const ahora = Date.now();
    if (ahora < vozLibreDesde) return;
    vozLibreDesde = ahora + (Number(cfgJuego().vozPausaMs) || 2600);
    hablar(texto, pj);
}

let tLetrero = null;

/** Letrero de madera de arriba: mensaje fijo o un aviso corto ("¡Correcto!") que vuelve solo. */
function letrero(texto, tipo, ms) {
    const caja = document.getElementById("letrero");
    const span = document.getElementById("letrero-texto");
    if (!caja || !span) return;
    span.textContent = texto || textos().letrero || "";
    caja.classList.remove("ok", "ups", "titulo", "golpe");
    void caja.offsetWidth;
    if (tipo) caja.classList.add(tipo);
    if (tipo === "ok" || tipo === "ups") caja.classList.add("golpe");
    clearTimeout(tLetrero);
    if (ms) {
        tLetrero = setTimeout(function () {
            caja.classList.remove("ok", "ups", "golpe");
            span.textContent = textos().letrero || "";
        }, ms);
    }
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
    // Fundido por opacidad (no display:none) para que Phaser no pierda el tamaño de la escena.
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    if (window.EscenarioTopos && window.EscenarioTopos.listo()) window.EscenarioTopos.reacomodar();
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
    { key: "ayudaAutomatica", label: "Ayuda visual (brillo del globo)" },
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
    pintarHud();
    if (!a.ayudaAutomatica) apagarAyudaVisual();
}

// ------------------------------------------------------------------ Zoe grande (presentación, demo y final)

/**
 * En la presentación, la demo y el final, Zoe sale grande y de cuerpo entero a la izquierda, delante de
 * la carpa del campamento (como en "Une las Partes del Cuerpo"). Mientras se juega vuelve a la barra de
 * abajo para no tapar la colina. Se mueve la caja .guia-pj: el lienzo 3D se reencuadra solo.
 */
let zoeEsGrande = false;

function ubicarZoeGrande() {
    const pj = document.querySelector("#guia .guia-pj");
    const cv = document.querySelector("#escenario-phaser canvas");
    if (!pj || !cv || !escenario()) return;
    const r = cv.getBoundingClientRect();
    const l = escenario().diseno();
    const k = r.width / (l.W || r.width);
    // hasta donde empieza el primer agujero de la fila de atrás (la demo usa esa fila)
    const libre = Math.max(r.width * 0.16, (0.3 * l.W - l.hoyoW * 0.7) * k);
    const ancho = Math.min(libre, r.width * 0.22);
    const sueloY = r.top + l.Hu * k;
    // deja libre la parte de arriba para que la nube de lo que dice quepa sobre su cabeza
    const alto = Math.min((sueloY - r.top) * 0.66, ancho / 0.5);
    pj.style.left = Math.round(r.left + 4) + "px";
    pj.style.top = Math.round(sueloY - alto) + "px";
    pj.style.width = Math.round(ancho) + "px";
    pj.style.height = Math.round(alto) + "px";
}

function guiaMovil() {
    return window.Guia3D && window.Guia3D.listo() && window.Guia3D.caminar ? window.Guia3D : null;
}

/** Recorrido a pie de la caja de Zoe (left) con el clip de caminar. */
function caminarHasta(pj, x, ms, lado) {
    const g = guiaMovil();
    if (g) {
        g.mirar(lado);
        g.caminar(true);
    }
    // Paso a paso con setTimeout (no transición CSS): avanza aunque el navegador no esté pintando.
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

/** Zoe entra caminando desde la izquierda hasta su lugar delante de la carpa. */
async function zoeEntra() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !escenario()) return;
    if (zoeEsGrande) {
        ubicarZoeGrande();
        return;
    }
    pj.classList.add("zoe-cambia");
    await sleep(250);
    globo("");
    zoeEsGrande = true;
    document.body.classList.add("zoe-grande");
    ubicarZoeGrande();
    const destino = parseFloat(pj.style.left) || 0;
    const ancho = parseFloat(pj.style.width) || 200;
    pj.style.left = Math.round(-ancho - 20) + "px";
    void pj.offsetWidth;
    pj.classList.remove("zoe-cambia");
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha");
}

/** Zoe se va caminando por la izquierda y queda pequeña en la barra de abajo. */
async function zoeSale() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !zoeEsGrande) return;
    nubeZoe("");
    const ancho = parseFloat(pj.style.width) || 200;
    const desde = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, -ancho - 20, duracionPasos(desde + ancho), "izquierda");
    pj.classList.add("zoe-cambia");
    zoeEsGrande = false;
    document.body.classList.remove("zoe-grande");
    ["left", "top", "width", "height"].forEach(function (p) { pj.style[p] = ""; });
    globo("");
    await sleep(60);
    pj.classList.remove("zoe-cambia");
}

// ------------------------------------------------------------------ HUD: reloj, progreso y letrero

function pintarHud() {
    const pr = ReglasTopos.progreso(gameConfig, aciertos);
    const caja = document.getElementById("hud-progreso");
    if (caja) caja.hidden = !acc().mostrarProgreso;
    const barra = document.getElementById("progreso-relleno");
    if (barra) barra.style.width = Math.round(pr.fraccion * 100) + "%";
    const num = document.getElementById("progreso-num");
    if (num) num.textContent = pr.hechas + " / " + pr.total;
    const rot = document.getElementById("progreso-rotulo");
    if (rot) rot.textContent = textos().progreso || "PARTES";
    const pb = document.getElementById("hud-progreso");
    if (pb) pb.setAttribute("aria-valuenow", String(pr.hechas));
}

function pintarReloj(seg) {
    const el = document.getElementById("reloj-texto");
    if (el) el.textContent = ReglasTopos.formatoTiempo(seg);
    const caja = document.getElementById("hud-reloj");
    const aviso = Number(cfgJuego().avisoTiempoSeg) || 15;
    if (caja) caja.classList.toggle("poco", jugando && seg <= aviso && seg > 0);
    if (jugando && !avisoDado && seg <= aviso && seg > 0 && !ReglasTopos.progreso(gameConfig, aciertos).completo) {
        avisoDado = true;
        decirRapido(textos().avisoTiempo, "zoe");
    }
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

/** Botón grande centrado (ver la demo / comenzar a jugar). */
function esperarBoton(texto, icono) {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = texto;
    btn.querySelector("i").className = "fa-solid " + (icono || "fa-play");
    globo("");
    wrap.hidden = false;
    btn.focus({ preventScroll: true });
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

let tTitulo = null;

/** Título de la presentación: cae sobre el cielo y luego sube hasta el letrero. */
function tituloIntro(mostrar) {
    const t = document.getElementById("intro-titulo");
    if (!t) return Promise.resolve();
    clearTimeout(tTitulo);
    if (mostrar) {
        document.getElementById("intro-titulo-texto").textContent = textos().titulo || "¡GOLPEA A LOS TOPOS!";
        document.getElementById("intro-titulo-sub").textContent = textos().subtitulo || "";
        t.classList.remove("sube");
        t.hidden = false;
        return Promise.resolve();
    }
    t.classList.add("sube");
    return new Promise(function (resolve) {
        tTitulo = setTimeout(function () {
            t.hidden = true;
            t.classList.remove("sube");
            resolve();
        }, 600);
    });
}

/**
 * Presentación en el campamento: título, Zoe entra caminando y saluda; salen topos de ejemplo; uno con una
 * parte del cuerpo (aro verde ✓) y otro con un objeto (tachado en rojo); Zoe explica el reto.
 */
async function presentar() {
    if (!escenario()) return;
    const pres = gameConfig.presentacion || {};
    escenario().reacomodar();
    document.body.classList.add("en-presentacion");
    letrero(textos().titulo, "titulo");
    tituloIntro(true);
    sonarEvento("aparece");
    await zoeEntra();
    const completa = introOmitida || !introDesdeEmpecemos;
    const voz = hablar(completa ? textos().bienvenida : textos().saludoCorto, "zoe", "saluda");
    await sleep(1800);
    await tituloIntro(false);

    // topos de ejemplo
    const hoyos = pres.agujeros || [];
    const imagenes = pres.imagenes || [];
    for (let i = 0; i < hoyos.length && i < imagenes.length; i++) {
        topos().salir(hoyos[i], imagenes[i]);
        sonarEvento("tic");
        await sleep(380);
    }
    await Promise.race([voz, sleep(completa ? 9000 : 4500)]);
    if (juegoTerminado) return;

    const hParte = hoyos[imagenes.indexOf(pres.destacarParte)];
    const hObjeto = hoyos[imagenes.indexOf(pres.destacarDistractor)];
    if (hParte) {
        topos().marcar(hParte, "si");
        topos().destacar(hParte, true);
        sonarEvento("acierto");
        await Promise.race([hablar(textos().presentaParte, "zoe", "senala"), sleep(5000)]);
        topos().destacar(hParte, false);
    }
    if (hObjeto) {
        topos().marcar(hObjeto, "no");
        sonarEvento("tic");
        await Promise.race([hablar(textos().presentaDistractor, "zoe", "senala"), sleep(5000)]);
    }
    // Los topos de ejemplo vuelven a su agujero y Zoe explica el reto.
    await Promise.all(hoyos.map(function (h) { return topos().esconder(h); }));
    await Promise.race([hablar(textos().explicaReto, "zoe", "senala"), sleep(8500)]);
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenario_listo;
    await presentar();

    const conDemo = acc().mostrarIntro && window.ToposDemo;
    if (conDemo) {
        enDemo = true;
        try {
            await window.ToposDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[GolpeaTopos] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    // Terminada la demo (o la presentación), Zoe se va caminando.
    await zoeSale();
    document.body.classList.remove("en-presentacion");
    if (conDemo) await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-play");
    comenzarPartida();
}

/** Partida real: reloj, contador y topos. También sirve para "¡Jugar otra vez!" (sin intro ni demo). */
async function comenzarPartida() {
    aciertos = 0;
    errores = 0;
    escapados = 0;
    avisoDado = false;
    juegoTerminado = false;
    vozLibreDesde = 0;
    if (topos()) topos().ocultarTodos();
    pintarHud();
    pintarReloj(ReglasTopos.duracionSeg(gameConfig));
    letrero(textos().letrero);
    jugando = true;
    document.body.classList.remove("demo-lock");
    const token = ++tokenPartida;
    await Promise.race([hablar(textos().instruccion, "zoe", "senala"), sleep(3800)]);
    if (token !== tokenPartida || !jugando) return;
    window.Temporizador.iniciar(ReglasTopos.duracionSeg(gameConfig), { alTic: pintarReloj, alTerminar: finPorTiempo });
    window.Aparicion.arrancar();
    setTimeout(function () {
        if (token === tokenPartida && jugando) decirRapido(textos().instruccionZeus, "zeus");
    }, 1500);
    programarAyuda();
}
let tokenPartida = 0;

// ------------------------------------------------------------------ golpes (callbacks de Aparicion)

function alGolpear(hoyoId) {
    if (!jugando || juegoTerminado || enDemo) return;
    window.Aparicion.golpe(hoyoId);
}

function alAcierto(hoyoId, imagenId) {
    aciertos++;
    limpiarAyuda();
    apagarAyudaVisual();
    sonarEvento("acierto");
    letrero(textos().letreroCorrecto || "¡Correcto!", "ok", 1200);
    const g = escenario() ? escenario().puntoGlobo(hoyoId, true) : null;
    if (g) escenario().flotante(g.x, g.y, "+1");
    pintarHud();
    gestoGuia("celebra");
    if (ReglasTopos.progreso(gameConfig, aciertos).completo) {
        victoria();
        return;
    }
    const im = imagenCfg(imagenId);
    decirRapido(ReglasTopos.plantilla(frase("aciertoVoz"), { nombre: im.nombre }), "zoe");
    programarAyuda();
}

function alError(hoyoId, imagenId) {
    errores++;
    limpiarAyuda();
    sonarEvento("bote");
    letrero(textos().letreroError || "¡Ups! Ese es un objeto", "ups", 1400);
    const im = imagenCfg(imagenId);
    decirRapido(ReglasTopos.plantilla(frase("errorVoz"), { nombre: im.nombre }), "zeus");
    programarAyuda();
}

function alEscapo() {
    escapados++;
}

// ------------------------------------------------------------------ ayuda (sin resolver la actividad)

function apagarAyudaVisual() {
    if (ayuda.hoyo && topos()) topos().destacar(ayuda.hoyo, false);
    ayuda.hoyo = null;
}

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    ayuda.t = null;
}

/**
 * Sin tocar nada durante ayudaMs: Zoe recuerda mirar los globitos y, con la ayuda visual activa, el globo
 * de una parte del cuerpo que esté afuera brilla en dorado (no se toca por el niño).
 */
function programarAyuda(repetida) {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    ayuda.t = setTimeout(function () {
        if (!jugando || juegoTerminado) return;
        decirRapido(textos().ayuda, "zoe");
        if (acc().ayudaAutomatica && topos()) {
            const parte = topos().visibles().find(function (v) {
                return v.estado === "visible" && ReglasTopos.esParteCuerpo(gameConfig, v.imagen);
            });
            if (parte) {
                apagarAyudaVisual();
                ayuda.hoyo = parte.hoyo;
                topos().destacar(parte.hoyo, true);
            }
        }
        programarAyuda(true);
    }, repetida ? (Number(cfgJuego().ayudaRepetirMs) || 16000) : (Number(cfgJuego().ayudaMs) || 9000));
}

// ------------------------------------------------------------------ finales

let tCartel = null;

function mostrarCartel(titulo, sub, ms) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
    document.getElementById("escenario-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("escenario-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.hidden = false;
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
    if (ms) tCartel = setTimeout(function () { c.hidden = true; }, ms);
}

/** Se acabó el tiempo antes del objetivo: pantalla amable con lo encontrado y "¡Jugar otra vez!". */
async function finPorTiempo() {
    if (!jugando || juegoTerminado) return;
    jugando = false;
    window.Aparicion.detener();
    limpiarAyuda();
    apagarAyudaVisual();
    document.body.classList.add("demo-lock");
    if (TextoVoz.detener) TextoVoz.detener();
    if (topos()) topos().visibles().forEach(function (v) { topos().esconder(v.hoyo); });
    letrero(textos().letrero);
    sonarEvento("correcto");
    await sleep(700);
    const n = aciertos;
    const sub = n === 0 ? textos().tiempoSubCero : (n === 1 ? textos().tiempoSubUna : ReglasTopos.plantilla(textos().tiempoSub, { n: n }));
    const voz = n === 0 ? textos().tiempoVozCero : (n === 1 ? textos().tiempoVozUna : ReglasTopos.plantilla(textos().tiempoVoz, { n: n }));
    document.getElementById("fin-tiempo-titulo").textContent = textos().tiempoTitulo || "¡Buen trabajo!";
    document.getElementById("fin-tiempo-sub").textContent = sub;
    document.getElementById("fin-tiempo-num").textContent = String(n);
    document.getElementById("btn-otra-vez-texto").textContent = textos().botonOtraVez || "¡Jugar otra vez!";
    document.getElementById("btn-salir-texto").textContent = textos().botonSalir || "Salir";
    const estrellas = document.getElementById("fin-tiempo-estrellas");
    if (estrellas) {
        const total = ReglasTopos.objetivo(gameConfig);
        const llenas = n === 0 ? 0 : Math.max(1, Math.round((n / total) * 3));
        Array.prototype.forEach.call(estrellas.children, function (s, i) { s.classList.toggle("llena", i < llenas); });
    }
    document.getElementById("fin-tiempo").hidden = false;
    gestoGuia("celebra");
    hablar(voz, "zoe");
}

function reiniciarPartida() {
    const c = document.getElementById("fin-tiempo");
    if (c) c.hidden = true;
    if (TextoVoz.detener) TextoVoz.detener();
    sonarEvento("aparece");
    comenzarPartida();
}

/**
 * Objetivo cumplido: todos los topos celebran, lluvia de estrellas, el escenario se ilumina, Zoe felicita, cartel "¡SÚPER VELOZ!" con el audio de cierre y luego la victoria compartida.
 */
async function victoria() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    window.Temporizador.detener();
    window.Aparicion.detener();
    limpiarAyuda();
    apagarAyudaVisual();
    if (typeof Swal !== "undefined") Swal.close();
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.add("demo-lock", "en-final");
    document.getElementById("hud-reloj").classList.remove("poco");

    sonarEvento("correcto");
    letrero(textos().finalTitulo, "titulo");
    globo("");
    await sleep(950);
    if (topos()) topos().ocultarTodos();
    const zona = document.getElementById("escenario-zona");
    if (escenario()) {
        escenario().iluminar(true);
        escenario().lluvia(4500);
    }
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    const fiesta = topos() ? topos().celebrarTodos() : Promise.resolve();
    // Zoe entra caminando para felicitar.
    await zoeEntra();
    gestoGuia("celebra");
    mostrarCartel(textos().finalTitulo || "¡SÚPER VELOZ!", textos().finalSub || "");
    const voz = hablar(textos().final, "zoe", null, (textos().finalTitulo || "") + " " + (textos().finalSub || ""));
    await fiesta;
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    await Promise.race([voz, sleep(12000)]);
    globo("");
    await sleep(600);
    mostrarVictoria();
}

function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
    if (feedbackActivo()) hablar(cierre);
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

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    return {
        cancelado: function () { return juegoTerminado; },
        textos: textos,
        pasos: function () { return (gameConfig.demo && gameConfig.demo.pasos) || []; },
        preparar: function () {
            if (topos()) topos().ocultarTodos();
            letrero(textos().letrero);
        },
        decir: function (texto, nube) { return hablar(texto, "zoe", "senala", nube); },
        sacar: function (h, img) {
            sonarEvento("tic");
            return topos() ? topos().salir(h, img) : null;
        },
        globo: function (h) { return escenario() ? escenario().puntoGlobo(h) : null; },
        topo: function (h) { return escenario() ? escenario().puntoTopo(h) : null; },
        destacar: function (h, on) { if (topos()) topos().destacar(h, on); },
        // La demo no suma aciertos ni toca el reloj: solo muestra lo que pasa al acertar.
        golpear: function (h) {
            const g = escenario() ? escenario().puntoGlobo(h, true) : null;
            if (topos()) topos().golpeAcierto(h);
            sonarEvento("acierto");
            letrero(textos().demostracionBien || "¡CORRECTO!", "ok", 1700);
            if (g) escenario().flotante(g.x, g.y, "+1");
            gestoGuia("celebra");
        },
        prohibido: function (h) {
            if (topos()) topos().marcar(h, "no");
            sonarEvento("tic");
            letrero(textos().demostracionNo || "¡ESE NO!", "ups", 2200);
        },
        esconder: function (h) { return topos() ? topos().esconder(h) : null; },
        terminar: async function () {
            if (topos()) topos().ocultarTodos();
            letrero(textos().letrero);
            globo("");
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenario_listo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261112f"));
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

    globo("");
    letrero(textos().letrero);
    pintarHud();
    pintarReloj(ReglasTopos.duracionSeg(gameConfig));

    // La escena se arma desde el principio (detrás de la intro).
    if (window.EscenarioTopos) {
        escenario_listo = window.EscenarioTopos.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioTopos.alGolpear(alGolpear);
            window.Aparicion.iniciar(gameConfig, {
                aciertos: function () { return aciertos; },
                onAcierto: alAcierto,
                onError: alError,
                onEscapo: alEscapo
            });
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
    if (btnOtra) btnOtra.addEventListener("click", reiniciarPartida);
    const btnSalir = document.getElementById("btn-salir");
    if (btnSalir) btnSalir.addEventListener("click", function () { history.back(); });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        if (zoeEsGrande) setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (pj && !pj.dataset.caminando) ubicarZoeGrande();
        }, 60);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
