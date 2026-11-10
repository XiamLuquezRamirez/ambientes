/**
 * El Espejo de las Posiciones y Lateralidad — control del juego (Polimotor, Transición 5-6 años).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → presentación en el estudio
 * → demo automática (si "Mostrar intro") → botón ¡A jugar! → posturas de los 3 niveles → final → victoria.
 *
 * Módulos (cada uno en su archivo):
 *   Postura (reglas puras) · Muneco (dibujo SVG articulado) · EspejoAnim (animaciones)
 *   Articulaciones (taller de giro) · Arrastre (arrastre y encaje) · Estudio + EstudioPhaser (ambientación)
 *   EspejoDemo (demostración)
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
let seleccionId = null;
let tomaFicha = null;
const logrados = [];

const ORDEN_BANDEJA = ["cabeza", "tronco", "brazo_izq", "brazo_der", "pierna_izq", "pierna_der"];

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

function estudio() {
    return window.Estudio || null;
}

function taller() {
    return window.Articulaciones;
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

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

function hablar(texto, pj) {
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    return TextoVoz.hablar(texto, pj || "zoe");
}

function hablarPieza(plantilla, id, pj) {
    return hablar(Postura.texto(plantilla, id), pj);
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
    $("#principal").css("display", "flex").hide().fadeIn(800);
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
    { key: "resaltarDestino", label: "Resaltar articulación destino" },
    { key: "pistaPorFallos", label: "Pistas por errores" },
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
    actualizarProgreso();
    if (ronda) marcarObjetivos();
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

function barajar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

function armarRondas() {
    const n = Math.max(1, Number(cfgJuego().posturasPorEtapa) || 1);
    rondas = [];
    (gameConfig.etapas || []).forEach(function (etapa) {
        barajar(etapa.posturas || []).slice(0, n).forEach(function (p) {
            rondas.push({ etapa: etapa, postura: p });
        });
    });
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    armarRondas();
    montarTablero();
    document.body.classList.add("demo-lock");
    ponerMision("", textos().nombreCorto || "El Espejo de las Posiciones", []);

    if (estudio()) await estudio().presentar();
    if (introOmitida || !introDesdeEmpecemos) {
        ponerMision("Desafío", textos().desafio, []);
        await hablar(textos().desafio, "zeus");
    }

    if (acc().mostrarIntro && window.EspejoDemo) {
        enDemo = true;
        ajustarPersonajeDemo();
        try {
            await window.EspejoDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[Espejo] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        await esperarBotonComenzar();
    }
    document.body.classList.remove("demo-lock");
    empezarRonda(0);
}

/**
 * El personaje 3D de la demo se para en el piso del espejo del modelo, sin taparle las piernas:
 * su alto va desde el borde inferior de la pantalla hasta un poco bajo los pies de Zeus.
 */
