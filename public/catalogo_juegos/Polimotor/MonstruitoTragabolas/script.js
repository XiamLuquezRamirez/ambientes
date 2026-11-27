/**
 * Alimenta al Monstruito Tragabolas — flujo del juego (Polimotor, 3-4 años, puntería de lanzamiento directo).
 *
 * inicio → intro 3D → PedniaEdad → presentación (título, jardín, monstruito, bandeja; Zoe y Zeus explican) →
 * demostración (la mano lanza una bola, no cuenta) → «EMPEZAR» → 4 niveles (3, 4, 5 y 6 bolas) con guía punteada en
 * el primer intento → celebración de cada nivel y transición → festín final → victoria compartida.
 *
 * Aquí no se decide si el gesto es un lanzamiento ni si entra (ReglasMonstruo, desde la escena) ni se dibuja
 * (EscenarioMonstruo): solo se enlazan pantallas, voces, sonidos, ayudas, pausa y niveles. Fallar no resta nada.
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
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var tGuia = null;
var tVozFallo = 0;
var tVozCorto = 0;
var noLanzados = 0;
var turnoFrase = 0;
var lanzoAlgunaVez = false;
var volumenListo = false;
var escenaLista = null;
var audioFondo = null;
var audioIniciado = false;
var finalHecho = false;
var esperasPausa = [];

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function esc() { return window.EscenarioMonstruo && window.EscenarioMonstruo.listo() ? window.EscenarioMonstruo : null; }
function sfx(nombre) {
    var s = window.SonidosMonstruo;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function rondas() { return gameConfig.rondas || []; }
function ronda() { return rondas()[nivelIdx] || {}; }
function total() { return Math.max(1, rondas().length); }
function vivo(tk) { return tk === token; }

function frase(lista, i) {
    if (!Array.isArray(lista)) return lista || "";
    return lista.length ? lista[i % lista.length] : "";
}

/** Resuelve cuando el juego no está en pausa. */
function sinPausa() {
    if (!pausado) return Promise.resolve();
    return new Promise(function (r) { esperasPausa.push(r); });
}

// ------------------------------------------------------------------ niveles de la partida

/**
 * Los cuatro niveles de esta partida: colores y orden al azar; el monstruito en un lugar al azar distinto del
 * nivel anterior y cada nivel un poco más lejos de la bandeja. Siempre jugables.
 */
function generarPartida() {
    var R = window.ReglasMonstruo;
    if (!R) return [];
    var antes = null;
    return rondas().map(function (r, i) {
        var nivel = null;
        for (var k = 0; k < 30; k++) {
            nivel = R.prepararNivel(r, juego(), Math.random, antes);
            var m = R.validarNivel(nivel);
            if (!m.length) break;
            if (k === 29) console.warn("[Monstruito] nivel " + (i + 1) + " con avisos", m);
        }
        antes = nivel.monstruo.x;
        return nivel;
    });
}

// ------------------------------------------------------------------ música de fondo

function volumenMusica() {
    var n = Number(acc().volumenFondo);
    return Math.max(0, Math.min(100, isFinite(n) ? n : 30)) / 100;
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

/** La mano del tutorial toma una bola, desliza hacia arriba y la bola entra en la boca (no cuenta). */
function demoConMano(e, tk) {
    var T = window.PedniaTutorial;
    var mano = null;
    var mover = function (x, y, fase) {
        if (!vivo(tk) || !T) return;
        if (!mano || !mano.isConnected) {
            mano = T.crearMano();
            mano.style.transition = "none";
        }
        var p = e.aPantalla(x, y);
        T.faseMano(mano, fase === "presiona" || fase === "arrastra" ? "presionar" : "viajar");
        if (fase === "viaja") mano.style.transition = "transform 650ms ease-in-out";
        else if (fase === "suelta") mano.style.transition = "transform 300ms ease-out";
        else mano.style.transition = "none";
        T.puntaManoEn(mano, p.x, p.y);
    };
    var quitar = function () {
        if (T && T.quitarManos) T.quitarManos();
        mano = null;
    };
    return e.demo(mover).then(quitar, quitar);
}

// ------------------------------------------------------------------ voces

function guiaDe(pj) {
    var g = pj === "zeus" ? window.Guia3DZeus : window.Guia3D;
    return g && g.listo && g.listo() ? g : null;
}

function nube(idCaja, idTexto, texto, visible) {
    var caja = document.getElementById(idCaja);
    var span = document.getElementById(idTexto);
    if (!caja || !span) return;
    if (!texto || !visible) { caja.hidden = true; return; }
    span.textContent = (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto;
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
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3600);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosMonstruo) window.SonidosMonstruo.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosMonstruo) window.SonidosMonstruo.agachar(false);
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

