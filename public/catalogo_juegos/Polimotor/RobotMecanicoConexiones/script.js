/**
 * El Robot Mecánico y sus Conexiones — flujo del juego.
 * inicio → intro 3D → PedniaEdad → presentación (Zoe en el laboratorio) → demostración (mano) →
 * «¡Comenzar a jugar!» → nivel 1 (4 piezas) → nivel 2 (5, con giros) → nivel 3 (9, con manos y pies)
 * → nivel 4 (11, antena y módulo) → cinemática «El laboratorio cobra vida» → victoria compartida.
 *
 * Aquí no se decide si un soltado es correcto (ReglasRobot) ni se dibuja (EscenarioRobot). Las
 * reacciones del laboratorio cuelgan de EventosRobot; este archivo conecta voces, sonidos y niveles.
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var variante = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var colocadas = {};
var intentos = {};
var casiSeguidos = {};
var girosFallidos = {};
var fuerasSeguidos = 0;
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var turnoAcierto = 0;
var turnoSeleccion = 0;
var turnoGiro = 0;
var turnoAyuda = 0;
var seleccionesNivel = 0;
var volumenListo = false;
var escenaLista = null;
var nivelIdx = 0;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function R() { return window.ReglasRobot; }
function esc() { return window.EscenarioRobot || null; }
function bus() { return window.EventosRobot; }
function sfx(nombre, a) {
    var s = window.SonidosRobot;
    if (s && typeof s[nombre] === "function") s[nombre](a);
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function piezasNivel() { return R().piezasNivel(gameConfig, nivelIdx); }
function nivel() { return R().nivel(gameConfig, nivelIdx) || {}; }
function totalNiveles() { return Math.max(1, R().niveles(gameConfig).length); }
function defPieza(id) { return piezasNivel().filter(function (p) { return p.id === id; })[0] || R().pieza(gameConfig, id); }
function vivo(tk) { return tk === token; }

/** Carga el nivel en la escena: reparto nuevo de la bandeja y piezas giradas al azar (sin cambiar la variante). */
function cargarNivelEnEscena() {
    var e = esc();
    if (!e) return;
    var lista = piezasNivel();
    var n = nivel();
    var ids = lista.map(function (p) { return p.id; });
    var huecos = Math.ceil(ids.length / 2) * 2;
    e.cargar({
        nivel: nivelIdx + 1,
        ids: ids,
        giro: !!n.giro,
        rot: n.giro ? R().orientaciones(lista, n, juego().giros) : {},
        reparto: R().repartir(ids, huecos),
        bloqueadas: R().bloqueadas(lista, {}),
        plano: nivelIdx === 1 ? ["cabeza"] : nivelIdx === 2 ? ["mano-izq", "pie-der", "mano-der", "pie-izq"] : nivelIdx === 3 ? ["antena", "modulo"] : null
    });
    e.mostrarProgreso(acc().mostrarProgreso !== false);
}

// ------------------------------------------------------------------ voces

function guia() {
    var g = window.Guia3D;
    return g && g.listo && g.listo() ? g : null;
}

function nube(texto, visible) {
    var caja = document.getElementById("zoe-nube");
    var span = document.getElementById("zoe-nube-texto");
    if (!caja || !span) return;
    if (!texto || !visible) { caja.hidden = true; return; }
    span.textContent = (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto;
    caja.hidden = false;
    caja.classList.remove("nueva");
    void caja.offsetWidth;
    caja.classList.add("nueva");
}

function hablar(texto, gesto) {
    var cartelVisible = !document.getElementById("cartel").hidden;
    var zoeEn = document.body.classList.contains("zoe-en");
    nube(texto, !cartelVisible && zoeEn);
    if (texto && !cartelVisible && !zoeEn) mostrarPista(texto, 3600);
    var g = guia();
    if (gesto && g) g.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosRobot) window.SonidosRobot.agachar(true);
    if (g) g.hablar(true);
    var fin = function () {
        var gg = guia();
        if (gg) gg.hablar(false);
        if (window.SonidosRobot) window.SonidosRobot.agachar(false);
    };
    var p = Promise.resolve(TextoVoz.hablar(texto, "zoe")).then(fin, fin);
    vozActiva = p;
    p.then(function () { if (vozActiva === p) vozActiva = null; });
    return p;
}

