/**
 * ¡La Estación de Clasificación! — flujo del juego.
 * inicio → intro 3D → PedniaEdad → presentación (Zoe) → demostración (Zeus + mano) → «¡Comenzar a jugar!»
 * → nivel 1 (color) → nivel 2 (tamaño) → nivel 3 (forma) → nivel 4 (color + tamaño)
 * → escena final «La estación en marcha» → victoria compartida (final/final.js).
 *
 * Aquí no se decide si una clasificación es correcta (ReglasEstacion) ni se dibuja (EscenarioEstacion).
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var clasificados = {};
var colores = [];
var errores = {};
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

function R() { return window.ReglasEstacion; }
function esc() { return window.EscenarioEstacion || null; }
function sfx(nombre, a) {
    var s = window.SonidosEstacion;
    if (s && typeof s[nombre] === "function") s[nombre](a);
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function nivel() { return R().nivel(gameConfig, nivelIdx) || {}; }
function totalNiveles() { return Math.max(1, R().niveles(gameConfig).length); }
function criterios() { return R().criterios(nivel()); }
/** Objetos de la ronda en juego: se sortean de nuevo cada vez que se arma un nivel (infoNivel). */
var objetosRonda = [];
function objetosNivel() { return objetosRonda; }
function objetoDef(id) { return objetosNivel().filter(function (o) { return o.id === id; })[0] || null; }
function contenedorDef(id) { return (nivel().contenedores || []).filter(function (c) { return c.id === id; })[0] || null; }
function destinoDe(obj) { return R().destino(obj, nivel().contenedores, criterios()); }
function vivo(tk) { return tk === token; }

/** Carga en la escena el nivel actual: contenedores, objetos en orden de salida y progreso. */
function cargarNivelEnEscena() {
    var e = esc();
    if (!e) return;
    e.cargar(infoNivel());
    e.mostrarProgreso(acc().mostrarProgreso !== false);
}

/** Lo que la escena necesita para armar el nivel actual. */
function infoNivel() {
    var n = nivel();
    var visibles = Number(juego().visibles) || 6;
    // objetos nuevos al azar en cada ronda (formas, colores y tamaños según el generador del nivel)
    objetosRonda = R().generarObjetos(n, Math.random);
    var ronda = { objetos: objetosRonda, contenedores: n.contenedores, criterios: n.criterios };
    return {
        numero: nivelIdx + 1,
        total: totalNiveles(),
        criterio: n.criterio || "",
        edad: ((gameConfig.niveles || [])[0] || {}).edad || "5-6 años",
        celebracion: n.celebracion,
        visibles: visibles,
        contenedores: n.contenedores || [],
        objetos: R().ordenCinta(ronda, visibles)
    };
}

