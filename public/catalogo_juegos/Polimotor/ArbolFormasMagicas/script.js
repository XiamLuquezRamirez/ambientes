/**
 * El Árbol de las Formas Mágicas — flujo del juego.
 * inicio → intro 3D → PedniaEdad → presentación (Zoe) → demostración (Zeus + mano) → «¡Comenzar a jugar!»
 * → partida (3 frutos) → celebración del árbol → victoria compartida (final/final.js).
 *
 * Aquí no se decide si un soltado es correcto (ReglasArbol) ni se dibuja (EscenarioArbol).
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var colocados = {};
var intentos = {};
var fuerasSeguidos = 0;
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var turnoAcierto = 0;
var turnoAyuda = 0;
var volumenListo = false;
var escenaLista = null;
var nivelIdx = 0;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function R() { return window.ReglasArbol; }
function esc() { return window.EscenarioArbol || null; }
function sfx(nombre) {
    var s = window.SonidosArbol;
    if (s && typeof s[nombre] === "function") s[nombre]();
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function frutos() { return gameConfig.frutos || []; }
/** Frutos del nivel en juego (3, 4 o 5). */
function frutosNivel() { return R().frutosNivel(gameConfig, nivelIdx); }
function nivel() { return R().nivel(gameConfig, nivelIdx) || {}; }
function totalNiveles() { return Math.max(1, R().niveles(gameConfig).length); }

/** Carga en la escena los frutos y moldes del nivel, con un reparto nuevo de lugares. */
function cargarNivelEnEscena() {
    var e = esc();
    if (!e) return;
    var lista = frutosNivel();
    var formas = lista.map(function (f) { return f.forma; });
    var reparto = R().repartir(lista.map(function (f) { return f.id; }), e.numLugares(lista.length));
    e.cargar(formas, reparto);
}
function vivo(tk) { return tk === token; }

// ------------------------------------------------------------------ voces

function guiaDe(pj) {
    var g = pj === "zeus" ? window.Guia3DZeus : window.Guia3D;
    return g && g.listo && g.listo() ? g : null;
}

function gestoGuia(gesto, pj) {
    var g = guiaDe(pj || "zoe");
    if (g && gesto) g.gesto(gesto);
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
    var cartelVisible = !document.getElementById("cartel").hidden;
    var zoeEn = document.body.classList.contains("zoe-en");
    var zeusEn = document.body.classList.contains("zeus-en");
    // Un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista de arriba.
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3400);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosArbol) window.SonidosArbol.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosArbol) window.SonidosArbol.agachar(false);
    };
    var p = Promise.resolve(TextoVoz.hablar(texto, quien)).then(fin, fin);
    vozActiva = p;
    p.then(function () { if (vozActiva === p) vozActiva = null; });
    return p;
}

/** Espera la voz que suena y luego habla (con tope, por si el servidor de voz no responde). */
function decir(texto, pj, gesto, tope) {
    var tk = token;
    var espera = vozActiva ? Promise.race([vozActiva, sleep(900)]) : Promise.resolve();
    return espera.then(function () {
        if (!vivo(tk)) return;
        vozActiva = null;
        return Promise.race([hablar(texto, pj, gesto), sleep(tope || 3200)]);
    });
}

/** Comentario breve durante la partida: se omite si ya hay otra voz sonando. */
function decirRapido(texto, pj, gesto) {
    var ahora = Date.now();
    if (vozActiva || ahora < vozLibreDesde) return;
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2200);
    hablar(texto, pj, gesto || "celebra");
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosArbol) window.SonidosArbol.agachar(false);
}

