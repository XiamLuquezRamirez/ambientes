/**
 * El Cazador de Burbujas Mágicas — control del juego (Polimotor, 3-4 años, coordinación visual:
 * seguimiento visomotor y toque de precisión).
 *
 * Flujo (mismo modelo que "Golpea a los Topos"): pantalla de inicio → intro 3D (Zoe y Zeus) → PedniaEdad →
 * presentación en el parque (el título aparece y se va, Zoe entra caminando con su canasta, flotan
 * burbujas) → demo automática (una burbuja con estrella sube, la mano la sigue y la toca, la estrella cae
 * en la canasta) → "¡Comenzar a jugar!" → 3 rondas de 4 burbujas (Descubrimiento, Exploración, Cazador
 * mágico) → final en el parque iluminado con la canasta llena → victoria compartida.
 *
 * Módulos: ReglasBurbujas (reglas puras) · IconosBurbujas (juguetes) · SonidosBurbujas (Web Audio) ·
 *          EscenarioBurbujas (escena Phaser) · AparicionBurbujas (suelta burbujas) · BurbujasDemo · Guia3D
 *
 * Zoe (3D) se queda de pie junto a su canasta toda la partida, como en la imagen de referencia; su nube de
 * texto solo se ve en la presentación, la demo y el final (durante las rondas solo se oye la voz). Zeus no
 * se dibuja: solo su voz. Sin vidas, sin castigos: la burbuja que se escapa se desvanece con una brisa.
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let rondaIdx = 0;
let atrapadas = 0;
let volando = 0;
let totalAtrapadas = 0;
let escapados = 0;
let aciertosSinVoz = 0;
let ultimaFrase = {};
let vozLibreDesde = 0;
let ultimaVozEscape = 0;
let nubeVisible = true;
let fuerteAnunciada = false;
let tokenRonda = 0;
let ayuda = { t: null, id: null };

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
    const s = window.SonidosBurbujas;
    if (s && typeof s[nombre] === "function") s[nombre]();
}

function escenario() {
    return window.EscenarioBurbujas && window.EscenarioBurbujas.listo() ? window.EscenarioBurbujas : null;
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

function cfgR() {
    return ReglasBurbujas.ronda(gameConfig, rondaIdx);
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

// ------------------------------------------------------------------ Zoe (guía 3D) y su nube

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

/** Nube sobre la cabeza de Zoe (presentación, demo y final). */
function nubeZoe(texto) {
    const caja = document.getElementById("zoe-nube");
    const span = document.getElementById("zoe-nube-texto");
    if (!caja || !span) return;
    if (!texto || !nubeVisible) {
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
    const hud = document.querySelector(".hud-top");
    const techo = hud ? hud.getBoundingClientRect().bottom + 8 : 8;
    caja.style.setProperty("--dy", Math.max(0, Math.round(techo - r.top)) + "px");
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

/**
 * Habla Zoe (por defecto) o Zeus. Devuelve una Promise que termina con la voz.
 * `nube` (opcional): texto corto para la nube cuando la voz dice algo largo.
 */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    // Zeus no se dibuja: mientras habla él, la nube de Zoe se apaga para no mostrar un texto viejo.
    nubeZoe(quien === "zoe" ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return Promise.resolve();
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    const fin = function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
    };
    return TextoVoz.hablar(texto, quien).then(fin, fin);
}

/** Voz corta durante la partida: nunca se encima con otra (si hay una sonando, se salta). */
function decirRapido(texto, pj, gesto) {
    const ahora = Date.now();
    if (ahora < vozLibreDesde) return;
    vozLibreDesde = ahora + (Number(cfgJuego().vozPausaMs) || 2800);
    hablar(texto, pj, gesto);
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
    if (window.SonidosBurbujas) window.SonidosBurbujas.desbloquear();
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
    { key: "ayudaAutomatica", label: "Ayuda visual (brillo de la burbuja)" },
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
    pintarHud();
    if (!a.ayudaAutomatica) apagarAyudaVisual();
}

// ------------------------------------------------------------------ Zoe de pie junto a su canasta

let zoeEnEscena = false;

/** Caja de Zoe 3D sobre el hueco que le deja la escena (a la izquierda, junto a la canasta). */
function ubicarZoe() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !escenario()) return;
    const z = escenario().zonaZoe();
    if (!z) return;
    pj.style.left = Math.round(z.left) + "px";
    pj.style.top = Math.round(z.top) + "px";
    pj.style.width = Math.round(z.width) + "px";
    pj.style.height = Math.round(z.height) + "px";
}

