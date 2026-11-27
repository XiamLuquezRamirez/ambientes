/**
 * ¡El Camino del Cohete de Zeus! — control del juego (Polimotor, Prejardín 3-4 años, laberintos de coordinación).
 *
 * Flujo (mismo modelo que los demás Polimotor): pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad →
 * PRESENTACIÓN (título, Zoe 3D entra caminando, el cohete flota en la plataforma y se oye la bienvenida de Zeus) → DEMO automática sin botón (estrella fugaz por el camino y la mano lleva el cohete) →
 * Zoe se va → "¡Comenzar a jugar!" → 4 RECORRIDOS generados al azar con dificultad progresiva, cada uno con su
 * transición (el cohete entra a la estación, salto al hiperespacio, aparece la pista nueva, el cohete aterriza en
 * la plataforma y se oye la instrucción; al llegar se abren las compuertas de la estación y el cohete entra al
 * hangar) → FINAL cinematográfico (el cohete vuela a la base de Zeus, aterriza, se abren las compuertas, Zoe entra,
 * fuegos artificiales) → RESUMEN con las miniaturas de los cuatro
 * caminos y "¡JUGAR OTRA VEZ!" (cuatro recorridos nuevos).
 *
 * Zeus no se dibuja (ni en SVG ni en 3D, pedido del usuario): solo se oye su voz. Durante la partida solo está la
 * escena; Zoe y Zeus se oyen. Nada resta: salirse pone la pista en rojo con una
 * alerta y el cohete vuelve al último punto válido; un camino falso termina en una señal amable y el cohete
 * regresa solo a la bifurcación sin perder el avance.
 *
 * Módulos: ReglasCohete (generador y pilotaje, puro) · IconosCohete (dibujos) · SonidosCohete (Web Audio) ·
 * EscenarioCohete (Phaser) · ArrastreCohete (ratón y dedo) · CoheteDemo · Guia3D (Zoe 3D)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let partida = null;           // { semilla, recorridos: [4] }
let demoRec = null;
let indice = 0;               // recorrido actual (0..3)
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let ocupado = false;          // callejón, regreso o transición en curso
let completados = [];
let movido = false;           // el niño ya movió el cohete en este recorrido
let tAviso = 0;
let tAlerta = null;
let tMotor = null;
let ultimaFrase = {};
let ayuda = { voz: null, repetir: null, token: 0, nivel: 0 };

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
    return window.SonidosCohete || null;
}

function efecto(nombre) {
    const s = sfx();
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioCohete && window.EscenarioCohete.listo() ? window.EscenarioCohete : null;
}

function arrastre() {
    return window.ArrastreCohete || null;
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

function defRecorrido(i) {
    return (gameConfig.recorridos || [])[i] || {};
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

/**
 * Habla Zoe (por defecto) o Zeus. Promise que termina con la voz. La nube de Zoe solo se ve si Zoe está en
 * escena; Zeus no aparece en pantalla, solo se oye. `nube`: texto corto para la nube de Zoe.
 */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    if (quien === "zoe") nubeZoe(zoeEnEscena ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    const fin = function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
    };
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        setTimeout(fin, 1200);
        return Promise.resolve();
    }
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
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

/** Música ambiental espacial (sintetizada en sonidos.js); TextoVoz le ajusta el volumen. */
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
    { key: "ayudaAutomatica", label: "Ayuda visual (luces que guían)" },
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
    const rot = document.getElementById("nivel-rotulo");
    if (rot) rot.textContent = (textos().progreso || "RECORRIDO") + " " + Math.min(4, indice + 1) + " DE 4";
    caja.setAttribute("aria-label", completados.length + " de 4 recorridos completados");
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

/** Genera cuatro recorridos nuevos (semilla nueva) para el tamaño de pantalla actual. */
function nuevaPartida() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    partida = ReglasCohete.generarPartida(gameConfig, dims, null, { paso: cfgJuego().paso || 8 });
    completados = [];
    indice = 0;
    document.querySelectorAll("#nivel .nivel-paso").forEach(function (it) { it.style.setProperty("--avance", "0%"); });
    pintarNivel();
    return partida;
}

function generarDemo() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    const def = Object.assign({}, gameConfig.demoRecorrido || {}, { falsos: [1, 1] });
    for (let i = 0; i < 6 && !demoRec; i++) demoRec = ReglasCohete.generarRecorrido(def, dims, ReglasCohete.semillaNueva(), { paso: cfgJuego().paso || 8 });
    return demoRec;
}

/**
 * Presentación: título, Zoe entra caminando y saluda, el cohete flota en la plataforma y se oye la bienvenida de Zeus.
 */
