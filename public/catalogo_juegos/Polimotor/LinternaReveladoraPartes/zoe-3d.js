/**
 * Zoe3D — nina.glb en el lugar del dibujo SVG (window.Zoe3D).
 *
 * Se dibuja en un lienzo transparente del tamaño del juego y Phaser lo pone
 * debajo de la oscuridad, así el agujero de la linterna la revela igual que al SVG.
 * Las zonas salen de los huesos (rodilla, muñeca, cabeza…), no de elipses fijas.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const URL_MODELO = new URL("../../intro3d/models/nina.glb", import.meta.url).href;
const REDUCIDO = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const CLIPS = {
    barriga: "Reir",
    manos: "Aplaudir",
    pies: "Saltar",
    rodillas: "Saltar",
    hombros: "Estirarse",
    orejas: "Decir_no",
    ojos: "Decir_si",
    boca: "Reir",
    cabello: "Decir_no",
    saludo: "Saludar",
    negar: "Decir_no",
    alegria: "Celebrar"
};

let renderer = null;
let plano = null;
let ctxPlano = null;
let scene = null;
let camera = null;
let mesh = null;
let mixer = null;
let acciones = {};
let actual = null;
let huesos = {};
let listo = false;
let enGesto = false;
let hablando = false;
let altoMundo = 1;
let piesY = 0;
let vista = { w: 2, h: 2 };
let zonas = {};
const tmp = new THREE.Vector3();
const pies = new THREE.Vector3();

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
    if (actual) actual.crossFadeTo(siguiente, dur != null ? dur : 0.25, false);
    actual = siguiente;
}

function hueso(nombre) {
    return huesos[nombre] || null;
}

function encuadrar(w, h) {
    if (!camera || !mesh || w < 40 || h < 40) return;
    vista.w = w;
    vista.h = h;
    renderer.setSize(w, h, false);
    if (plano.width !== w || plano.height !== h) {
        plano.width = w;
        plano.height = h;
    }
    mesh.updateMatrixWorld(true);
    const cab = hueso("cabeza");
    const rod = hueso("rodilla_L") || hueso("rodilla_R");
    let alto;
    let cx = 0;
    if (cab && rod) {
        cab.getWorldPosition(tmp);
        const headY = tmp.y;
        const headX = tmp.x;
        rod.getWorldPosition(tmp);
        const kneeY = tmp.y;
        const torso = Math.max(0.2, headY - kneeY);
        piesY = kneeY - torso * 1.05;
        const coronilla = headY + torso * 0.62;
        alto = Math.max(0.2, coronilla - piesY);
        cx = headX;
        altoMundo = alto;
    } else {
        const caja = new THREE.Box3().setFromObject(mesh);
        alto = Math.max(0.2, caja.max.y - caja.min.y);
        cx = (caja.min.x + caja.max.x) / 2;
        altoMundo = alto;
        piesY = caja.min.y;
    }
    const altoPx = Math.max(220, Math.min(w * 0.5, h * 0.56));
    const viewH = alto * (h / altoPx);
    const viewW = viewH * (w / h);
    const camY = piesY + viewH * 0.3;
    camera.left = cx - viewW / 2;
    camera.right = cx + viewW / 2;
    camera.top = camY + viewH / 2;
    camera.bottom = camY - viewH / 2;
    camera.position.set(cx, camY, 8);
    camera.lookAt(cx, camY, 0);
    camera.updateProjectionMatrix();
}

// Fracciones del cuerpo opaco en reposo (pelo, pupilas, corazón, zapatos).
// Los huesos del GLB no caen sobre la malla deformada.
const PARTES = [
    ["cabello", 0.5, 0.07, 0.25, 0.07],
    ["ojo_izq", 0.379, 0.231, 0.1, 0.045],
    ["ojo_der", 0.611, 0.231, 0.1, 0.045],
    ["oreja_izq", 0.16, 0.22, 0.09, 0.06],
    ["oreja_der", 0.84, 0.22, 0.09, 0.06],
    ["coleta_izq", 0.125, 0.31, 0.11, 0.08],
    ["coleta_der", 0.846, 0.31, 0.11, 0.08],
    ["boca", 0.5, 0.325, 0.12, 0.04],
    ["hombro_izq", 0.29, 0.4, 0.13, 0.056],
    ["hombro_der", 0.68, 0.4, 0.13, 0.056],
    ["barriga", 0.5, 0.476, 0.17, 0.07],
    ["mano_izq", 0.18, 0.59, 0.13, 0.067],
    ["mano_der", 0.82, 0.59, 0.13, 0.067],
    ["rodilla_izq", 0.375, 0.765, 0.11, 0.067],
    ["rodilla_der", 0.6, 0.765, 0.11, 0.067],
    ["pie_izq", 0.375, 0.955, 0.13, 0.052],
    ["pie_der", 0.6, 0.955, 0.13, 0.052],
    ["cuerpo", 0.5, 0.55, 0.43, 0.37]
];

let silueta = null;
let siluetaEn = 0;

function leerSilueta() {
    if (!plano || !ctxPlano || plano.width < 8) return null;
    const w = plano.width;
    const h = plano.height;
    const pasoPx = 8;
    const img = ctxPlano.getImageData(0, 0, w, h).data;
    let top = null;
    let bot = null;
    let left = null;
    let right = null;
    for (let y = 0; y < h; y += pasoPx) {
        const fila = y * w;
        for (let x = 0; x < w; x += pasoPx) {
            if (img[(fila + x) * 4 + 3] <= 20) continue;
            if (top === null) top = y;
            bot = y;
            if (left === null || x < left) left = x;
            if (right === null || x > right) right = x;
        }
    }
    if (top === null || right - left < 40 || bot - top < 80) return null;
    return { top: top, bot: bot, left: left, right: right, w: right - left, h: bot - top };
}

function medirZonas() {
    const ahora = performance.now();
    if (!silueta || ahora - siluetaEn > 200) {
        const nueva = leerSilueta();
        siluetaEn = ahora;
        if (nueva) silueta = nueva;
    }
    if (!silueta) return;
    const s = silueta;
    const nuevas = {};
    PARTES.forEach(function (p) {
        nuevas[p[0]] = {
            id: p[0],
            x: s.left + s.w * p[1],
            y: s.top + s.h * p[2],
            rx: Math.max(16, s.w * p[3]),
            ry: Math.max(14, s.h * p[4])
        };
    });
    zonas = nuevas;
}

function paso(dt) {
    if (!listo || !renderer) return;
    const s = Math.min(0.05, (dt || 16) / 1000);
    if (mixer) mixer.update(REDUCIDO ? s * 0.6 : s);
    renderer.render(scene, camera);
    if (ctxPlano && plano) {
        ctxPlano.clearRect(0, 0, plano.width, plano.height);
        ctxPlano.drawImage(renderer.domElement, 0, 0, plano.width, plano.height);
    }
    medirZonas();
}

function gesto(nombre) {
    if (!listo) return Promise.resolve();
    const a = clip(nombre);
    if (!a) return Promise.resolve();
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    enGesto = true;
    actual = null;
    cruzar(a, 0.2);
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.2);
    });
    return new Promise(function (resolve) {
        const fin = function (ev) {
            if (ev.action !== a) return;
            mixer.removeEventListener("finished", fin);
            enGesto = false;
            cruzar(base(), 0.3);
            resolve();
        };
        mixer.addEventListener("finished", fin);
        setTimeout(function () {
            mixer.removeEventListener("finished", fin);
            if (enGesto) {
                enGesto = false;
                cruzar(base(), 0.3);
            }
            resolve();
        }, REDUCIDO ? 700 : 2200);
    });
}

async function preparar() {
    if (listo) return true;
    if (renderer) return listo;
    try {
        const prueba = document.createElement("canvas");
        if (!prueba.getContext("webgl2") && !prueba.getContext("webgl")) return false;
    } catch (e) {
        return false;
    }
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    plano = document.createElement("canvas");
    ctxPlano = plano.getContext("2d", { willReadFrequently: true });
    agregarLucesModelo(scene);
    try {
        const gltf = await new Promise(function (resolve, reject) {
            crearCargadorGltf().load(URL_MODELO, resolve, undefined, reject);
        });
        mesh = gltf.scene;
        mesh.rotation.y = 0;
        scene.add(mesh);
        mesh.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(mesh);
        const centro = caja.getCenter(new THREE.Vector3());
        mesh.position.x -= centro.x;
        mesh.position.y -= caja.min.y;
        mesh.position.z -= centro.z;
        altoMundo = Math.max(0.2, caja.max.y - caja.min.y);
        mesh.traverse(function (n) {
            if (n.name) huesos[n.name] = n;
        });
        mixer = new THREE.AnimationMixer(mesh);
        (gltf.animations || []).forEach(function (c) {
            acciones[c.name] = mixer.clipAction(c);
        });
        ["Quieto", "Hablar"].forEach(function (n) {
            if (acciones[n]) acciones[n].setLoop(THREE.LoopRepeat, Infinity);
        });
        cruzar(clip("Quieto"), 0);
        listo = true;
        encuadrar(800, 600);
        paso(16);
        return true;
    } catch (e) {
        console.warn("[Zoe3D] no se pudo cargar a Zoe", e);
        if (renderer) {
            renderer.dispose();
            renderer = null;
        }
        return false;
    }
}

window.Zoe3D = {
    preparar: preparar,
    listo: function () { return listo; },
    lienzo: function () { return plano; },
    encuadrar: encuadrar,
    paso: paso,
    zona: function (id) { return zonas[id] || null; },
    reaccion: function (parte) { return gesto(CLIPS[parte] || "Reir"); },
    saludo: function () { return gesto(CLIPS.saludo); },
    negar: function () { return gesto(CLIPS.negar); },
    alegria: function () { return gesto(CLIPS.alegria); },
    hablar: function (on) {
        hablando = !!on;
        if (!listo || enGesto) return;
        cruzar(base(), 0.2);
    },
    reposo: function () {
        if (!listo || enGesto) return;
        hablando = false;
        cruzar(clip("Quieto"), 0.25);
    }
};
