/**
 * La Ardilla y la Bellota Gigante — control del juego (Polimotor, Prejardín 3-4 años, Eje 2 Coordinación y
 * orientación, laberintos de coordinación).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → PRESENTACIÓN (título, Zoe 3D entra, el bosque,
 * la ardilla llega con la bellota, los dos caminos y la cesta; Zoe: "¡Hola! …") → DEMO automática sin botón (voz
 * de Zeus; la mano lleva la bellota, rodea el tronco y llega a la cesta) → Zoe se va → "¡Comenzar a jugar!" →
 * 4 NIVELES generados al azar con dificultad progresiva (remolino de hojas, aparece el bosque nuevo, la ardilla
 * trae la bellota, instrucción; al llegar la bellota cae en la cesta, la ardilla salta y caen hojas) → FINAL (el
 * hogar de la ardilla: la cesta con las cuatro bellotas, la ardilla entra a su casa, Zoe y Zeus felicitan) →
 * RESUMEN con los cuatro recorridos y "¡JUGAR OTRA VEZ!".
 *
 * Zeus no se dibuja: solo se oye su voz. Nada resta: salirse pone el camino rojo poco a poco, suena una alerta
 * amable y una flecha señala el camino; los obstáculos tiemblan y se rodean; los dos caminos llegan a la cesta.
 *
 * Módulos: ReglasArdilla (generador y arrastre, puro) · IconosArdilla (dibujos) · SonidosArdilla (Web Audio) ·
 * EscenarioArdilla (Phaser) · ArrastreBellota (ratón y dedo) · ArdillaDemo · Guia3D (Zoe 3D)
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
let indice = 0;               // nivel actual (0..3)
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let ocupado = false;          // regreso o transición en curso
let completados = [];
let movido = false;
let tAviso = 0;
let tAlerta = null;
let tArrastre = null;
let tObstaculo = 0;
let tHojas = 0;
let ultimoCuarto = 0;
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
    return window.SonidosArdilla || null;
}

function efecto(nombre) {
    const s = sfx();
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioArdilla && window.EscenarioArdilla.listo() ? window.EscenarioArdilla : null;
}

function arrastre() {
    return window.ArrastreBellota || null;
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

/** Música del bosque (sintetizada en sonidos.js); TextoVoz le ajusta el volumen. */
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
    { key: "ayudaAutomatica", label: "Ayuda visual (hojitas que guían)" },
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
    if (rot) rot.textContent = (textos().progreso || "NIVEL") + " " + Math.min(4, indice + 1) + " DE 4";
    caja.setAttribute("aria-label", "Nivel " + Math.min(4, indice + 1) + " de 4; " + completados.length + " completados");
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

/** Cuatro recorridos nuevos (semilla nueva) para el tamaño de pantalla actual. */
function nuevaPartida() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    partida = ReglasArdilla.generarPartida(gameConfig, dims, null, { paso: cfgJuego().paso || 8, cfg: cfgJuego() });
    completados = [];
    indice = 0;
    document.querySelectorAll("#nivel .nivel-paso").forEach(function (it) { it.style.setProperty("--avance", "0%"); });
    pintarNivel();
    return partida;
}

function generarDemo() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    demoRec = ReglasArdilla.generarSeguro(gameConfig.demoRecorrido || {}, dims, ReglasArdilla.semillaNueva(), { paso: cfgJuego().paso || 8, cfg: cfgJuego() });
    return demoRec;
}

