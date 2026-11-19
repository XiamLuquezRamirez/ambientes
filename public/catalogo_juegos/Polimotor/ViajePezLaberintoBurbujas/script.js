/**
 * ¡El Viaje del Pez por el Laberinto de Burbujas! — control del juego (Polimotor, Prejardín 3-4 años,
 * Eje 2 Coordinación y orientación, laberintos de coordinación).
 *
 * Flujo (mismo modelo que los demás Polimotor): pantalla de inicio → intro 3D (Zeus y Zoe) → PedniaEdad →
 * PRESENTACIÓN (título, Zoe 3D entra caminando, el pez llega nadando a la concha, se ve el coral y Zoe dice la
 * invitación) → DEMO automática sin botón (voz de Zeus; la mano toma al pez, lo lleva por una curva y un giro, se
 * desvía un poco y regresa, y llega al coral) → Zoe se va → "¡Comenzar a jugar!" → 4 RECORRIDOS generados al azar
 * con dificultad progresiva, cada uno con su transición (corriente de burbujas, aparece el camino nuevo, el pez
 * llega a la concha y se oye la instrucción; al llegar el pez salta de alegría y entra en la cueva del coral) →
 * FINAL (el pez nada hasta el gran arrecife, se acomoda con sus amigos, todo se ilumina, Zoe entra y celebra) →
 * RESUMEN con una medalla y la miniatura de cada camino y "¡JUGAR OTRA VEZ!" (cuatro recorridos nuevos).
 *
 * Zeus no se dibuja: solo se oye su voz. Durante la partida solo está la escena. Nada resta: salirse pone el
 * camino en rojo con una alerta y una corriente suave invita al pez a volver; un callejón termina en una señal
 * amable y el pez regresa solo a la bifurcación sin perder el avance; los lazos vuelven a unirse al camino.
 *
 * Módulos: ReglasPez (generador y nado, puro) · IconosPez (dibujos) · SonidosPez (Web Audio) ·
 * EscenarioPez (Phaser) · ArrastrePez (ratón y dedo) · PezDemo · Guia3D (Zoe 3D)
 */
let introConfig = null;
let gameConfig = null;
let conversacionCancelada = false;
let cerrardo = false;
let introDesdeEmpecemos = false;
let introOmitida = false;
let audioFondo = null;

let partidaIniciada = false;
let partida = null;           // { semilla, recorridos: [4] }
let demoRec = null;
let indice = 0;               // recorrido actual (0..3)
let jugando = false;
let juegoTerminado = false;
let enDemo = false;
let ocupado = false;          // callejón, regreso o transición en curso
let completados = [];
let resultados = [];          // por recorrido: { total, reventadas, estrellas }
let tRevienta = 0;
let movido = false;           // el niño ya movió el pez en este recorrido
let tAviso = 0;
let tAlerta = null;
let tNado = null;
let ultimaFrase = {};
let ayuda = { voz: null, repetir: null, token: 0, nivel: 0 };

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

function sfx() {
    return window.SonidosPez || null;
}

