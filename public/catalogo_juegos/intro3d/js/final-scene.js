/**
 * Escena final 3D: solo personajes (Zeus/Zoe).
 * Entran caminando rápido (como la intro), se paran y hacen el gesto.
 * Cortinas y fondo quedan en HTML 2D.
 * window.Final3d = { ensure, abrirVictoria, dispose, listo }
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODELOS_BASE = new URL("../models/", import.meta.url);
const WALK_SPEED = 3.8;

let root = null;
let renderer = null;
let scene = null;
let camera = null;
let clock = null;
let rafId = null;
let activo = false;
let listoPromise = null;
let actores = [];
let mixers = [];
let celebrando = false;

function resolverModelo(nombre) {
    return new URL(nombre, MODELOS_BASE).href;
}

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

function deltaAngulo(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}

function cruzar(actor, siguiente, dur) {
    if (!siguiente) return;
    const d = dur != null ? dur : 0.2;
    if (actor.activo === siguiente) return;
    if (actor.activo) actor.activo.fadeOut(d);
    siguiente.reset().fadeIn(d).play();
    actor.activo = siguiente;
}

function asegurarDom() {
    const victoria = document.getElementById("victoria");
    if (!victoria) return null;
    let el = document.getElementById("final-3d");
    if (!el) {
        el = document.createElement("div");
        el.id = "final-3d";
        el.className = "final-3d";
        el.setAttribute("aria-hidden", "true");
        const fondo = victoria.querySelector(".fondo");
        if (fondo && fondo.nextSibling) {
            victoria.insertBefore(el, fondo.nextSibling);
        } else {
            victoria.insertBefore(el, victoria.firstChild);
        }
    }
    return el;
}

function redimensionar() {
    if (!renderer || !camera || !root) return;
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = Math.max(0.1, w / h);
    camera.updateProjectionMatrix();
}

function actualizarActor(actor, dt) {
    if (!actor.mesh || !celebrando) return;
    if (actor.estado === "idle" || actor.estado === "fuera") return;

    if (actor.estado === "espera") {
        actor.espera -= dt;
        if (actor.espera <= 0) {
            actor.estado = "caminando";
            actor.mesh.visible = true;
            const dx = actor.finX - actor.mesh.position.x;
            const dz = actor.finZ - actor.mesh.position.z;
            actor.yawObjetivo = Math.atan2(dx, dz);
            cruzar(actor, actor.walk || actor.idle, 0.12);
        }
        return;
    }

    if (actor.estado === "caminando") {
        const dx = actor.finX - actor.mesh.position.x;
        const dz = actor.finZ - actor.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
            const paso = Math.min(dist, actor.velocidad * dt);
            actor.mesh.position.x += (dx / dist) * paso;
            actor.mesh.position.z += (dz / dist) * paso;
            actor.yawObjetivo = Math.atan2(dx, dz);
        } else {
            actor.mesh.position.x = actor.finX;
            actor.mesh.position.z = actor.finZ;
            actor.estado = "girando";
            actor.yawObjetivo = actor.yawFrente;
            cruzar(actor, actor.idle || actor.walk, 0.2);
        }
    }

    if (actor.estado === "girando" || actor.estado === "gesto") {
        const diff = deltaAngulo(actor.mesh.rotation.y, actor.yawObjetivo);
        actor.mesh.rotation.y += diff * Math.min(1, dt * 10);
        if (Math.abs(diff) < 0.04 && actor.estado === "girando") {
            actor.mesh.rotation.y = actor.yawObjetivo;
            actor.estado = "gesto";
            cruzar(actor, actor.wave || actor.idle, 0.22);
        }
        return;
    }

    // Mientras camina, alinear yaw al destino
    if (actor.estado === "caminando") {
        const diff = deltaAngulo(actor.mesh.rotation.y, actor.yawObjetivo);
        actor.mesh.rotation.y += diff * Math.min(1, dt * 12);
    }
}

function animar() {
    if (!activo) return;
    rafId = requestAnimationFrame(animar);
    const dt = Math.min(0.05, clock ? clock.getDelta() : 0.016);
    mixers.forEach(function (m) { m.update(dt); });
    actores.forEach(function (a) { actualizarActor(a, dt); });
    // Yaw mientras caminan (rama separada ya cubierta arriba, reforzar aquí)
    actores.forEach(function (actor) {
        if (!actor.mesh || actor.estado !== "caminando") return;
        const diff = deltaAngulo(actor.mesh.rotation.y, actor.yawObjetivo);
        actor.mesh.rotation.y += diff * Math.min(1, dt * 12);
    });
    renderer.render(scene, camera);
}

function cargarPersonaje(def) {
    return new Promise(function (resolve, reject) {
        const loader = new GLTFLoader();
        loader.load(
            resolverModelo(def.archivo),
            function (gltf) {
                const mesh = gltf.scene;
                mesh.traverse(function (obj) {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                });
                mesh.scale.setScalar(def.escala);
                mesh.position.set(def.inicioX, def.y, def.inicioZ);
                mesh.rotation.y = Math.atan2(def.finX - def.inicioX, def.finZ - def.inicioZ);
                mesh.visible = false;
                scene.add(mesh);

                const actor = {
                    id: def.id,
                    mesh: mesh,
                    mixer: null,
                    walk: null,
                    wave: null,
                    idle: null,
                    activo: null,
                    estado: "fuera",
                    espera: def.retraso || 0,
                    velocidad: def.velocidad || WALK_SPEED,
                    inicioX: def.inicioX,
                    inicioZ: def.inicioZ,
                    finX: def.finX,
                    finZ: def.finZ,
                    yawFrente: def.yawFrente != null ? def.yawFrente : 0,
                    yawObjetivo: 0,
                    y: def.y
                };

                if (gltf.animations && gltf.animations.length) {
                    actor.mixer = new THREE.AnimationMixer(mesh);
                    const actions = {};
                    gltf.animations.forEach(function (clip) {
                        actions[clip.name] = actor.mixer.clipAction(clip);
                    });
                    actor.walk = tomarClip(actions, ["Walk", "Walking", "Run"]);
                    actor.wave = tomarClip(actions, def.gestos || ["Wave", "Yes", "talk"]);
                    actor.idle = tomarClip(actions, ["Idle", "Standing", "talk"]);
                    if (actor.walk) actor.walk.setLoop(THREE.LoopRepeat, Infinity);
                    if (actor.wave) actor.wave.setLoop(THREE.LoopRepeat, Infinity);
                    if (actor.idle) actor.idle.setLoop(THREE.LoopRepeat, Infinity);
                    mixers.push(actor.mixer);
                }

                actores.push(actor);
                resolve();
            },
            undefined,
            reject
        );
    });
}

async function montarEscena() {
    root = asegurarDom();
    if (!root) throw new Error("Sin #victoria para Final3d");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(0, 1.15, 8.6);
    camera.lookAt(0, 0.35, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "final-3d-canvas";
    root.appendChild(renderer.domElement);
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    scene.add(new THREE.HemisphereLight(0xfff0e0, 0x334455, 0.9));
    const dir = new THREE.DirectionalLight(0xfff5e6, 1.1);
    dir.position.set(3, 7, 5);
    scene.add(dir);

    await Promise.all([
        cargarPersonaje({
            id: "zeus",
            archivo: "nino.glb",
            escala: 0.72,
            y: -2.05,
            inicioX: -9.5,
            inicioZ: 0.15,
            finX: -2.55,
            finZ: 0.15,
            velocidad: WALK_SPEED,
            retraso: 0.05,
            yawFrente: 0,
            gestos: ["Wave", "Yes"]
        }),
        cargarPersonaje({
            id: "zoe",
            archivo: "nina.glb",
            escala: 0.72,
            y: -2.05,
            inicioX: 9.5,
            inicioZ: 0.2,
            finX: 2.55,
            finZ: 0.2,
            velocidad: WALK_SPEED * 0.98,
            retraso: 0.12,
            yawFrente: -0.25,
            gestos: ["Wave", "Yes", "talk"]
        })
    ]);

    redimensionar();
    activo = true;
    animar();
}

function ensure() {
    if (listoPromise) return listoPromise;
    listoPromise = montarEscena().catch(function (e) {
        console.warn("[Final3d]", e);
        listoPromise = null;
        throw e;
    });
    return listoPromise;
}

/** Entran caminando rápido → se paran → miran al frente → gesto. */
function abrirVictoria() {
    document.body.classList.add("final-3d-activa");
    if (root) root.classList.add("is-visible");
    if (renderer) renderer.setClearColor(0x000000, 0);

    celebrando = true;
    actores.forEach(function (a) {
        if (!a.mesh) return;
        a.mesh.position.set(a.inicioX, a.y, a.inicioZ);
        a.mesh.rotation.y = Math.atan2(a.finX - a.inicioX, a.finZ - a.inicioZ);
        a.mesh.visible = false;
        a.estado = "espera";
        a.espera = a.id === "zeus" ? 0.05 : 0.12;
        a.activo = null;
    });

    return Promise.resolve();
}

function dispose() {
    activo = false;
    celebrando = false;
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    mixers = [];
    actores.forEach(function (a) {
        if (a.mesh && scene) scene.remove(a.mesh);
    });
    actores = [];
    if (renderer) {
        try {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        } catch (e) { /* noop */ }
        renderer = null;
    }
    scene = null;
    camera = null;
    clock = null;
    listoPromise = null;
    document.body.classList.remove("final-3d-activa");
    if (root) root.classList.remove("is-visible");
}

window.Final3d = {
    ensure: ensure,
    cerrarCortinas: function () { return Promise.resolve(); },
    abrirVictoria: abrirVictoria,
    dispose: dispose,
    listo: function () { return !!renderer; }
};

window.addEventListener("resize", function () {
    if (activo) redimensionar();
});