function ajustarPersonajeDemo() {
    const modelo = svgModelo();
    if (!modelo) return;
    const pies = Postura.ESQUELETO.sockets.cadera_der.y + Postura.ESQUELETO.pierna.l1 + 66;
    const ctm = modelo.getScreenCTM();
    if (!ctm) return;
    const pt = modelo.createSVGPoint();
    pt.x = 0;
    pt.y = pies;
    const yPies = pt.matrixTransform(ctm).y;
    const alto = Math.max(210, Math.min(window.innerHeight * 0.45, window.innerHeight - yPies + 50));
    document.documentElement.style.setProperty("--tutorial-alto", Math.round(alto) + "px");
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

// ------------------------------------------------------------------ tablero

function svgModelo() {
    return document.getElementById("modelo-svg");
}

function svgConstruccion() {
    return document.getElementById("construccion-svg");
}

function raizModelo() {
    const s = svgModelo();
    return s ? s.querySelector(".m-figura") : null;
}

function raizConstruccion() {
    const s = svgConstruccion();
    return s ? s.querySelector(".c-piezas") : null;
}

function montarTablero() {
    Muneco.pintar(svgModelo(), Muneco.figura(Postura.neutra()));
    Muneco.pintar(svgConstruccion(),
        '<g class="c-silueta">' + Muneco.silueta() + "</g>" +
        '<g class="c-pista"></g>' +
        '<g class="c-piezas">' + Muneco.ranuras() + "</g>");
    // Los puntos de las articulaciones van encima de las piezas: al colocar el tronco
    // siguen viéndose los hombros y las caderas donde encaja lo que sigue.
    const svg = svgConstruccion();
    const sockets = svg && svg.querySelector(".c-sockets");
    if (sockets) svg.appendChild(sockets);
}

function limpiarConstruccion() {
    const raiz = raizConstruccion();
    if (raiz) raiz.querySelectorAll(".m-slot").forEach(function (g) { g.innerHTML = ""; });
    const pista = svgConstruccion() && svgConstruccion().querySelector(".c-pista");
    if (pista) pista.innerHTML = "";
    document.querySelectorAll("#construccion-svg .c-socket").forEach(function (s) {
        s.classList.remove("ocupado", "objetivo", "listo", "cerca");
    });
    document.querySelectorAll("#construccion-svg .oculta").forEach(function (s) {
        s.classList.remove("oculta");
    });
}

function fichaEl(id) {
    return document.querySelector('#bandeja .ficha[data-id="' + id + '"]');
}

function pintarBandeja(etapa) {
    const bandeja = document.getElementById("bandeja");
    bandeja.innerHTML = "";
    barajar(ORDEN_BANDEJA).forEach(function (id, i) {
        const pz = Postura.PIEZAS[id];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ficha ficha-" + pz.tipo + (pz.lado ? " ficha-" + pz.lado : "");
        b.dataset.id = id;
        b.style.setProperty("--i", i);
        b.setAttribute("aria-label", pz.corto);
        b.innerHTML =
            '<svg class="ficha-svg" viewBox="' + Muneco.vistaFicha(id) + '" aria-hidden="true">' + Muneco.parte(id, { a: 0, b: 0 }) + "</svg>" +
            '<span class="ficha-rotulo">' + (etapa && etapa.etiquetas === false ? "" : pz.corto) + "</span>" +
            '<span class="ficha-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>';
        b.addEventListener("pointerdown", function (ev) { onFichaDown(ev, id); });
        b.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                elegirFicha(id);
            }
        });
        bandeja.appendChild(b);
    });
    bandeja.classList.toggle("sin-rotulos", !!(etapa && etapa.etiquetas === false));
}

/** La ficha marca con un punto azul que la pieza ya fue girada en el taller. */
function actualizarFicha(id) {
    const f = fichaEl(id);
    if (!f || !ronda) return;
    const ang = ronda.piezas[id].ang;
    f.classList.toggle("girada", Math.abs(ang.a) > 0.5 || Math.abs(ang.b) > 0.5);
}

function anguloInicial(postura, id) {
    if (postura.inicio && postura.inicio[id]) return Postura.copiar(postura.inicio[id]);
    return { a: 0, b: 0 };
}

/** Prepara una postura: modelo, silueta vacía, bandeja y taller. */
function cargarPostura(posturaCruda, etapa, opts) {
    opts = opts || {};
    const postura = Postura.normalizarPostura(posturaCruda);
    const piezas = {};
    Postura.IDS.forEach(function (id) {
        piezas[id] = {
            ang: anguloInicial(postura, id),
            colocada: false,
            fallos: 0,
            dijoSeleccion: false,
            orientada: false
        };
    });
    ronda = {
        etapa: etapa || { flexion: true, resaltarPieza: true, etiquetas: true },
        postura: postura,
        pasos: Postura.pasos(posturaCruda && posturaCruda.orden, cfgJuego().ordenPasos),
        pasoIdx: -1,
        piezas: piezas,
        demo: !!opts.demo
    };
    seleccionId = null;
    limpiarConstruccion();
    montarModeloNeutro();
    pintarBandeja(ronda.etapa);
    taller().vaciar("Toca una pieza");
    const nombre = document.getElementById("modelo-nombre");
    if (nombre) nombre.textContent = postura.nombre || "";
    return EspejoAnim.adoptar(raizModelo(), postura.partes, 1000);
}

