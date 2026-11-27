/**
 * El Tiro al Blanco en Movimiento — flujo del juego (Polimotor, 5-6 años, coordinación visual).
 *
 * inicio → intro 3D (Zeus y Zoe) → edad → presentación en la arena espacial (título, diana que se mueve,
 * lanzador, voz de Zeus) → demostración automática (mano, trayectoria, sombra fantasma, impacto; voz de Zoe)
 * → "¡Comenzar a jugar!" → 3 rondas de 4 lanzamientos (diana más pequeña y más rápida, menos sombra)
 * → escena final (la diana se vuelve estrella, discos en órbita, fuegos) → resumen con "Jugar nuevamente"
 * y "Volver al menú".
 *
 * reglas.js decide, escena-arena.js dibuja, sonidos.js suena, demo.js demuestra; aquí se ordena el flujo.
 */
"use strict";

let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introOmitida = false;

let partidaIniciada = false;   // ya pasó por la edad (presentación/demo)
let partidaEnCurso = false;    // ya empezó la primera ronda
let jugando = false;           // se puede apuntar
let volando = false;           // hay un disco en el aire (no se puede lanzar otro)
let juegoTerminado = false;
let enDemo = false;
let rondaIdx = 0;
let lanzIdx = 0;
let puntosTotal = 0;
let puntosRonda = 0;
let fallosSeguidos = 0;
let patronAnterior = null;
let primeraCarga = true;
let historial = [];
let historialRonda = [];
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

const R = function () { return window.ReglasTiro; };

function escenario() {
    return window.EscenarioTiro && window.EscenarioTiro.listo() ? window.EscenarioTiro : null;
}

function esc() {
    return window.EscenarioTiro || null;
}

function sfx(nombre) {
    const s = window.SonidosTiro;
    if (s && typeof s[nombre] === "function") s[nombre]();
}

function acc() { return gameConfig.accesibilidad || {}; }
function cfgJuego() { return gameConfig.juego || {}; }
function textos() { return gameConfig.textos || {}; }
function cfgR(i) { return R().ronda(gameConfig, i == null ? rondaIdx : i); }
function porRonda() { return R().lanzamientosPorRonda(gameConfig); }
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
// Prioridad 2: avisos del lanzamiento (fallo, cargar el disco): cortan una frase de prioridad 1.
// Prioridad 3: instrucciones (decir): esperan a que termine la voz que suena, nunca se encima.

function hablar(texto, pj, gesto, nube, prioridad) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    nubeZoe(quien === "zoe" ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || silencio || typeof TextoVoz === "undefined") return Promise.resolve();
    if (window.SonidosTiro) window.SonidosTiro.agachar(true);
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    const fin = function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
        if (window.SonidosTiro) window.SonidosTiro.agachar(false);
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
    if (window.SonidosTiro) window.SonidosTiro.agachar(false);
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
    if (window.SonidosTiro) {
        window.SonidosTiro.desbloquear();
        window.SonidosTiro.volumen(volumenPct());
        window.SonidosTiro.ambiente(true);
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
    if (window.SonidosTiro) window.SonidosTiro.volumen(n);
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
    if (window.SonidosTiro) window.SonidosTiro.silenciar(silencio);
    if (silencio) callarTodo();
    pintarIconoVolumen();
}

const ACC_OPCIONES = [
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "ayudaAutomatica", label: "Ayuda visual (brillo y sombra)" },
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
    if (esc()) esc().haloAyuda(!!a.ayudaAutomatica);
}

function salirAlMenu() {
    callarTodo();
    if (window.SonidosTiro) window.SonidosTiro.detenerTodo();
    if (window.self !== window.top) {
        window.parent.postMessage({ type: "pednia:salir-juego" }, window.location.origin);
    } else {
        window.history.back();
    }
}

// ------------------------------------------------------------------ indicadores: puntos arriba, ronda y lanzamientos abajo a la izquierda

