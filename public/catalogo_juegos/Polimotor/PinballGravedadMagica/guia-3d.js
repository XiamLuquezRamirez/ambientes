/**
 * guia-3d.js — Zoe en 3D para la presentación y la demostración (window.Guia3D).
 *
 * Como en los demás juegos de Polimotor: Zoe (intro3d/models/nina.glb) entra caminando por la
 * izquierda solo para la demo, explica, y sale caminando cuando empieza la partida. Durante el
 * juego no hay personajes en pantalla: lo que dicen Zoe y Zeus aparece en una nube con su ícono.
 *
 * Pensado para tabletas modestas: el lienzo WebGL se crea al entrar y se destruye por completo al
 * salir (renderer.dispose + forceContextLoss), así la partida no carga con un contexto 3D. En modo
 * ligero (window.__pinballLigero) dibuja a 30 cuadros y con densidad de píxel 1.
 *
 * API:
 *   Guia3D.entrar()        Promise: Zoe entra caminando y saluda.
 *   Guia3D.salir()         Promise: Zoe sale caminando y se libera el 3D.
 *   Guia3D.hablar(on)      habla o vuelve al reposo.
 *   Guia3D.gesto(nombre)   "saluda" | "senala" | "celebra" | "duda".
 *   Guia3D.listo()         true mientras Zoe está en pantalla.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const URL_MODELO = new URL("../../intro3d/models/nina.glb", import.meta.url).href;
const ESCALA = 1.15;
const YAW_MESA = 0.55;          // de pie, mirando hacia la máquina
const FOV = 28;
const MS_CAMINAR = 1500;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Aplaudir", "Saltar"],
    duda: ["Pensar"]
};

let host = null, renderer = null, scene = null, camera = null, mixer = null, mesh = null;
let acciones = {}, actual = null, hablando = false, enGesto = false, caminando = false, turno = 0;
let listo = false, rafId = null, ultimo = 0, acumulado = 0, yawObjetivo = YAW_MESA;
let gltfCache = null;

function ligero() { return !!window.__pinballLigero; }

function clip(n) { return acciones[n] || null; }

function base() {
    if (caminando) return (hablando && clip("Caminar_y_hablar")) || clip("Caminar") || clip("Quieto");
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

function apagarOtros(a) {
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
    });
}

function encuadrar() {
    if (!renderer || !host) return;
    const w = Math.max(48, host.clientWidth);
    const h = Math.max(48, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(1.05 / t, 0.6 / (t * camera.aspect));
    camera.position.set(0, 0.95, dist);
    camera.lookAt(0, 0.92, 0);
    camera.updateProjectionMatrix();
}

function animar(ahora) {
    rafId = requestAnimationFrame(animar);
    const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
    ultimo = ahora;
    acumulado += dt;
    // En modo ligero, 30 cuadros por segundo bastan para un personaje que habla y camina.
    if (ligero() && acumulado < 1 / 30) return;
    const paso = acumulado;
    acumulado = 0;
    if (mixer) mixer.update(reducido ? paso * 0.6 : paso);
    if (mesh) mesh.rotation.y += (yawObjetivo - mesh.rotation.y) * Math.min(1, paso * 6);
    if (renderer) renderer.render(scene, camera);
}

function cargarModelo() {
    if (!gltfCache) {
        gltfCache = new Promise(function (resolve, reject) {
            crearCargadorGltf().load(URL_MODELO, resolve, undefined, reject);
        });
    }
    return gltfCache;
}

/**
 * Los clips de caminar del GLB traen avance de la raíz ("raiz.position" se mueve hasta 1,6 de
 * lado y 4,2 de fondo). Aquí el desplazamiento lo hace el panel con CSS, así que se anula el
 * avance en X y Z y se conserva el vaivén vertical. Sin esto Zoe queda corrida y cortada.
 */
function quitarAvance(c) {
    c.tracks.forEach(function (t) {
        if (!/\.position$/.test(t.name) || !/raiz|root|hips/i.test(t.name)) return;
        const v = t.values;
        for (let i = 0; i < v.length; i += 3) { v[i] = 0; v[i + 2] = 0; }
    });
}

