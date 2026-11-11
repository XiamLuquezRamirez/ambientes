/**
 * El Toque Mágico de las Cosquillas — control del juego (Polimotor, Prejardín 3-4 años).
 *
 * Flujo: pantalla de inicio → intro 3D (Zoe y Zeus) → PedniaEdad → presentación en el espejo
 * (Zoe aparece y saluda) → demo automática (si "Mostrar intro") → botón ¡A jugar!
 * → 3 rondas de 4 partes al azar (de 9: ojos, nariz, boca, manos, orejas, cabello, barriga, rodillas, pies)
 * → final en el espejo → victoria.
 *
 * Módulos (cada uno en su archivo):
 *   Retos (reglas puras) · Personaje (dibujo de Zoe) · Vestidor (fondo SVG)
 *   EspejoPhaser (escena Phaser 4 y zonas táctiles) · ZoeAnim (animaciones) · CosquillasDemo (demostración)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let juegoTerminado = false;
let enDemo = false;
let bloqueo = false;
let rondas = [];
let rondaIdx = -1;
let ronda = null;
let retoIdx = -1;
let reto = null;
let esperandoToque = false;
let erroresReto = 0;
let aciertos = 0;
let ultimaFrase = {};
let ayuda = { brillo: null, voz: null, repetir: null, brilloOn: false, token: 0 };

const ICONOS_PARTE = {
    ojos: '<svg viewBox="0 0 40 40"><ellipse cx="12" cy="20" rx="8" ry="10" fill="#fff" stroke="#5a3226" stroke-width="2"/><circle cx="12" cy="22" r="5" fill="#5a3322"/><ellipse cx="28" cy="20" rx="8" ry="10" fill="#fff" stroke="#5a3226" stroke-width="2"/><circle cx="28" cy="22" r="5" fill="#5a3322"/></svg>',
    nariz: '<svg viewBox="0 0 40 40"><path d="M20,6 Q16,20 12,26 Q12,32 20,32 Q28,32 28,26 Q24,20 20,6 Z" fill="#eaa694" stroke="#c97a62" stroke-width="2"/><circle cx="16" cy="28" r="2" fill="#a5604c"/><circle cx="24" cy="28" r="2" fill="#a5604c"/></svg>',
    boca: '<svg viewBox="0 0 40 40"><path d="M6,15 Q20,20 34,15 Q31,33 20,33 Q9,33 6,15 Z" fill="#a74c3a"/><path d="M8,16 Q20,21 32,16 L31,20 Q20,24 9,20 Z" fill="#fff"/><path d="M14,29 Q20,24 26,29 Q20,33 14,29 Z" fill="#e8737a"/></svg>',
    orejas: '<svg viewBox="0 0 40 40"><path d="M24,6 Q36,8 34,22 Q33,30 26,32 Q22,34 20,30 Q22,26 24,24 Q28,20 26,14 Q22,10 18,14" fill="#f2c6b9" stroke="#d99a86" stroke-width="2.5"/><path d="M14,10 Q4,18 10,30 M8,6 Q-2,18 4,34" stroke="#7cc4ec" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
    cabello: '<svg viewBox="0 0 40 40"><path d="M6,26 C4,10 14,4 20,4 C26,4 36,10 34,26 C30,20 26,16 20,17 C14,16 10,20 6,26 Z" fill="#984c2c"/><path d="M6,22 Q0,28 3,36 Q6,30 9,32 Z M34,22 Q40,28 37,36 Q34,30 31,32 Z" fill="#984c2c"/><circle cx="8" cy="22" r="3" fill="#7cc4ec"/><circle cx="32" cy="22" r="3" fill="#7cc4ec"/><path d="M26,8 l3,4 -3,4 -3,-4Z" fill="#f7e36a"/></svg>',
    barriga: '<svg viewBox="0 0 40 40"><path d="M8,6 L32,6 L36,34 Q20,38 4,34 Z" fill="#e1709c"/><path d="M20,26 C10,20 10,13 15,12 C18,11 20,14 20,16 C20,14 22,11 25,12 C30,13 30,20 20,26 Z" fill="#f7e36a"/></svg>',
    rodillas: '<svg viewBox="0 0 40 40"><rect x="9" y="2" width="9" height="36" rx="4.5" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/><rect x="22" y="2" width="9" height="36" rx="4.5" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/><path d="M9,20 Q13.5,24 18,20 M22,20 Q26.5,24 31,20" stroke="#c97a62" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="13.5" cy="18" r="3" fill="#f39a9a" opacity=".6"/><circle cx="26.5" cy="18" r="3" fill="#f39a9a" opacity=".6"/></svg>',
    pies: '<svg viewBox="0 0 40 40"><path d="M3,30 L3,22 Q3,15 10,15 L13,15 Q19,16 19,27 Q19,32 15,32 L5,32 Q3,32 3,30 Z" fill="#a9dcf6" stroke="#5fb0e0" stroke-width="2"/><path d="M21,30 L21,22 Q21,15 28,15 L31,15 Q37,16 37,27 Q37,32 33,32 L23,32 Q21,32 21,30 Z" fill="#a9dcf6" stroke="#5fb0e0" stroke-width="2"/><rect x="6" y="9" width="8" height="7" fill="#f59ac0"/><rect x="24" y="9" width="8" height="7" fill="#f59ac0"/></svg>',
    manos: '<svg viewBox="0 0 40 40"><g fill="#f2c6b9" stroke="#d99a86" stroke-width="2"><rect x="9" y="6" width="5" height="16" rx="2.5"/><rect x="14.5" y="4" width="5" height="18" rx="2.5"/><rect x="20" y="5" width="5" height="17" rx="2.5"/><rect x="25.5" y="8" width="5" height="15" rx="2.5"/><path d="M6,20 Q4,14 8,15 L11,20 Z"/><rect x="8" y="17" width="23" height="17" rx="8"/></g></svg>'
};

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

function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// ------------------------------------------------------------------ accesos a módulos

function sonido() {
    return (window.PedniaAudio && window.PedniaAudio.activo) ? window.PedniaAudio : null;
}

function sonarEvento(nombre, opts) {
    return !!(sonido() && sonido().tieneTema() && sonido().evento(nombre, opts));
}

function espejo() {
    return window.EspejoPhaser || null;
}

function anim() {
    return window.ZoeAnim || null;
}

function vestidor() {
    return window.Vestidor || null;
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

function parteCfg(parte) {
    return (gameConfig.partes || {})[parte] || {};
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

/** Elige una frase de una lista sin repetir la anterior. */
function frase(clave) {
    const v = textos()[clave];
    if (!Array.isArray(v)) return v || "";
    if (v.length < 2) return v[0] || "";
    let i = Math.floor(Math.random() * v.length);
    if (i === ultimaFrase[clave]) i = (i + 1) % v.length;
    ultimaFrase[clave] = i;
    return v[i];
}

