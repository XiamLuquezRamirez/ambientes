/**
 * El Arquero de las Estrellas — flujo del juego (Polimotor, 5-6 años, tiro al blanco móvil: puntería, fuerza y
 * distancia).
 *
 * inicio → intro 3D → PedniaEdad → presentación (título, pasos, Zoe y Zeus; demostración automática: la mano tensa la
 * cuerda, la fuerza sube, la curva se alarga, espera el momento y suelta; la flecha se clava; no cuenta) → «EMPEZAR»
 * con transición → 4 niveles (3, 3, 4 y 5 flechas en la diana) → celebración de cada nivel → gran final con trofeo
 * dorado («¡PULSO DE ARQUERO EXPERTO!») → victoria compartida.
 *
 * Aquí no se decide si una flecha acierta (ReglasArquero, desde la escena) ni se dibuja (EscenarioArquero): solo se
 * enlazan pantallas, voces, sonidos, ayudas, puntos, objetivos, pausa y niveles. Fallar no resta nada.
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
var tPista = null;
var tVozFallo = 0;
var turnoFrase = 0;
var turnoFallo = 0;
var turnoQuieto = 0;
var turnoTensa = 0;
var tensaDichos = 0;
var topeDichos = 0;
var obstaculoDichos = 0;
var turnoObstaculo = 0;
var segundaDicha = false;
var volumenListo = false;
var escenaLista = null;
var audioFondo = null;
var audioIniciado = false;
var finalHecho = false;
var esperasPausa = [];
var aciertosNivel = 0;
var stats = { puntos: 0, impactos: 0, por: { 10: 0, 30: 0, 50: 0 }, disparos: 0 };
var puntosVistos = 0;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function esc() { return window.EscenarioArquero && window.EscenarioArquero.listo() ? window.EscenarioArquero : null; }
function sfx(nombre) {
    var s = window.SonidosArquero;
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

/** Los cuatro niveles: distancias, alturas y movimientos al azar, validados antes de jugar (si uno falla, se vuelve a sortear). */
function generarPartida() {
    var R = window.ReglasArquero;
    if (!R) return [];
    return rondas().map(function (r, i) {
        var nivel = null, avisos = [];
        for (var intento = 0; intento < 30; intento++) {
            nivel = R.prepararNivel(r, juego(), Math.random);
            avisos = R.validarNivel(nivel, juego());
            if (!avisos.length) break;
        }
        if (avisos.length) console.warn("[Arquero] nivel " + (i + 1) + " con avisos", avisos);
        return nivel;
    });
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

/** La mano del tutorial toma la cuerda, la arrastra hacia atrás, espera el momento y suelta (no cuenta). */
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
        if (fase === "aparece") mano.style.transition = "none";
        else if (fase === "arrastra") mano.style.transition = "transform 80ms linear";
        else mano.style.transition = "transform 350ms ease-out";
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
    if (window.SonidosArquero) window.SonidosArquero.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosArquero) window.SonidosArquero.agachar(false);
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
    if (window.SonidosArquero) window.SonidosArquero.agachar(false);
}

/** Panel de comunicación del torneo (durante la partida Zoe y Zeus hablan desde aquí). */
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
    if (window.SonidosArquero) window.SonidosArquero.desbloquear();
    audioIniciado = true;
    musicaFondo(true);
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosArquero,
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
 * Todo se detiene: diana, flecha en vuelo, cuerda, fondo, voces y tiempos de ayuda (si el arco estaba tenso, vuelve
 * a reposo sin disparar). Se activa sola al ocultar la pestaña o la aplicación.
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

// ------------------------------------------------------------------ HUD: nivel, objetivos y puntos

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
}

/** Una dianita por cada flecha que hay que clavar en el nivel: se encienden al acertar. */
function pintarProgreso() {
    var caja = document.getElementById("progreso");
    var nv = partida[nivelIdx];
    if (!caja || !nv) return;
    var D = window.DibujosArquero;
    var imgs = caja.querySelectorAll("img");
    if (imgs.length !== nv.aciertos) {
        caja.innerHTML = "";
        var lienzo = D && D.lienzo("mini");
        var src = lienzo ? lienzo.toDataURL() : "";
        for (var i = 0; i < nv.aciertos; i++) {
            var im = document.createElement("img");
            im.alt = "";
            im.src = src;
            caja.appendChild(im);
        }
        imgs = caja.querySelectorAll("img");
    }
    imgs.forEach(function (im, k) {
        var ya = k < aciertosNivel;
        if (ya && !im.classList.contains("llena")) im.classList.add("llena");
        if (!ya) im.classList.remove("llena");
    });
}

