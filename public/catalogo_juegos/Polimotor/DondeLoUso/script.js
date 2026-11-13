/**
 * ¿Dónde lo uso? — control del juego (Polimotor, Transición 5-6 años, reconocimiento de partes del cuerpo).
 *
 * Flujo (mismo modelo que "Une las Partes del Cuerpo"): pantalla de inicio → intro 3D (Zeus y Zoe) →
 * PedniaEdad → presentación en el vestidor (título, Zoe 3D entra caminando y saluda, entran las tarjetas,
 * los conectores brillan y una línea de muestra une dos tarjetas) → demo automática con la mano, sin botón
 * (calcetines → pies y nariz de payaso → nariz, si "Mostrar intro") → Zoe se va caminando → "¡Comenzar a
 * jugar!" → RONDA 1 (cinco objetos) → "¡RONDA 1 LISTA!" → las tarjetas salen y entran las de la RONDA 2 (otros
 * cinco objetos) → celebración del tablero → "¡LO LOGRASTE!" → victoria compartida (volver a jugar / salir).
 * Las rondas están en config.rondas; las reglas y la escena trabajan siempre con la ronda actual (cfgR()).
 *
 * Durante la partida en pantalla solo está el tablero (como la imagen de referencia): sin personajes; Zoe y
 * Zeus solo se oyen. Cada conexión se valida al soltar (por identificador, reglas.js): la correcta queda fija
 * como hilo de luz y el dibujo del objeto viaja hasta su parte del cuerpo; la incorrecta tiembla y se deshace.
 *
 * Módulos: ReglasUso (validación pura) · IconosUso (dibujos) · EscenarioUso (Phaser: tablero, tarjetas y
 * líneas) · Conexiones (arrastre ratón/táctil) · UsoDemo (demostración) · Guia3D (Zoe 3D de la presentación)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let rondaActual = 0;
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let bloqueo = false;
let conexiones = {};          // objetoId → parteId (solo parejas correctas)
let erroresObjeto = {};
let aciertos = 0;
let errores = 0;
let ultimaFrase = {};
let ultimaPista = null;
let tAviso = 0;
let ayuda = { voz: null, repetir: null, token: 0, brillo: null };

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
    return window.EscenarioUso && window.EscenarioUso.listo() ? window.EscenarioUso : null;
}

function conex() {
    return window.Conexiones || null;
}

function acc() {
    return gameConfig.accesibilidad || {};
}

function cfgJuego() {
    return gameConfig.juego || {};
}

/** Configuración de la ronda actual (objetos, partes y parejas). */
function cfgR() {
    return ReglasUso.ronda(gameConfig, rondaActual);
}

function totalRondas() {
    return ReglasUso.rondas(gameConfig).length;
}

function textos() {
    return gameConfig.textos || {};
}

function tarjetaCfg(id) {
    return ReglasUso.tarjeta(cfgR(), id) || { textos: {} };
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

// ------------------------------------------------------------------ Zoe (presentación y demo) y voces

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

/** Nube sobre la cabeza de Zoe (está de pie a la izquierda del tablero). */
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

/**
 * Habla Zoe (por defecto) o Zeus. Devuelve una Promise que termina con la voz.
 * Solo hay nube cuando Zoe está en la escena (presentación y demo); Zeus no sale: solo se oye su voz.
 * `nube` (opcional): texto corto para la nube cuando la voz dice algo largo.
 */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    if (quien === "zoe") nubeZoe(zoeEnEscena ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
    });
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
    if (window.EscenarioUso && window.EscenarioUso.listo()) window.EscenarioUso.reacomodar();
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
    { key: "ayudaAutomatica", label: "Ayuda visual (brillo y chispas)" },
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
    if (!a.ayudaAutomatica) apagarBrilloAyuda();
}

// ------------------------------------------------------------------ Zoe a la izquierda del tablero

/**
 * Zoe (3D) se queda de pie en el hueco que el diseño deja a la izquierda del tablero (zonaZoe), desde que
 * entra caminando en la presentación hasta el final. Se mueve la caja .guia-pj: el lienzo 3D se reencuadra
 * solo (ResizeObserver de guia-3d.js).
 */
let zoeEnEscena = false;

