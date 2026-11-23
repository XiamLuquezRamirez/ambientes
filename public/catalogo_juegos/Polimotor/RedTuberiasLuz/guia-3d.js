/**
 * Guia3D — Zoe (nina.glb) y Guia3DZeus (nino.glb) en "¡La Red de Tuberías!".
 *
 * Misma animación que el resto de Polimotor. Si no hay WebGL, queda el GIF.
 *   Guia3D / Guia3DZeus: hablar, gesto, caminar, mirar, listo.
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

function crearGuia(opciones) {
    const URL_MODELO = opciones.url;
    const ESCALA = opciones.escala || 1.12;
    const selector = opciones.selector;
    const etiqueta = opciones.etiqueta;
    let yawObjetivo = opciones.yaw;

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
    let caminando = false;
    let turnoCelebra = 0;
    let listo = false;
    let ultimo = performance.now();
    let rafId = null;

    function clip(nombre) {
        return acciones[nombre] || null;
    }

    function base() {
        if (caminando) {
            return (hablando && clip("Caminar_y_hablar")) || clip("Caminar") || clip("Quieto");
        }
        return hablando ? (clip("Hablar") || clip("Quieto")) : clip("Quieto");
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
        yawObjetivo = lado === "derecha" ? 1.45 : (lado === "izquierda" ? -1.45 : opciones.yaw);
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
        host = document.querySelector(selector);
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
            mesh.rotation.y = opciones.yaw;
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
            console.warn("[Guia3D] no se pudo cargar " + etiqueta + "; queda el GIF", e);
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
        const opcionesGesto = GESTOS[nombre];
        if (!opcionesGesto) return;
        let nombreClip = opcionesGesto[0];
        if (opcionesGesto.length > 1) nombreClip = opcionesGesto[turnoCelebra++ % opcionesGesto.length];
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

    function desfilar(dx, dy, ms) {
        if (!listo || !renderer) return Promise.resolve();
        const dur = reducido ? 200 : (ms || 2400);
        const lienzo = renderer.domElement;
        enGesto = true;
        yawObjetivo = dx >= 0 ? 1.35 : -1.35;
        const clipCaminar = clip("Caminar");
        if (clipCaminar) {
            clipCaminar.setLoop(THREE.LoopRepeat, Infinity);
            actual = null;
            cruzar(clipCaminar, 0.25);
            Object.keys(acciones).forEach(function (k) {
                if (acciones[k] !== clipCaminar && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
            });
        }
        lienzo.style.transition = "transform " + dur + "ms linear";
        lienzo.style.transform = "translate(" + Math.round(dx) + "px," + Math.round(dy) + "px)";
        return new Promise(function (resolve) {
            setTimeout(function () {
                yawObjetivo = opciones.yaw;
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

    return {
        montar: montar,
        desfilar: desfilar,
        caminar: caminar,
        mirar: mirar,
        lienzo: function () { return renderer ? renderer.domElement : null; },
        hablar: hablar,
        gesto: gesto,
        listo: function () { return listo; }
    };
}

const zoe = crearGuia({
    url: new URL("../../intro3d/models/nina.glb", import.meta.url).href,
    selector: "#guia .guia-pj",
    yaw: 0.42,
    etiqueta: "Zoe"
});
const zeus = crearGuia({
    url: new URL("../../intro3d/models/nino.glb", import.meta.url).href,
    selector: "#guia-zeus .guia-pj",
    yaw: -0.42,
    etiqueta: "Zeus"
});

window.Guia3D = zoe;
window.Guia3DZeus = zeus;

function arrancar() {
    zoe.montar();
    zeus.montar();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
} else {
    arrancar();
}
