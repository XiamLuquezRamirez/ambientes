/**
 * ¡Atrapa la Esfera Veloz! — flujo del juego (Polimotor, 5-6 años, coordinación visual).
 *
 * inicio → intro 3D (Zeus y Zoe) → edad → presentación en el túnel (título, tuberías que se encienden, el anillo
 * brilla, una esfera cruza y se captura sola; la guía —Zoe o Zeus, al azar— da la instrucción) → demostración automática (la mano toca cuando
 * la esfera está dentro del anillo; voz de Zeus) → "¡Comenzar a jugar!" → 3 rondas de 4 capturas (cada vez más
 * rápidas y variadas) → escena final (la energía recorre el túnel, el reactor brilla, fiesta) → resumen con
 * "Jugar nuevamente" y "Volver al menú".
 *
 * reglas.js decide, escena-tunel.js dibuja, sonidos.js suena, demo.js demuestra; aquí se ordena el flujo.
 * Los errores no castigan: un toque temprano o tardío solo da un pulso azul y un mensaje amable; la esfera que
 * pasa vuelve a salir (otra) hasta completar las 4 capturas de la ronda, cada vez un poco más lenta.
 */
"use strict";

// La guía 3D sale al azar en cada partida: Zoe o Zeus (guia-3d.js lee window.GUIA_PERSONAJE al cargar).
const GUIA = (window.GUIA_PERSONAJE = Math.random() < 0.5 ? "zeus" : "zoe");
const OTRO = GUIA === "zeus" ? "zoe" : "zeus";

let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introOmitida = false;

let partidaIniciada = false;   // ya pasó por la edad (presentación/demo)
let partidaEnCurso = false;    // ya empezó la primera ronda
let jugando = false;           // se aceptan toques
let juegoTerminado = false;
let enDemo = false;
let rondaIdx = 0;
let capturasRonda = 0;
let capturasTotal = 0;
let coloresRonda = [];
let fallosSeguidos = 0;
let sinToqueSeguidos = 0;
let historial = [];
let tocoEstaEsfera = false;    // hubo algún toque con esta esfera en vuelo
let tardeMarcada = false;      // ya se avisó "tarde" para esta esfera
let ultimoPasoMs = 0;
let bloqueoTempranoHasta = 0;
let token = 0;
let silencio = false;
let vozActiva = null;
let vozPrioridad = 0;
let vozLibreDesde = 0;
let nubeVisible = true;
let ultimaFrase = {};
let tAyuda = null;

