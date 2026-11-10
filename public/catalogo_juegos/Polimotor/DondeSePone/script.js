/**
 * ¿Dónde se pone? — control del juego (Polimotor, Prejardín 3-4 años, reconocimiento de partes del cuerpo).
 *
 * Flujo: pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad → presentación en el vestidor (Zeus aparece,
 * los accesorios salen del baúl y Zeus saluda) → demo automática con la mano (si "Mostrar intro") → ¡A jugar!
 * → rondas de 4 accesorios (la 1.ª en el orden gafas, sombrero, tenis, bufanda; las demás en otro orden y
 * con los accesorios en otros lugares) → final (baúl abierto, luces, desfile de Zeus) → victoria compartida.
 *
 * Módulos (cada uno en su archivo):
 *   Reglas (validación y rondas, puras) · Personaje (Zeus por partes) · Accesorios (dibujos)
 *   Vestidor (fondo SVG) · EscenarioPhaser (escena, zonas, encaje) · Arrastre (arrastrar y soltar)
 *   ZeusAnim (animaciones) · DondeDemo (demostración) · Guia3D (Zoe 3D en el panel guía)
 *
 * Quién habla: Zeus (en el centro) dice en primera persona las instrucciones, sus reacciones y el error
 * ("¡Ups! ¡Inténtalo en otro lugar!") en su nube junto a la cabeza. Zoe, la guía lateral, da las pistas
 * y habla de Zeus en tercera persona.
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
let pedido = null;
let colocados = [];
let erroresPedido = 0;
let aciertos = 0;
let errores = 0;
let primeraInstruccion = true;
let ultimaFrase = {};
let ayuda = { voz: null, repetir: null, brilloOn: false, zona: null, token: 0 };

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

function escenario() {
    return window.EscenarioPhaser && window.EscenarioPhaser.listo() ? window.EscenarioPhaser : null;
}

function anim() {
    return window.ZeusAnim || null;
}

function vestidor() {
    return window.Vestidor || null;
}

function arrastre() {
    return window.Arrastre || null;
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

function accesorioCfg(id) {
    return Reglas.accesorio(gameConfig, id) || { textos: {} };
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

/** Instrucción de Zeus para un accesorio: la larga la primera vez, la corta en las demás. */
function instruccionDe(id, corta) {
    const l = accesorioCfg(id).textos.instruccion;
    if (!Array.isArray(l)) return l || "";
    return (corta ? l[l.length - 1] : l[0]) || "";
}

// ------------------------------------------------------------------ guía (Zoe, zona lateral) y nube de Zeus

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

let tGloboZeus = null;