// ------------------------------------------------------------------ guía (zona lateral)

let tGesto = null;

function guia3d() {
    return window.Guia3D && window.Guia3D.listo() ? window.Guia3D : null;
}

function gestoGuia(gesto) {
    if (guia3d() && gesto && gesto !== "habla") guia3d().gesto(gesto);
    const g = document.getElementById("guia");
    if (!g) return;
    g.classList.remove("habla", "senala", "celebra", "duda");
    void g.offsetWidth;
    // Solo clases con animación CSS propia: "final" chocaría con .final de la victoria compartida (fondo azul).
    if (["habla", "senala", "celebra", "duda"].indexOf(gesto) >= 0) g.classList.add(gesto);
    clearTimeout(tGesto);
    tGesto = setTimeout(function () { g.classList.remove("habla", "senala", "celebra", "duda"); }, 1900);
}

/**
 * Quién dice qué: Zeus (la guía lateral) da instrucciones, pistas y errores SIEMPRE en tercera persona
 * ("los ojos de Zoe") y en su nube. Zoe solo dice sus propias reacciones (saludo, risas, final) en primera
 * persona, en una nube aparte junto a su cabeza en el espejo, para que no parezca que Zeus habla de sí mismo.
 */
let tGloboZoe = null;

function globoZoe(texto) {
    const caja = document.getElementById("zoe-globo");
    const span = document.getElementById("zoe-globo-texto");
    if (!caja || !span) return;
    clearTimeout(tGloboZoe);
    if (!texto) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.hidden = false;
    ubicarGloboZoe();
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/** La nube de Zoe va al lado de su cabeza (a la derecha), sin salirse de la zona del espejo. */
function ubicarGloboZoe() {
    const caja = document.getElementById("zoe-globo");
    const zona = document.getElementById("espejo-zona");
    if (!caja || caja.hidden || !zona || !espejo() || !espejo().listo()) return;
    const z = zona.getBoundingClientRect();
    const coleta = espejo().puntoDe("coleta_izq");
    const pelo = espejo().puntoDe("cabello");
    if (!coleta || !pelo) return;
    const w = caja.offsetWidth;
    const h = caja.offsetHeight;
    // Más allá de la coleta, para no tapar la cara, las orejas ni el cabello (que también se tocan).
    let x = coleta.x - z.left + 0.06 * z.width;
    let y = pelo.y - z.top - 10;
    x = Math.max(4, Math.min(x, z.width - w - 4));
    y = Math.max(4, Math.min(y, z.height - h - 4));
    caja.style.left = x + "px";
    caja.style.top = y + "px";
}

function callarGloboZoe(ms) {
    clearTimeout(tGloboZoe);
    tGloboZoe = setTimeout(function () { globoZoe(""); }, ms != null ? ms : 1200);
}

/** Nube de Zeus (zona lateral). */
function globo(texto, pj) {
    if (pj === "zoe") {
        globoZoe(texto);
        return;
    }
    const caja = document.getElementById("guia-globo");
    const span = document.getElementById("guia-texto");
    if (!caja || !span) return;
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto || "") : (texto || "");
    caja.classList.toggle("vacio", !texto);
    const largo = span.textContent.length;
    caja.classList.toggle("largo", largo > 70 && largo <= 120);
    caja.classList.toggle("muy-largo", largo > 120);
    caja.style.borderColor = pj === "zeus" ? "#9fd6ff" : "";
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

function hablar(texto, pj, gesto) {
    const quien = pj || "zoe";
    globo(texto, quien);
    if (quien === "zeus") gestoGuia(gesto || "senala");
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        if (quien === "zoe") callarGloboZoe(2200);
        return Promise.resolve();
    }
    if (quien === "zoe" && anim()) anim().hablando(true);
    if (quien === "zeus" && guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (quien === "zoe" && anim()) anim().hablando(false);
        if (quien === "zoe") callarGloboZoe();
        if (quien === "zeus" && guia3d()) guia3d().hablar(false);
    });
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
    // Fundido por opacidad (no display:none) para que Phaser no pierda el tamaño del espejo.
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    if (espejo()) espejo().reacomodar();
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
    const icono = document.querySelector("#btn-menu-vol i");
    if (icono) {
        icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
    }
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
    if (slider) slider.value = String(pct);
    if (val) val.textContent = String(pct);
    aplicarVolumenCalibrado(pct);
}

