/**
 * Tutorial 3D: entra por la derecha → esquina inferior derecha → habla → se va.
 * window.Tutorial3d = { start, despedir, stop, reaccionar, preload, personaje }
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODELOS_BASE = new URL("../models/", import.meta.url);
// El GLB nuevo mide ~1,25 m. 1,35 / 1,40 los deja a la misma altura en el panel.
const ESCALA_NINO = 1.35;
const ESCALA_NINA = 1.40;
const CLIP_CAMINAR = ["Caminar"];
const CLIP_QUIETO = ["Quieto"];
const CLIP_HABLAR = ["Hablar"];
const MODELOS = {
    zeus: { url: new URL("nino.glb", MODELOS_BASE).href, escala: ESCALA_NINO },
    zoe: { url: new URL("nina.glb", MODELOS_BASE).href, escala: ESCALA_NINA }
};

// Entrada corta: aparece cerca y camina poco (el GLB ya no se vuelve a bajar).
const START_X = 1.35;
const DEST_X = 0.05;
const EXIT_X = 2.2;
const POS_Y = -0.15;
const POS_Z = 0;
const WALK_SPEED = 2.8;
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
let talkAction = null;
let activoAction = null;
let accionesActuales = {};
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

/** Cache de GLTF por URL: evita re-descargar ~4–5 MB en cada tutorial. */
const gltfCache = Object.create(null);
const loader = new GLTFLoader();

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

function cargarGltf(url) {
    if (!gltfCache[url]) {
        gltfCache[url] = new Promise(function (resolve, reject) {
            loader.load(url, resolve, undefined, reject);
        });
    }
    return gltfCache[url];
}

function quitarMeshActual() {
    if (mixer) {
        try { mixer.stopAllAction(); } catch (e) { /* noop */ }
        mixer = null;
    }
    walkAction = null;
    idleAction = null;
    talkAction = null;
    activoAction = null;
    accionesActuales = {};
    if (mesh && scene) {
        scene.remove(mesh);
        // No dispose: la geometría vive en el cache del GLTF.
        mesh = null;
    }
}

/** Soft reset: mantiene renderer/escena; solo saca al personaje. */
function resetSuave() {
    activo = false;
    fase = "fuera";
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    quitarMeshActual();
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
}

function disposeInterno() {
    resetSuave();
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

function montarPersonaje(gltf, id) {
    const def = MODELOS[id] || MODELOS.zoe;
    quitarMeshActual();

    // Reusar la scene del GLTF cacheado (un solo personaje a la vez).
    mesh = gltf.scene;
    mesh.scale.setScalar(def.escala);
    mesh.position.set(START_X, POS_Y, POS_Z);
    mesh.rotation.y = YAW_LEFT;
    scene.add(mesh);

    mixer = null;
    walkAction = null;
    idleAction = null;
    talkAction = null;
    activoAction = null;

    if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(mesh);
        const actions = {};
        gltf.animations.forEach(function (clip) {
            actions[clip.name] = mixer.clipAction(clip);
        });
        accionesActuales = actions;
        walkAction = tomarClip(actions, CLIP_CAMINAR);
        idleAction = tomarClip(actions, CLIP_QUIETO);
        talkAction = tomarClip(actions, CLIP_HABLAR);
        if (talkAction) talkAction.setLoop(THREE.LoopRepeat, Infinity);
        if (walkAction) {
            walkAction.setLoop(THREE.LoopRepeat, Infinity);
            cruzar(walkAction, 0.01);
        } else if (idleAction) {
            cruzar(idleAction, 0.01);
        }
    }
}

function cargarPersonaje(id) {
    const def = MODELOS[id] || MODELOS.zoe;
    return cargarGltf(def.url).then(function (gltf) {
        montarPersonaje(gltf, id);
        return id;
    });
}

function llegarAHablar() {
    if (fase !== "entrando") return;
    fase = "hablando";
    destinoX = DEST_X;
    yawObjetivo = YAW_CAMARA;
    if (mesh) mesh.position.x = DEST_X;
    cruzar(talkAction || idleAction || walkAction, 0.25);
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
        resetSuave();
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

function preload() {
    return Promise.all(
        Object.keys(MODELOS).map(function (id) {
            return cargarGltf(MODELOS[id].url).catch(function () { return null; });
        })
    );
}

/**
 * Entra por la derecha. Resuelve solo cuando el personaje ya está en sitio (listo para hablar).
 * @returns {Promise<string>} id del personaje (zeus|zoe)
 */
async function start() {
    stopToken += 1;
    const token = stopToken;
    resetSuave();
    stopToken = token;

    if (!asegurarEscena()) return Promise.resolve("zoe");

    const id = Math.random() < 0.5 ? "zeus" : "zoe";
    personajeActual = id;
    // Mostrar el panel de inmediato (aunque el GLB aún cargue la 1.ª vez).
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
    if (clock) clock.getDelta();
    animar();

    return new Promise(function (resolve) {
        readyResolve = resolve;
        // Si el walk se atrasa, teletransporta y libera el habla (personaje ya visible).
        setTimeout(function () {
            if (token !== stopToken) return;
            if (fase === "entrando") llegarAHablar();
        }, 1600);
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
        setTimeout(function () {
            if (fase === "saliendo") terminarSalida();
        }, 2200);
    });
}

/**
 * Reacción corta en sitio (sin caminar): aparece, reproduce un clip una vez y se oculta.
 * @param {string} id zeus|zoe
 * @param {string[]} clips nombres en orden de preferencia (p. ej. ["Saltar", "Celebrar"])
 * @param {{maxMs?: number}} [opts]
 */
async function reaccionar(id, clips, opts) {
    const o = opts || {};
    stopToken += 1;
    const token = stopToken;
    resetSuave();
    stopToken = token;
    if (!asegurarEscena()) return;

    const pj = MODELOS[id] ? id : "zoe";
    personajeActual = pj;
    try {
        await cargarPersonaje(pj);
    } catch (e) {
        console.warn("[Tutorial3d] reaccionar: no cargó", pj, e);
        return;
    }
    if (token !== stopToken || !mesh) return;

    mesh.position.x = DEST_X;
    mesh.rotation.y = YAW_CAMARA;
    yawObjetivo = YAW_CAMARA;
    fase = "reaccion";
    const accion = tomarClip(accionesActuales, clips || ["Celebrar"]);
    if (accion) {
        accion.setLoop(THREE.LoopOnce, 1);
        accion.clampWhenFinished = true;
        cruzar(accion, 0.12);
    }
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add("is-visible");
    activo = true;
    if (clock) clock.getDelta();
    animar();

    const durClip = accion ? accion.getClip().duration * 1000 : 1500;
    await new Promise(function (resolve) {
        setTimeout(resolve, Math.min(durClip, o.maxMs || 3200));
    });
    if (token !== stopToken) return;
    stop();
}

function stop() {
    stopToken += 1;
    if (root) root.classList.remove("is-visible");
    const token = stopToken;
    setTimeout(function () {
        if (token !== stopToken) return;
        resetSuave();
    }, 200);
}

window.Tutorial3d = {
    start: start,
    despedir: despedir,
    stop: stop,
    reaccionar: reaccionar,
    preload: preload,
    personaje: function () { return personajeActual; }
};

// Precarga en cuanto el módulo carga (antes de elegir edad).
preload();

window.addEventListener("resize", function () {
    if (activo) redimensionar();
});