function efecto(nombre) {
    const s = sfx();
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function escenario() {
    return window.EscenarioPez && window.EscenarioPez.listo() ? window.EscenarioPez : null;
}

function arrastre() {
    return window.ArrastrePez || null;
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

function defRecorrido(i) {
    return (gameConfig.recorridos || [])[i] || {};
}

function feedbackActivo() {
    return gameConfig.mostrarFeedBack !== false;
}

function frase(clave) {
    const v = textos()[clave];
    if (!Array.isArray(v)) return v || "";
    if (v.length < 2) return v[0] || "";
    let i = Math.floor(Math.random() * v.length);
    if (i === ultimaFrase[clave]) i = (i + 1) % v.length;
    ultimaFrase[clave] = i;
    return v[i];
}

// ------------------------------------------------------------------ Zoe y voces

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

function nubeZoe(texto) {
    const caja = document.getElementById("zoe-nube");
    const span = document.getElementById("zoe-nube-texto");
    if (!caja || !span) return;
    if (!texto) {
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

/**
 * Habla Zoe (por defecto) o Zeus. Promise que termina con la voz. La nube de Zoe solo se ve si Zoe está en
 * escena; Zeus no aparece en pantalla, solo se oye. `nube`: texto corto para la nube de Zoe.
 */
function hablar(texto, pj, gesto, nube) {
    const quien = pj === "zeus" ? "zeus" : "zoe";
    if (quien === "zoe") nubeZoe(zoeEnEscena ? (nube || texto) : "");
    if (gesto) gestoGuia(gesto);
    const fin = function () {
        if (quien === "zoe" && guia3d()) guia3d().hablar(false);
    };
    if (!texto || !feedbackActivo() || typeof TextoVoz === "undefined") {
        setTimeout(fin, 1200);
        return Promise.resolve();
    }
    if (quien === "zoe" && guia3d()) guia3d().hablar(true);
    return TextoVoz.hablar(texto, quien).then(fin, fin);
}

// ------------------------------------------------------------------ intro 3D (igual que los demás Polimotor)

function sincronizarDialogoIntro3d() {
    if (!window.INTRO_CONFIG) return;
    if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
    const conversacion = textos().conversacion || [];
    const personajesCfg = window.INTRO_CONFIG.personajes || [];
    const colores = window.INTRO_CONFIG.dialogo.colores || {};
    window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
        const indiceP = Number(linea.personaje);
        const def = personajesCfg[isFinite(indiceP) ? indiceP : 0] || personajesCfg[0] || {};
        const id = def.id || (indiceP === 1 ? "zoe" : "zeus");
        const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indiceP] && introConfig.personajes[indiceP].nombre)
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
    if (sfx()) sfx().desbloquear();
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

/** Música ambiental submarina (sintetizada en sonidos.js); TextoVoz le ajusta el volumen. */
function asegurarAudioFondo() {
    if (!audioFondo && sfx()) audioFondo = sfx().musica();
    if (audioFondo) {
        audioFondo.volume = TextoVoz.VOLUMEN_FONDO;
        audioFondo.play();
    }
    return audioFondo;
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
    { key: "ayudaAutomatica", label: "Ayuda visual (burbujas que guían)" },
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
    pintarNivel();
}

// ------------------------------------------------------------------ Zoe 3D (presentación, demo y final)

let zoeEnEscena = false;

function ubicarZoe() {
    const pj = document.querySelector("#guia .guia-pj");
    const z = escenario() ? escenario().zonaZoe() : null;
    if (!pj || !z) return;
    const ancho = Math.max(z.width * 1.05, 170);
    const alto = Math.min(Math.max(z.height, 260), ancho / 0.5, window.innerHeight * 0.58);
    pj.style.left = Math.round(Math.max(4, z.left - z.width * 0.02)) + "px";
    pj.style.top = Math.round(z.bottom - alto) + "px";
    pj.style.width = Math.round(ancho) + "px";
    pj.style.height = Math.round(alto) + "px";
}

function guiaMovil() {
    return window.Guia3D && window.Guia3D.listo() && window.Guia3D.caminar ? window.Guia3D : null;
}

function caminarHasta(pj, x, ms, lado) {
    const g = guiaMovil();
    if (g) {
        g.mirar(lado);
        g.caminar(true);
    }
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

async function zoeEntra() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !escenario()) return;
    if (zoeEnEscena) {
        ubicarZoe();
        return;
    }
    zoeEnEscena = true;
    document.body.classList.add("zoe-grande");
    ubicarZoe();
    const destino = parseFloat(pj.style.left) || 0;
    const ancho = parseFloat(pj.style.width) || 200;
    pj.style.left = Math.round(-ancho - 20) + "px";
    await caminarHasta(pj, destino, duracionPasos(destino + ancho), "derecha");
}

async function zoeSale() {
    const pj = document.querySelector("#guia .guia-pj");
    if (!pj || !zoeEnEscena) return;
    nubeZoe("");
    const ancho = parseFloat(pj.style.width) || 200;
    const desde = parseFloat(pj.style.left) || 0;
    await caminarHasta(pj, -ancho - 20, duracionPasos(desde + ancho), "izquierda");
    zoeEnEscena = false;
    document.body.classList.remove("zoe-grande");
}

// ------------------------------------------------------------------ indicador de nivel (abajo a la izquierda)

function pintarNivel(animarIdx) {
    const caja = document.getElementById("nivel");
    if (!caja) return;
    caja.hidden = !acc().mostrarProgreso;
    const items = caja.querySelectorAll(".nivel-paso");
    items.forEach(function (it, i) {
        it.classList.toggle("hecho", completados.indexOf(i) >= 0);
        it.classList.toggle("actual", jugando && i === indice && completados.indexOf(i) < 0);
        let est = it.querySelector(".nivel-est");
        if (!est) {
            est = document.createElement("span");
            est.className = "nivel-est";
            est.setAttribute("aria-hidden", "true");
            it.appendChild(est);
        }
        const res = resultados[i];
        est.textContent = res ? "★".repeat(res.estrellas) + "☆".repeat(3 - res.estrellas) : "";
        if (i === animarIdx) {
            it.classList.remove("gana");
            void it.offsetWidth;
            it.classList.add("gana");
        }
    });
    const rot = document.getElementById("nivel-rotulo");
    if (rot) rot.textContent = (textos().progreso || "RECORRIDO") + " " + Math.min(4, indice + 1) + " DE 4";
    caja.setAttribute("aria-label", completados.length + " de 4 recorridos completados");
}

function avanceNivel(frac) {
    const it = document.querySelectorAll("#nivel .nivel-paso")[indice];
    if (it) it.style.setProperty("--avance", Math.round(frac * 100) + "%");
}

// ------------------------------------------------------------------ carteles y botón central

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

let tCartel = null;

function mostrarCartel(titulo, sub, ms) {
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
    if (ms) tCartel = setTimeout(ocultarCartel, ms);
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

/** Genera cuatro recorridos nuevos (semilla nueva) para el tamaño de pantalla actual. */
function nuevaPartida() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    partida = ReglasPez.generarPartida(gameConfig, dims, null, { paso: cfgJuego().paso || 8 });
    completados = [];
    resultados = [];
    indice = 0;
    document.querySelectorAll("#nivel .nivel-paso").forEach(function (it) { it.style.setProperty("--avance", "0%"); });
    pintarNivel();
    return partida;
}

function generarDemo() {
    const dims = escenario() ? escenario().dimensionesMundo() : { W: 1600, H: 900 };
    const def = Object.assign({}, gameConfig.demoRecorrido || {}, { falsos: [1, 1] });
    for (let i = 0; i < 6 && !demoRec; i++) demoRec = ReglasPez.generarRecorrido(def, dims, ReglasPez.semillaNueva(), { paso: cfgJuego().paso || 8 });
    return demoRec;
}

/**
 * Presentación: título, Zoe entra caminando, el pez llega nadando a la concha de salida (el coral brilla al otro
 * lado) y Zoe invita a ayudarlo.
 */
async function presentar() {
    const e = escenario();
    if (!e) return;
    mostrarCartel(textos().tituloIntro, textos().subtituloIntro);
    efecto("brillo");
    await Promise.all([zoeEntra(), sleep(2600)]);
    ocultarCartel();
    efecto("corriente");
    await e.llegarInicio();
    gestoGuia("saluda");
    await Promise.race([hablar(textos().introZoe, "zoe", "senala", textos().introZoe), sleep(11000)]);
    nubeZoe("");
    await sleep(300);
}

/** Arranque único (el selector de edad puede avisar más de una vez). */
async function iniciarJuego() {
    if (partidaIniciada) return;
    partidaIniciada = true;
    juegoTerminado = false;
    document.body.classList.add("demo-lock");
    await escenarioListo;
    if (!escenario()) return;
    generarDemo();
    if (demoRec) await escenario().cargarRecorrido(demoRec, { animar: true });
    if (sfx()) sfx().nado(true);
    arrancarNado();
    await presentar();

    if (acc().mostrarIntro && window.PezDemo && demoRec) {
        enDemo = true;
        try {
            await window.PezDemo.correr(apiDemo());
        } catch (e) {
            console.warn("[ViajePez] demo", e);
        }
        enDemo = false;
        if (window.PedniaTutorial) window.PedniaTutorial.quitarManos();
    }
    await zoeSale();
    await esperarBoton(textos().botonComenzar || "¡Comenzar a jugar!", "fa-solid fa-play");
    nuevaPartida();
    comenzarRecorrido(true);
}

// ------------------------------------------------------------------ sonido del nado

function arrancarNado() {
    clearInterval(tNado);
    tNado = setInterval(function () {
        if (!sfx() || !escenario()) return;
        const p = escenario().piloto();
        sfx().nadoVelocidad(p.visible ? p.empuje : 0);
    }, 90);
}

function pararNado() {
    clearInterval(tNado);
    tNado = null;
    if (sfx()) sfx().nado(false);
}

// ------------------------------------------------------------------ recorridos

/**
 * Transición y arranque de un recorrido: el camino anterior se va, sube una corriente de burbujas, aparece el
 * camino nuevo con sus burbujas-guía en ola, cartel con el nombre, el pez llega a la concha y se oye la instrucción.
 */
async function comenzarRecorrido(desdeDemo) {
    const e = escenario();
    if (!e || !partida) return;
    const rec = partida.recorridos[indice];
    const def = defRecorrido(indice);
    jugando = false;
    ocupado = true;
    movido = false;
    limpiarAyuda();
    document.body.classList.add("demo-lock");
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    e.mostrarPez(false);
    nubeZoe("");
    await e.ocultarRecorrido();
    efecto("corriente");
    await e.corriente(desdeDemo ? 1000 : 1200);
    await e.cargarRecorrido(rec, { animar: true });
    pintarNivel();
    mostrarCartel(def.titulo || ("RECORRIDO " + (indice + 1)), def.nombre || "", 2600);
    if (sfx()) sfx().nado(true);
    arrancarNado();
    await e.llegarInicio();
    await sleep(400);
    jugando = true;
    ocupado = false;
    pintarNivel();
    e.bloquear(false);
    document.body.classList.remove("demo-lock");
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
    hablar(def.instruccion, def.voz === "zeus" ? "zeus" : "zoe");
}

async function completarRecorrido() {
    const e = escenario();
    if (!e || !jugando) return;
    jugando = false;
    ocupado = true;
    limpiarAyuda();
    alertaFuera(false);
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    document.body.classList.add("demo-lock");
    completados.push(indice);
    const cuenta = e.burbujas();
    resultados[indice] = {
        total: cuenta.total,
        reventadas: cuenta.reventadas,
        estrellas: ReglasPez.estrellas(cuenta.reventadas, cuenta.total, cfgJuego().estrellas)
    };
    avanceNivel(1);
    pintarNivel(indice);
    efecto("exito");
    sonarEvento("acierto", { vol: 0.5 });
    const def = defRecorrido(indice);
    const paso = document.querySelectorAll("#nivel .nivel-paso")[indice];
    if (window.PedniaFx && paso) window.PedniaFx.celebracion(paso.getBoundingClientRect());
    if (indice >= 3) {
        // último recorrido: primero su resumen de estrellas, luego el final
        await mostrarNivelResumen(indice);
        terminarJuego();
        return;
    }
    await e.celebrarRecorrido();
    const voz = hablar(def.logro, indice % 2 === 0 ? "zoe" : "zeus");
    // el pez entra en la cueva del coral; el cartel sale después para no tapar el coral
    await e.entrarCoral(function (f) { efecto(f === "entra" ? "regreso" : "coral"); });
    mostrarCartel(def.logro || "¡Muy bien!", "");
    await Promise.all([Promise.race([voz, sleep(3500)]), sleep(1800)]);
    ocultarCartel();
    await mostrarNivelResumen(indice);
    indice++;
    comenzarRecorrido(false);
}

function plantilla(texto, datos) {
    return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) { return datos[k] != null ? datos[k] : m; });
}

