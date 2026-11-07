/**
 * Zeus o Zoe en 3D sobre el sendero. El mismo GLB del tutorial
 * (nino.glb / nina.glb), con el clip de caminar mientras avanza.
 * Si el modelo no carga, sendero.js deja el gif.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const MODELOS = {
    zeus: { url: new URL("../../intro3d/models/nino.glb", import.meta.url).href, escala: 1.35 },
    zoe: { url: new URL("../../intro3d/models/nina.glb", import.meta.url).href, escala: 1.4 }
};

/* En 0 mira a la cámara. El camino del centro va hacia la puerta, de espaldas a nosotros. */
const YAW_FRENTE = 0;
const YAW_ARRIBA = Math.PI;
/* Cámara en +Z. +PI/2 gira la cara hacia +X, que en pantalla es la derecha. */
const YAW_DERECHA = Math.PI / 2;
const YAW_IZQUIERDA = -Math.PI / 2;

const cache = Object.create(null);
const loader = crearCargadorGltf();

let vivo = null;

function cargar(url) {
    if (!cache[url]) {
        cache[url] = new Promise(function (resolve, reject) {
            loader.load(url, resolve, undefined, reject);
        });
    }
    return cache[url];
}

function tomarClip(clips, nombres) {
    const lista = clips || [];
    for (let i = 0; i < nombres.length; i++) {
        const nombre = nombres[i].toLowerCase();
        const exacto = lista.find(function (c) { return c.name.toLowerCase() === nombre; });
        if (exacto) return exacto;
    }
    for (let j = 0; j < nombres.length; j++) {
        const nombre2 = nombres[j].toLowerCase();
        const parcial = lista.find(function (c) { return c.name.toLowerCase().indexOf(nombre2) >= 0; });
        if (parcial) return parcial;
    }
    return null;
}

function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

function liberar() {
    const v = vivo;
    vivo = null;
    if (!v) return;
    if (v.obs) v.obs.disconnect();
    if (v.raf != null) cancelAnimationFrame(v.raf);
    if (v.mixer) {
        try { v.mixer.stopAllAction(); } catch (e) { /* noop */ }
    }
    if (v.renderer) {
        try {
            v.renderer.dispose();
            v.renderer.forceContextLoss();
            if (v.renderer.domElement && v.renderer.domElement.parentNode) {
                v.renderer.domElement.parentNode.removeChild(v.renderer.domElement);
            }
        } catch (e2) { /* noop */ }
    }
}

function encuadrar(camera, modelo) {
    modelo.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(modelo);
    modelo.position.x -= (caja.min.x + caja.max.x) / 2;
    modelo.position.y -= caja.min.y;
    modelo.position.z -= (caja.min.z + caja.max.z) / 2;
    modelo.updateMatrixWorld(true);

    const alta = new THREE.Box3().setFromObject(modelo);
    const alto = Math.max(0.4, alta.max.y - alta.min.y);
    const ancho = Math.max(alta.max.x - alta.min.x, alta.max.z - alta.min.z);
    /* Antes el encuadre cortaba pelo y zapatos. Margen arriba por el paso; los pies siguen abajo. */
    const margenAbajo = 0.05;
    const margenArriba = 0.16;
    const margenLado = 0.2;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const altoVisible = alto / (1 - margenAbajo - margenArriba);
    const anchoVisible = ancho / (1 - margenLado * 2);
    const mitad = Math.max(altoVisible, anchoVisible) * 0.5;
    const yPie = -altoVisible * margenAbajo;
    const yCabeza = alto + altoVisible * margenArriba;
    const miraY = (yPie + yCabeza) * 0.5;
    camera.position.set(0, miraY, mitad / tan);
    camera.lookAt(0, miraY, 0);
    camera.near = 0.05;
    camera.far = Math.max(20, camera.position.z * 8);
    camera.updateProjectionMatrix();
}

