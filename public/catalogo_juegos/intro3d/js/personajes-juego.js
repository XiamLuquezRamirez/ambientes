/**
 * Zoe y Zeus en 3D mientras se juega.
 * Sustituye los GIF de los lados, las guías y los que se crean en un cierre.
 * La victoria la resuelve final-scene.js. El avatar del diálogo solo indica quién habla.
 *
 * Si body tiene .pj-entran: entran caminando (clip Caminar) y luego idle; el juego
 * puede esperar con PersonajesJuego.entradaCompleta() antes de hablar.
 *
 * Clips del GLB (nino/nina): Quieto, Caminar, Correr, Hablar, Caminar_y_hablar,
 * Celebrar, Saltar, Aplaudir, Bailar, Pensar, Estirarse, Mirar_alrededor,
 * Decir_si, Decir_no, Triste, Saludar, Senalar, Reir, Timido, Asustado,
 * Enojado, Porra_con_pompones.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { agregarLucesModelo } from "./luces-modelo.js";

const BASE = new URL("../models/", import.meta.url);
/* Zeus a la izquierda (mira al centro); Zoe a la derecha. */
const MODELOS = {
    zeus: { url: new URL("nino.glb", BASE).href, escala: 1.12, yaw: 0.32 },
    zoe: { url: new URL("nina.glb", BASE).href, escala: 1.18, yaw: -0.32 }
};
/* Nombres exactos del GLB (no substring: Hablar ≠ Caminar_y_hablar). */
const CLIP_QUIETO = ["Quieto"];
const CLIP_HABLAR = ["Hablar"];
const CLIP_CAMINAR = ["Caminar"];
const WALK_SPEED = 1.35;
/* Distancia corta: el canvas lateral es estrecho; si arrancan muy lejos no se ve el clip. */
const WALK_INICIO = 1.25;

const loader = new GLTFLoader();
const cache = Object.create(null);
const escenaUsada = Object.create(null);
const vistas = [];
let rafId = null;
let montado = false;
let observador = null;
let entradasPendientes = 0;
let escenaLista = false;
const esperaEntrada = [];

function cargar(url) {
    if (!cache[url]) {
        cache[url] = new Promise(function (resolve, reject) {
            loader.load(url, resolve, undefined, reject);
        });
    }
    return cache[url];
}

/** Solo coincidencia exacta (case-insensitive). */
function tomarClip(actions, nombres) {
    const claves = Object.keys(actions);
    for (let i = 0; i < nombres.length; i++) {
        const nombre = String(nombres[i]).toLowerCase();
        const exacta = claves.find(function (c) { return c.toLowerCase() === nombre; });
        if (exacta) return actions[exacta];
    }
    return null;
}

function cruzar(vista, siguiente, dur) {
    if (!siguiente) return;
    if (vista.activo === siguiente && siguiente.isRunning && siguiente.isRunning()) return;
    const d = dur != null ? dur : 0.18;
    if (vista.activo && vista.activo !== siguiente) vista.activo.fadeOut(d);
    siguiente.enabled = true;
    siguiente.reset();
    siguiente.setEffectiveWeight(1);
    siguiente.setEffectiveTimeScale(1);
    siguiente.fadeIn(d).play();
    vista.activo = siguiente;
}

function quiereEntrarCaminando() {
    return document.body.classList.contains("pj-entran")
        && escenaLista
        && !document.body.classList.contains("esperando-escena")
        && !document.body.classList.contains("sin-animaciones")
        && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function esperandoEscena() {
    return !escenaLista || document.body.classList.contains("esperando-escena");
}

/** Cuerpo completo en el canvas (pies visibles). */
function encuadrar(camera, mesh, encuadre, def) {
    mesh.scale.setScalar(def.escala);
    mesh.rotation.y = def.yaw;
    if (encuadre === "cara") {
        mesh.position.set(0, -0.55, 0);
        camera.position.set(0, 1.42, 1.05);
        camera.lookAt(0, 1.28, 0);
        return;
    }
    mesh.position.set(0, 0.02, 0);
    camera.fov = 28;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0.98, 4.55);
    camera.lookAt(0, 0.92, 0);
}

