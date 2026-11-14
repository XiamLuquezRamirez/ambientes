/**
 * El Secuenciador de Baile y Lateralidad — control del juego (Polimotor, Transición 5-6 años, juegos de
 * memoria corporal, juego 4). Zeus baila una rutina en la pista y el niño la repite con los botones.
 *
 * Flujo: pantalla de inicio → intro 3D compartida (Zeus y Zoe) → PedniaEdad → INTRODUCCIÓN en el teatro (título,
 * Zeus saluda y explica "observa y repite", presenta sus tres movimientos) → botón "¡Empezar!" → DEMO automática
 * (cabeza → aplaudir, la mano toca los botones en orden) → "¡AHORA ES TU TURNO!" → 3 RONDAS de 4 ÍTEMS
 * (12 en total), cada ítem con exactamente dos movimientos → VICTORIA ("¡ERES UN CAMPEÓN DE LA MEMORIA
 * CORPORAL!", Volver a jugar / Continuar).
 *
 * Cada ítem: OBSERVAR (botones bloqueados; Zeus hace los dos movimientos) → REPETIR (el niño toca dos botones;
 * cada toque hace moverse a Zeus) → COMPROBAR (mismo orden) → acierto (notas, celebración, progreso, avanza
 * solo) o error (rebote amable, Zeus vuelve a mostrar la MISMA secuencia y se reintenta; sin vidas).
 * Dificultad por ronda (config.rondas): velocidad de Zeus, pausa entre movimientos y apoyos visuales; nunca
 * más de dos movimientos.
 *
 * Estados (reglas.js): INTRO, DEMO, SHOWING_SEQUENCE, WAITING_INPUT, CHECKING_ANSWER, CORRECT_FEEDBACK,
 * INCORRECT_FEEDBACK, ROUND_TRANSITION, VICTORY. Solo WAITING_INPUT acepta toques. Cada partida lleva un número
 * (partidaId): lo que termina después de un reinicio no toca la partida nueva, y los temporizadores se cancelan.
 *
 * Módulos: ReglasSimon (puro) · IconosSimon (dibujos de los botones) · SonidosSimon (Web Audio) ·
 * EscenarioSimon (Phaser 4: estrellas, destellos, ondas, notas, confeti) · SimonDemo (demostración) ·
 * Zeus3D (Zeus en la tarima y sus movimientos) · Zoe3D (ayudante).
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let arrancado = false;
let st = null;               // estado de la partida (ReglasSimon.crear)
let partidaId = 0;
let enDemo = false;
let ultimoToque = 0;
let movRespuesta = null;     // Promise del movimiento de Zeus del último toque
let ayuda = { t: null, token: 0, veces: 0 };
let efectosOn = true;
const timers = new Set();

function readText(ruta_local) {
    var texto = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", ruta_local, false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
        texto = xmlhttp.responseText;
    }
    return texto;
}

/** setTimeout registrado: se cancela entero al reiniciar. */
const REDUCIDO = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

function sleep(ms) {
    return new Promise(function (resolve) {
        const t = setTimeout(function () {
            timers.delete(t);
            resolve();
        }, ms);
        timers.add(t);
    });
}

function cancelarTimers() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers.clear();
}

// ------------------------------------------------------------------ accesos a módulos

function sonido() {
    return (window.PedniaAudio && window.PedniaAudio.activo) ? window.PedniaAudio : null;
}

function sonarEvento(nombre, opts) {
    return !!(sonido() && sonido().tieneTema() && sonido().evento(nombre, opts));
}

function sfx(nombre, arg) {
    if (!efectosOn) return;
    if (window.SonidosSimon && typeof window.SonidosSimon[nombre] === "function") window.SonidosSimon[nombre](arg);
}

function fx() {
    return window.EscenarioSimon && window.EscenarioSimon.listo() ? window.EscenarioSimon : null;
}

function zeus3d() {
    return window.Zeus3D && window.Zeus3D.listo() ? window.Zeus3D : null;
}

function zoe3d() {
    return window.Zoe3D && window.Zoe3D.listo() ? window.Zoe3D : null;
}

function acc() {
    return gameConfig.accesibilidad || {};
}

function cfgJuego() {
    return gameConfig.juego || {};
}

function textos() {
    return gameConfig.textos || {};
}

function accionCfg(id) {
    return ReglasSimon.accion(gameConfig, id) || { id: id, nombre: id, voz: id };
}

function rondaCfg() {
    return ReglasSimon.ronda(gameConfig, st ? st.ronda : 0);
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

function ms(clave, defecto) {
    const n = Number(cfgJuego()[clave]);
    return isFinite(n) && n > 0 ? n : defecto;
}

function vigente(id) {
    return id === partidaId;
}

// ------------------------------------------------------------------ voces y nubes

function hablar(texto, pj) {
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    return TextoVoz.hablar(texto, pj === "zeus" ? "zeus" : "zoe");
}

const tNube = { zeus: null, zoe: null };

function nube(quien, texto, quedarse) {
    const caja = document.getElementById(quien + "-nube");
    const span = document.getElementById(quien + "-nube-texto");
    if (!caja || !span) return;
    clearTimeout(tNube[quien]);
    if (!texto) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.hidden = false;
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
    if (!quedarse) {
        // sin voz: la nube se queda lo que tarda en leerse
        const largo = Math.max(2200, Math.min(7000, span.textContent.length * 70));
        tNube[quien] = setTimeout(function () { caja.hidden = true; }, largo);
    }
}

/** Habla Zeus (o Zoe) con su nube y su clip de hablar; la nube se va al terminar la voz. */
function decir(texto, quien, gesto) {
    quien = quien === "zoe" ? "zoe" : "zeus";
    const pj = quien === "zeus" ? zeus3d() : zoe3d();
    if (gesto && pj) pj.gesto(gesto);
    if (!texto) return Promise.resolve();
    if (!feedbackActivo() || typeof TextoVoz === "undefined") {
        nube(quien, texto, false);
        return sleep(Math.min(3500, 900 + String(texto).length * 35));
    }
    nube(quien, texto, true);
    if (pj) pj.hablar(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (pj) pj.hablar(false);
        tNube[quien] = setTimeout(function () {
            const caja = document.getElementById(quien + "-nube");
            const span = document.getElementById(quien + "-nube-texto");
            if (caja && span && span.textContent === (TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto)) caja.hidden = true;
        }, 700);
    });
}

function callarNubes() {
    nube("zeus", "");
    nube("zoe", "");
}

// ------------------------------------------------------------------ intro 3D (igual que los demás Polimotor)

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
        return {
            personaje: id,
            nombre: nombre,
            color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
            texto: TextoVoz.textoPlano(linea.texto)
        };
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
            if (typeof window.__intro3dDispose === "function") {
                window.__intro3dDispose();
            }
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
    asegurarAudioFondo();
    TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
    $("#fondo_blanco").stop(true, true).hide();
    destruirIntro3d();
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    iniciarPartida();
}

