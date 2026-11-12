/**
 * Une las Partes del Cuerpo — control del juego (Polimotor, Transición 5-6 años, partes del cuerpo).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → presentación (Zeus aparece, las
 * tarjetas entran por los lados y los puntos del cuerpo se iluminan) → demo con la mano (NARIZ, si
 * "Mostrar intro") → ¡A jugar! → el niño une las 10 tarjetas con su parte del cuerpo → calificación automática
 * Cada línea soltada en un punto libre queda pegada sin decir si está bien. Al unir las diez, Zoe califica
 * una por una: verde las correctas, rojo las incorrectas. Las rojas vuelven a su tarjeta para corregirlas y
 * se califica otra vez al completar. Todas en verde → celebración → victoria compartida.
 *
 * Módulos (cada uno en su archivo):
 *   ReglasUne (validación pura) · Personaje (Zeus por partes) · IconosCuerpo (dibujos de las tarjetas)
 *   EscenarioUne (escena Phaser, tarjetas, puntos y líneas) · Conexiones (arrastre ratón/táctil)
 *   ZeusAnim (animaciones) · UneDemo (demostración) · Guia3D (Zoe 3D en la barra de abajo)
 *
 * Quién habla: Zoe (la guía de abajo) da la instrucción, las pistas, los aciertos, los errores y el final,
 * hablando de Zeus. Zeus solo agradece al final en su nube.
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
let bloqueo = false;
let conexiones = {};          // tarjetaId → puntoId (toda línea soltada en un punto libre queda pegada)
let enVerde = {};             // tarjetaId → true cuando ya se calificó bien (queda fija)
let calificando = false;
let erroresTarjeta = {};
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
    return window.EscenarioUne && window.EscenarioUne.listo() ? window.EscenarioUne : null;
}

function anim() {
    return window.ZeusAnim || null;
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

function textos() {
    return gameConfig.textos || {};
}

function tarjetaCfg(id) {
    return ReglasUne.tarjeta(gameConfig, id) || { textos: {}, audio: {} };
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

// ------------------------------------------------------------------ guía (Zoe, barra de abajo) y nube de Zeus

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

/** Nube de Zeus: sobre su cabeza, centrada (entre las dos columnas de tarjetas). */
function globoZeus(texto) {
    const caja = document.getElementById("zeus-globo");
    const span = document.getElementById("zeus-globo-texto");
    if (!caja || !span) return;
    if (!texto) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.hidden = false;
    const zona = document.getElementById("escenario-zona");
    const cab = escenario() ? escenario().puntoDe("p-cabeza") : null;
    if (zona && cab) {
        const z = zona.getBoundingClientRect();
        const w = caja.offsetWidth;
        const h = caja.offsetHeight;
        caja.style.left = Math.max(4, Math.min(z.width / 2 - w / 2, z.width - w - 4)) + "px";
        caja.style.top = Math.max(4, cab.y - z.top - h - 40) + "px";
    }
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
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
    caja.hidden = false;
    // que no se salga de la pantalla por los lados
    const r = caja.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    caja.style.setProperty("--dx", Math.round(dx) + "px");
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/** Nube de Zoe: sobre su cabeza si está grande en la escena; si no, en la barra de abajo. */
function globo(texto) {
    if (zoeEsGrande) {
        nubeZoe(texto);
        texto = "";
    } else {
        nubeZoe("");
    }
    const caja = document.getElementById("guia-globo");
    const span = document.getElementById("guia-texto");
    if (!caja || !span) return;
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto || "") : (texto || "");
    caja.classList.toggle("vacio", !texto);
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
    if (quien === "zeus") globoZeus(nube || texto);
    else globo(nube || texto);
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    if (quien === "zeus" && anim()) anim().hablando(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
        if (quien === "zeus" && anim()) anim().hablando(false);
    });
}

