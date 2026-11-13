/**
 * Zeus3D — Zeus en 3D en el centro de la pista de "El Secuenciador de Baile y Lateralidad" (window.Zeus3D).
 *
 * Usa el modelo propio del juego `zeus_animado_suave.glb`, que **ya trae un clip por cada movimiento**
 * (Saltar, Tocar_cabeza, Aplaudir, Zapatear, Tocar_pies, Abrir_brazos) además de los de siempre (Quieto,
 * Hablar, Celebrar, Bailar, Saludar…). Cada movimiento del juego es ese clip reproducido entero: se ajusta su
 * velocidad para que dure lo que pide la ronda (`ms`) y se avisa el instante del contacto (`alGolpe`) con los
 * tiempos propios de cada clip (CONTACTOS), para que la escena dibuje las estrellas, el destello de las manos o
 * las ondas del zapateo justo en ese momento. Ya no hay poses por código: las hace el animador del modelo.
 *
 * API (script.js la usa solo si existe y está lista):
 *   Zeus3D.listo()                         true cuando el modelo ya se ve.
 *   Zeus3D.hacer(id, {ms, alGolpe})        uno de los 16 comandos del juego (ver MOVIMIENTOS) o "brazos"
 *                                          (celebrar) → Promise al terminar;
 *                                          alGolpe(n) en cada contacto (ver CONTACTOS).
 *   Zeus3D.gesto(nombre)                   "saluda" | "celebra" | "baila" | "amistoso" | "senala" (clips del GLB).
 *   Zeus3D.hablar(on)                      clip de hablar mientras suena su voz.
 *   Zeus3D.detener()                       corta el movimiento en curso (reinicio).
 *   Zeus3D.punto(parte)                    "cabeza" | "manos" | "pies" | "pieDerecho" | "pieIzquierdo" | "centro"
 *                                          → {x, y} en pantalla (para los efectos y la mano de la demo).
 * Si no hay WebGL o el modelo no carga, queda el GIF de Zeus y las acciones solo esperan su tiempo.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

// El modelo vive en SimonDiceCorporal y se reutiliza desde aquí: es el mismo GLB de 17 MB, no se duplica.
// Trae 33 clips; este juego usa los 16 corporales (los de estado de ánimo quedan como gestos o fuera).
const URL_MODELO = new URL("../SimonDiceCorporal/zeus_animado_suave.glb", import.meta.url).href;
const ESCALA = 1.12;
const YAW = 0; // de frente al niño, en el centro de la tarima
const FOV = 26;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const D = Math.PI / 180;

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Porra_con_pompones"],
    baila: ["Bailar"],
    amistoso: ["Decir_si"],
    piensa: ["Pensar"]
};

/*
 * Los seis movimientos del juego: cada uno es un clip del modelo.
 *   clip      nombre de la animación en zeus_animado_suave.glb
 *   contactos instantes del contacto en tiempo normalizado (0 → 1), para avisar `alGolpe(n)` y que la escena
 *             dibuje el efecto y suene justo ahí
 *   baja      hundimiento del cuerpo en cada contacto (unidades del modelo); el clip ya mueve a Zeus, así que
 *             esto es solo el golpecito extra del zapateo
 */
const MOVIMIENTOS = {
    // --- tocar partes del cuerpo
    cabeza: { clip: "Tocar_cabeza", contactos: [0.42, 0.66] },
    cintura: { clip: "Tocar_cintura", contactos: [0.44] },
    pies: { clip: "Tocar_pies", contactos: [0.46] },
    // --- brazos
    aplaudir: { clip: "Aplaudir", contactos: [0.3, 0.52, 0.74] },
    abrirBrazos: { clip: "Abrir_brazos", contactos: [0.42] },
    estirarse: { clip: "Estirarse", contactos: [0.4] },
    // --- lateralidad: el propio modelo distingue derecha e izquierda, no se espeja por código
    brazoDerecho: { clip: "Levantar_brazo_derecho", contactos: [0.42] },
    brazoIzquierdo: { clip: "Levantar_brazo_izquierdo", contactos: [0.42] },
    pieDerecho: { clip: "Levantar_pie_derecho", contactos: [0.44] },
    pieIzquierdo: { clip: "Levantar_pie_izquierdo", contactos: [0.44] },
    // --- piernas y desplazamiento
    zapatear: { clip: "Zapatear", contactos: [0.3, 0.75], baja: 1.2 },
    // el clip Saltar flexiona pero NO desplaza la raíz: el vuelo entre el despegue y la caída se agrega
    // por código (campo `vuelo`), para que Zeus se vea de verdad en el aire
    saltar: { clip: "Saltar", contactos: [0.3, 0.68], vuelo: [0.3, 0.68, 1.1] },
    saltarUnPie: { clip: "Saltar_en_un_pie", contactos: [0.32, 0.62], vuelo: [0.32, 0.62, 0.7] },
    girar: { clip: "Girar", contactos: [0.5] },
    bailar: { clip: "Bailar", contactos: [0.3, 0.7] },
    marchar: { clip: "Caminar", contactos: [0.25, 0.75], baja: 0.6 },
    // --- celebración (no es un botón)
    brazos: { clip: "Celebrar", contactos: [0.25] }
};