function empecemosJuego() {
    const pantalla = document.getElementById("pantalla-inicio");
    const btn = document.getElementById("btn-empecemos");
    if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
    if (btn) btn.disabled = true;
    TextoVoz.desbloquear();
    asegurarAudioFondo();
    sincronizarDialogoIntro3d();
    TextoVoz.precargar();
    pantalla.classList.add("is-out");
    introDesdeEmpecemos = true;
    mostrarIntro3d();

    let oculto = false;
    const ocultarPantalla = function () {
        if (oculto) return;
        oculto = true;
        pantalla.hidden = true;
        document.body.classList.remove("esperando-inicio");
    };
    pantalla.addEventListener("animationend", function (ev) {
        if (ev.animationName === "inicioDisuelve") ocultarPantalla();
    });
    setTimeout(ocultarPantalla, 1250);
}

function cerrar_anuncio() {
    empezarJuegoTrasIntro();
}

// ------------------------------------------------------------------ audio y menús

function reproducirAudio(ruta, volumen, loop) {
    if (!ruta) return null;
    if (sonido()) {
        const vol = volumen != null ? volumen : 1;
        if (loop) {
            const musica = sonido().musica(ruta);
            if (musica) {
                musica.volume = vol;
                musica.play();
                audioFondo = musica;
                return musica;
            }
        } else if (sonido().archivo(ruta, vol)) {
            return null;
        }
    }
    try {
        const audio = new Audio(ruta);
        audio.volume = volumen != null ? volumen : 1;
        audio.loop = !!loop;
        const p = audio.play();
        if (p && p.catch) p.catch(function () {});
        if (loop) audioFondo = audio;
        return audio;
    } catch (e) {
        return null;
    }
}

function asegurarAudioFondo() {
    if (audioFondo) {
        const p = audioFondo.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
        return audioFondo;
    }
    return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, TextoVoz.VOLUMEN_FONDO, true);
}

function volumenFondoPct() {
    const n = Number(acc().volumenFondo);
    if (!isFinite(n)) return 20;
    return Math.max(0, Math.min(100, n));
}

function aplicarVolumenCalibrado(pct) {
    const n = Math.max(0, Math.min(100, Number(pct) || 0));
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    gameConfig.accesibilidad.volumenFondo = n;
    const vol = n / 100;
    if (typeof TextoVoz !== "undefined" && typeof TextoVoz.definirVolumenFondo === "function") {
        TextoVoz.definirVolumenFondo(vol);
    } else if (audioFondo) {
        audioFondo.volume = vol;
    }
    pintarIconoSonido();
}

function pintarIconoSonido() {
    const icono = document.querySelector("#btn-menu-vol i");
    if (!icono) return;
    const n = volumenFondoPct();
    const callado = n <= 0 && !feedbackActivo() && !efectosOn;
    icono.className = callado ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
}

function setMenuVol(abierto) {
    const panel = document.getElementById("menu-vol-panel");
    const btn = document.getElementById("btn-menu-vol");
    if (!panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
}

function pintarMenuVol() {
    const pct = volumenFondoPct();
    const slider = document.getElementById("rango-volumen");
    const val = document.getElementById("vol-val");
    const voces = document.getElementById("chk-voces");
    const efectos = document.getElementById("chk-efectos");
    if (slider) slider.value = String(pct);
    if (val) val.textContent = String(pct);
    if (voces) voces.checked = feedbackActivo();
    if (efectos) efectos.checked = efectosOn;
    aplicarVolumenCalibrado(pct);
}

const ACC_OPCIONES = [
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "ayudaAutomatica", label: "Ayuda visual (los botones se menean)" },
    { key: "mostrarProgreso", label: "Mostrar progreso" }
];

function setMenuAcc(abierto) {
    const panel = document.getElementById("menu-acc-panel");
    const btn = document.getElementById("btn-menu-acc");
    if (!panel || !btn) return;
    panel.hidden = !abierto;
    btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    if (abierto) setMenuVol(false);
}

function pintarMenuAcc() {
    const ops = document.getElementById("menu-acc-ops");
    if (!ops) return;
    if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
    ops.innerHTML = "";
    ACC_OPCIONES.forEach(function (op) {
        const lab = document.createElement("label");
        lab.className = "menu-acc-op";
        lab.innerHTML = '<input type="checkbox"> ' + op.label;
        const input = lab.querySelector("input");
        input.checked = op.key === "mostrarFeedBack" ? feedbackActivo() : !!acc()[op.key];
        input.addEventListener("change", function () {
            if (op.key === "mostrarFeedBack") {
                gameConfig.mostrarFeedBack = input.checked;
                if (!input.checked && TextoVoz.detener) TextoVoz.detener();
                pintarMenuVol();
            } else {
                gameConfig.accesibilidad[op.key] = input.checked;
            }
            aplicarAccesibilidadInicial();
        });
        ops.appendChild(lab);
    });
    const rango = document.createElement("label");
    rango.className = "menu-acc-op menu-acc-rango";
    const actual = Number(acc().letterSpacing);
    const valor = isFinite(actual) && actual >= 0 ? actual : 2;
    rango.innerHTML = "<span>Espaciado de letras <strong>" + valor + "</strong></span>";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    slider.step = "1";
    slider.value = String(valor);
    slider.addEventListener("input", function () {
        const n = Number(slider.value);
        gameConfig.accesibilidad.letterSpacing = n;
        rango.querySelector("strong").textContent = String(n);
        aplicarAccesibilidadInicial();
    });
    rango.appendChild(slider);
    ops.appendChild(rango);
}

function enlazarMenus() {
    const btnAcc = document.getElementById("btn-menu-acc");
    const cerrarAcc = document.getElementById("btn-cerrar-acc");
    if (btnAcc) {
        btnAcc.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-acc-panel");
            setMenuAcc(panel && panel.hidden);
        });
    }
    if (cerrarAcc) cerrarAcc.addEventListener("click", function () { setMenuAcc(false); });

    const btnVol = document.getElementById("btn-menu-vol");
    const cerrarVol = document.getElementById("btn-cerrar-vol");
    const slider = document.getElementById("rango-volumen");
    const voces = document.getElementById("chk-voces");
    const efectos = document.getElementById("chk-efectos");
    if (btnVol) {
        btnVol.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = document.getElementById("menu-vol-panel");
            const abrir = panel && panel.hidden;
            setMenuVol(abrir);
            if (abrir) setMenuAcc(false);
        });
    }
    if (cerrarVol) cerrarVol.addEventListener("click", function () { setMenuVol(false); });
    if (slider) {
        slider.addEventListener("input", function () {
            const n = Number(slider.value);
            const val = document.getElementById("vol-val");
            if (val) val.textContent = String(n);
            aplicarVolumenCalibrado(n);
        });
    }
    if (voces) {
        voces.addEventListener("change", function () {
            gameConfig.mostrarFeedBack = voces.checked;
            if (!voces.checked && TextoVoz.detener) TextoVoz.detener();
            pintarMenuAcc();
            pintarIconoSonido();
        });
    }
    if (efectos) {
        efectos.addEventListener("change", function () {
            efectosOn = efectos.checked;
            pintarIconoSonido();
        });
    }
    document.addEventListener("pointerdown", function (ev) {
        const menuAcc = document.getElementById("menu-acc");
        const menuVol = document.getElementById("menu-vol");
        if (menuAcc && !menuAcc.contains(ev.target)) setMenuAcc(false);
        if (menuVol && !menuVol.contains(ev.target)) setMenuVol(false);
    });
    pintarMenuAcc();
    pintarMenuVol();
}