/** Audio grabado de la tarjeta si config.json lo trae; si no, la voz de Zoe dice el texto. */
function decirDeTarjeta(id, clave, texto, gesto) {
    const ruta = (tarjetaCfg(id).audio || {})[clave];
    if (ruta) {
        globo(texto);
        if (gesto) gestoGuia(gesto);
        if (feedbackActivo()) reproducirAudio(ruta, 1);
        return sleep(1800);
    }
    return hablar(texto, "zoe", gesto);
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
    // Fundido por opacidad (no display:none) para que Phaser no pierda el tamaño dla escena.
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    if (window.EscenarioUne && window.EscenarioUne.listo()) window.EscenarioUne.reacomodar();
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

// ------------------------------------------------------------------ Zoe grande (intro, demo y final)

/**
 * En la presentación, la demo y el final, Zoe sale grande y de cuerpo entero entre las tarjetas de la
 * izquierda y Zeus, como en la demo de los otros juegos. Mientras se juega vuelve a la barra de abajo
 * para no tapar las líneas. Se mueve la caja .guia-pj: el lienzo 3D se reencuadra solo (ResizeObserver).
 */
let zoeEsGrande = false;

function ubicarZoeGrande() {
    const pj = document.querySelector("#guia .guia-pj");
    const cv = document.querySelector("#escenario-phaser canvas");
    if (!pj || !cv || !escenario()) return;
    const r = cv.getBoundingClientRect();
    const l = escenario().diseno();
    const k = r.width / (l.W || r.width);
    const finTarjetas = r.left + (l.m + l.cw + l.rc * 2) * k;
    const bordeZeus = r.left + (l.W / 2 - (Personaje.GEOMETRIA.ancho * l.escala) / 2) * k;
    // puede montarse un poco sobre el borde de las tarjetas, nunca sobre Zeus
    let ancho = Math.max(bordeZeus - finTarjetas + l.cw * 0.4 * k, l.cw * k);
    let izq = bordeZeus - ancho;
    // Tableta vertical: casi no hay hueco, Zoe se para delante de la columna izquierda (la demo usa la NARIZ, a la derecha).
    if (l.modo === "columna") {
        ancho = Math.min(l.cw * 1.55 * k, bordeZeus - r.left - 4);
        izq = bordeZeus - ancho;
    }
    const alto = Math.min(r.height * 0.86, ancho / 0.55);
    pj.style.left = Math.round(izq) + "px";
    pj.style.top = Math.round(r.bottom - alto) + "px";
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

/** Zoe entra caminando desde la izquierda hasta su lugar junto a Zeus. */
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
    const pr = ReglasUne.progreso(gameConfig, conexiones);
    const caja = document.getElementById("progreso-box");
    if (caja) caja.hidden = !acc().mostrarProgreso;
    const rot = document.getElementById("progreso-rotulo");
    if (rot) rot.textContent = (textos().progreso || "PARTES CONECTADAS") + ":";
    const num = document.getElementById("progreso-num");
    if (num) num.textContent = pr.hechas + " / " + pr.total;
    const puntos = document.getElementById("progreso-puntos");
    if (puntos) {
        if (puntos.children.length !== pr.total) {
            puntos.innerHTML = "";
            ReglasUne.tarjetas(gameConfig).forEach(function (t) {
                const s = document.createElement("span");
                s.className = "prog-punto";
                s.dataset.id = t.id;
                s.style.setProperty("--c", t.color);
                s.title = t.nombre;
                puntos.appendChild(s);
            });
        }
        Array.prototype.forEach.call(puntos.children, function (s) {
            s.classList.toggle("lleno", !!conexiones[s.dataset.id]);
            s.classList.toggle("bien", !!enVerde[s.dataset.id]);
        });
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

/** Escena de introducción: Zeus aparece, las tarjetas entran por los lados y los puntos se iluminan. */
async function presentar() {
    if (!escenario() || !anim()) return;
    escenario().reacomodar();
    // Zoe entra caminando mientras aparece Zeus.
    await Promise.all([zoeEntra(), anim().aparecer()]);
    anim().reposo(true);
    const completa = introOmitida || !introDesdeEmpecemos;
    const voz = hablar(completa ? textos().bienvenida : textos().saludoCorto, "zoe", "saluda");
    await Promise.all([escenario().mostrarTarjetas(), anim().saludo()]);
    sonarEvento("aparece");
    await escenario().iluminarPuntos();
    await Promise.race([voz, sleep(completa ? 9000 : 4500)]);
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenario_listo;
    await presentar();

    if (acc().mostrarIntro && window.UneDemo) {
        enDemo = true;
        try {
            await window.UneDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[UnePartesCuerpo] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    // Terminada la demo (o la presentación), Zoe se va caminando.
    await zoeSale();
    if (acc().mostrarIntro && window.UneDemo) await esperarBotonComenzar();
    comenzarPartida();
}

async function comenzarPartida() {
    conexiones = {};
    enVerde = {};
    erroresTarjeta = {};
    if (escenario()) escenario().limpiarConexiones();
    jugando = true;
    bloqueo = false;
    document.body.classList.remove("demo-lock");
    pintarProgreso();
    if (conex()) conex().habilitar(true);
    programarAyuda();
    await hablar(textos().instruccion, "zoe", "senala");
    programarAyuda();
}

// ------------------------------------------------------------------ microayuda (sin resolver la actividad)

function apagarBrilloAyuda() {
    if (ayuda.brillo && escenario()) escenario().brilloPunto(ayuda.brillo, false);
    ayuda.brillo = null;
}

function limpiarAyuda() {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
}

/**
 * Sin interacción durante ayudaMs: una tarjeta pendiente se menea y Zoe pregunta por esa parte
 * ("¿Dónde está la nariz de Zeus?"). No se ilumina el punto: el niño lo busca.
 */
function programarAyuda() {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    const token = ayuda.token;
    const vigente = function () { return token === ayuda.token && jugando && !juegoTerminado && !bloqueo && !(conex() && conex().arrastrando()); };
    const pista = function () {
        if (!vigente()) return;
        if (ReglasUne.progreso(gameConfig, conexiones).completo) return;
        const id = ReglasUne.siguientePendiente(gameConfig, conexiones, ultimaPista);
        ultimaPista = id;
        if (!id) return;
        if (escenario() && acc().ayudaAutomatica) escenario().menearTarjeta(id);
        sonarEvento("aparece");
        decirDeTarjeta(id, "instruccion", tarjetaCfg(id).textos.pista, "senala").then(function () {
            if (vigente()) ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 12000);
        });
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 11000);
}

// ------------------------------------------------------------------ conexiones (callbacks de conexiones.js)

function puedeTomar(id) {
    if (!jugando || juegoTerminado || enDemo || bloqueo || calificando) return false;
    if (conexiones[id]) {
        // No se conecta una tarjeta dos veces: se menea y Zoe lo recuerda (sin repetir a cada toque).
        if (escenario()) escenario().menearTarjeta(id);
        sonarEvento("tic");
        if (Date.now() - tAviso > 4000) {
            tAviso = Date.now();
            hablar(textos().yaConectada, "zoe");
        }
        return false;
    }
    return true;
}

function alTomar(id) {
    limpiarAyuda();
    apagarBrilloAyuda();
    sonarEvento("agarrar");
}

function alSoltar(id, puntoId) {
    if (!jugando || juegoTerminado) {
        if (escenario()) escenario().retraerLinea();
        return;
    }
    const r = ReglasUne.evaluar(gameConfig, conexiones, id, puntoId);
    if (r === "correcta" || r === "error") {
        // Se pega sin decir si está bien: la calificación llega al unir las diez.
        unir(id, puntoId);
        return;
    }
    if (escenario()) escenario().retraerLinea();
    if (r === "ocupado") {
        if (escenario()) escenario().rebotePunto(puntoId);
        sonarEvento("tic");
        hablar(textos().ocupado, "zoe");
    } else {
        sonarEvento("soltar");
    }
    programarAyuda();
}

/** La línea queda pegada. No bloquea el arrastre: el niño puede tomar otra tarjeta enseguida. */
async function unir(id, puntoId) {
    limpiarAyuda();
    apagarBrilloAyuda();
    conexiones[id] = puntoId;
    sonarEvento("encaje");
    if (escenario()) await escenario().fijarLinea(id, puntoId);
    pintarProgreso();
    if (anim()) anim().contento();
    if (ReglasUne.progreso(gameConfig, conexiones).completo) {
        calificarTodo();
        return;
    }
    programarAyuda();
}

/**
 * Animación de calificar: con las diez unidas, Zoe revisa una por una (izquierda de arriba a abajo y luego
 * la derecha). Verde = bien (destello verde, ✓); rojo = mal (temblor, ✗). Las verdes quedan fijas; las rojas
 * vuelven a su tarjeta para que el niño las corrija, y al completar se califica otra vez.
 */
async function calificarTodo() {
    if (calificando || juegoTerminado) return;
    calificando = true;
    limpiarAyuda();
    apagarBrilloAyuda();
    if (conex()) conex().habilitar(false);
    document.body.classList.add("demo-lock");
    if (TextoVoz.detener) TextoVoz.detener();
    await sleep(450);
    await Promise.race([hablar(textos().revisando, "zoe", "senala"), sleep(4500)]);

    const res = ReglasUne.calificar(gameConfig, conexiones, enVerde);
    for (const r of res.orden) {
        if (juegoTerminado) return;
        if (escenario()) await escenario().calificarLinea(r.id, r.ok);
        if (r.ok) {
            enVerde[r.id] = true;
            aciertos++;
            sonarEvento("acierto");
        } else {
            errores++;
            erroresTarjeta[r.id] = (erroresTarjeta[r.id] || 0) + 1;
            sonarEvento("regreso");
        }
        pintarProgreso();
        await sleep(380);
    }

    if (res.todasBien) {
        calificando = false;
        terminarJuego();
        return;
    }

    // Hay rojas: Zeus se sorprende, Zoe explica y las rojas vuelven a su tarjeta.
    if (anim()) anim().sorpresa();
    gestoGuia("duda");
    const totalVerde = Object.keys(enVerde).length;
    const texto = res.mal === 1 ? textos().revisionMalUna : ReglasUne.plantilla(textos().revisionMal, { bien: totalVerde });
    const voz = hablar(texto, "zoe");
    await sleep(1600);
    const rojas = res.orden.filter(function (r) { return !r.ok; }).map(function (r) { return r.id; });
    await Promise.all(rojas.map(function (id, i) {
        return sleep(i * 160).then(function () {
            delete conexiones[id];
            return escenario() ? escenario().soltarLinea(id) : null;
        });
    }));
    pintarProgreso();
    // Tras varios intentos con la misma tarjeta, su punto brilla suave hasta que el niño la vuelva a tomar.
    const insistida = rojas.find(function (id) { return erroresTarjeta[id] >= (Number(cfgJuego().erroresParaBrillo) || 3); });
    if (acc().ayudaAutomatica && insistida && escenario()) {
        ayuda.brillo = tarjetaCfg(insistida).punto;
        escenario().brilloPunto(ayuda.brillo, true);
    }
    await Promise.race([voz, sleep(6000)]);
    calificando = false;
    document.body.classList.remove("demo-lock");
    if (conex()) conex().habilitar(true);
    programarAyuda();
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
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
    if (ms) tCartel = setTimeout(function () { c.hidden = true; }, ms);
}

/**
 * Celebración: todos los hilos brillan a la vez, los puntos se iluminan, Zeus festeja, estrellas y
 * confeti, melodía de victoria; Zoe y Zeus felicitan y luego la victoria compartida.
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
    globo("");
    if (escenario()) escenario().celebrar(true);
    const zona = document.getElementById("escenario-zona");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    // Zoe vuelve a entrar caminando para felicitar mientras Zeus celebra.
    const zeusCelebra = anim() ? anim().celebrar() : Promise.resolve();
    await zoeEntra();
    gestoGuia("celebra");
    // Sin cartel: Zoe dice la felicitación completa y su nube muestra solo el mensaje corto.
    const nubeFinal = (textos().finalTitulo || "¡EXCELENTE TRABAJO!") + " " + (textos().finalSub || "");
    const voz = hablar(textos().final, "zoe", null, nubeFinal);
    await zeusCelebra;
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    await Promise.race([voz, sleep(11000)]);
    globo("");
    await Promise.race([hablar(textos().finalZeus, "zeus"), sleep(5000)]);
    globoZeus("");
    if (anim()) anim().alegria(2);
    await sleep(900);
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
        tarjetaDemo: function () {
            const id = gameConfig.demo && gameConfig.demo.tarjeta;
            return ReglasUne.tarjeta(gameConfig, id) ? id : null;
        },
        preparar: function () { pintarProgreso(); },
        decir: function (texto) { return hablar(texto, "zoe", "senala"); },
        destacar: function (id) { return escenario() ? escenario().menearTarjeta(id) : sleep(400); },
        conector: function (id) { return escenario() ? escenario().puntoDe(id) : null; },
        destino: function (id) { return escenario() ? escenario().puntoDe(tarjetaCfg(id).punto) : null; },
        tomar: function (id) {
            sonarEvento("agarrar");
            if (!escenario()) return;
            const p = escenario().conectorMundo(id);
            escenario().iniciarLinea(id, p.x, p.y);
            escenario().estadoTarjeta(id, "activa");
        },
        moverLinea: function (p) {
            if (!escenario() || !p) return;
            const m = escenario().mundoDePantalla(p.x, p.y);
            escenario().moverLinea(m.x, m.y);
            escenario().candidato(escenario().candidatoEn(m.x, m.y));
        },
        fijar: async function (id) {
            sonarEvento("encaje");
            if (escenario()) await escenario().fijarLinea(id, tarjetaCfg(id).punto);
            await sleep(350);
            // la demo también muestra la calificación: la línea se pone verde
            if (escenario()) await escenario().calificarLinea(id, true);
            sonarEvento("acierto");
            if (anim()) anim().contento();
        },
        felicitar: async function () {
            gestoGuia("celebra");
            mostrarCartel(textos().demostracionBien || "¡Muy bien!", "", 1800);
            await sleep(1200);
        },
        terminar: async function () {
            // La demo no deja conexiones registradas.
            if (escenario()) escenario().limpiarConexiones();
            conexiones = {};
            pintarProgreso();
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
    enlazarPantallaCompleta();
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

    globo("");
    pintarProgreso();

    // La escena se arma desde el principio (detrás de la intro) con Zeus invisible hasta presentar().
    if (window.EscenarioUne) {
        escenario_listo = window.EscenarioUne.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (ok && !partidaIniciada) window.EscenarioUne.objetos().zeus.setAlpha(0);
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
