/**
 * Picnic con los Animalitos Glotones — flujo del juego (Polimotor, 3-4 años, coordinación visual).
 *
 * inicio → intro 3D (Zeus y Zoe) → edad → presentación en el bosque (el conejito y el perrito llegan a la
 * manta, el plato se llena, entra Zoe) → demostración automática (Zeus) → "¡Comenzar a jugar!" →
 * 3 rondas con 2, 3 y 4 animalitos (llegan el pajarito y el osito) → fiesta final independiente →
 * resultado "¡9 ALIMENTOS ENTREGADOS!" con "Jugar nuevamente" y "Volver al menú".
 *
 * Cada alimento tiene un dueño en la ronda. Soltarlo en la boca del dueño lo entrega; en la de otro animal,
 * ese animal niega y el alimento vuelve sin castigo; lejos de toda boca cuenta como fallo y agranda la zona.
 *
 * reglas.js decide, escena-picnic.js dibuja, sonidos.js suena, demo.js demuestra; aquí se ordena el flujo.
 */
"use strict";

let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introOmitida = false;

let partidaIniciada = false;   // ya pasó por la edad (presentación/demo)
let partidaEnCurso = false;    // ya empezó la primera ronda
let jugando = false;
let bloqueado = false;
let juegoTerminado = false;
let enDemo = false;
let rondaIdx = 0;
let entregadasRonda = 0;
let totalEntregadas = 0;
const entregadas = new Set();
let fallosSeguidos = 0;
let turnoAcierto = 0;
let zeusAgarre = false;
let token = 0;
let silencio = false;
let vozActiva = null;
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

const R = function () { return window.ReglasPicnic; };

function escenario() {
    return window.EscenarioPicnic && window.EscenarioPicnic.listo() ? window.EscenarioPicnic : null;
}

function esc() {
    return window.EscenarioPicnic || null;
}

function sfx(nombre) {
    const s = window.SonidosPicnic;
    if (s && typeof s[nombre] === "function") s[nombre]();
}

function acc() { return gameConfig.accesibilidad || {}; }
function cfgJuego() { return gameConfig.juego || {}; }
function textos() { return gameConfig.textos || {}; }
function cfgR(i) { return R().ronda(gameConfig, i == null ? rondaIdx : i); }
/** Alimentos de la ronda i (uno por animal presente), mezclados en el plato. */
function piezasDe(i) { return R().piezasRonda(gameConfig, i); }
function feedbackActivo() { return gameConfig.mostrarFeedBack !== false; }
function radioActual() { return R().radioEntrega(gameConfig, fallosSeguidos); }

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

// ------------------------------------------------------------------ voces: una a la vez

function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    nubeZoe(quien === "zoe" ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || silencio || typeof TextoVoz === "undefined") return Promise.resolve();
    if (window.SonidosPicnic) window.SonidosPicnic.agachar(true);
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    const fin = function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
        if (window.SonidosPicnic) window.SonidosPicnic.agachar(false);
    };
    const p = Promise.resolve(TextoVoz.hablar(texto, quien)).then(fin, fin);
    vozActiva = p;
    p.then(function () { if (vozActiva === p) vozActiva = null; });
    return p;
}

/** Instrucción importante: espera a que termine la voz que suena (no se encima ni la interrumpe). */
function decir(texto, pj, gesto, nube) {
    const tk = token;
    const antes = vozActiva ? Promise.race([vozActiva, sleep(9000)]) : Promise.resolve();
    return antes.then(function () {
        if (tk !== token) return;
        return hablar(texto, pj, gesto, nube);
    });
}

/** Frase corta de la partida: si ya hay una voz sonando, se omite. */
function decirRapido(texto, pj, gesto) {
    const ahora = Date.now();
    if (vozActiva || ahora < vozLibreDesde) return;
    vozLibreDesde = ahora + (Number(cfgJuego().vozPausaMs) || 2600);
    hablar(texto, pj, gesto);
}

