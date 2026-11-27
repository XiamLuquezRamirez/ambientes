/**
 * El Mini Golf Mágico de Pendiente y Obstáculos — flujo del juego (Polimotor, 5-6 años, juegos de precisión:
 * cálculo de impulso y trayectoria).
 *
 * inicio → intro 3D → PedniaEdad → presentación (campo de demostración, Zoe y Zeus; la mano toma la pelota, arrastra
 * hacia atrás, la fuerza sube, aparece la línea de luz, espera el molino y suelta; la pelota pasa el túnel, rebota en
 * la pared curva y entra; se repite mientras se espera; no cuenta) → «EMPEZAR» con transición → 4 niveles (cada uno
 * termina al meter la pelota en el hoyo, con golpes ilimitados) → celebración de cada nivel → gran final con trofeo
 * («¡HOYO EN UNO ESPECTACULAR!») → victoria compartida.
 *
 * Aquí no se decide nada de la física (ReglasGolf) ni se dibuja (EscenarioGolf): solo se enlazan pantallas, voces,
 * sonidos, ayudas, golpes, estrellas, pausa y niveles. Fallar no resta nada: la pelota queda donde se detuvo y se
 * vuelve a golpear desde ahí.
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var pausado = false;
var nivelIdx = 0;
var hechos = 0;
var partida = [];
var nivelDemo = null;
var vozActiva = null;
var vozLibreDesde = 0;
var tPista = null;
var tVozFallo = 0;
var turno = {};
var dichos = {};
var volumenListo = false;
var escenaLista = null;
var audioFondo = null;
var audioIniciado = false;
var finalHecho = false;
var esperasPausa = [];
var golpesNivel = 0;
var fallosNivel = 0;
var ayudaDada = false;
var demoActiva = false;
var stats = { golpes: 0, obstaculos: 0, estrellas: 0, niveles: 0, porNivel: [] };

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function esc() { return window.EscenarioGolf && window.EscenarioGolf.listo() ? window.EscenarioGolf : null; }
function sfx(nombre) {
    var s = window.SonidosGolf;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function rondas() { return gameConfig.rondas || []; }
function ronda() { return rondas()[nivelIdx] || {}; }
function total() { return Math.max(1, rondas().length); }
function vivo(tk) { return tk === token; }

function frase(lista, clave) {
    if (!Array.isArray(lista)) return lista || "";
    var i = turno[clave] || 0;
    turno[clave] = i + 1;
    return lista.length ? lista[i % lista.length] : "";
}

/** Resuelve cuando el juego no está en pausa. */
function sinPausa() {
    if (!pausado) return Promise.resolve();
    return new Promise(function (r) { esperasPausa.push(r); });
}

// ------------------------------------------------------------------ niveles de la partida

/**
 * Los cuatro niveles. Cada nivel tiene al menos tres mundos (forma de la pista, pendientes, obstáculos y colores):
 * se sortea uno, distinto del que salió la partida anterior en ese nivel. Dentro del mundo, la salida, el hoyo, las
 * pendientes y el molino también son al azar. Cada nivel se valida antes de jugar (salida y hoyo dentro del campo y
 * lejos de las paredes, hoyo después del molino, molino con paso libre, pendientes suaves) y los tres primeros,
 * además, con una búsqueda rápida de un golpe que entre; si algo falla, se vuelve a sortear el hoyo y la salida.
 */
var CLAVE_MUNDOS = "pednia_golf_mundos";

function leerMundosPrevios() {
    try { return JSON.parse(localStorage.getItem(CLAVE_MUNDOS) || "[]") || []; } catch (e) { return []; }
}

function guardarMundos(lista) {
    try { localStorage.setItem(CLAVE_MUNDOS, JSON.stringify(lista)); } catch (e) { /* sin almacenamiento */ }
}

function generarPartida() {
    var R = window.ReglasGolf;
    if (!R) return [];
    var previos = leerMundosPrevios();
    var partidaNueva = rondas().map(function (r, i) {
        var mundo = R.elegirMundo(r, Math.random, { evitar: previos[i] }).idx;
        var nivel = null, avisos = [];
        for (var intento = 0; intento < 14; intento++) {
            nivel = R.prepararNivel(r, juego(), Math.random, { mundo: mundo });
            avisos = R.validarNivel(nivel, juego(), i < 2 ? { golpes: 1, angulos: 36, tensiones: 10 } : {});
            if (!avisos.length) break;
        }
        if (avisos.length) console.warn("[MiniGolf] nivel " + (i + 1) + " con avisos", avisos);
        return nivel;
    });
    guardarMundos(partidaNueva.map(function (n) { return n ? n.mundo : -1; }));
    return partidaNueva;
}

// ------------------------------------------------------------------ música de fondo

function volumenMusica() {
    var n = Number(acc().volumenFondo);
    return Math.max(0, Math.min(100, isFinite(n) ? n : 25)) / 100;
}

function musicaFondo(on) {
    if (!on) {
        if (audioFondo) audioFondo.pause();
        return;
    }
    var ruta = gameConfig.audios && gameConfig.audios.fondo;
    if (!ruta) return;
    if (!audioFondo) {
        try {
            audioFondo = new Audio(ruta);
            audioFondo.loop = true;
            audioFondo.volume = volumenMusica();
        } catch (e) {
            audioFondo = null;
            return;
        }
    }
    var p = audioFondo.play();
    if (p && p.catch) p.catch(function () { /* sin gesto todavía o sin archivo */ });
}