function guiaMovil() {
    return window.Guia3D && window.Guia3D.listo() && window.Guia3D.caminar ? window.Guia3D : null;
}

/** Recorrido a pie de la caja de Zoe (left) con el clip de caminar. */
function caminarHasta(pj, x, ms, lado) {
    const g = guiaMovil();
    if (g) {
        g.mirar(lado);
        g.caminar(true);
    }
    // Paso a paso con setTimeout (no transición CSS): avanza aunque el navegador no esté pintando.
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
    return reducido ? 200 : Math.max(1300, Math.min(2600, distancia * 6));
}

/** Zoe entra caminando desde la izquierda hasta su lugar junto a la canasta. */
async function zoeEntra() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !escenario()) return;
    if (zoeEnEscena) {
        ubicarZoe();
        return;
    }
    pj.classList.add("zoe-cambia");
    await sleep(250);
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

// ------------------------------------------------------------------ HUD: ronda y estrellas

let estrellasPintadas = 0;

function pintarHud() {
    const caja = document.getElementById("hud-progreso");
    if (!caja || !gameConfig) return;
    caja.hidden = !acc().mostrarProgreso;
    const r = cfgR();
    const total = ReglasBurbujas.totalRondas(gameConfig);
    const pr = ReglasBurbujas.progreso(atrapadas, r ? r.objetivos : 4);
    const rot = document.getElementById("hud-ronda");
    if (rot) rot.textContent = "Ronda " + (rondaIdx + 1) + " de " + total;
    const cont = document.getElementById("hud-estrellas");
    if (cont) {
        if (cont.children.length !== pr.total) {
            cont.innerHTML = "";
            pr.marcas.forEach(function () {
                const s = document.createElement("span");
                s.className = "hud-estrella";
                s.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
                cont.appendChild(s);
            });
            estrellasPintadas = 0;
        }
        Array.prototype.forEach.call(cont.children, function (s, i) {
            const llena = pr.marcas[i];
            s.classList.toggle("llena", llena);
            s.classList.toggle("nueva", llena && i >= estrellasPintadas);
        });
        estrellasPintadas = pr.hechas;
    }
    caja.setAttribute("aria-valuemax", String(pr.total));
    caja.setAttribute("aria-valuenow", String(pr.hechas));
    caja.setAttribute("aria-label", "Ronda " + (rondaIdx + 1) + ": " + pr.hechas + " de " + pr.total + " burbujas");
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

/** Botón grande centrado: solo "¡Comenzar a jugar!". */
function esperarBoton(texto, icono) {
    const wrap = document.getElementById("comenzar-wrap");
    const btn = document.getElementById("btn-comenzar");
    if (!wrap || !btn) return Promise.resolve();
    btn.querySelector(".btn-comenzar-texto").textContent = texto;
    btn.querySelector("i").className = "fa-solid " + (icono || "fa-play");
    nubeZoe("");
    wrap.hidden = false;
    btn.focus({ preventScroll: true });
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

let tTitulo = null;

/** Título de la presentación: entra sobre el cielo y se va hacia arriba (no vuelve durante la partida). */
function tituloIntro(mostrar) {
    const t = document.getElementById("intro-titulo");
    if (!t) return Promise.resolve();
    clearTimeout(tTitulo);
    if (mostrar) {
        document.getElementById("intro-titulo-texto").textContent = textos().titulo || "";
        document.getElementById("intro-titulo-sub").textContent = textos().subtitulo || "";
        t.classList.remove("sube");
        t.hidden = false;
        return Promise.resolve();
    }
    t.classList.add("sube");
    return new Promise(function (resolve) {
        tTitulo = setTimeout(function () {
            t.hidden = true;
            t.classList.remove("sube");
            resolve();
        }, 600);
    });
}

/** Presentación: título, burbujas que flotan, Zoe entra con su canasta y cuenta de qué se trata. */
async function presentar() {
    if (!escenario()) return;
    const e = escenario();
    e.reacomodar();
    document.body.classList.add("en-presentacion");
    nubeVisible = true;
    tituloIntro(true);
    sonarEvento("aparece");
    e.decorar(true);
    // burbujas con juguetes que suben despacio (no se pueden tocar todavía)
    const L = e.diseno();
    const objs = (gameConfig.presentacion && gameConfig.presentacion.objetos) || [];
    objs.forEach(function (o, i) {
        const x = L.carrilMin + (L.carrilMax - L.carrilMin) * (0.15 + i * 0.35);
        e.soltar({ objeto: o, x: x, r: L.rBase * 0.1, subidaMs: 9000 + i * 900, vaiven: L.W * 0.012, altura: 0.9 - i * 0.12, interactiva: false });
    });
    await zoeEntra();
    const completa = introOmitida || !introDesdeEmpecemos;
    const voz = hablar(completa ? textos().bienvenida : textos().saludoCorto, "zoe", "saluda");
    await sleep(2200);
    await tituloIntro(false);
    await Promise.race([voz, sleep(completa ? 9000 : 4500)]);
    if (juegoTerminado) return;
    e.decorar(false);
    await Promise.race([hablar(textos().explicaCanasta, "zoe", "senala"), sleep(6000)]);
    document.body.classList.remove("en-presentacion");
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenario_listo;
    await presentar();

    if (acc().mostrarIntro && window.BurbujasDemo) {
        enDemo = true;
        try {
            await window.BurbujasDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[CazadorBurbujas] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-play");
    // Durante las rondas no hay textos: solo burbujas, la canasta y las voces.
    nubeVisible = false;
    nubeZoe("");
    comenzarRonda(0);
}

/** Empieza la ronda i: progreso a cero, instrucción corta y las burbujas empiezan a salir. */
function comenzarRonda(i) {
    rondaIdx = i;
    atrapadas = 0;
    volando = 0;
    juegoTerminado = false;
    vozLibreDesde = 0;
    pintarHud();
    jugando = true;
    document.body.classList.remove("demo-lock");
    const token = ++tokenRonda;
    if (i === 0) hablar(textos().instruccionZeus, "zeus");
    else hablar((textos().instruccionRonda || [])[i] || "", "zoe", "senala");
    vozLibreDesde = Date.now() + 3500;
    window.AparicionBurbujas.arrancar(cfgR(), {
        atrapadas: function () { return token === tokenRonda ? atrapadas : 99; },
        volando: function () { return volando; },
        // la primera burbuja fuerte de la partida se anuncia; las demás, solo con su brillo dorado
        alFuerte: function () {
            if (fuerteAnunciada) return;
            fuerteAnunciada = true;
            vozLibreDesde = 0;
            decirRapido(textos().multitoque, "zeus");
        }
    });
    programarAyuda();
}

// ------------------------------------------------------------------ toques y escapes (callbacks de la escena)

function alTocar(id) {
    if (!jugando || juegoTerminado || enDemo || !escenario()) return;
    const r = cfgR();
    if (atrapadas + volando >= r.objetivos) return;
    const b = escenario().burbujas().find(function (x) { return x.id === id; });
    if (!b) return;
    // Burbuja fuerte: los primeros toques solo la sacuden; el último la revienta.
    if (b.restantes > 1) {
        escenario().golpe(id);
        sfx("toque");
        limpiarAyuda();
        apagarAyudaVisual();
        programarAyuda();
        return;
    }
    volando++;
    limpiarAyuda();
    apagarAyudaVisual();
    sfx("pop");
    setTimeout(function () { sfx("cascabel"); }, 70);
    gestoGuia("celebra");
    const token = tokenRonda;
    // Con el último objetivo ya tocado no salen más burbujas: las que quedan se van flotando.
    if (atrapadas + volando >= r.objetivos) {
        window.AparicionBurbujas.detener();
        setTimeout(function () { if (escenario()) escenario().dejarIr(); }, 250);
    }
    aciertosSinVoz++;
    if (aciertosSinVoz >= (Number(cfgJuego().vozAciertoCada) || 2)) {
        const o = ReglasBurbujas.objeto(gameConfig, b.objeto) || { nombre: "" };
        const dicho = ReglasBurbujas.plantilla(frase("aciertoVoz"), { nombre: o.nombre });
        const antes = vozLibreDesde;
        decirRapido(dicho, "zoe");
        if (vozLibreDesde !== antes) aciertosSinVoz = 0;
    }
    escenario().reventar(id).then(function () {
        if (token !== tokenRonda) return;
        volando = Math.max(0, volando - 1);
        atrapadas++;
        totalAtrapadas++;
        sfx("canasta");
        pintarHud();
        if (atrapadas >= r.objetivos) finRonda();
        else programarAyuda();
    });
}

function alEscapar() {
    if (!jugando || juegoTerminado) return;
    escapados++;
    sfx("brisa");
    const ahora = Date.now();
    if (ahora - ultimaVozEscape >= (Number(cfgJuego().vozEscapeCadaMs) || 9000)) {
        const antes = vozLibreDesde;
        decirRapido(frase("escapeVoz"), "zoe", "senala");
        if (vozLibreDesde !== antes) ultimaVozEscape = ahora;
    }
}

/** Toque en el aire (sin burbuja): una chispita amable, sin castigo. */
function alTocarVacio(x, y) {
    if (!jugando || juegoTerminado || !escenario()) return;
    escenario().estrellas(x, y, 5, [0xffffff, 0xfff3bf], 0.3);
}

// ------------------------------------------------------------------ ayuda (sin resolver por el niño)

function apagarAyudaVisual() {
    if (ayuda.id != null && escenario()) escenario().destacar(ayuda.id, false);
    ayuda.id = null;
}

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    ayuda.t = null;
}

/** Sin atrapar nada durante ayudaMs: Zoe anima a mirar y la burbuja más fácil brilla en dorado. */
function programarAyuda(repetida) {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    ayuda.t = setTimeout(function () {
        if (!jugando || juegoTerminado) return;
        decirRapido(frase("ayuda"), "zoe", "senala");
        if (acc().ayudaAutomatica && escenario()) {
            const id = escenario().masVisible();
            if (id != null) {
                apagarAyudaVisual();
                ayuda.id = id;
                escenario().destacar(id, true);
            }
        }
        programarAyuda(true);
    }, repetida ? (Number(cfgJuego().ayudaRepetirMs) || 14000) : (Number(cfgJuego().ayudaMs) || 10000));
}

// ------------------------------------------------------------------ fin de ronda y final

let tCartel = null;

function mostrarCartel(titulo, sub, ms) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
    document.getElementById("escenario-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("escenario-cartel-sub");
    s.textContent = sub || "";
    s.hidden = !sub;
    c.hidden = false;
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    clearTimeout(tCartel);
    if (ms) tCartel = setTimeout(function () { c.hidden = true; }, ms);
}

function ocultarCartel() {
    clearTimeout(tCartel);
    const c = document.getElementById("escenario-cartel");
    if (c) c.hidden = true;
}

/** Cuatro juguetes en la canasta: celebración corta y la ronda siguiente (o el final). */
async function finRonda() {
    if (!jugando) return;
    jugando = false;
    const token = ++tokenRonda;
    window.AparicionBurbujas.detener();
    limpiarAyuda();
    apagarAyudaVisual();
    document.body.classList.add("demo-lock");
    if (escenario()) escenario().dejarIr();
    const ultima = rondaIdx >= ReglasBurbujas.totalRondas(gameConfig) - 1;
    if (ultima) {
        terminarJuego();
        return;
    }
    sfx("exito");
    gestoGuia("celebra");
    if (escenario()) escenario().celebrarCanasta();
    await sleep(500);
    const n = rondaIdx + 1;
    const dicho = frase("rondaLista");
    mostrarCartel(ReglasBurbujas.plantilla(textos().rondaListaTitulo, { n: n }), dicho);
    await Promise.race([hablar(dicho, "zoe", "celebra"), sleep(5000)]);
    if (token !== tokenRonda) return;
    ocultarCartel();
    await sleep(350);
    const sig = ReglasBurbujas.ronda(gameConfig, n);
    sonarEvento("aparece");
    mostrarCartel(ReglasBurbujas.plantilla(textos().rondaSiguienteTitulo, { n: n + 1 }), sig ? sig.nombre : "", 2000);
    await sleep(2100);
    if (token !== tokenRonda) return;
    comenzarRonda(n);
}

/**
 * Final: el parque se ilumina, flotan burbujas por todas partes, llueven estrellas y confeti; la canasta
 * llena salta y Zoe celebra con "¡SÚPER VISTA!". Luego, la victoria compartida.
 */
async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    window.AparicionBurbujas.detener();
    limpiarAyuda();
    apagarAyudaVisual();
    if (typeof Swal !== "undefined") Swal.close();
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.add("demo-lock", "en-final");
    nubeVisible = true;
    const e = escenario();
    const zona = document.getElementById("escenario-zona");
    sfx("fanfarria");
    await sleep(600);
    if (e) {
        e.iluminar(true);
        e.decorar(true);
        e.lluvia(4500);
        e.celebrarCanasta();
    }
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    gestoGuia("celebra");
    mostrarCartel(textos().finalTitulo || "¡SÚPER VISTA!", textos().finalSub || "");
    // el cartel ya dice "¡SÚPER VISTA!": la nube de Zoe completa la frase
    const voz = hablar(textos().final, "zoe", null, textos().finalZoe || "¡Lo hiciste fantástico!");
    await sleep(1800);
    sfx("fiesta");
    if (e) e.celebrarCanasta();
    await sleep(1500);
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    gestoGuia("final");
    await Promise.race([voz, sleep(11000)]);
    nubeZoe("");
    await sleep(700);
    if (e) e.decorar(false);
    mostrarVictoria();
}

function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
    if (feedbackActivo()) TextoVoz.hablar(cierre, "zoe");
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
    }, 400);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        textos: textos,
        preparar: function () {
            if (escenario()) escenario().decorar(false);
        },
        // Burbuja de la demo: grande y lenta, no se escapa ni se puede tocar (solo la toca la mano).
        soltar: function () {
            const e = escenario();
            if (!e) return null;
            const L = e.diseno();
            const d = gameConfig.demo || {};
            const x = L.carrilMin + (L.carrilMax - L.carrilMin) * (d.x != null ? d.x : 0.5);
            return e.soltar({
                objeto: d.objeto || "estrella",
                x: x,
                r: Math.max(56, L.rBase * 0.118),
                subidaMs: (Number(d.subidaSeg) || 10) * 1000,
                vaiven: L.W * 0.01,
                interactiva: false,
                demo: true
            });
        },
        punto: function (id) {
            const e = escenario();
            if (!e) return null;
            const p = e.puntoDe(id);
            const b = e.burbujas().find(function (x) { return x.id === id; });
            if (!p || !b) return null;
            const k = e.aPantalla(1, 0).x - e.aPantalla(0, 0).x;
            return { x: p.x, y: p.y, r: b.r * k };
        },
        canasta: function () { return escenario() ? escenario().puntoCanasta() : null; },
        decir: function (texto, pj) { return hablar(texto, pj || "zoe", pj === "zeus" ? null : "senala"); },
        // La demo no suma: solo muestra lo que pasa al tocar una burbuja.
        reventar: function (id) {
            sfx("pop");
            setTimeout(function () { sfx("cascabel"); }, 70);
            gestoGuia("celebra");
            return escenario().reventar(id).then(function () { sfx("canasta"); });
        },
        cartel: function (t) { mostrarCartel(t, "", 1800); },
        terminar: async function () {
            ocultarCartel();
            if (escenario()) escenario().vaciarCanasta();
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenario_listo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261119vol"));
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
    window.addEventListener("pagehide", function () {
        if (window.AparicionBurbujas) window.AparicionBurbujas.detener();
        if (escenario()) escenario().decorar(false);
        TextoVoz.vaciar();
    });

    nubeZoe("");
    pintarHud();

    // La escena se arma desde el principio (detrás de la intro).
    if (window.EscenarioBurbujas) {
        escenario_listo = window.EscenarioBurbujas.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioBurbujas.alTocar(alTocar);
            window.EscenarioBurbujas.alEscapar(alEscapar);
            window.EscenarioBurbujas.alTocarVacio(alTocarVacio);
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
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        if (zoeEnEscena) setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (pj && !pj.dataset.caminando) ubicarZoe();
        }, 60);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