/**
 * Resumen del nivel: tres estrellas que se encienden una a una según las burbujas que el pez reventó al salirse
 * del camino ("Burbujas reventadas: r de t"). Sigue solo tras unos segundos o al tocar la tarjeta.
 */
async function mostrarNivelResumen(i) {
    const panel = document.getElementById("nivel-resumen");
    const res = resultados[i];
    if (!panel || !res) return;
    const T = textos();
    document.getElementById("nivel-resumen-titulo").textContent = plantilla(T.nivelTitulo || "¡RECORRIDO {n} COMPLETADO!", { n: i + 1 });
    document.getElementById("nivel-resumen-nombre").textContent = defRecorrido(i).nombre || "";
    document.getElementById("nivel-resumen-burbujas").textContent = plantilla(T.nivelBurbujas || "Burbujas reventadas: {r} de {t}", { r: res.reventadas, t: res.total });
    const barra = document.getElementById("nivel-resumen-barra");
    if (barra) barra.style.setProperty("--sanas", Math.round((1 - res.reventadas / Math.max(1, res.total)) * 100) + "%");
    const estrellas = panel.querySelectorAll(".nr-estrella");
    estrellas.forEach(function (st) { st.classList.remove("on", "pop"); });
    panel.hidden = false;
    panel.classList.remove("sale");
    await sleep(500);
    for (let k = 0; k < 3; k++) {
        if (k < res.estrellas) {
            estrellas[k].classList.add("on", "pop");
            efecto("estrella", k);
            if (window.PedniaFx) window.PedniaFx.celebracion(estrellas[k].getBoundingClientRect());
        }
        await sleep(420);
    }
    const voces = T.estrellasVoz || [];
    const voz = hablar(voces[res.estrellas - 1] || "", i % 2 === 0 ? "zoe" : "zeus");
    // sigue solo (voz + un momento para mirar) o al tocar la tarjeta
    await new Promise(function (resolve) {
        let listo = false;
        const fin = function () {
            if (listo) return;
            listo = true;
            panel.removeEventListener("click", fin);
            resolve();
        };
        panel.addEventListener("click", fin);
        Promise.all([Promise.race([voz, sleep(6000)]), sleep(3200)]).then(fin);
    });
    panel.classList.add("sale");
    await sleep(350);
    panel.hidden = true;
    panel.classList.remove("sale");
}

