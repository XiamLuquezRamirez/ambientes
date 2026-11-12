/**
 * La Linterna Reveladora de Partes — control (Polimotor, Prejardín 3-4 años).
 *
 * Flujo: inicio → intro 3D → presentación (habla Zeus) → demo → ¡A jugar!
 * → 3 rondas de 3 partes → victoria. El campamento reacciona a la luz y a cada acierto.
 *
 * Pasar la linterna no completa el reto. El toque solo vale si esa zona ya estaba
 * iluminada en el momento de apoyar el dedo.
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
let ronda = null;
let rondaIdx = 0;
let retoIdx = -1;
let reto = null;
let esperando = false;
let erroresReto = 0;
let tGesto = null;
let tGloboZoe = null;
let tError = 0;
let tCasi = 0;
let ayuda = { voz: null, repetir: null, token: 0 };

const ICONOS = {
    barriga: '<svg viewBox="0 0 40 40"><path d="M8,6 L32,6 L36,34 Q20,38 4,34 Z" fill="#e1709c"/><path d="M20,26 C10,20 10,13 15,12 C18,11 20,14 20,16 C20,14 22,11 25,12 C30,13 30,20 20,26 Z" fill="#f7e36a"/></svg>',
    manos: '<svg viewBox="0 0 40 40"><circle cx="12" cy="22" r="8" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/><circle cx="28" cy="22" r="8" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/></svg>',
    pies: '<svg viewBox="0 0 40 40"><ellipse cx="12" cy="24" rx="8" ry="6" fill="#5b4636"/><ellipse cx="28" cy="24" rx="8" ry="6" fill="#5b4636"/></svg>',
    rodillas: '<svg viewBox="0 0 40 40"><rect x="9" y="2" width="9" height="36" rx="4.5" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/><rect x="22" y="2" width="9" height="36" rx="4.5" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/></svg>',
    hombros: '<svg viewBox="0 0 40 40"><path d="M6,28 Q6,12 20,12 Q34,12 34,28" fill="none" stroke="#f2c6b9" stroke-width="6" stroke-linecap="round"/></svg>',
    orejas: '<svg viewBox="0 0 40 40"><ellipse cx="10" cy="20" rx="6" ry="9" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/><ellipse cx="30" cy="20" rx="6" ry="9" fill="#f2c6b9" stroke="#d99a86" stroke-width="2"/></svg>',
    ojos: '<svg viewBox="0 0 40 40"><ellipse cx="12" cy="20" rx="7" ry="6" fill="#fff" stroke="#333" stroke-width="2"/><ellipse cx="28" cy="20" rx="7" ry="6" fill="#fff" stroke="#333" stroke-width="2"/><circle cx="12" cy="20" r="2.5" fill="#333"/><circle cx="28" cy="20" r="2.5" fill="#333"/></svg>',
    boca: '<svg viewBox="0 0 40 40"><path d="M8,16 Q20,32 32,16" fill="none" stroke="#e1709c" stroke-width="4" stroke-linecap="round"/></svg>',
    cabello: '<svg viewBox="0 0 40 40"><path d="M8,24 Q8,8 20,6 Q32,8 32,24 Q26,16 20,18 Q14,16 8,24 Z" fill="#984c2c"/></svg>'
};

function readText(ruta) {
    var texto = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", ruta, false);
    xmlhttp.send();
    if (xmlhttp.status === 200) texto = xmlhttp.responseText;
    return texto;
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function sonido() {
    return (window.PedniaAudio && window.PedniaAudio.activo) ? window.PedniaAudio : null;
}

function sonarEvento(nombre, opts) {
    return !!(sonido() && sonido().tieneTema() && sonido().evento(nombre, opts));
}

function linterna() { return window.LinternaPhaser || null; }
function anim() { return window.ZoeAnim || null; }
function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
function cfgJuego() { return (gameConfig && gameConfig.juego) || {}; }
function textos() { return (gameConfig && gameConfig.textos) || {}; }

function parteCfg(parte) {
    return (gameConfig.partes && gameConfig.partes[parte]) || {};
}

function feedbackActivo() {
    return !gameConfig || gameConfig.mostrarFeedBack !== false;
}

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
    ubicarGloboZoe(caja);
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/** Pone el globo de Zoe al lado de su cabeza (si se conoce), sin salirse de la escena. */
function ubicarGloboZoe(caja) {
    const zona = document.getElementById("camp-zona");
    const L = linterna();
    const p = L && L.puntoDe ? (L.puntoDe("oreja_der") || L.puntoDe("cabello")) : null;
    if (!zona || !p) {
        caja.classList.remove("junto");
        caja.style.left = "";
        caja.style.top = "";
        return;
    }
    const r = zona.getBoundingClientRect();
    const ancho = caja.offsetWidth || 220;
    const alto = caja.offsetHeight || 50;
    const x = Math.min(r.width - ancho - 8, Math.max(8, p.x - r.left + 34));
    const y = Math.min(r.height - alto - 8, Math.max(70, p.y - r.top - alto - 10));
    caja.classList.add("junto");
    caja.style.left = Math.round(x) + "px";
    caja.style.top = Math.round(y) + "px";
}