async function presentar() {
    const e = escenario();
    if (!e) return;
    const completa = introOmitida || !introDesdeEmpecemos;
    e.mostrarCohete(true);
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    efecto("estrella");
    await Promise.all([zoeEntra(), sleep(2800)]);
    ocultarCartel();
    await Promise.race([hablar(completa ? textos().saludoZoe : textos().saludoCorto, "zoe", "saluda"), sleep(5000)]);
    nubeZoe("");
    // Zeus no se ve: el cohete flota en la plataforma y se oye su bienvenida
    gestoGuia("senala");
    e.chispas(e.piloto().x, e.piloto().y, 14, 0.7);
    efecto("despegue");
    await Promise.race([hablar(textos().bienvenidaZeus, "zeus"), sleep(12000)]);
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
    generarDemo();
    if (demoRec) await escenario().cargarRecorrido(demoRec, { animar: true });
    await presentar();

    if (acc().mostrarIntro && window.CoheteDemo && demoRec) {
        enDemo = true;
        if (sfx()) sfx().motor(true);
        arrancarMotor();
        try {
            await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.CoheteDemo.correr, apiDemo()) : window.CoheteDemo.correr(apiDemo()));
        } catch (e) {
            console.warn("[CaminoCohete] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-solid fa-play");
    nuevaPartida();
    comenzarRecorrido(true);
}

// ------------------------------------------------------------------ motor del cohete (sonido)

function arrancarMotor() {
    clearInterval(tMotor);
    tMotor = setInterval(function () {
        if (!sfx() || !escenario()) return;
        const p = escenario().piloto();
        sfx().motorVelocidad(p.visible ? p.empuje : 0);
    }, 90);
}

function pararMotor() {
    clearInterval(tMotor);
    tMotor = null;
    if (sfx()) sfx().motor(false);
}

// ------------------------------------------------------------------ recorridos

/**
 * Transición y arranque de un recorrido: la pista anterior se va, salto al hiperespacio, aparece la pista nueva
 * con sus luces en ola, cartel con el nombre, el cohete aterriza en la plataforma y se oye la instrucción.
 */
async function comenzarRecorrido(desdeDemo) {
    const e = escenario();
    if (!e || !partida) return;
    const rec = partida.recorridos[indice];
    const def = defRecorrido(indice);
    jugando = false;
    ocupado = true;
    movido = false;
    limpiarAyuda();
    document.body.classList.add("demo-lock");
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    e.mostrarCohete(false);
    nubeZoe("");
    await e.ocultarRecorrido();
    efecto("regreso");
    await e.hiperespacio(desdeDemo ? 1000 : 1200);
    await e.cargarRecorrido(rec, { animar: true });
    pintarNivel();
    mostrarCartel(def.titulo || ("RECORRIDO " + (indice + 1)), def.nombre || "", 2600);
    efecto("despegue");
    if (sfx()) sfx().motor(true);
    arrancarMotor();
    await e.aterrizarInicio();
    await sleep(500);
    jugando = true;
    ocupado = false;
    pintarNivel();
    e.bloquear(false);
    document.body.classList.remove("demo-lock");
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
    hablar(def.instruccion, def.voz === "zeus" ? "zeus" : "zoe");
}

async function completarRecorrido() {
    const e = escenario();
    if (!e || !jugando) return;
    jugando = false;
    ocupado = true;
    limpiarAyuda();
    alertaFuera(false);
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    document.body.classList.add("demo-lock");
    completados.push(indice);
    avanceNivel(1);
    pintarNivel(indice);
    efecto("exito");
    sonarEvento("acierto", { vol: 0.5 });
    const def = defRecorrido(indice);
    const estrella = document.querySelectorAll("#nivel .nivel-paso")[indice];
    if (window.PedniaFx && estrella) window.PedniaFx.celebracion(estrella.getBoundingClientRect());
    if (indice >= 3) {
        terminarJuego();
        return;
    }
    await e.celebrarRecorrido();
    const voz = hablar(def.logro, indice % 2 === 0 ? "zoe" : "zeus");
    // se abren las compuertas y el cohete entra al hangar; el cartel sale después para no tapar la estación
    await e.entrarEstacion(function (fase) { efecto(fase === "abre" ? "compuerta" : (fase === "cierra" ? "compuertaCierra" : "despegue")); });
    mostrarCartel(def.logro || "¡Muy bien!", "");
    await Promise.all([Promise.race([voz, sleep(3500)]), sleep(1800)]);
    ocultarCartel();
    indice++;
    comenzarRecorrido(false);
}

// ------------------------------------------------------------------ eventos de la escena

let zonaActual = "pista";

function alertaFuera(on) {
    document.body.classList.toggle("fuera-pista", !!on);
    clearInterval(tAlerta);
    tAlerta = null;
    if (on) {
        efecto("alerta");
        tAlerta = setInterval(function () { efecto("alerta"); }, 1100);
    }
}