function aplicarAccesibilidadInicial() {
    const a = acc();
    document.body.classList.toggle("alto-contraste", !!a.altoContraste);
    const n = Number(a.letterSpacing);
    document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    pintarProgreso();
}

// ------------------------------------------------------------------ progreso (ronda, ítem y barra)

function armarProgreso() {
    const caja = document.getElementById("progreso-grupos");
    if (!caja) return;
    caja.innerHTML = "";
    ReglasSimon.rondas(gameConfig).forEach(function (r, i) {
        const g = document.createElement("div");
        g.className = "grupo";
        g.dataset.ronda = String(i);
        g.innerHTML = '<span class="grupo-r">R' + (i + 1) + "</span>";
        for (let k = 0; k < ReglasSimon.itemsDeRonda(gameConfig, i); k++) {
            const p = document.createElement("span");
            p.className = "punto";
            p.dataset.item = String(k);
            p.innerHTML = "<span>" + (k + 1) + "</span>";
            g.appendChild(p);
        }
        caja.appendChild(g);
    });
}

function pintarProgreso() {
    const caja = document.getElementById("progreso-box");
    if (caja) caja.hidden = !acc().mostrarProgreso;
    const p = ReglasSimon.progreso(st, gameConfig);
    const t = textos();
    const ron = document.getElementById("progreso-ronda");
    // con una sola ronda no se muestra "RONDA 1 DE 1" ni la etiqueta del grupo
    if (ron) ron.hidden = p.rondas < 2;
    document.querySelectorAll("#progreso-grupos .grupo-r").forEach(function (g) { g.hidden = p.rondas < 2; });
    if (ron) ron.textContent = (t.ronda || "RONDA") + " " + p.ronda + " " + (t.de || "DE") + " " + p.rondas;
    const it = document.getElementById("progreso-item");
    if (it) it.textContent = (t.item || "ÍTEM") + " " + p.item + " " + (t.de || "DE") + " " + p.items;
    const num = document.getElementById("progreso-num");
    if (num) num.textContent = p.hechos + "/" + p.total;
    const relleno = document.getElementById("progreso-relleno");
    if (relleno) relleno.style.width = Math.round(p.fraccion * 100) + "%";
    const barra = document.getElementById("progreso-barra");
    if (barra) {
        barra.setAttribute("aria-valuenow", String(p.hechos));
        barra.setAttribute("aria-valuemax", String(p.total));
    }
    document.querySelectorAll("#progreso-grupos .grupo").forEach(function (g) {
        const r = Number(g.dataset.ronda);
        g.classList.toggle("actual", !!st && r === st.ronda);
        // ronda terminada: su ficha queda verde con estrella
        g.classList.toggle("hecha", !!(st && st.hechos[r] && st.hechos[r].filter(Boolean).length === ReglasSimon.itemsDeRonda(gameConfig, r)));
        g.querySelectorAll(".punto").forEach(function (punto) {
            const k = Number(punto.dataset.item);
            const hecho = !!(st && st.hechos[r] && st.hechos[r][k]);
            punto.classList.toggle("hecho", hecho);
            punto.classList.toggle("actual", !hecho && !!st && r === st.ronda && k === st.item && st.estado !== "INTRO");
        });
    });
}

function animarProgreso() {
    const c = document.getElementById("progreso-box");
    if (!c) return;
    c.classList.remove("sube");
    void c.offsetWidth;
    c.classList.add("sube");
}

// ------------------------------------------------------------------ marquesina: fase y ranuras de la secuencia

function fase(tipo) {
    const f = document.getElementById("fase");
    const txt = document.getElementById("fase-texto");
    if (!f || !txt) return;
    f.className = "fase fase-" + (tipo || "espera");
    txt.textContent = tipo === "observa" ? (textos().faseObserva || "¡OBSERVA!")
        : tipo === "repite" ? (textos().faseRepite || "¡REPITE LA SECUENCIA!")
            : (textos().faseEspera || "¡A BAILAR!");
    document.body.classList.toggle("fase-observa", tipo === "observa");
}

/** La marquesina muestra tantas ranuras como movimientos tenga la secuencia (2, 3 o 4), con flechas. */
function armarRanuras(n) {
    const caja = document.getElementById("secuencia");
    if (!caja) return;
    n = Math.max(2, Math.min(4, Number(n) || 2));
    if (caja.dataset.n === String(n)) return;
    caja.dataset.n = String(n);
    caja.className = "secuencia n-" + n;
    let html = "";
    for (let k = 1; k <= n; k++) {
        if (k > 1) html += '<i class="fa-solid fa-arrow-right secuencia-flecha" aria-hidden="true"></i>';
        html += '<div class="ranura" data-n="' + k + '"><span class="ranura-num">' + k + '</span><img alt="" class="ranura-img"><span class="ranura-q">?</span></div>';
    }
    caja.innerHTML = html;
}

function ranura(n) {
    return document.querySelector('#secuencia .ranura[data-n="' + n + '"]');
}

function limpiarRanuras() {
    document.querySelectorAll("#secuencia .ranura").forEach(function (r) {
        r.classList.remove("activa", "con-dibujo", "solo-luz", "bien", "mal");
        const img = r.querySelector(".ranura-img");
        if (img) img.removeAttribute("src");
    });
}

function ranuraDibujo(n, id) {
    const r = ranura(n);
    if (!r) return;
    const img = r.querySelector(".ranura-img");
    if (img) img.src = IconosSimon.dataUri(id);
    r.style.setProperty("--col", accionCfg(id).color || "#fff");
    r.classList.remove("solo-luz");
    r.classList.add("con-dibujo");
}

function ranuraLuz(n) {
    const r = ranura(n);
    if (r) r.classList.add("solo-luz");
}

function ranuraActiva(n, si) {
    const r = ranura(n);
    if (r) r.classList.toggle("activa", !!si);
}

function marcarRanuras(clase, n) {
    document.querySelectorAll("#secuencia .ranura").forEach(function (r) {
        if (n == null || Number(r.dataset.n) === n) r.classList.add(clase);
    });
}

function mostrarPasos(si) {
    const p = document.getElementById("pasos");
    const s = document.getElementById("secuencia");
    if (p) p.hidden = !si;
    if (s) s.hidden = !!si;
}

function pasoActivo(cual) {
    document.querySelectorAll("#pasos .paso").forEach(function (p) {
        p.classList.toggle("on", p.classList.contains("paso-" + cual));
    });
}

// ------------------------------------------------------------------ botones de acción

function boton(id) {
    return document.querySelector('.accion[data-accion="' + id + '"]');
}

/** Los tres movimientos que hay ahora en la botonera, en el orden en que se ven. */
function visiblesEnPantalla() {
    return Array.prototype.map.call(document.querySelectorAll("#botonera .accion"), function (b) {
        return b.dataset.accion;
    });
}