// ------------------------------------------------------------------ demostración

/** La mano del tutorial toma la pelota, la arrastra hacia atrás, espera el molino y suelta (no cuenta). */
function demoConMano(e, tk) {
    var T = window.PedniaTutorial;
    var mano = null;
    var mover = function (x, y, fase) {
        if (!vivo(tk) || !T || !demoActiva) return;
        if (!mano || !mano.isConnected) {
            mano = T.crearMano();
            mano.style.transition = "none";
        }
        T.faseMano(mano, fase === "presiona" || fase === "arrastra" ? "presionar" : "viajar");
        if (fase === "aparece") mano.style.transition = "none";
        else if (fase === "arrastra") mano.style.transition = "transform 60ms linear";
        else mano.style.transition = "transform 350ms ease-out";
        T.puntaManoEn(mano, x, y);
        if (fase === "suelta") setTimeout(function () { if (T.quitarManos) T.quitarManos(); }, 450);
    };
    var quitar = function () {
        if (T && T.quitarManos) T.quitarManos();
        mano = null;
    };
    return e.demo(mover).then(quitar, quitar);
}

/** Repite la demostración mientras se espera «EMPEZAR». */
async function bucleDemo(e, tk) {
    demoActiva = true;
    while (vivo(tk) && demoActiva) {
        await demoConMano(e, tk);
        if (!vivo(tk) || !demoActiva) break;
        await sleep(1400);
    }
}

// ------------------------------------------------------------------ voces

function guiaDe(pj) {
    var g = pj === "zeus" ? window.Guia3DZeus : window.Guia3D;
    return g && g.listo && g.listo() ? g : null;
}

function plano(texto) { return (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto; }

function nube(idCaja, idTexto, texto, visible) {
    var caja = document.getElementById(idCaja);
    var span = document.getElementById(idTexto);
    if (!caja || !span) return;
    if (!texto || !visible) { caja.hidden = true; return; }
    span.textContent = plano(texto);
    caja.hidden = false;
}

function hablar(texto, pj, gesto) {
    var quien = pj === "zeus" ? "zeus" : "zoe";
    var cartelVisible = !document.getElementById("cartel").hidden || !document.getElementById("mensaje-final").hidden;
    var zoeEn = document.body.classList.contains("zoe-en");
    var zeusEn = document.body.classList.contains("zeus-en");
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3800);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    var quitarNube = function () {
        var id = quien === "zoe" ? "zoe-nube" : "zeus-nube";
        var span = document.getElementById(id + "-texto");
        if (span && span.textContent === plano(texto)) {
            setTimeout(function () {
                if (span.textContent === plano(texto) && document.body.classList.contains("jugando")) nube(id, id + "-texto", "", false);
            }, 900);
        }
    };
    if (!texto || gameConfig.mostrarFeedBack === false) { setTimeout(quitarNube, 2500); return Promise.resolve(); }
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) { setTimeout(quitarNube, 2500); return Promise.resolve(); }
    if (window.SonidosGolf) window.SonidosGolf.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosGolf) window.SonidosGolf.agachar(false);
        quitarNube();
    };
    var p = Promise.resolve(TextoVoz.hablar(texto, quien)).then(fin, fin);
    vozActiva = p;
    p.then(function () { if (vozActiva === p) vozActiva = null; });
    return p;
}

/** Espera la voz que suena (y la pausa) y luego habla, con tope por si el servidor de voz no responde. */
function decir(texto, pj, gesto, tope) {
    var tk = token;
    var espera = vozActiva ? Promise.race([vozActiva, sleep(900)]) : Promise.resolve();
    return espera.then(sinPausa).then(function () {
        if (!vivo(tk)) return;
        vozActiva = null;
        return Promise.race([hablar(texto, pj, gesto), sleep(tope || 3200)]);
    });
}

/** Comentario breve en la partida: se omite si ya suena otra voz (no se interrumpe el juego con audios). */
function decirRapido(texto, pj, gesto) {
    var ahora = Date.now();
    if (pausado || vozActiva || ahora < vozLibreDesde || !texto) return false;
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2600);
    hablar(texto, pj, gesto || "celebra");
    return true;
}

/** Igual que decirRapido, pero como mucho `max` veces por nivel para esa clave. */
function decirPocas(clave, max, texto, pj, gesto) {
    if ((dichos[clave] || 0) >= max) return false;
    if (decirRapido(texto, pj, gesto)) {
        dichos[clave] = (dichos[clave] || 0) + 1;
        return true;
    }
    return false;
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosGolf) window.SonidosGolf.agachar(false);
}

