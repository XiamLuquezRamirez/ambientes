/**
 * El Memorama de las Partes del Cuerpo — control del juego (Polimotor, Prejardín 3-4 años, juegos de memoria
 * corporal).
 *
 * Flujo: pantalla de inicio → intro 3D compartida (Zeus y Zoe) → PedniaEdad → presentación que dice Zeus
 * (cartel con el título, Zeus 3D entra caminando y da la bienvenida, las cuatro tarjetas caen boca abajo y se
 * iluminan por turnos) → demostración con la mano, también narrada por Zeus (una pareja distinta que se
 * vuelve a esconder y luego dos manos iguales) → Zeus se va → "¡A jugar!" → 3 RONDAS de 4 tarjetas y una
 * última de 6 (las 3 partes que no salieron):
 *   ronda 1 mano y pie · ronda 2 dos partes al azar de ojos/nariz/boca · ronda 3 dos de oreja/cabeza/brazo/pierna
 *   · ronda 4 las tres que sobraron
 * Cada ronda: vista previa de 3 s con cuenta 3-2-1 → partida → "¡RONDA n LISTA!". Tras la ronda 4: celebración →
 * "¡LO LOGRASTE!" con "Volver a jugar" (ronda 1, otras posiciones y otras partes) y "Continuar" (victoria
 * compartida de ../../final).
 *
 * Durante la partida no hay personajes en la escena: Zoe y Zeus solo se oyen. Los estados de cada ronda
 * (preview, waiting, firstCard, secondCard, checking, matched, completed) viven en reglas.js; este archivo los
 * avanza y pide a la escena las animaciones. Cada ronda lleva un número (partidaId): una animación que termina
 * después de un reinicio no toca la ronda nueva.
 *
 * Módulos: ReglasMemorama (estados y rondas, puro) · IconosMemorama (dibujos; los nuevos, copiados de "Une") ·
 * SonidosMemorama (efectos Web Audio) · EscenarioMemorama (Phaser: tablero, tarjetas, volteo y efectos) ·
 * MemoramaDemo (demostración) · Guia3D (Zeus 3D de la presentación y la demo)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let arrancado = false;
let st = null;               // estado de la partida (ReglasMemorama.crear)
let partidaId = 0;
let ordenAnterior = null;
let rondaActual = 0;
let rondaCfg = null;         // ronda en juego (ReglasMemorama.ronda): sus partes elegidas al azar
let usadasPartes = [];       // ids ya jugados en esta partida; la ronda final arma lo que sobra
let encontradas = [];        // partes encontradas en todas las rondas (para la felicitación)
let ayuda = { t: null, token: 0, veces: 0 };
let tAviso = 0;

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

function sfx(nombre) {
    if (window.SonidosMemorama && typeof window.SonidosMemorama[nombre] === "function") window.SonidosMemorama[nombre]();
}

function escenario() {
    return window.EscenarioMemorama && window.EscenarioMemorama.listo() ? window.EscenarioMemorama : null;
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

function tipoCfg(id) {
    return ReglasMemorama.tipo(gameConfig, id) || { id: id, nombre: id };
}

/** Ronda en juego; antes de empezar, la ronda 1 sin sorteo (mano y pie). */
function cfgR() {
    return rondaCfg || ReglasMemorama.ronda(gameConfig, rondaActual);
}