/** Crea el botón de un movimiento (dibujo, número de posición y nombre), ya con sus escuchas de toque. */
function crearBoton(id, posicion) {
    const a = accionCfg(id);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "accion accion-" + id;
    b.dataset.accion = id;
    b.disabled = true;
    b.style.setProperty("--i", posicion);
    b.innerHTML =
        '<span class="accion-num">' + (posicion + 1) + "</span>" +
        '<span class="accion-dibujo">' + IconosSimon.svg(id) + "</span>" +
        '<span class="accion-nombre"></span>';
    b.querySelector(".accion-nombre").textContent = a.nombre;
    b.setAttribute("aria-label", a.nombre);
    // pointerdown: respuesta inmediata con ratón y con el dedo; el teclado entra por click (detail 0)
    b.addEventListener("pointerdown", function (ev) {
        if (ev.isPrimary === false || (ev.pointerType === "mouse" && ev.button !== 0)) return;
        ev.preventDefault();
        alPulsar(id);
    });
    b.addEventListener("click", function (ev) {
        if (ev.detail === 0) alPulsar(id);
    });
    b.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    return b;
}

/**
 * Pone en la botonera estos tres movimientos. Si ya había otros y `animar` no es false, los de antes se
 * encogen girando y los nuevos caen rebotando uno tras otro. Devuelve una Promise que se cumple cuando la
 * botonera ya está lista (así el juego no sigue mientras los botones todavía están entrando).
 */
function ponerBotones(ids, animar) {
    const zona = document.getElementById("botonera");
    if (!zona) return Promise.resolve();
    const nuevos = (ids || []).slice();
    const previos = visiblesEnPantalla();
    const pintar = function () {
        zona.innerHTML = "";
        nuevos.forEach(function (id, i) {
            const b = crearBoton(id, i);
            if (animar !== false && previos.length) b.classList.add("entra");
            zona.appendChild(b);
        });
        habilitarBotones(false);
    };
    // primera vez, sin cambio o sin animación: se pintan de una
    if (animar === false || !previos.length || ReglasSimon.conjunto(previos) === ReglasSimon.conjunto(nuevos)) {
        if (ReglasSimon.conjunto(previos) !== ReglasSimon.conjunto(nuevos) || !previos.length) pintar();
        return Promise.resolve();
    }
    const salida = REDUCIDO ? 120 : 340;
    const entrada = REDUCIDO ? 0 : 560;
    zona.querySelectorAll(".accion").forEach(function (b, i) {
        b.disabled = true;
        b.style.setProperty("--i", i);
        b.classList.remove("entra");
        b.classList.add("sale");
    });
    sfx("seleccion");
    return sleep(salida).then(function () {
        pintar();
        return sleep(entrada);
    });
}

/** Deja en la botonera los tres movimientos visibles del ítem actual. */
function botonesDelItem(animar) {
    return ponerBotones(ReglasSimon.visiblesActuales(st, gameConfig), animar);
}

function armarBotones() {
    ponerBotones(ReglasSimon.visiblesDemo(gameConfig), false);
}

function habilitarBotones(si) {
    document.querySelectorAll(".accion").forEach(function (b) { b.disabled = !si; });
    document.body.classList.toggle("juego-bloqueado", !si);
}

function iluminar(id, si) {
    const b = boton(id);
    if (b) b.classList.toggle("iluminado", !!si);
}

function apagarBotones() {
    document.querySelectorAll(".accion").forEach(function (b) {
        b.classList.remove("iluminado", "presionado", "rebote", "canta", "menea");
    });
}

function claseUnaVez(el, clase, duracion) {
    if (!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, duracion || 600);
}