var animPuntos = null;
/** El número de PUNTOS sube contando, con una estrellita que salta. */
function pintarPuntos(valor, inmediato) {
    var el = document.getElementById("puntos-num");
    var caja = document.getElementById("puntos");
    if (!el) return;
    cancelAnimationFrame(animPuntos);
    var desde = puntosVistos, hasta = valor;
    var fmt = function (n) { return String(Math.max(0, Math.round(n))).padStart(3, "0"); };
    if (inmediato || desde === hasta) {
        puntosVistos = hasta;
        el.textContent = fmt(hasta);
        return;
    }
    if (caja) {
        caja.classList.remove("sube");
        void caja.offsetWidth;
        caja.classList.add("sube");
    }
    var t0 = performance.now(), dur = 650;
    var paso = function (t) {
        var u = Math.min(1, (t - t0) / dur);
        puntosVistos = desde + (hasta - desde) * u;
        el.textContent = fmt(puntosVistos);
        if (u < 1) animPuntos = requestAnimationFrame(paso);
        else puntosVistos = hasta;
    };
    animPuntos = requestAnimationFrame(paso);
}

/** Muestra el panel de cómo jugar (solo en la presentación). */
function pintarPasos() {
    var t = textos();
    var lista = document.getElementById("pasos-lista");
    var tit = document.getElementById("pasos-titulo");
    if (tit) tit.textContent = t.pasosTitulo || "CÓMO JUGAR";
    if (!lista) return;
    lista.innerHTML = "";
    var iconos = ["fa-hand-pointer", "fa-crosshairs", "fa-bullseye"];
    (t.pasos || []).forEach(function (p, i) {
        var li = document.createElement("li");
        li.innerHTML = "<span><b></b><small></small></span><i class=\"fa-solid " + (iconos[i] || "fa-star") + "\" aria-hidden=\"true\"></i>";
        li.querySelector("b").textContent = typeof p === "string" ? p : (p.titulo || "");
        li.querySelector("small").textContent = typeof p === "string" ? "" : (p.texto || "");
        lista.appendChild(li);
    });
}

// ------------------------------------------------------------------ partida

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
    aciertosNivel = 0;
    topeDichos = 0;
    obstaculoDichos = 0;
    document.body.classList.remove("en-final", "jugando", "nivel-1", "nivel-2", "nivel-3", "nivel-4");
    document.body.classList.add("nivel-" + (nivelIdx + 1));
    ocultarFinal();
    ocultarCartel();
    e.entrada(false);
    e.cargar(partida[nivelIdx], ronda());
    pintarNivel();
    pintarProgreso();
    aplicarAccesibilidad();
    e.ayudaAutomatica(acc().ayudaAutomatica !== false);
    document.body.classList.add("demo-lock");
    var presentacion = nivelIdx === 0 && o.boton !== false;
    if (presentacion) document.body.classList.add("presentando");
    else { zoe(false); zeus(false); }
    var demoOn = acc().mostrarIntro !== false;

    try {
        await e.presentar();
        if (!vivo(tk)) return;
        if (presentacion) {
            // presentación: Zoe explica mientras la mano hace la demostración; Zeus da el consejo del momento justo
            await Promise.all([zoe(true), zeus(true)]);
            if (!vivo(tk)) return;
            var voz = decir(textos().introZoe, "zoe", "saluda", 15000);
            if (demoOn) {
                // «Omitir demo» (comun/omitir-demo.js): cargar de nuevo el nivel corta la demo de la escena
                var omitirD = window.PedniaOmitirDemo ? window.PedniaOmitirDemo.mostrar(function () {
                    pintarPuntos(0, true);
                    e.cargar(partida[nivelIdx], ronda());
                }) : null;
                var demoP = Promise.all([demoConMano(e, tk), voz]);
                await (omitirD ? omitirD.esperar(demoP) : demoP);
                if (omitirD) omitirD.ocultar();
            } else {
                await voz;
            }
            if (!vivo(tk)) return;
            await decir(textos().introZeus, "zeus", "senala", 6000);
            if (!vivo(tk)) return;
            await Promise.all([zoe(false), zeus(false)]);
            if (!vivo(tk)) return;
            if (demoOn) {
                // los puntos de la demostración no cuentan: el contador vuelve a 000 y el nivel se recarga
                pintarPuntos(0, true);
                e.cargar(partida[nivelIdx], ronda());
                await e.presentar();
                if (!vivo(tk)) return;
            }
        }
    } catch (err) {
        console.warn("[Arquero] presentación", err);
    }
    document.body.classList.remove("demo-lock");
    if (!vivo(tk)) return;
    if (presentacion) {
        var sigue = await esperarBoton(tk, textos().botonComenzar || "EMPEZAR");
        if (!vivo(tk) || !sigue) return;
        document.body.classList.remove("presentando");
        await e.transicion();
        if (!vivo(tk)) return;
    }
    mostrarCartel(ronda().cartel || ronda().nombre);
    sfx("activar");
    await sleep(1600);
    if (!vivo(tk)) return;
    ocultarCartel();
    await sinPausa();
    if (!vivo(tk)) return;
    document.body.classList.add("jugando");
    e.entrada(true);
    jugando = true;
    e.iniciarRonda();
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
    stats = { puntos: 0, impactos: 0, por: { 10: 0, 30: 0, 50: 0 }, disparos: 0 };
    pintarPuntos(0, true);
    aplicarAccesibilidad();
    await entrar(0, { boton: true });
}

