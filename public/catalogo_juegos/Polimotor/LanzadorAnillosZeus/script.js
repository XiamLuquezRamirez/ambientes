/**
 * El Lanzador de Anillos de Zeus — control del juego (Polimotor, 3-4 años, eje Coordinación y orientación,
 * temática Coordinación visual, juego 2: puntería, coordinación ojo-mano y deslizamiento directo).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe dicen la consigna) → PedniaEdad → PRESENTACIÓN (título y edad
 * arriba al centro, los tres anillos aparecen en sus cojines, Zeus saluda junto al cono) → DEMO automática (la
 * mano toma el anillo rojo, lo desliza hacia arriba y lo ensarta; no cuenta) → «¡Comenzar a jugar!» → PARTIDA
 * (ensartar los tres anillos, sin vidas ni castigos, intentos ilimitados) → FINAL (luz dorada, fuegos,
 * serpentinas, Zeus baila) → victoria compartida (Sí / No).
 *
 * Módulos: ReglasAnillos (reglas puras) · SonidosAnillos (Web Audio) · EscenarioAnillos (three.js, con Zeus GLB) ·
 *          AnillosDemo (mano de PedniaTutorial).
 *
 * Zeus está en la escena 3D todo el tiempo (junto al cono). Zoe solo se oye. Los globos de texto se ven en la
 * presentación, la demo y el final; durante la partida solo hay voces.
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
let lanzando = false;
let ensartados = [];
let nivelIdx = 0;
let fallosSeguidos = 0;
let lanzamientos = 0;
let globosVisibles = true;
let vozLibreDesde = 0;
let ultimaFrase = {};
let ayuda = { t: null, n: 0 };
let progresoPintado = 0;

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
    const s = window.SonidosAnillos;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioAnillos && window.EscenarioAnillos.listo() ? window.EscenarioAnillos : null;
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

function anillosCfg() {
    return gameConfig.anillos || [];
}

function anilloDef(id) {
    return anillosCfg().find(function (a) { return a.id === id; }) || null;
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

function rondas() {
    return gameConfig.rondas && gameConfig.rondas.length ? gameConfig.rondas : [{ id: 1, nombre: "Nivel 1" }];
}

function pendientes() {
    return anillosCfg().map(function (a) { return a.id; }).filter(function (id) { return ensartados.indexOf(id) < 0; });
}

// ------------------------------------------------------------------ voces y globos de texto

/** Globo de texto: el de Zeus sale junto a su cabeza; el de Zoe, abajo a la izquierda con su carita. */
function globo(texto, quien) {
    const caja = document.getElementById("globo");
    const span = document.getElementById("globo-texto");
    if (!caja || !span) return;
    if (!texto || !globosVisibles) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.dataset.quien = quien;
    const cara = caja.querySelector(".globo-cara img");
    if (cara) cara.src = "../../img/" + (quien === "zeus" ? "zeus" : "zoe") + "_normal.gif";
    document.getElementById("globo-nombre").textContent = quien === "zeus" ? "Zeus" : "Zoe";
    caja.hidden = false;
    caja.style.left = "";
    caja.style.top = "";
    caja.style.bottom = "";
    caja.style.maxWidth = "";
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
    if (quien === "zeus" && escenario()) {
        const p = escenario().puntoZeus();
        const r = { width: caja.offsetWidth, height: caja.offsetHeight };
        if (p) {
            // a la derecha de la cabeza de Zeus (lejos del cono); si no cabe, a su izquierda
            let x = p.x + 56;
            const libre = window.innerWidth - 12 - x;
            if (r.width > libre && libre >= 200) {
                // se angosta para caber a la derecha (tabletas)
                caja.style.maxWidth = Math.round(libre) + "px";
            } else if (r.width > libre) {
                x = p.x - r.width - 56;
            }
            x = Math.max(12, x);
            const hud = document.querySelector(".hud-top");
            let techo = hud ? hud.getBoundingClientRect().bottom + 8 : 8;
            const titulo = document.getElementById("intro-titulo");
            if (titulo && !titulo.hidden) techo = Math.max(techo, titulo.getBoundingClientRect().bottom + 10);
            const cartel = document.getElementById("escenario-cartel");
            if (cartel && !cartel.hidden) techo = Math.max(techo, cartel.offsetTop + cartel.offsetHeight + 12);
            const alto = caja.offsetHeight;
            const y = Math.max(techo, p.y - alto * 0.55);
            caja.style.left = Math.round(x) + "px";
            caja.style.top = Math.round(y) + "px";
        }
    }
}

