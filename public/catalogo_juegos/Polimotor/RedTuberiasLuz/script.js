/**
 * ¡La Red de Tuberías! — flujo del juego (Polimotor, Transición 5-6 años, Habilidad y precisión).
 *
 * inicio → intro 3D → PedniaEdad → presentación (Zeus: «¡Alerta de conducción eléctrica!…») → demostración (la mano
 * conduce la gema hasta el primer punto de control y se levanta) → Zoe: «¡No despegues tu dedo…!» → «¡Comenzar a
 * jugar!» → 4 redes de tuberías cada vez más largas y sinuosas → el reactor se enciende → victoria compartida.
 *
 * Aquí no se decide si la gema avanza (ReglasTuberia) ni se dibuja (EscenarioTuberia): solo se enlazan pantallas,
 * voces, sonidos, ayudas y niveles. Nada resta: salirse o levantar el dedo detiene la gema y la devuelve al último
 * punto de control, y se sigue desde ahí.
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var nivelIdx = 0;
var hechos = 0;
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var tVozSoltar = 0;
var tVozFuera = 0;
var tVozToque = 0;
var turnoCp = 0;
var tomoAlgunaVez = false;
var volumenListo = false;
var escenaLista = null;
var regresoResolver = null;
var tMover = 0;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function esc() { return window.EscenarioTuberia && window.EscenarioTuberia.listo() ? window.EscenarioTuberia : null; }
function sfx(nombre) {
    var s = window.SonidosTuberia;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function redes() { return gameConfig.redes || []; }
function red() { return redes()[nivelIdx] || {}; }
/**
 * Red del nivel i generada al azar por ReglasTuberia.generar con los rangos de redes[i].aleatoria
 * (picos, codos, mesetas, checkpoints). Si no hay rangos o ninguna sirve, queda la red fija del config.
 */
function redAlAzar(i) {
    var def = redes()[i] || {};
    try {
        return window.ReglasTuberia && ReglasTuberia.generar ? ReglasTuberia.generar(def, juego()) : def;
    } catch (err) {
        console.warn("[Tuberías] red al azar", err);
        return def;
    }
}
function total() { return Math.max(1, redes().length); }
function vivo(tk) { return tk === token; }

function frase(lista, i) {
    if (!Array.isArray(lista)) return lista || "";
    return lista.length ? lista[i % lista.length] : "";
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
    var cartelVisible = !document.getElementById("cartel").hidden;
    var zoeEn = document.body.classList.contains("zoe-en");
    var zeusEn = document.body.classList.contains("zeus-en");
    // un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista breve arriba
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3800);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosTuberia) window.SonidosTuberia.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosTuberia) window.SonidosTuberia.agachar(false);
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
    if (vozActiva || ahora < vozLibreDesde) return false;
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2200);
    hablar(texto, pj, gesto || "celebra");
    return true;
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosTuberia) window.SonidosTuberia.agachar(false);
}

function mostrarPista(texto, pj, ms) {
    var caja = document.getElementById("pista");
    var p = document.getElementById("pista-texto");
    var im = document.getElementById("pista-cara");
    if (!caja || !p) return;
    p.textContent = (window.TextoVoz && TextoVoz.textoPlano) ? TextoVoz.textoPlano(texto) : texto;
    if (im) im.src = pj === "zeus" ? "../../img/zeus_normal.gif" : "../../img/zoe_normal.gif";
    caja.hidden = false;
    caja.classList.remove("sale");
    void caja.offsetWidth;
    caja.classList.add("sale");
    clearTimeout(tPista);
    tPista = setTimeout(function () { caja.hidden = true; }, ms || 2600);
}