/** Presentación: título, Zoe entra, se ven el bosque, los dos caminos y la cesta; la ardilla llega con la bellota. */
async function presentar() {
    const e = escenario();
    if (!e) return;
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    efecto("brillo");
    await Promise.all([zoeEntra(), sleep(2600)]);
    ocultarCartel();
    efecto("hojas");
    await e.llegarInicio();
    gestoGuia("saluda");
    await Promise.race([hablar(textos().introZoe, "zoe", "senala", textos().introZoe), sleep(9000)]);
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
    generarDemo();
    if (demoRec) await escenario().cargarRecorrido(demoRec, { animar: true });
    arrancarSonidoArrastre();
    await presentar();

    if (acc().mostrarIntro && window.ArdillaDemo && demoRec) {
        enDemo = true;
        try {
            await window.ArdillaDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[Ardilla] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-solid fa-play");
    musicaModo("bosque");
    nuevaPartida();
    comenzarRecorrido(true);
}

// ------------------------------------------------------------------ sonido del arrastre (hojas secas)

function arrancarSonidoArrastre() {
    if (sfx()) sfx().arrastre(true);
    clearInterval(tArrastre);
    tArrastre = setInterval(function () {
        if (!sfx() || !escenario()) return;
        const p = escenario().piloto();
        sfx().arrastreVelocidad(p.visible && (p.arrastrando || p.auto) ? p.empuje : 0);
    }, 90);
}

function pararSonidoArrastre() {
    clearInterval(tArrastre);
    tArrastre = null;
    if (sfx()) sfx().arrastre(false);
}

// ------------------------------------------------------------------ niveles

/**
 * Transición y arranque de un nivel: el bosque anterior se va, pasa un remolino de hojas, aparece el bosque nuevo
 * con sus dos caminos, cartel con el nombre, la ardilla trae la bellota y se oye la instrucción.
 */
async function comenzarRecorrido(desdeDemo) {
    const e = escenario();
    if (!e || !partida) return;
    const rec = partida.recorridos[indice];
    const def = defRecorrido(indice);
    jugando = false;
    ocupado = true;
    movido = false;
    ultimoCuarto = 0;
    limpiarAyuda();
    document.body.classList.add("demo-lock");
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    nubeZoe("");
    await e.ocultarRecorrido();
    efecto("hojas");
    await e.transicion(desdeDemo ? 1000 : 1200);
    await e.cargarRecorrido(rec, { animar: true });
    pintarNivel();
    mostrarCartel(def.titulo || ("NIVEL " + (indice + 1)), def.nombre || "", 2600);
    await e.llegarInicio();
    await sleep(300);
    jugando = true;
    ocupado = false;
    pintarNivel();
    e.bloquear(false);
    document.body.classList.remove("demo-lock");
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
    const voz = hablar(def.instruccion, def.voz === "zeus" ? "zeus" : "zoe");
    if (def.vozExtra) {
        voz.then(function () {
            if (jugando && !movido) hablar(def.vozExtra, def.vozExtraPj === "zoe" ? "zoe" : "zeus");
        });
    }
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
    const def = defRecorrido(indice);
    // la bellota cae en la cesta; la ardilla salta y caen hojas de colores
    await e.entrarCesta(function (f) {
        if (f === "cae") efecto("cesta");
        else efecto("exito");
    });
    sonarEvento("acierto", { vol: 0.5 });
    const paso = document.querySelectorAll("#nivel .nivel-paso")[indice];
    if (window.PedniaFx && paso) window.PedniaFx.celebracion(paso.getBoundingClientRect());
    const voz = hablar(textos().cierreRecorrido, indice % 2 === 0 ? "zoe" : "zeus");
    mostrarCartel(textos().cierreRecorrido || "¡Muy bien!", def.logro || "");
    await e.celebrarRecorrido();
    await Promise.all([Promise.race([voz, sleep(4000)]), sleep(1600)]);
    ocultarCartel();
    if (indice >= 3) {
        terminarJuego();
        return;
    }
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
        tAlerta = setInterval(function () { efecto("alerta"); }, 1600);
    }
}

function alZona(z) {
    const antes = zonaActual;
    zonaActual = z;
    if (!(jugando || enDemo)) {
        alertaFuera(false);
        return;
    }
    const fuera = z !== "pista";
    const estabaFuera = antes !== "pista";
    if (fuera !== estabaFuera) alertaFuera(fuera);
    if (!fuera && estabaFuera) {
        efecto("positivo");
        if (escenario()) {
            const p = escenario().piloto();
            escenario().onda(p.x, p.y, 0x8ce99a);
        }
    }
    if (fuera && jugando && Date.now() - tAviso > 7000) {
        tAviso = Date.now();
        hablar(frase("fuera"), "zoe");
    }
}

function alHoja(n) {
    efecto("hoja", n % 10);
}

function alHojasSuelo() {
    if (Date.now() - tHojas < 600) return;
    tHojas = Date.now();
    efecto("hojas");
}

/** Avanza bien: cada cuarto del camino la ardilla da un saltito de alegría. */
function alAvance(frac) {
    if (!jugando) return;
    avanceNivel(frac);
    const cuarto = Math.floor(frac * 4);
    if (cuarto > ultimoCuarto && cuarto < 4) {
        ultimoCuarto = cuarto;
        efecto("saltito");
        if (escenario()) escenario().ardillaFeliz();
    }
}

/** Se acerca a un obstáculo: tiembla (en la escena) y suena un toque de madera amable; nunca un error. */
function alObstaculo() {
    if (!(jugando || enDemo)) return;
    efecto("obstaculo");
    if (jugando && Date.now() - tObstaculo > 12000) {
        tObstaculo = Date.now();
        hablar(textos().obstaculo, "zoe");
    }
}

/** Lleva un rato empujando contra un obstáculo: una flecha (en la escena) muestra por dónde rodearlo. */
function alAtascado() {
    if (!jugando) return;
    efecto("brillo");
    if (Date.now() - tObstaculo > 5000) {
        tObstaculo = Date.now();
        hablar(textos().obstaculo, "zoe");
    }
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

function alTocarFuera(w) {
    if (!jugando || ocupado || !escenario()) return;
    // tocó lejos de la bellota: una onda donde tocó y la bellota brilla para mostrar dónde poner el dedo
    const e = escenario();
    const p = e.piloto();
    if (w) e.onda(w.x, w.y, 0xfff3bf);
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
 * Sin movimiento durante ayudaMs: 1) si no tocó la bellota, Zoe explica cómo arrastrarla y la bellota brilla; si ya
 * juega, parpadean las próximas hojitas de los dos caminos. 2) si sigue sin moverse, un destello dorado recorre un
 * tramo del camino.
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
            e.onda(p.x, p.y, 0xffe066);
            if (acc().ayudaAutomatica) e.pistaLuces(3);
            hablar(textos().pistaArrastra, "zoe");
        } else if (ayuda.nivel === 0) {
            if (acc().ayudaAutomatica) e.pistaLuces(4);
            efecto("brillo");
            hablar(textos().pista, "zoe");
        } else if (acc().ayudaAutomatica) {
            e.guiaDorada(2600);
            hablar(textos().pista, "zoe");
        }
        ayuda.nivel = Math.min(2, ayuda.nivel + 1);
        ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 12000);
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 9000);
}