function mostrarPista(texto, pj, ms) {
    var caja = document.getElementById("pista");
    var p = document.getElementById("pista-texto");
    var img = document.getElementById("pista-cara");
    if (!caja || !p) return;
    p.textContent = (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto;
    if (img) img.src = pj === "zeus" ? "../../img/zeus_normal.gif" : "../../img/zoe_normal.gif";
    caja.hidden = false;
    caja.classList.remove("sale");
    void caja.offsetWidth;
    caja.classList.add("sale");
    clearTimeout(tPista);
    tPista = setTimeout(function () { caja.hidden = true; }, ms || 2600);
}

/**
 * Zoe y Zeus entran y salen caminando, no deslizándose: mientras el CSS los lleva de un lado a
 * otro (MARCHA_MS, el mismo tiempo que la transición de style.css) el modelo 3D pone el clip
 * "Caminar" y mira hacia donde va; al llegar vuelve a quedarse quieto mirando al frente.
 * Devuelve una Promise que se cumple cuando termina de caminar.
 */
var MARCHA_MS = 1500;
var marcha = { zoe: null, zeus: null };

function caminarGuia(pj, entra) {
    clearTimeout(marcha[pj]);
    var g = guiaDe(pj);
    // Zoe vive a la izquierda: entra hacia la derecha y sale hacia la izquierda. Zeus, al revés.
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
    if (window.SonidosArbol) {
        window.SonidosArbol.desbloquear();
        window.SonidosArbol.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosArbol,
            fondoPorDefecto: acc().volumenFondo || 40,
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

// ------------------------------------------------------------------ progreso y accesibilidad

function montarProgreso() {
    var caja = document.getElementById("progreso-frutos");
    if (!caja || !window.DibujosArbol) return;
    caja.innerHTML = "";
    frutosNivel().forEach(function (f) {
        var slot = document.createElement("span");
        slot.className = "pf-slot";
        slot.dataset.id = f.id;
        slot.title = f.nombre;
        slot.innerHTML = '<img class="pf-silueta" alt="" src="' + DibujosArbol.urlSilueta(f.forma) + '">' +
            '<img class="pf-fruto" alt="' + f.nombre + '" src="' + DibujosArbol.urlFruto(f.forma) + '">';
        caja.appendChild(slot);
    });
}

function pintarProgreso(recien) {
    var total = frutosNivel().length;
    var hechos = Object.keys(colocados).length;
    var etiqueta = document.getElementById("progreso-nivel");
    if (etiqueta) etiqueta.textContent = nivel().titulo || ("Nivel " + (nivelIdx + 1));
    document.querySelectorAll("#progreso-frutos .pf-slot").forEach(function (s) {
        var lleno = !!colocados[s.dataset.id];
        s.classList.toggle("lleno", lleno);
        if (recien && s.dataset.id === recien) {
            s.classList.remove("pop");
            void s.offsetWidth;
            s.classList.add("pop");
        }
    });
    var num = document.getElementById("progreso-num");
    if (num) num.textContent = hechos + " / " + total;
    var barra = document.getElementById("progreso");
    if (barra) {
        barra.setAttribute("aria-valuenow", String(hechos));
        barra.setAttribute("aria-valuemax", String(total));
    }
}

function aplicarAccesibilidad() {
    document.body.classList.toggle("alto-contraste", !!acc().altoContraste);
    document.body.classList.toggle("sin-progreso", acc().mostrarProgreso === false);
    var esp = Number(acc().letterSpacing);
    document.documentElement.style.setProperty("--letter-spacing", (isFinite(esp) ? esp : 1) + "px");
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

// ------------------------------------------------------------------ ayuda progresiva

function limpiarAyuda() {
    clearTimeout(tAyuda);
    tAyuda = null;
    if (esc()) esc().limpiarAyuda();
}

function pendientes() {
    return frutosNivel().filter(function (f) { return !colocados[f.id]; });
}

/** Sin colocar nada durante un rato: un camino de puntos y el molde correcto brillan, y Zoe da una pista. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!acc().ayudaAutomatica) return;
    tAyuda = setTimeout(function () {
        if (!jugando) return;
        var lista = pendientes();
        if (!lista.length) return;
        var f = lista[turnoAyuda % lista.length];
        turnoAyuda += 1;
        if (esc()) esc().pulsoAyuda(f.id);
        decirRapido(turnoAyuda % 2 ? textos().ayudaZoe : f.pista, "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 14000);
    }, ms || Number(juego().ayudaMs) || 11000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar en el nivel i (0, 1 o 2).
 * opciones.demo   la mano enseña el gesto (solo en el nivel 1 y si "Mostrar demostración" está activa)
 * opciones.boton  espera «¡Comenzar a jugar!» (nivel 1). Los niveles 2 y 3 arrancan tras la presentación.
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    var e = esc();
    if (!e) return;
    if (escenaLista) await escenaLista;
    if (!vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(totalNiveles() - 1, i | 0));
    colocados = {};
    intentos = {};
    fuerasSeguidos = 0;
    turnoAcierto = 0;
    turnoAyuda = 0;
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosArbol) window.SonidosArbol.musica(false);
    zoe(false);
    zeus(false);
    e.terminarFiesta();
    e.arrastre(false);
    cargarNivelEnEscena();
    montarProgreso();
    pintarProgreso();
    aplicarAccesibilidad();

    document.body.classList.add("presentando");
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.ArbolDemo;
    try {
        await zoe(true);
        if (!vivo(tk)) return;
        if (o.presentar !== false) {
            await decir(nivel().zoe || textos().introZoe, "zoe", nivelIdx ? "senala" : "saluda", 7000);
            if (!vivo(tk)) return;
        }
        if (conDemo) {
            // Zoe sale caminando mientras Zeus entra caminando por el otro lado
            zoe(false);
            await zeus(true);
            if (!vivo(tk)) return;
            enDemo = true;
            document.body.classList.add("demo-lock");
            await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.ArbolDemo.correr, apiDemo(tk)) : window.ArbolDemo.correr(apiDemo(tk)));
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
            if (!vivo(tk)) return;
            zeus(false);
            await zoe(true);
            if (!vivo(tk)) return;
        }
        if (nivelIdx === 0) await decir(textos().ayudaZoe, "zoe", "senala", 5200);
    } catch (err) {
        console.warn("[Árbol] presentación", err);
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
    zoe(false);
    zeus(false);
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
        // el globo de Zoe ya se dijo: que no tape ningún fruto mientras se espera el botón
        nube("zoe-nube", "zoe-nube-texto", "", false);
        nube("zeus-nube", "zeus-nube-texto", "", false);
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
    var id = (gameConfig.demo && gameConfig.demo.fruto) || "manzana";
    var def = R().fruto(gameConfig, id) || frutosNivel()[0];
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk); },
        textoDemo: function () { return textos().demoZeus || ""; },
        fruto: function () { return def.id; },
        punto: function (fid) { return e.puntoCliente(fid); },
        destino: function () { return e.puntoMoldeCliente(def.forma); },
        tomar: function (fid) { e.tomarDemo(fid); sfx("seleccion"); },
        mover: function (fid, x, y) { e.ponerCliente(fid, x, y); sfx("arrastre"); },
        entregar: async function (fid) {
            sfx("encaje");
            await e.encajar(fid);
            sfx("acierto");
            await sleep(900);
            await e.deshacer(fid);
            e.finDemo();
        },
        decir: function (texto, pj) { return decir(texto, pj, "senala", 6000); },
        terminar: function () { e.finDemo(); return Promise.resolve(); }
    };
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    aplicarAccesibilidad();
    await entrar(0, { presentar: true, demo: true, boton: true });
}

function alTomar() {
    if (!jugando) return;
    limpiarAyuda();
    sfx("seleccion");
}

function alArrastrar() { sfx("arrastre"); }
function alCerca() { if (jugando) sfx("cerca"); }

async function alSoltar(datos) {
    var tk = token;
    var e = esc();
    if (!e || !datos) return;
    if (!jugando || colocados[datos.id]) {
        if (!colocados[datos.id]) await e.devolver(datos.id);
        return;
    }
    var res = R().evaluar(datos);
    if (res.acierto) {
        colocados[datos.id] = true;
        fuerasSeguidos = 0;
        var ultimo = R().completo(colocados, gameConfig, frutosNivel());
        if (ultimo) jugando = false;
        sfx("encaje");
        await e.encajar(datos.id);
        if (!vivo(tk)) return;
        sfx("acierto");
        pintarProgreso(datos.id);
        if (ultimo) {
            if (nivelIdx + 1 < totalNiveles()) await completarNivel(tk);
            else await completar(tk);
            return;
        }
        decirRapido(R().frase(textos().aciertos, turnoAcierto++), turnoAcierto % 2 ? "zoe" : "zeus");
        programarAyuda();
        return;
    }
    if (res.motivo === "otraForma" || res.motivo === "ocupado") {
        sfx("suave");
        fuerasSeguidos = 0;
        intentos[datos.id] = (intentos[datos.id] || 0) + 1;
        await e.devolver(datos.id, res.molde);
        if (!vivo(tk)) return;
        // al segundo intento con el mismo fruto la pista ya nombra su forma y muestra el camino
        if (intentos[datos.id] >= 2) {
            var def = R().fruto(gameConfig, datos.id);
            decirRapido(def && def.pista ? def.pista : textos().otraForma, "zoe", "senala");
            if (acc().ayudaAutomatica && e) e.pulsoAyuda(datos.id);
            intentos[datos.id] = 0;
        } else {
            decirRapido(textos().otraForma, "zoe", "senala");
        }
        programarAyuda();
        return;
    }
    // fuera de los moldes: vuelve sin decir nada; si se repite, una indicación amable
    sfx("regreso");
    fuerasSeguidos += 1;
    await e.devolver(datos.id);
    if (!vivo(tk)) return;
    if (fuerasSeguidos >= (Number(juego().fuerasParaPista) || 2)) {
        fuerasSeguidos = 0;
        decirRapido(textos().fuera, "zoe", "senala");
    }
    programarAyuda();
}

/** Nivel 1 o 2 terminado: fiesta corta, cartel, Zoe y Zeus felicitan y pasa al siguiente. */
async function completarNivel(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    sfx("victoria");
    mostrarCartel(nivel().listo || "¡Muy bien!");
    if (e) await e.celebrar(true);
    if (!vivo(tk)) return;
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    await decir(nivel().listo, "zoe", "celebra", 4200);
    if (!vivo(tk)) return;
    ocultarCartel();
    // se despiden caminando antes del cambio de nivel
    await Promise.all([zoe(false), zeus(false)]);
    if (!vivo(tk)) return;
    await fundir();
    if (!vivo(tk)) return;
    if (e) e.terminarFiesta();
    await entrar(nivelIdx + 1, { presentar: true, demo: false, boton: false });
}

function fundir() {
    var f = document.getElementById("fundido");
    if (!f) return sleep(300);
    f.classList.remove("va");
    void f.offsetWidth;
    f.classList.add("va");
    return sleep(700);
}

async function completar(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    sfx("victoria");
    if (window.SonidosArbol) window.SonidosArbol.musica(true);
    mostrarCartel(nivel().listo || textos().listo || "¡La magia volvió al árbol!");
    if (e) await e.celebrar();
    if (!vivo(tk)) return;
    ocultarCartel();
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    await decir(textos().finalVoz, "zoe", "final", 5200);
    if (!vivo(tk)) return;
    await decir(textos().finalVozZeus, "zeus", "final", 4000);
    if (!vivo(tk)) return;
    await sleep(300);
    if (!vivo(tk)) return;
    mostrarVictoria();
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = (textos().finalTitulo || "¡ESPECTACULAR!") + "\n" + (textos().finalTexto || "");
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

function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var t = document.getElementById("cartel-titulo");
    if (t) t.textContent = texto || "";
    if (c) c.hidden = false;
    // un solo mensaje a la vez: la pista breve no se queda encima del cartel
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
    gameConfig = JSON.parse(readText("config.json?v=20261121d"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    var errores = R().validar(gameConfig);
    if (errores.length) console.warn("[Árbol] config.json", errores);
    sincronizarDialogoIntro3d();
    if (typeof TextoVoz !== "undefined" && TextoVoz.iniciar) {
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return null; },
            volumenFondo: 0.25
        });
    }
    enlazarMenus();
    aplicarAccesibilidad();
    montarProgreso();
    pintarProgreso();

    if (esc()) {
        esc().al("tomar", alTomar);
        esc().al("arrastrar", alArrastrar);
        esc().al("cerca", alCerca);
        esc().al("soltar", alSoltar);
        escenaLista = esc().montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Árbol] la escena no se pudo montar");
            else cargarNivelEnEscena();
            return ok;
        });
    }

    var on = function (id, fn) {
        var b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    on("btn-empecemos", empecemosJuego);
    on("btn-omitir-intro3d", function () { window.dispatchEvent(new CustomEvent("intro3d-omitir")); empezarJuegoTrasIntro(); });
    on("btn-continuar-intro3d", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () { if (esc()) esc().reacomodar(); });
    window.addEventListener("pagehide", function () {
        if (window.SonidosArbol) window.SonidosArbol.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosArbol) window.SonidosArbol.detenerTodo();
    };
});