function callarGloboZoe(ms) {
    clearTimeout(tGloboZoe);
    tGloboZoe = setTimeout(function () { globoZoe(""); }, ms != null ? ms : 1200);
}

function globo(texto, pj) {
    if (pj === "zoe") {
        const guiaCaja = document.getElementById("guia-globo");
        const guiaSpan = document.getElementById("guia-texto");
        if (guiaCaja && guiaSpan) {
            guiaSpan.textContent = "";
            guiaCaja.classList.add("vacio");
        }
        globoZoe(texto);
        return;
    }
    globoZoe("");
    const caja = document.getElementById("guia-globo");
    const span = document.getElementById("guia-texto");
    if (!caja || !span) return;
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto || "") : (texto || "");
    caja.classList.toggle("vacio", !texto);
    const largo = span.textContent.length;
    caja.classList.toggle("largo", largo > 80 && largo <= 130);
    caja.classList.toggle("muy-largo", largo > 130);
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

function hablar(texto, pj, gesto) {
    const quien = pj || "zeus";
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
    if (!root) return;
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
    if (linterna()) linterna().reacomodar();
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
window.cerrar_anuncio = cerrar_anuncio;

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
    { key: "ayudaAutomatica", label: "Pistas si tarda en encontrar" },
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
}

function enlazarMenus() {
    const btnAcc = document.getElementById("btn-menu-acc");
    const cerrarAcc = document.getElementById("btn-cerrar-acc");
    if (btnAcc) btnAcc.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const panel = document.getElementById("menu-acc-panel");
        setMenuAcc(panel && panel.hidden);
    });
    if (cerrarAcc) cerrarAcc.addEventListener("click", function () { setMenuAcc(false); });
    const btnVol = document.getElementById("btn-menu-vol");
    const cerrarVol = document.getElementById("btn-cerrar-vol");
    const slider = document.getElementById("rango-volumen");
    if (btnVol) btnVol.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const panel = document.getElementById("menu-vol-panel");
        const abrir = panel && panel.hidden;
        setMenuVol(abrir);
        if (abrir) setMenuAcc(false);
    });
    if (cerrarVol) cerrarVol.addEventListener("click", function () { setMenuVol(false); });
    if (slider) slider.addEventListener("input", function () {
        const n = Number(slider.value);
        const val = document.getElementById("vol-val");
        if (val) val.textContent = String(n);
        aplicarVolumenCalibrado(n);
    });
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
    if (linterna()) linterna().contraste(!!a.altoContraste);
    if (!a.ayudaAutomatica && linterna()) linterna().pistas(false);
    pintarProgreso();
}