function montarModeloNeutro() {
    Muneco.pintar(svgModelo(), Muneco.figura(Postura.neutra()));
    const svg = svgModelo();
    if (svg) EspejoAnim.clase(svg, "fig-salto", 900);
}

function objetivo(id) {
    return ronda && ronda.postura.partes[id] ? ronda.postura.partes[id] : { a: 0, b: 0 };
}

function pasoActual() {
    return ronda && ronda.pasos[ronda.pasoIdx] ? ronda.pasos[ronda.pasoIdx] : [];
}

function enPaso(id) {
    return pasoActual().indexOf(id) !== -1;
}

function flexionPara(id) {
    if (!ronda || !Postura.esExtremidad(id) || !ronda.etapa.flexion) return false;
    if (ronda.etapa.pistaFlexion) return Math.abs(objetivo(id).b) > 0.5;
    return true;
}

function ponerMision(kicker, texto, grupo) {
    const k = document.getElementById("mision-nivel");
    const t = document.getElementById("mision-texto");
    if (k) {
        k.textContent = kicker || "";
        k.hidden = !kicker;
    }
    if (t) t.textContent = texto || "";
    const pasos = document.getElementById("mision-pasos");
    if (pasos) {
        pasos.innerHTML = "";
        if (ronda && !ronda.demo) {
            ronda.pasos.forEach(function (g, i) {
                const s = document.createElement("span");
                s.className = "mision-paso" + (i < ronda.pasoIdx ? " hecho" : i === ronda.pasoIdx ? " actual" : "");
                pasos.appendChild(s);
            });
        }
    }
    const m = document.getElementById("mision");
    if (m) EspejoAnim.clase(m, "mision-cambia", 600);
}

/** Resalta en el modelo, la bandeja y la silueta lo que pide el paso actual. */
function marcarObjetivos() {
    const grupo = pasoActual();
    const etapa = ronda ? ronda.etapa : {};
    const modelo = svgModelo();
    if (modelo) {
        modelo.querySelectorAll(".m-parte").forEach(function (p) {
            p.classList.toggle("m-resalte", grupo.indexOf(p.getAttribute("data-id")) !== -1 && !(ronda && ronda.piezas[p.getAttribute("data-id")].colocada));
        });
    }
    document.querySelectorAll("#bandeja .ficha").forEach(function (f) {
        const id = f.dataset.id;
        const colocada = ronda && ronda.piezas[id].colocada;
        f.classList.toggle("colocada", !!colocada);
        f.classList.toggle("fuera-paso", !colocada && grupo.indexOf(id) === -1);
        f.classList.toggle("resaltada", !colocada && grupo.indexOf(id) !== -1 && (!!etapa.resaltarPieza || ronda.demo));
    });
    document.querySelectorAll("#construccion-svg .c-socket").forEach(function (s) {
        const sid = s.getAttribute("data-socket");
        const duenio = Postura.IDS.find(function (id) { return Postura.PIEZAS[id].socket === sid; });
        const mostrar = duenio && grupo.indexOf(duenio) !== -1 && !ronda.piezas[duenio].colocada
            && (!!etapa.resaltarPieza || !!acc().resaltarDestino || !Postura.esExtremidad(duenio));
        s.classList.toggle("objetivo", !!mostrar);
    });
}

function iniciarPaso(i, silencioso) {
    if (!ronda) return;
    ronda.pasoIdx = i;
    const grupo = pasoActual();
    const t = textos();
    const clave = Postura.claveDePaso(grupo);
    const titulo = (t.titulosPaso && t.titulosPaso[clave]) || grupo.map(function (id) { return Postura.PIEZAS[id].corto; }).join(" y ");
    const kicker = ronda.demo ? "Demostración" : ronda.etapa.titulo + " · Paso " + (i + 1);
    ponerMision(kicker, titulo, grupo);
    marcarObjetivos();
    if (!silencioso) {
        const frase = (t.paso && t.paso[clave]) || ("Ahora " + grupo.map(function (id) { return Postura.PIEZAS[id].nombre; }).join(" y ") + ".");
        hablar(frase, "zoe");
    }
}