function notificarSiListos() {
    if (entradasPendientes > 0) return;
    if (!vistas.length) return;
    if (!vistas.every(function (v) { return v.llego; })) return;
    const pendientes = esperaEntrada.splice(0, esperaEntrada.length);
    pendientes.forEach(function (fn) { fn(); });
}

function marcarLlegada(vista) {
    if (!vista || vista.llego) return;
    vista.llego = true;
    if (vista.contabaEntrada) {
        vista.contabaEntrada = false;
        entradasPendientes = Math.max(0, entradasPendientes - 1);
    }
    notificarSiListos();
    if (vista.hablarPendiente) {
        const id = vista.hablarPendiente;
        vista.hablarPendiente = null;
        hablar(id);
    }
}

function iniciarCaminata(vista, def) {
    if (!vista.mesh) return;
    if (vista.estado === "caminando") return;
    if (!quiereEntrarCaminando()) {
        vista.estado = "idle";
        vista.mesh.visible = true;
        vista.mesh.position.x = 0;
        vista.mesh.rotation.y = def.yaw;
        cruzar(vista, vista.idle || vista.talk || vista.walk, 0.01);
        marcarLlegada(vista);
        return;
    }
    /* Zeus entra por la izquierda; Zoe por la derecha. Yaw = dirección de marcha (no de espaldas). */
    const desdeIzquierda = vista.id === "zeus";
    vista.finX = 0;
    vista.inicioX = desdeIzquierda ? -WALK_INICIO : WALK_INICIO;
    vista.mesh.visible = true;
    vista.mesh.position.x = vista.inicioX;
    /* +X → Math.PI/2; −X → −Math.PI/2 (modelo mira +Z en reposo). */
    vista.mesh.rotation.y = desdeIzquierda ? Math.PI / 2 : -Math.PI / 2;
    vista.estado = "caminando";
    vista.llego = false;
    if (!vista.contabaEntrada) {
        vista.contabaEntrada = true;
        entradasPendientes += 1;
    }
    cruzar(vista, vista.walk || vista.idle || vista.talk, 0.01);
    if (!vista.walk) {
        console.warn("[PersonajesJuego] Sin clip Caminar en", vista.id, Object.keys(vista._clips || {}));
    }
}

function actualizarCaminata(vista, dt) {
    if (!vista.mesh || vista.estado !== "caminando") return;
    const dx = vista.finX - vista.mesh.position.x;
    const dist = Math.abs(dx);
    if (dist > 0.04) {
        const paso = Math.sign(dx) * Math.min(dist, WALK_SPEED * dt);
        vista.mesh.position.x += paso;
        return;
    }
    const def = MODELOS[vista.id] || MODELOS.zoe;
    vista.mesh.position.x = vista.finX;
    vista.estado = "idle";
    vista.mesh.rotation.y = def.yaw;
    cruzar(vista, vista.idle || vista.talk || vista.walk, 0.2);
    marcarLlegada(vista);
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
        if (!vista.renderer) return;
        const dt = Math.min(0.05, (ahora - vista.ultimo) / 1000 || 0.016);
        vista.ultimo = ahora;
        if (vista.mixer) vista.mixer.update(dt);
        actualizarCaminata(vista, dt);
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

    agregarLucesModelo(scene);

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
        walk: null,
        activo: null,
        estado: "carga",
        llego: false,
        hablarPendiente: null,
        _clips: null,
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
        mesh.visible = false;
        scene.add(mesh);
        vista.mesh = mesh;
        if (gltf.animations && gltf.animations.length) {
            const mixer = new THREE.AnimationMixer(mesh);
            const actions = {};
            gltf.animations.forEach(function (clip) {
                actions[clip.name] = mixer.clipAction(clip);
            });
            vista._clips = actions;
            vista.mixer = mixer;
            vista.idle = tomarClip(actions, CLIP_QUIETO);
            vista.talk = tomarClip(actions, CLIP_HABLAR);
            vista.walk = tomarClip(actions, CLIP_CAMINAR);
            if (vista.idle) vista.idle.setLoop(THREE.LoopRepeat, Infinity);
            if (vista.talk) vista.talk.setLoop(THREE.LoopRepeat, Infinity);
            if (vista.walk) vista.walk.setLoop(THREE.LoopRepeat, Infinity);
        } else {
            console.warn("[PersonajesJuego] GLB sin animaciones:", def.url);
        }
        window.requestAnimationFrame(function () {
            if (vistas.indexOf(vista) < 0 || !vista.mesh) return;
            redimensionar(vista);
            if (esperandoEscena()) {
                vista.estado = "espera";
                vista.mesh.visible = false;
                return;
            }
            iniciarCaminata(vista, def);
        });
    } catch (e) {
        console.warn("[PersonajesJuego]", id, e);
        marcarLlegada(vista);
    }
}