function centroBoton(id) {
    const b = boton(id);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

// ------------------------------------------------------------------ Zeus se mueve (con luces, sonidos y efectos)

const COLORES_LUZ = {
    cabeza: "#ffe066",
    cintura: "#ffc078",
    pies: "#d0bfff",
    aplaudir: "#74c0fc",
    abrirBrazos: "#99e9f2",
    estirarse: "#96f2d7",
    brazoDerecho: "#ffc9a0",
    brazoIzquierdo: "#a5d8ff",
    pieDerecho: "#ffc9de",
    pieIzquierdo: "#96f2d7",
    zapatear: "#8ce99a",
    saltar: "#ffa8c5",
    saltarUnPie: "#eebefa",
    girar: "#63e6be",
    bailar: "#fcc2d7",
    marchar: "#bac8ff"
};

function luz(id) {
    const raiz = document.documentElement;
    if (!id) {
        raiz.style.removeProperty("--luz");
        raiz.style.removeProperty("--haz-a");
        raiz.style.removeProperty("--haz-b");
        return;
    }
    const c = COLORES_LUZ[id] || "#fff3bf";
    raiz.style.setProperty("--luz", c);
    raiz.style.setProperty("--haz-a", c);
    raiz.style.setProperty("--haz-b", c);
}

function vibrarTarima() {
    claseUnaVez(document.getElementById("tarima"), "tiembla", 340);
    claseUnaVez(document.getElementById("zeus"), "tiembla", 340);
}

function puntoZeus(parte) {
    if (window.Zeus3D && typeof window.Zeus3D.punto === "function") return window.Zeus3D.punto(parte);
    return null;
}

/**
 * Efecto y sonido de cada contacto de un movimiento. `n` es el número de contacto (1, 2, …): el salto
 * suena distinto al despegar (1) que al caer (2), que es cuando retumba la tarima.
 */
/*
 * Qué se ve y se oye en cada contacto de un movimiento. Una entrada por comando:
 *   parte   dónde cae el efecto (Zeus3D.punto); "manos", "pies", "cabeza", "pieDerecho"…
 *   efecto  "estrellas" | "destello" | "ondas" | "notas" (lo dibuja la capa Phaser)
 *   sonido  "brillo" | "aplauso" | "zapateo" | "nota" (nota usa la del propio comando)
 *   tarima  true si además vibra el piso de la pista
 *   porGolpe opcional: distinto efecto en el 1.er y 2.º contacto (salto: despegue y caída)
 */
const EFECTOS = {
    cabeza: { parte: "cabeza", efecto: "estrellas", sonido: "brillo" },
    cintura: { parte: "centro", efecto: "destello", sonido: "nota" },
    pies: { parte: "pies", efecto: "destello", sonido: "nota" },
    aplaudir: { parte: "manos", efecto: "destello", sonido: "aplauso" },
    abrirBrazos: { parte: "manos", efecto: "destello", sonido: "brillo" },
    estirarse: { parte: "manos", efecto: "estrellas", sonido: "brillo" },
    brazoDerecho: { parte: "manos", efecto: "destello", sonido: "nota" },
    brazoIzquierdo: { parte: "manos", efecto: "destello", sonido: "nota" },
    pieDerecho: { parte: "pieDerecho", efecto: "notas", sonido: "nota" },
    pieIzquierdo: { parte: "pieIzquierdo", efecto: "notas", sonido: "nota" },
    zapatear: { parte: "pieDerecho", efecto: "ondas", sonido: "zapateo", tarima: true },
    saltar: {
        parte: "pies",
        porGolpe: [
            { efecto: "estrellas", sonido: "brillo", dy: -30 },
            { efecto: "ondas", sonido: "zapateo", tarima: true, dy: 6 }
        ]
    },
    saltarUnPie: {
        parte: "pies",
        porGolpe: [
            { efecto: "estrellas", sonido: "brillo", dy: -26 },
            { efecto: "ondas", sonido: "zapateo", tarima: true, dy: 6 }
        ]
    },
    girar: { parte: "centro", efecto: "notas", sonido: "brillo" },
    bailar: { parte: "manos", efecto: "notas", sonido: "nota" },
    marchar: { parte: "pies", efecto: "ondas", sonido: "zapateo", tarima: true }
};

function golpe(id, n) {
    const e = escena();
    const base = EFECTOS[id];
    if (!base) return;
    // los movimientos con dos fases (saltos) traen su propia receta por contacto
    const paso = base.porGolpe ? (base.porGolpe[Math.min(n, base.porGolpe.length) - 1] || base.porGolpe[0]) : base;
    const cfgAccion = accionCfg(id);

    if (paso.sonido === "nota") sfx("nota", cfgAccion.nota);
    else if (paso.sonido) sfx(paso.sonido);

    if (paso.tarima) vibrarTarima();

    const p = puntoZeus(base.parte) || puntoZeus("centro");
    if (!e || !p) return;
    const y = p.y + (paso.dy || 0);
    if (paso.efecto === "estrellas") e.estrellas(p.x, y);
    else if (paso.efecto === "ondas") e.ondas(p.x, y + 6);
    else if (paso.efecto === "notas") e.notas(p.x, y, cfgAccion.color);
    else if (paso.efecto === "destello") e.destello(p.x, y, cfgAccion.color);
}

/**
 * Zeus hace un movimiento (Zeus3D.hacer) durante `duracion` ms; en cada contacto suena y aparece su efecto.
 * Sin Zeus 3D igual se oyen y se ven los efectos en sus tiempos.
 */
let turnoLuz = 0;

function moverZeus(id, duracion) {
    const mio = ++turnoLuz;
    luz(id);
    const z = window.Zeus3D;
    const p = z && typeof z.hacer === "function"
        ? z.hacer(id, { ms: duracion, alGolpe: function (n) { golpe(id, n); } })
        : sleep(duracion);
    return p.then(function () {
        if (mio === turnoLuz) luz(null);
    });
}

// ------------------------------------------------------------------ carteles y botón central

let tCartel = null;

function mostrarCartel(titulo, sub, duracion) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
    document.getElementById("escenario-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("escenario-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.hidden = false;
    c.classList.remove("sale");
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
    if (duracion) tCartel = setTimeout(ocultarCartel, duracion);
}

function ocultarCartel() {
    const c = document.getElementById("escenario-cartel");
    if (!c || c.hidden) return;
    c.classList.add("sale");
    setTimeout(function () {
        c.hidden = true;
        c.classList.remove("sale");
    }, 380);
}

/** Botón grande al centro ("¡Empezar!"): lo único que hay que tocar antes de la demostración. */
function esperarBoton(texto, icono) {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = texto || "¡Empezar!";
    btn.querySelector("i").className = icono || "fa-solid fa-play";
    wrap.hidden = false;
    return new Promise(function (resolve) {
        const listo = function () {
            btn.removeEventListener("click", listo);
            sonarEvento("aparece");
            wrap.classList.add("sale");
            setTimeout(function () {
                wrap.hidden = true;
                wrap.classList.remove("sale");
                resolve();
            }, 350);
        };
        btn.addEventListener("click", listo);
    });
}

// ------------------------------------------------------------------ edad y arranque

function iniciarPartida() {
    PedniaEdad.iniciarNivel({
        niveles: gameConfig.niveles || [],
        elegirManual: elegirNivel,
        onElegido: function () {
            iniciarJuego();
        }
    });
}

function elegirNivel() {
    let botones = "";
    (gameConfig.niveles || []).forEach(function (nivel) {
        botones +=
            '<div class="col-12 text-center mb-2">' +
            '<button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
            "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
    });
    const titulo = textos().eligeNivel || "Elige tu edad";
    TextoVoz.hablar(titulo, "zoe");
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
}

function confirmarNivel(id) {
    const nivel = (gameConfig.niveles || []).find(function (n) { return String(n.id) === String(id); });
    Swal.close();
    if (!nivel) return;
    iniciarJuego();
}
window.confirmarNivel = confirmarNivel;

// ------------------------------------------------------------------ INTRODUCCIÓN

/**
 * El teatro se presenta: cartel con el título, Zoe saluda, Zeus explica "observa y repite" (la marquesina
 * muestra 1. OBSERVA → 2. REPITE) y presenta sus tres movimientos encendiendo cada botón. Al final, "¡Empezar!".
 */
async function presentar() {
    const id = partidaId;
    const t = textos();
    const completa = acc().mostrarIntro !== false;
    habilitarBotones(false);
    document.body.classList.add("intro-activa");
    fase("espera");
    mostrarPasos(true);
    pasoActivo("");
    mostrarCartel(t.tituloIntro, t.subtituloIntro);
    sonarEvento("aparece");
    if (zoe3d()) zoe3d().gesto("saluda");
    await sleep(2300);
    if (!vigente(id)) return;
    ocultarCartel();
    if (zeus3d()) zeus3d().gesto("saluda");
    await sleep(400);
    // "Mira bien lo que hago" → paso 1; "y luego repite" → paso 2
    const voz = decir(completa ? t.bienvenida : t.saludoCorto, "zeus");
    pasoActivo("observa");
    sleep(completa ? 4200 : 1500).then(function () { if (vigente(id)) pasoActivo("repite"); });
    await Promise.race([voz, sleep(completa ? 11000 : 4000)]);
    if (!vigente(id)) return;
    if (completa) {
        // Zeus enseña unos pocos tríos de movimientos: la botonera muestra uno, Zeus lo hace y luego cambia
        // al siguiente, así el niño ve desde el principio que los botones se renuevan. Con dieciséis
        // comandos no caben todos (serían más de 30 s antes de jugar): se muestran los tríos que pide
        // `config.intro.gruposPresentados`, empezando por el de la demo y siguiendo por el de lateralidad,
        // que es el que conviene reconocer antes de empezar.
        nube("zeus", t.presentaBotones || "", false);
        const visibles = ReglasSimon.visiblesDeConfig(gameConfig);
        const todas = ReglasSimon.accionesDeConfig(gameConfig);
        const intro = gameConfig.intro || {};
        const cuantosGrupos = Math.max(1, Number(intro.gruposPresentados) || 1);
        const grupos = [ReglasSimon.visiblesDemo(gameConfig)];
        const lateral = (intro.grupoLateralidad || []).filter(function (a) { return todas.indexOf(a) >= 0; });
        if (lateral.length === visibles) grupos.push(lateral);
        // si todavía faltan tríos, se completan con los movimientos que aún no se han enseñado
        const yaVistos = grupos.reduce(function (acc, g) { return acc.concat(g); }, []);
        const resto = todas.filter(function (a) { return yaVistos.indexOf(a) < 0; });
        while (grupos.length < cuantosGrupos && resto.length >= visibles) {
            grupos.push(resto.splice(0, visibles));
        }
        for (const grupo of grupos.slice(0, cuantosGrupos)) {
            if (!vigente(id)) return;
            await ponerBotones(grupo);
            if (!vigente(id)) return;
            for (const a of grupo) {
                if (!vigente(id)) return;
                iluminar(a, true);
                hablar(accionCfg(a).voz, "zeus");
                await moverZeus(a, 1500);
                iluminar(a, false);
                await sleep(250);
            }
        }
        nube("zeus", "");
        // la demo necesita ver cabeza y aplaudir
        await ponerBotones(ReglasSimon.visiblesDemo(gameConfig));
    }
    pasoActivo("");
}

// ------------------------------------------------------------------ DEMO automática

async function demostrar() {
    if (!window.SimonDemo) return;
    const id = partidaId;
    enDemo = true;
    ReglasSimon.pasar(st, ReglasSimon.E.DEMO);
    document.body.classList.add("demo-activa");
    habilitarBotones(false);
    mostrarPasos(false);
    const demoCfg = gameConfig.demo || {};
    const sec = (demoCfg.secuencia || ReglasSimon.DEMO).slice();
    armarRanuras(sec.length);
    limpiarRanuras();
    await window.SimonDemo.correr({
        secuencia: function () { return sec; },
        cancelado: function () { return !vigente(id); },
        texto: function (clave) { return textos()[clave] || ""; },
        decir: function (texto, quien) { return decir(texto, quien); },
        fase: fase,
        limpiarRanuras: limpiarRanuras,
        mostrar: function (s) {
            return mostrarSecuencia(s, {
                msMovimiento: demoCfg.msMovimiento || 2100,
                pausaMs: demoCfg.pausaMs || 900,
                apoyo: "alto",
                nombrar: true
            }, id);
        },
        puntoBoton: function (a) { return centroBoton(a); },
        pulsar: function (a) {
            // el botón responde igual que con el niño, pero no cuenta
            const b = boton(a);
            claseUnaVez(b, "presionado", 220);
            iluminar(a, true);
            sfx("seleccion");
            const n = document.querySelectorAll("#secuencia .ranura.con-dibujo").length + 1;
            ranuraDibujo(n, a);
            return moverZeus(a, ms("msRespuesta", 1250)).then(function () { iluminar(a, false); });
        },
        bien: function () {
            marcarRanuras("bien");
            cantarBotones(sec);
        },
        tuTurno: async function () {
            mostrarCartel(textos().tuTurno || "¡AHORA ES TU TURNO!", "");
            sonarEvento("correcto");
            await Promise.all([Promise.race([hablar(textos().tuTurnoVoz, "zoe"), sleep(3000)]), sleep(1800)]);
            ocultarCartel();
            await sleep(500);
        }
    });
    enDemo = false;
    document.body.classList.remove("demo-activa");
    apagarBotones();
    limpiarRanuras();
    callarNubes();
}

/** Arranque único (el selector de edad puede avisar más de una vez). */
async function iniciarJuego() {
    if (arrancado) return;
    arrancado = true;
    await fxListo;
    nuevaPartida();
    pintarProgreso();
    await presentar();
    const id = partidaId;
    await esperarBoton(textos().botonEmpezar || "¡Empezar!", "fa-solid fa-play");
    if (!vigente(id)) return;
    if (acc().mostrarIntro !== false) {
        await demostrar();
        if (!vigente(id)) return;
    }
    document.body.classList.remove("intro-activa");
    ReglasSimon.pasar(st, ReglasSimon.E.SHOWING_SEQUENCE);
    empezarRonda(true);
}

function nuevaPartida() {
    partidaId++;
    st = ReglasSimon.crear(gameConfig, Math.random);
    // para depurar y para las pruebas del navegador: el estado de la partida en curso
    window.__simon = function () { return st; };
    if (window.__SIMON_DEBUG__) window.__SIMON_DEBUG__.st = st;
}

// ------------------------------------------------------------------ OBSERVAR: Zeus muestra la secuencia

/**
 * Zeus hace los dos movimientos. Con apoyo "alto" el botón se ilumina y el dibujo queda en su ranura; con
 * "medio" el dibujo aparece solo mientras Zeus se mueve; con "bajo" solo se enciende el número de la ranura
 * (sin botón ni dibujo). `nombrar` dice el nombre de cada movimiento.
 */
async function mostrarSecuencia(sec, opciones, id) {
    const apoyo = opciones.apoyo || "alto";
    for (let i = 0; i < sec.length; i++) {
        if (!vigente(id)) return;
        const a = sec[i];
        const n = i + 1;
        ranuraActiva(n, true);
        if (apoyo === "bajo") ranuraLuz(n);
        else ranuraDibujo(n, a);
        if (apoyo !== "bajo") iluminar(a, true);
        if (opciones.nombrar) hablar(accionCfg(a).voz, "zeus");
        await moverZeus(a, opciones.msMovimiento || 1800);
        if (!vigente(id)) return;
        iluminar(a, false);
        ranuraActiva(n, false);
        if (apoyo === "medio") {
            const r = ranura(n);
            if (r) r.classList.remove("con-dibujo");
            ranuraLuz(n);
        }
        if (i < sec.length - 1) await sleep(opciones.pausaMs || 700);
    }
}

function opcionesRonda(reintento) {
    const r = rondaCfg();
    const op = {
        msMovimiento: Number(r.msMovimiento) || 1800,
        pausaMs: Number(r.pausaMs) || 700,
        apoyo: r.apoyo || "alto",
        nombrar: r.nombrar !== false
    };
    // tras dos errores en el mismo ítem, Zeus lo muestra con todo el apoyo (sin resolverlo)
    if (reintento && st.errores >= 2) {
        op.apoyo = "alto";
        op.nombrar = true;
        op.msMovimiento = Math.max(op.msMovimiento, 2000);
        op.pausaMs = Math.max(op.pausaMs, 900);
    }
    return op;
}

/** Ronda nueva (o la primera): cartel y voz de la ronda, y su primer ítem. */
async function empezarRonda(primera) {
    const id = partidaId;
    pintarProgreso();
    const r = rondaCfg();
    if (!primera || st.ronda > 0) {
        mostrarCartel(r.titulo || ("RONDA " + (st.ronda + 1)), r.nombre || "");
        sonarEvento("aparece");
        await Promise.all([Promise.race([hablar(r.instruccion, "zoe"), sleep(5000)]), sleep(1800)]);
        if (!vigente(id)) return;
        ocultarCartel();
        await sleep(400);
    }
    jugarItem(false);
}

/** Un ítem: OBSERVAR → REPETIR. `reintento` = la misma secuencia otra vez tras un error. */
async function jugarItem(reintento) {
    const id = partidaId;
    if (!st || st.estado !== ReglasSimon.E.SHOWING_SEQUENCE) return;
    limpiarAyuda();
    habilitarBotones(false);
    apagarBotones();
    limpiarRanuras();
    mostrarPasos(false);
    pintarProgreso();
    fase("observa");
    const sec = ReglasSimon.secuenciaActual(st);
    armarRanuras(sec.length);
    const t = textos();
    // los tres movimientos de este ítem entran en la botonera (los de antes salen con su animación)
    const cambian = ReglasSimon.conjunto(visiblesEnPantalla()) !== ReglasSimon.conjunto(ReglasSimon.visiblesActuales(st, gameConfig));
    if (cambian && !reintento) nube("zeus", t.cambioOpciones || "", false);
    await botonesDelItem();
    if (!vigente(id)) return;
    if (cambian && !reintento) await sleep(260);
    // la frase completa al empezar la ronda y en los reintentos; luego basta "¡Observa!". Cuando la secuencia
    // se alarga (2 → 3 → 4), Zeus lo anuncia: "¡Ahora son tres movimientos!"
    const previa = st.item > 0 ? (st.secuencias[st.ronda][st.item - 1] || []).length : sec.length;
    const crece = !reintento && st.item > 0 && sec.length > previa;
    const cuantosAhora = (t.cuantos && t.cuantos[String(sec.length)]) || String(sec.length);
    const frase = crece ? ReglasSimon.plantilla(t.cambioLargo, { cuantos: cuantosAhora })
        : (st.item === 0 || reintento) ? t.observa : (t.observaCorto || t.observa);
    if (crece) {
        mostrarCartel(ReglasSimon.plantilla(t.cambioLargo, { cuantos: cuantosAhora }).split("!")[0] + "!", "");
        setTimeout(ocultarCartel, 2200);
    }
    sfx("redoble");
    await Promise.race([decir(frase, "zeus"), sleep(4500)]);
    if (!vigente(id)) return;
    await sleep(250);
    nube("zeus", "");
    await mostrarSecuencia(sec, opcionesRonda(reintento), id);
    if (!vigente(id)) return;
    await sleep(rondaCfg().apoyo === "alto" ? 900 : 450);
    if (!vigente(id)) return;
    // REPETIR
    if (!ReglasSimon.pasar(st, ReglasSimon.E.WAITING_INPUT)) return;
    limpiarRanuras();
    fase("repite");
    habilitarBotones(true);
    sonarEvento("aparece", { vol: 0.5 });
    programarAyuda();
}

// ------------------------------------------------------------------ REPETIR: toques del niño

function alPulsar(idAccion) {
    if (enDemo || !st) return;
    if (st.estado !== ReglasSimon.E.WAITING_INPUT) return;
    // un solo toque no puede contar dos veces (doble toque involuntario)
    const ahora = performance.now();
    if (ahora - ultimoToque < ms("debounceMs", 420)) return;
    ultimoToque = ahora;
    const r = ReglasSimon.tocar(st, idAccion, gameConfig);
    if (!r.ok) return;
    limpiarAyuda();
    const id = partidaId;
    const b = boton(idAccion);
    claseUnaVez(b, "presionado", 200);
    iluminar(idAccion, true);
    setTimeout(function () { iluminar(idAccion, false); }, 700);
    sfx("seleccion");
    hablar(accionCfg(idAccion).voz, "zeus");
    ranuraDibujo(r.n, idAccion);
    ranuraActiva(r.n, true);
    setTimeout(function () { ranuraActiva(r.n, false); }, 500);
    movRespuesta = moverZeus(idAccion, ms("msRespuesta", 1250));
    if (r.completa) {
        habilitarBotones(false);
        comprobar(id, movRespuesta);
    } else {
        programarAyuda();
    }
}

// ------------------------------------------------------------------ COMPROBAR y feedback

async function comprobar(id, ultimoMovimiento) {
    await Promise.race([ultimoMovimiento, sleep(ms("msRespuesta", 1250) + 400)]);
    if (!vigente(id)) return;
    await sleep(ms("pausaAntesDeComprobarMs", 550));
    if (!vigente(id)) return;
    const c = ReglasSimon.comparar(st);
    if (!c) return;
    if (c.correcto) await acierto(c, id);
    else await error(c, id);
}

function cantarBotones(sec) {
    sec.forEach(function (a, i) {
        setTimeout(function () {
            const b = boton(a);
            claseUnaVez(b, "canta", 650);
            sfx("nota", accionCfg(a).nota);
            const p = centroBoton(a);
            if (fx() && p) fx().notas(p.x, p.rect.top + 10, accionCfg(a).color);
        }, i * 300);
    });
}

async function acierto(c, id) {
    marcarRanuras("bien");
    cantarBotones(c.secuencia);
    if (zeus3d()) zeus3d().gesto("celebra");
    const zona = document.getElementById("zeus");
    if (fx() && zona) fx().chispas(zona.getBoundingClientRect(), 16);
    pintarProgreso();
    animarProgreso();
    const t = textos();
    if (zoe3d()) zoe3d().gesto("celebra");
    await sleep(500);
    if (!vigente(id)) return;
    await Promise.race([decir(t.aciertoZoe, "zoe"), sleep(2200)]);
    if (!vigente(id)) return;
    const cuantos = (t.cuantos && t.cuantos[String(c.secuencia.length)]) || String(c.secuencia.length);
    await Promise.race([decir(ReglasSimon.plantilla(t.aciertoZeus, { cuantos: cuantos }), "zeus"), sleep(6500)]);
    if (!vigente(id)) return;
    const siguiente = ReglasSimon.avanzar(st, gameConfig);
    if (siguiente === "item") {
        await sleep(ms("pausaEntreItemsMs", 700));
        if (!vigente(id)) return;
        jugarItem(false);
    } else if (siguiente === "ronda") {
        transicionRonda(id);
    } else if (siguiente === "victoria") {
        victoria(id);
    }
}

/**
 * Error: el botón equivocado rebota, suena algo suave, Zeus hace un gesto amistoso y lo anima. Sin vidas ni
 * pérdida de progreso. Luego vuelve a mostrar la MISMA secuencia (repetirSecuenciaTrasError) y se reintenta.
 */
async function error(c, id) {
    const malo = c.respuesta[c.primerError];
    claseUnaVez(boton(malo), "rebote", 600);
    marcarRanuras("mal", c.primerError + 1);
    sfx("suave");
    if (zeus3d()) zeus3d().gesto("amistoso");
    await Promise.race([decir(textos().errorZeus, "zeus"), sleep(6000)]);
    if (!vigente(id)) return;
    await sleep(300);
    const repetir = cfgJuego().repetirSecuenciaTrasError !== false;
    if (!ReglasSimon.reintentar(st, repetir)) return;
    if (repetir) {
        jugarItem(true);
    } else {
        limpiarRanuras();
        fase("repite");
        habilitarBotones(true);
        programarAyuda();
    }
}

/** Ronda completada (no la última): festejo, "¡RONDA n COMPLETADA!" y la ronda siguiente sola. */
async function transicionRonda(id) {
    limpiarAyuda();
    habilitarBotones(false);
    fase("espera");
    sfx("fanfarria");
    sonarEvento("correcto");
    if (fx()) fx().confeti(2400);
    if (zeus3d()) zeus3d().hacer("brazos", { ms: 1600 });
    if (zoe3d()) zoe3d().gesto("celebra");
    document.body.classList.add("fiesta");
    mostrarCartel(ReglasSimon.plantilla(textos().rondaListaTitulo || "¡RONDA {n} COMPLETADA!", { n: st.ronda + 1 }), "");
    await Promise.all([Promise.race([decir(textos().rondaLista, "zoe"), sleep(6000)]), sleep(2500)]);
    document.body.classList.remove("fiesta");
    if (!vigente(id)) return;
    ocultarCartel();
    await sleep(500);
    if (!vigente(id)) return;
    if (!ReglasSimon.siguienteRonda(st, gameConfig)) return;
    empezarRonda(false);
}

// ------------------------------------------------------------------ ayuda (sin revelar la respuesta)

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    ayuda.token++;
}

