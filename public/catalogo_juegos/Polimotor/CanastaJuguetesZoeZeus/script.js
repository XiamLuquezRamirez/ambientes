/**
 * La canasta de juguetes de Zoe y Zeus.
 * inicio → intro 3D → presentación del nivel → demostración → juego.
 * Tres niveles (3, 5 y 8 juguetes). El siguiente solo se abre al completar el actual.
 */
"use strict";

var gameConfig = null;
var introConfig = null;
var token = 0;
var partidaIniciada = false;
var jugando = false;
var enDemo = false;
var juegoTerminado = false;
var nivelIdx = 0;
var guardados = {};
var vozActiva = null;
var vozLibreDesde = 0;
var tAyuda = null;
var tPista = null;
var turnoAcierto = 0;
var volumenListo = false;

function readText(ruta) {
    var x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function R() { return window.ReglasCanasta; }
function esc() { return window.EscenarioCanasta || null; }
function sfx(nombre) {
    var s = window.SonidosCanasta;
    if (s && typeof s[nombre] === "function") s[nombre]();
}
function acc() { return gameConfig.accesibilidad || {}; }
function textos() { return gameConfig.textos || {}; }
function nivel() { return R().nivel(gameConfig, nivelIdx); }
function vivo(tk) { return tk === token; }

function fraseAcierto() {
    var lista = nivelIdx >= 2 ? (textos().aciertosFinales || textos().aciertos) : textos().aciertos;
    if (!lista || !lista.length) return "¡Muy bien!";
    var i = turnoAcierto % lista.length;
    turnoAcierto += 1;
    return lista[i];
}

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
    // Con el cartel en pantalla el mensaje ya se lee ahí: no lo repetimos en el globo.
    nube("zoe-nube", "zoe-nube-texto", quien === "zoe" ? texto : "", !cartelVisible && document.body.classList.contains("zoe-en"));
    nube("zeus-nube", "zeus-nube-texto", quien === "zeus" ? texto : "", !cartelVisible && document.body.classList.contains("zeus-en"));
    var guia = guiaDe(quien);
    if (gesto && guia) guia.gesto(gesto);
    if (texto && !cartelVisible) mostrarPista(texto, quien, 3200);
    if (!texto || gameConfig.mostrarFeedBack === false) return Promise.resolve();
    if (typeof TextoVoz === "undefined" || !TextoVoz.hablar) return Promise.resolve();
    if (window.SonidosCanasta) window.SonidosCanasta.agachar(true);
    if (guia) guia.hablar(true);
    var fin = function () {
        if (guia) guia.hablar(false);
        if (window.SonidosCanasta) window.SonidosCanasta.agachar(false);
    };
    var p = Promise.resolve(TextoVoz.hablar(texto, quien)).then(fin, fin);
    vozActiva = p;
    p.then(function () { if (vozActiva === p) vozActiva = null; });
    return p;
}

function decir(texto, pj, gesto) {
    var tk = token;
    var espera = vozActiva ? Promise.race([vozActiva, sleep(900)]) : Promise.resolve();
    return espera.then(function () {
        if (!vivo(tk)) return;
        vozActiva = null;
        return Promise.race([hablar(texto, pj, gesto), sleep(2800)]);
    });
}

function decirRapido(texto, pj) {
    var ahora = Date.now();
    if (vozActiva || ahora < vozLibreDesde) return;
    vozLibreDesde = ahora + (Number((gameConfig.juego || {}).vozPausaMs) || 2200);
    hablar(texto, pj, "celebra");
}

function callar() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosCanasta) window.SonidosCanasta.agachar(false);
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
    tPista = setTimeout(function () { caja.hidden = true; }, ms || 2400);
}

function zoe(on) { document.body.classList.toggle("zoe-en", !!on); if (!on) nube("zoe-nube", "zoe-nube-texto", "", false); }
function zeus(on) { document.body.classList.toggle("zeus-en", !!on); if (!on) nube("zeus-nube", "zeus-nube-texto", "", false); }

