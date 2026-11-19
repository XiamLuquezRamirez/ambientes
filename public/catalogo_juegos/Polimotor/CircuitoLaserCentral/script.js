/**
 * El Circuito Láser de la Central de Energía — control del juego (Polimotor, Transición 5-6 años, Eje Coordinación
 * y orientación, temática Laberintos de coordinación, juego 1).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → PRESENTACIÓN (título, Zoe 3D entra, la central,
 * el circuito con sus dos barreras, el reactor y la esfera que aparece en la salida; Zoe: "¡Alerta de precisión…")
 * → DEMO automática sin botón (la mano lleva la esfera, se detiene ante cada láser encendido, espera el 3, 2, 1 y
 * cruza; Zeus: "¡Calcula el tiempo! …"; llega al reactor) → Zoe se va → "¡Comenzar a jugar!" → 3 CIRCUITOS de
 * dificultad creciente (barrido de luz, el circuito se enciende, la esfera aparece, instrucción) → al llegar la
 * esfera entra al reactor y la central se ilumina → FINAL (la central se reactiva: tuberías, paneles, luz y gran
 * onda de energía; Zoe: "¡SÚPER CONTROL! …") → RESUMEN con los tres circuitos y "¡JUGAR OTRA VEZ!".
 *
 * Nada resta: tocar la pared o un rayo encendido hace retroceder la esfera un poquito (con chispas suaves) y se
 * sigue desde ahí. Zeus no se dibuja: solo se oye su voz.
 *
 * Módulos: ReglasLaser (geometría y decisiones, puro) · SonidosLaser (Web Audio) · EscenarioLaser (Phaser) ·
 * ArrastreEsfera (ratón y dedo) · CircuitoDemo · Guia3D (Zoe 3D)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let circuitos = [];           // circuitos construidos para la pantalla actual
let demoCirc = null;
let indice = 0;               // circuito actual (0..2)
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let ocupado = false;          // transición o cierre en curso
let completados = [];
let estadisticas = [];        // por circuito: { barreras, ajustes, ms }
let tInicioCircuito = 0;
let movido = false;
let tSonidos = null;
let tVozPared = 0;
let tVozLaser = 0;
let tVozCruce = 0;
let tPanel = 0;
let primeraEspera = true;
let ultimaFrase = {};
let ayuda = { voz: null, repetir: null, token: 0, nivel: 0 };

const TOTAL = 3;

/** Personaje que aparece en pantalla (presentación, demo y final): al azar en cada partida. El otro solo se oye. */
const GUIA = (function () {
    let quien = Math.random() < 0.5 ? "zoe" : "zeus";
    // sin repetir el mismo personaje tres partidas seguidas (el sorteo se recuerda en este navegador)
    try {
        const prev = JSON.parse(localStorage.getItem("circuitoLaserGuias") || "[]");
        if (prev.length >= 2 && prev[0] === quien && prev[1] === quien) quien = quien === "zoe" ? "zeus" : "zoe";
        localStorage.setItem("circuitoLaserGuias", JSON.stringify([quien].concat(prev).slice(0, 2)));
    } catch (e) { /* sin almacenamiento: queda el sorteo */ }
    return quien;
})();
const OTRO = GUIA === "zoe" ? "zeus" : "zoe";
window.GUIA_PERSONAJE = GUIA;

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

function sfx() {
    return window.SonidosLaser || null;
}

function efecto(nombre) {
    const s = sfx();
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioLaser && window.EscenarioLaser.listo() ? window.EscenarioLaser : null;
}