// ------------------------------------------------------------------ eventos de la escena

/** El niño toma la cuerda: pocas veces, Zoe anima a arrastrar (no a cada intento). */
function alTensa() {
    if (!jugando || nivelIdx > 1 || tensaDichos >= 2) return;
    if (decirRapido(frase(textos().tensa, turnoTensa++), "zoe", "senala")) tensaDichos++;
}

/** Llegó a la tensión máxima: en los primeros niveles Zeus avisa que ya puede soltar. */
function alTope() {
    if (!jugando || nivelIdx > 1 || topeDichos >= 1 || acc().ayudaAutomatica === false) return;
    if (decirRapido(textos().alTope, "zeus", "senala")) topeDichos++;
}

/** Soltó la flecha: tras el primer disparo del nivel 1, Zeus da su consejo de observar la diana. */
function alDisparo(info) {
    if (!info || info.demo) return;
    stats.disparos++;
    if (nivelIdx === 0 && !segundaDicha && ronda().instruccion2) {
        segundaDicha = true;
        setTimeout(function () { if (jugando) decirRapido(ronda().instruccion2, ronda().voz2 === "zoe" ? "zoe" : "zeus", "senala"); }, 1400);
    }
}

/** La flecha se clavó: suben los puntos y los objetivos; mensaje según el anillo, sin hablar a cada rato. */
function alImpacto(info) {
    var p = (info && info.puntos) || 10;
    stats.puntos += p;
    stats.impactos++;
    stats.por[p] = (stats.por[p] || 0) + 1;
    aciertosNivel = info ? info.hechos : aciertosNivel + 1;
    pintarPuntos(stats.puntos);
    pintarProgreso();
    var tp = (textos().puntos || {})[p] || {};
    if (esc() && tp.mensaje) esc().mensaje(tp.mensaje, p === 50 ? "#ffe066" : (p === 30 ? "#e599f7" : "#a5d8ff"));
    if (!jugando) return;
    if (info && info.hechos < info.total) {
        var voz = tp.voz && (p === 50 || turnoFrase % 2 === 0) ? tp.voz : frase(textos().acierto, turnoFrase);
        turnoFrase++;
        decirRapido(voz, turnoFrase % 2 ? "zoe" : "zeus", "celebra");
    }
}

/** La flecha no llegó a la diana: sin castigo; un consejo amable según cómo falló (no a cada disparo). */
function alFallo(info) {
    if (!jugando) return;
    var ahora = Date.now();
    // chocó con un asteroide: Zeus lo explica las primeras veces; luego una frase corta de vez en cuando
    if (info && info.consejo === "obstaculo") {
        var c0 = textos().consejos || {};
        var txt = obstaculoDichos < 2 ? c0.obstaculo : frase(textos().obstaculo, turnoObstaculo++);
        if (ahora - tVozFallo > 2500 && decirRapido(txt, "zeus", "senala")) { tVozFallo = ahora; obstaculoDichos++; }
        return;
    }
    var minF = Number(juego().fallosParaAyuda) || 2;
    var seguidos = info ? info.seguidos : 1;
    if (seguidos < minF && ahora - tVozFallo < (Number(juego().vozFalloMs) || 5000)) return;
    var c = textos().consejos || {};
    var t = seguidos >= minF && info && c[info.consejo] ? c[info.consejo] : frase(textos().fallo, turnoFallo++);
    var quien = info && info.consejo === "momento" ? "zeus" : "zoe";
    if (decirRapido(t, quien, "senala")) tVozFallo = ahora;
}

/** La diana cambió de lugar (nivel 2: distancia; nivel 4: altura). */
function alSituacion(info) {
    if (!jugando || !info) return;
    var t = textos();
    var texto = info.masLejos ? t.masLejos : (info.masCerca ? t.masCerca : (info.otraAltura ? t.otraAltura : ""));
    if (texto) decir(texto, info.masLejos ? "zoe" : "zeus", "senala", 4500);
}