async function empezarRonda(i) {
    if (juegoTerminado) return;
    rondaIdx = i;
    const r = rondas[i];
    if (!r) {
        terminarJuego();
        return;
    }
    bloqueo = true;
    const anterior = rondas[i - 1];
    if (!anterior || anterior.etapa !== r.etapa) {
        if (estudio()) {
            const voz = hablar(r.etapa.intro, "zoe");
            await Promise.all([estudio().etapa(r.etapa.titulo, r.etapa.subtitulo, r.postura.nombre, 2600), voz]);
        }
    } else {
        hablar(textos().nuevaPostura, "zoe");
    }
    await cargarPostura(r.postura, r.etapa);
    actualizarProgreso();
    bloqueo = false;
    iniciarPaso(0, false);
}

// ------------------------------------------------------------------ selección, giro y arrastre

function avisoFueraDePaso(id) {
    const grupo = pasoActual();
    const f = fichaEl(id);
    if (f) EspejoAnim.clase(f, "sacudir", 520);
    sonarEvento("regreso");
    const par = Postura.PIEZAS[id].par;
    if (par && grupo.indexOf(par) !== -1) {
        // Tomó el lado contrario: Zeus orienta la lateralidad.
        resaltarEnModelo(par);
        if (estudio()) estudio().error();
        hablarPieza(textos().errorLado, par, "zeus");
        return;
    }
    const pedida = grupo.find(function (g) { return !ronda.piezas[g].colocada; });
    if (pedida) hablarPieza(textos().otraPieza, pedida, "zoe");
}

function resaltarEnModelo(id) {
    const p = svgModelo() && svgModelo().querySelector('.m-parte[data-id="' + id + '"]');
    if (p) EspejoAnim.clase(p, "m-mira", 1800);
}

function elegirFicha(id) {
    if (!ronda || bloqueo || juegoTerminado || ronda.piezas[id].colocada) return false;
    if (enDemo && !ronda.demo) return false;
    if (!enPaso(id)) {
        avisoFueraDePaso(id);
        return false;
    }
    seleccionar(id);
    return true;
}

function seleccionar(id, silencioso) {
    seleccionId = id;
    const pieza = ronda.piezas[id];
    const giro = Postura.esExtremidad(id);
    const t = textos();
    taller().cargar(id, pieza.ang, {
        flexion: flexionPara(id),
        ayuda: giro ? "Gira con las flechas y arrástralo" : "Arrástralo a la silueta"
    });
    document.querySelectorAll("#bandeja .ficha").forEach(function (f) {
        f.classList.toggle("seleccionada", f.dataset.id === id);
    });
    sonarEvento("agarrar");
    if (estudio()) estudio().seleccion();
    if (!silencioso && !pieza.dijoSeleccion && !ronda.demo) {
        pieza.dijoSeleccion = true;
        hablarPieza(giro ? t.seleccion : t.seleccionSinGiro, id, "zoe");
    }
    pieza.orientada = false;
    comprobarOrientacion(id, false);
}

function comprobarOrientacion(id, avisar) {
    if (!ronda) return false;
    const pieza = ronda.piezas[id];
    const o = Postura.orientacion(id, pieza.ang, objetivo(id), cfgJuego());
    const antes = pieza.orientada;
    pieza.orientada = o.ok;
    if (seleccionId === id) taller().marcarOrientada(o.ok && Postura.esExtremidad(id));
    const socket = document.querySelector('#construccion-svg .c-socket[data-socket="' + Postura.PIEZAS[id].socket + '"]');
    if (socket) socket.classList.toggle("listo", o.ok && Postura.esExtremidad(id) && !pieza.colocada);
    if (Arrastre.activo() && Arrastre.activo().id === id) Arrastre.fijarOrientada(o.ok);
    if (avisar && o.ok && !antes && Postura.esExtremidad(id)) {
        sonarEvento("aparece");
        const pv = taller().pivotePantalla();
        if (estudio()) estudio().orientada(pv ? pv.x : null, pv ? pv.y : null);
        if (!ronda.demo) hablar(textos().orientada, "zoe");
    }
    return o.ok;
}