// ------------------------------------------------------------------ final y resumen

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
    musicaModo("final");
    pararSonidoArrastre();
    await e.finalCinematica();
    efecto("fanfarria");
    const fiesta = function () {
        e.fuegos(4);
        efecto("fiesta");
        if (window.PedniaFx) window.PedniaFx.celebracion({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight * 0.7 });
    };
    fiesta();
    mostrarCartel(textos().finalTitulo || "¡AVENTURA COMPLETADA!", textos().finalSub || "");
    await zoeEntra();
    gestoGuia("celebra");
    const tFiesta = setInterval(fiesta, 2800);
    await Promise.all([Promise.race([hablar(textos().finalZoe, "zoe", null, textos().finalNube || "¡LO LOGRASTE!"), sleep(15000)]), sleep(4000)]);
    nubeZoe("");
    await Promise.race([hablar(textos().finalZeus, "zeus"), sleep(4500)]);
    if (guia3d()) guia3d().gesto("final");
    await sleep(1200);
    clearInterval(tFiesta);
    ocultarCartel();
    mostrarResumen();
}

const MEDALLAS = ["#ff922b", "#fab005", "#e03131", "#74b83e"];

/** Panel del final: una medalla por nivel con la miniatura real de cada recorrido de esta partida. */
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
        li.style.setProperty("--medalla", MEDALLAS[i % MEDALLAS.length]);
        const img = document.createElement("img");
        img.alt = "Camino del nivel " + (i + 1);
        img.src = escenario() && rec ? escenario().miniatura(rec, 220, 130) : "";
        const txt = document.createElement("div");
        txt.className = "resumen-texto";
        txt.innerHTML = '<strong></strong><span><i class="fa-solid fa-circle-check"></i> <em></em></span>';
        txt.querySelector("strong").textContent = (i + 1) + ". " + (def.nombre || "");
        txt.querySelector("em").textContent = textos().completado || "¡completado!";
        const med = document.createElement("span");
        med.className = "resumen-medalla";
        med.setAttribute("aria-hidden", "true");
        med.innerHTML = '<i class="fa-solid fa-medal"></i><b>' + (i + 1) + "</b>";
        li.appendChild(med);
        li.appendChild(img);
        li.appendChild(txt);
        lista.appendChild(li);
    });
    panel.hidden = false;
    sonarEvento("victoria");
    if (sonido()) sonido().agacharMusica(0.35);
    const btn = document.getElementById("btn-otra-vez");
    if (btn) btn.focus();
}

