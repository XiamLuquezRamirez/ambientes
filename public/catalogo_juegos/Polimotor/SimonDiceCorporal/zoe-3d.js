/**
 * Zoe3D — Zoe en 3D como ayudante de "¡Simón Dice Corporal!" (window.Zoe3D). Está de pie en la esquina
 * izquierda de la tarima, mirando a Zeus; su nube de texto acompaña lo que dice (presentación, demostración,
 * pistas y final). Mismo modelo y clips que los demás juegos (intro3d/models/nina.glb, módulo copiado de
 * "¿Dónde lo uso?" sin la caminata).
 *
 * API (script.js la usa solo si existe):
 *   Zoe3D.hablar(on)      Zoe habla o vuelve a quedarse quieta.
 *   Zoe3D.gesto(nombre)   "saluda" | "senala" | "celebra" | "duda" | "final".
 *   Zoe3D.listo()         true cuando el modelo ya se ve.
 * Si no hay WebGL o el modelo no carga, queda el GIF de Zoe.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const URL_MODELO = new URL("../../intro3d/models/nina.glb", import.meta.url).href;
const ESCALA = 1.12;
const YAW = 0.55; // mira hacia Zeus (a su derecha)
const FOV = 28;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Aplaudir", "Saltar"],
    duda: ["Pensar"],
    final: ["Bailar", "Porra_con_pompones"]
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
let turno = {};
let listo = false;
let ultimo = performance.now();

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

function encuadrar() {
    if (!renderer || !camera || !host) return;
    const lienzo = renderer.domElement;
    const w = Math.max(48, lienzo.clientWidth || host.clientWidth);
    const h = Math.max(48, lienzo.clientHeight || host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(1.0 / t, 0.55 / (t * camera.aspect));
    camera.position.set(0, 0.92, dist);
    camera.lookAt(0, 0.9, 0);
    camera.updateProjectionMatrix();
}

function animar() {
    requestAnimationFrame(animar);
    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
    ultimo = ahora;
    if (mixer) mixer.update(reducido ? dt * 0.6 : dt);
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
    host = document.querySelector("#zoe .zoe-pj");
    if (!host || renderer || !webglDisponible()) return;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "zoe-3d-canvas";
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
        host.classList.add("zoe-3d-lista");
        if (typeof ResizeObserver === "function") new ResizeObserver(encuadrar).observe(host);
        else window.addEventListener("resize", encuadrar);
    } catch (e) {
        console.warn("[Zoe3D] no se pudo cargar Zoe 3D; queda el GIF", e);
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
    turno[nombre] = (turno[nombre] || 0) + 1;
    const a = clip(opciones[(turno[nombre] - 1) % opciones.length]);
    if (!a) return;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    enGesto = true;
    actual = null;
    cruzar(a, 0.25);
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
    });
}

window.Zoe3D = {
    hablar: hablar,
    gesto: gesto,
    listo: function () { return listo; }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
} else {
    montar();
}