function ubicarZoe() {
    const pj = document.querySelector("#guia .guia-pj");
    const z = escenario() ? escenario().zonaZoe() : null;
    if (!pj || !z) return;
    const ancho = Math.max(z.width * 1.05, 150);
    const alto = Math.min(z.height * 0.8, ancho / 0.5);
    pj.style.left = Math.round(z.left - z.width * 0.02) + "px";
    pj.style.top = Math.round(z.bottom - alto) + "px";
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

/** Zoe entra caminando desde la izquierda hasta su lugar junto al tablero. */
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
    pj.classList.remove("zoe-fuera");
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha");
}

/** Terminada la demo, Zoe se va caminando por la izquierda: durante la partida solo queda el tablero. */
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

// ------------------------------------------------------------------ pantalla completa

function enlazarPantallaCompleta() {
    const btn = document.getElementById("btn-pantalla");
    if (!btn) return;
    const doc = document.documentElement;
    const puede = !!(doc.requestFullscreen || doc.webkitRequestFullscreen);
    if (!puede) {
        btn.hidden = true;
        return;
    }
    const pintar = function () {
        const dentro = !!(document.fullscreenElement || document.webkitFullscreenElement);
        btn.querySelector("i").className = dentro ? "fa-solid fa-compress" : "fa-solid fa-expand";
        btn.title = dentro ? "Salir de pantalla completa" : "Pantalla completa";
    };
    btn.addEventListener("click", function () {
        const dentro = !!(document.fullscreenElement || document.webkitFullscreenElement);
        try {
            if (dentro) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            else (doc.requestFullscreen || doc.webkitRequestFullscreen).call(doc);
        } catch (e) { /* noop */ }
    });
    document.addEventListener("fullscreenchange", pintar);
    document.addEventListener("webkitfullscreenchange", pintar);
    pintar();
}

// ------------------------------------------------------------------ progreso (barra de abajo)

function pintarProgreso() {
    const pr = ReglasUso.progreso(cfgR(), conexiones);
    const caja = document.getElementById("progreso-box");
    if (caja) caja.hidden = !acc().mostrarProgreso;
    const rot = document.getElementById("progreso-rotulo");
    if (rot) rot.textContent = (textos().progreso || "PAREJAS ENCONTRADAS") + ":";
    const num = document.getElementById("progreso-num");
    if (num) num.textContent = pr.hechas + "/" + pr.total;
    const ron = document.getElementById("progreso-ronda");
    if (ron) ron.textContent = (textos().ronda || "RONDA") + " " + (rondaActual + 1) + "/" + totalRondas();
    const barra = document.getElementById("progreso-relleno");
    if (barra) barra.style.width = (pr.total ? (pr.hechas / pr.total) * 100 : 0) + "%";
    const pista = document.getElementById("progreso-barra");
    if (pista) {
        pista.setAttribute("aria-valuenow", String(pr.hechas));
        pista.setAttribute("aria-valuemax", String(pr.total));
    }
}

