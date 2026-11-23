/**
 * El Tren de Colores y las Vías Mágicas — flujo del juego (Polimotor, 3-4 años, Ensamblajes sencillos).
 *
 * inicio → intro 3D → PedniaEdad → presentación (Zoe: «¡El trenecito quiere viajar!…» mientras una estrella
 * recorre el carril) → demostración (la mano traza media vía y se levanta; la vía se recoge) → «¡Comenzar a
 * jugar!» → Zeus: «¡Sigue los puntos de luz…!» → 4 niveles, uno por tren de color: 2, 3, 4 y 4 estaciones a
 * distancias al azar (el último con curvas); el niño construye un hueco cada vez y el tren viaja a la estación
 * siguiente → cinemática final «El gran viaje de colores» → Zoe y Zeus → victoria compartida.
 *
 * Aquí no se decide si la vía avanza (ReglasTren) ni se dibuja (EscenarioTren): solo se enlazan pantallas,
 * voces, sonidos, ayudas y niveles. Nada resta: salirse detiene la vía y levantar el dedo la deja esperando en
 * la estrellita para retomarla.
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
var nTramos = 1;
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var tVozSoltar = 0;
var tVozFuera = 0;
var tVozToque = 0;
var turnoHito = 0;
var empezoAlgunaVez = false;
var volumenListo = false;
var escenaLista = null;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function esc() { return window.EscenarioTren && window.EscenarioTren.listo() ? window.EscenarioTren : null; }
function sfx(nombre) {
    var s = window.SonidosTren;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function vias() { return gameConfig.vias || []; }
function via() { return vias()[nivelIdx] || {}; }
function total() { return Math.max(1, vias().length); }
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
    // un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista breve abajo
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3800);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosTren) window.SonidosTren.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosTren) window.SonidosTren.agachar(false);
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
    if (window.SonidosTren) window.SonidosTren.agachar(false);
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
    if (window.SonidosTren) {
        window.SonidosTren.desbloquear();
        window.SonidosTren.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosTren,
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

// ------------------------------------------------------------------ indicador de recorrido (arriba a la izquierda)

var COLORES_HUD = { rojo: "#ff5a5f", azul: "#3d8bff", verde: "#37c978", amarillo: "#ffc83d" };

function construirHud() {
    var cont = document.getElementById("hud-trenes");
    if (!cont) return;
    cont.innerHTML = "";
    vias().forEach(function (v, i) {
        var s = document.createElement("span");
        s.className = "hud-vagon";
        s.style.setProperty("--c", COLORES_HUD[v.color] || "#3d8bff");
        s.innerHTML = '<i class="fa-solid fa-train"></i>';
        s.dataset.i = i;
        cont.appendChild(s);
    });
}

function pintarHud(k) {
    var cont = document.getElementById("hud-trenes");
    if (cont) {
        [].forEach.call(cont.children, function (s, i) {
            s.classList.toggle("hecho", i < hechos);
            s.classList.toggle("actual", i === nivelIdx && i >= hechos);
        });
    }
    if (k != null) {
        var barra = document.getElementById("hud-barra-relleno");
        var tren = document.getElementById("hud-barra-tren");
        var pct = Math.max(0, Math.min(1, k)) * 100;
        if (barra) barra.style.width = pct + "%";
        if (tren) tren.style.left = pct + "%";
        var hud = document.getElementById("hud-viaje");
        if (hud) hud.style.setProperty("--c", COLORES_HUD[via().color] || "#3d8bff");
    }
}

// ------------------------------------------------------------------ ayuda progresiva

function limpiarAyuda() {
    clearTimeout(tAyuda);
    tAyuda = null;
    if (esc()) esc().limpiarAyuda();
}

/** Un rato sin trazar: una estrellita recorre lo que falta, el inicio destella y Zeus lo recuerda. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!jugando) return;
    tAyuda = setTimeout(function () {
        if (!jugando || !esc()) return;
        var st = esc().estado();
        if (st && (st.estado === "trazando" || st.estado === "meta")) { programarAyuda(4000); return; }
        if (acc().ayudaAutomatica) esc().pulsoAyuda();
        else esc().destelloInicio();
        if (!empezoAlgunaVez) decirRapido(textos().pistaInicio, "zeus", "senala");
        else decirRapido(textos().guiaZeus, "zeus", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 14000);
    }, ms || Number(juego().ayudaMs) || 10000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar en la vía i (0..3).
 * opciones.demo   la mano enseña el trazado (solo en el nivel 1 si "Mostrar demostración" está activa)
 * opciones.boton  espera «¡Comenzar a jugar!» (nivel 1). Los demás niveles arrancan tras la estrella guía.
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    if (escenaLista) await escenaLista;
    var e = esc();
    if (!e || !vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(total() - 1, i | 0));
    jugando = false;
    turnoHito = 0;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosTren) window.SonidosTren.musica(false);
    e.terminarFiesta();
    e.entrada(false);
    var info = e.cargar(via());
    nTramos = info && info.tramos ? info.tramos : 1;
    pintarHud(0);
    aplicarAccesibilidad();
    document.body.classList.add("presentando", "demo-lock");
    var gj = Number(juego().estrellaMs) || 3000;

    try {
        if (nivelIdx === 0) {
            await e.presentar();
            if (!vivo(tk)) return;
            // Zoe presenta mientras la estrella recorre el carril (3 s)
            await zoe(true);
            if (!vivo(tk)) return;
            await Promise.all([decir(textos().introZoe, "zoe", "senala", 12000), e.estrellaGuia(0, gj)]);
            if (!vivo(tk)) return;
            if (o.demo && acc().mostrarIntro !== false && window.TrenDemo) {
                zoe(false);
                await zeus(true);
                if (!vivo(tk)) return;
                enDemo = true;
                await window.TrenDemo.correr(apiDemo(tk));
                enDemo = false;
                if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
                if (!vivo(tk)) return;
            }
            e.reiniciarTrazo();
            pintarHud(0);
        } else {
            await e.presentar();
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Tren] presentación", err);
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
    if (nivelIdx === 0) {
        // la indicación de Zeus en el momento justo: cuando empieza el juego (una vez)
        decir(textos().guiaZeus, "zeus", "senala", 5000);
    } else {
        // primeros 3 segundos: la estrella muestra la dirección; luego el niño traza
        var voz = via().instruccion ? decir(via().instruccion, via().voz === "zeus" ? "zeus" : "zoe", "senala", 7000) : null;
        await e.estrellaGuia(0, gj);
        void voz;
        if (!vivo(tk)) return;
    }
    document.body.classList.add("jugando");
    e.entrada(true);
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
        largo: function () { var s = e.estado(); return s ? s.largo : 6; },
        punto: function (s) { return e.puntoPantalla(s); },
        tomar: function () { e.tomarDemo(); },
        mover: function (s) { e.moverDemo(s); },
        soltar: function () { e.soltarDemo(); sfx("construir", 0); },
        recoger: function () { e.reiniciarTrazo(); sfx("construir", 0); },
        decir: function (texto, pj) { return decir(texto, pj, "senala", 9000); }
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

function alInicio() {
    sfx("inicio");
    if (!jugando) return;
    empezoAlgunaVez = true;
    limpiarAyuda();
}

function alRetoma() {
    sfx("retoma");
    if (!jugando) return;
    limpiarAyuda();
}

function alAvance(info) {
    sfx("construir", info && info.vel);
    if (info && info.demo) return;
    pintarHud(info ? (info.kNivel != null ? info.kNivel : info.k) : null);
    if (jugando) limpiarAyuda();
}

function alHito(info) {
    sfx("hito");
    if (!jugando) return;
    decirRapido(frase(textos().hito, turnoHito++), turnoHito % 2 ? "zoe" : "zeus", "celebra");
    void info;
}

function alFuera(info) {
    sfx("construir", 0);
    sfx("fuera");
    if (!jugando) return;
    var ahora = Date.now();
    if (ahora - tVozFuera > (Number(juego().vozFueraMs) || 8000)) {
        var texto = info && info.motivo === "adelante" ? textos().adelante : textos().fuera;
        if (decirRapido(texto, "zoe", "senala")) tVozFuera = ahora;
    }
}

function alVuelve() { sfx("vuelve"); }

function alSoltar() {
    sfx("construir", 0);
    sfx("pausa");
    if (!jugando) return;
    var ahora = Date.now();
    // el recordatorio de Zeus, sin repetirlo a cada rato
    if (ahora - tVozSoltar > (Number(juego().vozSoltarMs) || 11000)) {
        tVozSoltar = ahora;
        vozActiva = null;
        vozLibreDesde = 0;
        decirRapido(textos().soltar || textos().guiaZeus, "zeus", "senala");
    } else {
        mostrarPista(textos().retoma, "zoe", 2400);
    }
    programarAyuda();
}

function alTocaFuera(info) {
    sfx("toque");
    if (!jugando || !esc()) return;
    var st = esc().estado();
    var ahora = Date.now();
    if (ahora - tVozToque < 6000) return;
    var texto;
    if (st && st.s > 0.05) texto = textos().retoma;
    else texto = info && info.motivo === "destino" ? textos().tocaDestino : textos().tocaInicio;
    if (decirRapido(texto, "zoe", "senala")) tVozToque = ahora;
}

function alMeta(info) {
    sfx("construir", 0);
    if ((info && info.demo) || enDemo || !jugando) return;
    var tk = token;
    jugando = false;
    var st = esc() ? esc().estado() : null;
    if (st && st.tramo + 1 < st.tramos) {
        pintarHud(st.kNivel);
        completarTramo(tk, st);
        return;
    }
    pintarHud(1);
    if (nivelIdx + 1 < total()) completarNivel(tk);
    else completar(tk);
}

/**
 * Hueco terminado (no el último del nivel): el tren viaja a la estación siguiente, Zoe o Zeus lo celebran, la
 * estrella guía recorre el hueco nuevo y el niño sigue construyendo.
 */