/*
 * Duración natural de cada clip (segundos, medida en el GLB). `hacer(id, {ms})` ajusta `timeScale` para que el
 * movimiento dure lo que pide la ronda, sin cortarlo: así el clip se ve entero aunque el ritmo cambie.
 */
const DURACION_CLIP = {
    Tocar_cabeza: 3.4,
    Tocar_cintura: 3.4,
    Tocar_pies: 4.0,
    Aplaudir: 2.1,
    Abrir_brazos: 3.2,
    Estirarse: 4.2,
    Levantar_brazo_derecho: 3.2,
    Levantar_brazo_izquierdo: 3.2,
    Levantar_pie_derecho: 3.0,
    Levantar_pie_izquierdo: 3.0,
    Zapatear: 1.0,
    Saltar: 2.33,
    Saltar_en_un_pie: 5.6,
    Girar: 3.6,
    Bailar: 2.23,
    Caminar: 2.1,
    Celebrar: 2.3
};

// Lo que dura cada movimiento si la ronda no pide otra cosa (ms).
const DURACION = {
    cabeza: 1800, cintura: 1800, pies: 1900,
    aplaudir: 1700, abrirBrazos: 1800, estirarse: 2000,
    brazoDerecho: 1800, brazoIzquierdo: 1800,
    pieDerecho: 1800, pieIzquierdo: 1800,
    zapatear: 1400, saltar: 1800, saltarUnPie: 2100,
    girar: 1900, bailar: 1800, marchar: 1700,
    brazos: 1600
};


let host = null;
let renderer = null;
let scene = null;
let camera = null;
let mixer = null;
let mesh = null;
let raiz = null;
// El AnimationMixer sobrescribe la posición de los huesos (raíz incluida) en cada cuadro, así que el
// desplazamiento vertical del cuerpo va en `mesh.position.y`, que el mixer no toca. `mesh` está en el suelo
// (y = 0) y subirlo levanta a Zeus entero.
const ALTURA_UNIDAD = 0.09;   // cuánto vale una "unidad" de vuelo/hundimiento en el espacio del modelo
let acciones = {};
let actual = null;
let hablando = false;
let enGesto = false;
let turno = {};
let listo = false;
let ultimo = performance.now();
let nodos = {};
let mov = null;        // movimiento (clip) en curso

function clip(nombre) {
    return acciones[nombre] || null;
}

function base() {
    return hablando ? (clip("Hablar") || clip("Quieto")) : clip("Quieto");
}

function cruzar(siguiente, dur) {
    if (!siguiente || siguiente === actual) return;
    siguiente.reset();
    siguiente.setEffectiveWeight(1);
    siguiente.play();
    if (actual) actual.crossFadeTo(siguiente, dur != null ? dur : 0.3, false);
    actual = siguiente;
}

