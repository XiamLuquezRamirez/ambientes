/**
 * El Puzle Geométrico 3D — flujo del juego.
 * inicio → intro 3D → PedniaEdad → presentación (Zeus presenta, Zoe explica) → demostración (mano) →
 * «¡Comenzar a jugar!» → 4 niveles sorteados del catálogo de 16 (uno de cada grado: 5, 6, 9 y 11
 * piezas, p. ej. faro → molino → tren → torre del reloj) → cinemática «El mundo de las
 * construcciones mágicas» → victoria compartida.
 *
 * Aquí no se decide si un soltado es correcto (ReglasPuzle) ni se dibuja (EscenarioPuzle). Las
 * reacciones del mundo cuelgan de EventosPuzle; este archivo conecta voces, sonidos y niveles.
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
var casiSeguidos = 0;
var girosFallidos = {};
var fuerasSeguidos = 0;
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var turnoAcierto = 0;
var turnoSeleccion = 0;
var turnoGiro = 0;
var turnoCapa = 0;
var turnoZeus = 0;
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
function R() { return window.ReglasPuzle; }
function esc() { return window.EscenarioPuzle || null; }
function bus() { return window.EventosPuzle; }
function sfx(nombre, a) {
    var s = window.SonidosPuzle;
    if (s && typeof s[nombre] === "function") s[nombre](a);
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function posiciones() { return R().piezasNivel(gameConfig, nivelIdx, variante); }
function nivel() { return R().nivel(gameConfig, nivelIdx) || {}; }
function totalNiveles() { return Math.max(1, R().niveles(gameConfig).length); }
function posicion(id) { return posiciones().filter(function (p) { return p.id === id; })[0] || null; }
function vivo(tk) { return tk === token; }

/** Color y decoración de cada forma (sorteados al cargar la partida). */
function aspecto(id) {
    var p = posicion(id);
    var forma = p ? p.forma : id;
    return { color: (variante.color || {})[forma] || "#4dabf7", deco: (variante.deco || {})[forma] || "liso" };
}

