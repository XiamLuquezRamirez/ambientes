/**
 * Guías 3D de "El Mapa Estelar y las Llaves Mágicas":
 *   window.Guia3D      Zoe (nina.glb), abajo a la izquierda: presentación, demo y final.
 *   window.Guia3DZeus  Zeus (nino.glb), abajo a la derecha: solo en la celebración final (baja de la nave).
 *
 * Mismo módulo que el de los demás juegos de Polimotor (cargador, luces y clips compartidos de intro3d), convertido en
 * una fábrica para montar dos personajes. Clips: Quieto · Hablar · Saludar · Senalar · Celebrar / Aplaudir / Saltar ·
 * Pensar · Caminar · Bailar. Si no hay WebGL o el modelo no carga, queda el GIF del personaje.
 *
 * API de cada guía: hablar(on) · gesto(nombre) · caminar(on) · mirar("derecha"|"izquierda"|null) · listo()
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const FOV = 28;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Aplaudir", "Saltar"],
    duda: ["Pensar"],
    final: ["Bailar"]
};

function webglDisponible() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

function crearGuia(opciones) {
    const YAW = opciones.yaw;
    const ESCALA = opciones.escala || 1.12;
    let host = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let mixer = null;
    let mesh = null;
    const acciones = {};
    let actual = null;
    let hablando = false;
    let enGesto = false;
    let caminando = false;
    let turnoCelebra = 0;
    let listo = false;
    let ultimo = performance.now();
    let yawObjetivo = YAW;
    let visible = true;

    function clip(nombre) {
        return acciones[nombre] || null;
    }

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

    function mirar(lado) {
        yawObjetivo = lado === "derecha" ? 1.45 : (lado === "izquierda" ? -1.45 : YAW);
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
        // sin dibujar mientras el personaje no está en pantalla (ahorra GPU en la tableta)
        // (.guia-pj es position: fixed, así que offsetParent siempre es null: se mira la caja en pantalla)
        const caja = host ? host.getBoundingClientRect() : null;
        visible = !!(caja && caja.width > 0 && caja.right > 0 && caja.left < window.innerWidth && getComputedStyle(host).visibility !== "hidden");
        if (!visible) return;
        if (mixer) mixer.update(reducido ? dt * 0.6 : dt);
        if (mesh) mesh.rotation.y += (yawObjetivo - mesh.rotation.y) * Math.min(1, dt * 6);
        if (renderer) renderer.render(scene, camera);
    }

    async function montar() {
        host = document.querySelector(opciones.selector);
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
                crearCargadorGltf().load(opciones.url, resolve, undefined, reject);
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
            host.classList.add("guia-3d-lista");
            if (typeof ResizeObserver === "function") new ResizeObserver(encuadrar).observe(host);
            else window.addEventListener("resize", encuadrar);
        } catch (e) {
            console.warn("[" + opciones.nombre + "] no se pudo cargar el modelo 3D; queda el GIF", e);
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
        const lista = GESTOS[nombre];
        if (!lista) return;
        let nombreClip = lista[0];
        if (lista.length > 1) nombreClip = lista[turnoCelebra++ % lista.length];
        const a = clip(nombreClip);
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

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
    else montar();

    return {
        caminar: caminar,
        mirar: mirar,
        hablar: hablar,
        gesto: gesto,
        listo: function () { return listo; }
    };
}

window.Guia3D = crearGuia({
    nombre: "Zoe",
    selector: "#guia .guia-pj",
    url: new URL("../../intro3d/models/nina.glb", import.meta.url).href,
    yaw: 0.42
});

window.Guia3DZeus = crearGuia({
    nombre: "Zeus",
    selector: "#guia-zeus .guia-pj",
    url: new URL("../../intro3d/models/nino.glb", import.meta.url).href,
    yaw: -0.42
});