function readText(ruta) {
    const x = new XMLHttpRequest();
    x.open("GET", ruta, false);
    x.send();
    return x.status === 200 ? x.responseText : null;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

// ------------------------------------------------------------------ accesos

const R = function () { return window.ReglasEsfera; };

function escenario() {
    return window.EscenarioEsfera && window.EscenarioEsfera.listo() ? window.EscenarioEsfera : null;
}

function esc() {
    return window.EscenarioEsfera || null;
}

function sfx(nombre) {
    const s = window.SonidosEsfera;
    if (s && typeof s[nombre] === "function") s[nombre]();
}

function acc() { return gameConfig.accesibilidad || {}; }
function cfgJuego() { return gameConfig.juego || {}; }
function textos() { return gameConfig.textos || {}; }
function cfgR(i) { return R().ronda(gameConfig, i == null ? rondaIdx : i); }
function porRonda() { return R().capturasPorRonda(gameConfig); }
function feedbackActivo() { return gameConfig.mostrarFeedBack !== false; }

function frase(clave) {
    const v = textos()[clave];
    if (!Array.isArray(v)) return v || "";
    if (v.length < 2) return v[0] || "";
    let i = Math.floor(Math.random() * v.length);
    if (i === ultimaFrase[clave]) i = (i + 1) % v.length;
    ultimaFrase[clave] = i;
    return v[i];
}

// ------------------------------------------------------------------ Zoe (guía 3D) y su nube

let tGesto = null;
let zoeEnEscena = false;

function guia3d() {
    return window.Guia3D && window.Guia3D.listo() ? window.Guia3D : null;
}

function gestoGuia(gesto) {
    if (guia3d() && gesto && gesto !== "habla") guia3d().gesto(gesto);
    const g = document.getElementById("guia");
    if (!g) return;
    g.classList.remove("habla", "senala", "celebra", "duda");
    void g.offsetWidth;
    if (["habla", "senala", "celebra", "duda"].indexOf(gesto) >= 0) g.classList.add(gesto);
    clearTimeout(tGesto);
    tGesto = setTimeout(function () { g.classList.remove("habla", "senala", "celebra", "duda"); }, 1900);
}

function nubeZoe(texto) {
    const caja = document.getElementById("zoe-nube");
    const span = document.getElementById("zoe-nube-texto");
    if (!caja || !span) return;
    if (!texto || !nubeVisible || !zoeEnEscena) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.classList.toggle("larga", span.textContent.length > 110);
    caja.style.setProperty("--dx", "0px");
    caja.style.setProperty("--dy", "0px");
    caja.hidden = false;
    const r = caja.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    caja.style.setProperty("--dx", Math.round(dx) + "px");
    const techo = 96;
    caja.style.setProperty("--dy", Math.max(0, Math.round(techo - r.top)) + "px");
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

function ubicarZoe() {
    const pj = document.querySelector("#guia .guia-pj");
    const e = esc();
    if (!pj || !e) return;
    const z = e.zonaZoe();
    if (!z) return;
    pj.style.left = Math.round(z.left) + "px";
    pj.style.top = Math.round(z.top) + "px";
    pj.style.width = Math.round(z.width) + "px";
    pj.style.height = Math.round(z.height) + "px";
}

function guiaMovil() {
    return window.Guia3D && window.Guia3D.listo() && window.Guia3D.caminar ? window.Guia3D : null;
}

function caminarHasta(pj, x, ms, lado) {
    const g = guiaMovil();
    if (g) {
        g.mirar(lado);
        g.caminar(true);
    }
    const x0 = parseFloat(pj.style.left) || 0;
    const t0 = performance.now();
    pj.dataset.caminando = "1";
    return new Promise(function (resolve) {
        const paso = function () {
            const u = Math.min(1, (performance.now() - t0) / ms);
            pj.style.left = Math.round(x0 + (x - x0) * u) + "px";
            if (u < 1) {
                setTimeout(paso, 16);
                return;
            }
            delete pj.dataset.caminando;
            if (g) {
                g.caminar(false);
                g.mirar(null);
            }
            resolve();
        };
        paso();
    });
}

function duracionPasos(distancia) {
    const reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reducido ? 200 : Math.max(1200, Math.min(2400, distancia * 6));
}

async function zoeEntra() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !esc()) return;
    if (zoeEnEscena) {
        ubicarZoe();
        return;
    }
    pj.classList.add("zoe-cambia");
    await sleep(200);
    zoeEnEscena = true;
    document.body.classList.add("zoe-grande");
    ubicarZoe();
    const destino = parseFloat(pj.style.left) || 0;
    const ancho = parseFloat(pj.style.width) || 200;
    pj.style.left = Math.round(-ancho - 20) + "px";
    void pj.offsetWidth;
    pj.classList.remove("zoe-cambia");
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha");
}

async function zoeSale() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !zoeEnEscena) return;
    nubeZoe("");
    const ancho = parseFloat(pj.style.width) || 200;
    const x0 = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, -ancho - 30, duracionPasos(x0 + ancho), "izquierda");
    zoeOcultar();
}

function zoeOcultar() {
    zoeEnEscena = false;
    document.body.classList.remove("zoe-grande");
    nubeZoe("");
}

// ------------------------------------------------------------------ voces: una a la vez, con prioridad
//
// Prioridad 1: frases cortas de ánimo (se omiten si ya suena otra voz).
// Prioridad 2: avisos de ayuda: cortan una frase de prioridad 1.
// Prioridad 3: instrucciones (decir): esperan a que termine la voz que suena, nunca se encima.

function hablar(texto, pj, gesto, nube, prioridad) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    nubeZoe(quien === GUIA ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || silencio || typeof TextoVoz === "undefined") return Promise.resolve();
    if (window.SonidosEsfera) window.SonidosEsfera.agachar(true);
    if (quien === GUIA && guia3d()) guia3d().hablar(true);
    const fin = function () {
        if (quien === GUIA && guia3d()) guia3d().hablar(false);
        if (window.SonidosEsfera) window.SonidosEsfera.agachar(false);
    };
    const p = Promise.resolve(TextoVoz.hablar(texto, quien)).then(fin, fin);
    vozActiva = p;
    vozPrioridad = prioridad || 3;
    p.then(function () {
        if (vozActiva === p) {
            vozActiva = null;
            vozPrioridad = 0;
        }
    });
    return p;
}

function decir(texto, pj, gesto, nube) {
    const tk = token;
    const antes = vozActiva ? Promise.race([vozActiva, sleep(9000)]) : Promise.resolve();
    return antes.then(function () {
        if (tk !== token) return;
        return hablar(texto, pj, gesto, nube, 3);
    });
}

function decirRapido(texto, pj, prioridad) {
    const prio = prioridad || 1;
    const ahora = Date.now();
    if (vozActiva) {
        if (prio <= vozPrioridad) return;
        if (TextoVoz.detener) TextoVoz.detener();
        vozActiva = null;
    } else if (prio === 1 && ahora < vozLibreDesde) {
        return;
    }
    vozLibreDesde = ahora + (Number(cfgJuego().vozPausaMs) || 2600);
    hablar(texto, pj, null, null, prio);
}