function pintarProgreso(partesDemo) {
    const caja = document.getElementById("progreso-partes");
    const iconos = document.getElementById("progreso-iconos");
    const etiqueta = document.getElementById("progreso-ronda");
    if (!caja || !iconos) return;
    const lista = partesDemo || (ronda ? ronda.retos.map(function (item) { return item.parte; }) : []);
    caja.hidden = !acc().mostrarProgreso || !lista.length;
    if (etiqueta) {
        if (partesDemo) etiqueta.textContent = "Mira";
        else if (reto && reto.nombre) etiqueta.textContent = "Ronda " + ((ronda && ronda.numero) || 1) + " · " + reto.nombre;
        else etiqueta.textContent = "";
    }
    iconos.innerHTML = "";
    lista.forEach(function (parte, i) {
        const b = document.createElement("span");
        b.className = "parte-burbuja";
        b.dataset.indice = String(i);
        b.innerHTML = ICONOS[parte] || "";
        b.title = (parteCfg(parte).nombre) || parte;
        if (!partesDemo && i < retoIdx) b.classList.add("lograda");
        else if (!partesDemo && i === retoIdx) b.classList.add("actual");
        iconos.appendChild(b);
    });
}

function marcarBurbuja(indice, clase) {
    const b = document.querySelector('.parte-burbuja[data-indice="' + indice + '"]');
    if (!b) return;
    b.classList.remove("actual", "lograda");
    if (clase) b.classList.add(clase);
}

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
        botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + '</strong><br><small>' + nivel.titulo + "</small></button></div>";
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

async function presentar() {
    if (!linterna() || !anim()) return;
    const caja = document.getElementById("camp-phaser");
    await linterna().montar(caja, { onToque: onGesto });
    linterna().reacomodar();
    linterna().contraste(!!acc().altoContraste);
    await anim().aparecer();
    anim().reposo(true);
    if (guia3d()) guia3d().gesto("saluda");
    const voz = hablar(textos().bienvenida, "zeus");
    await Promise.all([linterna().entrada(), anim().saludo()]);
    await Promise.race([voz, sleep(10000)]);
}