/** Si el niño tarda, Zoe le recuerda observar el orden y los tres botones se menean (no se marca ninguno). */
function programarAyuda(repeticion) {
    limpiarAyuda();
    ayuda.veces = repeticion ? (ayuda.veces || 0) : 0;
    if (ayuda.veces >= ms("ayudasMax", 3)) return;
    if (!st || st.estado !== ReglasSimon.E.WAITING_INPUT) return;
    const token = ayuda.token;
    const id = partidaId;
    ayuda.t = setTimeout(function () {
        if (token !== ayuda.token || !vigente(id) || !st || st.estado !== ReglasSimon.E.WAITING_INPUT) return;
        ayuda.veces++;
        if (acc().ayudaAutomatica) {
            document.querySelectorAll(".accion").forEach(function (b) { claseUnaVez(b, "menea", 1900); });
        }
        if (zoe3d()) zoe3d().gesto("senala");
        decir(textos().ayudaZoe, "zoe");
        ayuda.t = setTimeout(function () {
            if (token !== ayuda.token) return;
            programarAyuda(true);
        }, ms("ayudaRepetirMs", 14000));
    }, ms("ayudaMs", 12000));
}

// ------------------------------------------------------------------ VICTORIA

async function victoria(id) {
    limpiarAyuda();
    habilitarBotones(false);
    fase("espera");
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("fiesta");
    sfx("fanfarria");
    sonarEvento("correcto");
    const e = fx();
    const lluvia = function () {
        if (!e) return;
        e.confeti(3200);
        e.lluviaEstrellas(3000);
    };
    lluvia();
    if (zeus3d()) zeus3d().gesto("baila");
    if (zoe3d()) zoe3d().gesto("final");
    mostrarCartel(textos().finalTitulo || "¡ERES UN CAMPEÓN DE LA MEMORIA CORPORAL!", "");
    await Promise.race([decir(textos().finalZoe, "zoe"), sleep(7000)]);
    if (!vigente(id)) return;
    lluvia();
    if (zeus3d()) zeus3d().hacer("brazos", { ms: 1800 });
    await Promise.race([decir(textos().finalZeus, "zeus"), sleep(5000)]);
    if (!vigente(id)) return;
    ocultarCartel();
    if (zeus3d()) zeus3d().gesto("baila");
    mostrarFelicitacion();
}