async function completarTramo(tk, st) {
    var e = esc();
    document.body.classList.remove("jugando");
    limpiarAyuda();
    if (!e) return;
    e.entrada(false);
    await e.viajar();
    if (!vivo(tk)) return;
    sfx("hito");
    var quedan = st.tramos - (st.tramo + 1);
    var texto = quedan === 1 ? (textos().tramoUltimo || frase(textos().tramoLlego, st.tramo)) : frase(textos().tramoLlego, st.tramo);
    var pj = st.tramo % 2 ? "zeus" : "zoe";
    var voz = decir(texto, pj, "celebra", 6000);
    e.siguienteTramo();
    pintarHud(e.estado() ? e.estado().kNivel : null);
    await e.estrellaGuia(0, Number(juego().estrellaMs) || 3000);
    void voz;
    if (!vivo(tk)) return;
    document.body.classList.add("jugando");
    e.entrada(true);
    jugando = true;
    programarAyuda();
}

/** Vía terminada: se ilumina, el tren pita y viaja hasta la estación; cartel del nivel y la siguiente vía. */
async function completarNivel(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    limpiarAyuda();
    if (e) e.entrada(false);
    if (e) await e.viajar();
    if (!vivo(tk)) return;
    hechos = Math.max(hechos, nivelIdx + 1);
    pintarHud(1);
    sfx("victoria");
    mostrarCartel(via().cartel || via().logro || "¡Muy bien!");
    await Promise.all([decir(via().logro, via().voz === "zeus" ? "zoe" : "zeus", "celebra", 5200), sleep(2600)]);
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

/** Última vía: el tren llega, cartel, cinemática «El gran viaje de colores», Zoe y Zeus felicitan y la victoria. */
async function completar(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    limpiarAyuda();
    if (e) e.entrada(false);
    if (e) await e.viajar();
    if (!vivo(tk)) return;
    hechos = total();
    pintarHud(1);
    sfx("victoria");
    mostrarCartel(via().cartel || textos().finalTitulo);
    await Promise.all([decir(via().logro, "zoe", "celebra", 4000), sleep(2400)]);
    if (!vivo(tk)) return;
    ocultarCartel();
    await fundir();
    if (!vivo(tk)) return;
    if (window.SonidosTren) {
        window.SonidosTren.ambiente(false);
        window.SonidosTren.musica(true);
    }
    if (e) {
        try {
            await e.cinematica();
        } catch (err) {
            console.warn("[Tren] cinemática", err);
        }
    }
    document.body.classList.remove("cinematica");
    if (!vivo(tk)) return;
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    await decir(textos().finalVoz, "zoe", "final", 7000);
    if (!vivo(tk)) return;
    await decir(textos().finalVozZeus, "zeus", "final", 4500);
    if (!vivo(tk)) return;
    await sleep(300);
    if (!vivo(tk)) return;
    if (e) e.terminarFiesta();
    mostrarVictoria();
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = (textos().finalTitulo || "¡EXCELENTE MAQUINISTA!") + "\n" + (textos().finalTexto || "");
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

/** texto: una frase, o { etiqueta, titulo, sub } (vias[].cartel). */
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
    gameConfig = JSON.parse(readText("config.json?v=20261123i"));
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
    construirHud();
    aplicarAccesibilidad();

    var E = window.EscenarioTren;
    if (E) {
        E.al("inicio", alInicio);
        E.al("retoma", alRetoma);
        E.al("avance", alAvance);
        E.al("traviesa", function () { sfx("traviesa"); });
        E.al("hito", alHito);
        E.al("fuera", alFuera);
        E.al("vuelve", alVuelve);
        E.al("soltar", alSoltar);
        E.al("tocaFuera", alTocaFuera);
        E.al("meta", alMeta);
        E.al("estrella", function () { sfx("estrella"); });
        E.al("activar", function () { sfx("activar"); });
        E.al("pitido", function () { sfx("pitido"); });
        E.al("pitidoCorto", function () { sfx("pitido", true); });
        E.al("arranca", function () { sfx("arranca"); });
        E.al("chuchu", function () { sfx("chuchu"); });
        E.al("llegada", function () { sfx("llegada"); });
        E.al("cine", function (on) { document.body.classList.toggle("cinematica", !!on); });
        E.al("cineEvento", function (f) {
            if (f === "acople") sfx("acople");
            else if (f === "pitido") sfx("pitido");
            else if (f === "arranca") sfx("arranca");
            else if (f === "chuchu") sfx("chuchu");
            else if (f === "puente") sfx("puente");
            else if (f === "tunel") sfx("tunel");
            else if (f === "llegada") { sfx("llegada"); sfx("victoria"); }
            else if (f === "fuego") sfx("fuego");
        });
        escenaLista = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Tren] la escena no se pudo montar");
            else E.cargar(vias()[0] || {});
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
        if (window.SonidosTren) window.SonidosTren.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosTren) window.SonidosTren.detenerTodo();
    };
});