function animarProgreso() {
    const c = document.getElementById("progreso-box");
    if (!c) return;
    c.classList.remove("sube");
    void c.offsetWidth;
    c.classList.add("sube");
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

/** Botón grande al centro ("¡Continuar!" o "¡Comenzar a jugar!"). */
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

/**
 * Escena de introducción en el vestidor: título "¡DÓNDE LO USO!", Zoe entra caminando y saluda, las tarjetas
 * entran, se oye a Zeus explicar el reto, los conectores brillan y una línea une gafas y ojos un momento.
 */
async function presentar() {
    if (!escenario()) return;
    escenario().reacomodar();
    const completa = introOmitida || !introDesdeEmpecemos;
    // El título va solo sobre el tablero vacío; se va antes de que entren las tarjetas.
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    await Promise.all([zoeEntra(), sleep(2600)]);
    ocultarCartel();
    const voz = hablar(completa ? textos().bienvenida : textos().saludoCorto, "zoe", "saluda");
    await sleep(300);
    await escenario().mostrarTarjetas();
    sonarEvento("aparece");
    await Promise.race([voz, sleep(completa ? 11000 : 5000)]);
    nubeZoe("");
    gestoGuia("senala");
    const vozZeus = hablar(textos().presentacionZeus, "zeus");
    await escenario().iluminarConectores();
    await escenario().lineaMuestra("gafas", "ojos");
    await Promise.race([vozZeus, sleep(8000)]);
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenario_listo;
    await presentar();

    // La demo arranca sola después de la presentación (sin botón).
    if (acc().mostrarIntro && window.UsoDemo) {
        enDemo = true;
        try {
            await window.UsoDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[DondeLoUso] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    // Zoe solo acompaña la presentación y la demo.
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-solid fa-play");
    aciertos = 0;
    errores = 0;
    comenzarRonda();
}

/** Empieza la ronda actual: desordena las partes, habilita el arrastre y da la instrucción de la ronda. */
async function comenzarRonda() {
    conexiones = {};
    erroresObjeto = {};
    ultimaPista = null;
    nubeZoe("");
    if (escenario()) {
        escenario().limpiarConexiones();
        escenario().filasIniciales();
    }
    pintarProgreso();
    // Las partes del cuerpo se desordenan otra vez: ninguna queda en la fila de su objeto.
    if (cfgJuego().mezclarPartes !== false && escenario()) {
        const actual = escenario().filasPartes();
        const orden = ReglasUso.ordenPartes(cfgR(), actual);
        sonarEvento("aparece");
        await escenario().reordenarPartes(orden);
    }
    jugando = true;
    bloqueo = false;
    document.body.classList.remove("demo-lock");
    if (conex()) conex().habilitar(true);
    programarAyuda();
    // Instrucción de la ronda (voces): Zoe pregunta por un objeto y, en la primera, Zeus explica la línea.
    const r = cfgR();
    if (escenario() && r.destacar) escenario().menearTarjeta(r.destacar);
    await hablar(r.instruccion, "zoe", "senala");
    if (!jugando || juegoTerminado) return;
    if (rondaActual === 0 && !Object.keys(conexiones).length) await Promise.race([hablar(textos().instruccionZeus, "zeus"), sleep(7000)]);
    programarAyuda();
}

/**
 * Fin de una ronda que no es la última: el tablero celebra, "¡RONDA 1 LISTA!", las tarjetas salen volando y
 * entran las de la ronda siguiente con "¡RONDA 2!".
 */
async function siguienteRonda() {
    limpiarAyuda();
    apagarBrilloAyuda();
    document.body.classList.add("demo-lock");
    sonarEvento("correcto");
    if (escenario()) escenario().celebrar(true);
    const zona = document.getElementById("escenario-zona");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    mostrarCartel(textos().rondaListaTitulo || "¡RONDA LISTA!", "");
    await Promise.race([hablar(textos().rondaLista, "zoe"), sleep(7000)]);
    ocultarCartel();
    if (escenario()) await escenario().ocultarTarjetas();
    rondaActual++;
    if (escenario()) escenario().cargarRonda(cfgR());
    conexiones = {};
    pintarProgreso();
    animarProgreso();
    mostrarCartel(textos().rondaSiguienteTitulo || "¡NUEVA RONDA!", textos().rondaSiguienteSub || "", 2200);
    await sleep(1600);
    if (escenario()) {
        await escenario().mostrarTarjetas();
        sonarEvento("aparece");
        await escenario().iluminarConectores();
    }
    comenzarRonda();
}

// ------------------------------------------------------------------ ayuda (sin resolver la actividad)

function apagarBrilloAyuda() {
    if (ayuda.brillo && escenario()) escenario().brilloConector(ayuda.brillo, false);
    ayuda.brillo = null;
}

function limpiarAyuda() {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
}

/**
 * Sin interacción durante ayudaMs: un objeto pendiente se menea y Zoe pregunta dónde se usa
 * ("¿En qué parte del cuerpo se pone el gorro?"). No se ilumina la respuesta: el niño la busca.
 */
function programarAyuda() {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    const token = ayuda.token;
    const vigente = function () { return token === ayuda.token && jugando && !juegoTerminado && !bloqueo && !(conex() && conex().arrastrando()); };
    const pista = function () {
        if (!vigente()) return;
        if (ReglasUso.progreso(cfgR(), conexiones).completo) return;
        const id = ReglasUso.siguientePendiente(cfgR(), conexiones, ultimaPista);
        ultimaPista = id;
        if (!id) return;
        if (escenario() && acc().ayudaAutomatica) escenario().menearTarjeta(id);
        sonarEvento("aparece");
        hablar(tarjetaCfg(id).textos.pista, "zoe", "senala").then(function () {
            if (vigente()) ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 13000);
        });
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 11000);
}

// ------------------------------------------------------------------ conexiones (callbacks de conexiones.js)

function avisar(texto) {
    if (Date.now() - tAviso < 3500) return;
    tAviso = Date.now();
    hablar(texto, "zoe");
}

function puedeTomar(id) {
    if (!jugando || juegoTerminado || enDemo || bloqueo) return false;
    if (ReglasUso.conectada(conexiones, id)) {
        // Una pareja encontrada no se modifica: la tarjeta se menea y Zoe lo recuerda.
        if (escenario()) escenario().menearTarjeta(id);
        sonarEvento("tic");
        avisar(textos().yaConectada);
        return false;
    }
    return true;
}

function alTomar(id) {
    // el brillo de ayuda se queda hasta que el niño encuentre esa pareja (lo apaga acertar)
    limpiarAyuda();
    sonarEvento("agarrar");
}

function alSoltar(origen, destino) {
    if (!jugando || juegoTerminado) {
        if (escenario()) escenario().retraerLinea();
        return;
    }
    const r = ReglasUso.evaluar(cfgR(), conexiones, origen, destino);
    if (r === "correcta") {
        acertar(origen, destino);
        return;
    }
    if (r === "error") {
        fallar(origen, destino);
        return;
    }
    if (escenario()) escenario().retraerLinea();
    if (r === "ocupado") {
        if (escenario()) escenario().menearTarjeta(destino);
        sonarEvento("tic");
        avisar(textos().ocupado);
    } else if (r === "mismoLado") {
        sonarEvento("soltar");
        avisar(textos().mismoLado);
    } else {
        sonarEvento("soltar");
    }
    programarAyuda();
}

/** Pareja correcta: hilo de luz fijo, nota musical que sube con cada pareja, el dibujo viaja a su lugar. */
async function acertar(origen, destino) {
    limpiarAyuda();
    const par = ReglasUso.normalizar(cfgR(), origen, destino);
    conexiones[par.objeto] = par.parte;
    aciertos++;
    if (ayuda.brillo === par.parte) apagarBrilloAyuda();
    const n = Object.keys(conexiones).length;
    sonarEvento("correcto", { tasa: 1 + (n - 1) * 0.12 });
    sonarEvento("acierto", { vol: 0.5, retraso: 0.1 });
    if (escenario()) await escenario().fijarLinea(origen, destino);
    pintarProgreso();
    animarProgreso();
    const completo = ReglasUso.progreso(cfgR(), conexiones).completo;
    if (completo) {
        jugando = false;
        bloqueo = true;
        if (conex()) conex().habilitar(false);
    }
    const extra = tarjetaCfg(par.objeto).textos.acierto || "";
    const voz = hablar((textos().acierto || "¡Muy bien!") + " " + extra, "zoe");
    if (completo) {
        await Promise.race([voz, sleep(5000)]);
        if (rondaActual + 1 < totalRondas()) siguienteRonda();
        else terminarJuego();
        return;
    }
    programarAyuda();
}

/** Pareja incorrecta: la línea tiembla y se deshace, sonido suave y la voz de Zeus anima a intentarlo otra vez. */
async function fallar(origen, destino) {
    limpiarAyuda();
    errores++;
    const objeto = ReglasUso.columna(cfgR(), origen) === "obj" ? origen : destino;
    erroresObjeto[objeto] = (erroresObjeto[objeto] || 0) + 1;
    sonarEvento("regreso", { vol: 0.7 });
    hablar(frase("errorZeus"), "zeus");
    if (escenario()) await escenario().romperLinea(origen, destino);
    // Tras varios intentos con el mismo objeto, el conector de su parte brilla en dorado (sin decir cuál es).
    const limite = Number(cfgJuego().erroresParaBrillo) || 2;
    if (acc().ayudaAutomatica && erroresObjeto[objeto] >= limite && escenario() && !ayuda.brillo) {
        ayuda.brillo = ReglasUso.parejaDe(cfgR(), objeto);
        escenario().brilloConector(ayuda.brillo, true);
    }
    programarAyuda();
}

/**
 * Celebración: todas las líneas brillan a la vez con colores, el tablero se ilumina y sus tarjetas laten,
 * estrellas y confeti, las voces de Zoe y Zeus felicitan, cartel "¡LO LOGRASTE!" y la victoria compartida.
 */
async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    bloqueo = true;
    limpiarAyuda();
    apagarBrilloAyuda();
    if (conex()) conex().habilitar(false);
    if (typeof Swal !== "undefined") Swal.close();
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.add("demo-lock", "en-final");

    sonarEvento("correcto");
    if (escenario()) escenario().celebrar(true);
    const zona = document.getElementById("escenario-zona");
    const confeti = function () {
        if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    };
    confeti();
    mostrarCartel(textos().finalTitulo || "¡LO LOGRASTE!", textos().finalSub || "");
    // Zoe vuelve a entrar caminando y se queda a la vista celebrando hasta la victoria.
    await zoeEntra();
    gestoGuia("celebra");
    await Promise.race([hablar(textos().finalZoe, "zoe", null, textos().finalNube || "¡SÚPER FANTÁSTICO!"), sleep(11000)]);
    confeti();
    nubeZoe("");
    if (guia3d()) guia3d().gesto("final");
    await Promise.race([hablar(textos().finalZeus, "zeus"), sleep(5000)]);
    gestoGuia("celebra");
    confeti();
    await sleep(1800);
    mostrarVictoria();
}

/** Victoria compartida (../../final): texto, trofeo y las opciones de siempre (jugar otra vez / salir). */
function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
    if (feedbackActivo()) hablar(cierre);
    setTimeout(function () {
        ocultarCartel();
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
        pasos: function () { return (gameConfig.demo && gameConfig.demo.pasos) || []; },
        parejaDe: function (id) { return ReglasUso.parejaDe(cfgR(), id); },
        preparar: function () { pintarProgreso(); },
        decir: function (texto) { return hablar(texto, "zoe", "senala"); },
        destacar: function (id) { return escenario() ? escenario().menearTarjeta(id) : sleep(400); },
        conector: function (id) { return escenario() ? escenario().puntoDe(id) : null; },
        tomar: function (id) {
            sonarEvento("agarrar");
            if (!escenario()) return;
            const k = escenario().conectorMundo(id);
            escenario().iniciarLinea(id, k.x, k.y);
            escenario().estadoTarjeta(id, "activa");
        },
        moverLinea: function (p) {
            if (!escenario() || !p) return;
            const m = escenario().mundoDePantalla(p.x, p.y);
            escenario().moverLinea(m.x, m.y);
            const activa = escenario().lineaActiva();
            escenario().candidato(activa ? escenario().destinoEn(m.x, m.y, activa) : null);
        },
        fijar: async function (id, parte) {
            const n = Object.keys(escenario() ? escenario().conexiones() : {}).length + 1;
            sonarEvento("correcto", { tasa: 1 + (n - 1) * 0.12 });
            if (escenario()) await escenario().fijarLinea(id, parte);
            await sleep(900);
        },
        felicitar: async function (ultimo) {
            gestoGuia("celebra");
            if (!ultimo) {
                mostrarCartel(textos().demostracionBien || "¡Muy bien!", "", 1500);
                await sleep(1300);
            }
        },
        cerrar: async function () {
            mostrarCartel(textos().demostracionBien || "¡Excelente!", textos().demoFin || "");
            if (escenario()) escenario().celebrar(true);
            await Promise.race([hablar(textos().demoFin, "zoe", "celebra"), sleep(6000)]);
            ocultarCartel();
        },
        terminar: async function () {
            // La demo no deja conexiones registradas.
            if (escenario()) escenario().limpiarConexiones();
            conexiones = {};
            pintarProgreso();
            nubeZoe("");
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenario_listo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261112e"));
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
    enlazarPantallaCompleta();
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

    nubeZoe("");
    pintarProgreso();

    // La escena se arma desde el principio (detrás de la intro); las tarjetas aparecen en presentar().
    if (window.EscenarioUso) {
        escenario_listo = window.EscenarioUso.montar(document.getElementById("escenario-phaser"), cfgR()).then(function (ok) {
            if (ok && conex()) conex().iniciar({ puedeTomar: puedeTomar, alTomar: alTomar, alSoltar: alSoltar });
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
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (zoeEnEscena && pj && !pj.dataset.caminando) ubicarZoe();
        }, 60);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
