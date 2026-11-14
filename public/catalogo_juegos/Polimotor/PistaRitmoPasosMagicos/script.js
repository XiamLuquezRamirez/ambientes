/**
 * ¡La Pista de Ritmo y Pasos Mágicos! — control del juego (Polimotor, Prejardín 3-4 años, juegos de memoria
 * corporal, juego 3).
 *
 * Flujo: pantalla de inicio → intro 3D compartida (Zeus y Zoe) → PedniaEdad → INTRODUCCIÓN en la pista musical
 * (título, Zoe saluda y explica "escucha y repite", presenta las seis baldosas) → botón "¡Encender la pista!"
 * → DEMO automática (pie → mano, la mano toca las baldosas en orden) → "¡AHORA ES TU TURNO!" → 2 RONDAS de
 * 4 ÍTEMS (8 en total): ronda 1 con dos baldosas y ronda 2 con tres → VICTORIA
 * ("¡ERES EL MAESTRO DEL RITMO!", Volver a jugar / Continuar).
 *
 * Cada ítem: ESCUCHAR Y OBSERVAR (baldosas bloqueadas; la pista enciende la secuencia con su sonido) →
 * REPETIR EL RITMO (el niño toca las baldosas) → COMPROBAR (mismo orden) → acierto (las baldosas cantan,
 * serpentinas, luces de fiesta, progreso, avanza solo) o error (vibración amable, la pista vuelve a tocar
 * la MISMA secuencia y se reintenta; sin vidas).
 *
 * Seis baldosas: pie (azul, ¡BUM!), mano (roja, ¡TING!), carita (amarilla, ¡PLIM!), rodilla (verde, ¡TOC!),
 * hombro (morada, ¡CHIS!) y barriga (naranja, ¡POP!). Dificultad por ronda (config.rondas): número de
 * baldosas de la secuencia, velocidad de encendido, pausa entre sonidos y apoyos visuales.
 *
 * Estados (reglas.js): INTRO, DEMO, SHOWING_SEQUENCE, WAITING_INPUT, CHECKING_ANSWER, CORRECT_FEEDBACK,
 * INCORRECT_FEEDBACK, ROUND_TRANSITION, VICTORY. Solo WAITING_INPUT acepta toques. Cada partida lleva un
 * número (partidaId): lo que termina después de un reinicio no toca la partida nueva, y los temporizadores
 * se cancelan.
 *
 * Módulos: ReglasPista (puro) · IconosPista (dibujos de las baldosas) · SonidosPista (Web Audio) ·
 * EscenarioPista (Phaser 4: ondas, estrellas, notas, serpentinas, confeti) · PistaDemo (demostración) ·
 * Zoe3D (Zoe bailando en la pista).
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let arrancado = false;
let st = null;               // estado de la partida (ReglasPista.crear)
let partidaId = 0;
let enDemo = false;
let efectosOn = true;
let ultimoToque = 0;
const ayuda = { t: null, token: 0, veces: 0 };

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
    if (window.SonidosPista && typeof window.SonidosPista[nombre] === "function") window.SonidosPista[nombre](arg);
}

/** Sonido característico de una baldosa (config.acciones[i].sonido: "tambor", "campana", …). */
function sonidoBaldosa(id) {
    if (!efectosOn) return;
    if (window.SonidosPista) window.SonidosPista.baldosa(accionCfg(id).sonido);
}

function fx() {
    return window.EscenarioPista && window.EscenarioPista.listo() ? window.EscenarioPista : null;
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
    return ReglasPista.accion(gameConfig, id) || { id: id, nombre: id, voz: id };
}