function alZona(z) {
    zonaActual = z;
    if (!(jugando || enDemo)) {
        alertaFuera(false);
        return;
    }
    alertaFuera(z !== "pista");
    if (z !== "pista" && jugando && Date.now() - tAviso > 7000) {
        tAviso = Date.now();
        hablar(frase("fuera"), "zoe");
    }
}

function alLuz(n) {
    efecto("luz", n % 10);
    if (escenario()) escenario().pulsoFondo(0.05);
}

function alAvance(frac) {
    if (jugando) avanceNivel(frac);
}

async function alCallejon(rama) {
    const e = escenario();
    if (!e || !jugando || ocupado) return;
    ocupado = true;
    limpiarAyuda();
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    alertaFuera(false);
    efecto("callejon");
    e.senalCallejon(rama, true);
    await e.sacudir();
    const voz = hablar(textos().callejon, "zeus");
    await sleep(900);
    efecto("regreso");
    await e.regresarCallejon(rama);
    e.senalCallejon(rama, false);
    await Promise.race([voz, sleep(2500)]);
    if (!jugando) return;
    ocupado = false;
    e.bloquear(false);
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
}

async function regresarAPista(conVoz) {
    const e = escenario();
    if (!e || ocupado || !jugando) return;
    ocupado = true;
    if (arrastre()) arrastre().habilitar(false);
    efecto("regreso");
    if (conVoz && Date.now() - tAviso > 5000) {
        tAviso = Date.now();
        hablar(textos().regreso, "zoe");
    }
    await e.regresar();
    alertaFuera(false);
    if (!jugando) return;
    ocupado = false;
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
}

function alDesvio() {
    if (!jugando) return;
    if (arrastre()) arrastre().cancelar();
    regresarAPista(true);
}

function alMeta() {
    if (enDemo) return;
    if (!jugando) return;
    if (arrastre()) arrastre().cancelar();
    completarRecorrido();
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
    sonarEvento("agarrar", { vol: 0.5 });
}

function alSoltar(zona) {
    if (!jugando || ocupado) return;
    if (zona && zona !== "pista") regresarAPista(false);
    programarAyuda();
}

function alTocarFuera() {
    if (!jugando || ocupado || !escenario()) return;
    // tocó lejos del cohete: el cohete brilla para mostrar dónde poner el dedo
    const p = escenario().piloto();
    escenario().chispas(p.x, p.y, 10, 0.6);
    efecto("estrella");
}

// ------------------------------------------------------------------ ayuda gradual (sin resolver la actividad)

function limpiarAyuda() {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
}

let tSuave = 0;

/** El movimiento reprograma la ayuda sin reiniciar el contador en cada cuadro. */
function programarAyudaSuave() {
    if (Date.now() - tSuave < 600) return;
    tSuave = Date.now();
    ayuda.nivel = 0;
    programarAyuda();
}