// ------------------------------------------------------------------ intro

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
    if (window.SonidosCanasta) {
        window.SonidosCanasta.desbloquear();
        window.SonidosCanasta.ambiente(true);
    }
    if (!volumenListo && window.VolumenPolimotor && VolumenPolimotor.iniciar) {
        volumenListo = true;
        VolumenPolimotor.iniciar({
            sonidos: window.SonidosCanasta,
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

// ------------------------------------------------------------------ HUD y accesibilidad

function pintarHud() {
    var n = nivel();
    var total = n && n.objetos ? n.objetos.length : 0;
    var hechos = Object.keys(guardados).length;
    var cuenta = document.getElementById("hud-cuenta");
    var nombre = document.getElementById("hud-nivel");
    var puntos = document.getElementById("hud-puntos");
    if (cuenta) cuenta.textContent = hechos + " / " + total;
    if (nombre) nombre.textContent = "Nivel " + (nivelIdx + 1);
    if (puntos) {
        puntos.innerHTML = "";
        for (var i = 0; i < total; i++) {
            var dot = document.createElement("i");
            if (i < hechos) dot.className = "listo";
            puntos.appendChild(dot);
        }
    }
    var barra = document.getElementById("hud-avance");
    if (barra) barra.setAttribute("aria-valuenow", String(hechos));
    var edad = document.getElementById("edad-pill");
    if (edad && gameConfig.niveles && gameConfig.niveles[0]) edad.textContent = gameConfig.niveles[0].edad;
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

// ------------------------------------------------------------------ flujo de niveles

function limpiarAyuda() { clearTimeout(tAyuda); tAyuda = null; }

function programarAyuda() {
    limpiarAyuda();
    if (!acc().ayudaAutomatica) return;
    var ms = Number((gameConfig.juego || {}).ayudaMs) || 12000;
    tAyuda = setTimeout(function () {
        if (!jugando) return;
        var n = nivel();
        if (!n) return;
        var pendiente = (n.objetos || []).filter(function (o) { return !guardados[o.id]; })[0];
        if (pendiente && esc()) esc().pulsoZona(pendiente.zona);
        programarAyuda();
    }, ms);
}

/**
 * Entrar en un nivel.
 *
 * opciones.presentar — Zoe y Zeus cuentan de qué va el nivel (en todos: la regla cambia).
 * opciones.demo      — la mano enseña a arrastrar. Solo en el nivel 1: el gesto es el mismo
 *                      en los tres, y repetirlo cansa a quien ya sabe jugar.
 * opciones.esperar   — botón "¡Comenzar a jugar!". Va con la demo: si no hay demo que mirar,
 *                      no hay nada que esperar y la partida arranca sola.
 */
async function entrarNivel(i, opciones) {
    var o = opciones || {};
    var tk = ++token;
    nivelIdx = i;
    var conCuento = o.presentar !== false;
    var conDemo = !!o.demo && acc().mostrarIntro !== false && !!window.CanastaDemo;
    var conEspera = conDemo && o.esperar !== false;
    guardados = {};
    turnoAcierto = 0;
    jugando = false;
    juegoTerminado = false;
    document.body.classList.remove("en-final", "jugando");
    ocultarFinal();
    ocultarCartel();
    if (window.SonidosCanasta) window.SonidosCanasta.musica(false);
    zoe(false);
    zeus(false);
    var e = esc();
    if (!e) return;
    e.arrastre(false);
    e.cargar(nivel());
    pintarHud();
    aplicarAccesibilidad();
    if (!vivo(tk)) return;
    if (conCuento) {
        document.body.classList.add("presentando");
        try { await presentar(tk); }
        catch (err) { console.warn("[Canasta] presentación", err); }
        if (!vivo(tk)) return;
        zoe(false);
        zeus(false);
        if (conDemo) {
            enDemo = true;
            document.body.classList.add("demo-lock");
            try { await window.CanastaDemo.correr(apiDemo(tk)); }
            catch (err) { console.warn("[Canasta] demo", err); }
            enDemo = false;
            document.body.classList.remove("demo-lock");
            if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        }
        if (!vivo(tk)) return;
        zoe(false);
        zeus(false);
        if (conEspera) {
            var sigue = await esperarComenzar(tk);
            if (!vivo(tk) || !sigue) return;
        } else {
            await sleep(400);
            if (!vivo(tk)) return;
        }
    }
    document.body.classList.remove("presentando");
    document.body.classList.add("jugando");
    e.arrastre(true);
    jugando = true;
    programarAyuda();
}

async function presentar(tk) {
    var n = nivel();
    if (!n) return;
    zoe(true);
    if (guiaDe("zoe")) guiaDe("zoe").caminar(true);
    await sleep(700);
    if (guiaDe("zoe")) guiaDe("zoe").caminar(false);
    if (!vivo(tk)) return;
    await decir(n.zoe, "zoe", "habla");
    if (!vivo(tk)) return;
    zeus(true);
    await sleep(500);
    if (!vivo(tk)) return;
    await decir(n.zeus, "zeus");
    if (!vivo(tk)) return;
    gestoGuia("senala");
}

function esperarComenzar(tk) {
    return new Promise(function (resolve) {
        var wrap = document.getElementById("comenzar-wrap");
        var btn = document.getElementById("btn-comenzar");
        if (!wrap || !btn) { resolve(true); return; }
        var texto = btn.querySelector("span");
        if (texto) texto.textContent = textos().botonComenzar || "¡Comenzar a jugar!";
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
    return {
        preparar: function () { e.arrastre(false); return Promise.resolve(); },
        cancelado: function () { return !vivo(tk); },
        textoDemo: function () { return (nivel() && nivel().demoVoz) || ""; },
        objeto: function () { return nivel().demo; },
        punto: function (id) { return e.puntoCliente(id); },
        destino: function (id) {
            var obj = (nivel().objetos || []).filter(function (o) { return o.id === id; })[0];
            return obj ? e.puntoZonaCliente(obj.zona) : null;
        },
        tomar: function (id) { e.marcarTomado(id); sfx("seleccion"); },
        mover: function (id, x, y) { e.ponerCliente(id, x, y); sfx("arrastre"); },
        entregar: async function (id) {
            e.soltarMarca(id);
            sfx("guardar");
            await e.guardar(id);
            sfx("acierto");
            await sleep(700);
            await e.deshacer(id);
        },
        decir: function (texto, pj) { return decir(texto, pj); },
        terminar: function () { return Promise.resolve(); }
    };
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    aplicarAccesibilidad();
    try { sessionStorage.removeItem("pednia_canasta_progreso"); } catch (e) { /* sesión privada */ }
    await entrarNivel(0, { presentar: true, demo: true });
}

function alTomar() {
    if (!jugando) return;
    limpiarAyuda();
    sfx("seleccion");
}

function alArrastrar() { sfx("arrastre"); }

async function alSoltar(dato) {
    var tk = token;
    var e = esc();
    if (!e || !dato) return;
    if (!jugando || guardados[dato.id]) {
        if (!guardados[dato.id]) await e.devolver(dato.id);
        return;
    }
    var info = e.infoSoltar(dato.id, dato.puntero);
    var res = R().evaluar(info || { guardado: true });
    if (res.acierto) {
        guardados[dato.id] = true;
        var total = (nivel().objetos || []).length;
        var esUltimo = Object.keys(guardados).length >= total;
        if (esUltimo) jugando = false;
        sfx("guardar");
        await e.guardar(dato.id);
        if (!vivo(tk) || !guardados[dato.id]) return;
        sfx("acierto");
        pintarHud();
        decirRapido(fraseAcierto(), turnoAcierto % 2 ? "zeus" : "zoe");
        var n = nivel();
        if (Object.keys(guardados).length >= (n.objetos || []).length) {
            await completarNivel();
            return;
        }
        programarAyuda();
        return;
    }
    if (res.motivo === "ya") return;
    await e.devolver(dato.id);
    if (!vivo(tk)) return;
    if (res.motivo === "incorrecta") {
        var obj = (nivel().objetos || []).filter(function (o) { return o.id === dato.id; })[0];
        var pista = (obj && obj.pista) || nivel().pista;
        decirRapido(pista, "zoe");
    }
    programarAyuda();
}

async function completarNivel() {
    var tk = token;
    jugando = false;
    document.body.classList.remove("jugando");
    limpiarAyuda();
    if (esc()) {
        esc().arrastre(false);
        await esc().celebrar();
    }
    if (!vivo(tk)) return;
    var n = nivel();
    mostrarCartel(n.listo || "¡Muy bien!");
    zoe(true);
    zeus(true);
    await decir(n.listo, "zoe", "celebra");
    if (!vivo(tk)) return;
    await sleep(500);
    ocultarCartel();
    if (nivelIdx + 1 >= R().niveles(gameConfig).length) {
        await escenaFinal(tk);
        return;
    }
    await fundir();
    if (!vivo(tk)) return;
    zoe(false);
    zeus(false);
    await entrarNivel(nivelIdx + 1, { presentar: true, demo: false });
}

async function escenaFinal(tk) {
    juegoTerminado = true;
    jugando = false;
    document.body.classList.add("en-final");
    document.body.classList.remove("jugando");
    if (esc()) esc().confeti();
    sfx("victoria");
    if (window.SonidosCanasta) window.SonidosCanasta.musica(true);
    zoe(true);
    zeus(true);
    if (!vivo(tk)) return;
    await decir(textos().finalVoz, "zoe", "final");
    if (!vivo(tk)) return;
    await decir(textos().finalVozZeus, "zeus", "final");
    if (!vivo(tk)) return;
    var caja = document.getElementById("final");
    var texto = document.getElementById("texto_final");
    if (texto) {
        texto.textContent = (textos().finalTitulo || "¡SÚPER ORDEN!") + "\n" + (textos().finalTexto || "");
    }
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
}

function ocultarCartel() {
    var c = document.getElementById("cartel");
    if (c) c.hidden = true;
}

function fundir() {
    var f = document.getElementById("fundido");
    if (!f) return sleep(300);
    f.classList.remove("va");
    void f.offsetWidth;
    f.classList.add("va");
    return sleep(700);
}

async function reiniciarNivel() {
    if (!partidaIniciada) {
        window.location.reload();
        return;
    }
    callar();
    limpiarAyuda();
    enDemo = false;
    document.body.classList.remove("demo-lock");
    if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    var wrap = document.getElementById("comenzar-wrap");
    if (wrap) wrap.hidden = true;
    // Reiniciar el nivel 1 vuelve a enseñar el gesto: quien lo reinicia suele estar perdido.
    await entrarNivel(nivelIdx, { presentar: true, demo: nivelIdx === 0 });
}

function volverAJugar() {
    reiniciarDesde(0);
}

function jugarNivel3() {
    reiniciarDesde(2);
}

function reiniciarDesde(i) {
    callar();
    limpiarAyuda();
    if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    // La demo enseña a arrastrar, y eso solo hace falta la primera vez: nivel 1.
    entrarNivel(i, { presentar: true, demo: i === 0 });
}

function salirAlMenu() {
    callar();
    if (window.SonidosCanasta) window.SonidosCanasta.detenerTodo();
    window.history.back();
}

// ------------------------------------------------------------------ arranque

document.addEventListener("DOMContentLoaded", function () {
    var crudo = readText("config.json?v=20261120x9");
    gameConfig = JSON.parse(crudo);
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
    pintarHud();

    if (esc()) {
        esc().al("tomar", alTomar);
        esc().al("arrastrar", alArrastrar);
        esc().al("soltar", alSoltar);
        esc().montar(document.getElementById("escenario"), gameConfig);
    }

    var on = function (id, fn) {
        var b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    on("btn-empecemos", empecemosJuego);
    on("btn-omitir-intro3d", function () { window.dispatchEvent(new CustomEvent("intro3d-omitir")); empezarJuegoTrasIntro(); });
    on("btn-continuar-intro3d", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
    on("btn-reiniciar", reiniciarNivel);
    on("btn-otra-vez", volverAJugar);
    on("btn-nivel-3", jugarNivel3);
    on("btn-al-menu", function () {
        callar();
        if (window.SonidosCanasta) window.SonidosCanasta.detenerTodo();
    });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () { if (esc()) esc().reacomodar(); });
    window.addEventListener("pagehide", function () {
        if (window.SonidosCanasta) window.SonidosCanasta.detenerTodo();
        if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.__PEDNIA_PARAR_AUDIO__ = function () {
        callar();
        if (window.SonidosCanasta) window.SonidosCanasta.detenerTodo();
    };
});
