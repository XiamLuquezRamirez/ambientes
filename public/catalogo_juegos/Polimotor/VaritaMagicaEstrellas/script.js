/**
 * La Varita Mágica y las Estrellas en el Cielo — flujo del juego (Polimotor, Prejardín 3-4 años, trazado de curvas).
 *
 * inicio → intro 3D → PedniaEdad → presentación (Zeus: «¡Magia en el cielo!…») → demostración (una estrellita
 * recorre la curva) → Zoe: «¡Sigue la curvita…!» → «¡Comenzar a jugar!» → 4 cielos (estrella viajera, camino de la
 * luna, nubes mágicas, gran camino estelar) → la varita estalla en luz → escena final «El cielo de los pequeños
 * magos» → victoria compartida.
 *
 * Los cuatro caminos se generan al azar UNA vez por partida (ReglasVarita.generarPartida) y se evita repetir la
 * plantilla de la partida anterior. Aquí no se decide si el trazo avanza (ReglasVarita) ni se dibuja
 * (EscenarioVarita): solo se enlazan pantallas, voces, sonidos, ayudas y niveles. Nada resta: salirse o levantar el
 * dedo no pierde el progreso.
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var nivelIdx = 0;
var hechos = 0;
var partida = [];
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var tVozSoltar = 0;
var tVozFuera = 0;
var tVozToque = 0;
var tVozQuieto = 0;
var turnoEstrella = 0;
var tomoAlgunaVez = false;
var volumenListo = false;
var escenaLista = null;
var CLAVE_ULTIMA = "pednia_varita_ultima";
var audioFondo = null;
var audioIniciado = false;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function esc() { return window.EscenarioVarita && window.EscenarioVarita.listo() ? window.EscenarioVarita : null; }
function sfx(nombre) {
    var s = window.SonidosVarita;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function juego() { return gameConfig.juego || {}; }
function cielos() { return gameConfig.cielos || []; }
function cielo() { return cielos()[nivelIdx] || {}; }
function total() { return Math.max(1, cielos().length); }
function vivo(tk) { return tk === token; }
function colores() { return cielos().map(function (c) { return (c.colores || ["#ffffff"])[0]; }); }

function frase(lista, i) {
    if (!Array.isArray(lista)) return lista || "";
    return lista.length ? lista[i % lista.length] : "";
}

// ------------------------------------------------------------------ caminos de la partida

function leerUltima() {
    try {
        var v = JSON.parse(localStorage.getItem(CLAVE_ULTIMA) || "[]");
        return Array.isArray(v) ? v : [];
    } catch (e) {
        return [];
    }
}

/** Los cuatro caminos de esta partida, al azar y validados; se recuerda qué plantillas salieron. */
function generarPartida() {
    var R = window.ReglasVarita;
    if (!R) return [];
    var lista = R.generarPartida(cielos(), juego(), Math.random, leerUltima());
    try {
        localStorage.setItem(CLAVE_ULTIMA, JSON.stringify(lista.map(function (c) { return c.plantilla; })));
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
    lista.forEach(function (c, i) {
        if (c.respaldo) console.warn("[Varita] nivel " + (i + 1) + ": se usó el camino de respaldo", c.motivos);
    });
    return lista;
}

// ------------------------------------------------------------------ música de fondo

/** La misma música de fondo de los juegos de Polimotor (audios.fondo); volumen.js la regula con el canal de fondo. */
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
    if (p && p.catch) p.catch(function () { /* sin gesto todavía o sin archivo: el juego sigue sin música */ });
}

// ------------------------------------------------------------------ demostración

/**
 * La demo del cielo: la varita recorre la curva (EscenarioVarita.demo) y la mano del tutorial va encima, la toma,
 * la arrastra y la suelta al final. Las estrellas suenan al encenderse, como en la partida.
 */
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
        T.puntaManoEn(mano, p.x, p.y + (fase === "suelta" ? -60 : 0));
        if (fase === "suelta") {
            mano.style.transition = "transform 500ms ease-out";
            setTimeout(function () { if (mano) mano.style.transition = "none"; }, 520);
        }
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
    // un solo mensaje a la vez: globo si el personaje está en pantalla, si no la pista breve arriba
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && zoeEn);
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && zeusEn);
    var enPantalla = quien === "zoe" ? zoeEn : zeusEn;
    if (texto && !cartelVisible && !enPantalla) mostrarPista(texto, quien, 3800);
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosVarita) window.SonidosVarita.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosVarita) window.SonidosVarita.agachar(false);
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