// ------------------------------------------------------------------ eventos de la escena

let zonaActual = "pista";

function alertaFuera(on) {
    document.body.classList.toggle("fuera-pista", !!on);
    clearInterval(tAlerta);
    tAlerta = null;
    if (on) {
        efecto("alerta");
        tAlerta = setInterval(function () { efecto("alerta"); }, 1400);
    }
}

function alZona(z) {
    const antes = zonaActual;
    zonaActual = z;
    if (!(jugando || enDemo)) {
        alertaFuera(false);
        return;
    }
    const fuera = z !== "pista";
    const estabaFuera = antes !== "pista";
    if (fuera !== estabaFuera) alertaFuera(fuera);
    // volvió al camino: sonido positivo y el camino recupera su color
    if (!fuera && estabaFuera) {
        efecto("positivo");
        if (escenario()) {
            const p = escenario().piloto();
            escenario().onda(p.x, p.y, 0x8ce99a);
        }
    }
    if (fuera && jugando && Date.now() - tAviso > 7000) {
        tAviso = Date.now();
        hablar(frase("fuera"), "zoe");
    }
}

/** El pez se salió y reventó una burbuja del borde (sonido con un límite para no saturar). */
function alRevienta() {
    if (Date.now() - tRevienta < 70) return;
    tRevienta = Date.now();
    efecto("revienta");
}