function onGiro(id, ang) {
    if (!ronda) return;
    ronda.piezas[id].ang = ang;
    actualizarFicha(id);
    sonarEvento("tic");
    comprobarOrientacion(id, true);
}

function puedeArrastrar(id) {
    return ronda && !bloqueo && !juegoTerminado && !ronda.piezas[id].colocada && enPaso(id) && (!enDemo || ronda.demo);
}

function onFichaDown(ev, id) {
    if (ev.button != null && ev.button > 0) return;
    if (enDemo) return;
    const ok = elegirFicha(id);
    if (!ok || !puedeArrastrar(id)) return;
    const ficha = fichaEl(id);
    tomaFicha = { id: id, x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId };
    const mover = function (e) {
        if (!tomaFicha || e.pointerId !== tomaFicha.pointerId) return;
        if (Math.hypot(e.clientX - tomaFicha.x, e.clientY - tomaFicha.y) < 10) return;
        const svg = ficha && ficha.querySelector(".ficha-svg");
        quitar();
        empezarArrastre(e, id, { svg: svg, pivote: { x: 0, y: 0 } });
    };
    const quitar = function () {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", quitar);
        window.removeEventListener("pointercancel", quitar);
        tomaFicha = null;
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", quitar);
    window.addEventListener("pointercancel", quitar);
}

function onTallerArrastre(ev, id) {
    if (enDemo || !puedeArrastrar(id)) return;
    ev.preventDefault();
    empezarArrastre(ev, id, { svg: taller().svg(), pivote: taller().pivoteLocal() });
}

function empezarArrastre(ev, id, origen) {
    if (seleccionId !== id) seleccionar(id, true);
    Arrastre.iniciar(ev, id, ronda.piezas[id].ang, origen, { orientada: ronda.piezas[id].orientada });
    taller().ocultarPieza(true);
    sonarEvento("agarrar");
}

function destinoRegreso() {
    const pv = taller().pivotePantalla();
    if (pv) return { x: pv.x, y: pv.y };
    return { x: window.innerWidth * 0.85, y: window.innerHeight * 0.4 };
}

async function onSoltar(id, socket, ang) {
    if (!ronda) {
        Arrastre.quitar();
        return;
    }
    const resultado = Postura.evaluarSoltado(id, socket, ang, objetivo(id), cfgJuego());
    if (resultado === "encaje") {
        await colocar(id, {});
        return;
    }
    sonarEvento("soltar");
    const pieza = ronda.piezas[id];
    const t = textos();
    if (resultado !== "nada") {
        pieza.fallos += 1;
        if (estudio()) estudio().error();
    }
    const vuelta = Arrastre.regresar(destinoRegreso()).then(function () {
        taller().ocultarPieza(false);
        sonarEvento("regreso");
    });
    if (resultado === "lado") {
        resaltarEnModelo(id);
        hablarPieza(t.errorLado, id, "zeus");
    } else if (resultado === "lugar") {
        resaltarEnModelo(id);
        hablarPieza(t.errorLugar, id, "zeus");
    } else if (resultado === "orientacion") {
        resaltarEnModelo(id);
        hablarPieza(t.errorOrientacion, id, "zoe");
    }
    await vuelta;
    if (resultado !== "nada") mostrarPistaSiToca(id);
}

function mostrarPistaSiToca(id) {
    const a = acc();
    if (a.pistaPorFallos === false || !ronda) return;
    const umbral = Number(a.fallosPista) > 0 ? Number(a.fallosPista) : 2;
    const pieza = ronda.piezas[id];
    if (pieza.fallos < umbral || pieza.pista) return;
    pieza.pista = true;
    const capa = svgConstruccion().querySelector(".c-pista");
    const s = Postura.ESQUELETO.sockets[Postura.PIEZAS[id].socket];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "c-pista-pieza");
    g.setAttribute("data-id", id);
    g.setAttribute("transform", "translate(" + s.x + "," + s.y + ")");
    Muneco.pintar(g, Muneco.parte(id, objetivo(id)));
    capa.appendChild(g);
    setTimeout(function () { hablarPieza(textos().pista, id, "zoe"); }, 1400);
}