/** ¡JUGAR OTRA VEZ!: cuatro recorridos nuevos, sin repetir la presentación ni la demo. */
async function jugarOtraVez() {
    const panel = document.getElementById("resumen");
    if (panel) panel.hidden = true;
    nubeZoe("");
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.remove("en-final");
    zoeSale();
    juegoTerminado = false;
    musicaModo("bosque");
    arrancarSonidoArrastre();
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
            e.mostrarBellota(true);
            e.bloquear(false);
        },
        decir: function (texto) { return hablar(texto, "zoe", "senala"); },
        decirZeus: function (texto) { return hablar(texto, "zeus"); },
        ancho: function () { return e.recorrido().ancho; },
        puntoBellotaMundo: function () { const p = e.piloto(); return { x: p.x, y: p.y }; },
        aPantalla: function (w) { return e.aPantalla(w.x, w.y); },
        rutaObstaculos: function () { const r = e.recorrido(); return r.rutas[r.conObstaculos]; },
        obstaculo: function () { return e.recorrido().obstaculos[0] || null; },
        puntoRuta: function (ruta, s) { return ReglasArdilla.puntoEn(ruta, s); },
        desvio: function (s) { const r = e.recorrido(); return ReglasArdilla.desvioRodear(r, r.conObstaculos, s, cfgJuego()); },
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
            alertaFuera(false);
            await e.entrarCesta(function (f) { efecto(f === "cae" ? "cesta" : "exito"); });
            gestoGuia("celebra");
            mostrarCartel(textos().demostracionBien || "¡Así se hace!", "", 1800);
            await e.celebrarRecorrido();
        },
        cerrar: async function () {
            await Promise.race([hablar(textos().demoFin, "zoe", "celebra"), sleep(5000)]);
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
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); pararSonidoArrastre(); });

    nubeZoe("");
    pintarNivel();

    if (window.EscenarioArdilla) {
        escenarioListo = window.EscenarioArdilla.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioArdilla.on({
                zona: alZona,
                hoja: alHoja,
                hojasSuelo: alHojasSuelo,
                avance: alAvance,
                meta: alMeta,
                desvio: alDesvio,
                mueve: alMover,
                obstaculo: alObstaculo,
                atascado: alAtascado,
                bellotaFinal: function (n) { efecto("hoja", 3 + n * 2); },
                puerta: function () { efecto("saltito"); }
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