/** Panel de comunicación (durante la partida Zoe y Zeus hablan desde aquí, arriba al centro). */
function mostrarPista(texto, pj, ms) {
    var caja = document.getElementById("pista");
    var p = document.getElementById("pista-texto");
    var im = document.getElementById("pista-cara");
    var nombre = document.getElementById("pista-nombre");
    if (!caja || !p) return;
    p.textContent = plano(texto);
    if (im) im.src = pj === "zeus" ? "../../img/zeus_normal.gif" : "../../img/zoe_normal.gif";
    if (nombre) nombre.textContent = pj === "zeus" ? "Zeus" : "Zoe";
    caja.classList.toggle("es-zeus", pj === "zeus");
    caja.hidden = false;
    caja.classList.remove("sale");
    void caja.offsetWidth;
    caja.classList.add("sale");
    clearTimeout(tPista);
    tPista = setTimeout(function () { caja.hidden = true; }, ms || 2600);
}

/** Zoe entra por la izquierda y Zeus por la derecha, caminando. MARCHA_MS = transición de style.css. */
var MARCHA_MS = 1500;
var marcha = { zoe: null, zeus: null };

function caminarGuia(pj, entra) {
    clearTimeout(marcha[pj]);
    var g = guiaDe(pj);
    var haciaDerecha = (pj === "zoe") === entra;
    if (g) {
        g.mirar(haciaDerecha ? "derecha" : "izquierda");
        g.caminar(true);
    }
    return new Promise(function (resolve) {
        marcha[pj] = setTimeout(function () {
            marcha[pj] = null;
            var gg = guiaDe(pj);
            if (gg) {
                gg.caminar(false);
                gg.mirar("frente");
            }
            resolve();
        }, MARCHA_MS);
    });
}

function moverGuia(pj, on) {
    var clase = pj === "zoe" ? "zoe-en" : "zeus-en";
    var estaba = document.body.classList.contains(clase);
    document.body.classList.toggle(clase, !!on);
    if (!on) nube(pj + "-nube", pj + "-nube-texto", "", false);
    if (estaba === !!on) return Promise.resolve();
    return caminarGuia(pj, !!on);
}

function zoe(on) { return moverGuia("zoe", on); }
function zeus(on) { return moverGuia("zeus", on); }

function gestoAmbos(g) {
    var a = guiaDe("zoe"), b = guiaDe("zeus");
    if (a) a.gesto(g);
    if (b) b.gesto(g);
}

// ------------------------------------------------------------------ intro 3D

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
    var conversacion = textos().conversacion || [];
    var personajesCfg = window.INTRO_CONFIG.personajes || [];
    var cols = window.INTRO_CONFIG.dialogo.colores || {};
    window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
        var indice = Number(linea.personaje);
        var def = personajesCfg[isFinite(indice) ? indice : 0] || {};
        var id = def.id || (indice === 1 ? "zoe" : "zeus");
        return {
            personaje: id,
            nombre: id === "zoe" ? "Zoe" : "Zeus",
            color: cols[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
            texto: plano(linea.texto)
        };
    });
}

function mostrarIntro3d() {
    var root = document.getElementById("intro3d-root");
    if (!root) { setTimeout(empezarJuegoTrasIntro, 400); return; }
    root.hidden = false;
    document.body.classList.add("intro3d-activa");
    window.dispatchEvent(new CustomEvent("intro3d-start"));
}

function destruirIntro3d() {
    document.body.classList.remove("intro3d-activa");
    var root = document.getElementById("intro3d-root");
    if (!root) return;
    root.hidden = true;
    if (window.__introPhaser) {
        try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
        window.__introPhaser = null;
    }
    if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
}

/** «Omitir»: la intro corta el diálogo, Zoe y Zeus salen y la intro avisa `victory-continue`. */
function omitirIntro3d() {
    if (introCerrada) return;
    var root = document.getElementById("intro3d-root");
    if (!root || root.hidden) { empezarJuegoTrasIntro(); return; }
    window.dispatchEvent(new CustomEvent("intro3d-omitir"));
}

var introCerrada = false;
function empezarJuegoTrasIntro() {
    if (introCerrada) return;
    introCerrada = true;
    if (typeof TextoVoz !== "undefined" && TextoVoz.detener) TextoVoz.detener();
    destruirIntro3d();
    if (esc()) esc().reacomodar();
    iniciarPartida();
}

function empecemosJuego() {
    var pantalla = document.getElementById("pantalla-inicio");
    if (!pantalla || pantalla.hidden) return;
    if (typeof TextoVoz !== "undefined" && TextoVoz.desbloquear) TextoVoz.desbloquear();
    if (window.SonidosGolf) window.SonidosGolf.desbloquear();
    audioIniciado = true;
    musicaFondo(true);
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosGolf,
            fondoPorDefecto: acc().volumenFondo || 25,
            efectosPorDefecto: 85
        });
    }
    sincronizarDialogoIntro3d();
    if (typeof TextoVoz !== "undefined" && TextoVoz.precargar) TextoVoz.precargar();
    pantalla.classList.add("is-out");
    mostrarIntro3d();
    var oculto = false;
    var ocultar = function () {
        if (oculto) return;
        oculto = true;
        pantalla.hidden = true;
        document.body.classList.remove("esperando-inicio");
    };
    pantalla.addEventListener("animationend", function (ev) {
        if (ev.animationName === "inicioDisuelve") ocultar();
    });
    setTimeout(ocultar, 1250);
}

