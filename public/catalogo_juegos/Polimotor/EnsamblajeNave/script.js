/**
 * El Ensamblaje de la Nave — flujo del juego.
 * inicio → intro 3D → PedniaEdad → presentación (Zoe) → demostración (Zeus + mano) → «¡Comenzar a jugar!»
 * → nivel 1 (4 piezas) → nivel 2 (5) → nivel 3 (6) → despegue → victoria compartida (final/final.js).
 *
 * Aquí no se decide si un soltado es correcto (ReglasNave) ni se dibuja (EscenarioNave).
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var colocadas = {};
var intentos = {};
var casiSeguidos = {};
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

function R() { return window.ReglasNave; }
function esc() { return window.EscenarioNave || null; }
function sfx(nombre) {
    var s = window.SonidosNave;
    if (s && typeof s[nombre] === "function") s[nombre]();
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
/** Piezas del nivel en juego (4, 5 o 6), con su destino en la nave. */
function piezasNivel() { return R().piezasNivel(gameConfig, nivelIdx); }
function nivel() { return R().nivel(gameConfig, nivelIdx) || {}; }
function totalNiveles() { return Math.max(1, R().niveles(gameConfig).length); }

/** Carga en la escena la nave del nivel, con un reparto nuevo de la bandeja. */
function cargarNivelEnEscena() {
    var e = esc();
    if (!e) return;
    var lista = piezasNivel();
    var n = nivel();
    var reparto = R().repartir(lista.map(function (p) { return p.id; }), e.numHuecos(lista.length));
    e.cargar({
        nave: n.nave,
        nombreNave: n.nombreNave,
        titulo: n.titulo,
        escala: n.escala,
        piezas: lista
    }, reparto);
    e.mostrarProgreso(acc().mostrarProgreso !== false);
}
function vivo(tk) { return tk === token; }

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
    var cartelVisible = !document.getElementById("cartel").hidden;
    var zoeEn = document.body.classList.contains("zoe-en");
    var zeusEn = document.body.classList.contains("zeus-en");
    // Un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista breve.
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3600);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosNave) window.SonidosNave.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosNave) window.SonidosNave.agachar(false);
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
    if (window.SonidosNave) window.SonidosNave.agachar(false);
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
    if (window.SonidosNave) {
        window.SonidosNave.desbloquear();
        window.SonidosNave.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosNave,
            fondoPorDefecto: acc().volumenFondo || 35,
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

// ------------------------------------------------------------------ ayuda progresiva

function limpiarAyuda() {
    clearTimeout(tAyuda);
    tAyuda = null;
    if (esc()) esc().limpiarAyuda();
}

function pendientes() {
    return piezasNivel().filter(function (p) { return !colocadas[p.id]; });
}

/** Sin encajar nada durante un rato: un camino de luz y el contorno correcto brillan, y Zoe o Zeus dan una pista. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!acc().ayudaAutomatica) return;
    tAyuda = setTimeout(function () {
        if (!jugando) return;
        var lista = pendientes();
        if (!lista.length) return;
        var p = lista[turnoAyuda % lista.length];
        turnoAyuda += 1;
        if (esc()) esc().pulsoAyuda(p.id);
        if (turnoAyuda % 2) decirRapido(textos().guiaZeus, "zeus", "senala");
        else decirRapido(p.pista || textos().ayudaZoe, "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 15000);
    }, ms || Number(juego().ayudaMs) || 12000);
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
    colocadas = {};
    intentos = {};
    casiSeguidos = {};
    fuerasSeguidos = 0;
    turnoAcierto = 0;
    turnoAyuda = 0;
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosNave) window.SonidosNave.musica(false);
    zoe(false);
    zeus(false);
    e.terminarFiesta();
    e.arrastre(false);
    cargarNivelEnEscena();
    aplicarAccesibilidad();

    document.body.classList.add("presentando");
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.NaveDemo;
    try {
        await zoe(true);
        if (!vivo(tk)) return;
        if (o.presentar !== false) {
            await decir(nivel().zoe || textos().introZoe, "zoe", nivelIdx ? "senala" : "saluda", 9000);
            if (!vivo(tk)) return;
        }
        if (conDemo) {
            // Zoe sale caminando mientras Zeus entra caminando por el otro lado
            zoe(false);
            await zeus(true);
            if (!vivo(tk)) return;
            enDemo = true;
            document.body.classList.add("demo-lock");
            await window.NaveDemo.correr(apiDemo(tk));
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
            if (!vivo(tk)) return;
            await decir(textos().guiaZeus, "zeus", "senala", 5200);
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Nave] presentación", err);
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
    var lista = piezasNivel();
    var id = (gameConfig.demo && gameConfig.demo.pieza) || "cabina";
    if (!lista.some(function (p) { return p.id === id; })) id = lista[0].id;
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk); },
        textoDemo: function () { return textos().demoZeus || ""; },
        pieza: function () { return id; },
        punto: function (pid) { return e.puntoCliente(pid); },
        destino: function () { return e.puntoMoldeCliente(id); },
        tomar: function (pid) { e.tomarDemo(pid); sfx("seleccion"); },
        mover: function (pid, x, y) { e.ponerCliente(pid, x, y); sfx("arrastre"); },
        entregar: async function (pid) {
            sfx("encaje");
            await e.encajar(pid);
            sfx("acierto");
            await sleep(900);
            await e.deshacer(pid);
            e.finDemo();
        },
        decir: function (texto, pj) { return decir(texto, pj, "senala", 7000); },
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
    if (!jugando || colocadas[datos.id]) {
        if (!colocadas[datos.id]) await e.devolver(datos.id);
        return;
    }
    var res = R().evaluar(datos);
    var def = R().pieza(gameConfig, datos.id);
    if (res.acierto) {
        colocadas[datos.id] = true;
        fuerasSeguidos = 0;
        casiSeguidos[datos.id] = 0;
        var ultimo = R().completo(colocadas, piezasNivel());
        if (ultimo) jugando = false;
        sfx("encaje");
        await e.encajar(datos.id);
        if (!vivo(tk)) return;
        sfx("acierto");
        if (ultimo) {
            if (nivelIdx + 1 < totalNiveles()) await completarNivel(tk);
            else await completar(tk);
            return;
        }
        decirRapido(R().frase(textos().aciertos, turnoAcierto++), turnoAcierto % 2 ? "zoe" : "zeus");
        programarAyuda();
        return;
    }
    if (res.motivo === "casi") {
        // la pieza correcta quedó cerca: el contorno parpadea y se anima a afinar el pulso
        sfx("suave");
        fuerasSeguidos = 0;
        casiSeguidos[datos.id] = (casiSeguidos[datos.id] || 0) + 1;
        await e.devolver(datos.id, res.destino, "casi");
        if (!vivo(tk)) return;
        if (casiSeguidos[datos.id] >= (Number(juego().casiParaPista) || 2)) {
            casiSeguidos[datos.id] = 0;
            decirRapido(textos().guiaZeus, "zeus", "senala");
            if (acc().ayudaAutomatica) e.pulsoAyuda(datos.id);
        } else {
            decirRapido(textos().casi, "zoe", "senala");
        }
        programarAyuda();
        return;
    }
    if (res.motivo === "otraPieza" || res.motivo === "ocupado") {
        sfx("suave");
        fuerasSeguidos = 0;
        intentos[datos.id] = (intentos[datos.id] || 0) + 1;
        await e.devolver(datos.id, res.destino);
        if (!vivo(tk)) return;
        // al segundo intento con la misma pieza la pista ya describe su forma y muestra el camino
        if (intentos[datos.id] >= 2) {
            decirRapido(def && def.pista ? def.pista : textos().otraPieza, "zoe", "senala");
            if (acc().ayudaAutomatica) e.pulsoAyuda(datos.id);
            intentos[datos.id] = 0;
        } else {
            decirRapido(textos().otraPieza, "zoe", "senala");
        }
        programarAyuda();
        return;
    }
    // fuera del plano: vuelve sin decir nada; si se repite, una indicación amable
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

/** Nivel 1 o 2 terminado: la nave se enciende y flota, Zoe y Zeus felicitan y pasa a la siguiente nave. */
async function completarNivel(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    sfx("encendido");
    mostrarCartel(nivel().cartel || nivel().listo || "¡Muy bien!");
    if (e) await e.celebrar(true);
    if (!vivo(tk)) return;
    sfx("victoria");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    await decir(nivel().listo, "zoe", "celebra", 4600);
    if (!vivo(tk)) return;
    ocultarCartel();
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
    sfx("encendido");
    if (window.SonidosNave) window.SonidosNave.musica(true);
    mostrarCartel(nivel().cartel || nivel().listo || textos().listo || "¡Nave lista para despegar!");
    await sleep(2400);
    if (!vivo(tk)) return;
    ocultarCartel();
    // cinemática final «Viaje al espacio» (franjas de cine, botones ocultos)
    if (e) {
        try {
            await e.cinematica();
        } catch (err) {
            console.warn("[Nave] cinemática", err);
        }
    }
    document.body.classList.remove("cinematica");
    mostrarCuenta(null);
    if (!vivo(tk)) return;
    sfx("victoria");
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    await decir(textos().finalVoz, "zoe", "final", 6000);
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
    if (texto) texto.textContent = (textos().finalTitulo || "¡SÚPER INGENIERO!") + "\n" + (textos().finalTexto || "");
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

/** texto: una frase, o { etiqueta, titulo, sub } (nivelesJuego[].cartel). */
function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
    if (c) c.hidden = false;
    var pista = document.getElementById("pista");
    if (pista) pista.hidden = true;
    clearTimeout(tPista);
}

/** Cuenta regresiva de la cinemática: 3, 2, 1 y «¡DESPEGUE!» (n = 0). null la oculta. */
var tCuenta = null;
function mostrarCuenta(n) {
    var c = document.getElementById("cuenta-cine");
    if (!c) return;
    clearTimeout(tCuenta);
    if (n === null || n === undefined) { c.hidden = true; return; }
    c.textContent = n > 0 ? String(n) : (textos().despegue || "¡DESPEGUE!");
    c.classList.toggle("palabra", !(n > 0));
    c.hidden = false;
    c.classList.remove("late");
    void c.offsetWidth;
    c.classList.add("late");
    if (!(n > 0)) tCuenta = setTimeout(function () { c.hidden = true; }, 1300);
}

function ocultarCartel() {
    var c = document.getElementById("cartel");
    if (c) c.hidden = true;
}

// ------------------------------------------------------------------ arranque

document.addEventListener("DOMContentLoaded", function () {
    gameConfig = JSON.parse(readText("config.json?v=20261123b"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    var errores = R().validar(gameConfig);
    if (errores.length) console.warn("[Nave] config.json", errores);
    sincronizarDialogoIntro3d();
    if (typeof TextoVoz !== "undefined" && TextoVoz.iniciar) {
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return null; },
            volumenFondo: 0.25
        });
    }
    enlazarMenus();
    aplicarAccesibilidad();

    if (esc()) {
        esc().al("tomar", alTomar);
        esc().al("arrastrar", alArrastrar);
        esc().al("cerca", alCerca);
        esc().al("soltar", alSoltar);
        esc().al("despegue", function () { sfx("despegue"); });
        esc().al("cine", function (on) { document.body.classList.toggle("cinematica", !!on); });
        esc().al("cuenta", function (n) {
            mostrarCuenta(n);
            if (window.SonidosNave && window.SonidosNave.cuenta) window.SonidosNave.cuenta(n);
        });
        esc().al("hiper", function () { sfx("hiperespacio"); });
        esc().al("fuego", function () { sfx("fuego"); });
        escenaLista = esc().montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Nave] la escena no se pudo montar");
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
        if (window.SonidosNave) window.SonidosNave.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosNave) window.SonidosNave.detenerTodo();
    };
});