function arrastre() {
    return window.ArrastreEsfera || null;
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

function defCircuito(i) {
    return (gameConfig.circuitos || [])[i] || {};
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

function frase(clave) {
    const v = textos()[clave];
    if (!Array.isArray(v)) return v || "";
    if (v.length < 2) return v[0] || "";
    let i = Math.floor(Math.random() * v.length);
    if (i === ultimaFrase[clave]) i = (i + 1) % v.length;
    ultimaFrase[clave] = i;
    return v[i];
}

function musicaModo(m) {
    if (audioFondo && typeof audioFondo.modo === "function") audioFondo.modo(m);
}

// ------------------------------------------------------------------ Zoe y voces

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

/** Habla Zoe (por defecto) o Zeus. Promise que termina con la voz. Zeus no aparece en pantalla, solo se oye. */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    if (quien === GUIA) nubeZoe(zoeEnEscena ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    const fin = function () {
        if (quien === GUIA && guia3d()) guia3d().hablar(false);
    };
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        setTimeout(fin, 1200);
        return Promise.resolve();
    }
    if (quien === GUIA && guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, quien).then(fin, fin);
}

let ultimasVoces = [];

/**
 * Voz de la partida al azar entre Zoe y Zeus (sin repetir el mismo personaje más de dos veces seguidas).
 * La presentación y el cierre siguen con Zoe porque ella está en pantalla.
 */
function vozAzar() {
    let quien = Math.random() < 0.5 ? "zoe" : "zeus";
    if (ultimasVoces.length >= 2 && ultimasVoces[0] === quien && ultimasVoces[1] === quien) quien = quien === "zoe" ? "zeus" : "zoe";
    ultimasVoces = [quien].concat(ultimasVoces).slice(0, 2);
    return quien;
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

/** Música de la central (sintetizada en sonidos.js); TextoVoz le ajusta el volumen. */
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
    { key: "ayudaAutomatica", label: "Ayuda visual (flechas de luz)" },
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
    pintarNivel();
}

// ------------------------------------------------------------------ Zoe 3D (presentación, demo y final)

let zoeEnEscena = false;

function ubicarZoe() {
    const pj = document.querySelector("#guia .guia-pj");
    const z = escenario() ? escenario().zonaZoe() : null;
    if (!pj || !z) return;
    const ancho = Math.max(z.width * 1.05, 170);
    const alto = Math.min(Math.max(z.height, 260), ancho / 0.5, window.innerHeight * 0.58);
    pj.style.left = Math.round(Math.max(4, z.left - z.width * 0.02)) + "px";
    pj.style.top = Math.round(z.bottom - alto) + "px";
    pj.style.width = Math.round(ancho) + "px";
    pj.style.height = Math.round(alto) + "px";
}

function guiaMovil() {
    return window.Guia3D && window.Guia3D.listo() && window.Guia3D.caminar ? window.Guia3D : null;
}

function caminarHasta(pj, x, ms, lado) {
    const g = guiaMovil();
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
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha");
}

async function zoeSale() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !zoeEnEscena) return;
    nubeZoe("");
    const ancho = parseFloat(pj.style.width) || 200;
    const desde = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, -ancho - 20, duracionPasos(desde + ancho), "izquierda");
    zoeEnEscena = false;
    document.body.classList.remove("zoe-grande");
}

// ------------------------------------------------------------------ indicador de nivel (abajo a la izquierda)

function pintarNivel(animarIdx) {
    const caja = document.getElementById("nivel");
    if (!caja) return;
    caja.hidden = !acc().mostrarProgreso;
    const items = caja.querySelectorAll(".nivel-paso");
    items.forEach(function (it, i) {
        it.classList.toggle("hecho", completados.indexOf(i) >= 0);
        it.classList.toggle("actual", jugando && i === indice && completados.indexOf(i) < 0);
        if (i === animarIdx) {
            it.classList.remove("gana");
            void it.offsetWidth;
            it.classList.add("gana");
        }
    });
    const n = Math.min(TOTAL, indice + 1);
    const rot = document.getElementById("nivel-rotulo");
    if (rot) rot.textContent = (textos().progreso || "NIVEL") + " " + n + " DE " + TOTAL;
    caja.setAttribute("aria-label", "Nivel " + n + " de " + TOTAL + "; " + completados.length + " completados");
}

function avanceNivel(frac) {
    const it = document.querySelectorAll("#nivel .nivel-paso")[indice];
    if (it) it.style.setProperty("--avance", Math.round(frac * 100) + "%");
}

// ------------------------------------------------------------------ carteles y botón central

function esperarBoton(texto, icono) {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = texto || "¡A jugar!";
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

function mostrarCartel(titulo, sub, ms) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
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

/** Los tres circuitos para el tamaño de pantalla actual (el alto del mundo se adapta a la pantalla). */
function nuevaPartida() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    circuitos = (gameConfig.circuitos || []).slice(0, TOTAL).map(function (d) { return ReglasLaser.construir(d, dims, cfgJuego()); });
    completados = [];
    estadisticas = [];
    indice = 0;
    document.querySelectorAll("#nivel .nivel-paso").forEach(function (it) { it.style.setProperty("--avance", "0%"); });
    pintarNivel();
}