function iniciarPartida() {
    if (window.PedniaEdad) {
        PedniaEdad.iniciarNivel({
            niveles: gameConfig.niveles || [],
            elegirManual: elegirNivel,
            onElegido: function () { iniciarJuego(); }
        });
        return;
    }
    iniciarJuego();
}

function elegirNivel() {
    var botones = "";
    (gameConfig.niveles || []).forEach(function (n) {
        botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + n.id + '\')">' +
            "<strong>" + n.edad + "</strong><br><small>" + n.titulo + "</small></button></div>";
    });
    var titulo = textos().eligeNivel || "Elige tu edad";
    if (typeof TextoVoz !== "undefined") TextoVoz.hablar(titulo, "zoe");
    if (window.Swal) {
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
    } else {
        iniciarJuego();
    }
}

function confirmarNivel() {
    if (window.Swal) Swal.close();
    iniciarJuego();
}
window.confirmarNivel = confirmarNivel;

// ------------------------------------------------------------------ accesibilidad y menús

function aplicarAccesibilidad() {
    document.body.classList.toggle("alto-contraste", !!acc().altoContraste);
    document.body.classList.toggle("sin-progreso", acc().mostrarProgreso === false);
    var espc = Number(acc().letterSpacing);
    document.documentElement.style.setProperty("--letter-spacing", (isFinite(espc) ? espc : 1) + "px");
}

