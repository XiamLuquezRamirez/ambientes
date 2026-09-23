/**
 * Tutorial 3D: entra por la derecha → esquina inferior derecha → habla → se va.
 * window.Tutorial3d = { start, despedir, stop, personaje }
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODELOS_BASE = new URL("../models/", import.meta.url);
const MODELOS = {
    zeus: { url: new URL("nino.glb", MODELOS_BASE).href, escala: 0.42 },
    zoe: { url: new URL("nina.glb", MODELOS_BASE).href, escala: 0.42 }
};

// Panel esquina inferior derecha: entra desde fuera (derecha) → centro del panel → se va.
const START_X = 2.6;
const DEST_X = 0.05;
const EXIT_X = 2.75;
const POS_Y = -0.15;
const POS_Z = 0;
const WALK_SPEED = 1.55;
const YAW_RIGHT = Math.PI / 2;
const YAW_LEFT = -Math.PI / 2;
const YAW_CAMARA = 0.12;

let root = null;
let renderer = null;
let scene = null;
let camera = null;
let mixer = null;
let mesh = null;
let walkAction = null;
let idleAction = null;
let activoAction = null;
let clock = null;
let rafId = null;
let activo = false;
let personajeActual = null;
let fase = "idle"; // entrando | hablando | saliendo | fuera
let destinoX = DEST_X;
let yawObjetivo = YAW_RIGHT;
let stopToken = 0;
let readyResolve = null;
let goneResolve = null;

function tomarClip(actions, nombres) {
    const claves = Object.keys(actions);
    for (let i = 0; i < (nombres || []).length; i++) {
        const nombre = String(nombres[i]).toLowerCase();
        const exacta = claves.find(function (c) { return c.toLowerCase() === nombre; });
        if (exacta) return actions[exacta];
    }
    for (let j = 0; j < (nombres || []).length; j++) {
        const nombre2 = String(nombres[j]).toLowerCase();
        const parcial = claves.find(function (c) { return c.toLowerCase().indexOf(nombre2) >= 0; });
        if (parcial) return actions[parcial];
    }
    return null;
}

function cruzar(siguiente, dur) {
    if (!siguiente) return;
    const d = dur != null ? dur : 0.22;
    if (activoAction === siguiente) return;
    if (activoAction) activoAction.fadeOut(d);
    siguiente.reset().fadeIn(d).play();
    activoAction = siguiente;
}

function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

function disposeInterno() {
    activo = false;
    fase = "fuera";
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (mixer) {
        try { mixer.stopAllAction(); } catch (e) { /* noop */ }
        mixer = null;
    }
    walkAction = null;
    idleAction = null;
    activoAction = null;
    if (mesh && scene) {
        scene.remove(mesh);
        mesh.traverse(function (obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach(function (m) {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            }
        });
        mesh = null;
    }
    if (renderer) {
        try {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        } catch (e2) { /* noop */ }
        renderer = null;
    }
    scene = null;
    camera = null;
    clock = null;
    if (root) {
        root.hidden = true;
        root.classList.remove("is-visible");
    }
    if (readyResolve) {
        const r = readyResolve;
        readyResolve = null;
        r(personajeActual || "zoe");
    }
    if (goneResolve) {
        const g = goneResolve;
        goneResolve = null;
        g();
    }
    personajeActual = null;
}

function redimensionar() {
    if (!renderer || !camera || !root) return;
    const w = Math.max(120, root.clientWidth || 220);
    const h = Math.max(160, root.clientHeight || 300);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

function asegurarEscena() {
    root = document.getElementById("tutorial-3d");
    if (!root) return false;

    if (!renderer) {
        scene = new THREE.Scene();
        // Cámara vertical amplia para ver al personaje de pies a cabeza.
        camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
        camera.position.set(0.05, 1.15, 4.6);
        camera.lookAt(0.05, 0.85, 0);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));
        const dir = new THREE.DirectionalLight(0xffffff, 1.1);
        dir.position.set(3, 6, 4);
        scene.add(dir);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = "tutorial-3d-canvas";
        root.appendChild(renderer.domElement);
        clock = new THREE.Clock();
    }
    redimensionar();
    return true;
}