/** Habla Zoe (por defecto) o Zeus. Promise que termina con la voz. */
function hablar(texto, pj, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    globo(nube || texto, quien);
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") return sleep(texto ? 1200 : 0);
    const e = escenario();
    if (quien === "zeus" && e) e.zeusHablar(true);
    const fin = function () {
        if (quien === "zeus" && escenario()) escenario().zeusHablar(false);
    };
    return TextoVoz.hablar(texto, quien).then(fin, fin);
}

/** Voz corta de la partida: nunca se encima con otra. */
function decirRapido(texto, pj, forzar) {
    const ahora = Date.now();
    if (!forzar && ahora < vozLibreDesde) return Promise.resolve();
    vozLibreDesde = ahora + (Number(cfgJuego().vozPausaMs) || 2600);
    return hablar(texto, pj);
}

// ------------------------------------------------------------------ intro 3D (componente compartido)

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
    if (escenario()) escenario().reacomodar();
    iniciarPartida();
}

function empecemosJuego() {
    const pantalla = document.getElementById("pantalla-inicio");
    const btn = document.getElementById("btn-empecemos");
    if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
    if (btn) btn.disabled = true;
    TextoVoz.desbloquear();
    sfx("desbloquear");
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
        if (escenario()) escenario().reacomodar();
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
    }
    if (audioFondo) audioFondo.volume = vol;
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
    { key: "ayudaAutomatica", label: "Ayuda visual (flecha de luz)" },
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
    if (!a.ayudaAutomatica && escenario() && jugando) {
        escenario().guia(null);
        escenario().destelloObjetivo(false);
    }
}

// ------------------------------------------------------------------ progreso: tres aros que se encienden