function callarTodo() {
    vozActiva = null;
    vozPrioridad = 0;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosEsfera) window.SonidosEsfera.agachar(false);
}

// ------------------------------------------------------------------ intro 3D compartida

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
    const conversacion = textos().conversacion || [];
    const personajesCfg = window.INTRO_CONFIG.personajes || [];
    const colores = window.INTRO_CONFIG.dialogo.colores || {};
    window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
        const indice = Number(linea.personaje);
        const def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
        const id = def.id || (indice === 1 ? "zoe" : "zeus");
        const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indice] && introConfig.personajes[indice].nombre)
            || (id === "zoe" ? "Zoe" : "Zeus");
        return { personaje: id, nombre: nombre, color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"), texto: TextoVoz.textoPlano(linea.texto) };
    });
}

function mostrarIntro3d() {
    const root = document.getElementById("intro3d-root");
    if (root) root.hidden = false;
    document.body.classList.add("intro3d-activa");
    window.dispatchEvent(new CustomEvent("intro3d-start"));
}

function destruirIntro3d() {
    document.body.classList.remove("intro3d-activa");
    const root = document.getElementById("intro3d-root");
    if (root) {
        root.classList.add("is-closing");
        setTimeout(function () {
            root.hidden = true;
            if (window.__introPhaser) {
                try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                window.__introPhaser = null;
            }
            if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
            root.remove();
        }, 450);
    }
}

function omitirIntro3d() {
    if (cerrardo) return;
    introOmitida = true;
    const root = document.getElementById("intro3d-root");
    if (!root || root.hidden) {
        empezarJuegoTrasIntro();
        return;
    }
    window.dispatchEvent(new CustomEvent("intro3d-omitir"));
}

function empezarJuegoTrasIntro() {
    if (cerrardo) return;
    cerrardo = true;
    conversacionCancelada = true;
    TextoVoz.detener();
    destruirIntro3d();
    const p = document.getElementById("principal");
    if (p) {
        p.classList.remove("aparece");
        void p.offsetWidth;
        p.classList.add("aparece");
    }
    if (esc()) esc().reacomodar();
    iniciarPartida();
}