function mostrarFelicitacion() {
    const caja = document.getElementById("felicitacion");
    if (!caja) return;
    const t = textos();
    document.getElementById("felicitacion-titulo").textContent = t.finalTitulo || "¡ERES UN CAMPEÓN DE LA MEMORIA CORPORAL!";
    document.getElementById("felicitacion-sub").textContent = t.finalSub || "";
    document.querySelector("#btn-otra-vez span").textContent = t.botonOtraVez || "VOLVER A JUGAR";
    document.querySelector("#btn-continuar span").textContent = t.botonContinuar || "CONTINUAR";
    const dib = document.getElementById("felicitacion-dibujos");
    if (dib) {
        dib.innerHTML = "";
        ReglasSimon.accionesDeConfig(gameConfig).forEach(function (a) {
            const s = document.createElement("span");
            s.innerHTML = IconosSimon.svg(a);
            dib.appendChild(s);
        });
    }
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    caja.hidden = false;
    const btn = document.getElementById("btn-continuar");
    if (btn) setTimeout(function () { btn.focus({ preventScroll: true }); }, 300);
}

function ocultarFelicitacion() {
    const caja = document.getElementById("felicitacion");
    if (caja) caja.hidden = true;
}

/** Corta todo lo pendiente: temporizadores, voces, movimientos de Zeus, efectos y la mano de la demo. */
function cortarTodo() {
    partidaId++;
    cancelarTimers();
    limpiarAyuda();
    if (TextoVoz.detener) TextoVoz.detener();
    if (window.Zeus3D && window.Zeus3D.detener) window.Zeus3D.detener();
    if (fx()) fx().limpiar();
    if (window.SimonDemo) window.SimonDemo.quitarMano();
    enDemo = false;
    document.body.classList.remove("demo-activa", "intro-activa", "fiesta", "fase-observa");
    habilitarBotones(false);
    apagarBotones();
    limpiarRanuras();
    callarNubes();
    ocultarCartel();
    luz(null);
}

