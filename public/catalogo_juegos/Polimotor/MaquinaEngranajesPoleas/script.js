/**
 * La Máquina de Engranajes y Poleas — flujo del juego.
 * inicio → intro 3D → PedniaEdad → presentación (Zeus presenta, Zoe explica) → demostración (mano) →
 * «¡EMPEZAR!» → 4 máquinas sorteadas del catálogo de 20, una por grado (3 ruedas; 4 ruedas;
 * 5 ruedas + 2 poleas + 1 correa; 6 ruedas + 3 poleas + 2 correas) → en cada una se baja la palanca del panel cuando todo está ensamblado → al final,
 * la gran fábrica cobra vida y la victoria compartida.
 *
 * Aquí no se decide si un soltado es correcto (ReglasMaquina) ni se dibuja (EscenarioMaquina). Las
 * reacciones del taller cuelgan de EventosMaquina; este archivo conecta voces, sonidos y niveles.
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var variante = null;
var geo = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var intentos = {};
var fuerasSeguidos = 0;
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var turnoAcierto = 0;
var turnoZeus = 0;
var turnoAyuda = 0;
var seleccionesNivel = 0;
var puestasNivel = 0;
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
function R() { return window.ReglasMaquina; }
function esc() { return window.EscenarioMaquina || null; }
function bus() { return window.EventosMaquina; }
function sfx(nombre, a) {
    var s = window.SonidosMaquina;
    if (s && typeof s[nombre] === "function") s[nombre](a);
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function nivel() { return R().nivel(gameConfig, nivelIdx) || {}; }
function totalNiveles() { return Math.max(1, R().niveles(gameConfig).length); }
function vivo(tk) { return tk === token; }
function puestos() { return esc() ? esc().puestos() : {}; }

/** Carga el nivel en la escena: ejes nuevos en el tablero y piezas barajadas en la bandeja. */
function cargarNivelEnEscena() {
    var e = esc();
    if (!e) return;
    geo = R().geometria(gameConfig, nivel());
    e.cargar({
        indice: nivelIdx,
        total: totalNiveles(),
        nivel: nivel(),
        geo: geo,
        piezas: R().barajar(R().piezas(geo))
    });
    e.mostrarProgreso(acc().mostrarProgreso !== false);
}

// ------------------------------------------------------------------ voces de Zoe y Zeus

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
    caja.classList.remove("nueva");
    void caja.offsetWidth;
    caja.classList.add("nueva");
}

function hablar(texto, pj, gesto) {
    var quien = pj === "zeus" ? "zeus" : "zoe";
    var cartelVisible = !document.getElementById("cartel").hidden;
    var zoeEn = document.body.classList.contains("zoe-en");
    var zeusEn = document.body.classList.contains("zeus-en");
    // un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista de arriba
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3800);
    var g = guiaDe(quien);
    if (gesto && g) g.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosMaquina) window.SonidosMaquina.agachar(true);
    if (g) g.hablar(true);
    var fin = function () {
        var gg = guiaDe(quien);
        if (gg) gg.hablar(false);
        if (window.SonidosMaquina) window.SonidosMaquina.agachar(false);
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

/** Comentario breve durante la partida: se omite si ya hay otra voz sonando (salvo `forzar`). */
function decirRapido(texto, pj, gesto, forzar) {
    var ahora = Date.now();
    if (!texto) return;
    if (!forzar && (vozActiva || ahora < vozLibreDesde)) return;
    if (forzar && typeof TextoVoz !== "undefined" && TextoVoz.detener) TextoVoz.detener();
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2300);
    hablar(texto, pj || "zoe", gesto || "celebra");
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosMaquina) window.SonidosMaquina.agachar(false);
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
 * Zoe (izquierda) y Zeus (derecha) entran y salen caminando: mientras el CSS los lleva
 * (MARCHA_MS = la transición de style.css) el modelo 3D camina y mira hacia donde va.
 */
var MARCHA_MS = 1500;
var marcha = { zoe: null, zeus: null };