function totalRondas() {
    return ReglasMemorama.rondas(gameConfig).length;
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

function ms(clave, defecto) {
    const n = Number(cfgJuego()[clave]);
    return isFinite(n) && n > 0 ? n : defecto;
}

function vigente(id) {
    return id === partidaId && st && st.estado !== "completed";
}

// ------------------------------------------------------------------ voces (Zoe por defecto, o Zeus)

function hablar(texto, pj) {
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    return TextoVoz.hablar(texto, pj === "zeus" ? "zeus" : "zoe");
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
    // Fundido por opacidad (no display:none) para que Phaser no pierda el tamaño de la escena.
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    if (escenario()) escenario().reacomodar();
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
    const callado = n <= 0 && !feedbackActivo();
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
    if (slider) slider.value = String(pct);
    if (val) val.textContent = String(pct);
    if (voces) voces.checked = feedbackActivo();
    aplicarVolumenCalibrado(pct);
}

const ACC_OPCIONES = [
    { key: "mostrarFeedBack", label: "Voces y mensajes" },
    { key: "altoContraste", label: "Alto contraste" },
    { key: "mostrarIntro", label: "Mostrar intro (presentación)" },
    { key: "ayudaAutomatica", label: "Ayuda visual (las tarjetas se menean)" },
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

// ------------------------------------------------------------------ progreso (barra de abajo)

/** Un espacio por pareja de la ronda actual (con el dibujo de esa parte): gris hasta encontrarla. */
function armarRanuras() {
    const caja = document.getElementById("progreso-ranuras");
    if (!caja) return;
    caja.innerHTML = "";
    ReglasMemorama.tipos(cfgR()).forEach(function (t) {
        const r = document.createElement("span");
        r.className = "ranura";
        r.dataset.tipo = t.id;
        r.title = t.nombre;
        r.innerHTML = '<img alt="" src="' + IconosMemorama.dataUri(t.dibujo || t.id) + '"><i class="fa-solid fa-star ranura-estrella" aria-hidden="true"></i>';
        caja.appendChild(r);
    });
}

function pintarProgreso() {
    const total = ReglasMemorama.tipos(cfgR()).length;
    const hechas = st ? st.parejas.length : 0;
    const caja = document.getElementById("progreso-box");
    if (caja) caja.hidden = !acc().mostrarProgreso;
    const ron = document.getElementById("progreso-ronda");
    if (ron) ron.textContent = (textos().ronda || "RONDA") + " " + (rondaActual + 1) + "/" + ReglasMemorama.rondas(gameConfig).length;
    const rot = document.getElementById("progreso-rotulo");
    if (rot) rot.textContent = (textos().progreso || "PAREJAS ENCONTRADAS") + ":";
    const num = document.getElementById("progreso-num");
    if (num) num.textContent = hechas + "/" + total;
    document.querySelectorAll("#progreso-ranuras .ranura").forEach(function (r) {
        r.classList.toggle("llena", !!(st && st.parejas.indexOf(r.dataset.tipo) >= 0));
    });
}

/** Aviso grande en lugar del progreso (vista previa). Con texto vacío vuelve el progreso. */
function avisoAbajo(texto) {
    const caja = document.getElementById("progreso-box");
    const aviso = document.getElementById("aviso-abajo");
    if (!caja || !aviso) return;
    aviso.textContent = texto || "";
    aviso.hidden = !texto;
    caja.classList.toggle("con-aviso", !!texto);
    if (texto) animarProgreso();
}

function animarProgreso() {
    const c = document.getElementById("progreso-box");
    if (!c) return;
    c.classList.remove("sube");
    void c.offsetWidth;
    c.classList.add("sube");
}

// ------------------------------------------------------------------ carteles y botones

let tCartel = null;

function mostrarCartel(titulo, sub, duracion, arriba) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
    document.getElementById("escenario-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("escenario-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.classList.toggle("arriba", !!arriba);
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

/** Botón grande al centro ("¡A jugar!"). */
function esperarBoton(texto, icono) {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = texto || "¡A jugar!";
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

function bloquear(si) {
    document.body.classList.toggle("juego-bloqueado", !!si);
    if (escenario()) escenario().habilitar(!si);
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

// ------------------------------------------------------------------ Zeus (3D) en la presentación y la demo

/**
 * Zeus (guia-3d.js, modelo nino.glb) entra caminando por la izquierda, se para en el hueco que queda a la
 * izquierda de las tarjetas (zonaGuia) mientras explica y hace la demo, y se va caminando antes de jugar. Se mueve
 * la caja .guia-pj: el lienzo 3D se reencuadra solo. Si el 3D no carga, se ve el GIF de Zeus.
 */
let zeusEnEscena = false;
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
    if (["habla", "senala", "celebra", "duda"].indexOf(gesto) >= 0) g.classList.add(gesto);
    clearTimeout(tGesto);
    tGesto = setTimeout(function () { g.classList.remove("habla", "senala", "celebra", "duda"); }, 1900);
}

/** Nube sobre la cabeza de Zeus con lo que dice (solo mientras está en la escena). */
function nubeZeus(texto) {
    const caja = document.getElementById("zeus-nube");
    const span = document.getElementById("zeus-nube-texto");
    if (!caja || !span) return;
    if (!texto || !zeusEnEscena) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.classList.toggle("larga", span.textContent.length > 110);
    caja.style.setProperty("--dx", "0px");
    caja.hidden = false;
    const r = caja.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    caja.style.setProperty("--dx", Math.round(dx) + "px");
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/** Habla Zeus con su nube y su clip de hablar. */
function hablaZeus(texto, gesto) {
    nubeZeus(texto);
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return sleep(texto ? 1800 : 0);
    if (guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, "zeus").then(function () {
        if (guia3d()) guia3d().hablar(false);
    });
}

function ubicarZeus() {
    const pj = document.querySelector("#guia .guia-pj");
    const z = escenario() ? escenario().zonaGuia() : null;
    if (!pj || !z) return;
    const ancho = Math.max(150, Math.min(z.width * 0.95, 300));
    const alto = Math.min(z.height * 0.92, ancho / 0.5);
    pj.style.left = Math.round(Math.max(z.left, z.right - ancho)) + "px";
    pj.style.top = Math.round(z.bottom - alto) + "px";
    pj.style.width = Math.round(ancho) + "px";
    pj.style.height = Math.round(alto) + "px";
}

function guiaMovil() {
    return window.Guia3D && window.Guia3D.listo() && window.Guia3D.caminar ? window.Guia3D : null;
}

/** Recorrido a pie de la caja de Zeus (left) con el clip de caminar. */
function caminarHasta(pj, x, duracion, lado) {
    const g = guiaMovil();
    if (g) {
        g.mirar(lado);
        g.caminar(true);
    }
    // paso a paso con setTimeout (no transición CSS): avanza aunque el navegador no esté pintando
    const x0 = parseFloat(pj.style.left) || 0;
    const t0 = performance.now();
    pj.dataset.caminando = "1";
    return new Promise(function (resolve) {
        const paso = function () {
            const u = Math.min(1, (performance.now() - t0) / duracion);
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
    return reducido ? 200 : Math.max(1300, Math.min(2600, distancia * 6));
}

async function zeusEntra() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !escenario()) return;
    if (zeusEnEscena) {
        ubicarZeus();
        return;
    }
    zeusEnEscena = true;
    document.body.classList.add("zeus-en-escena");
    ubicarZeus();
    const destino = parseFloat(pj.style.left) || 0;
    const ancho = parseFloat(pj.style.width) || 200;
    pj.style.left = Math.round(-ancho - 20) + "px";
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha");
}

async function zeusSale() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !zeusEnEscena) return;
    nubeZeus("");
    const ancho = parseFloat(pj.style.width) || 200;
    const desde = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, -ancho - 20, duracionPasos(desde + ancho), "izquierda");
    zeusEnEscena = false;
    document.body.classList.remove("zeus-en-escena");
}

// ------------------------------------------------------------------ presentación y demo (las dice Zeus)

/**
 * Presentación: cartel con el título sobre el tablero vacío, Zeus entra caminando y da la bienvenida, las cuatro
 * tarjetas caen boca abajo y se iluminan por turnos mientras Zeus explica el reto.
 */
async function presentar() {
    if (!escenario()) return;
    escenario().reacomodar();
    const completa = acc().mostrarIntro !== false;
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    await Promise.all([zeusEntra(), sleep(2200)]);
    ocultarCartel();
    const voz = hablaZeus(completa ? textos().bienvenida : textos().saludoCorto, "saluda");
    await sleep(500);
    await escenario().entrar();
    await escenario().llamarAtencion();
    await Promise.race([voz, sleep(completa ? 9000 : 4000)]);
    if (completa) {
        gestoGuia("senala");
        await Promise.race([hablaZeus(textos().presentacionZeus, "senala"), sleep(6000)]);
    }
}

/** Demostración con la mano (demo.js) sobre la ronda 1; no cuenta como jugada. */
async function demostrar() {
    if (!window.MemoramaDemo || !escenario()) return;
    rondaActual = 0;
    rondaCfg = ReglasMemorama.ronda(gameConfig, 0);
    const orden = ReglasMemorama.repartir(rondaCfg, Math.random, null);
    escenario().asignar(orden);
    const esc = escenario();
    await window.MemoramaDemo.correr({
        orden: function () { return orden; },
        cancelado: function () { return partidaId > 0; },
        texto: function (clave) { return textos()[clave] || ""; },
        decir: function (texto) { return hablaZeus(texto, "senala"); },
        puntoCarta: function (i) { return esc.puntoCarta(i); },
        voltear: function (i, abrir) {
            // en la demo Zeus nombra cada tarjeta en su narración
            sfx("volteo");
            return esc.voltear(i, abrir);
        },
        noIguales: async function (a, b) {
            sfx("suave");
            esc.noSuave(a, b);
            await sleep(ms("errorVisibleMs", 2000));
            sfx("volteo");
            await Promise.all([esc.voltear(a, false), esc.voltear(b, false)]);
        },
        pareja: function (a, b) {
            sfx("acorde");
            gestoGuia("celebra");
            return esc.pareja(a, b, "mano");
        },
        cerrar: async function () {
            mostrarCartel(textos().demostracionBien || "¡Pareja!", "", 1600);
            await Promise.race([hablaZeus(textos().demoFin, "celebra"), sleep(5000)]);
        },
        terminar: async function () {
            // la demo no deja nada: se apagan los dorados y todo vuelve boca abajo
            await esc.reiniciar();
            nubeZeus("");
        }
    });
    ordenAnterior = orden;
}

/** Arranque único (el selector de edad puede avisar más de una vez). */
async function iniciarJuego() {
    if (arrancado) return;
    arrancado = true;
    bloquear(true);
    await escenario_listo;
    await presentar();
    if (acc().mostrarIntro !== false) await demostrar();
    // Zeus solo acompaña la presentación y la demo: durante la partida solo se oyen las voces
    await zeusSale();
    await esperarBoton(textos().botonComenzar || "¡A jugar!", "fa-solid fa-play");
    empezarRonda(0);
}

// ------------------------------------------------------------------ rondas

/**
 * Ronda i: se eligen las parejas del grupo (4 tarjetas, o 6 en la última con lo que sobró), se reparten
 * (distinto del orden anterior), se ven 3 s con la cuenta 3-2-1, se cierran y empieza el juego.
 */
async function empezarRonda(i) {
    const id = ++partidaId;
    limpiarAyuda();
    bloquear(true);
    rondaActual = i;
    if (i === 0) usadasPartes = [];
    rondaCfg = ReglasMemorama.ronda(gameConfig, i, Math.random, usadasPartes);
    usadasPartes = usadasPartes.concat(rondaCfg.elegidas);
    st = ReglasMemorama.crear(rondaCfg, Math.random, ordenAnterior);
    ordenAnterior = ReglasMemorama.orden(st);
    armarRanuras();
    pintarProgreso();
    const esc = escenario();
    if (!esc) return;
    esc.asignar(ordenAnterior);
    if (i > 0) {
        mostrarCartel(rondaCfg.titulo || ("RONDA " + (i + 1)), "");
        sonarEvento("aparece");
        const voz = hablar(ReglasMemorama.plantilla(rondaCfg.instruccion, { lista: ReglasMemorama.listaPartes(rondaCfg.cartas) }), "zoe");
        await Promise.all([Promise.race([voz, sleep(4000)]), sleep(1800)]);
        // el cartel se va antes de voltear: no debe tapar las tarjetas que hay que memorizar
        ocultarCartel();
        await sleep(400);
        if (id !== partidaId) return;
    }

    // vista previa (estado preview); el aviso va abajo: un cartel sobre el tablero taparía las tarjetas
    avisoAbajo(textos().previaCartel || "¡MIRA Y RECUERDA!");
    hablar(textos().previa, "zoe");
    sfx("volteo");
    await esc.voltearTodas(true, 120);
    if (id !== partidaId) return;
    await esc.cuenta(Number(rondaCfg.previaMs) || ms("previaMs", 3000));
    if (id !== partidaId) return;
    avisoAbajo("");
    sfx("volteo");
    await esc.voltearTodas(false, 90);
    if (id !== partidaId) return;

    ReglasMemorama.iniciar(st);            // preview → waiting
    bloquear(false);
    hablar(textos().aJugar, "zoe");
    programarAyuda();
}

/** Ronda terminada (no la última): festejo corto, "¡RONDA n LISTA!", las tarjetas se cierran y sigue la otra. */
async function siguienteRonda(id) {
    limpiarAyuda();
    bloquear(true);
    sonarEvento("correcto");
    const zona = document.getElementById("escenario-zona");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    mostrarCartel(ReglasMemorama.plantilla(textos().rondaListaTitulo || "¡RONDA {n} LISTA!", { n: rondaActual + 1 }), "");
    await Promise.race([hablar(textos().rondaLista, "zoe"), sleep(4500)]);
    if (id !== partidaId) return;
    ocultarCartel();
    if (escenario()) await escenario().reiniciar();
    if (id !== partidaId) return;
    empezarRonda(rondaActual + 1);
}

/** Toque sobre una tarjeta (EscenarioMemorama → alTocar). */
async function alTocar(i) {
    if (!st) return;
    const id = partidaId;
    const r = ReglasMemorama.tocar(st, i);
    if (!r.ok) {
        // una pareja ya encontrada no se puede volver a tocar: un tic suave y un recordatorio corto
        if (r.motivo === "emparejada") {
            sonarEvento("tic", { vol: 0.6 });
            avisar(textos().yaEncontrada);
        }
        return;
    }
    limpiarAyuda();
    const esc = escenario();
    if (esc) esc.quitarResaltado();
    const t = tipoCfg(r.tipo);
    sfx("volteo");
    hablar(t.voz || t.nombre, "zoe");

    if (r.accion === "primera") {
        if (esc) await esc.voltear(i, true);
        if (id !== partidaId) return;
        programarAyuda();
        return;
    }

    // segunda tarjeta: se bloquea todo hasta terminar de comparar
    bloquear(true);
    if (esc) await esc.voltear(i, true);
    if (id !== partidaId) return;
    const c = ReglasMemorama.comparar(st);
    if (!c) return;
    if (c.pareja) await acertar(c, id);
    else await fallar(c, id);
}

/** Pareja correcta: brillo dorado, estrellas, acorde, celebración según el tipo y progreso. */
async function acertar(c, id) {
    const esc = escenario();
    sfx("acorde");
    pintarProgreso();
    animarProgreso();
    const voz = hablar(tipoCfg(c.tipo).acierto || "¡Muy bien!", "zoe");
    if (esc) await esc.pareja(c.a, c.b, c.tipo);
    if (id !== partidaId) return;
    if (encontradas.indexOf(c.tipo) < 0) encontradas.push(c.tipo);
    const estado = ReglasMemorama.terminarTurno(st);   // matched → waiting | completed
    if (estado === "completed") {
        await Promise.race([voz, sleep(2500)]);
        if (id !== partidaId) return;
        if (rondaActual + 1 < totalRondas()) siguienteRonda(id);
        else terminarJuego(id);
        return;
    }
    bloquear(false);
    programarAyuda();
}

/**
 * Pareja distinta: las dos se quedan a la vista 2 s, suena algo suave y se vuelven a cerrar. Sin vidas, sin
 * puntos y sin mensajes negativos; Zeus recuerda buscar la pareja de la primera tarjeta.
 */
async function fallar(c, id) {
    const esc = escenario();
    sfx("suave");
    if (esc) esc.noSuave(c.a, c.b);
    const primera = tipoCfg(c.tipo);
    await sleep(ms("errorVisibleMs", 2000));
    if (id !== partidaId) return;
    sfx("volteo");
    if (esc) await Promise.all([esc.voltear(c.a, false), esc.voltear(c.b, false)]);
    if (id !== partidaId) return;
    ReglasMemorama.terminarTurno(st);                   // checking → waiting
    bloquear(false);
    hablar(ReglasMemorama.plantilla(textos().recordatorioZeus, {
        articulo: primera.articulo || "la",
        parte: String(primera.nombre || primera.id).toLowerCase()
    }), "zeus");
    programarAyuda();
}

// ------------------------------------------------------------------ ayuda (sin revelar respuestas)

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    ayuda.token++;
}

function avisar(texto) {
    if (Date.now() - tAviso < 3000) return;
    tAviso = Date.now();
    hablar(texto, "zoe");
}

/**
 * Si el niño no toca nada: sin tarjeta abierta (10 s) Zoe invita a voltear una; con una abierta (7 s) invita
 * a buscar la otra. Las tarjetas cerradas se menean un poco; ninguna se abre sola.
 */
function programarAyuda(repeticion) {
    limpiarAyuda();
    // cada toque vuelve a contar desde cero; sin tocar nada, como mucho 3 recordatorios seguidos
    ayuda.veces = repeticion ? (ayuda.veces || 0) : 0;
    if (ayuda.veces >= 3) return;
    if (!st || (st.estado !== "waiting" && st.estado !== "firstCard")) return;
    const token = ayuda.token;
    const segunda = st.estado === "firstCard";
    const espera = segunda ? ms("ayudaSegundaMs", 7000) : ms("ayudaPrimeraMs", 10000);
    ayuda.t = setTimeout(function () {
        if (token !== ayuda.token || !st) return;
        if (st.estado !== "waiting" && st.estado !== "firstCard") return;
        const ahoraSegunda = st.estado === "firstCard";
        ayuda.veces = (ayuda.veces || 0) + 1;
        if (acc().ayudaAutomatica && escenario()) escenario().menear(ReglasMemorama.cerradas(st));
        sonarEvento("aparece", { vol: 0.5 });
        hablar(ahoraSegunda ? textos().ayudaSegunda : textos().ayudaPrimera, "zoe");
        ayuda.t = setTimeout(function repetir() {
            if (token !== ayuda.token) return;
            programarAyuda(true);
        }, Math.max(0, ms("ayudaRepetirMs", 14000) - espera));
    }, espera);
}

// ------------------------------------------------------------------ final

/**
 * Las dos parejas encontradas: las cuatro tarjetas quedan descubiertas y bailan, llueven estrellas doradas,
 * confeti, Zoe y Zeus felicitan y aparece "¡LO LOGRASTE!" con "Volver a jugar" y "Continuar".
 */
async function terminarJuego(id) {
    limpiarAyuda();
    bloquear(true);
    if (typeof Swal !== "undefined") Swal.close();
    const esc = escenario();
    if (esc) esc.celebrarFinal();
    sonarEvento("correcto");
    const zona = document.getElementById("escenario-zona");
    const confeti = function () {
        if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    };
    confeti();
    // "…las dos manos y los dos pies, ¡y también los ojos, la boca…!": las partes que salieron después de la ronda 1
    const otras = encontradas.filter(function (t) { return t !== "mano" && t !== "pie"; }).map(tipoCfg);
    await Promise.race([hablar(ReglasMemorama.plantilla(textos().finalZoe, { lista: ReglasMemorama.listaPartes(otras) }), "zoe"), sleep(9000)]);
    if (id !== partidaId) return;
    confeti();
    await Promise.race([hablar(textos().finalZeus, "zeus"), sleep(4500)]);
    if (id !== partidaId) return;
    mostrarFelicitacion();
}

function mostrarFelicitacion() {
    const caja = document.getElementById("felicitacion");
    if (!caja) return;
    document.getElementById("felicitacion-titulo").textContent = textos().finalTitulo || "¡LO LOGRASTE!";
    document.getElementById("felicitacion-sub").textContent = textos().finalSub || "";
    document.querySelector("#btn-otra-vez span").textContent = textos().botonOtraVez || "Volver a jugar";
    document.querySelector("#btn-continuar span").textContent = textos().botonContinuar || "Continuar";
    const dib = document.getElementById("felicitacion-dibujos");
    if (dib) {
        // un dibujo por cada pareja encontrada en las tres rondas
        dib.innerHTML = "";
        encontradas.forEach(function (t) {
            const img = document.createElement("img");
            img.alt = "";
            img.src = IconosMemorama.dataUri(tipoCfg(t).dibujo || t);
            dib.appendChild(img);
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

/**
 * "Volver a jugar": se apagan los dorados, las tarjetas se cierran y se vuelve a la ronda 1 (sin intro), con
 * otras posiciones y otras partes en las rondas 2, 3 y 4.
 */
async function volverAJugar() {
    ocultarFelicitacion();
    partidaId++;
    limpiarAyuda();
    bloquear(true);
    if (TextoVoz.detener) TextoVoz.detener();
    st = null;
    encontradas = [];
    rondaActual = 0;
    rondaCfg = null;
    armarRanuras();
    pintarProgreso();
    if (escenario()) await escenario().reiniciar();
    sonarEvento("aparece");
    await Promise.race([hablar(textos().otraVez, "zoe"), sleep(3500)]);
    empezarRonda(0);
}

/** "Continuar": victoria compartida (../../final) con sus opciones de siempre. */
function continuar() {
    ocultarFelicitacion();
    if (escenario()) escenario().detenerFinal();
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

let escenario_listo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261113d"));
    introConfig = JSON.parse(readText("../../intro.json"));
    introConfig.conversacion = textos().conversacion || [];
    const problemas = ReglasMemorama.revisarJuego(gameConfig, Object.keys(IconosMemorama.SVG));
    if (problemas.length) console.warn("[Memorama] config.json:", problemas);
    sincronizarDialogoIntro3d();
    armarRanuras();
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

    // La escena se arma desde el principio (detrás de la intro); las tarjetas aparecen en presentar().
    if (window.EscenarioMemorama) {
        escenario_listo = window.EscenarioMemorama.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (ok) {
                window.EscenarioMemorama.enlazar({
                    alTocar: alTocar,
                    puedeResaltar: function (i) { return !!(st && ReglasMemorama.puedeTocar(st, i)); }
                });
            }
            return ok;
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
    const btnOtra = document.getElementById("btn-otra-vez");
    if (btnOtra) btnOtra.addEventListener("click", volverAJugar);
    const btnSeguir = document.getElementById("btn-continuar");
    if (btnSeguir) btnSeguir.addEventListener("click", continuar);
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (zeusEnEscena && pj && !pj.dataset.caminando) ubicarZeus();
        }, 60);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