function empecemosJuego() {
    const pantalla = document.getElementById("pantalla-inicio");
    const btn = document.getElementById("btn-empecemos");
    if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
    if (btn) btn.disabled = true;
    TextoVoz.desbloquear();
    if (window.SonidosEsfera) {
        window.SonidosEsfera.desbloquear();
        window.SonidosEsfera.volumen(volumenPct());
        window.SonidosEsfera.ambiente(true);
    }
    sincronizarDialogoIntro3d();
    TextoVoz.precargar();
    pantalla.classList.add("is-out");
    mostrarIntro3d();
    let oculto = false;
    const ocultar = function () {
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

function cerrar_anuncio() {
    empezarJuegoTrasIntro();
}

// ------------------------------------------------------------------ edad

function iniciarPartida() {
    PedniaEdad.iniciarNivel({
        niveles: gameConfig.niveles || [],
        elegirManual: elegirNivel,
        onElegido: function () { iniciarJuego(); }
    });
}

function elegirNivel() {
    let botones = "";
    (gameConfig.niveles || []).forEach(function (nivel) {
        botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
            "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
    });
    const titulo = textos().eligeNivel || "Elige tu edad";
    TextoVoz.hablar(titulo, "zoe");
    Swal.fire({ title: titulo, html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>", showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, scrollbarPadding: false, width: 420 });
}

function confirmarNivel(id) {
    const nivel = (gameConfig.niveles || []).find(function (n) { return String(n.id) === String(id); });
    Swal.close();
    if (nivel) iniciarJuego();
}
window.confirmarNivel = confirmarNivel;

// ------------------------------------------------------------------ audio y menús

function volumenPct() {
    const n = Number(acc().volumenFondo);
    return isFinite(n) ? Math.max(0, Math.min(100, n)) : 45;
}

function aplicarVolumen(pct) {
    const n = Math.max(0, Math.min(100, Number(pct) || 0));
    gameConfig.accesibilidad.volumenFondo = n;
    if (window.SonidosEsfera) window.SonidosEsfera.volumen(n);
    pintarIconoVolumen();
}

function pintarIconoVolumen() {
    const n = volumenPct();
    const icono = document.querySelector("#btn-menu-vol i");
    if (icono) icono.className = (silencio || n <= 0) ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
    const b = document.getElementById("btn-silencio");
    if (b) {
        b.classList.toggle("activo", silencio);
        b.setAttribute("aria-pressed", silencio ? "true" : "false");
        b.querySelector("span").textContent = silencio ? "Activar sonido" : "Silenciar";
        b.querySelector("i").className = silencio ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    }
}

function alternarSilencio() {
    silencio = !silencio;
    if (window.SonidosEsfera) window.SonidosEsfera.silenciar(silencio);
    if (silencio) callarTodo();
    pintarIconoVolumen();
}

const ACC_OPCIONES = [
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "ayudaAutomatica", label: "Ayuda visual (anillo más brillante)" },
    { key: "menosEfectos", label: "Menos efectos visuales" },
    { key: "mostrarProgreso", label: "Mostrar progreso" }
];

function setPanel(id, abierto) {
    const panel = document.getElementById(id + "-panel");
    const btn = document.getElementById("btn-" + id);
    if (!panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
}

function pintarMenuAcc() {
    const ops = document.getElementById("menu-acc-ops");
    if (!ops) return;
    ops.innerHTML = "";
    ACC_OPCIONES.forEach(function (op) {
        const lab = document.createElement("label");
        lab.className = "panel-op";
        lab.innerHTML = '<input type="checkbox"> <span>' + op.label + "</span>";
        const input = lab.querySelector("input");
        input.checked = op.key === "mostrarFeedBack" ? gameConfig.mostrarFeedBack !== false : !!acc()[op.key];
        input.addEventListener("change", function () {
            if (op.key === "mostrarFeedBack") {
                gameConfig.mostrarFeedBack = input.checked;
                if (!input.checked) callarTodo();
            } else {
                gameConfig.accesibilidad[op.key] = input.checked;
            }
            aplicarAccesibilidad();
        });
        ops.appendChild(lab);
    });
    const rango = document.createElement("label");
    rango.className = "panel-op panel-rango";
    const actual = Number(acc().letterSpacing);
    const valor = isFinite(actual) && actual >= 0 ? actual : 2;
    rango.innerHTML = "<span>Espaciado de letras <strong>" + valor + "</strong></span>";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    slider.value = String(valor);
    slider.addEventListener("input", function () {
        gameConfig.accesibilidad.letterSpacing = Number(slider.value);
        rango.querySelector("strong").textContent = slider.value;
        aplicarAccesibilidad();
    });
    rango.appendChild(slider);
    ops.appendChild(rango);
}

function enlazarMenus() {
    [["menu-acc", "menu-vol"], ["menu-vol", "menu-acc"]].forEach(function (par) {
        const btn = document.getElementById("btn-" + par[0]);
        if (btn) btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById(par[0] + "-panel");
            const abrir = panel && panel.hidden;
            setPanel(par[0], abrir);
            if (abrir) setPanel(par[1], false);
        });
        const cerrar = document.getElementById("btn-cerrar-" + par[0]);
        if (cerrar) cerrar.addEventListener("click", function () { setPanel(par[0], false); });
    });
    const slider = document.getElementById("rango-volumen");
    if (slider) {
        slider.value = String(volumenPct());
        document.getElementById("vol-val").textContent = slider.value;
        slider.addEventListener("input", function () {
            document.getElementById("vol-val").textContent = slider.value;
            aplicarVolumen(slider.value);
        });
    }
    const mudo = document.getElementById("btn-silencio");
    if (mudo) mudo.addEventListener("click", alternarSilencio);
    document.addEventListener("pointerdown", function (ev) {
        ["menu-acc", "menu-vol"].forEach(function (id) {
            const caja = document.getElementById(id);
            if (caja && !caja.contains(ev.target)) setPanel(id, false);
        });
    });
    pintarMenuAcc();
    aplicarVolumen(volumenPct());
}

function aplicarAccesibilidad() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    document.body.classList.toggle("sin-progreso", !a.mostrarProgreso);
    const n = Number(a.letterSpacing);
    document.documentElement.style.setProperty("--hc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    document.body.classList.toggle("menos-efectos", !!a.menosEfectos);
    if (escenario()) escenario().menosEfectos(!!a.menosEfectos || reducido);
}

function salirAlMenu() {
    callarTodo();
    if (window.SonidosEsfera) window.SonidosEsfera.detenerTodo();
    if (window.self !== window.top) {
        window.parent.postMessage({ type: "pednia:salir-juego" }, window.location.origin);
    } else {
        window.history.back();
    }
}

// ------------------------------------------------------------------ indicador (abajo a la izquierda): ronda, esferas y capturas

function construirHud() {
    const caja = document.getElementById("esferas-ronda");
    if (!caja) return;
    caja.innerHTML = "";
    for (let k = 0; k < porRonda(); k++) {
        const s = document.createElement("span");
        s.className = "esfera-punto";
        caja.appendChild(s);
    }
}

function pintarHud() {
    const t = document.getElementById("ronda-texto");
    if (t) t.textContent = R().plantilla(textos().rondaDe, { n: rondaIdx + 1, t: R().totalRondas(gameConfig) });
    document.querySelectorAll("#esferas-ronda .esfera-punto").forEach(function (s, k) {
        const hecha = k < capturasRonda;
        s.classList.toggle("hecha", hecha);
        s.classList.toggle("actual", !hecha && k === capturasRonda && !juegoTerminado);
        if (hecha && coloresRonda[k]) s.style.setProperty("--c", coloresRonda[k]);
        else s.style.removeProperty("--c");
    });
    const c = document.getElementById("capturas-texto");
    if (c) c.textContent = R().plantilla(textos().capturasDe, { n: capturasTotal, t: R().totalCapturas(gameConfig) });
    const caja = document.getElementById("indicador-ronda");
    if (caja) caja.setAttribute("aria-label", (t ? t.textContent : "") + ". " + (c ? c.textContent : ""));
}

// ------------------------------------------------------------------ mensaje breve (no bloquea el escenario)

let tMensaje = null;

function mostrarMensaje(texto, clase, ms) {
    const m = document.getElementById("mensaje");
    if (!m || !texto) return;
    m.textContent = texto;
    m.className = "mensaje " + (clase || "");
    m.hidden = false;
    void m.offsetWidth;
    m.classList.add("entra");
    clearTimeout(tMensaje);
    tMensaje = setTimeout(ocultarMensaje, ms || 1500);
}

function ocultarMensaje() {
    clearTimeout(tMensaje);
    const m = document.getElementById("mensaje");
    if (m) m.hidden = true;
}

// ------------------------------------------------------------------ carteles

let tCartel = null;

function mostrarCartel(titulo, sub, ms) {
    const c = document.getElementById("cartel");
    if (!c) return;
    document.getElementById("cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.hidden = false;
    c.classList.remove("entra");
    void c.offsetWidth;
    c.classList.add("entra");
    clearTimeout(tCartel);
    if (ms) tCartel = setTimeout(function () { c.hidden = true; }, ms);
}

function ocultarCartel() {
    clearTimeout(tCartel);
    const c = document.getElementById("cartel");
    if (c) c.hidden = true;
}

function esperarBoton(texto) {
    return new Promise(function (resolve) {
        const wrap = document.getElementById("comenzar-wrap");
        const btn = document.getElementById("btn-comenzar");
        if (!wrap || !btn) {
            resolve();
            return;
        }
        btn.querySelector(".btn-comenzar-texto").textContent = texto;
        wrap.hidden = false;
        btn.focus();
        btn.addEventListener("click", function () {
            sfx("seleccion");
            wrap.classList.add("sale");
            setTimeout(function () {
                wrap.hidden = true;
                wrap.classList.remove("sale");
                resolve();
            }, 320);
        }, { once: true });
    });
}

// ------------------------------------------------------------------ presentación y demostración

let escenarioListo = Promise.resolve(false);

function opcionesDe(bloque) {
    const b = bloque || {};
    return {
        velocidad: Number(b.velocidad) || 2,
        radioEsfera: Number(b.radioEsfera) || 0.58,
        tolerancia: b.tolerancia != null ? Number(b.tolerancia) : 0.14
    };
}

async function presentar() {
    const e = escenario();
    if (!e) return;
    const pr = gameConfig.presentacion || {};
    e.apagar();
    // el título solo se ve en la presentación
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    await sleep(700);
    await e.encender();                      // las tuberías se encienden y el anillo brilla
    await sleep(600);
    ocultarCartel();                         // el cartel no debe tapar el arco de la esfera por encima del aro
    const o = opcionesDe(pr);
    o.auto = true;                           // la esfera rebota en el espejo, cruza despacio y se captura sola
    await Promise.race([e.lanzar(pr.esfera, o), sleep(16000)]);
    await sleep(500);
    await zoeEntra();
    gestoGuia("saluda");
    await Promise.race([decir(textos().introZoe, GUIA, "senala"), sleep(14000)]);
    await sleep(300);
}

function apiDemo() {
    const tk = token;
    const dm = gameConfig.demo || {};
    return {
        cancelado: function () { return tk !== token || juegoTerminado || !escenario(); },
        textos: textos,
        lanzar: function () { return escenario().lanzar(dm.esfera, opcionesDe(dm)); },
        estado: function () { return escenario().estadoVuelo(); },
        puntoAnillo: function () { return escenario().puntoAnillo(); },
        radioAnilloPx: function () { return escenario().radioAnilloPx(); },
        /** Toque simulado: se evalúa con las mismas reglas que el del niño. */
        tocar: function () {
            const e = escenario();
            const st = e.estadoVuelo();
            if (st.activa && R().evaluarToque(st.t, st.tray) === "acierto") e.capturar();
        },
        felicitar: function () { mostrarMensaje(textos().demoMuyBien, "acierto", 1800); },
        /** En la demo habla quien no está en escena (la guía ya dio la instrucción). */
        decir: function (texto) { return hablar(texto, OTRO, null); },
        terminar: async function () { ocultarMensaje(); }
    };
}

/** Arranque único tras elegir la edad (no repetir la demo si el selector avisa dos veces). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock", "presentando");
    await escenarioListo;
    aplicarAccesibilidad();
    await presentar();
    if (acc().mostrarIntro && window.EsferaDemo && escenario()) {
        enDemo = true;
        try {
            await window.EsferaDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[AtrapaEsfera] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!");
    nubeVisible = false;
    document.body.classList.remove("demo-lock", "presentando");
    const el = document.getElementById("escenario");
    if (el) el.focus({ preventScroll: true });
    comenzarRonda(0);
}

// ------------------------------------------------------------------ rondas y esferas

async function comenzarRonda(i) {
    const tk = token;
    const e = escenario();
    if (!e) return;
    partidaEnCurso = true;
    rondaIdx = i;
    capturasRonda = 0;
    coloresRonda = [];
    fallosSeguidos = 0;
    e.encendidoTotal();
    pintarHud();
    sfx("rondaInicio");
    // el aro se achica en cada ronda (animado, con un aviso de energía)
    const achica = e.tamanoAnillo(cfgR().radioAnillo);
    const ins = (textos().rondaInicio || [])[i];
    if (ins) await Promise.race([decir(ins.texto, ins.pj === "guia" ? GUIA : ins.pj), sleep(i === 0 ? 3200 : 2000)]);
    await achica;
    if (tk !== token) return;
    siguienteEsfera();
}

async function siguienteEsfera() {
    const tk = token;
    const e = escenario();
    if (!e || juegoTerminado) return;
    const r = cfgR();
    const esfera = r.esferas[capturasRonda % r.esferas.length];
    const aj = R().ajuste(gameConfig, fallosSeguidos);
    pintarHud();
    jugando = true;
    tocoEstaEsfera = false;
    tardeMarcada = false;
    await sleep((Number(esfera.pausa) || 1.2) * 1000);
    if (tk !== token || juegoTerminado) return;
    e.ayuda(!!acc().ayudaAutomatica && (fallosSeguidos >= 2 || sinToqueSeguidos >= 1));
    const res = await e.lanzar(esfera, {
        velocidad: r.velocidad * aj.velocidad,
        radioEsfera: r.radioEsfera,
        tolerancia: r.tolerancia,
        radioCaptura: r.radioCaptura,
        ventanaExtra: aj.ventanaExtra
    });
    if (tk !== token || !res || res.resultado === "cancelada") return;
    if (window.SonidosEsfera) window.SonidosEsfera.vueloFin();
    if (res.resultado === "capturada") {
        e.ayuda(false);
        if (capturasRonda >= porRonda()) {
            jugando = false;
            finRonda();
            return;
        }
        siguienteEsfera();
        return;
    }
    // la esfera pasó: sin castigo, sale otra (un poco más lenta si se repite)
    ultimoPasoMs = Date.now();
    fallosSeguidos++;
    if (!tardeMarcada) historial.push("paso");
    sfx("pasa");
    if (!tocoEstaEsfera) {
        sinToqueSeguidos++;
        mostrarMensaje(frase("pasa"), "casi", 1500);
        if (acc().ayudaAutomatica) decirRapido(frase("ayuda"), "zoe", 2);
    } else {
        sinToqueSeguidos = 0;
        if (!tardeMarcada) mostrarMensaje(frase("pasa"), "casi", 1500);
    }
    siguienteEsfera();
}

/** Un toque o clic en cualquier parte del túnel. La dificultad está en el momento, no en apuntar. */
function alTocar() {
    if (!jugando || juegoTerminado || enDemo) return;
    const e = escenario();
    if (!e) return;
    if (window.SonidosEsfera) window.SonidosEsfera.desbloquear();
    const st = e.estadoVuelo();
    const ahora = Date.now();
    if (st.activa && st.capturada) return;
    if (st.activa) {
        tocoEstaEsfera = true;
        sinToqueSeguidos = 0;
        const res = R().evaluarToque(st.t, st.tray);
        if (res === "acierto") {
            if (!e.capturar()) return;
            coloresRonda[capturasRonda] = R().color(gameConfig, (cfgR().esferas[capturasRonda % cfgR().esferas.length] || {}).color);
            capturasRonda++;
            capturasTotal++;
            fallosSeguidos = 0;
            historial.push("acierto");
            pintarHud();
            const f = frase("acierto");
            mostrarMensaje(f, "acierto", 1300);
            decirRapido(f, capturasTotal % 2 ? "zoe" : "zeus", 1);
            return;
        }
        if (res === "temprano") {
            if (ahora < bloqueoTempranoHasta) return;
            bloqueoTempranoHasta = ahora + (Number(cfgJuego().pausaTempranoS) || 0.45) * 1000;
            e.pulsoError();
            sfx("temprano");
            historial.push("temprano");
            const f = frase("temprano");
            mostrarMensaje(f, "espera", 1300);
            decirRapido(f, "zoe", 1);
            return;
        }
        // tarde: la esfera sigue y se va; solo un aviso por esfera
        if (tardeMarcada) return;
        tardeMarcada = true;
        e.pulsoError();
        sfx("temprano");
        historial.push("tarde");
        const f = frase("tarde");
        mostrarMensaje(f, "casi", 1400);
        decirRapido(f, "zoe", 1);
        return;
    }
    // sin esfera en vuelo: recién pasó una (tarde) o todavía no sale (espera)
    if (ahora < bloqueoTempranoHasta) return;
    bloqueoTempranoHasta = ahora + (Number(cfgJuego().pausaTempranoS) || 0.45) * 1000;
    e.pulsoError();
    sfx("temprano");
    const tarde = ahora - ultimoPasoMs < (Number(cfgJuego().esperaTardeS) || 1.4) * 1000;
    mostrarMensaje(tarde ? frase("tarde") : frase("temprano"), tarde ? "casi" : "espera", 1300);
}

async function finRonda() {
    const tk = token;
    const e = escenario();
    jugando = false;
    ocultarMensaje();
    pintarHud();
    await sleep(500);
    if (tk !== token) return;
    // la última ronda va directo a la escena final (la central se enciende con la última esfera)
    if (rondaIdx + 1 >= R().totalRondas(gameConfig)) {
        terminarJuego();
        return;
    }
    sfx("rondaFin");
    mostrarCartel(R().plantilla(textos().rondaListaTitulo, { n: rondaIdx + 1 }), R().plantilla(textos().rondaListaSub, { c: capturasRonda }));
    const voz = decir(textos().rondaLista, rondaIdx % 2 ? "zeus" : "zoe");
    await Promise.all([e.celebrarRonda(), Promise.race([voz, sleep(4500)])]);
    if (tk !== token) return;
    await sleep(300);
    ocultarCartel();
    const sig = cfgR(rondaIdx + 1);
    mostrarCartel(R().plantilla(textos().rondaSiguienteTitulo, { n: rondaIdx + 2 }), sig.nombre || "", 1800);
    await sleep(1700);
    if (tk !== token) return;
    comenzarRonda(rondaIdx + 1);
}

// ------------------------------------------------------------------ escena final

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    const tk = token;
    ocultarMensaje();
    ocultarCartel();
    pintarHud();
    document.body.classList.add("en-final", "demo-lock");
    const e = esc();
    await e.final();
    if (tk !== token) return;
    nubeVisible = true;
    mostrarResultado();
    zoeEntra().then(function () { gestoGuia("celebra"); });
    await Promise.race([decir(textos().finalZoe, GUIA, "celebra"), sleep(9000)]);
    if (tk !== token) return;
    await Promise.race([decir(textos().finalZeus, OTRO), sleep(9000)]);
    if (tk !== token) return;
    gestoGuia("final");
}

function alEventoEscena(nombre) {
    switch (nombre) {
        case "tubo": sfx("tubo"); break;
        case "anillo": sfx("anillo"); break;
        case "rebote": sfx("rebote"); break;
        case "anillo-achica": sfx("achica"); break;
        case "aparece":
            sfx("aparece");
            if (window.SonidosEsfera) window.SonidosEsfera.vueloInicio();
            break;
        case "captura":
            if (window.SonidosEsfera) window.SonidosEsfera.vueloFin();
            sfx("captura");
            break;
        case "final-expande": sfx("expande"); break;
        case "cine-viaje": sfx("viaje"); break;
        case "cine-columna": sfx("columna"); break;
        case "cine-regreso": sfx("regreso"); break;
        case "final-reactor": sfx("reactor"); break;
        case "final-fiesta":
            sfx("fiesta");
            if (window.SonidosEsfera) window.SonidosEsfera.musica(true);
            break;
        default: break;
    }
}

function alFase(fase) {
    if (fase === "preparacion") sfx("preparar");
    else if (fase === "captura") sfx("ventana");
}

function mostrarResultado() {
    const panel = document.getElementById("final-panel");
    if (!panel) return;
    const res = R().resumen(historial);
    const n = R().estrellas(res);
    document.getElementById("final-titulo").textContent = textos().finalTitulo || "";
    document.getElementById("final-sub").textContent = textos().finalSub || "";
    document.getElementById("res-capturas").textContent = String(res.capturas);
    document.getElementById("res-racha").textContent = String(res.mejorRacha);
    document.getElementById("res-rondas").textContent = String(R().totalRondas(gameConfig));
    document.querySelectorAll("#final-estrellas i").forEach(function (s, i) {
        s.classList.toggle("ganada", i < n);
        s.style.setProperty("--i", String(i));
    });
    document.getElementById("btn-otra-vez").querySelector("span").textContent = textos().botonOtraVez || "Jugar nuevamente";
    document.getElementById("btn-al-menu").querySelector("span").textContent = textos().botonMenu || "Volver al menú";
    panel.hidden = false;
    panel.classList.remove("entra");
    void panel.offsetWidth;
    panel.classList.add("entra");
    setTimeout(function () {
        const b = document.getElementById("btn-otra-vez");
        if (b) b.focus();
    }, 700);
}

function ocultarResultado() {
    const panel = document.getElementById("final-panel");
    if (panel) panel.hidden = true;
}

// ------------------------------------------------------------------ reiniciar (desde cualquier estado)

function reiniciarPartida() {
    if (!partidaEnCurso || enDemo) {
        window.location.reload();
        return;
    }
    token++;
    juegoTerminado = false;
    jugando = false;
    callarTodo();
    ocultarMensaje();
    ocultarCartel();
    ocultarResultado();
    if (window.SonidosEsfera) {
        window.SonidosEsfera.musica(false);
        window.SonidosEsfera.vueloFin();
        window.SonidosEsfera.ambiente(true);
    }
    zoeOcultar();
    nubeVisible = false;
    document.body.classList.remove("en-final", "demo-lock", "cinematica");
    const e = escenario();
    if (e) e.reiniciar();
    historial = [];
    capturasTotal = 0;
    capturasRonda = 0;
    coloresRonda = [];
    fallosSeguidos = 0;
    sinToqueSeguidos = 0;
    rondaIdx = 0;
    aplicarAccesibilidad();
    pintarHud();
    comenzarRonda(0);
}

// ------------------------------------------------------------------ arranque

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261119vol"));
    const gif = document.getElementById("guia-img");
    if (gif && GUIA === "zeus") gif.src = "../../img/zeus_normal.gif";
    document.body.dataset.guia = GUIA;
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    sincronizarDialogoIntro3d();
    TextoVoz.iniciar(gameConfig, introConfig, {
        obtenerAudioFondo: function () { return null; },
        volumenFondo: 0.2
    });
    construirHud();
    enlazarMenus();
    aplicarAccesibilidad();
    pintarHud();

    if (window.EscenarioEsfera) {
        const E = window.EscenarioEsfera;
        E.al("toque", alTocar);
        E.al("evento", alEventoEscena);
        E.al("fase", alFase);
        // cinemática final: franjas de cine arriba y abajo mientras la cámara viaja
        E.al("cine", function (on) { document.body.classList.toggle("cinematica", !!on); });
        E.al("cerca", function (k) { if (window.SonidosEsfera) window.SonidosEsfera.vueloCerca(k); });
        escenarioListo = E.montar(document.getElementById("escenario"), gameConfig).then(function (ok) {
            aplicarAccesibilidad();
            return ok;
        });
    }

    const on = function (id, fn) {
        const b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    on("btn-empecemos", empecemosJuego);
    on("btn-omitir-intro3d", omitirIntro3d);
    on("btn-continuar-intro3d", function (ev) {
        ev.preventDefault();
        empezarJuegoTrasIntro();
    });
    on("btn-otra-vez", reiniciarPartida);
    on("btn-al-menu", salirAlMenu);
    // teclado: espacio o Enter también "tocan" (accesibilidad)
    document.addEventListener("keydown", function (ev) {
        if (ev.repeat || (ev.key !== " " && ev.key !== "Enter")) return;
        if (!jugando || document.body.classList.contains("demo-lock")) return;
        const t = ev.target;
        if (t && t.closest && t.closest("button, input, .panel-flotante")) return;
        ev.preventDefault();
        alTocar();
    });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        if (esc() && esc().listo()) setTimeout(function () { esc().reacomodar(); }, 60);
        if (zoeEnEscena) setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (pj && !pj.dataset.caminando) ubicarZoe();
        }, 60);
    });
    window.addEventListener("pagehide", function () {
        if (window.SonidosEsfera) window.SonidosEsfera.detenerTodo();
        if (TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
    });
});
