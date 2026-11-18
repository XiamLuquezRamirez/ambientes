/**
 * La Pista de Gravedad y Trampolines — control del juego (Polimotor, Transición 5-6 años, Eje Coordinación y
 * orientación, temática Laberintos de coordinación, juego 3).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → PRESENTACIÓN (la pista flotante sube del vacío,
 * Zoe 3D entra, la esfera aparece en la salida y la cámara recorre agujeros, trampolines y meta; Zeus: "¡Siente la
 * gravedad cero! …") → DEMO automática en una pista de práctica → Zoe se va → «¡COMENZAR!» → TRES RECORRIDOS cada
 * vez más largos y difíciles → FINAL (podio, la esfera se abre y revela el trofeo, láseres, confeti; Zoe y Zeus
 * celebran) → RESUMEN.
 *
 * Sin vidas y sin castigo: caer en un agujero activa el rayo tractor, que rescata la esfera y la deja en el último
 * punto seguro (no se pierde lo avanzado). Durante la partida Zoe y Zeus no se dibujan: se oye su voz.
 *
 * Módulos: ReglasGravedad (física pura) · SonidosGravedad (Web Audio) · EscenarioPista (three.js) ·
 * ControlEsfera (dedo, ratón, teclado) · GravedadDemo · Guia3D / Guia3DZeus (personajes 3D)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let pistas = [];
let pistaDemo = null;
let nivel = 0;
let jugando = false;
let enDemo = false;
let juegoTerminado = false;
let movido = false;
let tUltMov = 0;
let tInicio = 0;
let tProgreso = 0;
let sProgreso = 0;
let silencio = false;
let ultimaVoz = {};
let ayuda = { voz: null, repetir: null, token: 0 };
let stats = { saltos: 0, rescates: 0, recorridos: 0 };
let avisadoTrampolin = {};
let rampasDichas = {};
let tMonitor = null;
let ultAlerta = 0;
let ultPared = 0;

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
    return window.SonidosGravedad || null;
}

function efecto(nombre) {
    const s = sfx();
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioPista && window.EscenarioPista.listo() ? window.EscenarioPista : null;
}

function control() {
    return window.ControlEsfera || null;
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

function totalPistas() {
    return (gameConfig.pistas || []).length;
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
let hablandoAhora = false;

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
    const g3 = quien === "zoe" ? (zoeEnEscena ? guia3d() : null) : (zeusEnEscena ? zeus3d() : null);
    const fin = function () {
        hablandoAhora = false;
        if (g3) g3.hablar(false);
    };
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        setTimeout(fin, 1200);
        return Promise.resolve();
    }
    hablandoAhora = true;
    if (g3) g3.hablar(true);
    return TextoVoz.hablar(texto, quien).then(fin, fin);
}

/** Voz de la partida: no interrumpe una frase que ya está sonando (salvo las importantes). */
function hablarSiLibre(texto, pj) {
    if (hablandoAhora) return Promise.resolve();
    return hablar(texto, pj);
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

/** Música flotante (sintetizada en sonidos.js); TextoVoz le ajusta el volumen. */
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
    pintarProgreso();
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

// ------------------------------------------------------------------ indicador de recorrido (abajo a la izquierda)

let avanceActual = 0;

function pintarProgreso(animarI) {
    const caja = document.getElementById("nivel");
    if (!caja) return;
    caja.hidden = !acc().mostrarProgreso || enDemo;
    const total = totalPistas();
    caja.querySelectorAll(".nivel-paso").forEach(function (it) {
        const i = it.dataset.i == null ? -1 : Number(it.dataset.i);
        if (i >= 0) {
            const hecho = i < stats.recorridos;
            const actual = !juegoTerminado && i === nivel && i >= stats.recorridos && (jugando || partidaIniciada);
            it.classList.toggle("hecho", hecho);
            it.classList.toggle("actual", actual);
            it.style.setProperty("--avance", (hecho ? 100 : (actual ? Math.round(avanceActual * 100) : 0)) + "%");
        } else {
            it.classList.toggle("hecho", stats.recorridos >= total);
        }
        if (animarI != null && (i === animarI || (i < 0 && animarI === "meta"))) {
            it.classList.remove("gana");
            void it.offsetWidth;
            it.classList.add("gana");
        }
    });
    const rot = document.getElementById("nivel-rotulo");
    const det = document.getElementById("nivel-mision");
    const n = Math.min(total, nivel + 1);
    if (rot) rot.textContent = (textos().progreso || "RECORRIDO") + " " + n + " DE " + total;
    if (det) det.textContent = stats.recorridos >= total ? "¡Laberinto superado!" : "Avance " + Math.round(avanceActual * 100) + " %";
    caja.setAttribute("aria-label", "Recorrido " + n + " de " + total + ", avance " + Math.round(avanceActual * 100) + " por ciento");
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

/** Cartel: con mini es una píldora de una línea arriba al centro (avisos de la partida); sin mini, el grande. */
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
    (gameConfig.niveles || []).forEach(function (n) {
        botones +=
            '<div class="col-12 text-center mb-2">' +
            '<button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + n.id + '\')">' +
            "<strong>" + n.edad + "</strong><br><small>" + n.titulo + "</small></button></div>";
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
    const n = (gameConfig.niveles || []).find(function (x) { return String(x.id) === String(id); });
    Swal.close();
    if (!n) return;
    iniciarJuego();
}
window.confirmarNivel = confirmarNivel;

/**
 * Los tres recorridos de la partida, al azar (ReglasGravedad.generarPartida con la dificultad de cada nivel en
 * config.pistas[].aleatorio): cada pista generada se valida y se recorre con el piloto automático antes de usarla, y
 * cada recorrido es más largo que el anterior. Se generan al empezar y otra vez en VOLVER A JUGAR. La demo es fija.
 */
function generarPistas() {
    pistas = ReglasGravedad.generarPartida(gameConfig.pistas || [], cfgJuego(), Math.random);
}

function construirPistas() {
    generarPistas();
    pistaDemo = ReglasGravedad.construir(gameConfig.demoPista, cfgJuego());
}

/** Carga una pista: el velo se va y las piezas suben del vacío mientras se construye. */
async function mostrarPista(P) {
    const e = escenario();
    const prom = e.cargarPista(P, { animar: true });
    e.quitarVelo();
    await prom;
}

/**
 * Presentación: la pista flotante aparece, Zoe entra, la esfera llega a la salida y la cámara recorre la pista
 * (agujeros, trampolines, meta) mientras Zeus dice la consigna.
 */
async function presentar() {
    const e = escenario();
    if (!e) return;
    efecto("brillo");
    await zoeEntra();
    efecto("aparece");
    await e.aparecerEsfera();
    efecto("aterriza");
    gestoGuia("saluda");
    nubeZoe(textos().introNube);
    const voz = hablar(textos().introZeus, "zeus");
    await e.recorrido(function (f) {
        if (f === "agujero") efecto("alerta");
        else if (f === "trampolin") efecto("trampolin");
        else if (f === "meta") efecto("meta");
    });
    await Promise.race([voz, sleep(7000)]);
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
    construirPistas();
    e.bloquear(true);
    await mostrarPista(pistas[0]);
    if (sfx()) sfx().rodar(true);
    arrancarMonitor();
    await presentar();

    if (acc().mostrarIntro && window.GravedadDemo) {
        await e.transicion(900);
        await mostrarPista(pistaDemo);
        await e.aparecerEsfera();
        e.bloquear(false);
        enDemo = true;
        pintarProgreso();
        try {
            await window.GravedadDemo.correr(apiDemo());
        } catch (err) {
            console.warn("[Gravedad] demo", err);
        }
        enDemo = false;
        e.control(null);
        e.bloquear(true);
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡COMENZAR!", "fa-solid fa-play");
    musicaModo("juego");
    nuevaPartida();
}

// ------------------------------------------------------------------ partida y recorridos

function nuevaPartida() {
    nivel = 0;
    stats = { saltos: 0, rescates: 0, recorridos: 0 };
    tInicio = Date.now();
    rampasDichas = {};
    return cargarNivel(0);
}

async function cargarNivel(i) {
    const e = escenario();
    if (!e) return;
    nivel = i;
    jugando = false;
    movido = false;
    avanceActual = 0;
    avisadoTrampolin = {};
    limpiarAyuda();
    document.body.classList.add("demo-lock");
    if (control()) control().habilitar(false);
    e.bloquear(true);
    nubeZoe("");
    await e.transicion(900);
    await mostrarPista(pistas[i]);
    pintarProgreso();
    const def = (gameConfig.pistas || [])[i] || {};
    mostrarCartel((def.titulo || ("RECORRIDO " + (i + 1))) + " DE " + totalPistas(), "", 2200, "#fde047");
    efecto("aparece");
    await e.aparecerEsfera();
    if (i > 0) await Promise.race([hablar(textos().recorridoNuevo, "zeus"), sleep(5500)]);
    else await sleep(500);
    tUltMov = Date.now();
    tProgreso = Date.now();
    sProgreso = 0;
    jugando = true;
    e.bloquear(false);
    document.body.classList.remove("demo-lock");
    if (control()) control().habilitar(true);
    pintarProgreso();
    programarAyuda();
}

/** La esfera llegó a la plataforma de meta. */
async function alMeta() {
    const e = escenario();
    if (!e) return;
    efecto("meta");
    if (enDemo) return;
    if (!jugando) return;
    jugando = false;
    limpiarAyuda();
    if (control()) control().habilitar(false);
    e.bloquear(true);
    sonarEvento("acierto", { vol: 0.35 });
    await e.esperarMeta();
    stats.recorridos = nivel + 1;
    avanceActual = 1;
    pintarProgreso(nivel);
    const paso = document.querySelector('#nivel .nivel-paso[data-i="' + nivel + '"]');
    if (window.PedniaFx && paso) window.PedniaFx.celebracion(paso.getBoundingClientRect());
    if (nivel < totalPistas() - 1) {
        efecto("exito");
        e.confeti();
        efecto("fiesta");
        mostrarCartel("¡RECORRIDO " + (nivel + 1) + " SUPERADO!", "", 2600);
        await Promise.race([hablar(textos().recorridoBien, "zoe"), sleep(5000)]);
        if (!juegoTerminado) cargarNivel(nivel + 1);
        return;
    }
    terminarJuego();
}

// ------------------------------------------------------------------ eventos de la escena

function alMover() {
    tUltMov = Date.now();
    if (!jugando) return;
    movido = true;
}

function alCerca(id) {
    if (!(jugando || enDemo)) return;
    const ahora = Date.now();
    if (ahora - ultAlerta > 2600) {
        ultAlerta = ahora;
        efecto("alerta");
    }
    if (jugando && tocaVoz("agujero", Number(cfgJuego().vozAgujeroMs) || 14000)) hablarSiLibre(textos().agujero, "zoe");
}

function alAgujero() {
    efecto("caida");
    if (jugando) {
        stats.rescates++;
        limpiarAyuda();
    }
}

function alRescate() {
    efecto("aterriza");
    if (!jugando) return;
    if (tocaVoz("caida", 9000)) hablar(textos().caida, "zoe");
    programarAyuda();
}

function alSalto() {
    efecto("trampolin");
    setTimeout(function () { efecto("salto"); }, 180);
    sonarEvento("bote", { vol: 0.3 });
    if (jugando) {
        stats.saltos++;
        limpiarAyuda();
    }
}

function alAterriza() {
    efecto("aterriza");
    if (jugando) programarAyuda();
}

function alSeguro(i) {
    if (i > 0) efecto("seguro");
}

/** Empuja contra un borde: si está frente a un muro, Zeus recuerda el trampolín (no muy seguido). */
function alPared(v) {
    if (!jugando) return;
    const ahora = Date.now();
    if (v > 0.6 && ahora - ultPared > 900) {
        ultPared = ahora;
        efecto("pared");
    }
    const e = escenario();
    const b = e ? e.esfera() : null;
    const P = e ? e.pista() : null;
    if (!b || !P) return;
    const frenteMuro = P.trampolines.some(function (t) { return Math.hypot(b.x - t.x, b.z - t.z) < 2.6; });
    if (frenteMuro && tocaVoz("pared", Number(cfgJuego().vozParedMs) || 12000)) {
        P.trampolines.forEach(function (t) { if (Math.hypot(b.x - t.x, b.z - t.z) < 3) e.resaltarTrampolin(t.id); });
        hablarSiLibre(textos().trampolin, "zeus");
    }
}

// ------------------------------------------------------------------ vigilancia: sonido, progreso, ayudas en contexto

function arrancarMonitor() {
    clearInterval(tMonitor);
    tMonitor = setInterval(function () {
        const e = escenario();
        if (!e) return;
        const b = e.esfera();
        const P = e.pista();
        if (!b || !P) return;
        // sonido de rodar (más fuerte y con viento al bajar rápido)
        if (sfx()) {
            let bajada = false;
            const s = ReglasGravedad.superficie(P, b.x, b.z, b.h);
            if (s && (s.gx || s.gz)) bajada = (b.vx * s.gx + b.vz * s.gz) < 0;
            sfx().rodarVelocidad(b.modo === "rueda" ? b.v / (Number(cfgJuego().velocidadMax) || 4.2) : 0, bajada);
            // rampas: un aviso de cada tipo en toda la partida (aprender cómo se siente la gravedad)
            if (jugando && s && Math.hypot(s.gx, s.gz) > 0.1 && b.v > 0.6) {
                const tipo = bajada ? "rampaBaja" : "rampaSube";
                if (!rampasDichas[tipo] && !hablandoAhora) {
                    rampasDichas[tipo] = true;
                    hablar(textos()[tipo], tipo === "rampaBaja" ? "zoe" : "zeus");
                }
            }
        }
        if (!jugando || b.modo !== "rueda") return;
        // progreso del recorrido
        const pr = ReglasGravedad.progresoEn(P, b.x, b.z);
        const av = Math.max(0, Math.min(0.99, pr.s / Math.max(1, P.largo)));
        if (av > avanceActual + 0.004 || av < avanceActual - 0.05) {
            avanceActual = Math.max(avanceActual, av);
            pintarProgreso();
        }
        if (pr.s > sProgreso + 0.8) {
            sProgreso = pr.s;
            tProgreso = Date.now();
        }
        // cerca de un trampolín: Zeus da la pista una vez por trampolín y recorrido
        P.trampolines.forEach(function (t) {
            if (avisadoTrampolin[t.id]) return;
            if (Math.hypot(b.x - t.x, b.z - t.z) < (Number(cfgJuego().distanciaVozTrampolin) || 5.5)) {
                avisadoTrampolin[t.id] = true;
                e.resaltarTrampolin(t.id);
                if (tocaVoz("trampolin", Number(cfgJuego().vozTrampolinMs) || 16000)) hablarSiLibre(textos().trampolin, "zeus");
            }
        });
        // perdió la orientación: se mueve pero no avanza
        if (movido && Date.now() - tProgreso > (Number(cfgJuego().orientacionMs) || 9000)) {
            tProgreso = Date.now();
            if (acc().ayudaAutomatica) e.destellosCamino(8);
            efecto("brillo");
            if (tocaVoz("orientacion", 15000)) hablarSiLibre(textos().orientacion, "zoe");
        }
    }, 150);
}

// ------------------------------------------------------------------ entrada (callbacks de control.js)

function puedeControlar() {
    return jugando && !juegoTerminado && !enDemo;
}

function alTocar() {
    tUltMov = Date.now();
    if (!movido) {
        sonarEvento("agarrar", { vol: 0.3 });
    }
    limpiarAyuda();
}

function alSoltar() {
    if (!jugando) return;
    programarAyuda();
}

// ------------------------------------------------------------------ ayuda gradual (sin resolver el recorrido)

function limpiarAyuda() {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
}

/**
 * Quieto durante ayudaMs: si nunca movió la esfera, Zoe explica cómo moverla y la esfera destella; si ya juega, un
 * orbe de luz recorre el siguiente tramo (con la ayuda visual activa) y Zoe lo dice.
 */
function programarAyuda() {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    const token = ayuda.token;
    const vigente = function () { return token === ayuda.token && jugando && !juegoTerminado && !(control() && control().activo()); };
    const pista = function () {
        if (!vigente() || !escenario()) return;
        const e = escenario();
        if (Date.now() - tUltMov < (Number(cfgJuego().ayudaMs) || 10000) - 200) {
            ayuda.repetir = setTimeout(pista, 2000);
            return;
        }
        if (!movido) {
            e.resaltarEsfera();
            efecto("brillo");
            hablar(textos().pistaArrastra, "zoe");
        } else {
            if (acc().ayudaAutomatica) e.destellosCamino(8);
            efecto("brillo");
            hablarSiLibre(textos().orientacion, "zoe");
        }
        ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 14000);
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 10000);
}

// ------------------------------------------------------------------ final y resumen

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    limpiarAyuda();
    if (control()) control().habilitar(false);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-final");
    pintarProgreso("meta");
    const e = escenario();
    musicaModo("final");
    if (sfx()) sfx().rodar(false);
    await e.finalCinematica(function (f) {
        if (f === "podio") efecto("aparece");
        else if (f === "brillo") efecto("brillo");
        else if (f === "trofeo") efecto("trofeo");
        else if (f === "laser") efecto("laser");
        else if (f === "confeti") efecto("fiesta");
    });
    efecto("fanfarria");
    const fiesta = function () {
        e.confeti();
        efecto("fiesta");
        if (window.PedniaFx) window.PedniaFx.celebracion({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight * 0.6 });
    };
    fiesta();
    mostrarCartel(textos().finalTitulo || "¡GENIALIDAD POLIMOTORA!", textos().finalSub || "");
    await Promise.all([zoeEntra(), zeusEntra()]);
    gestoGuia("celebra");
    if (zeus3d()) zeus3d().gesto("celebra");
    const tFiesta = setInterval(fiesta, 2800);
    await Promise.all([Promise.race([hablar(textos().cierre, "zoe", null, textos().finalNube || "¡GENIALIDAD POLIMOTORA!"), sleep(14000)]), sleep(4000)]);
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

/** Panel del final: recorridos, saltos, rescates y tiempo. */
function mostrarResumen() {
    const panel = document.getElementById("resumen");
    const lista = document.getElementById("resumen-lista");
    if (!panel || !lista) return;
    document.getElementById("resumen-titulo").textContent = textos().resumenTitulo || "¡LABERINTO SUPERADO!";
    panel.querySelector(".resumen-sub").textContent = textos().resumenSub || "";
    lista.innerHTML = "";
    const filas = [
        { icono: "fa-route", color: "#22d3ee", texto: (textos().resumenRecorridos || "Recorridos completados") + ": " + stats.recorridos + " de " + totalPistas(), ok: stats.recorridos >= totalPistas() },
        { icono: "fa-angles-up", color: "#facc15", texto: (textos().resumenSaltos || "Saltos en trampolín") + ": " + stats.saltos, ok: stats.saltos > 0 },
        { icono: "fa-wand-magic-sparkles", color: "#c084fc", texto: (textos().resumenRescates || "Rescates del rayo mágico") + ": " + stats.rescates, ok: true },
        { icono: "fa-stopwatch", color: "#f472b6", texto: (textos().resumenTiempo || "Tiempo total") + ": " + formatoTiempo(Date.now() - tInicio), ok: true }
    ];
    filas.forEach(function (f, i) {
        const li = document.createElement("li");
        li.className = "resumen-item" + (f.ok ? " ok" : "");
        li.style.setProperty("--i", i);
        li.style.setProperty("--medalla", f.color);
        li.innerHTML = '<span class="resumen-icono" aria-hidden="true"><i class="fa-solid ' + f.icono + '"></i></span>' +
            '<span class="resumen-texto"><strong></strong></span>' +
            '<span class="resumen-check" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>';
        li.querySelector("strong").textContent = f.texto;
        lista.appendChild(li);
    });
    panel.hidden = false;
    sonarEvento("victoria");
    if (sonido()) sonido().agacharMusica(0.35);
    const btn = document.getElementById("btn-otra-vez");
    if (btn) btn.focus();
}

/** VOLVER A JUGAR: los tres recorridos desde el primero, sin repetir la presentación ni la demo. */
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
    musicaModo("juego");
    if (sfx()) sfx().rodar(true);
    generarPistas();      // recorridos nuevos en cada partida
    nuevaPartida();
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    const e = escenario();
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        pista: function () { return e.pista(); },
        esfera: function () { return e.esfera(); },
        objetivo: function (x, z) { e.control({ modo: "punto", x: x, z: z, factor: 0.75, oculto: false }); },
        soltar: function () { e.control(null); },
        pantallaDe: function (x, y, z) { return e.pantallaDe(x, y, z); },
        pantallaEsfera: function () { return e.pantallaEsfera(); },
        esperarMeta: function () { return Promise.race([e.esperarMeta(), sleep(2500)]); },
        decir: function (clave) {
            const pj = clave === "demoTrampolin" ? "zeus" : "zoe";
            hablar(textos()[clave], pj, clave === "demoAgujero" ? "senala" : null);
        },
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
            e.control(null);
            e.bloquear(true);
            nubeZoe("");
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenarioListo = Promise.resolve(false);

/** El escenario es un módulo: se espera a que exista (normalmente ya está al llegar aquí). */
function esperarModulo(nombre, ms) {
    return new Promise(function (resolve) {
        const t0 = Date.now();
        const tick = function () {
            if (window[nombre]) resolve(window[nombre]);
            else if (Date.now() - t0 > ms) resolve(null);
            else setTimeout(tick, 50);
        };
        tick();
    });
}

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261118d"));
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
    window.addEventListener("pagehide", function () {
        TextoVoz.vaciar();
        if (sfx()) sfx().rodar(false);
    });

    nubeZoe("");
    pintarProgreso();

    escenarioListo = esperarModulo("EscenarioPista", 8000).then(function (esc) {
        if (!esc) return false;
        return esc.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            esc.on({
                mueve: alMover,
                pared: alPared,
                cerca: alCerca,
                agujero: alAgujero,
                rescate: alRescate,
                salto: alSalto,
                aterriza: alAterriza,
                seguro: alSeguro,
                meta: alMeta
            });
            if (control()) control().iniciar({ puedeControlar: puedeControlar, alTocar: alTocar, alSoltar: alSoltar });
            return ok;
        });
    });

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
