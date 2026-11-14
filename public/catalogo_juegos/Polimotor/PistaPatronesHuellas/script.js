/**
 * ¡La Pista de Patrones de Huellas y Ritmo! — control del juego (Polimotor, Transición 5-6 años, juegos de
 * memoria corporal, juego 3).
 *
 * Flujo: pantalla de inicio → intro 3D compartida (Zeus y Zoe) → PedniaEdad → INTRODUCCIÓN en el gimnasio
 * mágico (título, Zeus en la línea de salida da la bienvenida y presenta las cinco plataformas haciendo cada
 * huella) → DEMO automática, sin botón (pie izquierdo → mano derecha → ambos pies; la mano toca las plataformas
 * y Zeus avanza) → "¡AHORA ES TU TURNO!" → 3 RONDAS de 3 ÍTEMS con secuencias de 4 huellas (9 en total):
 * Reconocimiento, Lateralidad y Memoria corporal → VICTORIA (Zeus cruza la meta, "¡ESPECTACULAR!", Volver a
 * jugar / Continuar / Menú).
 *
 * Cada ítem: OBSERVAR (plataformas bloqueadas; la pista enciende la secuencia con luz, sonido, flechas de luz
 * entre plataformas y Zeus haciendo cada huella) → REPETIR (el niño toca las plataformas; la comprobación es
 * inmediata: cada acierto enciende la huella con energía y Zeus hace la huella y avanza una casilla; cada
 * error hace rebotar la plataforma con un sonido amable, Zeus espera y el niño reintenta el mismo paso, sin
 * vidas; tras varios errores la pista vuelve a mostrar la misma secuencia) → celebración y siguiente ítem.
 *
 * Cinco huellas (config.acciones): manoIzquierda (naranja, ¡PLAF!), manoDerecha (roja, ¡TING!), pieIzquierdo
 * (azul, ¡BUM!), pieDerecho (azul grisáceo, ¡TOC!) y ambosPies (verde, ¡PUM!). Dificultad por ronda
 * (config.rondas): velocidad de encendido, pausa, apoyo de las ranuras y si Zeus nombra las huellas; desde la
 * ronda 2 cada secuencia combina izquierda y derecha (reglas.js).
 *
 * Estados (reglas.js): INTRO, DEMO, SHOWING_SEQUENCE, WAITING_INPUT, CHECKING_ANSWER, CORRECT_FEEDBACK,
 * ROUND_TRANSITION, VICTORY. Solo WAITING_INPUT acepta toques. Cada partida lleva un número (partidaId): lo
 * que termina después de un reinicio no toca la partida nueva, y los temporizadores se cancelan.
 *
 * Módulos: ReglasHuellas (puro) · IconosHuellas (dibujos de las huellas) · SonidosHuellas (Web Audio) ·
 * EscenarioHuellas (Phaser 4: ondas, estrellas, chispas, serpentinas, confeti) · PistaHuellasDemo
 * (demostración) · AulaPista (escena 3D: el aula real de Polimotor con la pista, el carril, la meta y Zeus con
 * los clips del GLB, todo con una sola cámara).
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let arrancado = false;
let st = null;               // estado de la partida (ReglasHuellas.crear)
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
    if (window.SonidosHuellas && typeof window.SonidosHuellas[nombre] === "function") window.SonidosHuellas[nombre](arg);
}

/** Sonido característico de una huella (config.acciones[i].sonido: "palmada", "campana", "tambor", …). */
function sonidoBaldosa(id) {
    if (!efectosOn) return;
    if (window.SonidosHuellas) window.SonidosHuellas.baldosa(accionCfg(id).sonido);
}

function fx() {
    return window.EscenarioHuellas && window.EscenarioHuellas.listo() ? window.EscenarioHuellas : null;
}

/** Zeus 3D dentro del aula (aula-pista.js), o null si todavía no cargó / no hay WebGL. */
function zeus3d() {
    const a = window.AulaPista;
    return a && a.zeus && a.zeus.listo() ? a.zeus : null;
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
    return ReglasHuellas.accion(gameConfig, id) || { id: id, nombre: id, voz: id };
}

