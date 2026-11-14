/**
 * Guia3D — Zeus en 3D como guía de "El Memorama de las Partes del Cuerpo" (window.Guia3D). Solo sale en la
 * presentación y la demostración: entra caminando por la izquierda del tablero, explica el juego y se va antes
 * de jugar (durante la partida solo se oyen las voces).
 *
 * Copia sin cambios de lógica del módulo de "¿Dónde lo uso?" (que camina: caminar/mirar), con el modelo
 * nino.glb de intro3d (Zeus, el mismo del Toque Mágico y la Linterna; mismos clips que nina.glb):
 *   Quieto (reposo) · Hablar (mientras suena su voz) · Saludar · Senalar · Celebrar / Aplaudir / Saltar · Pensar
 * Si no hay WebGL o el modelo no carga, queda el GIF de Zeus (no se toca hasta que el 3D está listo).
 *
 * API (script.js la usa solo si existe):
 *   Guia3D.hablar(on)      Zeus habla o vuelve a quedarse quieto.
 *   Guia3D.gesto(nombre)   "saluda" | "senala" | "celebra" | "duda" | "final" (un gesto y vuelve al reposo).
 *   Guia3D.caminar(on), Guia3D.mirar(lado)   paso de caminar y hacia dónde mira.
 *   Guia3D.listo()         true cuando el modelo ya se ve.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const URL_MODELO = new URL("../../intro3d/models/nino.glb", import.meta.url).href;
const ESCALA = 1.12;
const YAW = 0.42; // gira hacia la derecha: mira el tablero
const FOV = 28;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Aplaudir", "Saltar"],
    duda: ["Pensar"],
    final: ["Bailar"]
};

let host = null;
let renderer = null;
let scene = null;
let camera = null;
let mixer = null;
let mesh = null;
let acciones = {};
let actual = null;
let hablando = false;
let enGesto = false;
let turnoCelebra = 0;
let listo = false;
let ultimo = performance.now();
let rafId = null;
let yawObjetivo = YAW;

function clip(nombre) {
    return acciones[nombre] || null;
}

let caminando = false;

function base() {
    if (caminando) {
        return (hablando && clip("Caminar_y_hablar")) || clip("Caminar") || clip("Quieto");
    }
    return hablando ? (clip("Hablar") || clip("Quieto")) : clip("Quieto");
}

/** Zeus camina (entra o sale de la escena) o vuelve a quedarse quieto. */
function caminar(on) {
    caminando = !!on;
    if (!listo) return;
    enGesto = false;
    ["Caminar", "Caminar_y_hablar"].forEach(function (n) {
        if (acciones[n]) acciones[n].setLoop(THREE.LoopRepeat, Infinity);
    });
    actual = null;
    cruzar(base(), 0.25);
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== actual && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
    });
}

/** Hacia dónde mira: "derecha", "izquierda" o null (de frente, un poco hacia Zeus). */
function mirar(lado) {
    yawObjetivo = lado === "derecha" ? 1.45 : (lado === "izquierda" ? -1.45 : YAW);
}

function cruzar(siguiente, dur) {
    if (!siguiente || siguiente === actual) return;
    siguiente.reset();
    siguiente.setEffectiveWeight(1);
    siguiente.play();
    if (actual) actual.crossFadeTo(siguiente, dur != null ? dur : 0.3, false);
    actual = siguiente;
}

/** Encuadre de cuerpo entero que cabe en el alto y en el ancho del panel. */
function encuadrar() {
    if (!renderer || !camera || !host) return;
    const lienzo = renderer.domElement;
    const w = Math.max(48, lienzo.clientWidth || host.clientWidth);
    const h = Math.max(48, lienzo.clientHeight || host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // ~2 de alto (cabe un salto y los brazos arriba) y ~1,1 de ancho.
    const dist = Math.max(1.0 / t, 0.55 / (t * camera.aspect));
    camera.position.set(0, 0.92, dist);
    camera.lookAt(0, 0.9, 0);
    camera.updateProjectionMatrix();
}

function animar() {
    rafId = requestAnimationFrame(animar);
    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
    ultimo = ahora;
    if (mixer) mixer.update(reducido ? dt * 0.6 : dt);
    if (mesh) mesh.rotation.y += (yawObjetivo - mesh.rotation.y) * Math.min(1, dt * 6);
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
    host = document.querySelector("#guia .guia-pj");
    if (!host || renderer || !webglDisponible()) return;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "guia-3d-canvas";
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
        // El GIF se oculta solo cuando Zeus 3D ya está dibujado.
        host.classList.add("guia-3d-lista");
        if (typeof ResizeObserver === "function") new ResizeObserver(encuadrar).observe(host);
        else window.addEventListener("resize", encuadrar);
    } catch (e) {
        console.warn("[Guia3D] no se pudo cargar Zeus 3D; queda el GIF", e);
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
    if (!listo || caminando) return;
    const opciones = GESTOS[nombre];
    if (!opciones) return;
    let nombreClip = opciones[0];
    if (opciones.length > 1) nombreClip = opciones[turnoCelebra++ % opciones.length];
    const a = clip(nombreClip);
    if (!a) return;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    enGesto = true;
    actual = null; // fuerza el reinicio aunque sea el mismo gesto
    cruzar(a, 0.25);
    // Si el gesto empezó desde otro clip, apagar los demás suavemente.
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
    });
}

/**
 * Final "Desfile en la alfombra": el personaje gira hacia la derecha y camina (clip Caminar) desplazando su lienzo
 * dx/dy píxeles hasta la pasarela; al llegar mira al frente y saluda. Promise al llegar.
 */
function desfilar(dx, dy, ms) {
    if (!listo || !renderer) return Promise.resolve();
    const dur = reducido ? 200 : (ms || 2400);
    const lienzo = renderer.domElement;
    enGesto = true;
    yawObjetivo = dx >= 0 ? 1.35 : -1.35;
    const caminar = clip("Caminar");
    if (caminar) {
        caminar.setLoop(THREE.LoopRepeat, Infinity);
        actual = null;
        cruzar(caminar, 0.25);
        Object.keys(acciones).forEach(function (k) {
            if (acciones[k] !== caminar && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
        });
    }
    lienzo.style.transition = "transform " + dur + "ms linear";
    lienzo.style.transform = "translate(" + Math.round(dx) + "px," + Math.round(dy) + "px)";
    return new Promise(function (resolve) {
        setTimeout(function () {
            yawObjetivo = 0.15;
            enGesto = false;
            hablando = false;
            cruzar(clip("Quieto"), 0.3);
            setTimeout(function () {
                gesto("saluda");
                resolve();
            }, 350);
        }, dur);
    });
}

window.Guia3D = {
    desfilar: desfilar,
    caminar: caminar,
    mirar: mirar,
    lienzo: function () { return renderer ? renderer.domElement : null; },
    hablar: hablar,
    gesto: gesto,
    listo: function () { return listo; }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
} else {
    montar();
}