function setPanel(id, abierto) {
    var panel = document.getElementById(id + "-panel");
    var btn = document.getElementById("btn-" + id);
    if (!panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
}

function pintarMenuAcc() {
    var ops = document.getElementById("menu-acc-ops");
    if (!ops) return;
    ops.innerHTML = "";
    var opciones = [
        { key: "mostrarFeedBack", label: "Voces y mensajes" },
        { key: "altoContraste", label: "Alto contraste" },
        { key: "mostrarIntro", label: "Mostrar demostración" },
        { key: "ayudaAutomatica", label: "Ayuda visual" },
        { key: "mostrarProgreso", label: "Mostrar progreso" }
    ];
    opciones.forEach(function (op) {
        var lab = document.createElement("label");
        lab.className = "panel-op";
        lab.innerHTML = "<input type=\"checkbox\"> <span>" + op.label + "</span>";
        var input = lab.querySelector("input");
        input.checked = op.key === "mostrarFeedBack" ? gameConfig.mostrarFeedBack !== false : !!acc()[op.key];
        input.addEventListener("change", function () {
            if (op.key === "mostrarFeedBack") gameConfig.mostrarFeedBack = input.checked;
            else gameConfig.accesibilidad[op.key] = input.checked;
            if (!input.checked && op.key === "mostrarFeedBack") callar();
            if (op.key === "ayudaAutomatica" && esc()) esc().ayudaAutomatica(input.checked);
            aplicarAccesibilidad();
        });
        ops.appendChild(lab);
    });
}

function enlazarMenus() {
    var on = function (id, fn) {
        var b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    on("btn-menu-acc", function () { setPanel("menu-acc", document.getElementById("menu-acc-panel").hidden); setPanel("menu-vol", false); });
    on("btn-cerrar-menu-acc", function () { setPanel("menu-acc", false); });
    on("btn-menu-vol", function () { setPanel("menu-vol", document.getElementById("menu-vol-panel").hidden); setPanel("menu-acc", false); });
    on("btn-cerrar-menu-vol", function () { setPanel("menu-vol", false); });
    pintarMenuAcc();
}

// ------------------------------------------------------------------ pausa

/**
 * Todo se detiene: la pelota, el molino, el asteroide, las voces y los tiempos de ayuda (si se estaba apuntando, la
 * pelota vuelve a reposo sin golpe). Se activa sola al ocultar la pestaña o la aplicación.
 */
function pausar(on) {
    on = !!on;
    if (on === pausado) return;
    if (on && (document.body.classList.contains("en-final") || document.body.classList.contains("presentando"))) return;
    pausado = on;
    sfx("pausa", on);
    document.body.classList.toggle("en-pausa", on);
    if (esc()) esc().pausar(on);
    if (on) {
        callar();
        musicaFondo(false);
    } else {
        if (audioIniciado) musicaFondo(true);
        var l = esperasPausa;
        esperasPausa = [];
        l.forEach(function (r) { r(); });
    }
}

// ------------------------------------------------------------------ HUD: nivel, golpes y fuerza

function pintarNivel() {
    var ind = document.getElementById("nivel-ind");
    if (!ind) return;
    var txt = document.getElementById("nivel-num");
    if (txt) txt.textContent = String(nivelIdx + 1);
    ind.querySelectorAll(".nivel-estrella").forEach(function (s, i) {
        s.classList.toggle("hecha", i < hechos);
        s.classList.toggle("actual", i === nivelIdx && i >= hechos);
    });
    var nom = document.getElementById("titulo-nivel");
    if (nom) nom.textContent = ronda().nombre || "";
    var mun = document.getElementById("mundo-nivel");
    var nv = partida[nivelIdx];
    if (mun) mun.textContent = nv && nv.nombreMundo ? "Mundo: " + nv.nombreMundo : "";
    var obj = document.getElementById("objetivo");
    if (obj) obj.classList.toggle("logrado", hechos > nivelIdx);
}

function pintarGolpes(sube) {
    var el = document.getElementById("golpes-num");
    var caja = document.getElementById("golpes");
    if (el) el.textContent = String(golpesNivel);
    if (sube && caja) {
        caja.classList.remove("sube");
        void caja.offsetWidth;
        caja.classList.add("sube");
    }
}

/** Indicador de fuerza: barra de energía con tres zonas (suave, media, potente) y sin números. */
function pintarFuerza(info) {
    var caja = document.getElementById("fuerza");
    if (!caja) return;
    var T = info ? Math.max(0, Math.min(1, info.T || 0)) : 0;
    var activo = !!(info && info.activo);
    caja.classList.toggle("activa", activo);
    var rel = document.getElementById("fuerza-relleno");
    if (rel) rel.style.width = (T * 100).toFixed(1) + "%";
    var z = info && info.zona ? info.zona : "suave";
    caja.setAttribute("data-zona", activo && T > 0.02 ? z : "");
    caja.classList.toggle("tope", activo && T >= 0.995);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar al nivel i (0..3). opciones.boton: presentación con la demostración y el botón «EMPEZAR» (solo nivel 1).
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    if (escenaLista) await escenaLista;
    var e = esc();
    if (!e || !vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(total() - 1, i | 0));
    jugando = false;
    golpesNivel = 0;
    fallosNivel = 0;
    ayudaDada = false;
    dichos = {};
    document.body.classList.remove("en-final", "jugando", "nivel-1", "nivel-2", "nivel-3", "nivel-4");
    document.body.classList.add("nivel-" + (nivelIdx + 1));
    ocultarFinal();
    ocultarCartel();
    e.entrada(false);
    pintarNivel();
    pintarGolpes();
    pintarFuerza(null);
    aplicarAccesibilidad();
    e.ayudaAutomatica(acc().ayudaAutomatica !== false);
    var presentacion = nivelIdx === 0 && o.boton !== false;

    var omitirD = null;
    if (presentacion) {
        document.body.classList.add("presentando", "demo-lock");
        try {
            e.cargar(nivelDemo, gameConfig.demo, { presentacion: true });
            await e.presentar();
            if (!vivo(tk)) return;
            await Promise.all([zoe(true), zeus(true)]);
            if (!vivo(tk)) return;
            if (acc().mostrarIntro !== false) {
                bucleDemo(e, tk);
                // «Omitir demo» (comun/omitir-demo.js): corta el bucle de la demo y lo que falta de la explicación
                if (window.PedniaOmitirDemo) {
                    omitirD = window.PedniaOmitirDemo.mostrar(function () {
                        demoActiva = false;
                        e.detenerDemo();
                    });
                }
            }
            await decir(textos().introZoe, "zoe", "saluda", 16000);
            if (!vivo(tk)) return;
            if (!(omitirD && omitirD.omitida())) await decir(textos().introZeus, "zeus", "senala", 6000);
            if (!vivo(tk)) return;
        } catch (err) {
            console.warn("[MiniGolf] presentación", err);
        }
        var sigue = await esperarBoton(tk, textos().botonComenzar || "EMPEZAR");
        if (omitirD) omitirD.ocultar();
        if (!vivo(tk) || !sigue) return;
        demoActiva = false;
        e.detenerDemo();
        if (window.PedniaTutorial && PedniaTutorial.quitarManos) PedniaTutorial.quitarManos();
        callar();
        document.body.classList.remove("presentando");
        zoe(false);
        zeus(false);
        await e.transicion();
        if (!vivo(tk)) return;
        document.body.classList.remove("demo-lock");
    } else {
        zoe(false);
        zeus(false);
    }

    e.cargar(partida[nivelIdx], ronda());
    pintarFuerza(null);
    await e.presentar();
    if (!vivo(tk)) return;
    var cartel = Object.assign({}, ronda().cartel || { titulo: ronda().nombre });
    var nvAct = partida[nivelIdx];
    if (nvAct && nvAct.nombreMundo) cartel.sub = "Mundo: " + nvAct.nombreMundo + (cartel.sub ? "  ·  " + cartel.sub : "");
    mostrarCartel(cartel);
    sfx("activar");
    await sleep(1700);
    if (!vivo(tk)) return;
    ocultarCartel();
    await sinPausa();
    if (!vivo(tk)) return;
    document.body.classList.add("jugando");
    e.iniciarRonda();
    e.entrada(true);
    jugando = true;
    decir(ronda().instruccion, ronda().voz === "zeus" ? "zeus" : "zoe", "senala", 7000);
}

/** El botón único (#comenzar-wrap): «EMPEZAR». */
function esperarBoton(tk, texto) {
    return new Promise(function (resolve) {
        var wrap = document.getElementById("comenzar-wrap");
        var btn = document.getElementById("btn-comenzar");
        if (!wrap || !btn) { resolve(true); return; }
        var span = btn.querySelector(".btn-comenzar-texto");
        if (span) span.textContent = texto;
        wrap.hidden = false;
        var listo = false;
        var cerrar = function (ok) {
            if (listo) return;
            listo = true;
            wrap.hidden = true;
            btn.removeEventListener("click", alClick);
            clearInterval(vigia);
            resolve(ok);
        };
        var alClick = function () { sfx("boton"); cerrar(vivo(tk)); };
        btn.addEventListener("click", alClick);
        var vigia = setInterval(function () { if (!vivo(tk)) cerrar(false); }, 200);
    });
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    hechos = 0;
    stats = { golpes: 0, obstaculos: 0, estrellas: 0, niveles: 0, porNivel: [] };
    aplicarAccesibilidad();
    await entrar(0, { boton: true });
}

// ------------------------------------------------------------------ eventos de la escena

function escena() { return esc(); }

/** El niño toma la pelota: en los primeros niveles Zoe anima a arrastrar hacia atrás (pocas veces). */
function alAgarra(info) {
    if (!jugando || (info && info.demo) || nivelIdx > 1) return;
    decirPocas("agarra", 1, frase(textos().tensa, "tensa"), "zoe", "senala");
}

function alTope() {
    if (!jugando || nivelIdx > 1 || acc().ayudaAutomatica === false) return;
    decirPocas("tope", 1, textos().alTope, "zeus", "senala");
}

/** Soltó: cuenta un golpe; en el nivel 1 se celebra que la pelota rueda y después llega el consejo de Zeus. */
function alGolpe(info) {
    if (!info || info.demo || !jugando) return;
    golpesNivel++;
    stats.golpes++;
    pintarGolpes(true);
    if (golpesNivel === 1 && nivelIdx === 0) decirRapido(textos().rodando, "zoe", "celebra");
    if (golpesNivel === 1 && ronda().instruccion2) {
        var r = ronda();
        setTimeout(function () { if (jugando) decirPocas("instruccion2", 1, r.instruccion2, r.voz2 === "zoe" ? "zoe" : "zeus", "senala"); }, nivelIdx === 0 ? 3200 : 1600);
    }
}

function alRebote(info) {
    if (!info || info.demo || !jugando) return;
    if (info.clase === "curva") {
        var e = escena();
        if (e) e.mensaje(frase(["¡Buen rebote!", "¡Rebote mágico!"], "msgRebote"), "#66f5ff");
        decirPocas("rebote", 2, frase(textos().rebote, "rebote"), "zoe", "celebra");
    }
}

function alAspa(info) {
    if (!info || info.demo || !jugando) return;
    var e = escena();
    if (e) e.mensaje("¡Toc! ¡Un aspa!", "#ffa94d");
    var ahora = Date.now();
    if (ahora - tVozFallo > 4000 && decirPocas("aspa", 3, frase(textos().aspa, "aspa"), (dichos.aspa || 0) % 2 ? "zeus" : "zoe", "senala")) tVozFallo = ahora;
}

function alAsteroide(info) {
    if (!info || info.demo || !jugando) return;
    var e = escena();
    if (e) e.mensaje("¡Bonk!", "#ff8ae2");
    decirPocas("asteroide", 2, frase(textos().asteroide, "asteroide"), "zeus", "senala");
}

/** Rebotó en un pilar de cristal. */
function alPoste(info) {
    if (!info || info.demo || !jugando) return;
    var e = escena();
    if (e) e.mensaje("¡Toc! ¡Pilar de cristal!", "#99e9f2");
    decirPocas("poste", 1, "¡La pelota puede rebotar en los pilares de cristal!", "zoe", "senala");
}

function alMolinoSuperado(info) {
    if (!info || info.demo || !jugando) return;
    stats.obstaculos++;
    var e = escena();
    if (e) e.mensaje("¡Superaste el molino!", "#99e9f2");
    decirPocas("molino", 2, frase(textos().molinoSuperado, "molino"), "zeus", "celebra");
}

function alSobreHoyo(info) {
    if (!info || info.demo || !jugando) return;
    var e = escena();
    if (e) e.mensaje("¡Casi!", "#ffe066");
}

/** La pelota se detuvo sin entrar: sin castigo; un consejo amable (no a cada golpe) y, tras varios, más ayuda. */
function alDetenida(info) {
    if (!info || info.demo || !jugando) return;
    if (info.empujada) return;
    fallosNivel++;
    if (info.info && info.info.curva) stats.obstaculos++;
    var e = escena();
    if (info.cerca && e) e.mensaje(textos().consejos.casi || "¡Casi llega!", "#ffe066");
    // tras varios golpes sin entrar, la línea de luz muestra todo el camino
    if (!ayudaDada && acc().ayudaAutomatica !== false && fallosNivel >= (Number(juego().fallosParaAyuda) || 3) && ronda().prediccion != null) {
        ayudaDada = true;
        if (e) e.prediccionCompleta(true);
        decir(textos().ayuda, "zeus", "senala", 4500);
        return;
    }
    var ahora = Date.now();
    if (ahora - tVozFallo < (Number(juego().vozFalloMs) || 5000) && !info.cerca) return;
    var c = textos().consejos || {};
    var t = c[info.consejo] || frase(textos().fallo, "fallo");
    var quien = info.consejo === "molino" || info.consejo === "menos" ? "zeus" : "zoe";
    if (decirRapido(t, quien, "senala")) tVozFallo = ahora;
}

/** ¡Dentro del hoyo! Estrellas del nivel según los golpes (nunca cero) y celebración. */
function alHoyo(info) {
    if (!info || info.demo) return;
    if (!jugando) return;
    var R = window.ReglasGolf;
    var est = R ? R.estrellas(golpesNivel, (partida[nivelIdx] || {}).par || ronda().par || 3) : 3;
    stats.estrellas += est;
    stats.niveles++;
    if (info.info && info.info.curva) stats.obstaculos++;
    stats.porNivel[nivelIdx] = { golpes: golpesNivel, estrellas: est };
    var e = escena();
    if (e) e.mensaje(golpesNivel === 1 ? (textos().hoyoEnUno || "¡Hoyo en uno!") : "¡Dentro del hoyo!", "#ffe066");
    alNivelCompleto();
}

/** Un rato sin golpear: Zeus anima con una frase corta (la pelota late para mostrar dónde tocar). */
function alQuieto() {
    if (!jugando || acc().ayudaAutomatica === false) return;
    decirRapido(frase(textos().quieto, "quieto"), "zeus", "senala");
}

function alTocaLejos() {
    if (!jugando) return;
    decirPocas("tocaLejos", 1, "¡Toca la pelota y arrastra tu dedo hacia atrás!", "zoe", "senala");
}

function alNivelCompleto() {
    if (!jugando) return;
    var tk = token;
    jugando = false;
    if (esc()) esc().entrada(false);
    if (nivelIdx + 1 < total()) completarNivel(tk);
    else completar(tk);
}

/** Niveles 1, 2 y 3: el hoyo se ilumina, la bandera sube, estrellas y confeti; Zoe y Zeus felicitan e invitan. */
async function completarNivel(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    hechos = Math.max(hechos, nivelIdx + 1);
    pintarNivel();
    await sleep(700);
    if (!vivo(tk)) return;
    sfx("victoria");
    var est = (stats.porNivel[nivelIdx] || {}).estrellas || 3;
    var g = golpesNivel;
    mostrarCartel({ etiqueta: "Nivel " + (nivelIdx + 1), titulo: textos().cierreTitulo || "¡DENTRO DEL HOYO!", sub: (ronda().logro || "") + "  ·  " + g + (g === 1 ? " golpe" : " golpes"), estrellas: est });
    var quien = ronda().despedida || "zoe";
    if (quien === "ambos") gestoAmbos("celebra");
    var fiesta = e ? e.celebrarNivel() : sleep(2000);
    await Promise.all([decir(g === 1 ? (textos().hoyoEnUno + " " + textos().cierreNivel) : textos().cierreNivel, quien === "zeus" ? "zeus" : "zoe", "celebra", 6000), fiesta]);
    if (!vivo(tk)) return;
    if (ronda().invita) {
        mostrarCartel({ etiqueta: "Nivel " + (nivelIdx + 2), titulo: rondas()[nivelIdx + 1].nombre, sub: ronda().invita });
        await Promise.all([decir(ronda().invita, quien === "zoe" ? "zeus" : "zoe", "celebra", 3500), sleep(1600)]);
        if (!vivo(tk)) return;
    }
    ocultarCartel();
    await sinPausa();
    if (e) await e.salida();
    if (!vivo(tk)) return;
    if (e) await e.transicion();
    if (!vivo(tk)) return;
    await entrar(nivelIdx + 1, { boton: false });
}

/**
 * Nivel 4: la gran celebración (una vez): onda dorada, la bandera sube, el molino se llena de luces, el césped
 * ondea, el gran trofeo baja, banderines encendidos, confeti, Zoe y Zeus celebran, «¡HOYO EN UNO ESPECTACULAR!» con
 * el resumen real (niveles, golpes, obstáculos, estrellas) y al final la victoria compartida.
 */
async function completar(tk) {
    if (finalHecho) return;
    finalHecho = true;
    var e = esc();
    document.body.classList.add("demo-lock");
    hechos = total();
    pintarNivel();
    try {
        document.body.classList.remove("jugando");
        await sleep(800);
        sfx("victoria");
        document.body.classList.add("en-final");
        if (e) e.fiesta(true);
        var trofeo = e ? e.celebrarFinal() : sleep(2000);
        await sleep(900);
        sfx("fanfarria");
        await Promise.all([zoe(true), zeus(true)]);
        if (!vivo(tk)) return;
        gestoAmbos("celebra");
        mostrarMensajeFinal(true);
        await Promise.all([decir(textos().cierre, "zoe", "final", 12000), trofeo]);
        if (!vivo(tk)) return;
        gestoAmbos("saluda");
        await decir(textos().finalZoe, "zeus", "celebra", 4000);
        if (!vivo(tk)) return;
        await sleep(2600);
        if (!vivo(tk)) return;
    } catch (err) {
        console.warn("[MiniGolf] final", err);
    }
    mostrarMensajeFinal(false);
    if (e) e.fiesta(false);
    document.body.classList.remove("demo-lock");
    mostrarVictoria();
}

function mostrarMensajeFinal(on) {
    var caja = document.getElementById("mensaje-final");
    if (!caja) return;
    if (on) {
        document.getElementById("mensaje-final-titulo").textContent = textos().finalTitulo || "¡HOYO EN UNO ESPECTACULAR!";
        document.getElementById("mensaje-final-sub").textContent = textos().finalSub || "";
        var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = String(v); };
        poner("final-niveles", stats.niveles + " de " + total());
        poner("final-golpes", stats.golpes);
        poner("final-obstaculos", stats.obstaculos);
        poner("final-estrellas", stats.estrellas + " de " + total() * 3);
    }
    caja.hidden = !on;
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = textos().victoria || "¡GRAN GOLFISTA ESPACIAL!";
    zoe(false);
    zeus(false);
    if (caja) {
        caja.hidden = false;
        caja.style.display = "block";
    }
    if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
}

function ocultarFinal() {
    if (typeof cancelarSecuenciaVictoria === "function") cancelarSecuenciaVictoria();
    mostrarMensajeFinal(false);
    var caja = document.getElementById("final");
    if (caja) {
        caja.hidden = true;
        caja.style.display = "none";
        caja.classList.remove("final-cerrando");
    }
    var principal = document.getElementById("principal");
    if (principal) principal.style.display = "";
    document.body.classList.remove("final-3d-activa");
    if (window.Final3d && window.Final3d.dispose) {
        try { window.Final3d.dispose(); } catch (err) { /* el cierre puede no haber montado el 3D */ }
    }
}

/** texto: una frase o { etiqueta, titulo, sub, estrellas }. */
function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
    var est = document.getElementById("cartel-estrellas");
    if (est) {
        est.innerHTML = "";
        if (o.estrellas) {
            for (var i = 0; i < 3; i++) {
                var s = document.createElement("i");
                s.className = "fa-solid fa-star" + (i < o.estrellas ? " llena" : "");
                s.style.animationDelay = (0.25 + i * 0.25) + "s";
                est.appendChild(s);
            }
        }
    }
    nube("zoe-nube", "zoe-nube-texto", "", false);
    nube("zeus-nube", "zeus-nube-texto", "", false);
    if (c) {
        c.hidden = false;
        c.classList.remove("entra");
        void c.offsetWidth;
        c.classList.add("entra");
    }
    var pista = document.getElementById("pista");
    if (pista) pista.hidden = true;
    clearTimeout(tPista);
}