const ACC_OPCIONES = [
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
    { key: "ayudaAutomatica", label: "Brillo de ayuda tras varios errores" },
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
        input.checked = op.key === "mostrarFeedBack" ? gameConfig.mostrarFeedBack !== false : !!acc()[op.key];
        input.addEventListener("change", function () {
            if (op.key === "mostrarFeedBack") gameConfig.mostrarFeedBack = input.checked;
            else gameConfig.accesibilidad[op.key] = input.checked;
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
    if (!a.ayudaAutomatica && reto && espejo()) {
        espejo().brillo(reto.parte, { on: false });
        ayuda.brilloOn = false;
    }
}

// ------------------------------------------------------------------ progreso (zona superior)

function pintarProgreso(partesDemo) {
    const caja = document.getElementById("progreso-partes");
    const iconos = document.getElementById("progreso-iconos");
    const etiqueta = document.getElementById("progreso-ronda");
    if (!caja || !iconos) return;
    const lista = partesDemo || (ronda ? ronda.retos.map(function (r) { return r.parte; }) : []);
    caja.hidden = !acc().mostrarProgreso || !lista.length;
    if (etiqueta) {
        etiqueta.textContent = partesDemo ? "Demo" : (ronda ? Retos.plantilla(textos().rondaRotulo || "Ronda {n} de {total}", { n: ronda.numero, total: rondas.length }) : "");
    }
    iconos.innerHTML = "";
    lista.forEach(function (parte, i) {
        const b = document.createElement("span");
        b.className = "parte-burbuja";
        b.dataset.parte = parte;
        b.dataset.indice = String(i);
        b.title = parteCfg(parte).nombre || parte;
        b.innerHTML = ICONOS_PARTE[parteCfg(parte).icono || parte] || "";
        if (!partesDemo) {
            if (i < retoIdx) b.classList.add("lograda");
            if (i === retoIdx && esperandoToque) b.classList.add("actual");
        }
        iconos.appendChild(b);
    });
}

function marcarBurbuja(indice, clase) {
    const b = document.querySelector('.parte-burbuja[data-indice="' + indice + '"]');
    if (!b) return;
    b.classList.remove("actual", "lograda");
    if (clase) b.classList.add(clase);
}

// ------------------------------------------------------------------ edad y partida

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

/** Zoe aparece en el espejo y saluda. Si la intro 3D no se vio completa, dice la bienvenida entera. */
async function presentar() {
    if (!espejo() || !anim()) return;
    await espejo().montar(document.getElementById("espejo-phaser"));
    espejo().reacomodar();
    await anim().aparecer();
    anim().reposo(true);
    if (guia3d()) guia3d().gesto("saluda");
    const completa = introOmitida || !introDesdeEmpecemos;
    const voz = hablar(completa ? textos().bienvenida : textos().saludoCorto, "zoe");
    await anim().saludo();
    await Promise.race([voz, sleep(completa ? 9000 : 4000)]);
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    rondas = Retos.armarPartida(gameConfig);
    document.body.classList.add("demo-lock");
    await presentar();

    if (acc().mostrarIntro && window.CosquillasDemo) {
        enDemo = true;
        try {
            await window.CosquillasDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[Cosquillas] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        await esperarBotonComenzar();
    }
    document.body.classList.remove("demo-lock");
    empezarRonda(0);
}

function esperarBotonComenzar() {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = textos().botonComenzar || "¡A jugar!";
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

// ------------------------------------------------------------------ rondas y retos

async function empezarRonda(i) {
    if (i >= rondas.length) {
        terminarJuego();
        return;
    }
    rondaIdx = i;
    ronda = rondas[i];
    retoIdx = -1;
    reto = null;
    pintarProgreso();
    if (i > 0) {
        mostrarCartel(Retos.plantilla(textos().rondaRotulo || "Ronda {n} de {total}", { n: ronda.numero, total: rondas.length }), "", 1600);
        await sleep(900);
    }
    siguienteReto();
}

async function siguienteReto() {
    if (juegoTerminado) return;
    retoIdx++;
    if (!ronda || retoIdx >= ronda.retos.length) {
        completarRonda();
        return;
    }
    reto = ronda.retos[retoIdx];
    erroresReto = 0;
    esperandoToque = true;
    bloqueo = false;
    pintarProgreso();
    if (espejo()) espejo().habilitar(true);
    const miReto = reto;
    await hablar(reto.texto, reto.personaje || "zeus");
    if (reto === miReto && esperandoToque) programarAyuda();
}

// ------------------------------------------------------------------ ayuda progresiva

function limpiarAyuda(quitarBrillo) {
    clearTimeout(ayuda.brillo);
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
    if (quitarBrillo && ayuda.brilloOn && reto && espejo()) {
        espejo().brillo(reto.parte, { on: false });
        ayuda.brilloOn = false;
    }
}

function encenderBrillo() {
    if (!reto || !esperandoToque || ayuda.brilloOn || !acc().ayudaAutomatica || !espejo()) return;
    ayuda.brilloOn = true;
    espejo().brillo(reto.parte, { on: true });
    sonarEvento("aparece");
}

/**
 * Sin tocar nada: a los 8 s Zeus da la pista del reto y luego repite la instrucción de vez en cuando.
 * El pulso dorado NO sale por tiempo: solo tras varios errores en la misma parte (ver fallar()).
 */
function programarAyuda() {
    limpiarAyuda(false);
    if (!reto || !esperandoToque) return;
    const cfg = cfgJuego();
    const token = ayuda.token;
    const miReto = reto;
    ayuda.voz = setTimeout(function () {
        if (token !== ayuda.token || reto !== miReto || !esperandoToque) return;
        hablar(miReto.ayuda || miReto.texto, "zeus").then(function () {
            if (token !== ayuda.token || reto !== miReto || !esperandoToque) return;
            const repetir = function () {
                ayuda.repetir = setTimeout(function () {
                    if (token !== ayuda.token || reto !== miReto || !esperandoToque) return;
                    hablar(miReto.texto, miReto.personaje || "zeus").then(repetir);
                }, Number(cfg.ayudaRepetirMs) || 9000);
            };
            repetir();
        });
    }, Number(cfg.ayudaVozMs) || 8000);
}

// ------------------------------------------------------------------ toques

function onToque(zonaId) {
    if (enDemo || juegoTerminado || bloqueo || !esperandoToque || !reto) return;
    if (zonaId === "cuerpo") {
        // Explorar otra parte de Zoe: un meneíto, sin error.
        if (anim()) anim().cosquilla();
        sonarEvento("tic");
        programarAyuda();
        return;
    }
    if (Retos.esCorrecta(reto, zonaId)) {
        acertar(zonaId);
    } else {
        fallar(zonaId);
    }
}

async function acertar() {
    bloqueo = true;
    esperandoToque = false;
    limpiarAyuda(true);
    if (espejo()) espejo().habilitar(false);
    if (TextoVoz.detener) TextoVoz.detener();
    const parte = reto.parte;
    const actual = reto;
    aciertos++;
    if (!sonarEvento(parteCfg(parte).sonido || "acierto")) {
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.8);
    }
    if (vestidor()) vestidor().acierto();
    marcarBurbuja(retoIdx, "lograda");
    gestoGuia("celebra");
    globo("", "zeus"); // la nube de Zeus se vacía: ahora habla Zoe
    const voz = hablar(actual.acierto || "¡Muy bien!", "zoe");
    await (anim() ? anim().reaccion(parte) : sleep(1200));
    await Promise.race([voz, sleep(2500)]);
    await sleep(250);
    siguienteReto();
}

async function fallar() {
    erroresReto++;
    limpiarAyuda(false);
    if (anim()) anim().negar();
    gestoGuia("duda");
    sonarEvento("tic");
    // El brillo dorado SOLO aparece cuando el niño se equivoca varias veces en la misma parte.
    if (erroresReto >= (Number(cfgJuego().erroresParaBrillo) || 2)) encenderBrillo();
    const miReto = reto;
    await hablar(frase("error"), "zeus", "duda");
    if (reto === miReto && esperandoToque) programarAyuda();
}

// ------------------------------------------------------------------ fin de ronda y final

let tCartel = null;

function mostrarCartel(titulo, sub, ms, clase) {
    const c = document.getElementById("espejo-cartel");
    if (!c) return;
    document.getElementById("espejo-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("espejo-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.classList.toggle("arriba", clase === "arriba");
    c.hidden = false;
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
    if (ms) tCartel = setTimeout(function () { c.hidden = true; }, ms);
}

async function completarRonda() {
    esperandoToque = false;
    reto = null;
    if (espejo()) espejo().habilitar(false);
    if (rondaIdx >= rondas.length - 1) {
        terminarJuego();
        return;
    }
    bloqueo = true;
    if (espejo()) {
        espejo().luces("fiesta");
        espejo().destello(0.55);
    }
    sonarEvento("correcto");
    gestoGuia("celebra");
    const voz = hablar(textos().rondaCompleta, "zeus", "celebra");
    if (anim()) await anim().alegria(1);
    await Promise.race([voz, sleep(4000)]);
    if (espejo()) espejo().luces("calma");
    bloqueo = false;
    empezarRonda(rondaIdx + 1);
}

/**
 * Zeus camina desde su panel hasta la pasarela (a la izquierda de donde desfila Zoe).
 * Se mide en pantalla porque Zeus vive en otro lienzo (three.js) y Zoe en el de Phaser.
 */
function caminarZeusAPasarela() {
    const g = guia3d();
    const lienzo = g && g.lienzo();
    const zona = document.getElementById("espejo-zona");
    if (!lienzo || !zona) return Promise.resolve();
    const z = zona.getBoundingClientRect();
    const l = lienzo.getBoundingClientRect();
    const xDestino = z.left + z.width * 0.06;
    const pisoDestino = z.bottom - z.height * 0.03;
    return g.desfilar(xDestino - (l.left + l.width / 2), pisoDestino - l.bottom, 2600);
}

/**
 * Final "Desfile en la alfombra" (elegido por el usuario): todo el vestidor participa.
 *   1. Baja la luz, la alfombra se vuelve pasarela con focos y bajan los haces de luz (Vestidor.desfile).
 *   2. El espejo destella y desaparece: Zoe sale al cuarto (EspejoPhaser.salirDelEspejo + ZoeAnim.salir).
 *   3. Zoe desfila con poses mientras Zeus camina hasta la pasarela; la ropa vuela, los sombreros saltan
 *      y hay flashes de cámara.
 *   4. Cartel "¡MUY BIEN!" arriba, aplausos y confeti; luego la victoria compartida.
 */
async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    esperandoToque = false;
    limpiarAyuda(true);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-desfile");
    if (espejo()) espejo().habilitar(false);
    globo("", "zeus");

    // 1. El cuarto se prepara para el desfile.
    if (vestidor()) vestidor().desfile(true);
    if (espejo()) espejo().luces("fiesta");
    const anuncio = hablar(textos().desfileAnuncio, "zeus", "celebra");
    await sleep(1400);

    // 2. Zoe sale del espejo.
    sonarEvento("aparece");
    if (espejo()) await espejo().salirDelEspejo();
    if (anim()) await anim().salir();
    await Promise.race([anuncio, sleep(1500)]);

    // 3. Desfile: Zoe en la pasarela y Zeus camina hasta ella.
    globo("", "zeus");
    const voz = hablar(textos().final, "zoe");
    const zeus = caminarZeusAPasarela();
    await Promise.all([anim() ? anim().desfilar() : sleep(5000), zeus]);

    // 4. Cierre.
    sonarEvento("correcto");
    mostrarCartel(textos().finalTitulo || "¡MUY BIEN!", textos().finalSub || "Reconociste las partes de mi cuerpo.", 0, "arriba");
    const zona = document.getElementById("espejo-zona");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    gestoGuia("final");
    if (anim()) await anim().alegria(2);
    await Promise.race([voz, sleep(3000)]);
    await sleep(900);
    mostrarVictoria();
}

function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
    if (feedbackActivo()) TextoVoz.hablar(cierre, "zeus");
    setTimeout(function () {
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
        if (vestidor()) {
            vestidor().fiesta(false);
            vestidor().desfile(false);
        }
    }, 400);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    let partes = [];
    return {
        cancelado: function () { return juegoTerminado; },
        textos: textos,
        pasos: function () { return gameConfig.demo || []; },
        preparar: function () {
            partes = (gameConfig.demo || []).map(function (p) { return p.parte; });
            pintarProgreso(partes);
        },
        globo: function (texto) { globo(texto, "zeus"); },
        decir: function (texto) { return hablar(texto, "zeus", "senala"); },
        punto: function (parte) { return espejo() ? espejo().puntoDe(parte) : null; },
        actual: function (parte) {
            const i = partes.indexOf(parte);
            if (i >= 0) marcarBurbuja(i, "actual");
        },
        instruccion: function (texto) { return hablar(texto, "zeus"); },
        reaccionar: function (parte) {
            sonarEvento(parteCfg(parte).sonido || "acierto");
            const i = partes.indexOf(parte);
            if (i >= 0) marcarBurbuja(i, "lograda");
            return anim() ? anim().reaccion(parte) : Promise.resolve();
        },
        terminar: function () {
            pintarProgreso([]);
            globo("", null);
        }
    };
}

// ------------------------------------------------------------------ arranque

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    sincronizarDialogoIntro3d();
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
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

    if (vestidor()) vestidor().montar();
    globo("", null);
    // El espejo se arma desde el principio (detrás de la intro) con Zoe invisible hasta presentar().
    if (espejo()) {
        espejo().montar(document.getElementById("espejo-phaser"), { onToque: onToque }).then(function (ok) {
            if (ok && !partidaIniciada) espejo().objetos().zoe.setAlpha(0);
        });
    }

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
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", ubicarGloboZoe);
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
