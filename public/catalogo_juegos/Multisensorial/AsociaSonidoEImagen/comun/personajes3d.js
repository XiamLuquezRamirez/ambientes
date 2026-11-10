/**
 * Personajes 3D del proyecto (intro3d/models: nino.glb = Zeus, nina.glb = Zoe) dentro de los
 * juegos de Asocia sonido e imagen. Una sola capa WebGL transparente sobre el lienzo de Phaser
 * con cámara ortográfica en píxeles: cada personaje sigue la posición de su actor 2D y reproduce
 * los clips del GLB (Correr, Saltar, Aplaudir, Celebrar, Quieto…).
 *
 *   const pj = AsociaPj3D.crear('nino', { alto: 160, clip: 'Correr', mira: 'derecha' })
 *   pj.ubicar(x, y)        // centro de la caja de alto `alto` (como los actores de Phaser)
 *   pj.clip('Saltar', { vel: 1.4 })   pj.visible(true)   pj.escala(1)   pj.destruir()
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../../intro3d/js/luces-modelo.js";

const BASE = new URL("../../../intro3d/models/", import.meta.url);
const URLS = { nino: new URL("nino.glb", BASE).href, nina: new URL("nina.glb", BASE).href };
const MIRA = { frente: 0, derecha: Math.PI / 2, izquierda: -Math.PI / 2 };

const loader = crearCargadorGltf();
let renderer = null;
let escena = null;
let camara = null;
let reloj = null;
const vivos = [];

function montar() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const c = renderer.domElement;
    c.id = "asocia-pj3d";
    c.setAttribute("aria-hidden", "true");
    // Encima del juego y debajo del diálogo y los botones (#principal va después en el DOM).
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none";
    const principal = document.getElementById("principal");
    document.body.insertBefore(c, principal || null);
    escena = new THREE.Scene();
    agregarLucesModelo(escena);
    camara = new THREE.OrthographicCamera(0, 1, 0, -1, -3000, 3000);
    reloj = new THREE.Clock();
    redimensionar();
    window.addEventListener("resize", redimensionar);
    requestAnimationFrame(bucle);
}

function redimensionar() {
    const w = window.innerWidth || 1024;
    const h = window.innerHeight || 640;
    renderer.setSize(w, h, false);
    camara.left = 0;
    camara.right = w;
    camara.top = 0;
    camara.bottom = -h;
    camara.updateProjectionMatrix();
}

function bucle() {
    requestAnimationFrame(bucle);
    const dt = Math.min(0.05, reloj.getDelta());
    let algo = false;
    vivos.forEach(function (p) {
        if (p.mixer) p.mixer.update(dt * p.vel);
        if (p.raiz && p.raiz.visible) algo = true;
    });
    renderer.render(escena, camara);
    renderer.domElement.style.visibility = algo ? "visible" : "hidden";
}

function cargar(url) {
    // Cada personaje carga su copia (los modelos con esqueleto no se pueden clonar sin SkeletonUtils).
    return new Promise(function (resolve, reject) { loader.load(url, resolve, undefined, reject); });
}

function crear(modelo, o) {
    o = o || {};
    montar();
    const p = {
        alto: o.alto || 150, x: -9999, y: -9999, vel: 1, factor: 1, mixer: null, raiz: null, acciones: {},
        activo: null, esVisible: true, giro: typeof o.giro === "number" ? o.giro : (MIRA[o.mira || "frente"] || 0), tumbado: !!o.tumbado, listo: false, muerto: false
    };
    const raiz = new THREE.Group();
    raiz.visible = false;
    escena.add(raiz);
    p.raiz = raiz;
    vivos.push(p);
    p.promesa = cargar(URLS[modelo] || URLS.nino).then(function (gltf) {
        if (p.muerto) return;
        const malla = gltf.scene;
        const caja = new THREE.Box3().setFromObject(malla);
        const altoModelo = Math.max(0.01, caja.max.y - caja.min.y);
        malla.position.y = -caja.min.y;
        p.malla = malla;
        p.altoModelo = altoModelo;
        raiz.add(malla);
        p.mixer = new THREE.AnimationMixer(malla);
        (gltf.animations || []).forEach(function (clip) { p.acciones[clip.name.toLowerCase()] = p.mixer.clipAction(clip); });
        p.listo = true;
        aplicar(p);
        p.clip(o.clip || "Quieto");
        raiz.visible = p.esVisible;
    }).catch(function (e) { console.warn("[AsociaPj3D]", e); });

    p.clip = function (nombre, op) {
        op = op || {};
        if (op.vel != null) p.vel = op.vel;
        if (!p.listo) { o.clip = nombre; return; }
        const a = p.acciones[String(nombre).toLowerCase()] || p.acciones.quieto;
        if (!a) return;
        if (p.activo === a) return;
        a.reset();
        a.setLoop(op.unaVez ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        a.clampWhenFinished = !!op.unaVez;
        if (p.activo) p.activo.crossFadeTo(a, 0.2, false);
        a.play();
        p.activo = a;
    };
    p.ubicar = function (x, y) { p.x = x; p.y = y; aplicar(p); };
    p.escala = function (f) { p.factor = f; aplicar(p); };
    p.mirar = function (lado) { p.giro = MIRA[lado] != null ? MIRA[lado] : p.giro; aplicar(p); };
    p.visible = function (si) { p.esVisible = !!si; if (p.listo) raiz.visible = p.esVisible; };
    p.destruir = function () {
        p.muerto = true;
        escena.remove(raiz);
        const i = vivos.indexOf(p);
        if (i >= 0) vivos.splice(i, 1);
    };
    return p;
}

/** Píxeles de pantalla → mundo: los pies al pie de la caja de alto `alto` centrada en (x, y). */
function aplicar(p) {
    if (!p.listo) return;
    const alto = p.alto * p.factor;
    const s = alto / p.altoModelo;
    p.raiz.scale.setScalar(s);
    if (p.tumbado) {
        // Acostado de lado (para la cama): la cabeza hacia la izquierda.
        p.raiz.rotation.set(0, 0, Math.PI / 2);
        p.raiz.position.set(p.x + alto * 0.5, -p.y, 0);
    } else {
        p.raiz.rotation.set(0, p.giro, 0);
        p.raiz.position.set(p.x, -(p.y + alto / 2), 0);
    }
}