/** Comentario breve durante la partida: se omite si ya hay otra voz sonando (no se repiten audios a cada rato). */
function decirRapido(texto, pj, gesto) {
    var ahora = Date.now();
    if (vozActiva || ahora < vozLibreDesde) return false;
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
    if (window.SonidosVarita) window.SonidosVarita.agachar(false);
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
    if (window.SonidosVarita) window.SonidosVarita.desbloquear();
    audioIniciado = true;
    musicaFondo(true);
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosVarita,
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

/** Un rato sin trazar: una lucecita recorre el tramo que sigue y Zoe o Zeus lo recuerdan (sin repetir a cada rato). */
function programarAyuda(ms) {
    clearTimeout(tAyuda);
    if (!jugando) return;
    tAyuda = setTimeout(function () {
        if (!jugando || !esc()) return;
        var st = esc().estado();
        if (st && st.estado !== "lista") { programarAyuda(4000); return; }
        if (acc().ayudaAutomatica !== false) esc().ayuda();
        else esc().destelloVarita();
        if (!tomoAlgunaVez) decirRapido(textos().pistaVarita, "zeus", "senala");
        else decirRapido(textos().soltar, "zoe", "senala");
        programarAyuda(Number(juego().ayudaRepetirMs) || 12000);
    }, ms || Number(juego().ayudaMs) || 9000);
}

// ------------------------------------------------------------------ partida

/**
 * Entrar al cielo i (0..3).
 * opciones.boton  espera «¡Comenzar a jugar!» (nivel 1). Los demás arrancan tras su demostración breve.
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
    document.body.classList.remove("en-final", "jugando", "cielo-1", "cielo-2", "cielo-3", "cielo-4");
    document.body.classList.add("cielo-" + (nivelIdx + 1));
    ocultarFinal();
    ocultarCartel();
    e.entrada(false);
    e.cargar(partida[nivelIdx], cielo());
    e.niveles(total(), nivelIdx, hechos, colores());
    aplicarAccesibilidad();
    document.body.classList.add("presentando", "demo-lock");
    var demoOn = acc().mostrarIntro !== false;

    try {
        await e.presentar();
        if (!vivo(tk)) return;
        if (nivelIdx === 0) {
            await zeus(true);
            if (!vivo(tk)) return;
            await decir(textos().introZeus, "zeus", "saluda", 15000);
            if (!vivo(tk)) return;
            if (demoOn) {
                var voz = decir(textos().demoZeus, "zeus", "senala", 6000);
                await Promise.all([demoConMano(e, tk), voz]);
                if (!vivo(tk)) return;
            }
            zeus(false);
            await zoe(true);
            if (!vivo(tk)) return;
            await decir(textos().guiaZoe, "zoe", "senala", 6000);
            if (!vivo(tk)) return;
        } else {
            // demostración breve de cada cielo mientras se dice la instrucción del nivel
            var habla = decir(cielo().instruccion, cielo().voz === "zeus" ? "zeus" : "zoe", "senala", 6500);
            if (demoOn) await Promise.all([demoConMano(e, tk), habla]);
            else await habla;
            if (!vivo(tk)) return;
        }
    } catch (err) {
        console.warn("[Varita] presentación", err);
    }
    document.body.classList.remove("demo-lock");
    if (!vivo(tk)) return;
    if (o.boton !== false) {
        var sigue = await esperarBoton(tk, textos().botonComenzar || "¡Comenzar a jugar!");
        if (!vivo(tk) || !sigue) return;
    }
    zoe(false);
    zeus(false);
    document.body.classList.remove("presentando");
    document.body.classList.add("jugando");
    e.entrada(true);
    jugando = true;
    programarAyuda();
}

/** El botón único de Polimotor (#comenzar-wrap): «¡Comenzar a jugar!» del primer cielo. */
function esperarBoton(tk, texto) {
    return new Promise(function (resolve) {
        var wrap = document.getElementById("comenzar-wrap");
        var btn = document.getElementById("btn-comenzar");
        if (!wrap || !btn) { resolve(true); return; }
        var span = btn.querySelector(".btn-comenzar-texto");
        if (span) span.textContent = texto;
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

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    hechos = 0;
    aplicarAccesibilidad();
    await entrar(0, { boton: true });
}

// ------------------------------------------------------------------ eventos de la escena

function alTomar() {
    sfx("varita");
    if (!jugando) return;
    tomoAlgunaVez = true;
    limpiarAyuda();
}

function alMover(info) {
    sfx("polvo", info && info.avance);
}

function alEstrella(info) {
    sfx("estrella", info.i, info.ultima);
    if (!jugando || info.ultima) return;
    // una frase de vez en cuando, no a cada estrella
    if (info.i % 2 === 1) decirRapido(frase(textos().estrella, turnoEstrella++), turnoEstrella % 2 ? "zoe" : "zeus", "celebra");
}

function alFuera() {
    sfx("fuera");
    if (!jugando) return;
    var ahora = Date.now();
    if (ahora - tVozFuera > (Number(juego().vozFueraMs) || 9000)) {
        if (decirRapido(textos().fuera, "zoe", "senala")) tVozFuera = ahora;
    }
}

function alVuelve() { sfx("vuelve"); }

function alSoltar() {
    sfx("pausa");
    if (!jugando) return;
    programarAyuda(4500);
    var ahora = Date.now();
    if (ahora - tVozSoltar > (Number(juego().vozSoltarMs) || 12000)) {
        if (decirRapido(textos().soltar, "zoe", "senala")) tVozSoltar = ahora;
    }
}

function alQuieto() {
    sfx("ayuda");
    if (!jugando) return;
    var ahora = Date.now();
    if (ahora - tVozQuieto > 14000 && decirRapido(textos().guiaZoe, "zoe", "senala")) tVozQuieto = ahora;
}

function alTocaFuera() {
    if (!jugando || !esc()) return;
    esc().destelloVarita();
    sfx("toque");
    var ahora = Date.now();
    if (ahora - tVozToque > 7000 && decirRapido(textos().tocaVarita, "zoe", "senala")) tVozToque = ahora;
}

function alMeta() {
    if (!jugando) return;
    var tk = token;
    jugando = false;
    limpiarAyuda();
    if (nivelIdx + 1 < total()) completarNivel(tk);
    else completar(tk);
}

/** Cielo terminado: la curva y la figura se iluminan, cartel del nivel, voz y se pasa solo al cielo siguiente. */
async function completarNivel(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    if (e) e.entrada(false);
    hechos = Math.max(hechos, nivelIdx + 1);
    sfx("figura");
    var fig = e ? e.completar() : Promise.resolve();
    await sleep(500);
    if (!vivo(tk)) return;
    if (e) {
        e.niveles(total(), -1, hechos, colores());
        e.ganarNivel(nivelIdx);
    }
    sfx("victoria");
    mostrarCartel(cielo().cartel || cielo().logro || "¡Muy bien!");
    await Promise.all([fig, decir(cielo().logro, cielo().voz === "zeus" ? "zoe" : "zeus", "celebra", 5200), sleep(2200)]);
    if (!vivo(tk)) return;
    // sin botón: tras la celebración se pasa solo al cielo siguiente
    await sleep(900);
    if (!vivo(tk)) return;
    ocultarCartel();
    await fundir();
    if (!vivo(tk)) return;
    await entrar(nivelIdx + 1, { boton: false });
}

function fundir() {
    var f = document.getElementById("fundido");
    if (!f) return sleep(300);
    f.classList.remove("va");
    void f.offsetWidth;
    f.classList.add("va");
    return sleep(700);
}

/**
 * Último cielo: figura y mensaje del nivel 4, la varita estalla en luz, todas las estrellas brillan y entra la
 * escena final «El cielo de los pequeños magos» con Zoe y Zeus celebrando; después, la victoria compartida.
 */
async function completar(tk) {
    var e = esc();
    document.body.classList.remove("jugando");
    if (e) e.entrada(false);
    hechos = total();
    sfx("figura");
    var fig = e ? e.completar() : Promise.resolve();
    await sleep(500);
    if (!vivo(tk)) return;
    if (e) {
        e.niveles(total(), -1, hechos, colores());
        e.ganarNivel(nivelIdx);
    }
    sfx("victoria");
    mostrarCartel(cielo().cartel || cielo().logro);
    await Promise.all([fig, decir(cielo().logro, "zeus", "celebra", 5200), sleep(2400)]);
    if (!vivo(tk)) return;
    ocultarCartel();
    if (e) {
        try {
            await e.granFinal();
            if (!vivo(tk)) return;
            sfx("fanfarria");
            await e.escenaFinal();
            e.fiesta(true);
        } catch (err) {
            console.warn("[Varita] escena final", err);
        }
    }
    if (!vivo(tk)) return;
    document.body.classList.add("en-final");
    mostrarMensajeFinal(true);
    await Promise.all([zoe(true), zeus(true)]);
    if (!vivo(tk)) return;
    var g = guiaDe("zoe");
    if (g) g.gesto("celebra");
    await decir(textos().finalVoz, "zoe", "final", 8000);
    if (!vivo(tk)) return;
    await decir(textos().finalVozZeus, "zeus", "final", 5000);
    if (!vivo(tk)) return;
    await sleep(2500);
    if (!vivo(tk)) return;
    mostrarMensajeFinal(false);
    if (e) e.terminarFiesta();
    mostrarVictoria();
}

function mostrarMensajeFinal(on) {
    var caja = document.getElementById("mensaje-final");
    if (!caja) return;
    if (on) {
        document.getElementById("mensaje-final-titulo").textContent = textos().finalTitulo || "¡LO LOGRASTE, PEQUEÑO MAGO!";
        document.getElementById("mensaje-final-sub").textContent = textos().finalTexto || "";
    }
    caja.hidden = !on;
}

function mostrarVictoria() {
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    // en la victoria compartida solo cabe una frase corta (si no, tapa «¿Quieres jugar nuevamente?»)
    if (texto) texto.textContent = textos().finalTitulo || "¡LO LOGRASTE!";
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

/** texto: una frase, o { etiqueta, titulo, sub } (cielos[].cartel). */
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
    gameConfig = JSON.parse(readText("config.json?v=20261124b"));
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
    enlazarMenus();
    aplicarAccesibilidad();
    partida = generarPartida();

    var E = window.EscenarioVarita;
    if (E) {
        E.al("tomar", alTomar);
        E.al("mover", alMover);
        E.al("estrella", alEstrella);
        E.al("fuera", alFuera);
        E.al("vuelve", alVuelve);
        E.al("soltar", alSoltar);
        E.al("quieto", alQuieto);
        E.al("tocaFuera", alTocaFuera);
        E.al("meta", alMeta);
        E.al("aparece", function () { sfx("aparece"); });
        E.al("demoToma", function () { sfx("varita"); });
        E.al("demoEstrella", function (info) { sfx("estrella", info.i, info.ultima); });
        E.al("ayuda", function () { sfx("ayuda"); });
        E.al("luna", function () { sfx("luna"); });
        E.al("explosion", function () { sfx("explosion"); });
        escenaLista = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            if (!ok) console.warn("[Varita] la escena no se pudo montar");
            else if (partida[0]) {
                E.cargar(partida[0], cielos()[0]);
                E.niveles(total(), 0, 0, colores());
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
        if (window.SonidosVarita) window.SonidosVarita.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    // PedniaSalir.js llama a esto también cuando la página se oculta (cambio de ventana o de pestaña): se pausa
    // todo, y al volver a verse se reanuda (antes el silencio quedaba para siempre).
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosVarita) window.SonidosVarita.detenerTodo();
        musicaFondo(false);
    };
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible" || !audioIniciado) return;
        if (window.SonidosVarita && window.SonidosVarita.reanudar) window.SonidosVarita.reanudar();
        if (window.VolumenPolimotor && VolumenPolimotor.refrescar) VolumenPolimotor.refrescar();
        musicaFondo(true);
    });
    // pruebas: entrar a un cielo directo (sin intro) y ver la partida generada
    window.__varita = { entrar: entrar, partida: function () { return partida; }, regenerar: function () { partida = generarPartida(); return partida; } };
});