function alLuz(n) {
    efecto("burbuja", n % 10);
    if (escenario()) escenario().pulsoFondo(0.04);
}

function alAvance(frac) {
    if (jugando) avanceNivel(frac);
}

async function alCallejon(rama) {
    const e = escenario();
    if (!e || !jugando || ocupado) return;
    ocupado = true;
    limpiarAyuda();
    if (arrastre()) arrastre().habilitar(false);
    e.bloquear(true);
    alertaFuera(false);
    efecto("callejon");
    e.senalCallejon(rama, true);
    await e.sacudir();
    const voz = hablar(textos().callejon, "zeus");
    await sleep(900);
    efecto("regreso");
    await e.regresarCallejon(rama);
    e.senalCallejon(rama, false);
    await Promise.race([voz, sleep(2500)]);
    if (!jugando) return;
    ocupado = false;
    e.bloquear(false);
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
}

async function regresarAPista(conVoz) {
    const e = escenario();
    if (!e || ocupado || !jugando) return;
    ocupado = true;
    if (arrastre()) arrastre().habilitar(false);
    efecto("regreso");
    if (conVoz && Date.now() - tAviso > 5000) {
        tAviso = Date.now();
        hablar(textos().regreso, "zoe");
    }
    await e.regresar();
    alertaFuera(false);
    if (!jugando) return;
    ocupado = false;
    if (arrastre()) arrastre().habilitar(true);
    programarAyuda();
}