function moverGuia(pj, on) {
    var clase = pj === "zoe" ? "zoe-en" : "zeus-en";
    var estaba = document.body.classList.contains(clase);
    document.body.classList.toggle(clase, !!on);
    if (!on) nube(pj + "-nube", pj + "-nube-texto", "", false);
    if (estaba === !!on) return Promise.resolve();
    clearTimeout(marcha[pj]);
    var g = guiaDe(pj);
    var haciaDerecha = (pj === "zoe") === !!on;
    if (g) { g.mirar(haciaDerecha ? "derecha" : "izquierda"); g.caminar(true); }
    return new Promise(function (resolve) {
        marcha[pj] = setTimeout(function () {
            marcha[pj] = null;
            var gg = guiaDe(pj);
            if (gg) { gg.caminar(false); gg.mirar("frente"); }
            resolve();
        }, MARCHA_MS);
    });
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
    if (window.SonidosMaquina) {
        window.SonidosMaquina.desbloquear();
        window.SonidosMaquina.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosMaquina,
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

/** El destino que señala la ayuda (el que le sirve a la pieza elegida si hay uno; si no, el siguiente). */
function metaActual() {
    var sel = esc() ? esc().seleccionada() : null;
    return R().siguiente(geo, puestos(), sel ? sel.tipo : null, sel ? sel.talla : null);
}

/** Sin ensamblar nada durante un rato: el eje que sigue destella y Zoe dice qué pieza va y dónde. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!acc().ayudaAutomatica) return;
    tAyuda = setTimeout(function () {
        if (!jugando) return;
        var meta = metaActual();
        if (!meta) return;
        turnoAyuda += 1;
        if (esc()) esc().pista(meta.id);
        sfx("pista");
        decirRapido(turnoAyuda % 3 === 0 ? textos().ayudaZoe : R().pista(gameConfig, meta), "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 17000);
    }, ms || Number(juego().ayudaMs) || 14000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar en el nivel i (0..3).
 * opciones.demo   la mano enseña el gesto (solo nivel 1 y si "Mostrar demostración" está activa)
 * opciones.boton  espera «¡EMPEZAR!» (nivel 1). Los demás arrancan tras la presentación.
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    var e = esc();
    if (!e) return;
    if (escenaLista) await escenaLista;
    if (!vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(totalNiveles() - 1, i | 0));
    intentos = {};
    fuerasSeguidos = 0;
    turnoAyuda = 0;
    seleccionesNivel = 0;
    puestasNivel = 0;
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    ocultarMarcha();
    if (window.SonidosMaquina) { window.SonidosMaquina.musica(false); window.SonidosMaquina.motor(false); }
    e.arrastre(false);
    cargarNivelEnEscena();
    aplicarAccesibilidad();
    e.aparecer();

    document.body.classList.add("presentando");
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.MaquinaDemo;
    try {
        // Zeus presenta la máquina y sale; Zoe explica y se queda a acompañar
        await zeus(true);
        if (!vivo(tk)) return;
        await decir(nivel().zeus, "zeus", nivelIdx ? "senala" : "saluda", 14000);
        if (!vivo(tk)) return;
        var sale = zeus(false);
        await zoe(true);
        await sale;
        if (!vivo(tk)) return;
        await decir(nivel().zoe || R().pista(gameConfig, R().siguiente(geo, {})), "zoe", nivelIdx ? "senala" : "saluda", 9000);
        if (!vivo(tk)) return;
        if (conDemo) {
            enDemo = true;
            document.body.classList.add("demo-lock");
            await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.MaquinaDemo.correr, apiDemo(tk)) : window.MaquinaDemo.correr(apiDemo(tk)));
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Maquina] presentación", err);
    }
    enDemo = false;
    document.body.classList.remove("demo-lock");
    if (!vivo(tk)) return;
    if (o.boton !== false) {
        var sigue = await esperarBoton("comenzar-wrap", "btn-comenzar", textos().botonComenzar || "¡EMPEZAR!", tk);
        if (!vivo(tk) || !sigue) return;
    } else {
        await sleep(300);
        if (!vivo(tk)) return;
    }
    nube("zoe-nube", "zoe-nube-texto", "", false);
    document.body.classList.remove("presentando");
    document.body.classList.add("jugando");
    e.arrastre(true);
    jugando = true;
    var primero = R().siguiente(geo, puestos());
    if (primero) {
        e.pista(primero.id);
        decirRapido(R().pista(gameConfig, primero), "zoe", "senala", true);
    }
    programarAyuda();
}

/** Botón grande del DOM (EMPEZAR): resuelve true al tocarlo, false si cambia el nivel. */
function esperarBoton(idWrap, idBtn, texto, tk) {
    return new Promise(function (resolve) {
        var wrap = document.getElementById(idWrap);
        var btn = document.getElementById(idBtn);
        if (!wrap || !btn) { resolve(true); return; }
        var t = btn.querySelector(".btn-texto, .btn-comenzar-texto");
        if (t && texto) t.textContent = texto;
        nube("zoe-nube", "zoe-nube-texto", "", false);
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

function ocultarMarcha() {
    if (esc()) esc().palanca(false);
    quitarManoPalanca();
}

// ------------------------------------------------------------------ la palanca de marcha

var esperaPalanca = null;
var manoPalanca = null;

function quitarManoPalanca() {
    if (manoPalanca) {
        clearInterval(manoPalanca.timer);
        clearTimeout(manoPalanca.retraso);
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        manoPalanca = null;
    }
}

/** La mano del tutorial toca la palanca una y otra vez (nivel 1, o si el niño tarda). */
function mostrarManoPalanca() {
    var T = window.PedniaTutorial;
    var p = esc() ? esc().puntoPalancaCliente() : null;
    if (!T || !p) return;
    quitarManoPalanca();
    var mano = T.crearMano();
    mano.style.transition = "transform 260ms ease-in-out";
    T.puntaManoEn(mano, p.x, p.y);
    var abajo = false;
    manoPalanca = {
        timer: setInterval(function () {
            abajo = !abajo;
            T.faseMano(mano, abajo ? "presionar" : "viajar");
            T.puntaManoEn(mano, p.x + (abajo ? 6 : 0), p.y + (abajo ? 14 : 0));
        }, 520)
    };
}

/** Todo ensamblado: la palanca brilla y espera. Resuelve true al bajarla, false si cambia el nivel. */
function esperarPalanca(tk) {
    return new Promise(function (resolve) {
        var e = esc();
        if (!e) { resolve(true); return; }
        e.palanca(true);
        var listo = false;
        var ayuda = null;
        var vigia = null;
        var cerrar = function (ok) {
            if (listo) return;
            listo = true;
            esperaPalanca = null;
            clearTimeout(ayuda);
            clearInterval(vigia);
            quitarManoPalanca();
            resolve(ok);
        };
        esperaPalanca = function () { cerrar(vivo(tk)); };
        if (nivelIdx === 0) mostrarManoPalanca();
        // si tarda, Zoe lo vuelve a decir y la mano señala la palanca
        var recordar = function () {
            ayuda = setTimeout(function () {
                if (listo || !vivo(tk)) return;
                mostrarManoPalanca();
                decirRapido(textos().todoListo, "zoe", "senala", true);
                recordar();
            }, Number(juego().ayudaPalancaMs) || 9000);
        };
        recordar();
        vigia = setInterval(function () { if (!vivo(tk)) { if (esc()) esc().palanca(false); cerrar(false); } }, 200);
    });
}

function alPalanca() {
    sfx("palanca");
    if (esperaPalanca) esperaPalanca();
}

/** La palanca está trabada: Zoe explica que primero van todas las piezas. */
function alPalancaBloqueada() {
    sfx("suave");
    if (jugando) decirRapido(textos().palancaFalta, "zoe", "senala", true);
}

function apiDemo(tk) {
    var e = esc();
    var pedido = gameConfig.demo && gameConfig.demo.eje;
    var destino = pedido && R().destino(geo, pedido) ? pedido : (R().siguiente(geo, {}) || {}).id;
    var id = e.fichaPara(destino);
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk) || !id; },
        textoDemo: function () { return textos().demoZoe || ""; },
        pieza: function () { return id; },
        punto: function (pid) { return e.puntoCliente(pid); },
        destino: function () { return e.puntoDestinoCliente(destino); },
        tomar: function (pid) { e.tomarDemo(pid); },
        mover: function (pid, x, y) { e.ponerCliente(pid, x, y); },
        entregar: async function (pid) {
            await e.encajar(pid, destino);
            await sleep(1000);
            e.deshacer(destino);
            e.finDemo();
        },
        decir: function (texto) { return decir(texto, "zoe", "senala", 8000); },
        terminar: function () { e.finDemo(); e.arrastre(false); return Promise.resolve(); }
    };
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    aplicarAccesibilidad();
    // pruebas: ?nivel=3 empieza en el tercer nivel (sin el parámetro, en el primero)
    var forzado = parseInt(new URLSearchParams(location.search).get("nivel"), 10);
    var inicio = forzado >= 1 && forzado <= totalNiveles() ? forzado - 1 : 0;
    await entrar(inicio, { demo: inicio === 0, boton: true });
}

// ------------------------------------------------------------------ acciones del niño

function alSeleccion(d) {
    if (!jugando || !d) return;
    limpiarAyuda();
    seleccionesNivel += 1;
    if (!d.sirve) {
        // una pieza que todavía no va: Zoe invita a mirar las sombras (sin decir que está mal)
        decirRapido(textos().seleccion[0], "zoe", "duda");
    } else if (seleccionesNivel === 1 || seleccionesNivel % 4 === 0) {
        decirRapido(R().frase(textos().seleccion, 1 + (seleccionesNivel % 2)), "zoe", "senala");
    }
    programarAyuda();
}

/** Lo que dice Zoe después de un acierto: qué sigue, en palabras cortas. */
function fraseTrasAcierto(tipoPuesto) {
    var sig = R().siguiente(geo, puestos());
    if (!sig) return "";
    var faltan = R().faltan(geo, puestos());
    if (faltan === 1) return textos().casiListo;
    if (sig.tipo === "polea" && tipoPuesto === "engranaje") return textos().ahoraPoleas;
    if (sig.tipo === "correa" && tipoPuesto !== "correa") return textos().ahoraCorrea;
    turnoAcierto += 1;
    if (turnoAcierto % 3 === 0) return R().frase(textos().aciertos, turnoAcierto);
    return String(textos().aciertoSigue || "").replace("{pieza}", R().nombre(gameConfig, sig.tipo, sig.talla).con);
}

async function alSoltar(datos) {
    var tk = token;
    var e = esc();
    if (!e || !datos) return;
    if (!jugando) { await e.devolver(datos.id); return; }
    var res = R().evaluar(datos);
    if (res.acierto) {
        fuerasSeguidos = 0;
        intentos[datos.id] = 0;
        limpiarAyuda();
        var antes = puestos();
        antes[res.destino] = true;
        var ultimo = R().completo(geo, antes);
        if (ultimo) { jugando = false; e.arrastre(false); }
        if (datos.tipo === "correa") setTimeout(function () { sfx("correa"); }, 300);
        await e.encajar(datos.id, res.destino);
        if (!vivo(tk)) return;
        puestasNivel += 1;
        if (ultimo) { await maquinaLista(tk); return; }
        if (nivelIdx === 0 && puestasNivel === 1) {
            // Zeus da su consejo desde fuera de cuadro: los dientes se abrazan
            decirRapido(textos().consejoZeus, "zeus", null, true);
        } else {
            decirRapido(fraseTrasAcierto(datos.tipo), "zoe", turnoAcierto % 2 ? "celebra" : "aplaude", true);
            setTimeout(function () {
                if (jugando && vivo(tk) && !vozActiva && puestasNivel % 3 === 0) decirRapido(R().frase(textos().zeusAnima, turnoZeus++), "zeus", null, false);
            }, 2800);
        }
        programarAyuda();
        return;
    }
    var motivo = res.motivo;
    await e.devolver(datos.id, motivo, res.destino);
    if (!vivo(tk)) return;
    var meta = R().siguiente(geo, puestos(), datos.tipo, datos.talla);
    if (motivo === "fuera") {
        // fuera del tablero: vuelve sin decir nada; si se repite, una indicación amable
        fuerasSeguidos += 1;
        if (fuerasSeguidos >= (Number(juego().fuerasParaPista) || 2)) {
            fuerasSeguidos = 0;
            decirRapido(textos().fuera, "zoe", "senala");
        }
        programarAyuda();
        return;
    }
    fuerasSeguidos = 0;
    intentos[datos.id] = (intentos[datos.id] || 0) + 1;
    // al segundo intento con la misma pieza, la pista dice cuál va y dónde, y el eje destella
    if (intentos[datos.id] >= (Number(juego().intentosParaPista) || 2) && meta) {
        intentos[datos.id] = 0;
        e.pista(meta.id);
        decirRapido(R().pista(gameConfig, meta), "zoe", "senala", true);
        programarAyuda();
        return;
    }
    var t = textos();
    var frase = t.casi;
    if (motivo === "otraTalla") frase = datos.tipo === "polea" ? t.otraPolea : t.otraTalla;
    else if (motivo === "otraPieza") frase = t.otraPieza;
    else if (motivo === "ocupado") frase = t.ocupado;
    else if (motivo === "orden") frase = datos.tipo === "polea" ? t.ordenPolea : (datos.tipo === "correa" ? t.ordenCorrea : t.orden);
    decirRapido(frase, "zoe", motivo === "casi" ? "senala" : "duda", true);
    programarAyuda();
}

// ------------------------------------------------------------------ máquina lista, marcha y fin de nivel

/** Todo ensamblado: la palanca del panel brilla y, al bajarla, la máquina cobra vida. */
async function maquinaLista(tk) {
    jugando = false;
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    await decir(textos().todoListo, "zoe", "senala", 5000);
    if (!vivo(tk)) return;
    var ok = await esperarPalanca(tk);
    if (!vivo(tk) || !ok) return;
    document.body.classList.remove("jugando");
    nube("zoe-nube", "zoe-nube-texto", "", false);
    if (e) {
        try {
            await e.marcha({ sonido: function (n) { sfx(n); }, velocidad: Number(juego().velocidadRaiz) || 0.55 });
        } catch (err) {
            console.warn("[Maquina] marcha", err);
        }
    }
    if (!vivo(tk)) return;
    var gz = guiaDe("zoe");
    if (gz) gz.gesto("celebra");
    await decir(nivel().marcha, "zoe", "aplaude", 9000);
    if (!vivo(tk)) return;
    if (nivelIdx + 1 < totalNiveles()) await completarNivel(tk);
    else await completar(tk);
}

/** Niveles 1 a 3: la máquina sigue girando, Zoe y Zeus celebran y llega la siguiente. */
async function completarNivel(tk) {
    var e = esc();
    bus().emitir("nivel_completado", { nivel: nivelIdx + 1 });
    sfx("nivel");
    mostrarCartel(cartelNivel());
    var entra = zeus(true);
    await entra;
    if (!vivo(tk)) return;
    var gzz = guiaDe("zeus");
    if (gzz) gzz.gesto("celebra");
    await sleep(1400);
    ocultarCartel();
    await decir(nivel().listo, "zeus", "celebra", 6000);
    if (!vivo(tk)) return;
    var sale = zeus(false);
    if (window.SonidosMaquina) window.SonidosMaquina.motor(false);
    if (e) await e.salida();
    await sale;
    if (!vivo(tk)) return;
    await entrar(nivelIdx + 1, { demo: false, boton: false });
}

/** Nivel 4: la gran fábrica en marcha, Zoe y Zeus celebran sobre la consola y la victoria compartida. */
async function completar(tk) {
    var e = esc();
    bus().emitir("nivel_completado", { nivel: nivelIdx + 1 });
    mostrarCartel(cartelNivel());
    sfx("nivel");
    await sleep(1600);
    if (!vivo(tk)) return;
    ocultarCartel();
    nube("zoe-nube", "zoe-nube-texto", "", false);
    if (window.SonidosMaquina) window.SonidosMaquina.musica(true);
    if (e) {
        try {
            await e.final({
                sonido: function (n) { sfx(n); },
                velocidad: Number(juego().velocidadRaiz) || 0.55,
                cine: function (on) { document.body.classList.toggle("cinematica", !!on); },
                personajes: function () {
                    document.body.classList.add("en-final");
                    return Promise.all([zoe(true), zeus(true)]).then(function () {
                        var a = guiaDe("zoe"), b = guiaDe("zeus");
                        if (a) a.gesto("final");
                        if (b) b.gesto("celebra");
                    });
                }
            });
        } catch (err) {
            console.warn("[Maquina] final", err);
        }
    }
    document.body.classList.remove("cinematica");
    if (!vivo(tk)) return;
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    mostrarCartel({ etiqueta: "¡Máquina en marcha!", titulo: textos().finalTitulo || "¡EXCELENTE MECÁNICO!", sub: textos().finalTexto || "" });
    await decir(textos().finalVoz, "zeus", "celebra", 12000);
    if (!vivo(tk)) return;
    var gz = guiaDe("zoe");
    if (gz) gz.gesto("final");
    await sleep(900);
    if (!vivo(tk)) return;
    ocultarCartel();
    mostrarVictoria();
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = (textos().finalTitulo || "¡EXCELENTE MECÁNICO!") + "\n" + (textos().finalTexto || "");
    zoe(false);
    zeus(false);
    if (window.SonidosMaquina) window.SonidosMaquina.motor(false);
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

function cartelNivel() {
    var n = nivel();
    var c = n.cartel || {};
    var sig = R().nivel(gameConfig, nivelIdx + 1);
    return {
        etiqueta: c.etiqueta || ("Nivel " + (nivelIdx + 1) + " completado"),
        titulo: c.titulo || n.listo || "¡Muy bien!",
        sub: sig ? "Sigue: " + sig.nombre : "¡Toda la fábrica funciona!"
    };
}

/** texto: una frase, o { etiqueta, titulo, sub }. */
function mostrarCartel(texto) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
    if (c) c.hidden = false;
    nube("zoe-nube", "zoe-nube-texto", "", false);
    nube("zeus-nube", "zeus-nube-texto", "", false);
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
    b.on("pieza_cerca_de_eje", function () { sfx("cerca"); });
    b.on("pieza_ensamblada", function (d) { if (d.tipo !== "correa") sfx("encaje"); setTimeout(function () { sfx("acierto"); }, 300); });
    b.on("conexion_activada", function () { setTimeout(function () { sfx("conexion"); }, 120); });
    b.on("pieza_rechazada", function (d) { sfx(d.motivo === "fuera" ? "regreso" : "suave"); });
    b.on("maquina_en_marcha", function () { sfx("motor", true); });
}

// ------------------------------------------------------------------ arranque

document.addEventListener("DOMContentLoaded", function () {
    gameConfig = JSON.parse(readText("config.json?v=20261124pal"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    // 20 máquinas en 4 grados: cada partida juega una al azar de cada grado (de la primera máquina a
    // la gran fábrica) y evita repetir las de la partida anterior
    gameConfig.catalogoNiveles = R().expandirCatalogo(gameConfig.nivelesJuego);
    var errores = R().validar(gameConfig);
    if (errores.length) console.warn("[Maquina] config.json", errores);
    var anteriores = [];
    try { anteriores = JSON.parse(localStorage.getItem("maquina-engranajes-ultimos") || "[]"); } catch (e) { anteriores = []; }
    gameConfig.nivelesJuego = R().elegirNiveles(gameConfig.catalogoNiveles, Math.random, anteriores);
    // pruebas: ?maquinas=1b,2c,3d,4e fuerza las máquinas de la partida
    var forzadas = (new URLSearchParams(location.search).get("maquinas") || "").split(",").filter(Boolean);
    if (forzadas.length) {
        var elegidas = forzadas.map(function (k) { return gameConfig.catalogoNiveles.filter(function (n) { return String(n.id) === k; })[0]; }).filter(Boolean);
        if (elegidas.length) gameConfig.nivelesJuego = elegidas;
    }
    try { localStorage.setItem("maquina-engranajes-ultimos", JSON.stringify(gameConfig.nivelesJuego.map(function (n) { return n.id; }))); } catch (e) { /* sin almacenamiento */ }
    variante = R().sortearVariante(gameConfig);
    window.__varianteMaquina = variante;
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
        esc().al("palanca", alPalanca);
        esc().al("palancaBloqueada", alPalancaBloqueada);
        escenaLista = esc().montar(document.getElementById("escenario"), gameConfig, variante).then(function (ok) {
            if (!ok) console.warn("[Maquina] la escena no se pudo montar");
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
        if (window.SonidosMaquina) window.SonidosMaquina.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosMaquina) window.SonidosMaquina.detenerTodo();
    };
});