function webglDisponible() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

function mover(desdeFuera) {
    // El panel entra desde (o sale hacia) la izquierda de la pantalla.
    host.style.transition = reducido ? "none" : "transform " + MS_CAMINAR + "ms linear";
    host.style.transform = desdeFuera ? "translateX(-130%)" : "translateX(0)";
}

async function entrar() {
    host = document.getElementById("guia-demo");
    if (!host || renderer || !webglDisponible()) return false;
    host.hidden = false;
    host.style.transition = "none";
    host.style.transform = "translateX(-130%)";

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
    renderer = new THREE.WebGLRenderer({ antialias: !ligero(), alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(ligero() ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "guia-3d-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    agregarLucesModelo(scene);
    encuadrar();

    try {
        const gltf = await cargarModelo();
        mesh = gltf.scene;
        mesh.scale.setScalar(ESCALA);
        mesh.rotation.y = 1.45;           // de perfil: camina hacia la derecha
        yawObjetivo = 1.45;
        scene.add(mesh);
        mixer = new THREE.AnimationMixer(mesh);
        acciones = {};
        (gltf.animations || []).forEach(function (c) {
            if (/^(Caminar|Correr)/.test(c.name)) quitarAvance(c);
            acciones[c.name] = mixer.clipAction(c);
        });
        ["Quieto", "Hablar", "Caminar", "Caminar_y_hablar"].forEach(function (n) {
            if (acciones[n]) acciones[n].setLoop(THREE.LoopRepeat, Infinity);
        });
        mixer.addEventListener("finished", function (ev) {
            if (ev.action !== actual) return;
            enGesto = false;
            cruzar(base(), 0.35);
        });
        caminando = true;
        actual = null;
        cruzar(base(), 0);
        ultimo = performance.now();
        rafId = requestAnimationFrame(animar);
        listo = true;
        void host.offsetWidth;
        mover(false);
        await esperar(reducido ? 50 : MS_CAMINAR);
        caminando = false;
        yawObjetivo = YAW_MESA;
        actual = null;
        cruzar(base(), 0.3);
        apagarOtros(actual);
        gesto("saluda");
        return true;
    } catch (e) {
        console.warn("[Guia3D] no se pudo cargar Zoe 3D", e);
        liberar();
        return false;
    }
}

async function salir() {
    if (!renderer || !listo) { liberar(); return; }
    enGesto = false;
    hablando = false;
    caminando = true;
    yawObjetivo = -1.45;                  // se da la vuelta y camina hacia la izquierda
    actual = null;
    cruzar(base(), 0.25);
    apagarOtros(actual);
    mover(true);
    await esperar(reducido ? 50 : MS_CAMINAR);
    liberar();
}

/** Libera todo el 3D: la partida corre sin ningún contexto WebGL abierto. */
function liberar() {
    listo = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (mixer) { mixer.stopAllAction(); mixer = null; }
    if (scene && mesh) scene.remove(mesh);
    if (renderer) {
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        renderer.domElement.remove();
        renderer = null;
    }
    scene = null; camera = null; mesh = null; acciones = {}; actual = null;
    gltfCache = null;                     // libera también la geometría y las texturas en memoria
    if (host) host.hidden = true;
}

function hablar(on) {
    hablando = !!on;
    if (!listo || enGesto || caminando) return;
    cruzar(base(), 0.25);
}

function gesto(nombre) {
    if (!listo || caminando) return;
    const opciones = GESTOS[nombre];
    if (!opciones) return;
    const a = clip(opciones.length > 1 ? opciones[turno++ % opciones.length] : opciones[0]);
    if (!a) return;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    enGesto = true;
    actual = null;
    cruzar(a, 0.25);
    apagarOtros(a);
}

function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

window.addEventListener("resize", encuadrar);

window.Guia3D = {
    entrar: entrar,
    salir: salir,
    hablar: hablar,
    gesto: gesto,
    listo: function () { return listo; }
};