function callarTodo() {
    vozActiva = null;
    if (typeof TextoVoz !== "undefined") {
        if (TextoVoz.vaciar) TextoVoz.vaciar();
        if (TextoVoz.detener) TextoVoz.detener();
    }
    if (window.SonidosPicnic) window.SonidosPicnic.agachar(false);
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
    if (window.SonidosPicnic) {
        window.SonidosPicnic.desbloquear();
        window.SonidosPicnic.ambiente(true);
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
    if (window.SonidosPicnic) window.SonidosPicnic.volumen(n);
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
    if (window.SonidosPicnic) window.SonidosPicnic.silenciar(silencio);
    if (silencio) callarTodo();
    pintarIconoVolumen();
}

const ACC_OPCIONES = [
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "ayudaAutomatica", label: "Ayuda visual (brillo y caminito)" },
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
    if (!a.ayudaAutomatica && esc()) esc().destacar(null);
}

function salirAlMenu() {
    callarTodo();
    if (window.SonidosPicnic) window.SonidosPicnic.detenerTodo();
    if (window.self !== window.top) {
        window.parent.postMessage({ type: "pednia:salir-juego" }, window.location.origin);
    } else {
        window.history.back();
    }
}

// ------------------------------------------------------------------ indicadores (contador arriba, ronda abajo a la izquierda)

const iconos = {};

function iconoAlimento(tipo) {
    if (!iconos[tipo] && window.DibujosPicnic) iconos[tipo] = window.DibujosPicnic.svgAlimento(tipo);
    return iconos[tipo] || "";
}

/** "el conejito", "el perrito"… (para las frases de Zoe). */
function nombreAnimal(id) {
    const a = R().datosAnimal(gameConfig, id);
    return a ? a.nombre : "";
}

function construirHud() {
    const cont = document.getElementById("contador-grupos");
    if (!cont) return;
    cont.innerHTML = "";
    R().rondas(gameConfig).forEach(function (r, i) {
        const g = document.createElement("div");
        g.className = "contador-grupo";
        g.dataset.ronda = String(i);
        (r.alimentos || []).forEach(function (tipo, k) {
            const s = document.createElement("span");
            s.className = "contador-hueco";
            s.dataset.id = R().idAlimento(i, k, tipo);
            s.innerHTML = '<img alt="" src="' + iconoAlimento(tipo) + '">';
            g.appendChild(s);
        });
        cont.appendChild(g);
    });
    const puntos = document.getElementById("ronda-puntos");
    if (puntos) {
        puntos.innerHTML = "";
        for (let i = 0; i < R().totalRondas(gameConfig); i++) puntos.appendChild(document.createElement("span"));
    }
}