function alDesvio() {
    if (!jugando) return;
    if (arrastre()) arrastre().cancelar();
    regresarAPista(true);
}

function alMeta() {
    if (enDemo) return;
    if (!jugando) return;
    if (arrastre()) arrastre().cancelar();
    completarRecorrido();
}

function alMover() {
    if (!jugando) return;
    if (!movido) movido = true;
    programarAyudaSuave();
}

// ------------------------------------------------------------------ entrada (callbacks de arrastre.js)

function puedeTomar() {
    return jugando && !ocupado && !juegoTerminado && !enDemo;
}

function alTomar() {
    limpiarAyuda();
    sonarEvento("agarrar", { vol: 0.5 });
}

function alSoltar(zona) {
    if (!jugando || ocupado) return;
    if (zona && zona !== "pista") regresarAPista(false);
    programarAyuda();
}

function alTocarFuera(w) {
    if (!jugando || ocupado || !escenario()) return;
    // tocó lejos del pez: una onda donde tocó y el pez brilla para mostrar dónde poner el dedo
    const e = escenario();
    const p = e.piloto();
    if (w) e.onda(w.x, w.y, 0xc5f6fa);
    e.chispas(p.x, p.y, 10, 0.6);
    efecto("brillo");
}

// ------------------------------------------------------------------ ayuda gradual (sin resolver la actividad)

function limpiarAyuda() {
    clearTimeout(ayuda.voz);
    clearTimeout(ayuda.repetir);
    ayuda.token++;
}

let tSuave = 0;

function programarAyudaSuave() {
    if (Date.now() - tSuave < 600) return;
    tSuave = Date.now();
    ayuda.nivel = 0;
    programarAyuda();
}

/**
 * Sin movimiento durante ayudaMs: 1) si no ha tocado al pez, Zoe explica cómo arrastrarlo y el pez brilla; si ya
 * juega, Zoe dice "¡Sigue las burbujas que brillan!" y parpadean las próximas burbujas del camino.
 * 2) si sigue sin moverse, una burbuja dorada avanza un tramo corto por el camino correcto.
 */
function programarAyuda() {
    limpiarAyuda();
    if (!jugando || juegoTerminado) return;
    const token = ayuda.token;
    const vigente = function () { return token === ayuda.token && jugando && !juegoTerminado && !ocupado && !(arrastre() && arrastre().arrastrando()); };
    const pista = function () {
        if (!vigente() || !escenario()) return;
        const e = escenario();
        const p = e.piloto();
        if (!movido) {
            e.chispas(p.x, p.y, 12, 0.6);
            e.onda(p.x, p.y, 0xffe066);
            if (acc().ayudaAutomatica) e.pistaLuces(3);
            hablar(textos().pistaArrastra, "zoe");
        } else if (ayuda.nivel === 0) {
            if (acc().ayudaAutomatica) e.pistaLuces(6);
            efecto("brillo");
            hablar(textos().pista, "zoe");
        } else if (acc().ayudaAutomatica) {
            const rec = e.recorrido();
            const s = p.avance * rec.paso;
            e.burbujaGuia(s, s + Math.max(rec.rejilla.cx, rec.rejilla.cy) * 2.2, 2600);
            hablar(textos().pista, "zoe");
        }
        ayuda.nivel = Math.min(2, ayuda.nivel + 1);
        ayuda.repetir = setTimeout(pista, Number(cfgJuego().ayudaRepetirMs) || 12000);
    };
    ayuda.voz = setTimeout(pista, Number(cfgJuego().ayudaMs) || 9000);
}