async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    rondas = Retos.armarPartida(gameConfig);
    rondaIdx = 0;
    ronda = rondas[0] || null;
    document.body.classList.add("demo-lock");
    await presentar();
    if (acc().mostrarIntro && window.LinternaDemo) {
        enDemo = true;
        try {
            await window.LinternaDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[Linterna] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        await esperarBotonComenzar();
    }
    document.body.classList.remove("demo-lock");
    retoIdx = -1;
    siguienteReto();
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

async function puenteRonda() {
    bloqueo = true;
    esperando = false;
    if (linterna()) linterna().habilitar(false);
    if (window.Campamento && window.Campamento.ronda) window.Campamento.ronda(ronda.numero);
    sonarEvento("correcto");
    mostrarCartel("Ronda " + ronda.numero, ronda.anuncio);
    await hablar(ronda.anuncio, "zeus", "celebra");
    await sleep(280);
    const cartel = document.getElementById("camp-cartel");
    if (cartel) cartel.hidden = true;
}

async function siguienteReto() {
    if (juegoTerminado) return;
    retoIdx++;
    if (!ronda || retoIdx >= ronda.retos.length) {
        if (ronda && rondaIdx + 1 < rondas.length) {
            rondaIdx++;
            ronda = rondas[rondaIdx];
            retoIdx = 0;
            await puenteRonda();
            if (juegoTerminado) return;
        } else {
            terminarJuego();
            return;
        }
    }
    reto = ronda.retos[retoIdx];
    erroresReto = 0;
    esperando = false;
    bloqueo = true;
    limpiarAyuda(true);
    if (linterna()) {
        linterna().habilitar(false);
        linterna().prepararReto(reto);
    }
    pintarProgreso();
    marcarBurbuja(retoIdx, "actual");
    if (linterna()) await linterna().llevarInicio(reto.inicio);
    if (juegoTerminado || reto !== ronda.retos[retoIdx]) return;
    esperando = true;
    bloqueo = false;
    if (linterna()) linterna().habilitar(true);
    const mi = reto;
    await hablar(reto.texto, reto.personaje || "zeus", "senala");
    if (reto === mi && esperando) programarAyuda();
}

function limpiarAyuda(quitar) {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
    if (quitar && linterna()) linterna().pistas(false);
}

function encenderPistas() {
    if (!reto || !esperando || !acc().ayudaAutomatica || !linterna()) return;
    linterna().pistas(true);
    sonarEvento("aparece");
}

function programarAyuda() {
    limpiarAyuda(false);
    if (!reto || !esperando) return;
    const token = ayuda.token;
    const mi = reto;
    const espera = Number(mi.ayudaMs || cfgJuego().ayudaVozMs) || 7000;
    ayuda.voz = setTimeout(function () {
        if (token !== ayuda.token || reto !== mi || !esperando) return;
        encenderPistas();
        var ya = linterna() && linterna().objetivoIluminado();
        var frase = ya ? (mi.confirma || mi.ayuda || mi.texto) : (mi.ayuda || mi.texto);
        hablar(frase, mi.personaje || "zeus").then(function () {
            if (token !== ayuda.token || reto !== mi || !esperando) return;
            const repetir = function () {
                ayuda.repetir = setTimeout(function () {
                    if (token !== ayuda.token || reto !== mi || !esperando) return;
                    hablar(mi.texto, mi.personaje || "zeus").then(repetir);
                }, Number(cfgJuego().ayudaRepetirMs) || 9000);
            };
            repetir();
        });
    }, espera);
}

function onGesto(ev) {
    if (enDemo || juegoTerminado || bloqueo || !esperando || !reto || !ev) return;
    const resultado = Retos.evaluar(reto, ev.zonaId, ev.iluminada);
    if (resultado === "acierto") acertar();
    else if (resultado === "error") fallar();
    else if (resultado === "oscura") casi();
    else if (resultado === "cuerpo") sonarEvento("tic");
}

async function acertar() {
    bloqueo = true;
    esperando = false;
    limpiarAyuda(true);
    if (linterna()) linterna().habilitar(false);
    if (TextoVoz.detener) TextoVoz.detener();
    const actual = reto;
    const parte = actual.parte;
    const efecto = parteCfg(parte).sonido || actual.sonido || "acierto";
    const sfx = window.SonidosLuz;
    if (efecto === "tambor" && sfx) sfx.tambor();
    else sonarEvento(efecto === "tambor" ? "bote" : efecto);
    if (sfx) setTimeout(function () { sfx.acorde(); }, efecto === "tambor" ? 660 : 160);
    marcarBurbuja(retoIdx, "lograda");
    if (sfx) setTimeout(function () { sfx.risita(); }, efecto === "tambor" ? 1150 : 750);
    gestoGuia("celebra");
    if (window.Campamento && window.Campamento.celebrar) window.Campamento.celebrar();
    const quien = actual.aciertoPersonaje || "zeus";
    const voz = hablar(actual.acierto || "¡Muy bien!", quien);
    // Zoe se ríe (después del globo de Zeus, que limpia el de Zoe)
    globoZoe(parte === "barriga" ? "¡Ji, ji, ji! ¡Cosquillas!" : "¡Ji, ji! ¡Sí!");
    callarGloboZoe(2200);
    await Promise.all([
        linterna() ? linterna().destello() : sleep(400),
        linterna() && linterna().fiesta ? linterna().fiesta() : sleep(0),
        anim() ? anim().reaccion(parte) : sleep(800)
    ]);
    await Promise.race([voz, sleep(3200)]);
    await sleep(280);
    siguienteReto();
}

async function fallar() {
    erroresReto++;
    sonarEvento("tic");
    if (anim()) anim().negar();
    gestoGuia("duda");
    if (erroresReto >= (Number(cfgJuego().erroresParaPista) || 2)) encenderPistas();
    const ahora = Date.now();
    if (ahora - tError < 1600) {
        programarAyuda();
        return;
    }
    tError = ahora;
    const mi = reto;
    await hablar(textos().error || "¡Sigue buscando! ¡Tú puedes!", "zeus", "duda");
    if (reto === mi && esperando) programarAyuda();
}

function casi() {
    sonarEvento("aparece");
    const ahora = Date.now();
    if (ahora - tCasi < 2000) return;
    tCasi = ahora;
    const mi = reto;
    hablar(mi.confirma || mi.ayuda, mi.personaje || "zeus").then(function () {
        if (reto === mi && esperando) programarAyuda();
    });
}

let tCartel = null;
function mostrarCartel(titulo, sub) {
    const c = document.getElementById("camp-cartel");
    if (!c) return;
    document.getElementById("camp-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("camp-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.hidden = false;
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
}

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    esperando = false;
    bloqueo = true;
    limpiarAyuda(true);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock");
    if (linterna()) {
        linterna().habilitar(false);
        linterna().prepararReto(null);
    }
    globo("", "zeus");
    const etiqueta = document.getElementById("progreso-ronda");
    if (etiqueta) etiqueta.textContent = "¡Listo!";
    document.querySelectorAll(".parte-burbuja").forEach(function (b) {
        b.classList.remove("actual");
        b.classList.add("lograda");
    });
    sonarEvento("correcto");
    if (linterna()) await linterna().revelar();
    mostrarCartel(textos().finalTitulo, textos().finalSub);
    gestoGuia("celebra");
    const voz = hablar(textos().final, "zeus");
    const zona = document.getElementById("camp-zona");
    if (window.PedniaFx && zona && window.PedniaFx.celebracion) {
        window.PedniaFx.celebracion(zona.getBoundingClientRect());
    }
    if (anim()) await anim().alegria(2);
    await Promise.race([voz, sleep(8000)]);
    await sleep(500);
    mostrarVictoria();
}

function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        if (sonido() && sonido().agacharMusica) sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
    if (feedbackActivo() && typeof TextoVoz !== "undefined") TextoVoz.hablar(cierre, "zeus");
    setTimeout(function () {
        const caja = document.getElementById("final");
        const texto = document.getElementById("texto_final");
        if (texto) texto.textContent = cierre;
        if (caja) {
            caja.hidden = false;
            caja.style.display = "block";
        }
        if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
        else if (typeof iniciarVictoria === "function") iniciarVictoria();
    }, 400);
}