/** Nube de Zeus: junto a su cabeza (a la derecha), sin salirse de la zona del vestidor. */
function globoZeus(texto) {
    const caja = document.getElementById("zeus-globo");
    const span = document.getElementById("zeus-globo-texto");
    if (!caja || !span) return;
    clearTimeout(tGloboZeus);
    if (!texto) {
        caja.hidden = true;
        return;
    }
    span.textContent = TextoVoz.textoPlano ? TextoVoz.textoPlano(texto) : texto;
    caja.hidden = false;
    caja.classList.toggle("largo", span.textContent.length > 70);
    ubicarGloboZeus();
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

function ubicarGloboZeus() {
    const caja = document.getElementById("zeus-globo");
    const zona = document.getElementById("escenario-zona");
    if (!caja || caja.hidden || !zona || !escenario()) return;
    const z = zona.getBoundingClientRect();
    const cabeza = escenario().puntoDe("cabeza");
    const ojos = escenario().puntoDe("ojos");
    if (!cabeza || !ojos) return;
    const w = caja.offsetWidth;
    const h = caja.offsetHeight;
    const radio = Math.abs(ojos.y - cabeza.y) * 1.9;
    let x = ojos.x - z.left + radio;
    let y = cabeza.y - z.top - h * 0.55;
    // En vertical los accesorios están a los lados de la cabeza: la nube va centrada arriba, entre la primera fila.
    const retrato = escenario().diseno().retrato;
    caja.classList.toggle("arriba", !!retrato);
    if (retrato) {
        x = (z.width - w) / 2;
        y = 4;
    }
    x = Math.max(4, Math.min(x, z.width - w - 4));
    y = Math.max(4, Math.min(y, z.height - h - 4));
    caja.style.left = x + "px";
    caja.style.top = y + "px";
}

function callarGloboZeus(ms) {
    clearTimeout(tGloboZeus);
    tGloboZeus = setTimeout(function () { globoZeus(""); }, ms != null ? ms : 1400);
}

/** Nube de Zoe (zona lateral). */
function globo(texto, pj) {
    if (pj === "zeus") {
        globoZeus(texto);
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
    caja.classList.remove("pulso");
    void caja.offsetWidth;
    caja.classList.add("pulso");
}

function hablar(texto, pj, gesto) {
    const quien = pj || "zeus";
    globo(texto, quien);
    if (quien === "zoe") gestoGuia(gesto || "senala");
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        if (quien === "zeus") callarGloboZeus(2600);
        return Promise.resolve();
    }
    if (quien === "zeus" && anim()) anim().hablando(true);
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, quien).then(function () {
        if (quien === "zeus" && anim()) anim().hablando(false);
        if (quien === "zeus") callarGloboZeus();
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
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
    // Fundido por opacidad (no display:none) para que Phaser no pierda el tamaño del vestidor.
    $("#principal").css("opacity", 0).animate({ opacity: 1 }, 800);
    if (window.EscenarioPhaser && window.EscenarioPhaser.listo()) window.EscenarioPhaser.reacomodar();
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
    { key: "ayudaAutomatica", label: "Ayuda visual (brillo y chispas)" },
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
    if (!a.ayudaAutomatica && ayuda.brilloOn && escenario()) {
        escenario().brillo(ayuda.zona, { on: false });
        ayuda.brilloOn = false;
    }
}

// ------------------------------------------------------------------ progreso (zona superior)

function pintarProgreso(idsDemo) {
    const caja = document.getElementById("progreso-partes");
    const iconos = document.getElementById("progreso-iconos");
    const etiqueta = document.getElementById("progreso-ronda");
    if (!caja || !iconos) return;
    const lista = idsDemo || (ronda ? ronda.orden : []);
    caja.hidden = !acc().mostrarProgreso || !lista.length;
    if (etiqueta) {
        etiqueta.textContent = idsDemo ? "Demo" : (ronda ? Reglas.plantilla(textos().rondaRotulo || "Ronda {n} de {total}", { n: ronda.numero, total: rondas.length }) : "");
    }
    iconos.innerHTML = "";
    lista.forEach(function (id) {
        const d = accesorioCfg(id);
        const b = document.createElement("span");
        b.className = "parte-burbuja";
        b.dataset.acc = id;
        b.title = d.nombre || id;
        const img = document.createElement("img");
        img.alt = "";
        img.src = Accesorios.dataUrl(d.imagen);
        b.appendChild(img);
        if (!idsDemo) {
            if (colocados.indexOf(id) >= 0) b.classList.add("lograda");
            else if (id === pedido && !bloqueo) b.classList.add("actual");
        }
        iconos.appendChild(b);
    });
}

function marcarBurbuja(id, clase) {
    const b = document.querySelector('.parte-burbuja[data-acc="' + id + '"]');
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

/** Zeus aparece en la tarima, los accesorios salen del baúl y Zeus saluda. */
async function presentar() {
    if (!escenario() || !anim()) return;
    escenario().reacomodar();
    await anim().aparecer();
    anim().reposo(true);
    const completa = introOmitida || !introDesdeEmpecemos;
    const voz = hablar(completa ? textos().bienvenida : textos().saludoCorto, "zeus");
    if (guia3d()) guia3d().gesto("saluda");
    await Promise.all([escenario().llenarBandeja(rondas[0].lugares), anim().saludo()]);
    await Promise.race([voz, sleep(completa ? 9000 : 4000)]);
}

/** Arranque único (el selector de edad puede avisar más de una vez: no repetir la demo). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    rondas = Reglas.armarRondas(gameConfig);
    document.body.classList.add("demo-lock");
    await escenario_listo;
    await presentar();

    if (acc().mostrarIntro && window.DondeDemo) {
        enDemo = true;
        try {
            await window.DondeDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[DondeSePone] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
        await esperarBotonComenzar();
    }
    document.body.classList.remove("demo-lock");
    empezarRonda(0);
}

// ------------------------------------------------------------------ rondas y pedidos

async function empezarRonda(i) {
    if (i >= rondas.length) {
        terminarJuego();
        return;
    }
    rondaIdx = i;
    ronda = rondas[i];
    colocados = [];
    pedido = null;
    pintarProgreso();
    if (i > 0) {
        mostrarCartel(Reglas.plantilla(textos().rondaRotulo || "Ronda {n} de {total}", { n: ronda.numero, total: rondas.length }), "", 1800);
        const voz = hablar(textos().otraVez, "zeus");
        await escenario().llenarBandeja(ronda.lugares);
        await Promise.race([voz, sleep(3500)]);
    }
    siguientePedido();
}

async function siguientePedido() {
    if (juegoTerminado) return;
    pedido = Reglas.siguientePendiente(ronda.orden, colocados);
    if (!pedido) {
        completarRonda();
        return;
    }
    erroresPedido = 0;
    bloqueo = false;
    pintarProgreso();
    if (arrastre()) arrastre().habilitar(true);
    const miPedido = pedido;
    const texto = instruccionDe(pedido, !primeraInstruccion);
    primeraInstruccion = false;
    programarAyuda();
    await hablar(texto, "zeus");
    if (pedido === miPedido && !bloqueo) programarAyuda();
}

// ------------------------------------------------------------------ microayuda

function limpiarAyuda(quitarBrillo) {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
    if (quitarBrillo && ayuda.brilloOn && escenario()) {
        escenario().brillo(ayuda.zona, { on: false });
        ayuda.brilloOn = false;
    }
}

function encenderBrillo(zona) {
    if (!zona || !acc().ayudaAutomatica || !escenario()) return;
    if (ayuda.brilloOn && ayuda.zona === zona) return;
    if (ayuda.brilloOn) escenario().brillo(ayuda.zona, { on: false });
    ayuda.brilloOn = true;
    ayuda.zona = zona;
    escenario().brillo(zona, { on: true });
}

/**
 * Sin interacción: a los ayudaMs la parte del cuerpo pedida brilla, el accesorio se menea y salen chispas
 * que van del accesorio a su zona; Zoe da la pista. Luego Zeus repite la instrucción de vez en cuando.
 */
function programarAyuda() {
    limpiarAyuda(false);
    if (!pedido || bloqueo || juegoTerminado) return;
    const cfg = cfgJuego();
    const token = ayuda.token;
    const miPedido = pedido;
    const vigente = function () { return token === ayuda.token && pedido === miPedido && !bloqueo && !juegoTerminado; };
    ayuda.voz = setTimeout(function () {
        if (!vigente()) return;
        encenderBrillo(accesorioCfg(miPedido).zona);
        if (escenario() && acc().ayudaAutomatica) escenario().guiar(miPedido);
        sonarEvento("aparece");
        hablar(accesorioCfg(miPedido).textos.ayuda || instruccionDe(miPedido, true), "zoe", "senala").then(function () {
            if (!vigente()) return;
            const repetir = function () {
                ayuda.repetir = setTimeout(function () {
                    if (!vigente()) return;
                    if (escenario() && acc().ayudaAutomatica) escenario().guiar(miPedido);
                    hablar(instruccionDe(miPedido, true), "zeus").then(repetir);
                }, Number(cfg.ayudaRepetirMs) || 9000);
            };
            repetir();
        });
    }, Number(cfg.ayudaMs) || 8000);
}

// ------------------------------------------------------------------ arrastre (callbacks de arrastre.js)

function alTomar(id) {
    if (enDemo || bloqueo) return;
    limpiarAyuda(false);
    sonarEvento("agarrar");
}

/** Mientras se arrastra: si el accesorio entra en su zona, encaja solo (devuelve true). */
function alMover(id, zona) {
    if (enDemo || bloqueo || juegoTerminado) return false;
    if (!Reglas.esCorrecta(gameConfig, id, zona)) return false;
    acertar(id);
    return true;
}

/** Al soltar: fuera de Zeus vuelve flotando a su lugar; en otra parte del cuerpo rebota (error suave). */
function alSoltar(id, zona) {
    if (enDemo || bloqueo || juegoTerminado) return;
    if (!zona) {
        sonarEvento("soltar");
        if (escenario()) escenario().volverALugar(id, false);
        programarAyuda();
        return;
    }
    if (Reglas.esCorrecta(gameConfig, id, zona)) {
        acertar(id);
        return;
    }
    fallar(id, zona);
}

async function acertar(id) {
    if (bloqueo) return;
    bloqueo = true;
    limpiarAyuda(true);
    if (arrastre()) arrastre().habilitar(false);
    if (TextoVoz.detener) TextoVoz.detener();
    const d = accesorioCfg(id);
    aciertos++;
    colocados.push(id);
    sonarEvento("encaje");
    if (escenario()) await escenario().encajar(id);
    if (!sonarEvento(d.sonido || "acierto")) reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.8);
    if (vestidor()) vestidor().acierto();
    marcarBurbuja(id, "lograda");
    gestoGuia("celebra");
    globo("", "zoe");
    const voz = hablar(d.textos.acierto || "¡Qué estilo!", "zeus");
    await (anim() ? anim().reaccion(d.animacionPersonaje) : sleep(1200));
    await Promise.race([voz, sleep(2600)]);
    await sleep(200);
    siguientePedido();
}

async function fallar(id, zona) {
    errores++;
    if (id === pedido) erroresPedido++;
    limpiarAyuda(false);
    sonarEvento("regreso");
    if (escenario()) escenario().volverALugar(id, true);
    if (anim()) anim().sorpresa();
    gestoGuia("duda");
    // Tras varios errores, brilla la parte del cuerpo donde va ese accesorio.
    if (erroresPedido >= (Number(cfgJuego().erroresParaBrillo) || 2)) encenderBrillo(accesorioCfg(id).zona);
    const miPedido = pedido;
    await hablar(frase("error"), "zeus");
    if (pedido === miPedido && !bloqueo) programarAyuda();
}

// ------------------------------------------------------------------ fin de ronda y final

// ------------------------------------------------------------------ fin de ronda y final

let tCartel = null;

function mostrarCartel(titulo, sub, ms, clase) {
    const c = document.getElementById("escenario-cartel");
    if (!c) return;
    document.getElementById("escenario-cartel-titulo").textContent = titulo || "";
    const s = document.getElementById("escenario-cartel-sub");
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


/** Ronda completa: Zeus, ya disfrazado, desfila; luego se lo quita todo para la siguiente ronda. */
async function completarRonda() {
    pedido = null;
    bloqueo = true;
    if (arrastre()) arrastre().habilitar(false);
    if (rondaIdx >= rondas.length - 1) {
        terminarJuego();
        return;
    }
    sonarEvento("correcto");
    if (vestidor()) vestidor().fiesta(true);
    mostrarCartel(textos().finalTitulo || "¡QUÉ ESTILO!", "", 2600);
    const voz = hablar(textos().rondaCompleta, "zoe", "celebra");
    if (anim()) await anim().desfile();
    await Promise.race([voz, sleep(3000)]);
    if (vestidor()) vestidor().fiesta(false);
    if (escenario()) await escenario().quitarPuestos();
    empezarRonda(rondaIdx + 1);
}

/**
 * Cierre: el baúl se abre del todo, las luces del vestidor se encienden (pasarela y focos), sale confeti,
 * Zeus hace su pose de modelo y celebra; cartel "¡QUÉ ESTILO!" y la victoria compartida.
 */
async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    bloqueo = true;
    limpiarAyuda(true);
    if (arrastre()) arrastre().habilitar(false);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-final");
    globo("", "zoe");

    if (escenario()) await escenario().baul("abierto");
    sonarEvento("aparece");
    if (vestidor()) {
        vestidor().fiesta(true);
        vestidor().desfile(true);
    }
    const zona = document.getElementById("escenario-zona");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    if (escenario()) {
        const b = escenario().bocaBaul();
        const m = b ? escenario().mundoDePantalla(b.x, b.y) : null;
        if (m) escenario().estrellas(m.x, m.y, 26, null, 1.6);
    }
    sonarEvento("correcto");
    const voz = hablar(textos().final, "zeus");
    gestoGuia("celebra");
    if (anim()) await anim().desfile();
    mostrarCartel(textos().finalTitulo || "¡QUÉ ESTILO!", textos().finalSub || "Ayudaste a Zeus a vestirse correctamente.", 0, "arriba");
    if (window.PedniaFx && zona) window.PedniaFx.celebracion(zona.getBoundingClientRect());
    if (anim()) await anim().alegria(2);
    await Promise.race([voz, sleep(6000)]);
    await sleep(700);
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
    return {
        cancelado: function () { return juegoTerminado; },
        textos: textos,
        pasos: function () { return (gameConfig.demo || []).filter(function (id) { return Reglas.accesorio(gameConfig, id); }); },
        preparar: function () { pintarProgreso(gameConfig.demo || []); },
        decir: function (texto) { return hablar(texto, "zeus"); },
        instruccion: function (id) { return hablar(instruccionDe(id, true), "zeus"); },
        actual: function (id) { marcarBurbuja(id, "actual"); },
        punto: function (id) { return escenario() ? escenario().puntoDe(id) : null; },
        puntoZona: function (id) { return escenario() ? escenario().puntoDe(accesorioCfg(id).zona) : null; },
        tomar: function (id) {
            sonarEvento("agarrar");
            if (escenario()) escenario().tomarItem(id);
        },
        moverA: function (id, p, ms) { return escenario() ? escenario().moverItem(id, p, ms) : sleep(ms); },
        encajar: async function (id) {
            const d = accesorioCfg(id);
            sonarEvento("encaje");
            if (escenario()) await escenario().encajar(id);
            sonarEvento(d.sonido || "acierto");
            marcarBurbuja(id, "lograda");
            const voz = hablar(d.textos.acierto, "zeus");
            if (anim()) await anim().reaccion(d.animacionPersonaje);
            await Promise.race([voz, sleep(2600)]);
        },
        celebrar: async function () {
            sonarEvento("correcto");
            if (anim()) await anim().desfile();
        },
        terminar: async function () {
            pintarProgreso([]);
            globo("", "zoe");
            if (escenario()) {
                await escenario().quitarPuestos();
                await escenario().llenarBandeja(rondas[0].lugares);
            }
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenario_listo = Promise.resolve(false);

$(document).ready(function () {
    gameConfig = JSON.parse(readText("config.json?v=20261110b"));
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
    globo("", "zoe");
    // El vestidor se arma desde el principio (detrás de la intro) con Zeus invisible hasta presentar().
    if (window.EscenarioPhaser) {
        escenario_listo = window.EscenarioPhaser.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (ok && !partidaIniciada) window.EscenarioPhaser.objetos().zeus.setAlpha(0);
            if (ok && arrastre()) arrastre().iniciar({ alTomar: alTomar, alMover: alMover, alSoltar: alSoltar });
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
    window.addEventListener("resize", ubicarGloboZeus);
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