// ------------------------------------------------------------------ final y resumen

async function terminarJuego() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    jugando = false;
    limpiarAyuda();
    alertaFuera(false);
    if (arrastre()) arrastre().habilitar(false);
    if (typeof Swal !== "undefined") Swal.close();
    document.body.classList.add("demo-lock", "en-final");
    const e = escenario();
    mostrarCartel(defRecorrido(3).logro || "¡Lo lograste!", "", 2600);
    hablar(defRecorrido(3).logro, "zeus");
    efecto("coral");
    await e.finalCinematica();
    pararNado();
    efecto("fanfarria");
    const fiesta = function () {
        e.fuegos(4);
        efecto("fiesta");
        if (window.PedniaFx) window.PedniaFx.celebracion({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight * 0.7 });
    };
    fiesta();
    mostrarCartel(textos().finalTitulo || "¡EXCELENTE NAVEGADOR!", textos().finalSub || "");
    await zoeEntra();
    gestoGuia("celebra");
    const tFiesta = setInterval(fiesta, 2800);
    await Promise.all([Promise.race([hablar(textos().finalZoe, "zoe", null, textos().finalNube || "¡EXCELENTE NAVEGADOR!"), sleep(14000)]), sleep(4000)]);
    nubeZoe("");
    if (guia3d()) guia3d().gesto("final");
    await sleep(1500);
    clearInterval(tFiesta);
    ocultarCartel();
    mostrarResumen();
}

const MEDALLAS = ["#74c0fc", "#63e6be", "#b197fc", "#ffd43b"];

/** Panel del final: una medalla por recorrido con la miniatura real de cada camino de esta partida. */
function mostrarResumen() {
    const panel = document.getElementById("resumen");
    const lista = document.getElementById("resumen-lista");
    if (!panel || !lista || !partida) return;
    lista.innerHTML = "";
    partida.recorridos.forEach(function (rec, i) {
        const def = defRecorrido(i);
        const li = document.createElement("li");
        li.className = "resumen-item";
        li.style.setProperty("--i", i);
        li.style.setProperty("--medalla", MEDALLAS[i % MEDALLAS.length]);
        const img = document.createElement("img");
        img.alt = "Camino del recorrido " + (i + 1);
        img.src = escenario() ? escenario().miniatura(rec, 220, 130) : "";
        const txt = document.createElement("div");
        txt.className = "resumen-texto";
        txt.innerHTML = '<strong></strong><span></span>';
        txt.querySelector("strong").textContent = (i + 1) + ". " + (def.nombre || "");
        const res = resultados[i];
        if (res) {
            txt.querySelector("span").innerHTML = '<b class="resumen-est"></b><small></small>';
            txt.querySelector(".resumen-est").textContent = "★".repeat(res.estrellas) + "☆".repeat(3 - res.estrellas);
            txt.querySelector("small").textContent = plantilla(textos().nivelBurbujas || "Burbujas reventadas: {r} de {t}", { r: res.reventadas, t: res.total });
        } else {
            txt.querySelector("span").innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (textos().completado || "completado");
        }
        const med = document.createElement("span");
        med.className = "resumen-medalla";
        med.setAttribute("aria-hidden", "true");
        med.innerHTML = '<i class="fa-solid fa-medal"></i><b>' + (i + 1) + "</b>";
        li.appendChild(med);
        li.appendChild(img);
        li.appendChild(txt);
        lista.appendChild(li);
    });
    const tot = resultados.reduce(function (a, r) { return a + (r ? r.estrellas : 0); }, 0);
    const sub = document.querySelector("#resumen .resumen-sub");
    if (sub) sub.textContent = (textos().resumenTitulo || "¡Tu viaje bajo el mar!") + " · " + plantilla(textos().resumenEstrellas || "Estrellas: {e} de 12", { e: tot });
    panel.hidden = false;
    sonarEvento("victoria");
    if (sonido()) sonido().agacharMusica(0.35);
    const btn = document.getElementById("btn-otra-vez");
    if (btn) btn.focus();
}