/** Espera la voz que suena y luego habla (con tope, por si el servidor de voz no responde). */
function decir(texto, gesto, tope) {
    var tk = token;
    var espera = vozActiva ? Promise.race([vozActiva, sleep(900)]) : Promise.resolve();
    return espera.then(function () {
        if (!vivo(tk)) return;
        vozActiva = null;
        return Promise.race([hablar(texto, gesto), sleep(tope || 3200)]);
    });
}

/** Comentario breve durante la partida: se omite si ya hay otra voz sonando (salvo `forzar`). */
function decirRapido(texto, gesto, forzar) {
    var ahora = Date.now();
    if (!forzar && (vozActiva || ahora < vozLibreDesde)) return;
    if (forzar && typeof TextoVoz !== "undefined" && TextoVoz.detener) TextoVoz.detener();
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2300);
    hablar(texto, gesto || "celebra");
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosRobot) window.SonidosRobot.agachar(false);
}

function mostrarPista(texto, ms) {
    var caja = document.getElementById("pista");
    var p = document.getElementById("pista-texto");
    if (!caja || !p) return;
    p.textContent = (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto;
    caja.hidden = false;
    caja.classList.remove("sale");
    void caja.offsetWidth;
    caja.classList.add("sale");
    clearTimeout(tPista);
    tPista = setTimeout(function () { caja.hidden = true; }, ms || 2600);
}

/** Zoe entra y sale caminando (MARCHA_MS = transición de style.css). */
var MARCHA_MS = 1500;
var marcha = null;

function zoe(on) {
    var estaba = document.body.classList.contains("zoe-en");
    document.body.classList.toggle("zoe-en", !!on);
    if (!on) nube("", false);
    if (estaba === !!on) return Promise.resolve();
    clearTimeout(marcha);
    var g = guia();
    if (g) { g.mirar(on ? "derecha" : "izquierda"); g.caminar(true); }
    return new Promise(function (resolve) {
        marcha = setTimeout(function () {
            var gg = guia();
            if (gg) { gg.caminar(false); gg.mirar("frente"); }
            resolve();
        }, MARCHA_MS);
    });
}

// ------------------------------------------------------------------ intro 3D

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
    var conversacion = textos().conversacion || [];
    var personajesCfg = window.INTRO_CONFIG.personajes || [];
    var colores = window.INTRO_CONFIG.dialogo.colores || {};
    window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
        var indice = Number(linea.personaje);
        var def = personajesCfg[isFinite(indice) ? indice : 0] || {};
        var id = def.id || (indice === 1 ? "zoe" : "zeus");
        return {
            personaje: id,
            nombre: id === "zoe" ? "Zoe" : "Zeus",
            color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
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

/** «Omitir»: la intro corta el diálogo, los personajes salen y al llegar avisa `victory-continue`. */
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
    if (window.SonidosRobot) {
        window.SonidosRobot.desbloquear();
        window.SonidosRobot.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosRobot,
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

// ------------------------------------------------------------------ accesibilidad

function aplicarAccesibilidad() {
    document.body.classList.toggle("alto-contraste", !!acc().altoContraste);
    document.body.classList.toggle("sin-progreso", acc().mostrarProgreso === false);
    var espacio = Number(acc().letterSpacing);
    document.documentElement.style.setProperty("--letter-spacing", (isFinite(espacio) ? espacio : 1) + "px");
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
    [
        { key: "mostrarFeedBack", label: "Voces y mensajes" },
        { key: "altoContraste", label: "Alto contraste" },
        { key: "mostrarIntro", label: "Mostrar demostración" },
        { key: "ayudaAutomatica", label: "Ayuda visual" },
        { key: "mostrarProgreso", label: "Mostrar progreso" }
    ].forEach(function (op) {
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

// ------------------------------------------------------------------ ayuda progresiva

function limpiarAyuda() {
    clearTimeout(tAyuda);
    tAyuda = null;
}

function pendientesDisponibles() {
    return piezasNivel().filter(function (p) { return !colocadas[p.id] && R().disponible(p, colocadas); });
}

/** Sin conectar nada durante un rato: el escáner recorre el robot y Zoe da la pista de una pieza. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!acc().ayudaAutomatica) return;
    tAyuda = setTimeout(function () {
        if (!jugando) return;
        var e = esc();
        var sel = e ? e.seleccionada() : null;
        var lista = pendientesDisponibles();
        if (!lista.length) return;
        var p = (sel && lista.filter(function (x) { return x.id === sel; })[0]) || lista[turnoAyuda % lista.length];
        turnoAyuda += 1;
        if (e) e.escanear(p.id);
        decirRapido(turnoAyuda % 3 === 0 ? textos().ayudaZoe : p.pista, "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 16000);
    }, ms || Number(juego().ayudaMs) || 13000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar en el nivel i (0..3).
 * opciones.demo   la mano enseña el gesto (solo nivel 1 y si "Mostrar demostración" está activa)
 * opciones.boton  espera «¡Comenzar a jugar!» (nivel 1). Los demás arrancan tras la presentación.
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    var e = esc();
    if (!e) return;
    if (escenaLista) await escenaLista;
    if (!vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(totalNiveles() - 1, i | 0));
    colocadas = {};
    intentos = {};
    casiSeguidos = {};
    girosFallidos = {};
    fuerasSeguidos = 0;
    turnoAcierto = 0;
    turnoAyuda = 0;
    seleccionesNivel = 0;
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosRobot) window.SonidosRobot.musica(false);
    e.terminarFiesta();
    e.arrastre(false);
    cargarNivelEnEscena();
    aplicarAccesibilidad();

    document.body.classList.add("presentando");
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.RobotDemo;
    try {
        await zoe(true);
        if (!vivo(tk)) return;
        if (nivel().giro && nivelIdx === 1) e.llamarAtencionGiro();
        // en el nivel 1 Zoe presenta qué robot tocó en esta partida (el mismo en los cuatro niveles)
        var saludo = nivelIdx === 0 && variante && variante.tipoSaludo ? variante.tipoSaludo + " " : "";
        await decir(saludo + nivel().zoe, nivelIdx ? "senala" : "saluda", 13000);
        if (!vivo(tk)) return;
        if (conDemo) {
            enDemo = true;
            document.body.classList.add("demo-lock");
            await window.RobotDemo.correr(apiDemo(tk));
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Robot] presentación", err);
    }
    enDemo = false;
    document.body.classList.remove("demo-lock");
    if (!vivo(tk)) return;
    if (o.boton !== false) {
        var sigue = await esperarComenzar(tk);
        if (!vivo(tk) || !sigue) return;
    } else {
        await sleep(300);
        if (!vivo(tk)) return;
    }
    nube("", false);
    document.body.classList.remove("presentando");
    document.body.classList.add("jugando");
    e.arrastre(true);
    jugando = true;
    programarAyuda();
}

function esperarComenzar(tk) {
    return new Promise(function (resolve) {
        var wrap = document.getElementById("comenzar-wrap");
        var btn = document.getElementById("btn-comenzar");
        if (!wrap || !btn) { resolve(true); return; }
        var texto = btn.querySelector(".btn-comenzar-texto");
        if (texto) texto.textContent = textos().botonComenzar || "¡Comenzar a jugar!";
        nube("", false);
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
        var alClick = function () { cerrar(vivo(tk)); };
        btn.addEventListener("click", alClick);
        var vigia = setInterval(function () { if (!vivo(tk)) cerrar(false); }, 200);
    });
}

function apiDemo(tk) {
    var e = esc();
    var lista = piezasNivel();
    var id = (gameConfig.demo && gameConfig.demo.pieza) || "brazo-izq";
    if (!lista.some(function (p) { return p.id === id; })) id = lista[0].id;
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk); },
        textoDemo: function () { return textos().demoZoe || ""; },
        pieza: function () { return id; },
        punto: function (pid) { return e.puntoCliente(pid); },
        destino: function () { return e.puntoRanuraCliente(id); },
        tomar: function (pid) { e.tomarDemo(pid); },
        mover: function (pid, x, y) { e.ponerCliente(pid, x, y); },
        entregar: async function (pid) {
            await e.encajar(pid);
            await sleep(1000);
            e.deshacer(pid);
            e.finDemo();
        },
        decir: function (texto) { return decir(texto, "senala", 8000); },
        terminar: function () { e.finDemo(); return Promise.resolve(); }
    };
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    aplicarAccesibilidad();
    await entrar(0, { demo: true, boton: true });
}

// ------------------------------------------------------------------ acciones del niño

function alSeleccion() {
    if (!jugando) return;
    limpiarAyuda();
    seleccionesNivel += 1;
    // la primera selección del nivel y luego de vez en cuando: "ahora busca dónde podemos colocarla"
    if (seleccionesNivel === 1 || seleccionesNivel % 4 === 0) decirRapido(R().frase(textos().seleccion, turnoSeleccion++), "senala");
    programarAyuda();
}

function alGirar(d) {
    if (!jugando || !d) return;
    limpiarAyuda();
    if (d.derecha && girosFallidos[d.id]) {
        girosFallidos[d.id] = 0;
        decirRapido(textos().giroBien, "aplaude");
    }
    programarAyuda();
}

function alGiroSinPieza() {
    if (!jugando) return;
    decirRapido(textos().giroSinPieza || textos().escanerSinPieza, "senala", true);
}

function alBloqueada(id) {
    if (!jugando) return;
    var def = defPieza(id);
    var dep = def && def.depende;
    var txt = (dep && (textos().dependencia || {})[dep]) || textos().bloqueada;
    decirRapido(txt, "duda", true);
    if (dep && esc()) esc().escanear(dep);
    programarAyuda();
}

function alEscaner(sel) {
    if (!jugando) return;
    var e = esc();
    if (!sel) { decirRapido(textos().escanerSinPieza, "senala", true); return; }
    if (e) e.escanear(sel);
    var def = defPieza(sel);
    decirRapido((def && def.pista) || textos().escaner, "senala", true);
    programarAyuda();
}

async function alSoltar(datos) {
    var tk = token;
    var e = esc();
    if (!e || !datos) return;
    if (!jugando || colocadas[datos.id]) {
        if (!colocadas[datos.id]) await e.devolver(datos.id);
        return;
    }
    var res = R().evaluar(datos);
    var def = defPieza(datos.id);
    if (res.acierto) {
        colocadas[datos.id] = true;
        fuerasSeguidos = 0;
        casiSeguidos[datos.id] = 0;
        var lista = piezasNivel();
        var ultimo = R().completo(colocadas, lista);
        if (ultimo) { jugando = false; limpiarAyuda(); }
        await e.encajar(datos.id);
        if (!vivo(tk)) return;
        e.bloqueos(R().bloqueadas(lista, colocadas));
        var grupo = R().grupoCompletado(datos.id, colocadas, lista);
        var miembros = grupo ? lista.filter(function (p) { return p.grupo === grupo; }).length : 0;
        // brazo + mano, pierna + pie, cabeza (+ antena): la cabeza sola también activa el reconocimiento facial
        var grupoListo = !!grupo && (miembros > 1 || grupo === "cabeza");
        if (grupoListo) bus().emitir("extremidad_completada", { grupo: grupo });
        if (ultimo) {
            if (nivelIdx + 1 < totalNiveles()) await completarNivel(tk);
            else await completar(tk);
            return;
        }
        if (grupoListo && (textos().extremidad || {})[grupo]) decirRapido(textos().extremidad[grupo], "aplaude", true);
        else decirRapido(R().frase(textos().aciertos, turnoAcierto++), turnoAcierto % 2 ? "celebra" : "aplaude");
        programarAyuda();
        return;
    }
    var motivo = res.motivo;
    if (motivo === "orientacion") {
        // la pieza correcta, pero torcida: vuelve, la flecha se ve en la ranura y los botones de giro laten
        fuerasSeguidos = 0;
        girosFallidos[datos.id] = (girosFallidos[datos.id] || 0) + 1;
        await e.devolver(datos.id, motivo, res.destino);
        if (!vivo(tk)) return;
        decirRapido(R().frase(textos().girar, turnoGiro++), "senala", true);
        programarAyuda();
        return;
    }
    if (motivo === "dependencia") {
        await e.devolver(datos.id, motivo, res.destino);
        if (!vivo(tk)) return;
        decirRapido((textos().dependencia || {})[res.requiere] || textos().bloqueada, "duda", true);
        programarAyuda();
        return;
    }
    if (motivo === "casi") {
        fuerasSeguidos = 0;
        casiSeguidos[datos.id] = (casiSeguidos[datos.id] || 0) + 1;
        await e.devolver(datos.id, motivo, res.destino);
        if (!vivo(tk)) return;
        if (casiSeguidos[datos.id] >= (Number(juego().casiParaPista) || 2)) {
            casiSeguidos[datos.id] = 0;
            e.escanear(datos.id);
            decirRapido(def && def.pista ? def.pista : textos().casi, "senala");
        } else {
            decirRapido(textos().casi, "senala");
        }
        programarAyuda();
        return;
    }
    if (motivo === "otraPieza" || motivo === "ocupado") {
        fuerasSeguidos = 0;
        intentos[datos.id] = (intentos[datos.id] || 0) + 1;
        await e.devolver(datos.id, motivo, res.destino);
        if (!vivo(tk)) return;
        // al segundo intento con la misma pieza la pista ya dice dónde va y el escáner la señala
        if (intentos[datos.id] >= 2) {
            intentos[datos.id] = 0;
            if (acc().ayudaAutomatica) e.escanear(datos.id);
            decirRapido(def && def.pista ? def.pista : textos().otraPieza, "senala", true);
        } else {
            decirRapido(motivo === "ocupado" ? textos().ocupado : textos().otraPieza, "duda", true);
        }
        programarAyuda();
        return;
    }
    // fuera del robot: vuelve sin decir nada; si se repite, una indicación amable
    fuerasSeguidos += 1;
    await e.devolver(datos.id, "fuera");
    if (!vivo(tk)) return;
    if (fuerasSeguidos >= (Number(juego().fuerasParaPista) || 2)) {
        fuerasSeguidos = 0;
        decirRapido(textos().fuera, "senala");
    }
    programarAyuda();
}

// ------------------------------------------------------------------ fin de nivel y final

/** Niveles 1 a 3 terminados: el laboratorio celebra, el robot se mueve, Zoe felicita y sigue el próximo. */
async function completarNivel(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    bus().emitir("nivel_completado", { nivel: nivelIdx + 1 });
    mostrarCartel(nivel().cartel || nivel().listo || "¡Muy bien!");
    var g = guia();
    if (g) g.gesto("celebra");
    if (e) await e.celebrar(nivel().final);
    if (!vivo(tk)) return;
    ocultarCartel();
    await decir(nivel().listo, "aplaude", 5600);
    if (!vivo(tk)) return;
    // sin fundido (parpadeaba): el robot se desarma suave y el nivel siguiente aparece poco a poco
    if (e) await e.salida();
    if (!vivo(tk)) return;
    if (e) e.terminarFiesta();
    await entrar(nivelIdx + 1, { demo: false, boton: false });
}

/** Nivel 4: cinemática «El laboratorio cobra vida» y la victoria compartida. */
async function completar(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    bus().emitir("nivel_completado", { nivel: nivelIdx + 1 });
    mostrarCartel(nivel().cartel || nivel().listo);
    await decir(nivel().listo, "celebra", 4200);
    if (!vivo(tk)) return;
    ocultarCartel();
    nube("", false);
    // el robot es el protagonista de la cinemática: Zoe sale y vuelve a celebrar al final
    await zoe(false);
    if (!vivo(tk)) return;
    if (window.SonidosRobot) window.SonidosRobot.musica(true);
    if (e) {
        try {
            await e.cinematica({
                sonido: function (n) {
                    var mapa = { energia: "energia", encendido: "encendido", movimiento: "movimiento", paso: "paso", salto: "salto", celebrar: "celebrar" };
                    if (mapa[n]) sfx(mapa[n]);
                },
                cine: function (on) { document.body.classList.toggle("cinematica", !!on); }
            });
        } catch (err) {
            console.warn("[Robot] cinemática", err);
        }
    }
    document.body.classList.remove("cinematica");
    if (!vivo(tk)) return;
    document.body.classList.add("en-final");
    await zoe(true);
    if (!vivo(tk)) return;
    var g = guia();
    if (g) g.gesto("final");
    mostrarCartel({ etiqueta: "¡Robot activado!", titulo: textos().finalTitulo || "¡ENSAMBLAJE PERFECTO!", sub: textos().finalTexto || "" });
    await decir(textos().finalVoz, "final", 7500);
    if (!vivo(tk)) return;
    await sleep(600);
    if (!vivo(tk)) return;
    ocultarCartel();
    mostrarVictoria();
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = (textos().finalTitulo || "¡ENSAMBLAJE PERFECTO!") + "\n" + (textos().finalTexto || "");
    zoe(false);
    if (caja) {
        caja.hidden = false;
        caja.style.display = "block";
    }
    if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
}

function ocultarFinal() {
    if (typeof cancelarSecuenciaVictoria === "function") cancelarSecuenciaVictoria();
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

/** texto: una frase, o { etiqueta, titulo, sub } (nivelesJuego[].cartel). */
function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
    if (c) c.hidden = false;
    nube("", false);
    var pista = document.getElementById("pista");
    if (pista) pista.hidden = true;
    clearTimeout(tPista);
}

function ocultarCartel() {
    var c = document.getElementById("cartel");
    if (c) c.hidden = true;
}

// ------------------------------------------------------------------ sonidos de cada evento

function enlazarSonidos() {
    var b = bus();
    if (!b) return;
    b.on("pieza_seleccionada", function () { sfx("seleccion"); });
    b.on("pieza_arrastrada", function () { sfx("arrastre"); });
    b.on("pieza_rotada", function (d) { sfx("girar"); if (d.derecha) setTimeout(function () { sfx("derecha"); }, 160); });
    b.on("pieza_cerca_de_ranura", function (d) { sfx(d.orientacionOk === false ? "cercaGiro" : "cerca"); });
    b.on("pieza_ensamblada", function () { sfx("encaje"); setTimeout(function () { sfx("acierto"); }, 220); });
    b.on("conexion_incorrecta", function (d) { sfx(d.motivo === "fuera" ? "regreso" : d.motivo === "bloqueada" ? "bloqueada" : "suave"); });
    b.on("extremidad_completada", function () { setTimeout(function () { sfx("maquina"); }, 380); });
    b.on("escaner", function () { sfx("escaner"); });
    b.on("nivel_completado", function () { sfx("nivel"); setTimeout(function () { sfx("celebrar"); }, 700); });
}

// ------------------------------------------------------------------ arranque

document.addEventListener("DOMContentLoaded", function () {
    gameConfig = JSON.parse(readText("config.json?v=20261124c"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    var errores = R().validar(gameConfig);
    if (errores.length) console.warn("[Robot] config.json", errores);
    variante = R().sortearVariante(gameConfig);
    // pruebas: ?robot=clasico o ?robot=explorador fija el tipo (sin el parámetro, siempre al azar)
    var forzado = new URLSearchParams(location.search).get("robot");
    var tipoForzado = ((gameConfig.variantes || {}).tipos || []).filter(function (t) { return t.id === forzado; })[0];
    if (tipoForzado) {
        variante.tipo = tipoForzado.id;
        variante.tipoNombre = tipoForzado.nombre || "";
        variante.tipoSaludo = tipoForzado.saludo || "";
    }
    window.__varianteRobot = variante;
    sincronizarDialogoIntro3d();
    if (typeof TextoVoz !== "undefined" && TextoVoz.iniciar) {
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return null; },
            volumenFondo: 0.25
        });
    }
    enlazarMenus();
    enlazarSonidos();
    aplicarAccesibilidad();

    if (esc()) {
        esc().al("soltar", alSoltar);
        esc().al("seleccion", alSeleccion);
        esc().al("girar", alGirar);
        esc().al("giroSinPieza", alGiroSinPieza);
        esc().al("bloqueada", alBloqueada);
        esc().al("escaner", alEscaner);
        escenaLista = esc().montar(document.getElementById("escenario"), gameConfig, variante).then(function (ok) {
            if (!ok) console.warn("[Robot] la escena no se pudo montar");
            else cargarNivelEnEscena();
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
        if (window.SonidosRobot) window.SonidosRobot.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosRobot) window.SonidosRobot.detenerTodo();
    };
});