function quitarPista(id) {
    const g = svgConstruccion() && svgConstruccion().querySelector('.c-pista-pieza[data-id="' + id + '"]');
    if (g) g.remove();
}

function popPieza(g) {
    return EspejoAnim.tween(420, function (t) {
        const s = 1 + Math.sin(t * Math.PI) * 0.14;
        g.setAttribute("transform", "scale(" + s.toFixed(3) + ")");
    }, "lineal").promesa.then(function () {
        g.removeAttribute("transform");
    });
}

/** Encaje: el fantasma vuela a la articulación y la pieza queda en la figura. */
async function colocar(id, opts) {
    opts = opts || {};
    bloqueo = true;
    const pz = Postura.PIEZAS[id];
    const pieza = ronda.piezas[id];
    pieza.colocada = true;
    pieza.ang = Postura.copiar(objetivo(id));
    await Arrastre.encajar(pz.socket, objetivo(id));
    const slot = raizConstruccion().querySelector('.m-slot[data-slot="' + id + '"]');
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "c-pieza c-recien");
    Muneco.pintar(g, Muneco.parte(id, objetivo(id)));
    slot.innerHTML = "";
    slot.appendChild(g);
    setTimeout(function () { g.classList.remove("c-recien"); }, 900);
    popPieza(g);
    quitarPista(id);
    const sil = svgConstruccion().querySelector(".c-sil-" + id);
    if (sil) sil.classList.add("oculta");
    const socket = svgConstruccion().querySelector('.c-socket[data-socket="' + pz.socket + '"]');
    if (socket) {
        socket.classList.remove("listo", "objetivo", "cerca");
        socket.classList.add("ocupado");
    }
    const sp = Arrastre.socketPantalla(pz.socket);
    sonarEvento("encaje");
    if (estudio()) estudio().acierto(sp ? sp.x : null, sp ? sp.y : null);
    seleccionId = null;
    taller().vaciar(ronda.demo ? "" : "¡Muy bien! Toca otra pieza");
    taller().ocultarPieza(false);
    marcarObjetivos();
    actualizarProgreso();
    if (!opts.silencio && !ronda.demo) hablar(Postura.texto(textos().colocada, id), "zoe");
    await sleep(ronda.demo ? 350 : 650);
    bloqueo = false;
    if (ronda.demo) return;
    if (pasoActual().every(function (x) { return ronda.piezas[x].colocada; })) {
        if (ronda.pasoIdx + 1 < ronda.pasos.length) {
            await sleep(500);
            iniciarPaso(ronda.pasoIdx + 1, false);
        } else {
            completarPostura();
        }
    }
}

function rectFiguraConstruccion() {
    const s = svgConstruccion();
    return s ? s.getBoundingClientRect() : null;
}

async function completarPostura() {
    bloqueo = true;
    ponerMision(ronda.etapa.titulo, "¡Postura completa!", []);
    marcarObjetivos();
    sonarEvento("correcto");
    hablar(textos().posturaLista, "zoe");
    if (estudio()) estudio().posturaLista(rectFiguraConstruccion());
    await EspejoAnim.realizar([raizModelo(), raizConstruccion()], ronda.postura.partes);
    logrados.push(ronda.postura.partes);
    actualizarProgreso();
    await sleep(700);
    bloqueo = false;
    empezarRonda(rondaIdx + 1);
}

function actualizarProgreso() {
    const el = document.getElementById("progreso");
    if (!el) return;
    const total = rondas.length;
    el.hidden = !acc().mostrarProgreso || !total || enDemo;
    el.innerHTML = '<i class="fa-solid fa-star"></i> ' + Math.min(logrados.length, total) + " / " + total;
}