function construirDemo() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    demoCirc = ReglasLaser.construir(gameConfig.demoCircuito || defCircuito(1), dims, cfgJuego());
    return demoCirc;
}

/** Presentación: título, Zoe entra, se ven la central, el circuito, los láseres y el reactor; la esfera aparece. */
async function presentar() {
    const e = escenario();
    if (!e) return;
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    efecto("brillo");
    await Promise.all([zoeEntra(), sleep(2600)]);
    ocultarCartel();
    efecto("aparece");
    await e.llegarInicio();
    gestoGuia("saluda");
    await Promise.race([hablar(textos().introZoe, GUIA, "senala", textos().introNube), sleep(14000)]);
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
    if (!escenario()) return;
    musicaModo("intro");
    construirDemo();
    await escenario().cargarCircuito(demoCirc, { animar: true });
    arrancarSonidos();
    await presentar();

    if (acc().mostrarIntro && window.CircuitoDemo && demoCirc) {
        enDemo = true;
        try {
            await window.CircuitoDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[Circuito] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-solid fa-play");
    musicaModo("central");
    nuevaPartida();
    comenzarCircuito(true);
}

// ------------------------------------------------------------------ sonidos continuos (esfera y láseres)

function arrancarSonidos() {
    if (sfx()) sfx().esfera(true);
    clearInterval(tSonidos);
    tSonidos = setInterval(function () {
        if (!sfx() || !escenario()) return;
        const p = escenario().piloto();
        sfx().esferaVelocidad(p.visible && (p.arrastrando || p.auto) ? p.empuje : 0);
        sfx().zumbido(juegoTerminado ? 0 : escenario().zumbidoLaser());
    }, 90);
}

function pararSonidos() {
    clearInterval(tSonidos);
    tSonidos = null;
    if (sfx()) {
        sfx().esfera(false);
        sfx().zumbido(0);
    }
}

// ------------------------------------------------------------------ circuitos

/**
 * Transición y arranque de un circuito: barrido de luz, el circuito nuevo se enciende de la salida al reactor,
 * cartel con el nombre, la esfera aparece en la salida y se oye la instrucción.
 */
async function comenzarCircuito(desdeDemo) {
    const e = escenario();
    if (!e || !circuitos.length) return;
    const c = circuitos[indice];
    const def = defCircuito(indice);
    jugando = false;
    ocupado = true;
    movido = false;
    limpiarAyuda();
    document.body.classList.add("demo-lock");
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    nubeZoe("");
    await e.ocultarCircuito();
    efecto("regreso");
    await e.transicion(desdeDemo ? 1000 : 1200);
    await e.cargarCircuito(c, { animar: true });
    pintarNivel();
    mostrarCartel(def.titulo || ("NIVEL " + (indice + 1)), def.nombre || "", 2600);
    efecto("aparece");
    await e.llegarInicio();
    await sleep(250);
    estadisticas[indice] = { barreras: 0, ajustes: 0, ms: 0 };
    tInicioCircuito = Date.now();
    jugando = true;
    ocupado = false;
    pintarNivel();
    e.bloquear(false);
    document.body.classList.remove("demo-lock");
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
    hablar(def.instruccion, vozAzar());
}

async function completarCircuito() {
    const e = escenario();
    if (!e || !jugando) return;
    jugando = false;
    ocupado = true;
    limpiarAyuda();
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    document.body.classList.add("demo-lock");
    completados.push(indice);
    if (estadisticas[indice]) estadisticas[indice].ms = Date.now() - tInicioCircuito;
    avanceNivel(1);
    pintarNivel(indice);
    const def = defCircuito(indice);
    // la esfera entra al conector y el reactor se carga; la central se ilumina
    await e.conectarReactor(function (f) {
        if (f === "entra") efecto("conexion");
    });
    efecto("exito");
    sonarEvento("acierto", { vol: 0.45 });
    const paso = document.querySelectorAll("#nivel .nivel-paso")[indice];
    if (window.PedniaFx && paso) window.PedniaFx.celebracion(paso.getBoundingClientRect());
    const voz = indice < TOTAL - 1 ? hablar(textos().cierreCircuito, vozAzar()) : Promise.resolve();
    mostrarCartel(def.logro || "¡Muy bien!", indice < TOTAL - 1 ? textos().cierreCircuito : "");
    await e.celebrarCircuito();
    await Promise.all([Promise.race([voz, sleep(4500)]), sleep(1500)]);
    ocultarCartel();
    if (indice >= TOTAL - 1) {
        terminarJuego();
        return;
    }
    indice++;
    comenzarCircuito(false);
}

// ------------------------------------------------------------------ eventos de la escena

/** Toca la pared: chispas suaves, vibración, retrocede un poquito. Zoe anima (no muy seguido). */
function alPared() {
    if (!(jugando || enDemo)) return;
    efecto("choque");
    setTimeout(function () { efecto("regreso"); }, 120);
    if (jugando && estadisticas[indice]) estadisticas[indice].ajustes++;
    if (jugando && Date.now() - tVozPared > (Number(cfgJuego().vozParedMs) || 9000)) {
        tVozPared = Date.now();
        hablar(textos().pared, vozAzar());
    }
    programarAyudaSuave();
}

/** Intentó cruzar un rayo encendido: impacto eléctrico suave, retrocede; el láser sigue su ciclo. */
function alLaser() {
    if (!(jugando || enDemo)) return;
    efecto("impacto");
    if (jugando && estadisticas[indice]) estadisticas[indice].ajustes++;
    if (jugando && Date.now() - tVozLaser > (Number(cfgJuego().vozLaserMs) || 14000)) {
        tVozLaser = Date.now();
        hablar(textos().esperaRayo, vozAzar());
    }
}

/** La esfera se acerca a un láser encendido: advertencia; la primera vez Zeus explica la sincronización. */
function alAcerca() {
    if (!jugando) return;
    efecto("aviso");
    if (primeraEspera) {
        primeraEspera = false;
        tVozLaser = Date.now();
        hablar(textos().sincronizacion, vozAzar());
    } else if (Date.now() - tVozLaser > (Number(cfgJuego().vozLaserMs) || 14000)) {
        tVozLaser = Date.now();
        hablar(textos().esperaRayo, vozAzar());
    }
}

function alEstadoLaser(i, on, cerca) {
    if (juegoTerminado) return;
    if (on) efecto("laserOn", cerca);
    else efecto("laserOff", cerca);
}

function alCuenta(i, n, cerca) {
    if (juegoTerminado || cerca < 0.25) return;
    efecto("tic", n);
}

function alCruce() {
    if (!(jugando || enDemo)) return;
    efecto("cruce");
    if (jugando && estadisticas[indice]) estadisticas[indice].barreras++;
    if (jugando && Date.now() - tVozCruce > 6000) {
        tVozCruce = Date.now();
        hablar(frase("cruce"), vozAzar());
    }
}

function alPanel(k) {
    if (Date.now() - tPanel < 500) return;
    tPanel = Date.now();
    efecto("panel", k);
}

function alAvance(frac) {
    if (!jugando) return;
    avanceNivel(frac);
}

function alMeta() {
    if (enDemo || !jugando) return;
    if (arrastre()) arrastre().cancelar();
    completarCircuito();
}

function alMover() {
    if (!jugando) return;
    if (!movido) movido = true;
    programarAyudaSuave();
}

// ------------------------------------------------------------------ entrada (callbacks de arrastre.js)

function puedeTomar() {
    return jugando && !ocupado && !juegoTerminado && !enDemo;
}

function alTomar() {
    limpiarAyuda();
    sonarEvento("agarrar", { vol: 0.4 });
}

function alSoltar() {
    if (!jugando || ocupado) return;
    programarAyuda();
}

function alTocarFuera(w) {
    if (!jugando || ocupado || !escenario()) return;
    // tocó lejos de la esfera: una onda donde tocó y la esfera destella para mostrar dónde poner el dedo
    const e = escenario();
    const p = e.piloto();
    if (w) e.onda(w.x, w.y, 0x7dd3fc, 0.5);
    e.chispas(p.x, p.y, 10, 0.6);
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
 * Sin movimiento durante ayudaMs: 1) si nunca tomó la esfera, Zoe explica cómo arrastrarla y la esfera destella;
 * si ya juega, se iluminan las flechas de adelante y Zoe dice "¡Guía la esfera por el camino luminoso!". 2) si
 * sigue sin moverse, una luz dorada recorre el tramo siguiente. Si la esfera está esperando ante un rayo encendido
 * no se da ninguna pista: esperar es justo lo que hay que hacer.
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
        if (e.esperandoLaser()) {
            ayuda.repetir = setTimeout(pista, 4000);
            return;
        }
        if (!movido) {
            e.chispas(p.x, p.y, 12, 0.6);
            e.onda(p.x, p.y, 0xfde68a, 0.8);
            if (acc().ayudaAutomatica) e.pistaLuces(3000);
            hablar(textos().pistaArrastra, vozAzar());
        } else if (ayuda.nivel === 0) {
            if (acc().ayudaAutomatica) e.pistaLuces(3000);
            efecto("brillo");
            hablar(textos().guia, vozAzar());
        } else if (acc().ayudaAutomatica) {
            e.guiaDorada(2400);
            hablar(textos().guia, vozAzar());
        }
        ayuda.nivel = Math.min(2, ayuda.nivel + 1);
        ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 13000);
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 10000);
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
    const e = escenario();
    musicaModo("final");
    pararSonidos();
    await e.finalCinematica(function (f, i) {
        if (f === "tubos") efecto("conexion");
        else if (f === "panel") efecto("panel", i);
        else if (f === "expansion") efecto("cruce");
    });
    efecto("fanfarria");
    const fiesta = function () {
        e.fuegos(4);
        efecto("fiesta");
        if (window.PedniaFx) window.PedniaFx.celebracion({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight * 0.7 });
    };
    fiesta();
    mostrarCartel(textos().finalTitulo || "¡NIVEL COMPLETADO!", textos().finalSub || "");
    await zoeEntra();
    gestoGuia("celebra");
    const tFiesta = setInterval(fiesta, 2800);
    await Promise.all([Promise.race([hablar(textos().finalZoe, GUIA, null, textos().finalNube || "¡SÚPER CONTROL!"), sleep(12000)]), sleep(4000)]);
    nubeZoe("");
    await Promise.race([hablar(textos().finalZeus, OTRO), sleep(4500)]);
    if (guia3d()) guia3d().gesto("final");
    await sleep(1200);
    clearInterval(tFiesta);
    ocultarCartel();
    mostrarResumen();
}