/** Encuadre de cuerpo entero (con los brazos arriba) que cabe en el alto y el ancho de la caja. */
function encuadrar() {
    if (!renderer || !camera || !host) return;
    const lienzo = renderer.domElement;
    const w = Math.max(48, lienzo.clientWidth || host.clientWidth);
    const h = Math.max(48, lienzo.clientHeight || host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // ~1,45 de alto (Zeus mide ~1,15 y sus manos llegan a ~1,1 con los brazos arriba) y ~0,9 de ancho
    const dist = Math.max(0.74 / t, 0.46 / (t * camera.aspect));
    camera.position.set(0, 0.68, dist);
    camera.lookAt(0, 0.66, 0);
    camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------ movimientos (clips del modelo)

/**
 * En cada cuadro: mira por dónde va el clip del movimiento en curso, avisa los contactos que ya pasó y, cuando
 * el clip termina, resuelve la Promise. El clip lo reproduce el AnimationMixer; aquí solo se vigila y se añade
 * el golpecito del cuerpo en el zapateo.
 */
function evaluarMovimiento(ahora) {
    if (!mov) return;
    const u = Math.min(1, (ahora - mov.t0) / mov.dur);
    // desplazamiento vertical del cuerpo: el golpecito del contacto y, en el salto, el vuelo
    if (mesh) {
        let sube = 0;
        if (mov.baja) {
            // hundimiento breve justo en el contacto (zapateo)
            mov.contactos.forEach(function (t) {
                const d = Math.abs(u - t);
                if (d < 0.06) sube -= mov.baja * (1 - d / 0.06);
            });
        }
        if (mov.vuelo) {
            // [despegue, caída, alto]: parábola entre los dos instantes; el clip flexiona, esto lo eleva
            const a = mov.vuelo[0], b = mov.vuelo[1], alto = mov.vuelo[2];
            if (u > a && u < b) {
                const k = (u - a) / (b - a);
                sube += alto * 4 * k * (1 - k);
            }
        }
        mesh.position.y = sube * ALTURA_UNIDAD;
    }
    // avisos de contacto, en los instantes propios del clip
    mov.contactos.forEach(function (t, k) {
        if (u >= t && !mov.avisados[k]) {
            mov.avisados[k] = true;
            mov.golpes++;
            if (typeof mov.alGolpe === "function") {
                try { mov.alGolpe(mov.golpes); } catch (e) { /* noop */ }
            }
        }
    });
    if (u >= 1) terminarMovimiento();
}

function terminarMovimiento() {
    const m = mov;
    mov = null;
    if (mesh) mesh.position.y = 0;
    if (m && m.accion) m.accion.timeScale = 1;
    // vuelve a Quieto/Hablar (si no hay otro movimiento encima)
    if (listo && !enGesto) cruzar(base(), 0.25);
    if (m && m.resolver) m.resolver(true);
}

/**
 * Hace una de las acciones. Devuelve una Promise que se cumple al terminar (con respaldo por tiempo: si la
 * pestaña está oculta y no se dibuja, igual se avisan los golpes y se resuelve).
 */
function hacer(id, opts) {
    opts = opts || {};
    const def = MOVIMIENTOS[id];
    const dur = Math.max(400, (reducido ? 0.8 : 1) * (opts.ms || DURACION[id] || 1600));
    if (mov) terminarMovimiento();
    if (!def) return Promise.resolve(false);
    const contactos = def.contactos || [];
    const a = listo ? clip(def.clip) : null;
    if (!a) {
        // sin 3D (o sin ese clip): solo los avisos en sus instantes
        return new Promise(function (resolve) {
            let n = 0;
            contactos.forEach(function (t) {
                setTimeout(function () {
                    n++;
                    if (typeof opts.alGolpe === "function") opts.alGolpe(n);
                }, t * dur);
            });
            setTimeout(function () { resolve(true); }, dur);
        });
    }
    enGesto = false;
    // el clip se reproduce entero, acelerado o frenado para que dure `dur`
    const natural = DURACION_CLIP[def.clip] || (a.getClip() && a.getClip().duration) || 2;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.timeScale = natural / (dur / 1000);
    actual = null;                       // reinicia aunque sea el mismo clip que antes
    cruzar(a, 0.18);
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.18);
    });
    return new Promise(function (resolve) {
        mov = {
            id: id,
            accion: a,
            contactos: contactos,
            baja: def.baja || 0,
            vuelo: def.vuelo || null,
            t0: performance.now(),
            dur: dur,
            alGolpe: opts.alGolpe,
            avisados: {},
            golpes: 0,
            resolver: resolve
        };
        const propio = mov;
        // respaldo: si el navegador no dibuja (pestaña oculta), avanzar a mano
        const respaldo = function () {
            if (mov !== propio) return;
            if (performance.now() - ultimo > 120) evaluarMovimiento(performance.now());
            if (mov === propio) setTimeout(respaldo, 60);
        };
        setTimeout(respaldo, 60);
    });
}

function detener() {
    if (mov) terminarMovimiento();
}

// ------------------------------------------------------------------ dibujo

function animar() {
    requestAnimationFrame(animar);
    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
    ultimo = ahora;
    if (mixer) mixer.update(reducido ? dt * 0.6 : dt);
    evaluarMovimiento(ahora);
    if (mesh) mesh.rotation.y += (YAW - mesh.rotation.y) * Math.min(1, dt * 6);
    if (renderer) renderer.render(scene, camera);
}

function webglDisponible() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