// ------------------------------------------------------------------ final

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    if (typeof Swal !== "undefined") Swal.close();
    taller().vaciar("");
    ponerMision("¡Gran función!", "¡Bailamos todas las posturas!", []);
    document.body.classList.add("demo-lock");
    const voz = hablar(textos().final, "zoe");
    if (estudio()) {
        await estudio().final({
            rectFigura: rectFiguraConstruccion,
            rutina: function () {
                return EspejoAnim.rutina([raizModelo(), raizConstruccion()], logrados, { ms: 760, pausa: 480 });
            }
        }).catch(function () {});
    }
    await Promise.race([voz, sleep(2500)]);
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
        if (estudio()) estudio().limpiar();
    }, 400);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    return {
        cancelado: function () { return juegoTerminado; },
        textos: textos,
        demo: function () { return gameConfig.demo || null; },
        cargar: function (postura) {
            return cargarPostura(postura, { flexion: true, pistaFlexion: false, resaltarPieza: true, etiquetas: true }, { demo: true });
        },
        paso: function (i) { iniciarPaso(i, true); },
        mision: function (kicker, texto) { ponerMision(kicker, texto, []); },
        ficha: fichaEl,
        resaltarFicha: function (id, on) {
            const f = fichaEl(id);
            if (f) f.classList.toggle("demo-foco", !!on);
        },
        seleccionar: function (id) { seleccionar(id, true); },
        girar: function (junta, dir) { return taller().girar(junta, dir); },
        boton: function (junta, dir) { return taller().boton(junta, dir); },
        angulo: function (id) { return ronda ? Postura.copiar(ronda.piezas[id].ang) : null; },
        objetivo: objetivo,
        pivoteTaller: function () { return taller().pivotePantalla(); },
        socket: function (id) { return Arrastre.socketPantalla(Postura.PIEZAS[id].socket); },
        /** Arrastre automático desde el taller hasta la articulación; onFrame(pivotePx). */
        llevar: async function (id, ms, onFrame) {
            const desde = taller().pivotePantalla() || destinoRegreso();
            const hasta = Arrastre.socketPantalla(Postura.PIEZAS[id].socket);
            Arrastre.crearEn(id, ronda.piezas[id].ang, { x: desde.x, y: desde.y });
            taller().ocultarPieza(true);
            sonarEvento("agarrar");
            await Arrastre.llevar({ x: desde.x, y: desde.y }, hasta, ms || 1200, onFrame);
            await colocar(id, { silencio: true });
        },
        realizar: function () {
            sonarEvento("correcto");
            if (estudio()) estudio().posturaLista(rectFiguraConstruccion());
            return EspejoAnim.realizar([raizModelo(), raizConstruccion()], ronda.postura.partes);
        },
        terminar: function () {
            ronda = null;
            seleccionId = null;
            taller().vaciar("Toca una pieza");
            limpiarConstruccion();
            montarModeloNeutro();
            document.getElementById("bandeja").innerHTML = "";
            const nombre = document.getElementById("modelo-nombre");
            if (nombre) nombre.textContent = "";
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

    if (estudio()) estudio().montar();
    montarTablero();
    taller().montar({
        raiz: document.getElementById("taller"),
        svg: document.getElementById("taller-svg"),
        ayuda: document.getElementById("taller-ayuda"),
        rotuloP: document.getElementById("taller-rotulo-p"),
        rotuloD: document.getElementById("taller-rotulo-d")
    }, {
        paso: cfgJuego().pasoGiro,
        onGiro: onGiro,
        onArrastre: onTallerArrastre
    });
    Arrastre.configurar({
        tablero: svgConstruccion(),
        radio: cfgJuego().radioEncaje,
        radioOrientada: cfgJuego().radioEncajeOrientada,
        onSoltar: onSoltar
    });

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
    window.addEventListener("resize", function () { if (enDemo) ajustarPersonajeDemo(); });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