const MEDALLAS = ["#22d3ee", "#a78bfa", "#facc15"];

function formatoTiempo(ms) {
    const s = Math.max(1, Math.round((ms || 0) / 1000));
    return s < 60 ? s + " s" : Math.floor(s / 60) + " min " + (s % 60) + " s";
}

/** Panel del final: una medalla por circuito con su miniatura, las barreras superadas y el tiempo. */
function mostrarResumen() {
    const panel = document.getElementById("resumen");
    const lista = document.getElementById("resumen-lista");
    if (!panel || !lista || !circuitos.length) return;
    lista.innerHTML = "";
    circuitos.forEach(function (c, i) {
        const def = defCircuito(i);
        const est = estadisticas[i] || { barreras: c.laseres.length, ms: 0 };
        const li = document.createElement("li");
        li.className = "resumen-item";
        li.style.setProperty("--i", i);
        li.style.setProperty("--medalla", MEDALLAS[i % MEDALLAS.length]);
        const img = document.createElement("img");
        img.alt = "Circuito del nivel " + (i + 1);
        img.src = escenario() ? escenario().miniatura(c, 220, 130) : "";
        const txt = document.createElement("div");
        txt.className = "resumen-texto";
        txt.innerHTML = '<strong></strong><span><em class="resumen-ok"><i class="fa-solid fa-circle-check"></i> <b></b></em>' +
            '<small class="resumen-dato"><i class="fa-solid fa-bolt"></i> <b class="r-barreras"></b></small>' +
            '<small class="resumen-dato"><i class="fa-solid fa-stopwatch"></i> <b class="r-tiempo"></b></small></span>';
        txt.querySelector("strong").textContent = (i + 1) + ". " + (def.nombre || "");
        txt.querySelector(".resumen-ok b").textContent = textos().completado || "¡circuito superado!";
        const n = Math.max(est.barreras, c.laseres.length);
        txt.querySelector(".r-barreras").textContent = n + (n === 1 ? " barrera láser superada" : " barreras láser superadas");
        txt.querySelector(".r-tiempo").textContent = formatoTiempo(est.ms);
        const med = document.createElement("span");
        med.className = "resumen-medalla";
        med.setAttribute("aria-hidden", "true");
        med.innerHTML = '<i class="fa-solid fa-medal"></i><b>' + (i + 1) + "</b>";
        li.appendChild(med);
        li.appendChild(img);
        li.appendChild(txt);
        lista.appendChild(li);
    });
    const barra = document.getElementById("resumen-barra");
    if (barra) {
        barra.style.setProperty("--progreso", "0%");
        setTimeout(function () { barra.style.setProperty("--progreso", Math.round(completados.length / TOTAL * 100) + "%"); }, 400);
    }
    const cuenta = document.getElementById("resumen-cuenta");
    if (cuenta) cuenta.textContent = completados.length + " de " + TOTAL + " circuitos";
    panel.hidden = false;
    sonarEvento("victoria");
    if (sonido()) sonido().agacharMusica(0.35);
    const btn = document.getElementById("btn-otra-vez");
    if (btn) btn.focus();
}