/** Comentario breve en la partida: se omite si ya suena otra voz (no se repiten audios a cada rato). */
function decirRapido(texto, pj, gesto) {
    var ahora = Date.now();
    if (pausado || vozActiva || ahora < vozLibreDesde) return false;
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2600);
    hablar(texto, pj, gesto || "celebra");
    return true;
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosMonstruo) window.SonidosMonstruo.agachar(false);
}

function mostrarPista(texto, pj, ms) {
    var caja = document.getElementById("pista");
    var p = document.getElementById("pista-texto");
    var im = document.getElementById("pista-cara");
    var nombre = document.getElementById("pista-nombre");
    if (!caja || !p) return;
    p.textContent = (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto;
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

/** Zoe y Zeus entran y salen caminando (MARCHA_MS = transición de style.css). */
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
            texto: (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(linea.texto) : linea.texto
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
    if (window.SonidosMonstruo) window.SonidosMonstruo.desbloquear();
    audioIniciado = true;
    musicaFondo(true);
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosMonstruo,
            fondoPorDefecto: acc().volumenFondo || 30,
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
    var esp = Number(acc().letterSpacing);
    document.documentElement.style.setProperty("--letter-spacing", (isFinite(esp) ? esp : 1) + "px");
    if (esc()) esc().mostrarProgreso(acc().mostrarProgreso !== false);
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
            if (op.key === "ayudaAutomatica") { if (input.checked) programarAyuda(); else limpiarAyuda(); }
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

function pausar(on) {
    on = !!on;
    if (on === pausado) return;
    if (on && document.body.classList.contains("en-final")) return;
    pausado = on;
    sfx("pausa", on);
    document.body.classList.toggle("en-pausa", on);
    var capa = document.getElementById("pausa");
    if (capa) capa.hidden = !on;
    var btn = document.getElementById("btn-pausa");
    if (btn) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        var i = btn.querySelector("i");
        if (i) i.className = on ? "fa-solid fa-play" : "fa-solid fa-pause";
    }
    if (esc()) esc().pausar(on);
    var T = window.PedniaTutorial;
    if (on) {
        callar();
        limpiarAyuda();
        clearTimeout(tGuia);
        musicaFondo(false);
    } else {
        if (audioIniciado) musicaFondo(true);
        var l = esperasPausa;
        esperasPausa = [];
        l.forEach(function (r) { r(); });
        if (jugando) programarAyuda();
    }
    void T;
}

// ------------------------------------------------------------------ ayuda

function limpiarAyuda() {
    clearTimeout(tAyuda);
    tAyuda = null;
}

/** Un rato sin lanzar: la guía punteada vuelve un momento y Zoe lo recuerda. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!jugando || pausado) return;
    tAyuda = setTimeout(function () {
        if (!jugando || pausado || !esc()) return;
        var st = esc().estado();
        if (st && st.estado !== "lista") { programarAyuda(4000); return; }
        if (acc().ayudaAutomatica !== false) guiaBreve();
        decirRapido(lanzoAlgunaVez ? frase(textos().zoeJuego, 2) : frase(textos().zoeJuego, 1), "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 13000);
    }, ms || Number(juego().ayudaMs) || 10000);
}

/** La guía punteada aparece un momento y se apaga sola (o cuando el niño empieza a deslizar). */
function guiaBreve(ms) {
    var e = esc();
    if (!e) return;
    sfx("guia");
    e.guia(true);
    clearTimeout(tGuia);
    tGuia = setTimeout(function () { if (esc()) esc().guia(false); }, ms || Number(juego().guiaRepetirMs) || 3600);
}

// ------------------------------------------------------------------ partida

function pintarNivel() {
    var ind = document.getElementById("nivel-ind");
    if (!ind) return;
    var txt = document.getElementById("nivel-num");
    if (txt) txt.textContent = String(nivelIdx + 1);
    var est = ind.querySelectorAll(".nivel-estrella");
    est.forEach(function (s, i) {
        s.classList.toggle("hecha", i < hechos);
        s.classList.toggle("actual", i === nivelIdx && i >= hechos);
    });
    var nom = document.getElementById("titulo-nivel");
    if (nom) nom.textContent = ronda().nombre || "";
}

/**
 * Entrar al nivel i (0..3). opciones.boton: espera «EMPEZAR» (solo el nivel 1).
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    if (escenaLista) await escenaLista;
    var e = esc();
    if (!e || !vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(total() - 1, i | 0));
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando", "nivel-1", "nivel-2", "nivel-3", "nivel-4");
    document.body.classList.add("nivel-" + (nivelIdx + 1));
    ocultarFinal();
    ocultarCartel();
    e.entrada(false);
    e.cargar(partida[nivelIdx], ronda());
    noLanzados = 0;
    pintarNivel();
    aplicarAccesibilidad();
    document.body.classList.add("demo-lock");
    if (nivelIdx === 0) document.body.classList.add("presentando");
    var demoOn = acc().mostrarIntro !== false;

    try {
        await e.presentar();
        if (!vivo(tk)) return;
        if (nivelIdx === 0) {
            // presentación: Zoe y Zeus explican junto al monstruito
            await Promise.all([zoe(true), zeus(true)]);
            if (!vivo(tk)) return;
            await decir(textos().introZoe, "zoe", "saluda", 12000);
            if (!vivo(tk)) return;
            var voz = decir(textos().introZeus, "zeus", "senala", 6000);
            if (demoOn) await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.esperar(Promise.all([demoConMano(e, tk), voz])) : Promise.all([demoConMano(e, tk), voz]));
            else await voz;
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Monstruito] presentación", err);
    }
    document.body.classList.remove("demo-lock");
    if (!vivo(tk)) return;
    if (o.boton !== false) {
        var sigue = await esperarBoton(tk, textos().botonComenzar || "EMPEZAR");
        if (!vivo(tk) || !sigue) return;
        // transición al modo de juego
        sfx("transicion");
        document.body.classList.remove("presentando");
        zoe(false);
        zeus(false);
        if (e.saltito) e.saltito();
    }
    mostrarCartel(ronda().cartel || ronda().nombre);
    sfx("aparece", nivelIdx);
    await sleep(1500);
    if (!vivo(tk)) return;
    ocultarCartel();
    await sinPausa();
    if (!vivo(tk)) return;
    // primer intento del nivel: guía punteada visible hasta que el niño empiece a deslizar
    if (acc().ayudaAutomatica !== false || nivelIdx === 0) { sfx("guia"); e.guia(true); }
    document.body.classList.add("jugando");
    e.entrada(true);
    jugando = true;
    decir(ronda().instruccion, ronda().voz === "zeus" ? "zeus" : "zoe", "senala", 5000);
    programarAyuda();
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
    aplicarAccesibilidad();
    await entrar(0, { boton: true });
}

// ------------------------------------------------------------------ eventos de la escena

function alToma() {
    sfx("seleccion");
    if (!jugando) return;
    limpiarAyuda();
    clearTimeout(tGuia);
}

/** Tocó la bola y la soltó sin deslizar bien hacia arriba: la bola sigue disponible y se dice cómo. */
function alSuelta(info) {
    if (!jugando) return;
    noLanzados++;
    var ahora = Date.now();
    if (ahora - tVozCorto > (Number(juego().vozCortoMs) || 6500)) {
        var t = info && info.motivo === "toque" ? textos().toque : frase(textos().corto, turnoFrase++);
        if (decirRapido(t, "zoe", "senala")) tVozCorto = ahora;
    }
    if (noLanzados >= 2 && acc().ayudaAutomatica !== false) {
        noLanzados = 0;
        guiaBreve();
    }
    programarAyuda();
}

function alLanza() {
    sfx("lanzar");
    lanzoAlgunaVez = true;
    noLanzados = 0;
    limpiarAyuda();
}

function alAcierto(info) {
    sfx("nam");
    sfx("masticar");
    sfx("campanitas", info && info.n);
    setTimeout(function () { sfx("estrellas"); }, 200);
    if (!jugando) return;
    if (info && info.quedan > 0) {
        var t = frase(textos().acierto, turnoFrase++);
        decirRapido(t, turnoFrase % 2 ? "zeus" : "zoe", "celebra");
    }
}

function alFallo(info) {
    sfx("risita");
    if (!jugando) return;
    var ahora = Date.now();
    var seguidos = (info && info.seguidos) || 0;
    var minFallos = Number(juego().fallosParaGuia) || 2;
    if (seguidos >= minFallos && acc().ayudaAutomatica !== false) {
        // varios intentos: la guía vuelve un momento y Zeus señala la boca
        setTimeout(function () { if (jugando) guiaBreve(); }, 1400);
        if (decirRapido(textos().guiaOtraVez, "zeus", "senala")) tVozFallo = ahora;
        return;
    }
    if (ahora - tVozFallo < (Number(juego().vozFalloMs) || 5200)) return;
    var ok = info && info.casi ? decirRapido(textos().casi, "zeus", "senala")
        : decirRapido(seguidos >= 3 ? frase(textos().apoyo, 3) : frase(textos().fallo, turnoFrase++), "zoe", "senala");
    if (ok) tVozFallo = ahora;
}

function alListo() {
    if (jugando) programarAyuda();
}

function alNivelCompleto() {
    if (!jugando) return;
    var tk = token;
    jugando = false;
    limpiarAyuda();
    clearTimeout(tGuia);
    if (nivelIdx + 1 < total()) completarNivel(tk);
    else completar(tk);
}

/** Nivel 1, 2 o 3 terminado: celebración, «¡QUÉ GRAN PUNTERÍA!», invitación y transición al siguiente. */
async function completarNivel(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    if (e) e.entrada(false);
    hechos = Math.max(hechos, nivelIdx + 1);
    pintarNivel();
    sfx("victoria");
    mostrarCartel({ etiqueta: "Nivel " + (nivelIdx + 1), titulo: textos().cierreTitulo || "¡QUÉ GRAN PUNTERÍA!", sub: ronda().logro || "" });
    var fiesta = e ? e.celebrarNivel(false) : sleep(2000);
    await Promise.all([decir(textos().cierre, "zoe", "celebra", 7000), fiesta]);
    if (!vivo(tk)) return;
    if (ronda().invita) {
        mostrarCartel({ etiqueta: "Nivel " + (nivelIdx + 2), titulo: rondas()[nivelIdx + 1].nombre, sub: ronda().invita });
        await Promise.all([decir(ronda().invita, "zeus", "celebra", 3500), sleep(1600)]);
        if (!vivo(tk)) return;
    }
    ocultarCartel();
    await sinPausa();
    sfx("transicion");
    if (e) await e.salida();
    if (!vivo(tk)) return;
    await entrar(nivelIdx + 1, { boton: false });
}

/**
 * Nivel 4: el festín final (una vez): celebración especial con confeti, Zoe y Zeus entran a felicitar,
 * «¡LO LOGRASTE! ¡ERES UN EXPERTO EN PUNTERÍA!» y, al final, la victoria compartida.
 */
async function completar(tk) {
    if (finalHecho) return;
    finalHecho = true;
    var e = esc();
    document.body.classList.remove("jugando");
    document.body.classList.add("demo-lock");
    if (e) e.entrada(false);
    hechos = total();
    pintarNivel();
    sfx("victoria");
    mostrarCartel({ etiqueta: "Nivel " + total(), titulo: "¡QUÉ GRAN PUNTERÍA!", sub: ronda().logro || "" });
    try {
        var fiesta = e ? e.celebrarNivel(true) : sleep(2000);
        await Promise.all([decir(textos().cierre, "zoe", "celebra", 7000), fiesta]);
        if (!vivo(tk)) return;
        ocultarCartel();
        document.body.classList.add("en-final");
        if (e) e.fiesta(true);
        sfx("fanfarria");
        await Promise.all([zoe(true), zeus(true)]);
        if (!vivo(tk)) return;
        var gz = guiaDe("zoe"), gs = guiaDe("zeus");
        if (gz) gz.gesto("celebra");
        if (gs) gs.gesto("celebra");
        mostrarMensajeFinal(true);
        if (e) e.celebrarNivel(true);
        await decir(textos().finalZoe, "zoe", "final", 6000);
        if (!vivo(tk)) return;
        await decir(textos().finalZeus, "zeus", "celebra", 5000);
        if (!vivo(tk)) return;
        await sleep(3500);
        if (!vivo(tk)) return;
    } catch (err) {
        console.warn("[Monstruito] final", err);
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
        document.getElementById("mensaje-final-titulo").textContent = textos().finalTitulo || "¡LO LOGRASTE!";
        document.getElementById("mensaje-final-sub").textContent = textos().finalSub || "";
    }
    caja.hidden = !on;
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = textos().victoria || "¡ERES UN EXPERTO EN PUNTERÍA!";
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
        try { window.Final3d.dispose(); } catch (e) { /* el cierre puede no haber montado el 3D */ }
    }
}

/** texto: una frase o { etiqueta, titulo, sub }. */
function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
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
    gameConfig = JSON.parse(readText("config.json?v=20261125j"));
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
    var t = textos();
    var poner = function (id, v) { var el = document.getElementById(id); if (el && v) el.textContent = v; };
    poner("titulo-juego-kicker", t.tituloJuego);
    poner("titulo-juego-nombre", (t.tituloIntro || "").toUpperCase());
    poner("titulo-juego-sub", t.subtituloJuego);
    enlazarMenus();
    aplicarAccesibilidad();
    partida = generarPartida();

    var E = window.EscenarioMonstruo;
    if (E) {
        E.al("toma", alToma);
        E.al("mueve", function (i) { sfx("estira", i && i.d); });
        E.al("suelta", alSuelta);
        E.al("lanza", alLanza);
        E.al("acierto", alAcierto);
        E.al("fallo", alFallo);
        E.al("rebote", function (i) { sfx("rebote", i && i.fuerza); });
        E.al("regresa", function () { sfx("regreso"); });
        E.al("listo", alListo);
        E.al("nivelCompleto", alNivelCompleto);
        E.al("aparece", function (i) { sfx("aparece", i && i.i); });
        E.al("destello", function () { sfx("destello"); });
        E.al("mudanza", function (i) { sfx("saltitos", i && i.saltos); });
        E.al("tocaFuera", function () { if (jugando) programarAyuda(); });
        E.al("demoToma", function () { sfx("seleccion"); });
        E.al("demoLanza", function () { sfx("lanzar"); });
        E.al("demoCome", function () { sfx("nam"); sfx("masticar"); sfx("campanitas", 0); });
        escenaLista = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Monstruito] la escena no se pudo montar");
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
        if (window.SonidosMonstruo) window.SonidosMonstruo.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosMonstruo) window.SonidosMonstruo.detenerTodo();
        musicaFondo(false);
    };
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible" || !audioIniciado || pausado) return;
        if (window.SonidosMonstruo && window.SonidosMonstruo.reanudar) window.SonidosMonstruo.reanudar();
        if (window.VolumenPolimotor && VolumenPolimotor.refrescar) VolumenPolimotor.refrescar();
        musicaFondo(true);
    });
    // pruebas: entrar a un nivel directo y ver la partida generada
    window.__monstruito = {
        entrar: entrar,
        partida: function () { return partida; },
        pausar: pausar,
        estado: function () { return { nivelIdx: nivelIdx, jugando: jugando, pausado: pausado, hechos: hechos, finalHecho: finalHecho }; }
    };
});