/**
 * Foto fija de uno o más personajes en una pose (para la portada). spec:
 *   { tam, fondo (dataURL opcional), modelos: [{ modelo, clip, t (seg), x (-1..1), mira, tumbado, alto (0-1) }] }
 */
async function foto(spec) {
    const tam = spec.tam || 220;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(tam, tam, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setClearColor(0x000000, 0);
    const sc = new THREE.Scene();
    agregarLucesModelo(sc);
    const cam = new THREE.OrthographicCamera(-1, 1, 1.1, -0.9, -10, 10);
    const gltfs = await Promise.all(spec.modelos.map(function (m) { return cargar(URLS[m.modelo] || URLS.nino); }));
    gltfs.forEach(function (gltf, i) {
        const m = spec.modelos[i];
        const malla = gltf.scene;
        const mixer = new THREE.AnimationMixer(malla);
        const clip = (gltf.animations || []).find(function (c) { return c.name.toLowerCase() === String(m.clip || "Quieto").toLowerCase(); });
        if (clip) {
            mixer.clipAction(clip).play();
            mixer.setTime(m.t || 0);
        }
        const caja = new THREE.Box3().setFromObject(malla);
        const h = Math.max(0.01, caja.max.y - caja.min.y);
        const g = new THREE.Group();
        malla.position.y = -caja.min.y;
        g.add(malla);
        const s = (m.alto || 1.6) / h;
        g.scale.setScalar(s);
        if (m.tumbado) {
            g.rotation.set(0, 0, Math.PI / 2);
            g.position.set((m.x || 0) + (m.alto || 1.6) * 0.5, m.y || 0, 0);
        } else {
            g.rotation.y = MIRA[m.mira || "frente"] || 0;
            g.position.set(m.x || 0, (m.y != null ? m.y : -0.8), 0);
        }
        sc.add(g);
    });
    r.render(sc, cam);
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = tam;
    const c2 = lienzo.getContext("2d");
    if (spec.fondo) {
        const img = new Image();
        await new Promise(function (ok) { img.onload = ok; img.onerror = ok; img.src = spec.fondo; });
        c2.drawImage(img, 0, 0, tam, tam);
    }
    c2.drawImage(r.domElement, 0, 0);
    r.dispose();
    return lienzo.toDataURL("image/png");
}

/** Oculta o vuelve a mostrar toda la capa (la pantalla de cierre va encima). */
function capa(visible) {
    if (renderer) renderer.domElement.style.display = visible ? "" : "none";
}

window.AsociaPj3D = { crear: crear, foto: foto, capa: capa };
window.dispatchEvent(new CustomEvent("asocia-pj3d-listo"));