function rondaCfg() {
    return ReglasHuellas.ronda(gameConfig, st ? st.ronda : 0);
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
    return TextoVoz.hablar(texto, pj === "zoe" ? "zoe" : "zeus");
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

/** Habla Zeus con su nube (y el clip de hablar); la nube se va al terminar la voz. */
function decir(texto, quien, gesto) {
    quien = quien === "zoe" ? "zoe" : "zeus";
    const pj = quien === "zeus" ? zeus3d() : null;
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
    { key: "ayudaAutomatica", label: "Ayuda visual (las plataformas se menean)" },
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
    ReglasHuellas.rondas(gameConfig).forEach(function (r, i) {
        const g = document.createElement("div");
        g.className = "grupo";
        g.dataset.ronda = String(i);
        g.innerHTML = '<span class="grupo-r">R' + (i + 1) + "</span>";
        for (let k = 0; k < ReglasHuellas.itemsDeRonda(gameConfig, i); k++) {
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
    const p = ReglasHuellas.progreso(st, gameConfig);
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
        g.classList.toggle("hecha", !!(st && st.hechos[r] && st.hechos[r].filter(Boolean).length === ReglasHuellas.itemsDeRonda(gameConfig, r)));
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
    const n = ReglasHuellas.itemsDeRonda(gameConfig, st ? st.ronda : 0);
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
    txt.textContent = tipo === "observa" ? (textos().faseObserva || "¡MIRA LAS HUELLAS!")
        : tipo === "repite" ? (textos().faseRepite || "¡REPITE EL CAMINO!")
            : "¡A LA PISTA!";
    document.body.classList.toggle("fase-observa", tipo === "observa");
    // mientras se muestra la secuencia, las plataformas apagadas se oscurecen (foco en la que se enciende)
    if (aula()) aula().foco(tipo === "observa");
}

/** La marquesina muestra tantas ranuras como huellas tenga la secuencia (3 en la demo, 4 en el juego), con flechas. */
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

/**
 * En el turno del niño, la ranura del paso que toca late (borde dorado). Dice CUÁNTO falta, no CUÁL huella:
 * no revela la respuesta.
 */
function marcarSiguiente(n) {
    document.querySelectorAll("#secuencia .ranura").forEach(function (r) {
        r.classList.toggle("siguiente", Number(r.dataset.n) === n);
    });
}

function limpiarRanuras() {
    document.querySelectorAll("#secuencia .ranura").forEach(function (r) {
        r.classList.remove("activa", "con-dibujo", "solo-luz", "bien", "mal", "siguiente");
        const img = r.querySelector(".ranura-img");
        if (img) img.removeAttribute("src");
    });
}

function ranuraDibujo(n, id) {
    const r = ranura(n);
    if (!r) return;
    const img = r.querySelector(".ranura-img");
    if (img) img.src = IconosHuellas.dataUri(id);
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

/** Los pasos "1. OBSERVA / 2. REPITE" ya no se muestran: los cajones del patrón quedan siempre a la vista. */
function mostrarPasos(si) {
    const s = document.getElementById("secuencia");
    if (s) s.hidden = false;
}

function pasoActivo(cual) {
    document.querySelectorAll("#pasos .paso").forEach(function (p) {
        p.classList.toggle("on", p.classList.contains("paso-" + cual));
    });
}


// ------------------------------------------------------------------ escena 3D (aula-pista.js)

/** La escena 3D del aula con la pista y Zeus, o null si todavía no está o no hay WebGL. */
function aula() {
    return window.AulaPista && window.AulaPista.listo() ? window.AulaPista : null;
}

let aulaLista = Promise.resolve(false);

/** Monta el aula 3D (cuando el módulo ya cargó). Los toques sobre las plataformas 3D llegan a alPulsar. */
function montarAula() {
    aulaLista = new Promise(function (resolve) {
        const ir = function () {
            window.AulaPista.montar(gameConfig, {
                alTocar: alPulsar,
                // zona de la pantalla donde cabe la pista: debajo de la cabecera y la fila de progreso
                zonaLibre: function () {
                    const fila = document.querySelector(".hud-top");
                    const r = fila ? fila.getBoundingClientRect() : { bottom: 0.2 * window.innerHeight };
                    return { top: r.bottom + 6, bottom: window.innerHeight - 6 };
                }
            }).then(function (ok) {
                if (!ok) document.body.classList.add("sin-3d");
                resolve(ok);
            }, function (e) {
                console.warn("[PistaHuellas] aula 3D", e);
                document.body.classList.add("sin-3d");
                resolve(false);
            });
        };
        if (window.AulaPista) ir();
        else window.addEventListener("aulapista-modulo", ir, { once: true });
    });
    return aulaLista;
}

// ------------------------------------------------------------------ las cinco plataformas

function baldosa(id) {
    return document.querySelector('.baldosa[data-accion="' + id + '"]');
}

/**
 * Las plataformas se ven y se tocan en 3D (aula-pista.js). Aquí se arman además unos botones para teclado y
 * lectores de pantalla (ocultos a la vista; si no hay WebGL se muestran como respaldo).
 */
function armarBaldosas() {
    const pista = document.getElementById("pista");
    if (!pista) return;
    pista.innerHTML = "";
    ReglasHuellas.ACCIONES.forEach(function (id, i) {
        const a = accionCfg(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "baldosa";
        b.dataset.accion = id;
        b.disabled = true;
        b.style.setProperty("--col", a.color || "#fff");
        b.style.setProperty("--i", String(i));
        b.setAttribute("aria-label", a.nombre);
        b.innerHTML = '<span class="baldosa-dibujo">' + IconosHuellas.svg(id) + '</span><span class="baldosa-nombre">' + a.nombre + "</span>";
        b.addEventListener("pointerdown", function (ev) {
            if (ev.isPrimary === false || (ev.pointerType === "mouse" && ev.button !== 0)) return;
            ev.preventDefault();
            alPulsar(id);
        });
        b.addEventListener("click", function (ev) {
            if (ev.detail === 0) alPulsar(id);
        });
        pista.appendChild(b);
    });
}

function habilitarBaldosas(si) {
    document.querySelectorAll(".baldosa").forEach(function (b) { b.disabled = !si; });
    document.body.classList.toggle("juego-bloqueado", !si);
    if (aula()) aula().habilitar(si);
}

function iluminar(id, si) {
    const b = baldosa(id);
    if (b) b.classList.toggle("encendida", !!si);
    if (aula()) aula().encender(id, si);
}

function apagarBaldosas() {
    ReglasHuellas.ACCIONES.forEach(function (id) { iluminar(id, false); });
}

function claseUnaVez(el, clase, duracion) {
    if (!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, duracion || 600);
}

/** Rectángulo en pantalla de la tapa de la plataforma (proyectada desde la escena 3D). */
function rectBaldosa(id) {
    if (aula()) return aula().rect(id);
    const b = baldosa(id);
    return b ? b.getBoundingClientRect() : null;
}

function centroBaldosa(id) {
    const r = rectBaldosa(id);
    if (!r) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

// ------------------------------------------------------------------ Zeus en el carril (salida → meta)

let posZeus = 0;
let colaZeus = Promise.resolve();

/** Coloca a Zeus en el paso p del carril (con `ms` de recorrido o al instante). */
function colocarZeus(p, msTrans) {
    const z = zeus3d();
    if (z) z.ir(p, msTrans || 0);
}

/**
 * Zeus camina desde donde está hasta el paso `hasta` (adelante o atrás): se desliza por el carril con el clip
 * Caminar y una pisada por paso. Devuelve una Promise.
 */
function avanzarZeus(hasta, msPorPaso) {
    const pasos = Math.abs(hasta - posZeus);
    if (!pasos) return Promise.resolve();
    const porPaso = msPorPaso || 460;
    const total = Math.max(380, pasos * porPaso);
    const id = partidaId;
    const z = zeus3d();
    const camino = z ? z.caminar(total) : sleep(total);
    colocarZeus(hasta, total);
    for (let k = 0; k < pasos; k++) {
        setTimeout(function () { if (vigente(id)) sfx("paso"); }, k * porPaso + porPaso * 0.4);
    }
    posZeus = hasta;
    return Promise.all([camino, sleep(total)]);
}

/** Zeus vuelve a la salida al instante (reinicio) o caminando (fin de la demo). */
function zeusASalida(msTrans) {
    posZeus = 0;
    colocarZeus(0, msTrans || 0);
    if (zeus3d()) zeus3d().mirar("frente");
}

/** Encola una acción de Zeus (movimiento + caminar) para que no se pisen si el niño toca rápido. */
function enColaZeus(fn) {
    const id = partidaId;
    colaZeus = colaZeus.then(function () {
        return vigente(id) ? fn() : null;
    }).catch(function (e) { console.warn("[PistaHuellas] Zeus", e); });
    return colaZeus;
}

/** Movimiento de Zeus para una huella (clip del GLB); sin 3D solo espera. */
function zeusHuella(a, msMov) {
    const z = zeus3d();
    return z ? z.hacer(a, { ms: msMov }) : sleep(msMov);
}

// ------------------------------------------------------------------ flechas luminosas entre plataformas

const NS = "http://www.w3.org/2000/svg";

function limpiarFlechas() {
    const svg = document.getElementById("flechas");
    if (svg) svg.querySelectorAll(".flecha").forEach(function (f) { f.remove(); });
}

/** Flecha de luz curva que va de un punto a otro (dirección del camino de la secuencia). */
function flechaEntre(p0, p1, color, dur) {
    const svg = document.getElementById("flechas");
    if (!svg || !p0 || !p1) return;
    const mx = (p0.x + p1.x) / 2;
    const my = Math.min(p0.y, p1.y) - Math.max(30, Math.abs(p1.x - p0.x) * 0.18);
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "flecha");
    g.style.setProperty("--col", color || "#ffe066");
    const d = "M" + p0.x.toFixed(1) + "," + p0.y.toFixed(1) + " Q" + mx.toFixed(1) + "," + my.toFixed(1) + " " + p1.x.toFixed(1) + "," + p1.y.toFixed(1);
    const halo = document.createElementNS(NS, "path");
    halo.setAttribute("d", d);
    halo.setAttribute("class", "flecha-halo");
    const linea = document.createElementNS(NS, "path");
    linea.setAttribute("d", d);
    linea.setAttribute("class", "flecha-linea");
    linea.setAttribute("marker-end", "url(#flecha-punta)");
    g.appendChild(halo);
    g.appendChild(linea);
    svg.appendChild(g);
    setTimeout(function () {
        g.classList.add("sale");
        setTimeout(function () { g.remove(); }, 400);
    }, dur || 1500);
}

function flechaHuellas(desde, hasta) {
    const a = centroBaldosa(desde);
    const b = centroBaldosa(hasta);
    if (!a || !b) return;
    flechaEntre(a, b, accionCfg(hasta).colorClaro || accionCfg(hasta).color, 1600);
}

// ------------------------------------------------------------------ encender una plataforma (luz, sonido y efecto)

let turnoLuz = 0;

/** El color de la huella tiñe la marquesina y los efectos mientras está encendida. */
function luz(id) {
    const raiz = document.documentElement;
    if (!id) {
        raiz.style.removeProperty("--luz");
        return;
    }
    const a = accionCfg(id);
    raiz.style.setProperty("--luz", a.colorClaro || a.color || "#fff3bf");
}

function vibrarPista() {
    if (aula()) aula().temblor();
}

/** "¡PLAF!", "¡BUM!"…: globito sobre la plataforma mientras está encendida. */
function globoEfecto(id, duracion) {
    const r = rectBaldosa(id);
    const a = accionCfg(id);
    if (!r || !a.efecto) return;
    const g = document.createElement("div");
    g.className = "globo-efecto";
    g.textContent = a.efecto;
    g.style.setProperty("--col", a.color || "#333");
    g.style.left = (r.left + r.width / 2) + "px";
    g.style.top = (r.top - 6) + "px";
    document.body.appendChild(g);
    setTimeout(function () { g.remove(); }, Math.max(500, duracion || 800));
}

/** Efecto Phaser propio de cada huella: estrellitas en las manos, golpe al suelo en los pies y el salto. */
function efectoBaldosa(id) {
    const e = fx();
    const r = rectBaldosa(id);
    if (!e || !r) return;
    const a = accionCfg(id);
    const col = a.colorClaro || a.color;
    e.ondaBaldosa(r, col);
    if (a.tipo === "mano") {
        e.estrellitas(r, col);
    } else {
        e.golpeSuelo(r, col);
        vibrarPista();
    }
}

/**
 * La plataforma `id` se enciende durante `duracion` ms: sube, brilla con su color (y una luz de color en el
 * aula), suena y sale su efecto. Devuelve una Promise que se cumple al apagarse.
 */
function encender(id, duracion) {
    const mio = ++turnoLuz;
    luz(id);
    iluminar(id, true);
    sonidoBaldosa(id);
    efectoBaldosa(id);
    globoEfecto(id, duracion);
    return sleep(duracion).then(function () {
        iluminar(id, false);
        if (mio === turnoLuz) luz(null);
    });
}

/** Efecto de energía en la huella acertada (anillos de luz que suben y chispas). */
function energia(id) {
    if (aula()) aula().energia(id);
    const e = fx();
    const r = rectBaldosa(id);
    if (e && r) e.chispas(r, 8);
}

/** Todas las plataformas se encienden en cascada (fin de la demo, fin de ronda y meta). */
function brillarTodas(duracion) {
    ReglasHuellas.ACCIONES.forEach(function (id, i) {
        setTimeout(function () {
            iluminar(id, true);
            sonidoBaldosa(id);
            const e = fx();
            const r = rectBaldosa(id);
            if (e && r) e.ondaBaldosa(r, accionCfg(id).colorClaro || accionCfg(id).color);
            setTimeout(function () { iluminar(id, false); }, 420);
        }, i * 130);
    });
    return sleep(duracion || 1200);
}

// ------------------------------------------------------------------ carteles

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
    TextoVoz.hablar(titulo, "zeus");
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
 * El circuito se presenta: cartel con el título, Zeus en la línea de salida saluda y da la bienvenida
 * ("¡Alerta en la pista de huellas!…") mientras la marquesina muestra 1. OBSERVA → 2. REPITE, y presenta las
 * cinco plataformas: cada una se enciende con su sonido mientras Zeus hace el movimiento de esa huella.
 * Después la demostración empieza SOLA (sin botón).
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
    zeusASalida(0);
    mostrarCartel(t.tituloIntro, t.subtituloIntro);
    sonarEvento("aparece");
    if (zeus3d()) zeus3d().gesto("saluda");
    await sleep(2300);
    if (!vigente(id)) return;
    ocultarCartel();
    await sleep(400);
    const voz = decir(completa ? t.bienvenida : t.saludoCorto, "zeus");
    pasoActivo("observa");
    sleep(completa ? 5200 : 1500).then(function () { if (vigente(id)) pasoActivo("repite"); });
    await Promise.race([voz, sleep(completa ? 14000 : 4000)]);
    if (!vigente(id)) return;
    if (completa) {
        // las cinco huellas, una por una: nombre, luz, sonido y el movimiento de Zeus
        nube("zeus", t.presentaBotones || "", false);
        for (const a of ReglasHuellas.ACCIONES) {
            if (!vigente(id)) return;
            hablar(accionCfg(a).voz, "zeus");
            await Promise.all([encender(a, 1100), zeusHuella(a, 1100)]);
            if (!vigente(id)) return;
            await sleep(200);
        }
        nube("zeus", "");
    }
    pasoActivo("");
}

// ------------------------------------------------------------------ DEMO automática

async function demostrar() {
    if (!window.PistaHuellasDemo) return;
    const id = partidaId;
    enDemo = true;
    ReglasHuellas.pasar(st, ReglasHuellas.E.DEMO);
    document.body.classList.add("demo-activa");
    habilitarBaldosas(false);
    mostrarPasos(false);
    const demoCfg = gameConfig.demo || {};
    const sec = (demoCfg.secuencia || ReglasHuellas.DEMO).slice();
    armarRanuras(sec.length);
    limpiarRanuras();
    await window.PistaHuellasDemo.correr({
        secuencia: function () { return sec; },
        cancelado: function () { return !vigente(id); },
        texto: function (clave) { return textos()[clave] || ""; },
        decir: function (texto) { return decir(texto, "zeus"); },
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
        pulsar: async function (a) {
            // la plataforma responde igual que con el niño y Zeus avanza, pero no cuenta
            const n = document.querySelectorAll("#secuencia .ranura.con-dibujo").length + 1;
            ranuraDibujo(n, a);
            sfx("seleccion");
            energia(a);
            const luzP = encender(a, ms("msRespuesta", 620));
            await zeusHuella(a, 1000);
            await avanzarZeus(posZeus + 1);
            await luzP;
        },
        bien: function () {
            marcarRanuras("bien");
            cantarBaldosas(sec);
            if (zeus3d()) zeus3d().gesto("celebra");
        },
        todasBrillan: function () { return brillarTodas(1200); },
        volverASalida: async function () {
            zeusASalida(900);
            await sleep(950);
        },
        tuTurno: async function () {
            mostrarCartel(textos().tuTurno || "¡AHORA ES TU TURNO!", "");
            sonarEvento("correcto");
            await Promise.all([Promise.race([decir(textos().tuTurnoVoz, "zeus"), sleep(5000)]), sleep(1800)]);
            ocultarCartel();
            await sleep(500);
        }
    });
    enDemo = false;
    document.body.classList.remove("demo-activa");
    apagarBaldosas();
    limpiarRanuras();
    limpiarFlechas();
    callarNubes();
}

/** Arranque único (el selector de edad puede avisar más de una vez). */
async function iniciarJuego() {
    if (arrancado) return;
    arrancado = true;
    await Promise.all([fxListo, aulaLista]);
    nuevaPartida();
    pintarProgreso();
    await presentar();
    const id = partidaId;
    if (!vigente(id)) return;
    if (acc().mostrarIntro !== false) {
        await demostrar();
        if (!vigente(id)) return;
    }
    document.body.classList.remove("intro-activa");
    zeusASalida(0);
    ReglasHuellas.pasar(st, ReglasHuellas.E.SHOWING_SEQUENCE);
    empezarRonda(true);
}

function nuevaPartida() {
    partidaId++;
    st = ReglasHuellas.crear(gameConfig, Math.random);
    colaZeus = Promise.resolve();
    if (window.__HUELLAS_DEBUG__) window.__HUELLAS_DEBUG__.st = st;
}

// ------------------------------------------------------------------ FASE A: OBSERVAR LA SECUENCIA

/**
 * La pista enciende la secuencia: cada plataforma se ilumina con su sonido, una flecha de luz marca el camino
 * desde la anterior y Zeus hace el movimiento de la huella (clip del GLB, de espaldas para que el lado
 * coincida). Con apoyo "alto" el dibujo queda en su ranura; con "medio" solo mientras está encendida; con
 * "bajo" solo se enciende el número. `nombrar` dice el nombre de cada huella.
 */
async function mostrarSecuencia(sec, opciones, id) {
    const apoyo = opciones.apoyo || "alto";
    const dur = opciones.msBaldosa || 1000;
    for (let i = 0; i < sec.length; i++) {
        if (!vigente(id)) return;
        const a = sec[i];
        const n = i + 1;
        ranuraActiva(n, true);
        if (apoyo === "bajo") ranuraLuz(n);
        else ranuraDibujo(n, a);
        if (i > 0) flechaHuellas(sec[i - 1], a);
        if (opciones.nombrar) hablar(accionCfg(a).voz, "zeus");
        await Promise.all([encender(a, dur), zeusHuella(a, Math.max(700, dur - 80))]);
        if (!vigente(id)) return;
        ranuraActiva(n, false);
        if (apoyo === "medio") {
            const r = ranura(n);
            if (r) r.classList.remove("con-dibujo");
            ranuraLuz(n);
        }
        if (i < sec.length - 1) await sleep(opciones.pausaMs || 700);
    }
    limpiarFlechas();
}

function opcionesRonda(reintento) {
    const r = rondaCfg();
    const op = {
        msBaldosa: Number(r.msBaldosa) || 1000,
        pausaMs: Number(r.pausaMs) || 700,
        apoyo: r.apoyo || "alto",
        nombrar: r.nombrar !== false
    };
    // al repetir tras varios errores, la pista lo muestra con todo el apoyo (sin resolverlo)
    if (reintento) {
        op.apoyo = "alto";
        op.nombrar = true;
        op.msBaldosa = Math.max(op.msBaldosa, 1150);
        op.pausaMs = Math.max(op.pausaMs, 820);
    }
    return op;
}

/** Ronda nueva (o la primera): cartel y voz de la ronda, y su primer ítem. */
async function empezarRonda(primera) {
    const id = partidaId;
    pintarProgreso();
    const r = rondaCfg();
    document.body.dataset.ronda = String(st.ronda + 1);
    mostrarCartel(r.titulo || ("RONDA " + (st.ronda + 1)), r.nombre || "");
    sonarEvento("aparece");
    if (zeus3d()) zeus3d().gesto(primera ? "senala" : "saluda");
    await Promise.all([Promise.race([decir(r.instruccion, "zeus"), sleep(7000)]), sleep(1800)]);
    if (!vigente(id)) return;
    ocultarCartel();
    await sleep(400);
    jugarItem(false);
}

/** Un ítem: OBSERVAR (la pista enciende las 4 huellas) → REPETIR (el niño toca, Zeus avanza en cada acierto). */
async function jugarItem(reintento) {
    const id = partidaId;
    if (!st || st.estado !== ReglasHuellas.E.SHOWING_SEQUENCE) return;
    limpiarAyuda();
    habilitarBaldosas(false);
    apagarBaldosas();
    limpiarRanuras();
    limpiarFlechas();
    mostrarPasos(false);
    pintarProgreso();
    fase("observa");
    const sec = ReglasHuellas.secuenciaActual(st);
    armarRanuras(sec.length);
    const t = textos();
    const frase = (st.item === 0 || reintento) ? t.observa : (t.observaCorto || t.observa);
    sfx("cuentaAtras");
    await Promise.race([decir(frase, "zeus"), sleep(4500)]);
    if (!vigente(id)) return;
    await sleep(250);
    nube("zeus", "");
    await mostrarSecuencia(sec, opcionesRonda(reintento), id);
    if (!vigente(id)) return;
    // las luces se apagan: tiempo para recordar antes del turno
    await sleep(rondaCfg().apoyo === "alto" ? 700 : 450);
    if (!vigente(id)) return;
    if (!ReglasHuellas.pasar(st, ReglasHuellas.E.WAITING_INPUT)) return;
    limpiarRanuras();
    fase("repite");
    habilitarBaldosas(true);
    marcarSiguiente(1);
    sonarEvento("aparece", { vol: 0.5 });
    programarAyuda();
}

// ------------------------------------------------------------------ FASE B: toques del niño (comprobación inmediata)

function alPulsar(idAccion) {
    if (enDemo || !st) return;
    if (st.estado !== ReglasHuellas.E.WAITING_INPUT) return;
    // un solo toque no puede contar dos veces (doble toque involuntario)
    const ahora = performance.now();
    if (ahora - ultimoToque < ms("debounceMs", 300)) return;
    ultimoToque = ahora;
    const r = ReglasHuellas.tocar(st, idAccion);
    if (!r.ok) return;
    limpiarAyuda();
    const id = partidaId;
    if (!r.correcta) {
        toqueEquivocado(idAccion, r, id);
        return;
    }
    // acierto de este paso: la plataforma se enciende con energía, suena, y Zeus hace la huella y avanza
    sfx("seleccion");
    if (aula()) aula().presionar(idAccion);
    ranuraDibujo(r.n, idAccion);
    ranura(r.n) && ranura(r.n).classList.add("bien");
    marcarSiguiente(r.completa ? 0 : r.n + 1);
    ranuraActiva(r.n, true);
    setTimeout(function () { ranuraActiva(r.n, false); }, 500);
    energia(idAccion);
    const toque = encender(idAccion, ms("msRespuesta", 620));
    const destino = ReglasHuellas.pasosRecorridos(st, gameConfig);
    enColaZeus(async function () {
        await zeusHuella(idAccion, 820);
        await avanzarZeus(destino, 420);
    });
    pintarProgreso();
    if (r.completa) {
        habilitarBaldosas(false);
        comprobar(id, toque);
    } else {
        programarAyuda();
    }
}

/**
 * Plataforma equivocada: rebota, onda gris suave, "boing" amable y Zeus se queda pensando en su sitio. No se
 * pierde nada de lo acertado: el niño vuelve a intentar el MISMO paso. Tras varios fallos en el ítem, la pista
 * vuelve a mostrar la secuencia desde el principio (Zeus regresa al inicio del ítem).
 */
async function toqueEquivocado(idAccion, r, id) {
    const b = baldosa(idAccion);
    claseUnaVez(b, "rebota", 720);
    if (aula()) aula().rebotar(idAccion);
    sfx("rebote");
    const e = fx();
    const rect = rectBaldosa(idAccion);
    if (e && rect) e.ondaBaldosa(rect, "#ced4da");
    if (zeus3d()) zeus3d().gesto("piensa");
    const tope = Number(cfgJuego().erroresParaRepetir) || 3;
    if (r.errores < tope) {
        decir(textos().errorToque, "zeus");
        programarAyuda();
        return;
    }
    // demasiados intentos: se repite la demostración luminosa de la misma secuencia
    habilitarBaldosas(false);
    marcarRanuras("mal", r.n);
    await Promise.race([decir(textos().errorZeus, "zeus"), sleep(6000)]);
    if (!vigente(id)) return;
    if (!ReglasHuellas.volverAMostrar(st)) return;
    st.errores = 0;
    await colaZeus;
    const inicioItem = ReglasHuellas.pasosRecorridos(st, gameConfig);
    if (posZeus !== inicioItem) {
        posZeus = inicioItem;
        colocarZeus(inicioItem, 700);
        await sleep(750);
    }
    if (!vigente(id)) return;
    jugarItem(true);
}

// ------------------------------------------------------------------ FASE C: secuencia completa

async function comprobar(id, ultimoToque) {
    await Promise.race([ultimoToque, sleep(ms("msRespuesta", 620) + 400)]);
    if (!vigente(id)) return;
    await colaZeus; // Zeus termina de llegar a su casilla
    if (!vigente(id)) return;
    await sleep(ms("pausaAntesDeComprobarMs", 420));
    if (!vigente(id)) return;
    const c = ReglasHuellas.comparar(st);
    if (!c) return;
    if (c.correcto) await acierto(c, id);
}

/** Las huellas de la secuencia "cantan" su nota, en orden, con notas de luz que suben. */
function cantarBaldosas(sec) {
    sec.forEach(function (a, i) {
        setTimeout(function () {
            const b = baldosa(a);
            claseUnaVez(b, "canta", 650);
            if (aula()) aula().saltito(a);
            iluminar(a, true);
            setTimeout(function () { iluminar(a, false); }, 420);
            sfx("nota", accionCfg(a).nota);
            const p = centroBaldosa(a);
            if (fx() && p) fx().notas(p.x, p.rect.top + 10, accionCfg(a).color);
        }, i * 280);
    });
}

async function acierto(c, id) {
    limpiarAyuda();
    marcarRanuras("bien");
    cantarBaldosas(c.secuencia);
    document.body.classList.add("fiesta");
    sfx("fiesta");
    if (zeus3d()) zeus3d().gesto("celebra");
    const e = fx();
    if (e) e.serpentinas(1800);
    marcarHito();
    if (st.errores === 0) medalla(textos().perfecto || "¡PERFECTO!");
    // la estrella sale de Zeus y vuela a su hueco del progreso; al llegar se enciende
    estrellaVoladora(st.item).then(function () {
        if (!vigente(id)) return;
        pintarProgreso();
        animarProgreso();
    });
    const t = textos();
    await sleep(600);
    if (!vigente(id)) return;
    document.body.classList.remove("fiesta");
    await Promise.race([decir(t.aciertoCorto, "zeus"), sleep(2200)]);
    if (!vigente(id)) return;
    const cuantos = (t.cuantos && t.cuantos[String(c.secuencia.length)]) || String(c.secuencia.length);
    await Promise.race([decir(ReglasHuellas.plantilla(t.aciertoZeus, { cuantos: cuantos }), "zeus"), sleep(7000)]);
    if (!vigente(id)) return;
    const siguiente = ReglasHuellas.avanzar(st, gameConfig);
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

/** Medalla grande que sube y se desvanece sobre la pista ("¡PERFECTO!" si el ítem salió sin errores). */
function medalla(texto) {
    const m = document.createElement("div");
    m.className = "medalla";
    m.innerHTML = '<i class="fa-solid fa-medal" aria-hidden="true"></i> <span></span>';
    m.querySelector("span").textContent = texto;
    document.body.appendChild(m);
    setTimeout(function () { m.remove(); }, 1900);
}

/**
 * Una estrella sale de la cabeza de Zeus y vuela, girando, hasta la estrella del ítem en la barra de progreso.
 * Devuelve una Promise que se cumple al llegar (o enseguida si no hay animaciones).
 */
function estrellaVoladora(indice) {
    const destino = document.querySelectorAll("#progreso-estrellas .progreso-estrella")[indice];
    const z = zeus3d();
    const desde = z ? z.punto() : null;
    if (!destino || !desde || !document.body.animate) return Promise.resolve();
    const b = destino.getBoundingClientRect();
    const x0 = desde.x;
    const y0 = desde.y;
    const x1 = b.left + b.width / 2;
    const y1 = b.top + b.height / 2;
    const s = document.createElement("i");
    s.className = "fa-solid fa-star estrella-voladora";
    s.setAttribute("aria-hidden", "true");
    s.style.left = x0 + "px";
    s.style.top = y0 + "px";
    document.body.appendChild(s);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const anim = s.animate([
        { transform: "translate(-50%,-50%) scale(0.3) rotate(0deg)", opacity: 0 },
        { transform: "translate(calc(-50% + " + (dx * 0.3) + "px), calc(-50% + " + (dy * 0.2 - 80) + "px)) scale(1.6) rotate(200deg)", opacity: 1, offset: 0.35 },
        { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(0.9) rotate(540deg)", opacity: 1 }
    ], { duration: 900, easing: "cubic-bezier(.45,0,.25,1)" });
    return new Promise(function (resolve) {
        const fin = function () { s.remove(); sfx("nota", 1046.5); resolve(); };
        anim.onfinish = fin;
        setTimeout(function () { if (s.isConnected) fin(); }, 1100);
    });
}

/** El hito del carril donde está Zeus se enciende (punto de control alcanzado). */
function marcarHito() {
    if (aula()) aula().hito(posZeus);
    const p = aula() ? aula().puntoPaso(posZeus) : null;
    if (fx() && p) fx().chispas({ left: p.x - 40, top: p.y - 30, width: 80, height: 40 }, 12);
}

/** Ronda completada (no la última): fiesta en el circuito, "¡RONDA n COMPLETADA!" y la siguiente sola. */
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
    if (zeus3d()) zeus3d().gesto("baila");
    document.body.classList.add("fiesta");
    if (aula()) aula().tramo(st.ronda);
    mostrarCartel(ReglasHuellas.plantilla(textos().rondaListaTitulo || "¡RONDA {n} COMPLETADA!", { n: st.ronda + 1 }), "");
    await Promise.all([Promise.race([decir(textos().rondaLista, "zeus"), sleep(6000)]), sleep(2500)]);
    document.body.classList.remove("fiesta");
    if (!vigente(id)) return;
    ocultarCartel();
    await sleep(500);
    if (!vigente(id)) return;
    if (!ReglasHuellas.siguienteRonda(st, gameConfig)) return;
    empezarRonda(false);
}

// ------------------------------------------------------------------ ayuda (sin revelar la respuesta)

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    ayuda.token++;
}

/** Si el niño tarda, Zeus le anima y TODAS las plataformas se menean (no se marca ninguna en concreto). */
function programarAyuda(repeticion) {
    limpiarAyuda();
    ayuda.veces = repeticion ? (ayuda.veces || 0) : 0;
    if (ayuda.veces >= ms("ayudasMax", 3)) return;
    if (!st || st.estado !== ReglasHuellas.E.WAITING_INPUT) return;
    const token = ayuda.token;
    const id = partidaId;
    ayuda.t = setTimeout(function () {
        if (token !== ayuda.token || !vigente(id) || !st || st.estado !== ReglasHuellas.E.WAITING_INPUT) return;
        ayuda.veces++;
        if (acc().ayudaAutomatica) {
            if (aula()) aula().menear();
        }
        if (zeus3d()) zeus3d().gesto("senala");
        decir(textos().ayudaZeus, "zeus");
        ayuda.t = setTimeout(function () {
            if (token !== ayuda.token) return;
            programarAyuda(true);
        }, ms("ayudaRepetirMs", 14000));
    }, ms("ayudaMs", 12000));
}

// ------------------------------------------------------------------ VICTORIA: Zeus cruza la meta

async function victoria(id) {
    limpiarAyuda();
    habilitarBaldosas(false);
    fase("espera");
    if (typeof Swal !== "undefined") Swal.close();
    await colaZeus;
    if (!vigente(id)) return;
    // Zeus cruza la línea de meta (un paso más allá del último hito, bajo el arco)
    document.body.classList.add("meta-activa");
    if (aula()) {
        aula().meta(true);
        ReglasHuellas.rondas(gameConfig).forEach(function (r, i) { aula().tramo(i); });
    }
    await avanzarZeus(ReglasHuellas.pasosTotales(gameConfig) + 1, 520);
    if (!vigente(id)) return;
    document.body.classList.add("fiesta", "todas-encendidas");
    if (aula()) aula().todas(true);
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
    if (zeus3d()) zeus3d().gesto("meta");
    mostrarCartel(textos().finalTitulo || "¡ESPECTACULAR!", textos().finalSub || "");
    await Promise.race([decir(textos().finalZeus, "zeus"), sleep(9000)]);
    if (!vigente(id)) return;
    lluvia();
    brillarTodas(1200);
    if (zeus3d()) zeus3d().gesto("baila");
    await sleep(1400);
    if (!vigente(id)) return;
    ocultarCartel();
    mostrarFelicitacion();
}

function mostrarFelicitacion() {
    const caja = document.getElementById("felicitacion");
    if (!caja) return;
    const t = textos();
    document.getElementById("felicitacion-titulo").textContent = t.finalTitulo || "¡ESPECTACULAR!";
    document.getElementById("felicitacion-sub").textContent = t.finalZeus || t.finalSub || "";
    document.querySelector("#btn-otra-vez span").textContent = t.botonOtraVez || "VOLVER A JUGAR";
    document.querySelector("#btn-continuar span").textContent = t.botonContinuar || "CONTINUAR";
    const menu = document.querySelector("#btn-menu span");
    if (menu) menu.textContent = t.botonMenu || "MENÚ";
    const dib = document.getElementById("felicitacion-dibujos");
    if (dib) {
        dib.innerHTML = "";
        ReglasHuellas.ACCIONES.forEach(function (a) {
            const s = document.createElement("span");
            s.style.setProperty("--col", accionCfg(a).color || "#fff");
            s.innerHTML = IconosHuellas.svg(a);
            dib.appendChild(s);
        });
    }
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    caja.hidden = false;
    const btn = document.getElementById("btn-otra-vez");
    if (btn) setTimeout(function () { btn.focus({ preventScroll: true }); }, 300);
}

function ocultarFelicitacion() {
    const caja = document.getElementById("felicitacion");
    if (caja) caja.hidden = true;
}

/** Corta todo lo pendiente: temporizadores, voces, efectos, flechas y la mano de la demo. */
function cortarTodo() {
    partidaId++;
    cancelarTimers();
    limpiarAyuda();
    if (TextoVoz.detener) TextoVoz.detener();
    if (fx()) fx().limpiar();
    if (window.PistaHuellasDemo) window.PistaHuellasDemo.quitarMano();
    if (zeus3d()) zeus3d().detener();
    enDemo = false;
    document.querySelectorAll(".medalla, .estrella-voladora").forEach(function (el) { el.remove(); });
    document.body.classList.remove("demo-activa", "intro-activa", "fiesta", "fase-observa", "meta-activa", "todas-encendidas");
    if (aula()) {
        aula().todas(false);
        aula().meta(false);
        aula().foco(false);
    }
    habilitarBaldosas(false);
    apagarBaldosas();
    limpiarRanuras();
    limpiarFlechas();
    callarNubes();
    ocultarCartel();
    luz(null);
}

/** "VOLVER A JUGAR": progreso a cero, secuencias nuevas, Zeus en la salida y otra vez las tres rondas. */
async function volverAJugar() {
    ocultarFelicitacion();
    cortarTodo();
    nuevaPartida();
    if (aula()) aula().reiniciarCarril();
    armarProgreso();
    pintarProgreso();
    zeusASalida(0);
    const id = partidaId;
    sonarEvento("aparece");
    await Promise.race([decir(textos().otraVez, "zeus", "saluda"), sleep(4500)]);
    if (!vigente(id)) return;
    ReglasHuellas.pasar(st, ReglasHuellas.E.SHOWING_SEQUENCE);
    empezarRonda(true);
}

/** "CONTINUAR": victoria compartida (../../final). */
function continuar() {
    ocultarFelicitacion();
    cortarTodo();
    const cierre = textos().cierre || "";
    if (feedbackActivo()) hablar(cierre, "zeus");
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
    gameConfig = JSON.parse(readText("config.json?v=20261114b"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    const problemas = ReglasHuellas.revisarJuego(gameConfig);
    if (problemas.length) console.warn("[PistaHuellas] config.json:", problemas);
    sincronizarDialogoIntro3d();
    armarBaldosas();
    montarAula();
    armarProgreso();
    aplicarAccesibilidadInicial();
    zeusASalida(0);
    window.addEventListener("zeus3d-listo", function () { colocarZeus(posZeus, 0); });
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
    if (window.EscenarioHuellas) fxListo = window.EscenarioHuellas.montar(document.getElementById("efectos-phaser"));

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
    const btnMenu = document.getElementById("btn-menu");
    if (btnMenu) btnMenu.addEventListener("click", function () { history.back(); });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