function construirHud() {
    const puntos = document.getElementById("ronda-puntos");
    if (puntos) {
        puntos.innerHTML = "";
        for (let i = 0; i < R().totalRondas(gameConfig); i++) puntos.appendChild(document.createElement("span"));
    }
    const discos = document.getElementById("lanz-discos");
    if (discos) {
        discos.innerHTML = "";
        for (let k = 0; k < porRonda(); k++) {
            const s = document.createElement("span");
            s.className = "lanz-disco";
            discos.appendChild(s);
        }
    }
}

function pintarHud() {
    const n = document.getElementById("ronda-num");
    if (n) n.textContent = String(rondaIdx + 1);
    document.querySelectorAll("#ronda-puntos span").forEach(function (p, i) {
        p.classList.toggle("hecha", i < rondaIdx || (i === rondaIdx && historialRonda.length >= porRonda()));
        p.classList.toggle("actual", i === rondaIdx);
    });
    document.querySelectorAll("#lanz-discos .lanz-disco").forEach(function (s, k) {
        const h = historialRonda[k];
        s.className = "lanz-disco" + (h ? " hecho " + h : "") + (!h && k === lanzIdx && !juegoTerminado ? " actual" : "");
    });
    const t = document.getElementById("lanz-texto");
    if (t) t.textContent = R().plantilla(textos().lanzamientoDe, { n: Math.min(lanzIdx + 1, porRonda()), t: porRonda() });
    const caja = document.getElementById("indicador-ronda");
    if (caja) caja.setAttribute("aria-label", "Ronda " + (rondaIdx + 1) + ". " + (t ? t.textContent : ""));
    const num = document.getElementById("marcador-num");
    if (num && !num.dataset.contando) num.textContent = String(puntosTotal);
}

let tSuma = null;

/** El marcador sube contando, con el valor obtenido resaltado. */
function animarMarcador(desde, hasta, ganados) {
    const num = document.getElementById("marcador-num");
    const caja = document.getElementById("marcador");
    const suma = document.getElementById("marcador-suma");
    if (!num) return;
    if (suma) {
        suma.textContent = "+" + ganados;
        suma.className = "marcador-suma " + (ganados >= 50 ? "oro" : (ganados >= 20 ? "azul" : ""));
        suma.hidden = false;
        void suma.offsetWidth;
        suma.classList.add("sube");
        clearTimeout(tSuma);
        tSuma = setTimeout(function () { suma.hidden = true; }, 1300);
    }
    if (caja) {
        caja.classList.remove("late");
        void caja.offsetWidth;
        caja.classList.add("late");
    }
    num.dataset.contando = "1";
    const t0 = performance.now(), dur = 600;
    const paso = function () {
        const u = Math.min(1, (performance.now() - t0) / dur);
        num.textContent = String(Math.round(desde + (hasta - desde) * u));
        if (u < 1) {
            setTimeout(paso, 30);
            return;
        }
        delete num.dataset.contando;
        num.textContent = String(puntosTotal);
    };
    paso();
    sfx("puntos");
}

// ------------------------------------------------------------------ pista visual (sin depender del audio)

let tPista = null;

function mostrarPista(texto, ms) {
    const p = document.getElementById("pista");
    const e = escenario();
    if (!p || !e || !texto) return;
    const q = e.puntoPista();
    document.getElementById("pista-texto").textContent = texto;
    p.style.left = Math.round(q.x) + "px";
    p.style.top = Math.round(q.y) + "px";
    p.hidden = false;
    clearTimeout(tPista);
    if (ms) tPista = setTimeout(ocultarPista, ms);
}