/** Carga el nivel en la escena: bloques nuevos en la bandeja, repartidos y girados al azar. */
function cargarNivelEnEscena() {
    var e = esc();
    if (!e) return;
    var lista = posiciones();
    var n = nivel();
    var ids = lista.map(function (p) { return p.id; });
    var cols = ids.length <= 6 ? 2 : 3;
    var huecos = Math.ceil(ids.length / cols) * cols;
    var reparto = R().repartir(ids, huecos);
    var rots = R().orientacionesIniciales(lista, n);
    e.cargar({
        indice: nivelIdx,
        total: totalNiveles(),
        nivel: { id: n.id, clave: n.mundo || n.clave, nombre: n.nombre, escala: n.escala, giro: !!n.giro, techo: parseInt(String(variante.techo || "#ff6b6b").replace("#", ""), 16) },
        lista: lista,
        aspecto: aspecto,
        fichas: lista.map(function (p) {
            var a = aspecto(p.id);
            return { id: p.id, forma: p.forma, def: p.def, rot: rots[p.id], color: a.color, deco: a.deco, hueco: reparto[p.id] };
        })
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
    // un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista de abajo
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3600);
    var g = guiaDe(quien);
    if (gesto && g) g.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosPuzle) window.SonidosPuzle.agachar(true);
    if (g) g.hablar(true);
    var fin = function () {
        var gg = guiaDe(quien);
        if (gg) gg.hablar(false);
        if (window.SonidosPuzle) window.SonidosPuzle.agachar(false);
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
    if (window.SonidosPuzle) window.SonidosPuzle.agachar(false);
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
    if (window.SonidosPuzle) {
        window.SonidosPuzle.desbloquear();
        window.SonidosPuzle.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosPuzle,
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

/** Posición que señala la guía (la del bloque elegido si sirve, si no la siguiente). */
function metaActual() {
    var e = esc();
    var sel = e ? e.seleccionada() : null;
    var lista = posiciones();
    var fichaSel = sel ? posicion(sel) : null;
    return R().siguiente(lista, colocadas, fichaSel ? fichaSel.forma : null);
}

/** Sin colocar nada durante un rato: la guía destella y Zoe da la pista de lo que sigue. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!acc().ayudaAutomatica) return;
    tAyuda = setTimeout(function () {
        if (!jugando) return;
        var meta = metaActual();
        if (!meta) return;
        turnoAyuda += 1;
        if (esc()) esc().pista();
        decirRapido(turnoAyuda % 3 === 0 ? textos().ayudaZoe : meta.pista, "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 17000);
    }, ms || Number(juego().ayudaMs) || 14000);
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
    casiSeguidos = 0;
    girosFallidos = {};
    fuerasSeguidos = 0;
    turnoAyuda = 0;
    seleccionesNivel = 0;
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosPuzle) window.SonidosPuzle.musica(false);
    e.arrastre(false);
    cargarNivelEnEscena();
    aplicarAccesibilidad();
    e.arranque();

    document.body.classList.add("presentando");
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.PuzleDemo;
    try {
        // Zeus presenta la construcción y sale; Zoe explica y se queda a acompañar
        await zeus(true);
        if (!vivo(tk)) return;
        await decir(nivel().zeus, "zeus", nivelIdx ? "senala" : "saluda", 14000);
        if (!vivo(tk)) return;
        var sale = zeus(false);
        await zoe(true);
        await sale;
        if (!vivo(tk)) return;
        if (nivel().giro && nivelIdx === 1) e.llamarAtencionGiro();
        await decir(nivel().zoe, "zoe", nivelIdx ? "senala" : "saluda", 9000);
        if (!vivo(tk)) return;
        if (conDemo) {
            enDemo = true;
            document.body.classList.add("demo-lock");
            await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.PuzleDemo.correr, apiDemo(tk)) : window.PuzleDemo.correr(apiDemo(tk)));
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Puzle] presentación", err);
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
    nube("zoe-nube", "zoe-nube-texto", "", false);
    document.body.classList.remove("presentando");
    document.body.classList.add("jugando");
    e.arrastre(true);
    jugando = true;
    if (nivelIdx === 0) decirRapido(textos().base, "zoe", "senala", true);
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
    var lista = posiciones();
    var id = (gameConfig.demo && gameConfig.demo.pieza) || lista[0].id;
    if (!lista.some(function (p) { return p.id === id; })) id = lista[0].id;
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk); },
        textoDemo: function () { return textos().demoZoe || ""; },
        pieza: function () { return id; },
        punto: function (pid) { return e.puntoCliente(pid); },
        destino: function () { return e.puntoPosicionCliente(id); },
        tomar: function (pid) { e.tomarDemo(pid); },
        mover: function (pid, x, y) { e.ponerCliente(pid, x, y); },
        entregar: async function (pid) {
            await e.encajar(pid, id);
            await sleep(1000);
            e.deshacer(pid);
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
    // pruebas: ?nivel=3 empieza en el tercer nivel sorteado (sin el parámetro, en el primero)
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
        // un bloque que todavía no va: Zoe invita a mirar la forma (sin decir que está mal)
        decirRapido(textos().seleccion[0], "zoe", "duda");
    } else if (seleccionesNivel === 1 || seleccionesNivel % 4 === 0) {
        decirRapido(R().frase(textos().seleccion, 1 + (turnoSeleccion++ % 2)), "zoe", "senala");
    }
    programarAyuda();
}

function alGirar(d) {
    if (!jugando || !d) return;
    limpiarAyuda();
    if (d.coincide && girosFallidos[d.id]) {
        girosFallidos[d.id] = 0;
        decirRapido(textos().giroBien, "zoe", "aplaude", true);
    }
    programarAyuda();
}

function alGiroSinPieza() {
    if (!jugando) return;
    decirRapido(textos().giroSinPieza, "zoe", "senala", true);
}

function alNoGira() {
    if (!jugando) return;
    decirRapido(textos().noGira, "zoe", "senala", true);
}

function alAyuda() {
    if (!jugando) return;
    var meta = metaActual();
    if (esc()) esc().pista();
    decirRapido(meta && meta.pista ? meta.pista : textos().ayudaBoton, "zoe", "senala", true);
    programarAyuda();
}

async function alSoltar(datos) {
    var tk = token;
    var e = esc();
    if (!e || !datos) return;
    if (!jugando) { await e.devolver(datos.id); return; }
    var res = R().evaluar(datos);
    if (res.acierto) {
        colocadas[res.destino] = true;
        fuerasSeguidos = 0;
        casiSeguidos = 0;
        intentos[datos.id] = 0;
        var lista = posiciones();
        var ultimo = R().completo(colocadas, lista);
        if (ultimo) { jugando = false; limpiarAyuda(); e.arrastre(false); }
        var r = await e.encajar(datos.id, res.destino);
        if (!vivo(tk)) return;
        if (ultimo) {
            if (nivelIdx + 1 < totalNiveles()) await completarNivel(tk);
            else await completar(tk);
            return;
        }
        if (r && r.capa != null) {
            decirRapido(R().frase(textos().capa, turnoCapa++), "zoe", "aplaude", true);
            // Zeus anima desde fuera de cuadro (sin entrar: la partida sigue)
            setTimeout(function () {
                if (jugando && vivo(tk) && !vozActiva) decirRapido(R().frase(textos().zeusAnima, turnoZeus++), "zeus", null, false);
            }, 2600);
        } else {
            decirRapido(R().frase(textos().aciertos, turnoAcierto++), "zoe", turnoAcierto % 2 ? "celebra" : "aplaude");
        }
        programarAyuda();
        return;
    }
    var motivo = res.motivo;
    var meta = metaActual();
    await e.devolver(datos.id, motivo, res.destino);
    if (!vivo(tk)) return;
    if (motivo === "orientacion") {
        fuerasSeguidos = 0;
        girosFallidos[datos.id] = (girosFallidos[datos.id] || 0) + 1;
        decirRapido(R().frase(textos().girar, turnoGiro++), "zoe", "senala", true);
    } else if (motivo === "orden") {
        fuerasSeguidos = 0;
        decirRapido(textos().orden, "zoe", "duda", true);
    } else if (motivo === "casi") {
        fuerasSeguidos = 0;
        casiSeguidos += 1;
        if (casiSeguidos >= (Number(juego().casiParaPista) || 2) && meta) { casiSeguidos = 0; decirRapido(meta.pista, "zoe", "senala", true); }
        else decirRapido(textos().casi, "zoe", "senala");
    } else if (motivo === "otraForma" || motivo === "ocupado") {
        fuerasSeguidos = 0;
        intentos[datos.id] = (intentos[datos.id] || 0) + 1;
        // al segundo intento con el mismo bloque, la pista ya dice qué bloque va y dónde
        if (intentos[datos.id] >= 2 && meta) {
            intentos[datos.id] = 0;
            decirRapido(meta.pista, "zoe", "senala", true);
        } else {
            decirRapido(motivo === "ocupado" ? textos().ocupado : textos().otraForma, "zoe", "duda", true);
        }
    } else {
        // fuera de la construcción: vuelve sin decir nada; si se repite, una indicación amable
        fuerasSeguidos += 1;
        if (fuerasSeguidos >= (Number(juego().fuerasParaPista) || 2)) {
            fuerasSeguidos = 0;
            decirRapido(textos().fuera, "zoe", "senala");
        }
    }
    programarAyuda();
}

// ------------------------------------------------------------------ fin de nivel y final

/** Niveles 1 a 3: la figura se ilumina, Zoe y Zeus celebran, el mundo responde y sigue el próximo. */
async function completarNivel(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    bus().emitir("nivel_completado", { nivel: nivelIdx + 1 });
    mostrarCartel(cartelNivel());
    var gz = guiaDe("zoe");
    if (gz) gz.gesto("celebra");
    var entra = zeus(true);
    if (e) await Promise.all([e.celebrar(), entra]);
    if (!vivo(tk)) return;
    var gzz = guiaDe("zeus");
    if (gzz) gzz.gesto("celebra");
    ocultarCartel();
    await decir(nivel().listo, "zoe", "aplaude", 6000);
    if (!vivo(tk)) return;
    // transición: la figura vuela al plano y el nivel siguiente aparece en su plataforma
    var sale = zeus(false);
    if (e) await e.salida();
    await sale;
    if (!vivo(tk)) return;
    await entrar(nivelIdx + 1, { demo: false, boton: false });
}

/** Nivel 4: cinemática «El mundo de las construcciones mágicas» y la victoria compartida. */
async function completar(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    bus().emitir("nivel_completado", { nivel: nivelIdx + 1 });
    mostrarCartel(cartelNivel());
    if (e) await e.celebrar();
    if (!vivo(tk)) return;
    await decir(nivel().listo, "zoe", "celebra", 4600);
    if (!vivo(tk)) return;
    ocultarCartel();
    nube("zoe-nube", "zoe-nube-texto", "", false);
    // el templo es el protagonista: Zoe sale y vuelve con Zeus a celebrar en la escena 3
    await zoe(false);
    if (!vivo(tk)) return;
    if (window.SonidosPuzle) window.SonidosPuzle.musica(true);
    if (e) {
        try {
            await e.cinematica({
                sonido: function (n) { sfx(n); },
                cine: function (on) { document.body.classList.toggle("cinematica", !!on); },
                personajes: function () {
                    document.body.classList.add("en-final");
                    var p = Promise.all([zoe(true), zeus(true)]);
                    return p.then(function () {
                        var a = guiaDe("zoe"), b = guiaDe("zeus");
                        if (a) a.gesto("final");
                        if (b) b.gesto("celebra");
                    });
                }
            });
        } catch (err) {
            console.warn("[Puzle] cinemática", err);
        }
    }
    document.body.classList.remove("cinematica");
    if (!vivo(tk)) return;
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    mostrarCartel({ etiqueta: "¡Mundo construido!", titulo: textos().finalTitulo || "¡ARQUITECTO GENIAL!", sub: textos().finalTexto || "" });
    await decir(textos().finalVoz, "zeus", "celebra", 8000);
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
    if (texto) texto.textContent = (textos().finalTitulo || "¡ARQUITECTO GENIAL!") + "\n" + (textos().finalTexto || "");
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

/** Cartel del nivel terminado: «Nivel N completado», su título y qué sigue (los niveles se sortean). */
function cartelNivel() {
    var n = nivel();
    var c = n.cartel || {};
    var sig = R().nivel(gameConfig, nivelIdx + 1);
    return {
        etiqueta: c.etiqueta || ("Nivel " + (nivelIdx + 1) + " completado"),
        titulo: c.titulo || n.listo || "¡Muy bien!",
        sub: sig ? "Sigue: " + sig.nombre : "¡El mundo se ilumina!"
    };
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
    b.on("bloque_seleccionado", function () { sfx("seleccion"); });
    b.on("bloque_arrastrado", function () { sfx("arrastre"); });
    b.on("bloque_rotado", function (d) { sfx("girar"); if (d.coincide) setTimeout(function () { sfx("derecha"); }, 160); });
    b.on("bloque_cerca_de_posicion", function (d) { sfx(d.orientacionOk === false ? "cercaGiro" : "cerca"); });
    b.on("bloque_ensamblado", function () { sfx("encaje"); setTimeout(function () { sfx("acierto"); }, 260); });
    b.on("bloque_rechazado", function (d) { sfx(d.motivo === "fuera" ? "regreso" : "suave"); });
    b.on("capa_completada", function () { setTimeout(function () { sfx("capa"); }, 380); });
    b.on("altura_incrementada", function () { setTimeout(function () { sfx("grua"); }, 120); });
    b.on("construccion_completada", function () { sfx("nivel"); setTimeout(function () { sfx("celebrar"); }, 700); });
}

// ------------------------------------------------------------------ arranque

document.addEventListener("DOMContentLoaded", function () {
    gameConfig = JSON.parse(readText("config.json?v=20261124niv16"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    var errores = R().validar(gameConfig);
    if (errores.length) console.warn("[Puzle] config.json", errores);
    // 16 construcciones en 4 grados: cada partida juega una al azar de cada grado, de la más
    // fácil a la más difícil, y evita repetir las de la partida anterior
    gameConfig.catalogoNiveles = gameConfig.nivelesJuego;
    var anteriores = [];
    try { anteriores = JSON.parse(localStorage.getItem("puzle-geometrico-ultimos") || "[]"); } catch (e) { anteriores = []; }
    gameConfig.nivelesJuego = R().elegirNiveles({ nivelesJuego: gameConfig.catalogoNiveles }, Math.random, anteriores);
    // pruebas: ?obras=faro,puente,tren,templo fuerza las construcciones de la partida
    var forzadas = (new URLSearchParams(location.search).get("obras") || "").split(",").filter(Boolean);
    if (forzadas.length) {
        var elegidas = forzadas.map(function (k) { return gameConfig.catalogoNiveles.filter(function (n) { return n.clave === k; })[0]; }).filter(Boolean);
        if (elegidas.length) gameConfig.nivelesJuego = elegidas;
    }
    try { localStorage.setItem("puzle-geometrico-ultimos", JSON.stringify(gameConfig.nivelesJuego.map(function (n) { return n.clave; }))); } catch (e) { /* sin almacenamiento */ }
    variante = R().sortearVariante(gameConfig);
    window.__variantePuzle = variante;
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
        esc().al("noGira", alNoGira);
        esc().al("ayuda", alAyuda);
        escenaLista = esc().montar(document.getElementById("escenario"), gameConfig, variante).then(function (ok) {
            if (!ok) console.warn("[Puzle] la escena no se pudo montar");
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
        if (window.SonidosPuzle) window.SonidosPuzle.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosPuzle) window.SonidosPuzle.detenerTodo();
    };
});