function rondaCfg() {
    return ReglasPista.ronda(gameConfig, st ? st.ronda : 0);
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

/** Habla Zoe (o Zeus) con su nube; la nube se va al terminar la voz. */
function decir(texto, quien, gesto) {
    quien = quien === "zeus" ? "zeus" : "zoe";
    const pj = quien === "zoe" ? zoe3d() : null;
    if (gesto && pj) pj.gesto(gesto);
    if (!texto) return Promise.resolve();
    if (!feedbackActivo() || typeof TextoVoz === "undefined") {
        nube(quien, texto, false);
        return sleep(Math.min(3500, 900 + String(texto).length * 35));
    }
    nube(quien, texto, true);
    if (pj && pj.hablar) pj.hablar(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (pj && pj.hablar) pj.hablar(false);
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
    { key: "ayudaAutomatica", label: "Ayuda visual (las baldosas se menean)" },
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
    ReglasPista.rondas(gameConfig).forEach(function (r, i) {
        const g = document.createElement("div");
        g.className = "grupo";
        g.dataset.ronda = String(i);
        g.innerHTML = '<span class="grupo-r">R' + (i + 1) + "</span>";
        for (let k = 0; k < ReglasPista.itemsDeRonda(gameConfig, i); k++) {
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
    const p = ReglasPista.progreso(st, gameConfig);
    const t = textos();
    const ron = document.getElementById("progreso-ronda");
    // con una sola ronda no se muestra "RONDA 1 DE 1" ni la etiqueta del grupo
    if (ron) ron.hidden = p.rondas < 2;
    document.querySelectorAll("#progreso-grupos .grupo-r").forEach(function (g) { g.hidden = p.rondas < 2; });
    if (ron) ron.textContent = (t.ronda || "RONDA") + " " + p.ronda + " " + (t.de || "DE") + " " + p.rondas;
    pintarEstrellas();
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
        g.classList.toggle("hecha", !!(st && st.hechos[r] && st.hechos[r].filter(Boolean).length === ReglasPista.itemsDeRonda(gameConfig, r)));
        g.querySelectorAll(".punto").forEach(function (punto) {
            const k = Number(punto.dataset.item);
            const hecho = !!(st && st.hechos[r] && st.hechos[r][k]);
            punto.classList.toggle("hecho", hecho);
            punto.classList.toggle("actual", !hecho && !!st && r === st.ronda && k === st.item && st.estado !== "INTRO");
        });
    });
}

/** Estrellas de la ronda actual: una por ítem. Se enciende al completarlo y se apaga al cambiar de ronda. */
function pintarEstrellas() {
    const caja = document.getElementById("progreso-estrellas");
    if (!caja || !gameConfig) return;
    const n = ReglasPista.itemsDeRonda(gameConfig, st ? st.ronda : 0);
    if (caja.children.length !== n) {
        caja.replaceChildren();
        for (let i = 0; i < n; i++) {
            const s = document.createElement("i");
            s.className = "fa-solid fa-star progreso-estrella";
            s.setAttribute("aria-hidden", "true");
            caja.appendChild(s);
        }
    }
    const hechos = (st && st.hechos && st.hechos[st.ronda]) || [];
    let hechas = 0;
    caja.querySelectorAll(".progreso-estrella").forEach(function (s, i) {
        const hecha = !!hechos[i];
        if (hecha) hechas++;
        const ya = s.classList.contains("encendida");
        s.classList.toggle("encendida", hecha);
        if (hecha && !ya) {
            s.classList.remove("enciende");
            void s.offsetWidth;
            s.classList.add("enciende");
        }
        if (!hecha) s.classList.remove("enciende");
    });
    caja.setAttribute("aria-label", hechas + " de " + n + " ítems");
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
    txt.textContent = tipo === "observa" ? (textos().faseObserva || "¡ESCUCHA Y MIRA!")
        : tipo === "repite" ? (textos().faseRepite || "¡REPITE EL RITMO!")
            : "¡A BAILAR!";
    document.body.classList.toggle("fase-observa", tipo === "observa");
}

/** La marquesina muestra tantas ranuras como baldosas tenga la secuencia (2, 3 o 4), con flechas. */
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
    if (img) img.src = IconosPista.dataUri(id);
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

// ------------------------------------------------------------------ las seis baldosas

function baldosa(id) {
    return document.querySelector('.baldosa[data-accion="' + id + '"]');
}

function armarBaldosas() {
    const pista = document.getElementById("pista");
    if (!pista) return;
    pista.innerHTML = "";
    ReglasPista.ACCIONES.forEach(function (id, i) {
        const a = accionCfg(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "baldosa baldosa-" + id;
        b.dataset.accion = id;
        b.disabled = true;
        b.style.setProperty("--col", a.color || "#fff");
        b.style.setProperty("--col-claro", a.colorClaro || a.color || "#fff");
        b.style.setProperty("--i", String(i));
        b.setAttribute("aria-label", a.nombre);
        b.innerHTML =
            '<span class="baldosa-num">' + (i + 1) + "</span>" +
            '<span class="baldosa-luz" aria-hidden="true"></span>' +
            '<span class="baldosa-dibujo">' + IconosPista.svg(id) + "</span>" +
            '<span class="baldosa-nombre">' + a.nombre + "</span>" +
            '<span class="baldosa-efecto" aria-hidden="true">' + (a.efecto || "") + "</span>";
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
        pista.appendChild(b);
    });
}

function habilitarBaldosas(si) {
    document.querySelectorAll(".baldosa").forEach(function (b) { b.disabled = !si; });
    document.body.classList.toggle("juego-bloqueado", !si);
}

function iluminar(id, si) {
    const b = baldosa(id);
    if (b) b.classList.toggle("encendida", !!si);
}

function apagarBaldosas() {
    document.querySelectorAll(".baldosa").forEach(function (b) {
        b.classList.remove("encendida", "presionada", "vibra", "canta", "menea");
    });
}

function claseUnaVez(el, clase, duracion) {
    if (!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, duracion || 600);
}

function rectBaldosa(id) {
    const b = baldosa(id);
    return b ? b.getBoundingClientRect() : null;
}

function centroBaldosa(id) {
    const r = rectBaldosa(id);
    if (!r) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

// ------------------------------------------------------------------ encender una baldosa (luz, sonido y efecto)

/** El color de la baldosa tiñe los reflectores de la pista mientras suena. */
let turnoLuz = 0;

function luz(id) {
    const raiz = document.documentElement;
    if (!id) {
        raiz.style.removeProperty("--luz");
        raiz.style.removeProperty("--haz-a");
        raiz.style.removeProperty("--haz-b");
        return;
    }
    const a = accionCfg(id);
    raiz.style.setProperty("--luz", a.colorClaro || a.color || "#fff3bf");
    raiz.style.setProperty("--haz-a", a.colorClaro || "#fff3bf");
    raiz.style.setProperty("--haz-b", a.color || "#ffd6f0");
}

function vibrarPista() {
    claseUnaVez(document.getElementById("pista"), "tiembla", 320);
}

/** Efecto Phaser propio de cada baldosa, sobre su rectángulo. */
function efectoBaldosa(id) {
    const e = fx();
    const r = rectBaldosa(id);
    if (!e || !r) return;
    const a = accionCfg(id);
    e.ondaBaldosa(r, a.colorClaro || a.color);
    if (id === "pie" || id === "rodilla") {
        e.golpeSuelo(r, a.colorClaro || a.color);
        vibrarPista();
    } else if (id === "mano" || id === "carita") {
        e.estrellitas(r, a.colorClaro || a.color);
    } else {
        e.chispitas(r, a.colorClaro || a.color);
    }
}

/**
 * La baldosa `id` se enciende durante `duracion` ms: luz de la pista, sonido característico, el dibujo se
 * mueve y sale su efecto. Devuelve una Promise que se cumple al apagarse.
 */
function encender(id, duracion) {
    const mio = ++turnoLuz;
    luz(id);
    const b = baldosa(id);
    iluminar(id, true);
    claseUnaVez(b, "presionada", Math.min(320, duracion));
    sonidoBaldosa(id);
    efectoBaldosa(id);
    return sleep(duracion).then(function () {
        iluminar(id, false);
        if (mio === turnoLuz) luz(null);
    });
}

/** Las seis baldosas se encienden a la vez un momento (fin de la demo y celebraciones). */
function brillarTodas(duracion) {
    ReglasPista.ACCIONES.forEach(function (id, i) {
        setTimeout(function () {
            iluminar(id, true);
            sonidoBaldosa(id);
            const e = fx();
            const r = rectBaldosa(id);
            if (e && r) e.ondaBaldosa(r, accionCfg(id).colorClaro || accionCfg(id).color);
            setTimeout(function () { iluminar(id, false); }, 420);
        }, i * 110);
    });
    return sleep((duracion || 1200));
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

/** Botón grande al centro ("¡Encender la pista!"): lo único que hay que tocar antes de la demostración. */
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
 * La pista se presenta: cartel con el título, Zoe entra a la pista y explica "escucha y repite" (la
 * marquesina muestra 1. ESCUCHA → 2. REPITE) y presenta las seis baldosas encendiendo cada una con su
 * sonido. Al final, "¡Encender la pista!".
 */
async function presentar() {
    const id = partidaId;
    const t = textos();
    const completa = acc().mostrarIntro !== false;
    habilitarBaldosas(false);
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
    await sleep(400);
    // "Escucha y mira cuáles baldosas se iluminan" → paso 1; "y tócalas en el mismo orden" → paso 2
    const voz = decir(completa ? t.bienvenida : t.saludoCorto, "zoe");
    pasoActivo("observa");
    sleep(completa ? 4600 : 1500).then(function () { if (vigente(id)) pasoActivo("repite"); });
    await Promise.race([voz, sleep(completa ? 12000 : 4000)]);
    if (!vigente(id)) return;
    if (completa) {
        // las seis baldosas, una por una, con su nombre y su sonido
        nube("zoe", t.presentaBotones || "", false);
        for (const a of ReglasPista.ACCIONES) {
            if (!vigente(id)) return;
            hablar(accionCfg(a).voz, "zoe");
            await encender(a, 780);
            if (!vigente(id)) return;
            await sleep(180);
        }
        nube("zoe", "");
    }
    pasoActivo("");
}

// ------------------------------------------------------------------ DEMO automática

async function demostrar() {
    if (!window.PistaDemo) return;
    const id = partidaId;
    enDemo = true;
    ReglasPista.pasar(st, ReglasPista.E.DEMO);
    document.body.classList.add("demo-activa");
    habilitarBaldosas(false);
    mostrarPasos(false);
    const demoCfg = gameConfig.demo || {};
    const sec = (demoCfg.secuencia || ReglasPista.DEMO).slice();
    armarRanuras(sec.length);
    limpiarRanuras();
    await window.PistaDemo.correr({
        secuencia: function () { return sec; },
        cancelado: function () { return !vigente(id); },
        texto: function (clave) { return textos()[clave] || ""; },
        decir: function (texto, quien) { return decir(texto, quien); },
        fase: fase,
        limpiarRanuras: limpiarRanuras,
        mostrar: function (s) {
            return mostrarSecuencia(s, {
                msBaldosa: demoCfg.msBaldosa || 1250,
                pausaMs: demoCfg.pausaMs || 900,
                apoyo: "alto",
                nombrar: true
            }, id);
        },
        puntoBaldosa: function (a) { return centroBaldosa(a); },
        pulsar: function (a) {
            // la baldosa responde igual que con el niño, pero no cuenta
            const n = document.querySelectorAll("#secuencia .ranura.con-dibujo").length + 1;
            ranuraDibujo(n, a);
            sfx("seleccion");
            return encender(a, ms("msRespuesta", 620));
        },
        bien: function () {
            marcarRanuras("bien");
            cantarBaldosas(sec);
        },
        todasBrillan: function () { return brillarTodas(1200); },
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
    apagarBaldosas();
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
    await esperarBoton(textos().botonEmpezar || "¡Encender la pista!", "fa-solid fa-music");
    if (!vigente(id)) return;
    if (acc().mostrarIntro !== false) {
        await demostrar();
        if (!vigente(id)) return;
    }
    document.body.classList.remove("intro-activa");
    ReglasPista.pasar(st, ReglasPista.E.SHOWING_SEQUENCE);
    empezarRonda(true);
}

function nuevaPartida() {
    partidaId++;
    st = ReglasPista.crear(gameConfig, Math.random);
    if (window.__PISTA_DEBUG__) window.__PISTA_DEBUG__.st = st;
}

// ------------------------------------------------------------------ FASE A: ESCUCHAR Y OBSERVAR

/**
 * La pista enciende la secuencia. Con apoyo "alto" el dibujo queda en su ranura; con "medio" el dibujo
 * aparece solo mientras la baldosa está encendida; con "bajo" solo se enciende el número de la ranura.
 * `nombrar` dice el nombre de cada baldosa.
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
        if (opciones.nombrar) hablar(accionCfg(a).voz, "zoe");
        await encender(a, opciones.msBaldosa || 1000);
        if (!vigente(id)) return;
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
        msBaldosa: Number(r.msBaldosa) || 1000,
        pausaMs: Number(r.pausaMs) || 700,
        apoyo: r.apoyo || "alto",
        nombrar: r.nombrar !== false
    };
    // tras dos errores en el mismo ítem, la pista lo muestra con todo el apoyo (sin resolverlo)
    if (reintento && st.errores >= 2) {
        op.apoyo = "alto";
        op.nombrar = true;
        op.msBaldosa = Math.max(op.msBaldosa, 1150);
        op.pausaMs = Math.max(op.pausaMs, 850);
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
        await Promise.all([Promise.race([hablar(r.instruccion, "zoe"), sleep(6000)]), sleep(1800)]);
        if (!vigente(id)) return;
        ocultarCartel();
        await sleep(400);
    }
    jugarItem(false);
}

/** Un ítem: ESCUCHAR Y OBSERVAR → REPETIR EL RITMO. `reintento` = la misma secuencia tras un error. */
async function jugarItem(reintento) {
    const id = partidaId;
    if (!st || st.estado !== ReglasPista.E.SHOWING_SEQUENCE) return;
    limpiarAyuda();
    habilitarBaldosas(false);
    apagarBaldosas();
    limpiarRanuras();
    mostrarPasos(false);
    pintarProgreso();
    fase("observa");
    const sec = ReglasPista.secuenciaActual(st);
    armarRanuras(sec.length);
    const t = textos();
    // la frase completa al empezar la ronda y en los reintentos; luego basta "¡Escucha!"
    const frase = (st.item === 0 || reintento) ? t.observa : (t.observaCorto || t.observa);
    sfx("cuentaAtras");
    await Promise.race([decir(frase, "zoe"), sleep(4500)]);
    if (!vigente(id)) return;
    await sleep(250);
    nube("zoe", "");
    await mostrarSecuencia(sec, opcionesRonda(reintento), id);
    if (!vigente(id)) return;
    await sleep(rondaCfg().apoyo === "alto" ? 700 : 400);
    if (!vigente(id)) return;
    // FASE B: REPETIR EL RITMO
    if (!ReglasPista.pasar(st, ReglasPista.E.WAITING_INPUT)) return;
    limpiarRanuras();
    fase("repite");
    habilitarBaldosas(true);
    sonarEvento("aparece", { vol: 0.5 });
    programarAyuda();
}

// ------------------------------------------------------------------ FASE B: toques del niño

function alPulsar(idAccion) {
    if (enDemo || !st) return;
    if (st.estado !== ReglasPista.E.WAITING_INPUT) return;
    // un solo toque no puede contar dos veces (doble toque involuntario)
    const ahora = performance.now();
    if (ahora - ultimoToque < ms("debounceMs", 300)) return;
    ultimoToque = ahora;
    const r = ReglasPista.tocar(st, idAccion);
    if (!r.ok) return;
    limpiarAyuda();
    const id = partidaId;
    sfx("seleccion");
    ranuraDibujo(r.n, idAccion);
    ranuraActiva(r.n, true);
    setTimeout(function () { ranuraActiva(r.n, false); }, 500);
    const toque = encender(idAccion, ms("msRespuesta", 620));
    if (r.completa) {
        habilitarBaldosas(false);
        comprobar(id, toque);
    } else {
        programarAyuda();
    }
}

// ------------------------------------------------------------------ FASE C: COMPROBAR y feedback

async function comprobar(id, ultimoToque) {
    await Promise.race([ultimoToque, sleep(ms("msRespuesta", 620) + 400)]);
    if (!vigente(id)) return;
    await sleep(ms("pausaAntesDeComprobarMs", 520));
    if (!vigente(id)) return;
    const c = ReglasPista.comparar(st);
    if (!c) return;
    if (c.correcto) await acierto(c, id);
    else await error(c, id);
}

/** Las baldosas de la secuencia "cantan" su nota con notas musicales que suben. */
function cantarBaldosas(sec) {
    sec.forEach(function (a, i) {
        setTimeout(function () {
            const b = baldosa(a);
            claseUnaVez(b, "canta", 650);
            iluminar(a, true);
            setTimeout(function () { iluminar(a, false); }, 420);
            sfx("nota", accionCfg(a).nota);
            const p = centroBaldosa(a);
            if (fx() && p) fx().notas(p.x, p.rect.top + 10, accionCfg(a).color);
        }, i * 280);
    });
}

async function acierto(c, id) {
    marcarRanuras("bien");
    cantarBaldosas(c.secuencia);
    document.body.classList.add("fiesta");
    sfx("fiesta");
    if (zoe3d()) zoe3d().gesto("celebra");
    const e = fx();
    if (e) {
        e.serpentinas(1800);
        c.secuencia.forEach(function (a) {
            const r = rectBaldosa(a);
            if (r) e.chispas(r, 10);
        });
    }
    pintarProgreso();
    animarProgreso();
    const t = textos();
    await sleep(600);
    if (!vigente(id)) return;
    document.body.classList.remove("fiesta");
    await Promise.race([decir(t.aciertoZoe, "zoe"), sleep(2200)]);
    if (!vigente(id)) return;
    const cuantos = (t.cuantos && t.cuantos[String(c.secuencia.length)]) || String(c.secuencia.length);
    await Promise.race([decir(ReglasPista.plantilla(t.aciertoZeus, { cuantos: cuantos }), "zoe"), sleep(7000)]);
    if (!vigente(id)) return;
    const siguiente = ReglasPista.avanzar(st, gameConfig);
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
 * Error: la baldosa equivocada vibra, la línea de luz se desvanece, suena algo suave y Zoe anima. Sin vidas
 * ni pérdida de progreso. Luego la pista vuelve a tocar la MISMA secuencia y se reintenta.
 */
async function error(c, id) {
    const malo = c.respuesta[c.primerError];
    claseUnaVez(baldosa(malo), "vibra", 600);
    marcarRanuras("mal", c.primerError + 1);
    sfx("suave");
    if (zoe3d()) zoe3d().gesto("duda");
    await Promise.race([decir(textos().errorZeus, "zoe"), sleep(6000)]);
    if (!vigente(id)) return;
    await sleep(300);
    const repetir = cfgJuego().repetirSecuenciaTrasError !== false;
    if (!ReglasPista.reintentar(st, repetir)) return;
    if (repetir) {
        jugarItem(true);
    } else {
        limpiarRanuras();
        fase("repite");
        habilitarBaldosas(true);
        programarAyuda();
    }
}

/** Ronda completada (no la última): fiesta en la pista, "¡RONDA n COMPLETADA!" y la siguiente sola. */
async function transicionRonda(id) {
    limpiarAyuda();
    habilitarBaldosas(false);
    fase("espera");
    sfx("fanfarria");
    sonarEvento("correcto");
    if (fx()) {
        fx().confeti(2400);
        fx().serpentinas(2400);
    }
    brillarTodas(900);
    if (zoe3d()) zoe3d().gesto("celebra");
    document.body.classList.add("fiesta");
    mostrarCartel(ReglasPista.plantilla(textos().rondaListaTitulo || "¡RONDA {n} COMPLETADA!", { n: st.ronda + 1 }), "");
    await Promise.all([Promise.race([decir(textos().rondaLista, "zoe"), sleep(6000)]), sleep(2500)]);
    document.body.classList.remove("fiesta");
    if (!vigente(id)) return;
    ocultarCartel();
    await sleep(500);
    if (!vigente(id)) return;
    if (!ReglasPista.siguienteRonda(st, gameConfig)) return;
    empezarRonda(false);
}

// ------------------------------------------------------------------ ayuda (sin revelar la respuesta)

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    ayuda.token++;
}

/** Si el niño tarda, Zoe le recuerda los sonidos y las baldosas se menean (no se marca ninguna). */
function programarAyuda(repeticion) {
    limpiarAyuda();
    ayuda.veces = repeticion ? (ayuda.veces || 0) : 0;
    if (ayuda.veces >= ms("ayudasMax", 3)) return;
    if (!st || st.estado !== ReglasPista.E.WAITING_INPUT) return;
    const token = ayuda.token;
    const id = partidaId;
    ayuda.t = setTimeout(function () {
        if (token !== ayuda.token || !vigente(id) || !st || st.estado !== ReglasPista.E.WAITING_INPUT) return;
        ayuda.veces++;
        if (acc().ayudaAutomatica) {
            document.querySelectorAll(".baldosa").forEach(function (b) { claseUnaVez(b, "menea", 1900); });
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
    habilitarBaldosas(false);
    fase("espera");
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("fiesta");
    sfx("fanfarria");
    sonarEvento("correcto");
    const e = fx();
    const lluvia = function () {
        if (!e) return;
        e.confeti(3200);
        e.serpentinas(3000);
        e.lluviaEstrellas(3000);
    };
    lluvia();
    brillarTodas(1400);
    if (zoe3d()) zoe3d().gesto("final");
    mostrarCartel(textos().finalTitulo || "¡ERES EL MAESTRO DEL RITMO!", "");
    await Promise.race([decir(textos().finalZoe, "zoe"), sleep(7000)]);
    if (!vigente(id)) return;
    lluvia();
    brillarTodas(1200);
    await Promise.race([decir(textos().finalZeus, "zoe"), sleep(5000)]);
    if (!vigente(id)) return;
    ocultarCartel();
    if (zoe3d()) zoe3d().gesto("celebra");
    mostrarFelicitacion();
}

function mostrarFelicitacion() {
    const caja = document.getElementById("felicitacion");
    if (!caja) return;
    const t = textos();
    document.getElementById("felicitacion-titulo").textContent = t.finalTitulo || "¡ERES EL MAESTRO DEL RITMO!";
    document.getElementById("felicitacion-sub").textContent = t.finalSub || "";
    document.querySelector("#btn-otra-vez span").textContent = t.botonOtraVez || "VOLVER A JUGAR";
    document.querySelector("#btn-continuar span").textContent = t.botonContinuar || "CONTINUAR";
    const dib = document.getElementById("felicitacion-dibujos");
    if (dib) {
        dib.innerHTML = "";
        ReglasPista.ACCIONES.forEach(function (a) {
            const s = document.createElement("span");
            s.style.setProperty("--col", accionCfg(a).color || "#fff");
            s.innerHTML = IconosPista.svg(a);
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

/** Corta todo lo pendiente: temporizadores, voces, efectos y la mano de la demo. */
function cortarTodo() {
    partidaId++;
    cancelarTimers();
    limpiarAyuda();
    if (TextoVoz.detener) TextoVoz.detener();
    if (fx()) fx().limpiar();
    if (window.PistaDemo) window.PistaDemo.quitarMano();
    enDemo = false;
    document.body.classList.remove("demo-activa", "intro-activa", "fiesta", "fase-observa");
    habilitarBaldosas(false);
    apagarBaldosas();
    limpiarRanuras();
    callarNubes();
    ocultarCartel();
    luz(null);
}

/** "VOLVER A JUGAR": progreso a cero, secuencias nuevas y otra vez las dos rondas (la demo sigue fija). */
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
    ReglasPista.pasar(st, ReglasPista.E.SHOWING_SEQUENCE);
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
    gameConfig = JSON.parse(readText("config.json?v=20261113c"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    const problemas = ReglasPista.revisarJuego(gameConfig);
    if (problemas.length) console.warn("[PistaRitmo] config.json:", problemas);
    sincronizarDialogoIntro3d();
    armarBaldosas();
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
    if (window.EscenarioPista) fxListo = window.EscenarioPista.montar(document.getElementById("efectos-phaser"));

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