/** Un rato sin tensar: Zeus anima con una frase corta (la escena muestra la pista de arrastre). */
function alQuieto() {
    if (!jugando || acc().ayudaAutomatica === false) return;
    decirRapido(frase(textos().quieto, turnoQuieto++), "zeus", "senala");
}

function alNivelCompleto() {
    if (!jugando) return;
    var tk = token;
    jugando = false;
    if (nivelIdx + 1 < total()) completarNivel(tk);
    else completar(tk);
}

/** Niveles 1, 2 y 3: la diana se ilumina, tres estrellas, Zoe y Zeus felicitan e invitan. */
async function completarNivel(tk) {
    var e = esc();
    if (e) e.entrada(false);
    document.body.classList.remove("jugando");
    hechos = Math.max(hechos, nivelIdx + 1);
    pintarNivel();
    sfx("victoria");
    mostrarCartel({ etiqueta: "Nivel " + (nivelIdx + 1), titulo: textos().cierreTitulo || "¡NIVEL SUPERADO!", sub: (ronda().logro || "") + "  ★ " + stats.puntos + " puntos" });
    var quien = ronda().despedida || "zoe";
    if (quien === "ambos") gestoAmbos("celebra");
    var fiesta = e ? e.celebrarNivel(false) : sleep(2000);
    await Promise.all([decir(textos().cierreNivel, quien === "zeus" ? "zeus" : "zoe", "celebra", 6000), fiesta]);
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
 * Nivel 4: la gran celebración (una vez): onda dorada, lluvia de estrellas, gran trofeo dorado, banderines y columnas
 * encendidos, Zoe y Zeus celebran, «¡PULSO DE ARQUERO EXPERTO!» con el resumen, y al final la victoria compartida.
 */
async function completar(tk) {
    if (finalHecho) return;
    finalHecho = true;
    var e = esc();
    document.body.classList.add("demo-lock");
    if (e) e.entrada(false);
    hechos = total();
    pintarNivel();
    sfx("victoria");
    try {
        document.body.classList.remove("jugando");
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
        console.warn("[Arquero] final", err);
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
        document.getElementById("mensaje-final-titulo").textContent = textos().finalTitulo || "¡PULSO DE ARQUERO EXPERTO!";
        document.getElementById("mensaje-final-sub").textContent = textos().finalSub || "";
        var poner = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = String(v); };
        poner("final-puntos", stats.puntos);
        poner("final-impactos", stats.impactos);
        poner("final-10", stats.por[10] || 0);
        poner("final-30", stats.por[30] || 0);
        poner("final-50", stats.por[50] || 0);
    }
    caja.hidden = !on;
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) texto.textContent = textos().victoria || "¡PULSO DE ARQUERO EXPERTO!";
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
    gameConfig = JSON.parse(readText("config.json?v=20261127k"));
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
    pintarPasos();
    enlazarMenus();
    aplicarAccesibilidad();
    partida = generarPartida();

    var E = window.EscenarioArquero;
    if (E) {
        E.al("tensa", alTensa);
        E.al("alTope", alTope);
        E.al("disparo", alDisparo);
        E.al("impacto", alImpacto);
        E.al("fallo", alFallo);
        E.al("situacion", alSituacion);
        E.al("quieto", alQuieto);
        E.al("nivelCompleto", alNivelCompleto);
        E.al("demoPuntos", function (info) { pintarPuntos((info && info.puntos) || 50); });
        E.al("sonido", function (s) { if (s) sfx(s.n, s.a); });
        escenaLista = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Arquero] la escena no se pudo montar");
            else pintarProgreso();
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
        if (window.SonidosArquero) window.SonidosArquero.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosArquero) window.SonidosArquero.detenerTodo();
        musicaFondo(false);
    };
    // pestaña oculta: la partida se pausa (la diana deja de moverse y el arco vuelve a reposo); al volver, sigue
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible") {
            if (jugando) pausar(true);
            return;
        }
        if (pausado) pausar(false);
        if (!audioIniciado) return;
        if (window.SonidosArquero && window.SonidosArquero.reanudar) window.SonidosArquero.reanudar();
        if (window.VolumenPolimotor && VolumenPolimotor.refrescar) VolumenPolimotor.refrescar();
        musicaFondo(true);
    });
    // pruebas: entrar a un nivel directo y ver la partida generada
    window.__arquero = {
        entrar: entrar,
        partida: function () { return partida; },
        pausar: pausar,
        estado: function () { return { nivelIdx: nivelIdx, jugando: jugando, pausado: pausado, hechos: hechos, finalHecho: finalHecho, stats: stats, aciertosNivel: aciertosNivel }; }
    };
});