function ocultarPista() {
    clearTimeout(tPista);
    const p = document.getElementById("pista");
    if (p) p.hidden = true;
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

function cfgDemo() {
    const d = gameConfig.demo || {};
    return { radio: Number(d.radio) || 120, velocidad: Number(d.velocidad) || 120, patron: d.patron || "horizontal-der" };
}

async function presentar() {
    const e = escenario();
    if (!e) return;
    const dm = cfgDemo();
    e.reiniciar();
    e.entrada(false);
    e.configurar(dm);
    // el título solo se ve en la presentación
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    await e.nuevoLanzamiento({ patron: dm.patron, u0: 1.35 });
    await zoeEntra();
    gestoGuia("saluda");
    await Promise.race([decir(textos().introZeus, "zeus"), sleep(14000)]);
    ocultarCartel();
    await sleep(300);
}

function apiDemo() {
    const tk = token;
    const dm = cfgDemo();
    return {
        cancelado: function () { return tk !== token || juegoTerminado || !escenario(); },
        textos: textos,
        preparar: async function () {
            const e = escenario();
            e.configurar(dm);
            await e.nuevoLanzamiento({ patron: dm.patron, u0: 1.5 });
        },
        origen: function () { return escenario().origen(); },
        aPantalla: function (x, y) { return escenario().aPantalla(x, y); },
        iluminar: function (on) { if (escenario()) escenario().destacar(on); },
        sombra: function () { escenario().sombra(3200, true, Number(cfgJuego().anticipoS) || 0.35); },
        apuntar: function (x, y) { escenario().demoApuntar(x, y); },
        /** Arrastre que acierta: anticipa dónde estará la diana cuando llegue el disco. */
        solucion: function () {
            const e = escenario();
            const sol = R().apuntarHacia(gameConfig, e.origen(), function (s) { return e.predecir(s); });
            return sol ? e.dedoPara(sol.P) : null;   // la mano arrastra dentro de la esfera hasta poner la mira ahí
        },
        soltar: function (dx, dy) {
            const e = escenario();
            e.demoSoltar();
            return e.disparar(e.tiroDe(dx, dy));
        },
        decir: function (texto, pj) { return hablar(texto, pj || "zoe", pj === "zeus" ? null : "senala"); },
        terminar: async function () {
            const e = escenario();
            if (!e) return;
            e.demoSoltar();
            e.destacar(false);
            e.ocultarSombra();
            await e.ocultarDiana();
        }
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
    if (acc().mostrarIntro && window.TiroDemo) {
        enDemo = true;
        try {
            await (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.TiroDemo.correr, apiDemo()) : window.TiroDemo.correr(apiDemo()));
        } catch (e) {
            console.warn("[TiroBlanco] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    } else if (escenario()) {
        await escenario().ocultarDiana();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!");
    nubeVisible = false;
    document.body.classList.remove("demo-lock", "presentando");
    comenzarRonda(0);
}

// ------------------------------------------------------------------ rondas y lanzamientos

function comenzarRonda(i) {
    const e = escenario();
    if (!e) return;
    partidaEnCurso = true;
    rondaIdx = i;
    lanzIdx = 0;
    puntosRonda = 0;
    historialRonda = [];
    fallosSeguidos = 0;
    patronAnterior = null;
    e.configurar(cfgR());
    pintarHud();
    siguienteLanzamiento();
}

async function siguienteLanzamiento() {
    const tk = token;
    const e = escenario();
    if (!e) return;
    const r = cfgR();
    jugando = false;
    e.entrada(false);
    const patron = R().elegirPatron(r.patrones, patronAnterior);
    patronAnterior = patron;
    const extra = patron === "vertical" ? { desX: (Math.random() * 2 - 1) * 320 } : {};
    pintarHud();
    await e.nuevoLanzamiento({ patron: patron, u0: Math.random() * 0.5, extra: extra });
    if (tk !== token || juegoTerminado) return;
    // sombra fantasma: en los primeros lanzamientos de la ronda, o como ayuda tras varios intentos
    const ayudaSombra = fallosSeguidos >= (Number(cfgJuego().fallosParaSombra) || 2);
    if (lanzIdx < r.sombra.lanzamientos || ayudaSombra) {
        e.sombra(r.sombra.ms || 1500, r.sombra.alApuntar || ayudaSombra, Number(cfgJuego().anticipoS) || 0.35);
    }
    jugando = true;
    e.entrada(true);
    if (lanzIdx === 0) {
        const ins = (textos().instruccionRonda || [])[rondaIdx];
        if (ins) decir(ins.texto, ins.pj);
        if (rondaIdx === 0) mostrarPista(textos().pistaArrastra);
    } else if (ayudaSombra) {
        decirRapido(fallosSeguidos % 2 ? textos().zeusSigue : textos().zoeAdelante, fallosSeguidos % 2 ? "zeus" : "zoe", 2);
    } else if (lanzIdx % 2 === 1) {
        decirRapido(lanzIdx === 1 ? textos().zoeMira : textos().zoeLanza, "zoe");
    }
    programarAyuda();
}

function alApuntar() {
    if (!jugando) return;
    limpiarAyuda();
    ocultarPista();
    if (primeraCarga) {
        primeraCarga = false;
        decirRapido(textos().zeusCarga, "zeus");
    }
}

/** Tocó fuera de la esfera: no se apunta; se muestra dónde tocar (sin castigo). */
function alTocarFuera() {
    if (!jugando || volando) return;
    const e = escenario();
    if (e && acc().ayudaAutomatica) {
        e.destacar(true);
        setTimeout(function () { if (esc() && esc().listo() && !esc().apuntando()) esc().destacar(false); }, 1800);
    }
    mostrarPista(textos().pistaArrastra, 2600);
    programarAyuda();
}

async function alSoltar(v) {
    const e = escenario();
    if (!e || !jugando || volando) return;
    const tiro = v.tiro || e.tiroDe(v.dx, v.dy);
    if (!tiro.valido) {
        // toque sin arrastre: se explica con texto y voz, sin castigo
        mostrarPista(textos().pistaMasLargo, 2600);
        decirRapido(textos().zeusCarga, "zeus", 2);
        programarAyuda();
        return;
    }
    const tk = token;
    volando = true;
    jugando = false;
    e.entrada(false);
    e.ocultarSombra();
    limpiarAyuda();
    ocultarPista();
    const res = await e.disparar(tiro);
    if (tk !== token) return;
    volando = false;
    const zona = res && res.acierto ? res.zona : "fallo";
    historial.push(zona);
    historialRonda.push(zona);
    if (zona !== "fallo") {
        const antes = puntosTotal;
        puntosTotal += res.puntos;
        puntosRonda += res.puntos;
        fallosSeguidos = 0;
        animarMarcador(antes, puntosTotal, res.puntos);
        decirRapido(textos().zeusBien, "zeus", zona === "centro" ? 2 : 1);
    } else {
        fallosSeguidos++;
        decirRapido(textos().fallo, "zoe", 2);
    }
    lanzIdx++;
    pintarHud();
    await sleep(zona === "fallo" ? 900 : 600);
    if (tk !== token) return;
    if (lanzIdx >= porRonda()) finRonda();
    else siguienteLanzamiento();
}

async function finRonda() {
    const tk = token;
    const e = escenario();
    jugando = false;
    limpiarAyuda();
    ocultarPista();
    e.entrada(false);
    e.mover(false);
    pintarHud();
    sfx("ronda");
    mostrarCartel(R().plantilla(textos().rondaListaTitulo, { n: rondaIdx + 1 }), R().plantilla(textos().rondaListaSub, { p: puntosRonda }));
    const voz = decir(textos().rondaLista, "zoe");
    await Promise.all([e.celebrarRonda(), Promise.race([voz, sleep(4500)])]);
    if (tk !== token) return;
    await sleep(300);
    ocultarCartel();
    if (rondaIdx + 1 >= R().totalRondas(gameConfig)) {
        terminarJuego();
        return;
    }
    const sig = cfgR(rondaIdx + 1);
    mostrarCartel(R().plantilla(textos().rondaSiguienteTitulo, { n: rondaIdx + 2 }), sig.nombre || "", 1700);
    await sleep(1500);
    if (tk !== token) return;
    comenzarRonda(rondaIdx + 1);
}

// ------------------------------------------------------------------ ayuda automática

function programarAyuda(ms) {
    clearTimeout(tAyuda);
    const espera = ms || Number(cfgJuego().ayudaMs) || 12000;
    tAyuda = setTimeout(function () {
        const e = escenario();
        if (!e || !jugando || volando || e.apuntando()) return;
        if (acc().ayudaAutomatica) {
            e.destacar(true);
            e.sombra(1800, false, Number(cfgJuego().anticipoS) || 0.35);
            mostrarPista(textos().pistaArrastra, 4000);
        }
        decirRapido(frase("ayuda"), "zoe");
        programarAyuda(Number(cfgJuego().ayudaRepetirMs) || 15000);
    }, espera);
}

function limpiarAyuda() {
    clearTimeout(tAyuda);
    if (esc() && esc().listo()) esc().destacar(false);
}

// ------------------------------------------------------------------ escena final

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    const tk = token;
    limpiarAyuda();
    ocultarPista();
    ocultarCartel();
    pintarHud();
    document.body.classList.add("en-final", "demo-lock");
    const e = esc();
    await e.irFinal();
    if (tk !== token) return;
    nubeVisible = true;
    mostrarResultado();
    zoeEntra().then(function () { gestoGuia("celebra"); });
    await Promise.race([decir(textos().finalZoe, "zoe", "celebra"), sleep(12000)]);
    if (tk !== token) return;
    await Promise.race([decir(textos().finalZeus, "zeus"), sleep(9000)]);
    if (tk !== token) return;
    gestoGuia("final");
}

function alEventoEscena(nombre, datos) {
    switch (nombre) {
        case "carga": sfx("carga"); break;
        case "mira": sfx("mira"); break;
        case "lanzar": sfx("lanzar"); break;
        case "impacto": sfx(datos === "centro" ? "centro" : (datos === "medio" ? "medio" : "exterior")); break;
        case "fallo": sfx("fallo"); break;
        case "aparece": sfx("aparece"); break;
        case "fuego": sfx("fuego"); break;
        case "final-transforma": sfx("transforma"); break;
        case "final-estrella": sfx("centro"); break;
        case "final-fiesta":
            if (window.SonidosTiro) window.SonidosTiro.musica(true);
            sfx("estrellas");
            break;
        default: break;
    }
}

function mostrarResultado() {
    const panel = document.getElementById("final-panel");
    if (!panel) return;
    const res = R().resumen(gameConfig, historial);
    const n = R().estrellas(res, R().totalLanzamientos(gameConfig));
    document.getElementById("final-titulo").textContent = textos().finalTitulo || "";
    document.getElementById("res-lanzamientos").textContent = String(res.lanzamientos);
    document.getElementById("res-aciertos").textContent = String(res.aciertos);
    document.getElementById("res-centros").textContent = String(res.centros);
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
    // los puntos totales aparecen contando
    const num = document.getElementById("res-puntos");
    num.textContent = "0";
    const t0 = performance.now(), dur = 1400;
    const paso = function () {
        if (panel.hidden) return;
        const u = Math.min(1, (performance.now() - t0) / dur);
        num.textContent = String(Math.round(res.puntos * (1 - Math.pow(1 - u, 3))));
        if (u < 1) setTimeout(paso, 30);
        else sfx("estrellas");
    };
    setTimeout(paso, 500);
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

async function reiniciarPartida() {
    if (!partidaEnCurso || enDemo) {
        window.location.reload();
        return;
    }
    token++;
    juegoTerminado = false;
    jugando = false;
    volando = false;
    callarTodo();
    limpiarAyuda();
    ocultarPista();
    ocultarCartel();
    ocultarResultado();
    if (window.SonidosTiro) {
        window.SonidosTiro.musica(false);
        window.SonidosTiro.ambiente(true);
    }
    zoeOcultar();
    nubeVisible = false;
    document.body.classList.remove("en-final", "demo-lock");
    const e = escenario();
    if (e) e.reiniciar();
    historial = [];
    historialRonda = [];
    puntosTotal = 0;
    puntosRonda = 0;
    lanzIdx = 0;
    rondaIdx = 0;
    aplicarAccesibilidad();
    pintarHud();
    comenzarRonda(0);
}

// ------------------------------------------------------------------ arranque

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261119vol"));
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

    if (window.EscenarioTiro) {
        const E = window.EscenarioTiro;
        E.al("apuntar", alApuntar);
        E.al("soltar", alSoltar);
        E.al("fuera", alTocarFuera);
        E.al("evento", alEventoEscena);
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
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        if (esc()) setTimeout(function () { esc().reacomodar(); }, 60);
        if (zoeEnEscena) setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (pj && !pj.dataset.caminando) ubicarZoe();
        }, 60);
    });
    window.addEventListener("pagehide", function () {
        if (window.SonidosTiro) window.SonidosTiro.detenerTodo();
        if (TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
    });
});