function cargarPersonaje(id) {
    const def = MODELOS[id] || MODELOS.zoe;
    const loader = new GLTFLoader();

    return new Promise(function (resolve, reject) {
        loader.load(
            def.url,
            function (gltf) {
                if (mesh && scene) scene.remove(mesh);
                mesh = gltf.scene;
                mesh.scale.setScalar(def.escala);
                mesh.position.set(START_X, POS_Y, POS_Z);
                mesh.rotation.y = YAW_LEFT;
                scene.add(mesh);

                mixer = null;
                walkAction = null;
                idleAction = null;
                activoAction = null;

                if (gltf.animations && gltf.animations.length) {
                    mixer = new THREE.AnimationMixer(mesh);
                    const actions = {};
                    gltf.animations.forEach(function (clip) {
                        actions[clip.name] = mixer.clipAction(clip);
                    });
                    walkAction = tomarClip(actions, ["Walk", "Walking", "Run"]);
                    idleAction = tomarClip(actions, ["Idle", "Standing"]);
                    if (walkAction) {
                        walkAction.setLoop(THREE.LoopRepeat, Infinity);
                        cruzar(walkAction, 0.01);
                    } else if (idleAction) {
                        cruzar(idleAction, 0.01);
                    }
                }
                resolve(id);
            },
            undefined,
            reject
        );
    });
}

function llegarAHablar() {
    if (fase !== "entrando") return;
    fase = "hablando";
    destinoX = DEST_X;
    yawObjetivo = YAW_CAMARA;
    if (mesh) mesh.position.x = DEST_X;
    cruzar(idleAction || walkAction, 0.25);
    if (readyResolve) {
        const r = readyResolve;
        readyResolve = null;
        r(personajeActual || "zoe");
    }
}

function terminarSalida() {
    if (fase === "fuera") return;
    fase = "fuera";
    if (goneResolve) {
        const g = goneResolve;
        goneResolve = null;
        g();
    }
    if (root) root.classList.remove("is-visible");
    const token = stopToken;
    setTimeout(function () {
        if (token !== stopToken) return;
        disposeInterno();
    }, 280);
}

function animar() {
    if (!activo || !renderer || !scene || !camera) return;
    rafId = requestAnimationFrame(animar);
    const dt = Math.min(0.05, clock ? clock.getDelta() : 0.016);
    if (mixer) mixer.update(dt);

    if (mesh && (fase === "entrando" || fase === "saliendo")) {
        const dx = destinoX - mesh.position.x;
        const dist = Math.abs(dx);
        if (dist < 0.04) {
            mesh.position.x = destinoX;
            if (fase === "entrando") llegarAHablar();
            else terminarSalida();
        } else {
            const paso = Math.min(dist, WALK_SPEED * dt);
            mesh.position.x += Math.sign(dx) * paso;
            cruzar(walkAction || idleAction, 0.15);
        }
    }

    if (mesh) {
        mesh.rotation.y = lerpAngle(mesh.rotation.y, yawObjetivo, Math.min(1, dt * 7));
    }

    renderer.render(scene, camera);
}

/**
 * Entra por la derecha hasta la esquina inferior derecha. Resuelve al estar listo para hablar.
 * @returns {Promise<string>} id del personaje (zeus|zoe)
 */
async function start() {
    stopToken += 1;
    const token = stopToken;
    disposeInterno();
    stopToken = token;

    if (!asegurarEscena()) return Promise.resolve("zoe");

    const id = Math.random() < 0.5 ? "zeus" : "zoe";
    personajeActual = id;
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add("is-visible");
    activo = true;
    fase = "entrando";
    destinoX = DEST_X;
    yawObjetivo = YAW_LEFT;

    try {
        await cargarPersonaje(id);
    } catch (e) {
        console.warn("[Tutorial3d] Error cargando", id, e);
        try {
            const fb = id === "zeus" ? "zoe" : "zeus";
            personajeActual = fb;
            await cargarPersonaje(fb);
        } catch (e2) {
            console.warn("[Tutorial3d] Fallback falló", e2);
            return "zoe";
        }
    }

    if (!activo || token !== stopToken) return personajeActual || "zoe";
    animar();

    return new Promise(function (resolve) {
        readyResolve = resolve;
    });
}

/** Se da la vuelta y se va por la derecha. Resuelve al salir. */
function despedir() {
    if (!activo || !mesh) {
        return Promise.resolve();
    }
    if (fase === "saliendo" || fase === "fuera") {
        return new Promise(function (resolve) {
            if (fase === "fuera") resolve();
            else goneResolve = resolve;
        });
    }
    fase = "saliendo";
    destinoX = EXIT_X;
    yawObjetivo = YAW_RIGHT;
    cruzar(walkAction || idleAction, 0.2);
    return new Promise(function (resolve) {
        goneResolve = resolve;
    });
}

function stop() {
    stopToken += 1;
    if (root) root.classList.remove("is-visible");
    const token = stopToken;
    setTimeout(function () {
        if (token !== stopToken) return;
        disposeInterno();
    }, 200);
}

window.Tutorial3d = {
    start: start,
    despedir: despedir,
    stop: stop,
    personaje: function () { return personajeActual; }
};

window.addEventListener("resize", function () {
    if (activo) redimensionar();
});