function pintarHud(idNuevo) {
    const total = R().totalAlimentos(gameConfig);
    document.querySelectorAll(".contador-hueco").forEach(function (s) {
        const lleno = entregadas.has(s.dataset.id);
        s.classList.toggle("lleno", lleno);
        s.classList.toggle("nuevo", lleno && s.dataset.id === idNuevo);
    });
    document.querySelectorAll(".contador-grupo").forEach(function (g) {
        g.classList.toggle("actual", Number(g.dataset.ronda) === rondaIdx && !juegoTerminado);
    });
    const num = document.getElementById("contador-num");
    if (num) num.textContent = totalEntregadas + " / " + total;
    const caja = document.getElementById("contador");
    if (caja) {
        caja.setAttribute("aria-valuenow", String(totalEntregadas));
        caja.setAttribute("aria-valuemax", String(total));
        caja.setAttribute("aria-label", "Alimentos entregados: " + totalEntregadas + " de " + total);
    }
    const n = document.getElementById("ronda-num");
    if (n) n.textContent = String(rondaIdx + 1);
    document.querySelectorAll("#ronda-puntos span").forEach(function (p, i) {
        p.classList.toggle("hecha", i < rondaIdx || (i === rondaIdx && entregadasRonda >= (cfgR().alimentos || []).length));
        p.classList.toggle("actual", i === rondaIdx);
    });
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

async function presentar() {
    const e = escenario();
    if (!e) return;
    e.arrastre(false);
    e.radio(radioActual());
    await e.cargarRonda(0, piezasDe(0));
    await zoeEntra();
    gestoGuia("saluda");
    await Promise.race([decir(textos().introZoe, "zoe"), sleep(16000)]);
    await sleep(400);
}

function apiDemo() {
    const tk = token;
    return {
        cancelado: function () { return tk !== token || juegoTerminado || !escenario(); },
        textos: textos,
        preparar: async function () {
            const e = escenario();
            e.reiniciarAnimales();
            if (!e.alimentosEnPlato().length) await e.cargarRonda(0, piezasDe(0));
        },
        alimentoDemo: function () {
            const e = escenario();
            const tipo = (gameConfig.demo && gameConfig.demo.alimento) || "zanahoria";
            const ids = e.alimentosEnPlato();
            return ids.find(function (id) { return e.tipoDe(id) === tipo; }) || ids[0];
        },
        punto: function (id) { return escenario().puntoDe(id); },
        /** Boca del dueño del alimento, en pantalla. */
        boca: function (id) {
            const e = escenario();
            const est = e.estado(id);
            return est ? e.puntoBocaDe(est.animal) : null;
        },
        tomar: function (id) {
            escenario().tomarDemo(id);
            sfx("seleccion");
        },
        mover: function (id, x, y) {
            escenario().moverDemo(id, x, y);
            sfx("arrastre");
        },
        entregar: async function (id) {
            const e = escenario();
            e.soltarDemo(id);
            await e.entregar(id);
            await e.celebrarRonda();
        },
        decir: function (texto, pj) { return hablar(texto, pj || "zoe", pj === "zeus" ? null : "senala"); },
        terminar: async function () {
            const e = escenario();
            if (!e) return;
            e.reiniciarAnimales();
            e.vaciar();
        }
    };
}

/** Arranque único tras elegir la edad (no repetir la demo si el selector avisa dos veces). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenarioListo;
    aplicarAccesibilidad();
    await presentar();
    if (acc().mostrarIntro && window.PicnicDemo) {
        enDemo = true;
        try {
            await window.PicnicDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[PicnicAnimalitos] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    if (escenario()) escenario().vaciar();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!");
    nubeVisible = false;
    document.body.classList.remove("demo-lock");
    comenzarRonda(0);
}

// ------------------------------------------------------------------ rondas

async function comenzarRonda(i) {
    const tk = token;
    const e = escenario();
    if (!e) return;
    partidaEnCurso = true;
    rondaIdx = i;
    entregadasRonda = 0;
    fallosSeguidos = 0;
    zeusAgarre = false;
    jugando = false;
    bloqueado = true;
    e.arrastre(false);
    // la zona de entrega agrandada por fallos no pasa de una ronda a otra
    e.radio(radioActual());
    pintarHud();
    await e.cargarRonda(i, piezasDe(i));
    if (tk !== token) return;
    e.arrastre(true);
    jugando = true;
    bloqueado = false;
    const ins = (textos().instruccionRonda || [])[i];
    if (ins) decir(ins.texto, ins.pj);
    programarAyuda();
}

function alTomar() {
    if (!jugando || bloqueado) return;
    limpiarAyuda();
    sfx("seleccion");
    if (!zeusAgarre && rondaIdx >= 1) {
        zeusAgarre = true;
        decirRapido(textos().zeusDespacito, "zeus");
    }
}

function alArrastrar() {
    sfx("arrastre");
}

async function alSoltar(id) {
    const e = escenario();
    if (!e) return;
    if (!jugando || bloqueado || entregadas.has(id)) {
        e.devolver(id);
        return;
    }
    const est = e.estado(id);
    const tipo = est ? est.tipo : e.tipoDe(id);
    const res = R().evaluarEntrega({
        alimento: est && est.alimento,
        bocas: e.bocas(),
        tipo: tipo,
        animalEsperado: est ? est.animal : R().animalDe(gameConfig, tipo),
        radio: radioActual(),
        entregada: entregadas.has(id) || !!(est && est.entregada)
    });
    const tk = token;
    if (res.motivo === "repetida") {
        e.devolver(id);
        return;
    }
    if (res.motivo === "otroAnimal") {
        // otro animal: niega con la cabeza y la comida vuelve al plato (sin castigo, no agranda la zona)
        bloqueado = true;
        e.arrastre(false);
        limpiarAyuda();
        decirRapido(R().textoPista(gameConfig, tipo), "zoe");
        await e.rechazar(id, res.animal);
        if (tk !== token) return;
        bloqueado = false;
        e.arrastre(true);
        programarAyuda();
        return;
    }
    if (res.acierto) {
        // bloquear nuevas interacciones mientras el animal come
        bloqueado = true;
        entregadas.add(id);
        e.arrastre(false);
        limpiarAyuda();
        fallosSeguidos = 0;
        e.radio(radioActual());
        await e.entregar(id);
        if (tk !== token) return;
        entregadasRonda++;
        totalEntregadas++;
        pintarHud(id);
        if (turnoAcierto++ % 2 === 0) decirRapido(textos().zoeBien, "zoe");
        else decirRapido(textos().zeusFeliz, "zeus");
        if (entregadasRonda >= (cfgR().alimentos || []).length) {
            finRonda();
            return;
        }
        bloqueado = false;
        e.arrastre(true);
        programarAyuda();
    } else {
        // lejos de toda boca: cuenta como fallo y la zona de entrega crece un poco
        fallosSeguidos++;
        e.radio(radioActual());
        sfx("error");
        decirRapido(textos().zoeOtraVez, "zoe");
        await e.devolver(id);
        if (tk !== token) return;
        programarAyuda();
    }
}

async function finRonda() {
    const tk = token;
    const e = escenario();
    jugando = false;
    bloqueado = true;
    limpiarAyuda();
    e.arrastre(false);
    pintarHud();
    sfx("ronda");
    mostrarCartel(R().plantilla(textos().rondaListaTitulo, { n: rondaIdx + 1 }), "");
    const voz = decir(textos().rondaLista, "zoe");
    await Promise.all([e.celebrarRonda(), Promise.race([voz, sleep(4500)])]);
    if (tk !== token) return;
    await sleep(400);
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
    const espera = ms || Number(cfgJuego().ayudaMs) || 10000;
    tAyuda = setTimeout(function () {
        const e = escenario();
        if (!e || !jugando || bloqueado) return;
        const ids = e.alimentosEnPlato();
        if (!ids.length) return;
        if (acc().ayudaAutomatica) e.destacar(ids[0]);
        decirRapido(frase("ayuda"), "zoe");
        programarAyuda(Number(cfgJuego().ayudaRepetirMs) || 14000);
    }, espera);
}

function limpiarAyuda() {
    clearTimeout(tAyuda);
    if (esc()) esc().destacar(null);
}

// ------------------------------------------------------------------ escena final

async function fundido(entrar) {
    const f = document.getElementById("fundido");
    if (!f) return;
    f.hidden = false;
    f.classList.toggle("visible", !!entrar);
    await sleep(420);
    if (!entrar) f.hidden = true;
}

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    bloqueado = true;
    const tk = token;
    limpiarAyuda();
    ocultarCartel();
    pintarHud();
    document.body.classList.add("en-final", "demo-lock");
    // fundido cruzado dentro de Phaser: la fiesta aparece sobre el picnic, sin pantalla en blanco
    const e = esc();
    await e.irFiesta();
    if (tk !== token) return;
    nubeVisible = true;
    if (window.SonidosPicnic) window.SonidosPicnic.agachar(true);
    const sec = e.secuenciaFiesta();
    await sec;
    if (tk !== token) return;
    zoeEntra().then(function () { gestoGuia("celebra"); });
    await Promise.race([decir(textos().finalZoe, "zoe", "celebra"), sleep(12000)]);
    if (tk !== token) return;
    await Promise.race([decir(textos().finalZeus, "zeus"), sleep(12000)]);
    if (tk !== token) return;
    gestoGuia("final");
    mostrarResultado();
}

/** Voz propia de cada animal al terminar de comer (el "gracias" divertido del pedido). */
const VOZ_ANIMAL = { conejo: "ñam", perro: "ladrido", pajaro: "pio", oso: "gruñido" };

function alEventoEscena(nombre, datos) {
    switch (nombre) {
        case "aparece": sfx("aparece"); break;
        case "rebote": sfx("rebote"); break;
        case "niega": sfx("niega"); break;
        case "entra": sfx("entraBoca"); break;
        case "mastica": sfx("masticar"); break;
        case "feliz":
            sfx(VOZ_ANIMAL[datos] || "satisfaccion");
            setTimeout(function () { sfx("estrellas"); }, 420);
            break;
        case "llega":
            sfx("brinco");
            // solo se presenta a los que llegan a mitad del juego (el pajarito y el osito)
            if (partidaEnCurso && rondaIdx > 0 && !juegoTerminado) {
                decir(R().plantilla(textos().llegaAnimal, { animal: nombreAnimal(datos) }), "zoe");
            }
            break;
        case "final-come": sfx("satisfaccion"); break;
        case "final-levanta": sfx("brinco"); break;
        case "final-fiesta":
            if (window.SonidosPicnic) window.SonidosPicnic.musica(true);
            sfx("estrellas");
            break;
        case "final-salto": sfx("rebote"); break;
        case "final-amigos":
            sfx("pio");
            sfx("ladrido");
            break;
        case "final-frutas": sfx("estrellas"); break;
        case "final-saludo":
            sfx("acierto");
            setTimeout(function () { sfx("ñam"); }, 300);
            break;
        default: break;
    }
}

function mostrarResultado() {
    const panel = document.getElementById("final-panel");
    if (!panel) return;
    const total = R().totalAlimentos(gameConfig);
    document.getElementById("final-titulo").textContent = textos().finalTitulo || "";
    document.getElementById("final-resultado").textContent = R().plantilla(textos().finalResultado, { n: total });
    const lista = document.getElementById("final-frutas");
    lista.innerHTML = "";
    R().rondas(gameConfig).forEach(function (r) {
        (r.alimentos || []).forEach(function (tipo) {
            const img = document.createElement("img");
            img.src = iconoAlimento(tipo);
            img.alt = "";
            img.style.setProperty("--i", String(lista.children.length));
            lista.appendChild(img);
        });
    });
    document.getElementById("btn-otra-vez").querySelector("span").textContent = textos().botonOtraVez || "Jugar nuevamente";
    document.getElementById("btn-al-menu").querySelector("span").textContent = textos().botonMenu || "Volver al menú";
    panel.hidden = false;
    panel.classList.remove("entra");
    void panel.offsetWidth;
    panel.classList.add("entra");
    sfx("estrellas");
    setTimeout(function () {
        const b = document.getElementById("btn-otra-vez");
        if (b) b.focus();
    }, 600);
}

function ocultarResultado() {
    const panel = document.getElementById("final-panel");
    if (panel) panel.hidden = true;
}

// ------------------------------------------------------------------ reiniciar

async function reiniciarPartida() {
    if (!partidaEnCurso || enDemo) {
        window.location.reload();
        return;
    }
    token++;
    juegoTerminado = false;
    jugando = false;
    bloqueado = true;
    callarTodo();
    limpiarAyuda();
    ocultarCartel();
    ocultarResultado();
    if (window.SonidosPicnic) {
        window.SonidosPicnic.musica(false);
        window.SonidosPicnic.ambiente(true);
    }
    zoeOcultar();
    nubeVisible = false;
    document.body.classList.remove("en-final");
    const e = esc();
    if (e && e.enFiesta()) {
        e.detenerFiesta();
        await e.volverPicnic();
    }
    entregadas.clear();
    totalEntregadas = 0;
    turnoAcierto = 0;
    document.body.classList.remove("demo-lock");
    aplicarAccesibilidad();
    pintarHud();
    comenzarRonda(0);
}

// ------------------------------------------------------------------ arranque

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261120a"));
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

    if (window.EscenarioPicnic) {
        const E = window.EscenarioPicnic;
        E.al("tomar", alTomar);
        E.al("arrastrar", alArrastrar);
        E.al("soltar", alSoltar);
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
        if (zoeEnEscena) setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (pj && !pj.dataset.caminando) ubicarZoe();
        }, 60);
    });
    window.addEventListener("pagehide", function () {
        if (window.SonidosPicnic) window.SonidosPicnic.detenerTodo();
        if (TextoVoz.vaciar) TextoVoz.vaciar();
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
    });
});