function pintarProgreso(nuevo) {
    const caja = document.getElementById("hud-progreso");
    if (!caja || !gameConfig) return;
    caja.hidden = !acc().mostrarProgreso;
    const total = anillosCfg().length || 3;
    const pr = ReglasAnillos.progreso(ensartados.length, total);
    const cont = document.getElementById("hud-aros");
    if (cont && cont.children.length !== total) {
        cont.innerHTML = "";
        for (let i = 0; i < total; i++) {
            const s = document.createElement("span");
            s.className = "hud-aro";
            s.innerHTML = '<span class="hud-aro-anillo"></span><i class="fa-solid fa-check" aria-hidden="true"></i>';
            cont.appendChild(s);
        }
    }
    if (cont) {
        Array.prototype.forEach.call(cont.children, function (s, i) {
            const lleno = pr.marcas[i];
            const def = lleno ? anilloDef(ensartados[i]) : null;
            s.classList.toggle("lleno", lleno);
            s.dataset.dibujo = def ? def.dibujo : "";
            s.style.setProperty("--aro", def ? def.color : "transparent");
            s.style.setProperty("--aro-brillo", def ? (def.brillo || def.color) : "transparent");
            if (nuevo && lleno && i === pr.hechas - 1) {
                s.classList.remove("nuevo");
                void s.offsetWidth;
                s.classList.add("nuevo");
            }
        });
    }
    const rotulo = document.getElementById("hud-nivel");
    if (rotulo) rotulo.textContent = "Nivel " + (nivelIdx + 1) + " de " + rondas().length;
    const cuenta = document.getElementById("hud-cuenta");
    if (cuenta) cuenta.textContent = pr.hechas + " / " + pr.total;
    caja.setAttribute("aria-valuemax", String(pr.total));
    caja.setAttribute("aria-valuenow", String(pr.hechas));
    caja.setAttribute("aria-label", "Nivel " + (nivelIdx + 1) + " de " + rondas().length + ". Anillos ensartados: " + pr.hechas + " de " + pr.total);
    progresoPintado = pr.hechas;
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
    globo("");
    wrap.hidden = false;
    btn.focus({ preventScroll: true });
    return new Promise(function (resolve) {
        const listo = function () {
            btn.removeEventListener("click", listo);
            sfx("seleccion");
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

/** Título centrado arriba con la edad: solo en la presentación (nunca durante la partida). */
function tituloIntro(mostrar) {
    const t = document.getElementById("intro-titulo");
    if (!t) return Promise.resolve();
    clearTimeout(tTitulo);
    if (mostrar) {
        document.getElementById("intro-titulo-texto").textContent = textos().titulo || "";
        document.getElementById("intro-titulo-sub").textContent = textos().subtitulo || "";
        const nivel = (gameConfig.niveles || [])[0];
        document.getElementById("intro-titulo-edad").textContent = nivel ? nivel.edad : "";
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

/** Presentación: título y edad, los anillos aparecen, Zeus saluda junto a su cono y explica. */
async function presentar() {
    const e = escenario();
    if (!e) return;
    document.body.classList.add("en-presentacion");
    globosVisibles = true;
    tituloIntro(true);
    sfx("aparece");
    e.zeusGesto("saluda");
    await e.presentar();
    const completa = introOmitida || !introDesdeEmpecemos;
    const vozZeus = hablar(completa ? textos().instruccionZeus : textos().saludoCorto, "zeus");
    await sleep(2400);
    e.destelloObjetivo(true);
    await Promise.race([vozZeus, sleep(completa ? 11000 : 4500)]);
    if (juegoTerminado) return;
    await tituloIntro(false);
    e.zeusGesto("senala");
    await Promise.race([hablar(textos().instruccionZoe, "zoe"), sleep(5000)]);
    e.destelloObjetivo(false);
    document.body.classList.remove("en-presentacion");
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenario_listo;
    const e = escenario();
    if (!e) return;
    e.bloquear(true);
    pintarProgreso();
    await presentar();

    if (acc().mostrarIntro && window.AnillosDemo) {
        enDemo = true;
        document.body.classList.add("en-demo");
        try {
            await window.AnillosDemo.correr(apiDemo());
        } catch (err) {
            console.warn("[LanzadorAnillos] demo", err);
        }
        enDemo = false;
        document.body.classList.remove("en-demo");
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-play");
    comenzar();
}

/** La partida: los tres anillos esperan en sus cojines; el niño los lanza cuantas veces necesite. */
function comenzar() {
    const e = escenario();
    if (!e) return;
    globosVisibles = false;
    globo("");
    ensartados = [];
    nivelIdx = 0;
    fallosSeguidos = 0;
    lanzamientos = 0;
    jugando = true;
    lanzando = false;
    pintarProgreso();
    document.body.classList.remove("demo-lock");
    document.body.classList.add("jugando");
    e.disponibles(pendientes());
    e.bloquear(false);
    // primera vez: la flecha de luz enseña el camino desde el anillo rojo
    mostrarGuiaTutorial(pendientes()[0]);
    vozLibreDesde = 0;
    decirRapido(textos().turnoZoe, "zoe", true);
    programarAyuda();
}

/** Opacidad de la flecha de luz: plena al principio y se apaga poco a poco con los lanzamientos. */
function opacidadGuia() {
    if (!acc().ayudaAutomatica) return 0;
    const n = Number(cfgJuego().guiaLanzamientos) || 3;
    if (lanzamientos >= n) return 0;
    return 1 - lanzamientos / n * 0.75;
}

function mostrarGuiaTutorial(id) {
    const e = escenario();
    if (!e || !id) return;
    const op = opacidadGuia();
    e.guia(op > 0 ? id : null, op);
    e.destelloObjetivo(op > 0);
}

// ------------------------------------------------------------------ eventos de la escena (ratón y dedo)

function alTomar(id) {
    if (!jugando) return;
    limpiarAyuda();
    sfx("seleccion");
    sonarEvento("agarrar", { vol: 0.25 });
    mostrarGuiaTutorial(id);
    escenario().resaltar(null);
}

function alMover(id, v) {
    sfx("arrastre", v);
}

async function alSoltar(id, gesto) {
    const e = escenario();
    if (!e) return;
    e.guia(null);
    e.destelloObjetivo(false);
    if (!jugando || lanzando) {
        e.regresar(id);
        return;
    }
    const res = ReglasAnillos.evaluar(gesto, e.geometria(id), gameConfig, fallosSeguidos);
    if (!res.lanza) {
        // no subió: el anillo vuelve a su cojín y Zoe recuerda el gesto
        sfx("recuperar");
        e.regresar(id);
        decirRapido(textos().corto, "zoe");
        programarAyuda();
        return;
    }
    lanzando = true;
    lanzamientos++;
    e.bloquear(true);
    sfx("lanzar");
    const acierto = await e.lanzar(id, res, avisosVuelo());
    if (juegoTerminado) return;
    if (acierto) await alAcierto(id);
    else await alFallo(id, res);
}

function avisosVuelo() {
    return {
        vuelo: function (ms) { sfx("vuelo", ms); },
        encaje: function () { sfx("encaje"); },
        rebote: function (k) { sfx("rebote", k); },
        recuperar: function () { sfx("recuperar"); },
        fallo: function () { /* el aviso de voz va al aterrizar (alFallo) */ }
    };
}

async function alAcierto(id) {
    const e = escenario();
    ensartados.push(id);
    fallosSeguidos = 0;
    e.celebrar(id);
    sfx("corneta");
    setTimeout(function () { sfx("destello"); }, 380);
    e.zeusGesto("celebra");
    pintarProgreso(true);
    const aro = document.querySelector("#hud-aros .hud-aro.nuevo");
    if (window.PedniaFx && aro) window.PedniaFx.celebracion(aro.getBoundingClientRect());
    const def = anilloDef(id);
    const completo = ensartados.length >= anillosCfg().length;
    vozLibreDesde = 0;
    const voz = decirRapido(def && def.voz ? def.voz : frase("acierto"), "zeus", true);
    if (completo) {
        await Promise.race([voz, sleep(2600)]);
        if (nivelIdx < rondas().length - 1) finNivel();
        else terminarJuego();
        return;
    }
    await sleep(900);
    lanzando = false;
    e.disponibles(pendientes());
    e.bloquear(false);
    if (pendientes().length === 1) {
        await Promise.race([voz, sleep(2600)]);
        decirRapido(textos().faltan, "zoe", true);
    }
    programarAyuda();
}

async function alFallo(id, res) {
    const e = escenario();
    fallosSeguidos++;
    e.zeusGesto("animo");
    vozLibreDesde = 0;
    // la primera vez con la frase completa del enunciado; luego varía
    decirRapido(fallosSeguidos === 1 ? textos().casi : frase("casiOtras"), "zeus", true);
    lanzando = false;
    e.disponibles(pendientes());
    e.bloquear(false);
    // tras dos fallos seguidos, la flecha de luz vuelve a mostrar el camino (y la zona de recepción ya creció)
    if (fallosSeguidos >= 2 && acc().ayudaAutomatica) {
        e.guia(id, 0.7);
        e.destelloObjetivo(true);
        setTimeout(function () {
            if (!escenario().arrastrando() && jugando) {
                escenario().guia(null);
                escenario().destelloObjetivo(false);
            }
        }, 4500);
    }
    programarAyuda();
}

function alTocarVacio() {
    if (!jugando) return;
    programarAyuda();
}

// ------------------------------------------------------------------ ayuda por inactividad

function limpiarAyuda() {
    clearTimeout(ayuda.t);
    if (escenario()) escenario().resaltar(null);
}

function programarAyuda() {
    clearTimeout(ayuda.t);
    if (!jugando || juegoTerminado) return;
    const espera = ayuda.n > 0 ? (Number(cfgJuego().ayudaRepetirMs) || 12000) : (Number(cfgJuego().ayudaMs) || 9000);
    ayuda.t = setTimeout(function () {
        const e = escenario();
        if (!e || !jugando || lanzando || e.arrastrando()) {
            programarAyuda();
            return;
        }
        ayuda.n++;
        const id = ReglasAnillos.pendiente(anillosCfg(), ensartados);
        if (!id) return;
        e.resaltar(id);
        if (acc().ayudaAutomatica) {
            e.guia(id, 0.8);
            e.destelloObjetivo(true);
        }
        e.zeusGesto("senala");
        decirRapido(frase("ayuda"), "zoe", true);
        setTimeout(function () {
            const e2 = escenario();
            if (e2 && !e2.arrastrando()) {
                e2.guia(null);
                e2.destelloObjetivo(false);
                e2.resaltar(null);
            }
        }, 5000);
        programarAyuda();
    }, espera);
}

// ------------------------------------------------------------------ fin de nivel

/**
 * Los tres anillos quedaron en el cono y hay otro nivel: celebración corta, los anillos vuelven a sus cojines, el
 * cono y Zeus se van más lejos y empieza el nivel siguiente con los mismos tres anillos.
 */
async function finNivel() {
    const e = escenario();
    if (!e || !jugando) return;
    jugando = false;
    lanzando = true;
    limpiarAyuda();
    e.bloquear(true);
    e.guia(null);
    e.destelloObjetivo(false);
    document.body.classList.add("demo-lock");
    const n = nivelIdx + 1;
    sfx("victoria");
    e.zeusGesto("celebra");
    mostrarCartel(ReglasAnillos.plantilla(textos().nivelListoTitulo || "¡NIVEL {n} LISTO!", { n: n }), "");
    await Promise.race([hablar(textos().nivelListo, "zoe"), sleep(5500)]);
    ocultarCartel();
    const sig = rondas()[n];
    sfx("aparece");
    mostrarCartel(ReglasAnillos.plantilla(textos().nivelSiguienteTitulo || "¡NIVEL {n}!", { n: n + 1 }), textos().nivelSiguienteSub || "");
    await e.nivel(sig);
    if (juegoTerminado) return;
    nivelIdx = n;
    ensartados = [];
    fallosSeguidos = 0;
    // la flecha de luz vuelve a acompañar los primeros lanzamientos de cada nivel, como en el nivel 1
    lanzamientos = 0;
    pintarProgreso();
    vozLibreDesde = 0;
    const voz = decirRapido(sig.voz || textos().turnoZoe, "zeus", true);
    e.zeusGesto("senala");
    await Promise.race([voz, sleep(4500)]);
    ocultarCartel();
    jugando = true;
    lanzando = false;
    document.body.classList.remove("demo-lock");
    e.disponibles(pendientes());
    e.bloquear(false);
    // la flecha de luz enseña el camino a la nueva distancia, igual que al empezar el nivel 1
    mostrarGuiaTutorial(pendientes()[0]);
    programarAyuda();
}

// ------------------------------------------------------------------ final y victoria

/**
 * Final: los tres anillos brillan en el mástil, el cono se pone dorado, fuegos artificiales, serpentinas y confeti;
 * Zeus baila y celebra; "¡QUÉ GRAN PUNTERÍA!". Luego, la victoria compartida.
 */
async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    lanzando = false;
    limpiarAyuda();
    const e = escenario();
    if (e) {
        e.bloquear(true);
        e.guia(null);
        e.destelloObjetivo(false);
    }
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-final");
    document.body.classList.remove("jugando");
    globosVisibles = true;
    await sleep(500);
    if (e) {
        e.final();
        e.zeusGesto("baila");
    }
    sfx("victoria");
    if (sonido()) sonido().agacharMusica(0.4);
    const zona = document.getElementById("escenario-zona");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    // al final solo hablan Zoe y Zeus en sus globos (el usuario no quiere el cartel grande aquí)
    const tLluvia = setInterval(function () { if (escenario()) escenario().finalLluvia(); }, 2600);
    await Promise.race([hablar(textos().finalZoe, "zoe"), sleep(9000)]);
    if (e) e.zeusGesto("final");
    sfx("corneta");
    await Promise.race([hablar(textos().finalZeus, "zeus"), sleep(5000)]);
    if (e) e.zeusGesto("celebra");
    await sleep(1600);
    clearInterval(tLluvia);
    globo("");
    mostrarVictoria();
}

function mostrarVictoria() {
    if (sonarEvento("victoria")) {
        sonido().agacharMusica(0.35);
    } else {
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre);
    }
    const cierre = textos().cierre || "";
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
    const demoId = (gameConfig.demo && gameConfig.demo.anillo) || (anillosCfg()[0] || {}).id;
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        anillo: function () { return demoId; },
        puntoAnillo: function (id) { return escenario() ? escenario().puntoAnillo(id) : null; },
        puntoCono: function () { return escenario() ? escenario().puntoCono() : null; },
        zeusGesto: function (n) { if (escenario()) escenario().zeusGesto(n); },
        decir: function (clave, pj) { return hablar(textos()[clave], pj || "zoe"); },
        resaltar: function (id) { if (escenario()) escenario().resaltar(id); },
        guia: function (id, op) { if (escenario()) escenario().guia(id, op); },
        destello: function (on) { if (escenario()) escenario().destelloObjetivo(on); },
        tomar: function (id) {
            sfx("seleccion");
            escenario().demoTomar(id);
        },
        mover: function (p) {
            escenario().demoMover(p);
            sfx("arrastre", 0.5);
        },
        // la demo siempre acierta: muestra el lanzamiento correcto
        soltar: async function (id) {
            const e = escenario();
            e.demoSoltar();
            e.resaltar(null);
            sfx("lanzar");
            const ok = await e.lanzar(id, { lanza: true, acierto: true, destino: e.geometria(id).cono }, avisosVuelo());
            if (ok) {
                e.celebrar(id);
                sfx("corneta");
                setTimeout(function () { sfx("destello"); }, 380);
                e.zeusGesto("celebra");
            }
            return ok;
        },
        felicitar: async function () {
            mostrarCartel(textos().demoBien || "¡Así se hace!", "", 1900);
            await Promise.race([hablar(textos().demoBien, "zeus"), sleep(1900)]);
        },
        cerrar: async function () {
            await Promise.race([hablar(textos().demoFin, "zoe"), sleep(4500)]);
        },
        terminar: async function () {
            ocultarCartel();
            globo("");
            const e = escenario();
            if (e) await e.devolver(demoId);
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenario_listo = Promise.resolve(false);

/** El escenario es un módulo: se espera a que exista. */
function esperarModulo(nombre, ms) {
    return new Promise(function (resolve) {
        const t0 = Date.now();
        const tick = function () {
            if (window[nombre]) resolve(window[nombre]);
            else if (Date.now() - t0 > ms) resolve(null);
            else setTimeout(tick, 50);
        };
        tick();
    });
}

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261119c"));
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
        TextoVoz.vaciar();
    });

    const edad = document.getElementById("hud-edad");
    const nivel = (gameConfig.niveles || [])[0];
    if (edad && nivel) edad.textContent = nivel.edad;
    globo("");
    pintarProgreso();

    // La escena se arma desde el principio (detrás de la intro).
    escenario_listo = esperarModulo("EscenarioAnillos", 8000).then(function (esc) {
        if (!esc) return false;
        return esc.montar(document.getElementById("escenario-3d"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            esc.on({
                tomar: alTomar,
                mover: alMover,
                soltar: alSoltar,
                tocarVacio: alTocarVacio,
                aparece: function () { sfx("aparece"); },
                fuego: function () { sfx("destello"); }
            });
            return ok;
        });
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
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