/** ¡JUGAR OTRA VEZ!: cuatro recorridos completamente nuevos, sin repetir la presentación ni la demo. */
async function jugarOtraVez() {
    const panel = document.getElementById("resumen");
    if (panel) panel.hidden = true;
    nubeZoe("");
    if (TextoVoz.detener) TextoVoz.detener();
    document.body.classList.remove("en-final");
    zoeSale();
    juegoTerminado = false;
    if (escenario()) escenario().reiniciarVista();
    nuevaPartida();
    comenzarRecorrido(false);
}

// ------------------------------------------------------------------ API para la demo (demo.js)

function apiDemo() {
    const e = escenario();
    let llego = false;
    return {
        cancelado: function () { return juegoTerminado || !escenario(); },
        textos: textos,
        preparar: function () {
            e.mostrarPez(true);
            e.bloquear(false);
        },
        decir: function (texto) { return hablar(texto, "zoe", "senala"); },
        decirZeus: function (texto) { return hablar(texto, "zeus"); },
        ancho: function () { return e.recorrido().ancho; },
        puntoPez: function () { return e.puntoPez(); },
        aPantalla: function (w) { return e.aPantalla(w.x, w.y); },
        puntoCamino: function (u) {
            const r = e.recorrido();
            return ReglasPez.puntoEn(r, u * r.largo);
        },
        tomar: function () {
            const p = e.piloto();
            sonarEvento("agarrar", { vol: 0.5 });
            e.empezarArrastre(p.x, p.y);
        },
        mover: function (w) {
            e.moverObjetivo(w.x, w.y);
            if (e.piloto().enMeta) llego = true;
        },
        llego: function () { return llego; },
        soltar: function () { e.soltar(); },
        felicitar: async function () {
            alertaFuera(false);
            efecto("exito");
            await e.celebrarRecorrido();
            await e.entrarCoral(function (f) { efecto(f === "entra" ? "regreso" : "coral"); });
            gestoGuia("celebra");
            mostrarCartel(textos().demostracionBien || "¡Así se hace!", "", 1600);
            await sleep(1500);
        },
        cerrar: async function () {
            await Promise.race([hablar(textos().demoFin, "zoe", "celebra"), sleep(7000)]);
        },
        terminar: async function () {
            alertaFuera(false);
            e.bloquear(true);
            nubeZoe("");
        }
    };
}

// ------------------------------------------------------------------ arranque

let escenarioListo = Promise.resolve(false);

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
    window.addEventListener("pagehide", function () { TextoVoz.vaciar(); pararNado(); });

    nubeZoe("");
    pintarNivel();

    if (window.EscenarioPez) {
        escenarioListo = window.EscenarioPez.montar(document.getElementById("escenario-phaser"), gameConfig).then(function (ok) {
            if (!ok) return ok;
            window.EscenarioPez.on({
                zona: alZona,
                luz: alLuz,
                avance: alAvance,
                callejon: alCallejon,
                meta: alMeta,
                desvio: alDesvio,
                mueve: alMover,
                revienta: alRevienta
            });
            if (arrastre()) arrastre().iniciar({ puedeTomar: puedeTomar, alTomar: alTomar, alSoltar: alSoltar, alTocarFuera: alTocarFuera });
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
    if (btnOtra) btnOtra.addEventListener("click", jugarOtraVez);
    window.addEventListener("victory-continue", empezarJuegoTrasIntro);
    window.addEventListener("resize", function () {
        setTimeout(function () {
            const pj = document.querySelector("#guia .guia-pj");
            if (zoeEnEscena && pj && !pj.dataset.caminando) ubicarZoe();
        }, 80);
    });
    window.addEventListener("message", function (ev) {
        if (ev.origin !== window.location.origin) return;
        if (ev.data && ev.data.type === "pednia:perfil") {
            window.__PEDNIA_PERFIL__ = ev.data.perfil;
        }
    });
});