/** Zoe y Zeus entran y salen caminando (MARCHA_MS = transición de style.css) con el clip "Caminar". */
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
    if (window.SonidosTuberia) {
        window.SonidosTuberia.desbloquear();
        window.SonidosTuberia.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosTuberia,
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

/** Un rato sin conducir: la gema destella, una luz dorada recorre el tramo siguiente y Zoe o Zeus lo recuerdan. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!jugando) return;
    tAyuda = setTimeout(function () {
        if (!jugando || !esc()) return;
        var st = esc().estado();
        if (st && st.estado !== "lista") { programarAyuda(4000); return; }
        if (acc().ayudaAutomatica) esc().pulsoAyuda();
        else esc().destelloGema();
        if (!tomoAlgunaVez) decirRapido(textos().pistaArrastra, "zeus", "senala");
        else decirRapido(textos().guiaZoe, "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 14000);
    }, ms || Number(juego().ayudaMs) || 11000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar en la red i (0..3).
 * opciones.demo   la mano enseña la conducción (solo en el nivel 1 si "Mostrar demostración" está activa)
 * opciones.boton  espera «¡Comenzar a jugar!» (nivel 1). Los demás niveles arrancan tras la presentación.
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    if (escenaLista) await escenaLista;
    var e = esc();
    if (!e || !vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(total() - 1, i | 0));
    jugando = false;
    turnoCp = 0;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosTuberia) window.SonidosTuberia.musica(false);
    e.terminarFiesta();
    e.entrada(false);
    // cada vez que se entra a un nivel la tubería es nueva (al azar, con la dificultad del nivel)
    e.cargar(redAlAzar(nivelIdx));
    e.niveles(total(), nivelIdx, hechos);
    aplicarAccesibilidad();
    document.body.classList.add("presentando", "demo-lock");

    try {
        if (nivelIdx === 0) {
            await Promise.all([e.presentar(), zeus(true)]);
            if (!vivo(tk)) return;
            await decir(textos().introZeus, "zeus", "saluda", 15000);
            if (!vivo(tk)) return;
            if (o.demo && acc().mostrarIntro !== false && window.TuberiaDemo) {
                enDemo = true;
                await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.TuberiaDemo.correr, apiDemo(tk)) : window.TuberiaDemo.correr(apiDemo(tk)));
                enDemo = false;
                if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
                if (!vivo(tk)) return;
            }
            e.reiniciarGema();
            zeus(false);
            await zoe(true);
            if (!vivo(tk)) return;
            await decir(textos().guiaZoe, "zoe", "senala", 6000);
            if (!vivo(tk)) return;
        } else {
            await e.presentar();
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Tuberías] presentación", err);
    }
    enDemo = false;
    document.body.classList.remove("demo-lock");
    if (!vivo(tk)) return;
    if (o.boton !== false) {
        var sigue = await esperarComenzar(tk);
        if (!vivo(tk) || !sigue) return;
    }
    zoe(false);
    zeus(false);
    document.body.classList.remove("presentando");
    document.body.classList.add("jugando");
    e.entrada(true);
    jugando = true;
    if (nivelIdx > 0 && red().instruccion) decir(red().instruccion, red().voz === "zeus" ? "zeus" : "zoe", "senala", 6000);
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
        var alClick = function () { sfx("toque"); cerrar(vivo(tk)); };
        btn.addEventListener("click", alClick);
        var vigia = setInterval(function () { if (!vivo(tk)) cerrar(false); }, 200);
    });
}

function apiDemo(tk) {
    var e = esc();
    return {
        preparar: function () { e.entrada(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk); },
        textoDemo: function () { return textos().demoZeus || ""; },
        gema: function () { var s = e.estado(); return { x: s.x, y: s.y }; },
        aPantalla: function (x, y) { return e.aPantalla(x, y); },
        punto: function (s) { return e.puntoEje(s); },
        sCheckpoint: function (i) { var r = e.red(); return r && r.checkpoints[i] ? r.checkpoints[i].s : 200; },
        tomar: function () { e.tomarDemo(); },
        mover: function (x, y) { e.moverDemo(x, y); },
        soltar: function () { e.soltarDemo(); },
        esperarRegreso: function () {
            return Promise.race([new Promise(function (r) { regresoResolver = r; }), sleep(3500)]).then(function () { regresoResolver = null; });
        },
        decir: function (texto, pj) { return decir(texto, pj, "senala", 9000); },
        terminar: function () { return Promise.resolve(); }
    };
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    hechos = 0;
    aplicarAccesibilidad();
    await entrar(0, { demo: true, boton: true });
}

// ------------------------------------------------------------------ eventos de la escena

function alTomar() {
    sfx("contacto");
    if (!jugando) return;
    tomoAlgunaVez = true;
    limpiarAyuda();
}

function alMover(info) {
    sfx("flujo", info && info.vel);
    var ahora = Date.now();
    if (jugando && ahora - tMover > 800) {
        tMover = ahora;
        limpiarAyuda();
    }
}

function alCheckpoint(info) {
    sfx("checkpoint");
    if (!jugando) return;
    decirRapido(frase(textos().checkpoint, turnoCp++), turnoCp % 2 ? "zoe" : "zeus", "celebra");
}

function alFuera() {
    sfx("flujo", 0);
    sfx("fuera");
    if (!jugando) return;
    var ahora = Date.now();
    if (ahora - tVozFuera > (Number(juego().vozFueraMs) || 9000)) {
        if (decirRapido(textos().fuera, "zoe", "senala")) tVozFuera = ahora;
    }
}

function alVuelve() { sfx("vuelve"); }

function alPerdida() {
    sfx("flujo", 0);
    if (!jugando) return;
    decirRapido(textos().perdida, "zeus", "senala");
}

function alSoltar() {
    sfx("flujo", 0);
    sfx("pausa");
    if (!jugando) return;
    var ahora = Date.now();
    // el recordatorio de Zoe, sin repetirlo a cada rato
    if (ahora - tVozSoltar > (Number(juego().vozSoltarMs) || 12000)) {
        tVozSoltar = ahora;
        vozActiva = null;
        vozLibreDesde = 0;
        decirRapido(textos().soltar || textos().guiaZoe, "zoe", "senala");
    }
}

function alRegreso() { sfx("regreso"); }

function alListaDeNuevo() {
    if (regresoResolver) regresoResolver();
    if (jugando) programarAyuda();
}

function alTocaFuera() {
    if (!jugando || !esc()) return;
    var st = esc().estado();
    if (!st || st.estado !== "lista") return;
    esc().destelloGema();
    sfx("toque");
    var ahora = Date.now();
    if (ahora - tVozToque > 7000 && decirRapido(textos().tocaGema, "zoe", "senala")) tVozToque = ahora;
}

function alMeta() {
    sfx("flujo", 0);
    if (enDemo || !jugando) return;
    var tk = token;
    jugando = false;
    if (nivelIdx + 1 < total()) completarNivel(tk);
    else completar(tk);
}

/** Red terminada: la gema entra al reactor, cartel del nivel, voz y la siguiente red. */
async function completarNivel(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    limpiarAyuda();
    if (e) e.entrada(false);
    if (e) await e.llegar();
    if (!vivo(tk)) return;
    hechos = Math.max(hechos, nivelIdx + 1);
    if (e) {
        e.niveles(total(), -1, hechos);
        e.ganarNivel(nivelIdx);
    }
    sfx("victoria");
    mostrarCartel(red().cartel || red().logro || "¡Muy bien!");
    await Promise.all([decir(red().logro, red().voz === "zeus" ? "zoe" : "zeus", "celebra", 5200), sleep(2600)]);
    if (!vivo(tk)) return;
    ocultarCartel();
    await fundir();
    if (!vivo(tk)) return;
    await entrar(nivelIdx + 1, { demo: false, boton: false });
}

function fundir() {
    var f = document.getElementById("fundido");
    if (!f) return sleep(300);
    f.classList.remove("va");
    void f.offsetWidth;
    f.classList.add("va");
    return sleep(700);
}

/** Última red: el reactor estalla en luz, el laboratorio se enciende, Zoe y Zeus felicitan y llega la victoria. */
async function completar(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    limpiarAyuda();
    if (e) e.entrada(false);
    if (e) await e.llegar();
    if (!vivo(tk)) return;
    hechos = total();
    if (e) {
        e.niveles(total(), -1, hechos);
        e.ganarNivel(nivelIdx);
    }
    sfx("victoria");
    mostrarCartel(red().cartel || textos().finalTitulo);
    await sleep(2400);
    if (!vivo(tk)) return;
    ocultarCartel();
    // cinemática final «La energía vuelve a la red» (franjas de cine, botones ocultos)
    if (window.SonidosTuberia) window.SonidosTuberia.musica(true);
    if (e) {
        try {
            await e.cinematica();
        } catch (err) {
            console.warn("[Tuberías] cinemática", err);
        }
    }
    document.body.classList.remove("cinematica");
    if (!vivo(tk)) return;
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    await decir(textos().finalVoz, "zoe", "final", 7000);
    if (!vivo(tk)) return;
    await decir(textos().finalVozZeus, "zeus", "final", 4000);
    if (!vivo(tk)) return;
    await sleep(300);
    if (!vivo(tk)) return;
    if (e) e.terminarFiesta();
    mostrarVictoria();
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = (textos().finalTitulo || "¡DOMINIO TÁCTIL TOTAL!") + "\n" + (textos().finalTexto || "");
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

/** texto: una frase, o { etiqueta, titulo, sub } (redes[].cartel). */
function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
    nube("zoe-nube", "zoe-nube-texto", "", false);
    nube("zeus-nube", "zeus-nube-texto", "", false);
    if (c) c.hidden = false;
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
    gameConfig = JSON.parse(readText("config.json?v=20261123azar"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    sincronizarDialogoIntro3d();
    if (typeof TextoVoz !== "undefined" && TextoVoz.iniciar) {
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return null; },
            volumenFondo: 0.25
        });
    }
    enlazarMenus();
    aplicarAccesibilidad();

    var E = window.EscenarioTuberia;
    if (E) {
        E.al("tomar", alTomar);
        E.al("mover", alMover);
        E.al("checkpoint", alCheckpoint);
        E.al("fuera", alFuera);
        E.al("vuelve", alVuelve);
        E.al("perdida", alPerdida);
        E.al("soltar", alSoltar);
        E.al("regreso", alRegreso);
        E.al("listaDeNuevo", alListaDeNuevo);
        E.al("tocaFuera", alTocaFuera);
        E.al("meta", alMeta);
        E.al("barrido", function () { sfx("barrido"); });
        E.al("gemaAparece", function () { sfx("aparece"); });
        E.al("conexion", function () { sfx("conexion"); });
        E.al("fuego", function () { sfx("fuego"); });
        E.al("cine", function (on) { document.body.classList.toggle("cinematica", !!on); });
        E.al("cineEvento", function (f) {
            if (f === "carga") sfx("carga");
            else if (f === "pulso") sfx("barrido");
            else if (f === "generador") sfx("conexion");
            else if (f === "ola") sfx("ola");
        });
        escenaLista = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Tuberías] la escena no se pudo montar");
            else {
                E.cargar(redAlAzar(0));
                E.niveles(total(), 0, 0);
            }
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
        if (window.SonidosTuberia) window.SonidosTuberia.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosTuberia) window.SonidosTuberia.detenerTodo();
    };
});