function ocultarCartel() {
    var c = document.getElementById("cartel");
    if (c) c.hidden = true;
}

// ------------------------------------------------------------------ arranque

document.addEventListener("DOMContentLoaded", function () {
    gameConfig = JSON.parse(readText("config.json?v=20261127e"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    sincronizarDialogoIntro3d();
    if (typeof TextoVoz !== "undefined" && TextoVoz.iniciar) {
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenMusica()
        });
    }
    enlazarMenus();
    aplicarAccesibilidad();
    partida = generarPartida();
    if (window.ReglasGolf && gameConfig.demo) nivelDemo = window.ReglasGolf.prepararNivel(gameConfig.demo, juego(), window.ReglasGolf.azar(7));

    var E = window.EscenarioGolf;
    if (E) {
        E.al("agarra", alAgarra);
        E.al("tension", pintarFuerza);
        E.al("alTope", alTope);
        E.al("golpe", alGolpe);
        E.al("rebote", alRebote);
        E.al("aspa", alAspa);
        E.al("asteroide", alAsteroide);
        E.al("molinoSuperado", alMolinoSuperado);
        E.al("poste", alPoste);
        E.al("sobreHoyo", alSobreHoyo);
        E.al("detenida", alDetenida);
        E.al("hoyo", alHoyo);
        E.al("quieto", alQuieto);
        E.al("tocaLejos", alTocaLejos);
        escenaLista = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[MiniGolf] la escena no se pudo montar");
            else if (nivelDemo) E.cargar(nivelDemo, gameConfig.demo, { presentacion: true });
            return ok;
        });
    }

    var on = function (id, fn) {
        var b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    on("btn-empecemos", empecemosJuego);
    on("btn-omitir-intro3d", omitirIntro3d);
    on("btn-continuar-intro3d", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () { if (esc()) esc().reacomodar(); });
    window.addEventListener("pagehide", function () {
        if (window.SonidosGolf) window.SonidosGolf.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosGolf) window.SonidosGolf.detenerTodo();
        musicaFondo(false);
    };
    // pestaña oculta: la partida se pausa (la pelota, el molino y el asteroide se detienen); al volver, sigue
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible") {
            if (jugando) pausar(true);
            return;
        }
        if (pausado) pausar(false);
        if (!audioIniciado) return;
        if (window.SonidosGolf && window.SonidosGolf.reanudar) window.SonidosGolf.reanudar();
        if (window.VolumenPolimotor && VolumenPolimotor.refrescar) VolumenPolimotor.refrescar();
        musicaFondo(true);
    });
    // pruebas: entrar a un nivel directo y ver la partida generada
    window.__golf = {
        entrar: entrar,
        partida: function () { return partida; },
        pausar: pausar,
        estado: function () { return { nivelIdx: nivelIdx, jugando: jugando, pausado: pausado, hechos: hechos, finalHecho: finalHecho, stats: stats, golpesNivel: golpesNivel, fallosNivel: fallosNivel }; }
    };
});