/**
 * Sin movimiento durante ayudaMs: 1) si no ha tocado el cohete, Zoe explica cómo arrastrarlo y el cohete brilla;
 * si ya juega, Zoe dice "¡Busca el camino que tiene más luces!" y parpadean las próximas luces del camino.
 * 2) si sigue sin moverse, una estrella fugaz avanza un tramo corto por el camino correcto.
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
        if (!movido) {
            e.chispas(p.x, p.y, 12, 0.6);
            if (acc().ayudaAutomatica) e.pistaLuces(3);
            hablar(textos().pistaArrastra, "zoe");
        } else if (ayuda.nivel === 0) {
            if (acc().ayudaAutomatica) e.pistaLuces(6);
            efecto("estrella");
            hablar(textos().pista, "zoe");
        } else if (acc().ayudaAutomatica) {
            const rec = e.recorrido();
            const s = p.avance * rec.paso;
            e.estrellaFugaz(s, s + Math.max(rec.rejilla.cx, rec.rejilla.cy) * 2.2, 2600);
            hablar(textos().pista, "zoe");
        }
        ayuda.nivel = Math.min(2, ayuda.nivel + 1);
        ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 12000);
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 9000);
}

// ------------------------------------------------------------------ final cinematográfico y resumen

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    limpiarAyuda();
    alertaFuera(false);
    if (arrastre()) arrastre().habilitar(false);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-final");
    const e = escenario();
    mostrarCartel(defRecorrido(3).logro || "¡Lo lograste!", "", 2600);
    hablar(defRecorrido(3).logro, "zeus");
    efecto("despegue");
    await e.finalCinematica();
    pararMotor();
    efecto("fanfarria");
    const fiesta = function () {
        e.fuegos(4);
        efecto("fuegos");
        if (window.PedniaFx) window.PedniaFx.celebracion({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight * 0.7 });
    };
    fiesta();
    mostrarCartel(textos().finalTitulo || "¡MISIÓN ESPACIAL COMPLETADA!", textos().finalSub || "");
    await zoeEntra();
    gestoGuia("celebra");
    const tFiesta = setInterval(fiesta, 2600);
    // cada voz dura lo que dura (con tope), y la fiesta al menos unos segundos aunque las voces estén apagadas
    await Promise.all([Promise.race([hablar(textos().finalZoe, "zoe", null, textos().finalNube || "¡SÚPER PILOTO!"), sleep(11000)]), sleep(3500)]);
    nubeZoe("");
    if (guia3d()) guia3d().gesto("final");
    await Promise.all([Promise.race([hablar(textos().finalZeus, "zeus"), sleep(9000)]), sleep(3000)]);
    clearInterval(tFiesta);
    ocultarCartel();
    mostrarResumen();
}

/** Panel del final: los cuatro recorridos de esta partida (miniatura real de cada camino) y sus estrellas. */
function mostrarResumen() {
    const panel = document.getElementById("resumen");
    const lista = document.getElementById("resumen-lista");
    if (!panel || !lista || !partida) return;
    lista.innerHTML = "";
    partida.recorridos.forEach(function (rec, i) {
        const def = defRecorrido(i);
        const li = document.createElement("li");
        li.className = "resumen-item";
        li.style.setProperty("--i", i);
        const img = document.createElement("img");
        img.alt = "Camino del recorrido " + (i + 1);
        img.src = escenario() ? escenario().miniatura(rec, 220, 130) : "";
        const txt = document.createElement("div");
        txt.className = "resumen-texto";
        txt.innerHTML = '<strong></strong><span></span>';
        txt.querySelector("strong").textContent = (i + 1) + ". " + (def.nombre || "");
        txt.querySelector("span").innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (textos().completado || "completado");
        const st = document.createElement("i");
        st.className = "fa-solid fa-star resumen-estrella";
        st.setAttribute("aria-hidden", "true");
        li.appendChild(img);
        li.appendChild(txt);
        li.appendChild(st);
        lista.appendChild(li);
    });
    panel.hidden = false;
    sonarEvento("victoria");
    if (sonido()) sonido().agacharMusica(0.35);
    const btn = document.getElementById("btn-otra-vez");
    if (btn) btn.focus();
}

/** ¡JUGAR OTRA VEZ!: cuatro recorridos completamente nuevos, sin repetir la presentación ni la demo. */
async function jugarOtraVez() {
    const panel = document.getElementById("resumen");
    if (panel) panel.hidden = true;
    nubeZoe("");
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.remove("en-final");
    zoeSale();
    juegoTerminado = false;
    if (escenario()) escenario().reiniciarVista();
    nuevaPartida();
    comenzarRecorrido(false);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    const e = escenario();
    let llego = false;
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        textos: textos,
        preparar: function () {
            e.mostrarCohete(true);
            e.bloquear(false);
        },
        decir: function (texto) { return hablar(texto, "zoe", "senala"); },
        estrella: function (ms) { return e.estrellaFugaz(0, null, ms); },
        puntoCohete: function () { return e.puntoCohete(); },
        aPantalla: function (w) { return e.aPantalla(w.x, w.y); },
        puntoCamino: function (u) {
            const r = e.recorrido();
            return ReglasCohete.puntoEn(r, u * r.largo);
        },
        tomar: function () {
            const p = e.piloto();
            sonarEvento("agarrar", { vol: 0.5 });
            e.empezarArrastre(p.x, p.y);
        },
        mover: function (w) {
            e.moverObjetivo(w.x, w.y);
            if (e.piloto().enMeta) llego = true;
        },
        llego: function () { return llego; },
        soltar: function () { e.soltar(); },
        felicitar: async function () {
            efecto("exito");
            await e.celebrarRecorrido();
            await e.entrarEstacion(function (fase) { efecto(fase === "abre" ? "compuerta" : (fase === "cierra" ? "compuertaCierra" : "despegue")); });
            gestoGuia("celebra");
            mostrarCartel(textos().demostracionBien || "¡Así se hace!", "", 1600);
            await sleep(1500);
        },
        cerrar: async function () {
            await Promise.race([hablar(textos().demoFin, "zoe", "celebra"), sleep(9000)]);
        },
        terminar: async function () {
            alertaFuera(false);
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
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); pararMotor(); });

    nubeZoe("");
    pintarNivel();

    if (window.EscenarioCohete) {
        escenarioListo = window.EscenarioCohete.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioCohete.on({
                zona: alZona,
                luz: alLuz,
                avance: alAvance,
                callejon: alCallejon,
                meta: alMeta,
                desvio: alDesvio,
                mueve: alMover
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