/** Tras cargar la escena 2D: suelta la espera y arranca la caminata. */
function iniciarEntrada() {
    escenaLista = true;
    document.body.classList.remove("esperando-escena");
    /* Si el módulo montó tarde, forzar ahora que #principal ya se ve. */
    montar();
    vistas.forEach(function (vista) {
        if (!vista.mesh) return;
        if (vista.estado === "caminando") {
            redimensionar(vista);
            return;
        }
        if (vista.estado === "espera" || vista.estado === "carga" || !vista.llego) {
            iniciarCaminata(vista, MODELOS[vista.id] || MODELOS.zoe);
        }
        redimensionar(vista);
    });
    notificarSiListos();
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
    if (montado) {
        /* Ya montado: si faltan vistas (hosts aparecieron tarde), reintentar contenedores. */
        if (!vistas.length && listoParaMontar()) montarContenedores();
        return;
    }
    if (!listoParaMontar()) return;
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

function hablandoOk(vista) {
    return vista && vista.mesh && vista.estado !== "carga";
}

function hablar(id) {
    const quien = id === "zeus" ? "zeus" : "zoe";
    vistas.forEach(function (vista) {
        if (!hablandoOk(vista)) return;
        if (vista.estado === "caminando") {
            if (vista.id === quien) vista.hablarPendiente = quien;
            return;
        }
        if (vista.id === quien) cruzar(vista, vista.talk || vista.idle);
        else cruzar(vista, vista.idle || vista.talk);
    });
}

function callar(id) {
    vistas.forEach(function (vista) {
        if (id && vista.id !== id) return;
        if (!hablandoOk(vista)) return;
        if (vista.estado === "caminando") {
            vista.hablarPendiente = null;
            return;
        }
        cruzar(vista, vista.idle || vista.talk);
    });
}

function entradaCompleta() {
    if (!document.body.classList.contains("pj-entran")) return Promise.resolve();
    return new Promise(function (resolve) {
        function listos() {
            if (!escenaLista) return false;
            if (!montado || vistas.length === 0) return false;
            if (entradasPendientes > 0) return false;
            return vistas.every(function (v) { return v.llego; });
        }
        if (listos()) {
            resolve();
            return;
        }
        esperaEntrada.push(resolve);
        var poll = window.setInterval(function () {
            montar();
            if (!listos()) return;
            window.clearInterval(poll);
            var i = esperaEntrada.indexOf(resolve);
            if (i >= 0) esperaEntrada.splice(i, 1);
            resolve();
        }, 80);
        window.setTimeout(function () {
            window.clearInterval(poll);
            var i = esperaEntrada.indexOf(resolve);
            if (i >= 0) {
                esperaEntrada.splice(i, 1);
                vistas.forEach(function (v) {
                    if (!v.llego) marcarLlegada(v);
                });
                resolve();
            }
        }, 12000);
    });
}

window.PersonajesJuego = {
    hablar: hablar,
    callar: callar,
    listo: function () { return montado; },
    entradaCompleta: entradaCompleta,
    iniciarEntrada: iniciarEntrada
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", vigilar);
} else {
    vigilar();
}