function apiDemo() {
    let partes = [];
    return {
        cancelado: function () { return juegoTerminado; },
        textos: textos,
        preparar: function () {
            partes = (gameConfig.demo || []).map(function (p) { return p.parte; });
            pintarProgreso(partes);
            if (partes.length) marcarBurbuja(0, "actual");
        },
        decir: function (texto) { return hablar(texto, "zeus", "senala"); },
        punto: function (parte) { return linterna() ? linterna().puntoDe(parte) : null; },
        luzPantalla: function () { return linterna() ? linterna().luzPantalla() : null; },
        agarre: function () { return linterna() && linterna().agarre ? linterna().agarre() : null; },
        moverLuz: function (parte, ms) { return linterna() ? linterna().moverLuzA(parte, ms) : Promise.resolve(); },
        reaccionar: function (parte) {
            sonarEvento(parteCfg(parte).sonido || "bote");
            if (linterna()) linterna().destello();
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

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261111p"));
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
    globo("", null);

    const caja = document.getElementById("camp-phaser");
    if (linterna() && caja) {
        linterna().montar(caja, { onToque: onGesto });
    }

    const btnEmpecemos = document.getElementById("btn-empecemos");
    if (btnEmpecemos) btnEmpecemos.addEventListener("click", empecemosJuego);
    const btnOmitir = document.getElementById("btn-omitir-intro3d");
    if (btnOmitir) btnOmitir.addEventListener("click", omitirIntro3d);
    const btnContinuar = document.getElementById("btn-continuar-intro3d");
    if (btnContinuar) btnContinuar.addEventListener("click", function (ev) {
        ev.preventDefault();
        empezarJuegoTrasIntro();
    });
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
    });
});