async function montar() {
    host = document.querySelector("#zeus .zeus-pj");
    if (!host || renderer || !webglDisponible()) return;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "zeus-3d-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    agregarLucesModelo(scene);
    encuadrar();

    try {
        const gltf = await new Promise(function (resolve, reject) {
            crearCargadorGltf().load(URL_MODELO, resolve, undefined, reject);
        });
        mesh = gltf.scene;
        mesh.scale.setScalar(ESCALA);
        mesh.rotation.y = YAW;
        scene.add(mesh);
        mesh.traverse(function (o) {
            if (o.name) nodos[o.name] = o;
        });
        raiz = nodos.raiz || null;
        mixer = new THREE.AnimationMixer(mesh);
        (gltf.animations || []).forEach(function (c) {
            acciones[c.name] = mixer.clipAction(c);
        });
        ["Quieto", "Hablar"].forEach(function (n) {
            if (acciones[n]) acciones[n].setLoop(THREE.LoopRepeat, Infinity);
        });
        mixer.addEventListener("finished", function (ev) {
            if (ev.action !== actual) return;
            enGesto = false;
            cruzar(base(), 0.35);
        });
        cruzar(base(), 0);
        encuadrar();
        animar();
        listo = true;
        host.classList.add("zeus-3d-lista");
        if (typeof ResizeObserver === "function") new ResizeObserver(encuadrar).observe(host);
        else window.addEventListener("resize", encuadrar);
        window.dispatchEvent(new CustomEvent("zeus3d-listo"));
    } catch (e) {
        console.warn("[Zeus3D] no se pudo cargar Zeus 3D; queda el GIF", e);
        renderer.domElement.remove();
        renderer.dispose();
        renderer = null;
    }
}

function hablar(on) {
    hablando = !!on;
    if (!listo || enGesto) return;
    cruzar(base(), 0.25);
}

function gesto(nombre) {
    if (!listo) return;
    const opciones = GESTOS[nombre];
    if (!opciones) return;
    if (mov) terminarMovimiento();
    turno[nombre] = (turno[nombre] || 0) + 1;
    const a = clip(opciones[(turno[nombre] - 1) % opciones.length]);
    if (!a) return;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    enGesto = true;
    actual = null; // reinicia aunque sea el mismo gesto
    cruzar(a, 0.25);
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
    });
}

// ------------------------------------------------------------------ puntos en pantalla

const vTmp = new THREE.Vector3();

function aPantalla(v) {
    if (!renderer || !camera) return null;
    const r = renderer.domElement.getBoundingClientRect();
    const p = v.clone().project(camera);
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
}

function mundo(nombre, local) {
    const n = nodos[nombre];
    if (!n) return null;
    n.updateWorldMatrix(true, false);
    return n.localToWorld(vTmp.set(local[0], local[1], local[2]).clone());
}

function respaldoCaja(fx, fy) {
    const r = host ? host.getBoundingClientRect() : null;
    if (!r) return null;
    return { x: r.left + r.width * fx, y: r.top + r.height * fy };
}

function punto(parte) {
    if (!listo) {
        const tabla = { cabeza: [0.5, 0.12], manos: [0.5, 0.45], pies: [0.5, 0.97], pieDerecho: [0.42, 0.97], pieIzquierdo: [0.58, 0.97], centro: [0.5, 0.5] };
        const f = tabla[parte] || tabla.centro;
        return respaldoCaja(f[0], f[1]);
    }
    if (parte === "cabeza") return aPantalla(mundo("cabeza", [0, 0, 44]));
    if (parte === "manos") {
        const a = mundo("muneca_L", [-3, 0, 0]);
        const b = mundo("muneca_R", [3, 0, 0]);
        if (!a || !b) return respaldoCaja(0.5, 0.45);
        return aPantalla(a.add(b).multiplyScalar(0.5));
    }
    if (parte === "pieDerecho") return aPantalla(mundo("rodilla_R", [0, 0, -14]));
    if (parte === "pieIzquierdo") return aPantalla(mundo("rodilla_L", [0, 0, -14]));
    if (parte === "pies") {
        const a = mundo("rodilla_R", [0, 0, -14]);
        const b = mundo("rodilla_L", [0, 0, -14]);
        if (!a || !b) return respaldoCaja(0.5, 0.97);
        return aPantalla(a.add(b).multiplyScalar(0.5));
    }
    return aPantalla(mundo("columna", [0, 0, 14]));
}

window.Zeus3D = {
    listo: function () { return listo; },
    hacer: hacer,
    gesto: gesto,
    hablar: hablar,
    detener: detener,
    punto: punto,
    lienzo: function () { return renderer ? renderer.domElement : null; },
    // para depurar desde la consola
    _nodos: function () { return nodos; }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
} else {
    montar();
}
