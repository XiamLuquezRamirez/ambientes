/**
 * Zoe y Zeus en 3D mientras se juega.
 * Sustituye los GIF de los lados, las guías y los que se crean en un cierre.
 * La victoria la resuelve final-scene.js. El avatar del diálogo solo indica quién habla.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const BASE = new URL("../models/", import.meta.url);
const MODELOS = {
    zeus: { url: new URL("nino.glb", BASE).href, escala: 1.12, yaw: -0.32 },
    zoe: { url: new URL("nina.glb", BASE).href, escala: 1.18, yaw: 0.32 }
};
const CLIP_QUIETO = ["Quieto"];
const CLIP_HABLAR = ["Hablar"];

const loader = new GLTFLoader();
const cache = Object.create(null);
const escenaUsada = Object.create(null);
const vistas = [];
let rafId = null;
let montado = false;
let observador = null;

function cargar(url) {
    if (!cache[url]) {
        cache[url] = new Promise(function (resolve, reject) {
            loader.load(url, resolve, undefined, reject);
        });
    }
    return cache[url];
}

function tomarClip(actions, nombres) {
    const claves = Object.keys(actions);
    for (let i = 0; i < nombres.length; i++) {
        const nombre = nombres[i].toLowerCase();
        const exacta = claves.find(function (c) { return c.toLowerCase() === nombre; });
        if (exacta) return actions[exacta];
        const parcial = claves.find(function (c) { return c.toLowerCase().indexOf(nombre) >= 0; });
        if (parcial) return actions[parcial];
    }
    return null;
}

function cruzar(vista, siguiente) {
    if (!siguiente || vista.activo === siguiente) return;
    if (vista.activo) vista.activo.fadeOut(0.18);
    siguiente.reset().fadeIn(0.18).play();
    vista.activo = siguiente;
}

function encuadrar(camera, mesh, encuadre, def) {
    mesh.scale.setScalar(def.escala);
    mesh.rotation.y = def.yaw;
    if (encuadre === "cara") {
        mesh.position.set(0, -0.55, 0);
        camera.position.set(0, 1.42, 1.05);
        camera.lookAt(0, 1.28, 0);
        return;
    }
    mesh.position.set(0, -0.2, 0);
    camera.position.set(0, 1.05, 3.35);
    camera.lookAt(0, 0.72, 0);
}

function redimensionar(vista) {
    if (!vista.renderer || !vista.camera) return;
    const canvas = vista.renderer.domElement;
    const w = Math.max(48, canvas.clientWidth || (vista.host && vista.host.clientWidth) || 140);
    const h = Math.max(48, canvas.clientHeight || (vista.host && vista.host.clientHeight) || 220);
    vista.renderer.setSize(w, h, false);
    vista.camera.aspect = w / h;
    vista.camera.updateProjectionMatrix();
}

function animar() {
    rafId = requestAnimationFrame(animar);
    const ahora = performance.now();
    vistas.forEach(function (vista) {
        if (!vista.mixer || !vista.renderer) return;
        const dt = Math.min(0.05, (ahora - vista.ultimo) / 1000 || 0.016);
        vista.ultimo = ahora;
        vista.mixer.update(dt);
        vista.renderer.render(vista.scene, vista.camera);
    });
}

function asegurarBucle() {
    if (rafId == null) animar();
}

async function crearVista(host, id, encuadre) {
    if (!host || host.querySelector(".pj-3d-canvas")) return;
    const def = MODELOS[id] || MODELOS.zoe;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "pj-3d-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.25));
    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(1.5, 3, 2);
    scene.add(dir);

    const vista = {
        id: id,
        host: host,
        renderer: renderer,
        scene: scene,
        camera: camera,
        mixer: null,
        mesh: null,
        idle: null,
        talk: null,
        activo: null,
        ultimo: performance.now()
    };
    vistas.push(vista);
    redimensionar(vista);
    requestAnimationFrame(function () { redimensionar(vista); });
    asegurarBucle();

    try {
        const gltf = await cargar(def.url);
        if (vistas.indexOf(vista) < 0) return;
        const mesh = escenaUsada[def.url] ? gltf.scene.clone(true) : gltf.scene;
        escenaUsada[def.url] = true;
        encuadrar(camera, mesh, encuadre, def);
        scene.add(mesh);
        vista.mesh = mesh;
        if (gltf.animations && gltf.animations.length) {
            const mixer = new THREE.AnimationMixer(mesh);
            const actions = {};
            gltf.animations.forEach(function (clip) {
                actions[clip.name] = mixer.clipAction(clip);
            });
            vista.mixer = mixer;
            vista.idle = tomarClip(actions, CLIP_QUIETO);
            vista.talk = tomarClip(actions, CLIP_HABLAR);
            if (vista.idle) vista.idle.setLoop(THREE.LoopRepeat, Infinity);
            if (vista.talk) vista.talk.setLoop(THREE.LoopRepeat, Infinity);
            cruzar(vista, vista.idle || vista.talk);
        }
        redimensionar(vista);
    } catch (e) {
        console.warn("[PersonajesJuego]", id, e);
    }
}

function hostDeImagen(img) {
    if (img.closest(".pj-3d, .pj-3d-host")) return img.closest(".pj-3d, .pj-3d-host");
    const box = document.createElement("div");
    box.className = (img.className || "") + " pj-3d-host";
    img.parentNode.insertBefore(box, img);
    box.appendChild(img);
    img.classList.add("pj-3d-fuente");
    return box;
}

function idDeSrc(src) {
    return /zeus/i.test(src) ? "zeus" : "zoe";
}

function esGifPersonaje(src) {
    return /(zoe|zeus)_(normal|hablando)\.gif/i.test(String(src || ""));
}

function ignorar(img) {
    return !!(img.closest("#victoria") || img.classList.contains("inicio-pj") || img.id === "dialogo-avatar" || img.classList.contains("dialogo-avatar"));
}

function sincronizarSrc(src) {
    if (!esGifPersonaje(src)) return;
    const id = idDeSrc(src);
    if (document.body.classList.contains("demo-voz") && window.PedniaTutorial && typeof PedniaTutorial.vozDemo === "function" && PedniaTutorial.vozDemo()) {
        const forzar = PedniaTutorial.vozDemo();
        if (/hablando/i.test(src)) hablar(forzar);
        else callar(forzar);
        return;
    }
    if (/hablando/i.test(src)) hablar(id);
    else callar(id);
}

function revisarImg(img) {
    if (!img || img.tagName !== "IMG" || ignorar(img)) return;
    const src = img.getAttribute("src") || "";
    if (!esGifPersonaje(src)) return;
    sincronizarSrc(src);
    if (img.classList.contains("pj-3d-fuente") || img.closest(".pj-3d")) return;
    const encuadre = img.classList.contains("guia") ? "cara" : "cuerpo";
    const host = hostDeImagen(img);
    crearVista(host, idDeSrc(src), encuadre);
}

function montarContenedores() {
    document.querySelectorAll(".pj-zoe").forEach(function (el) {
        if (el.closest("#victoria")) return;
        el.classList.add("pj-3d");
        const img = el.querySelector("img");
        if (img) img.classList.add("pj-3d-fuente");
        crearVista(el, "zoe", "cuerpo");
    });
    document.querySelectorAll(".pj-zeus").forEach(function (el) {
        if (el.closest("#victoria")) return;
        el.classList.add("pj-3d");
        const img = el.querySelector("img");
        if (img) img.classList.add("pj-3d-fuente");
        crearVista(el, "zeus", "cuerpo");
    });
    document.querySelectorAll("img").forEach(revisarImg);
    if (document.querySelector(".pj-zoe, .pj-zeus, #guia-zoe, #guia-zeus")) return;
    ["zoe", "zeus"].forEach(function (id) {
        const box = document.createElement("div");
        box.className = "pj pj-" + id + " pj-3d pj-3d-flotante";
        box.id = "pj-" + id;
        document.body.appendChild(box);
        crearVista(box, id, "cuerpo");
    });
    requestAnimationFrame(function () { requestAnimationFrame(retirarSiTapan); });
}

function seCruzan(a, b) {
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return ix > 12 && iy > 12;
}

function tapaJuego(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    const zonas = document.querySelectorAll(".objeto, .panel-img, #figura, #zona-piezas");
    for (let i = 0; i < zonas.length; i++) {
        if (seCruzan(r, zonas[i].getBoundingClientRect())) return true;
    }
    return false;
}

function retirarSiTapan() {
    const flotantes = document.querySelectorAll(".pj-3d-flotante");
    if (!flotantes.length) return;
    let tapa = false;
    flotantes.forEach(function (el) {
        if (tapaJuego(el)) tapa = true;
    });
    if (!tapa) return;
    flotantes.forEach(function (el) {
        for (let i = vistas.length - 1; i >= 0; i--) {
            if (vistas[i].host !== el) continue;
            if (vistas[i].renderer) vistas[i].renderer.dispose();
            vistas.splice(i, 1);
        }
        el.remove();
    });
}

function corregirAvatar(img) {
    if (!img || img.id !== "dialogo-avatar") return;
    if (!document.body.classList.contains("demo-voz")) return;
    if (!window.PedniaTutorial || typeof PedniaTutorial.vozDemo !== "function") return;
    const voz = PedniaTutorial.vozDemo();
    if (!voz) return;
    const src = img.getAttribute("src") || "";
    if (!esGifPersonaje(src)) return;
    if (idDeSrc(src) === voz) return;
    img.src = src.replace(/zoe|zeus/ig, voz);
}

function observar() {
    if (observador) return;
    observador = new MutationObserver(function (cambios) {
        cambios.forEach(function (c) {
            if (c.type === "attributes" && c.target && c.target.tagName === "IMG") {
                corregirAvatar(c.target);
                sincronizarSrc(c.target.getAttribute("src") || "");
                return;
            }
            (c.addedNodes || []).forEach(function (nodo) {
                if (!nodo || nodo.nodeType !== 1) return;
                if (nodo.tagName === "IMG") revisarImg(nodo);
                if (nodo.querySelectorAll) nodo.querySelectorAll("img").forEach(revisarImg);
            });
        retirarSiTapan();
        });
    });
    observador.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src"]
    });
}

function listoParaMontar() {
    if (document.body.classList.contains("esperando-inicio")) return false;
    if (document.body.classList.contains("intro3d-activa")) return false;
    const principal = document.getElementById("principal");
    if (!principal) return false;
    return getComputedStyle(principal).display !== "none";
}

function montar() {
    if (montado || !listoParaMontar()) return;
    montado = true;
    montarContenedores();
    if (vistas.length) document.body.classList.add("personajes-3d");
    observar();
    window.addEventListener("resize", function () {
        vistas.forEach(redimensionar);
    });
}

function vigilar() {
    montar();
    const cuerpo = new MutationObserver(montar);
    cuerpo.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    const principal = document.getElementById("principal");
    if (principal) {
        const extra = new MutationObserver(montar);
        extra.observe(principal, { attributes: true, attributeFilter: ["style", "class"] });
    }
}

function hablar(id) {
    const quien = id === "zeus" ? "zeus" : "zoe";
    vistas.forEach(function (vista) {
        if (!vista.mesh) return;
        if (vista.id === quien) cruzar(vista, vista.talk || vista.idle);
        else cruzar(vista, vista.idle || vista.talk);
    });
}

function callar(id) {
    vistas.forEach(function (vista) {
        if (id && vista.id !== id) return;
        cruzar(vista, vista.idle || vista.talk);
    });
}

window.PersonajesJuego = {
    hablar: hablar,
    callar: callar,
    listo: function () { return montado; }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", vigilar);
} else {
    vigilar();
}