function pintarProgreso() {
    var e = esc();
    if (e) e.progreso(R().contar(clasificados, objetosNivel()), objetosNivel().length, colores);
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
    // Un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista breve.
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3800);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosEstacion) window.SonidosEstacion.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosEstacion) window.SonidosEstacion.agachar(false);
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
    if (forzar) callar();
    vozLibreDesde = ahora + (Number(juego().vozPausaMs) || 2200);
    hablar(texto, pj, gesto || "celebra");
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosEstacion) window.SonidosEstacion.agachar(false);
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
 * Zoe y Zeus entran y salen caminando: mientras el CSS los lleva (MARCHA_MS, igual que la
 * transición de style.css) el modelo 3D pone el clip "Caminar" y mira hacia donde va.
 */
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
    if (window.SonidosEstacion) {
        window.SonidosEstacion.desbloquear();
        window.SonidosEstacion.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosEstacion,
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

/** Sin clasificar nada durante un rato: un objeto salta, su contenedor brilla y un camino de luz los une. */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!acc().ayudaAutomatica) return;
    tAyuda = setTimeout(function () {
        if (!jugando || !esc()) return;
        var lista = esc().enCinta();
        if (!lista.length) { programarAyuda(2000); return; }
        var id = lista[turnoAyuda % lista.length];
        turnoAyuda += 1;
        var obj = objetoDef(id);
        var d = obj && destinoDe(obj);
        if (d) esc().pulsoAyuda(id, d.id);
        decirRapido(R().pista(nivel(), obj, criterios(), turnoAyuda % 2 === 0), turnoAyuda % 2 ? "zoe" : "zeus", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 16000);
    }, ms || Number(juego().ayudaMs) || 13000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar en el nivel i (0..3).
 * opciones.demo   la mano enseña el gesto (solo en el nivel 1 y si "Mostrar demostración" está activa)
 * opciones.boton  espera «¡Comenzar a jugar!» (nivel 1). Los niveles 2 a 4 arrancan tras la instrucción.
 */
async function entrar(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    var e = esc();
    if (!e) return;
    if (escenaLista) await escenaLista;
    if (!vivo(tk)) return;
    nivelIdx = Math.max(0, Math.min(totalNiveles() - 1, i | 0));
    clasificados = {};
    colores = [];
    errores = {};
    fuerasSeguidos = 0;
    turnoAcierto = 0;
    turnoAyuda = 0;
    jugando = false;
    limpiarAyuda();
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosEstacion) window.SonidosEstacion.musica(false);
    zoe(false);
    zeus(false);
    e.terminarFiesta();
    e.arrastre(false);
    if (o.transicion) {
        // sin fundido: los contenedores viejos se van por el estante, llegan los nuevos y la cinta trae los objetos
        await e.cambiarNivel(infoNivel());
        if (!vivo(tk)) return;
        e.mostrarProgreso(acc().mostrarProgreso !== false);
    } else {
        cargarNivelEnEscena();
    }
    aplicarAccesibilidad();

    document.body.classList.add("presentando");
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.EstacionDemo;
    try {
        await zoe(true);
        if (!vivo(tk)) return;
        if (nivelIdx === 0) {
            // instrucción inicial del juego
            await decir(textos().introZoe, "zoe", "saluda", 10000);
            if (!vivo(tk)) return;
        }
        if (conDemo) {
            zoe(false);
            await zeus(true);
            if (!vivo(tk)) return;
            enDemo = true;
            document.body.classList.add("demo-lock");
            await window.EstacionDemo.correr(apiDemo(tk));
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
            if (!vivo(tk)) return;
        }
        // instrucción del criterio del nivel: las etiquetas laten mientras se explica
        e.resaltarEtiquetas();
        await decir(nivel().zoe, conDemo ? "zeus" : "zoe", "senala", 6500);
        if (!vivo(tk)) return;
    } catch (err) {
        console.warn("[Estación] presentación", err);
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
    var visibles = e.enCinta();
    // la demo usa el primer objeto de la cinta (cambia en cada ronda)
    var id = visibles[0];
    var obj = objetoDef(id);
    var dest = obj ? destinoDe(obj) : null;
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk) || !dest; },
        textoDemo: function () { return R().plantilla(textos().demoZeus || "", obj); },
        objeto: function () { return id; },
        punto: function (oid) { return e.puntoCliente(oid); },
        destino: function () { return dest ? e.puntoBinCliente(dest.id) : null; },
        tomar: function (oid) { e.tomarDemo(oid); sfx("seleccion"); },
        resaltar: function (on) { if (dest) e.resaltarBin(dest.id, on); },
        mover: function (oid, x, y) { e.ponerCliente(oid, x, y); sfx("arrastre"); },
        entregar: async function (oid) {
            await e.aceptar(oid, dest.id, { demo: true });
            await sleep(700);
            await e.deshacer(oid);
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
    await entrar(0, { demo: true, boton: true });
}

function alTomar() {
    if (!jugando) return;
    limpiarAyuda();
    sfx("seleccion");
}

/** El objeto ya cayó dentro del contenedor: cuenta para el progreso. */
function alDentro() {
    sfx("acierto");
    if (enDemo) return;
    pintarProgreso();
}

async function alSoltar(datos) {
    var tk = token;
    var e = esc();
    if (!e || !datos) return;
    if (!jugando || clasificados[datos.id]) {
        if (!clasificados[datos.id]) await e.devolver(datos.id);
        return;
    }
    var obj = objetoDef(datos.id);
    if (!datos.contenedor) {
        // fuera de los contenedores: vuelve a la cinta sin decir nada; si se repite, una indicación amable
        sfx("regreso");
        fuerasSeguidos += 1;
        await e.devolver(datos.id);
        if (!vivo(tk)) return;
        if (fuerasSeguidos >= (Number(juego().fuerasParaPista) || 2)) {
            fuerasSeguidos = 0;
            decirRapido(textos().fuera, "zoe", "senala");
        }
        programarAyuda();
        return;
    }
    fuerasSeguidos = 0;
    var cont = contenedorDef(datos.contenedor);
    // validación explícita de TODOS los criterios del nivel (en el nivel 4, color y tamaño a la vez)
    var res = R().evaluar(obj, cont, criterios());
    if (res.acierto) {
        clasificados[datos.id] = true;
        colores.push(window.DibujosEstacion ? window.DibujosEstacion.tinte(obj.color) : 0x7ff3ff);
        errores[datos.id] = 0;
        var ultimo = R().completo(clasificados, objetosNivel());
        if (ultimo) {
            jugando = false;
            limpiarAyuda();
            e.arrastre(false);
        }
        await e.aceptar(datos.id, datos.contenedor);
        if (!vivo(tk)) return;
        if (ultimo) {
            if (nivelIdx + 1 < totalNiveles()) await completarNivel(tk);
            else await completar(tk);
            return;
        }
        decirRapido(R().frase(textos().aciertos, turnoAcierto++), turnoAcierto % 2 ? "zoe" : "zeus");
        programarAyuda();
        return;
    }
    // contenedor equivocado: señal naranja suave, el objeto vuelve y una pista que invita a mirar otra vez
    sfx("suave");
    errores[datos.id] = (errores[datos.id] || 0) + 1;
    var insiste = errores[datos.id] >= (Number(juego().erroresParaAyuda) || 2);
    var texto = R().pista(nivel(), obj, res.fallos, insiste);
    decirRapido(texto, "zoe", "senala", true);
    await e.rechazar(datos.id, datos.contenedor, res.fallos);
    if (!vivo(tk)) return;
    if (insiste) {
        errores[datos.id] = 0;
        var d = destinoDe(obj);
        if (d && acc().ayudaAutomatica !== false) e.pulsoAyuda(datos.id, d.id);
    }
    programarAyuda();
}