/** "VOLVER A JUGAR": progreso a cero, secuencias nuevas y otra vez las tres rondas (la demo sigue fija). */
async function volverAJugar() {
    ocultarFelicitacion();
    cortarTodo();
    nuevaPartida();
    armarProgreso();
    pintarProgreso();
    const id = partidaId;
    sonarEvento("aparece");
    await Promise.race([decir(textos().otraVez, "zoe", "saluda"), sleep(4000)]);
    if (!vigente(id)) return;
    ReglasSimon.pasar(st, ReglasSimon.E.SHOWING_SEQUENCE);
    empezarRonda(true);
}

/** "CONTINUAR": victoria compartida (../../final). */
function continuar() {
    ocultarFelicitacion();
    cortarTodo();
    const cierre = textos().cierre || "";
    if (feedbackActivo()) hablar(cierre);
    const caja = document.getElementById("final");
    const texto = document.getElementById("texto_final");
    if (texto) texto.textContent = cierre;
    if (caja) {
        caja.hidden = false;
        caja.style.display = "block";
    }
    if (typeof iniciarSecuenciaVictoria === "function") {
        iniciarSecuenciaVictoria();
    } else if (typeof iniciarVictoria === "function") {
        iniciarVictoria();
    }
}

// ------------------------------------------------------------------ arranque

let fxListo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261113h"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    const problemas = ReglasSimon.revisarJuego(gameConfig);
    if (problemas.length) console.warn("[SimonDice] config.json:", problemas);
    sincronizarDialogoIntro3d();
    armarBotones();
    armarProgreso();
    aplicarAccesibilidadInicial();
    if (window.speechSynthesis) {
        try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
    }
    if (sonido()) sonido().usarTema(gameConfig.audios && gameConfig.audios.tema);
    TextoVoz.iniciar(gameConfig, introConfig, {
        obtenerAudioFondo: function () { return audioFondo; },
        volumenFondo: volumenFondoPct() / 100
    });
    enlazarMenus();
    window.addEventListener("pagehide", function () {
        cancelarTimers();
        TextoVoz.vaciar();
    });

    // capa de efectos desde el principio (detrás de la intro)
    if (window.EscenarioSimon) fxListo = window.EscenarioSimon.montar(document.getElementById("efectos-phaser"));

    const btnEmpecemos = document.getElementById("btn-empecemos");
    if (btnEmpecemos) btnEmpecemos.addEventListener("click", empecemosJuego);
    const btnOmitirIntro = document.getElementById("btn-omitir-intro3d");
    if (btnOmitirIntro) btnOmitirIntro.addEventListener("click", omitirIntro3d);
    const btnContinuarIntro = document.getElementById("btn-continuar-intro3d");
    if (btnContinuarIntro) {
        btnContinuarIntro.addEventListener("click", function (ev) {
            ev.preventDefault();
            empezarJuegoTrasIntro();
        });
    }
    const btnOtra = document.getElementById("btn-otra-vez");
    if (btnOtra) btnOtra.addEventListener("click", volverAJugar);
    const btnSeguir = document.getElementById("btn-continuar");
    if (btnSeguir) btnSeguir.addEventListener("click", continuar);
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