function sincronizar(v) {
    const host = v.host;
    const anda = host.classList.contains("andando");
    if (host.classList.contains("mira-izq")) v.yawMeta = YAW_IZQUIERDA;
    else if (host.classList.contains("mira-der")) v.yawMeta = YAW_DERECHA;
    else if (host.classList.contains("mira-arriba")) v.yawMeta = YAW_ARRIBA;
    else v.yawMeta = YAW_FRENTE;

    const siguiente = anda ? (v.caminar || v.quieto) : v.quieto;
    if (!siguiente || v.accion === siguiente) return;
    if (v.accion) v.accion.fadeOut(0.18);
    siguiente.reset().fadeIn(0.18).play();
    v.accion = siguiente;
}

function montar(host, id) {
    liberar();
    const def = MODELOS[id] || MODELOS.zeus;
    const escena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
    agregarLucesModelo(escena);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "sendero-lienzo";
    host.appendChild(renderer.domElement);

    const v = {
        host: host,
        renderer: renderer,
        escena: escena,
        camera: camera,
        mixer: null,
        caminar: null,
        quieto: null,
        accion: null,
        yaw: YAW_FRENTE,
        yawMeta: YAW_FRENTE,
        obs: null,
        raf: null,
        clock: new THREE.Clock()
    };
    vivo = v;

    function medida() {
        const w = Math.max(64, host.clientWidth || 140);
        const h = Math.max(64, host.clientHeight || 140);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    medida();

    function frame() {
        if (vivo !== v) return;
        if (!host.isConnected) {
            liberar();
            return;
        }
        v.yaw = lerpAngle(v.yaw, v.yawMeta, 0.2);
        if (v.modelo) {
            /* El festejo añade un rebote y un giro extra sobre el yaw normal. */
            let extra = 0;
            if (v.festejoIni) {
                const t = Math.min(1, (performance.now() - v.festejoIni) / 900);
                const caida = 1 - t;
                v.modelo.position.y = v.festejoY + Math.abs(Math.sin(t * Math.PI * 2)) * 0.38 * caida;
                extra = Math.sin(t * Math.PI * 4) * 0.3 * caida;
                if (t >= 1) {
                    v.modelo.position.y = v.festejoY;
                    v.festejoIni = 0;
                }
            }
            v.modelo.rotation.y = v.yaw + extra;
        }
        if (v.mixer) v.mixer.update(v.clock.getDelta());
        renderer.render(escena, camera);
        v.raf = requestAnimationFrame(frame);
    }
    v.raf = requestAnimationFrame(frame);

    return cargar(def.url).then(function (gltf) {
        if (vivo !== v) return;
        const modelo = gltf.scene;
        modelo.scale.setScalar(def.escala);
        modelo.rotation.y = YAW_FRENTE;
        escena.add(modelo);
        v.modelo = modelo;
        encuadrar(camera, modelo);

        if (gltf.animations && gltf.animations.length) {
            v.mixer = new THREE.AnimationMixer(modelo);
            const caminar = tomarClip(gltf.animations, ["Caminar", "Walk"]);
            const quieto = tomarClip(gltf.animations, ["Quieto", "Idle"]);
            if (caminar) {
                v.caminar = v.mixer.clipAction(caminar);
                v.caminar.setLoop(THREE.LoopRepeat, Infinity);
            }
            if (quieto) {
                v.quieto = v.mixer.clipAction(quieto);
                v.quieto.setLoop(THREE.LoopRepeat, Infinity);
            }
        }
        sincronizar(v);
        v.obs = new MutationObserver(function () { sincronizar(v); });
        v.obs.observe(host, { attributes: true, attributeFilter: ["class"] });
        medida();
    });
}

/**
 * Festejo del personaje al acertar: dos saltitos con giro. Se anima la
 * posición del modelo, así que funciona aunque el GLB no traiga un clip
 * de celebración propio.
 */
function festejar() {
    const v = vivo;
    if (!v || !v.modelo || v.festejoIni) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.festejoY = v.modelo.position.y;
    v.festejoIni = performance.now();
}

window.LateralidadPersonaje = {
    montar: montar,
    liberar: liberar,
    festejar: festejar
};