/** Niveles 1 a 3 terminados: cartel con el mensaje del nivel, celebración propia y paso al siguiente. */
async function completarNivel(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    await sleep(350);
    if (!vivo(tk)) return;
    sfx("nivel");
    mostrarCartel(nivel().cartel, nivel().celebracion);
    await Promise.all([
        e ? e.celebrarNivel(nivel().celebracion) : sleep(1500),
        decir(nivel().voz, "zoe", "celebra", 5200)
    ]);
    if (!vivo(tk)) return;
    ocultarCartel();
    await entrar(nivelIdx + 1, { demo: false, boton: false, transicion: true });
}

/** Nivel 4 terminado: su celebración, la escena final «La estación en marcha» y la victoria. */
async function completar(tk) {
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    var e = esc();
    if (e) e.arrastre(false);
    await sleep(350);
    if (!vivo(tk)) return;
    sfx("nivel");
    mostrarCartel(nivel().cartel, nivel().celebracion);
    await Promise.all([
        e ? e.celebrarNivel(nivel().celebracion) : sleep(1500),
        decir(nivel().voz, "zoe", "celebra", 5200)
    ]);
    if (!vivo(tk)) return;
    ocultarCartel();
    if (e) e.terminarFiesta();
    if (window.SonidosEstacion) window.SonidosEstacion.musica(true);
    if (e) {
        try {
            await e.cinematica();
        } catch (err) {
            console.warn("[Estación] escena final", err);
        }
    }
    document.body.classList.remove("cinematica");
    if (!vivo(tk)) return;
    sfx("victoria");
    mostrarCartel(textos().finalCartel, "final");
    document.body.classList.add("en-final");
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    var g1 = guiaDe("zoe"), g2 = guiaDe("zeus");
    if (g1) g1.gesto("final");
    if (g2) g2.gesto("final");
    await decir(textos().finalVoz, "zoe", "final", 9000);
    if (!vivo(tk)) return;
    await decir(textos().finalVozZeus, "zeus", "celebra", 4000);
    if (!vivo(tk)) return;
    await sleep(300);
    if (!vivo(tk)) return;
    ocultarCartel();
    if (window.SonidosEstacion) window.SonidosEstacion.musica(false);
    mostrarVictoria();
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = (textos().finalTitulo || "¡EXCELENTE!") + "\n" + (textos().finalTexto || "");
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

/** texto: { etiqueta, titulo, sub }. tema: estilo del cartel (colores · tamanos · formas · doble · final). */
function mostrarCartel(texto, tema) {
    var c = document.getElementById("cartel");
    var o = texto && typeof texto === "object" ? texto : { titulo: texto || "" };
    var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || ""; };
    poner("cartel-etiqueta", o.etiqueta);
    poner("cartel-titulo", o.titulo);
    poner("cartel-sub", o.sub);
    if (c) {
        c.className = "cartel" + (tema ? " cartel-" + tema : "");
        c.hidden = false;
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
    gameConfig = JSON.parse(readText("config.json?v=20261124c"));
    var introCrudo = readText("../../intro.json");
    introConfig = introCrudo ? JSON.parse(introCrudo) : { personajes: [] };
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    var problemas = R().validar(gameConfig);
    if (problemas.length) console.warn("[Estación] config.json", problemas);
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
        esc().al("arrastrar", function () { sfx("arrastre"); });
        esc().al("sobre", function () { if (jugando) sfx("sobre"); });
        esc().al("soltar", alSoltar);
        esc().al("escaner", function () { sfx("escaner"); });
        esc().al("compuerta", function () { sfx("compuerta"); });
        esc().al("dentro", alDentro);
        esc().al("entra", function () { sfx("entra"); });
        esc().al("ding", function (i) { sfx("ding", i); });
        esc().al("lanza", function () { sfx("lanza"); });
        esc().al("llega", function () { sfx("desliza"); });
        esc().al("frena", function () { sfx("frena"); });
        esc().al("fuego", function () { sfx("fuego"); });
        esc().al("cine", function (on) { document.body.classList.toggle("cinematica", !!on); });
        escenaLista = esc().montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Estación] la escena no se pudo montar");
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
        if (window.SonidosEstacion) window.SonidosEstacion.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosEstacion) window.SonidosEstacion.detenerTodo();
    };
});