/** ¡JUGAR OTRA VEZ!: vuelve al primer circuito, sin repetir la presentación ni la demo. */
async function jugarOtraVez() {
    const panel = document.getElementById("resumen");
    if (panel) panel.hidden = true;
    nubeZoe("");
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.remove("en-final");
    zoeSale();
    juegoTerminado = false;
    musicaModo("central");
    arrancarSonidos();
    if (escenario()) escenario().reiniciarVista();
    nuevaPartida();
    comenzarCircuito(false);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    const e = escenario();
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        textos: textos,
        circuito: function () { return e.circuito(); },
        preparar: function () { e.bloquear(false); },
        decirZeus: function (texto) { return hablar(texto, OTRO); },
        puntoEsfera: function () { const p = e.piloto(); return { x: p.x, y: p.y }; },
        aPantalla: function (w) { return e.aPantalla(w.x, w.y); },
        puntoCircuito: function (s) { return ReglasLaser.puntoEn(e.circuito(), s); },
        estadoLaser: function (i) { return e.estadoLaser(i); },
        encenderLaser: function (i, ms) { e.encenderLaser(i, ms); },
        tomar: function () {
            const p = e.piloto();
            sonarEvento("agarrar", { vol: 0.4 });
            e.empezarArrastre(p.x, p.y);
        },
        mover: function (w) { e.moverObjetivo(w.x, w.y); },
        llego: function () { return e.piloto().enMeta; },
        soltar: function () { e.soltar(); },
        felicitar: async function () {
            await e.conectarReactor(function (f) { if (f === "entra") efecto("conexion"); });
            efecto("exito");
            gestoGuia("celebra");
            mostrarCartel(textos().demostracionBien || "¡Así se hace!", "", 1800);
            await e.celebrarCircuito();
        },
        cerrar: async function () {
            await Promise.race([hablar(textos().demoFin, GUIA, "celebra"), sleep(5000)]);
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
    pintarNivel();
    const gif = document.getElementById("guia-img");
    if (gif) gif.src = "../../img/" + GUIA + "_normal.gif";

    if (window.EscenarioLaser) {
        window.EscenarioLaser.textoYa = textos().paso || "¡YA!";
        escenarioListo = window.EscenarioLaser.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioLaser.on({
                avance: alAvance,
                mueve: alMover,
                pared: alPared,
                laser: alLaser,
                acerca: alAcerca,
                estadoLaser: alEstadoLaser,
                cuenta: alCuenta,
                cruce: alCruce,
                panel: alPanel,
                meta: alMeta
            });
            if (arrastre()) arrastre().iniciar({ puedeTomar: puedeTomar, alTomar: alTomar, alSoltar: alSoltar, alTocarFuera: alTocarFuera });
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
        }, 80);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
