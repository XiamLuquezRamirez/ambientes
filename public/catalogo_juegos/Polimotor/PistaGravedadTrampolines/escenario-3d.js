/**
 * EscenarioPista — escena three.js de "La Pista de Gravedad y Trampolines" (window.EscenarioPista).
 *
 * Una pista elevada suspendida en el espacio: losas con volumen (rampas, curvas, puentes), barandas de cristal con
 * neón, la pista flota sin pilares sobre un espacio lleno (nebulosas, islas con cristales, asteroides, planetas, estaciones, cometas), agujeros con profundidad real (la losa está perforada), trampolines
 * amarillos con resortes, muros de energía y la plataforma de meta. La esfera es un objeto físico: rueda según su
 * desplazamiento, proyecta sombra, ilumina la pista con su luz y se aplasta al aterrizar.
 *
 * La física vive en ReglasGravedad (puro). Esta escena la ejecuta en cada cuadro y anima lo que la física decide:
 * caída + rayo tractor + rescate al último punto seguro, salto del trampolín por su parábola fija y llegada a la meta.
 * Avisa al flujo (script.js) con eventos: mueve, pared, cerca, agujero, rayo, rescate, salto, aterriza, seguro, meta.
 *
 * Cada animación que el flujo espera es una Promise con respaldo por tiempo (con la pestaña oculta no hay cuadros).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const RG = window.ReglasGravedad;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

let contenedor = null;
let renderer = null;
let scene = null;
let camera = null;
let cfgJuego = {};
let listo = false;

let P = null;               // pista actual (ReglasGravedad.construir)
let E = null;               // estado físico de la esfera
let ctrl = null;            // control actual (dedo, teclado o demo)
let bloqueado = true;
let modo = "oculta";        // oculta · rueda · cae · salta · meta · anim
const handlers = {};

let grupoPista = null;
let desechables = [];
const piezasG = [];
const agujerosG = {};
const trampolinesG = {};
const segurosG = [];
const murosG = [];
let metaG = null;

let esferaG = null;
let esferaMesh = null;
let esferaGlow = null;
let esferaLuz = null;
let sombraBlob = null;
let marcaAterrizaje = null;
let brilloDestino = null;
let marcaObjetivo = null;
let rayo = null;
let guiaOrbe = null;
const estela = [];
let squash = 0;
let brilloExtra = 0;
let tiempo = 0;
let ultimo = 0;
let ultParedEv = 0;
let ultMueveEv = 0;

// cámara
const cam = {
    modo: "sigue",
    foco: new THREE.Vector3(),
    focoObj: new THREE.Vector3(),
    dist: 13,
    distObj: 13,
    ang: 0,          // giro alrededor del foco (cinemática final)
    angObj: 0,
    pitch: 0.83      // ~47° hacia abajo
};

// ------------------------------------------------------------------ utilidades

function emitir(nombre, dato) {
    const fn = handlers[nombre];
    if (typeof fn === "function") {
        try { fn(dato); } catch (e) { console.warn("[EscenarioPista]", nombre, e); }
    }
}

const tweens = [];

/** Animación por tiempo: fn(t) con t de 0 a 1. Resuelve también por temporizador si no hay cuadros. */
function animar(ms, fn, ease) {
    ms = reducido ? Math.min(ms, 250) : ms;
    return new Promise(function (resolve) {
        const tw = { t0: performance.now(), ms: Math.max(1, ms), fn: fn, ease: ease || suave, fin: false, resolve: resolve };
        tweens.push(tw);
        tw.respaldo = setTimeout(function () { terminarTween(tw); }, ms + 400);
    });
}

function terminarTween(tw) {
    if (tw.fin) return;
    tw.fin = true;
    clearTimeout(tw.respaldo);
    try { tw.fn(1); } catch (e) { /* noop */ }
    const i = tweens.indexOf(tw);
    if (i >= 0) tweens.splice(i, 1);
    tw.resolve();
}

function correrTweens(ahora) {
    for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const u = Math.min(1, (ahora - tw.t0) / tw.ms);
        if (u >= 1) terminarTween(tw);
        else {
            try { tw.fn(tw.ease(u)); } catch (e) { /* noop */ }
        }
    }
}

function esperar(ms) {
    return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 120) : ms); });
}

function suave(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function salida(t) { return 1 - Math.pow(1 - t, 3); }
function lineal(t) { return t; }
function rebote(t) {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function elastico(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
}

function lienzo(w, h, dibujar) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    dibujar(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

// ------------------------------------------------------------------ texturas (dibujadas en canvas, sin archivos)

const TX = {};

function crearTexturas() {
    TX.panel = lienzo(256, 256, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, "#c9bcff");
        gr.addColorStop(1, "#a594f2");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        // paneles: juntas oscuras y bisel claro
        g.strokeStyle = "rgba(60, 40, 140, 0.55)";
        g.lineWidth = 5;
        g.strokeRect(2, 2, w - 4, h - 4);
        g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
        g.strokeStyle = "rgba(255, 255, 255, 0.5)";
        g.lineWidth = 2;
        [[8, 8], [w / 2 + 6, 8], [8, h / 2 + 6], [w / 2 + 6, h / 2 + 6]].forEach(function (p) {
            g.beginPath(); g.moveTo(p[0], p[1] + 110); g.lineTo(p[0], p[1]); g.lineTo(p[0] + 110, p[1]); g.stroke();
        });
        g.fillStyle = "rgba(80, 60, 170, 0.5)";
        [[18, 18], [w / 2 - 18, 18], [18, h / 2 - 18], [w / 2 - 18, h / 2 - 18]].forEach(function (p) {
            [0, w / 2].forEach(function (ox) { [0, h / 2].forEach(function (oy) {
                g.beginPath(); g.arc(p[0] + ox, p[1] + oy, 4, 0, Math.PI * 2); g.fill();
            }); });
        });
    });
    TX.panel.wrapS = TX.panel.wrapT = THREE.RepeatWrapping;
    TX.panel.repeat.set(0.5, 0.5);

    TX.rampa = lienzo(256, 256, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, "#d9cfff");
        gr.addColorStop(1, "#b7a7fb");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(60, 40, 140, 0.45)";
        g.lineWidth = 4;
        g.strokeRect(2, 2, w - 4, h - 4);
        // chevrones de neón que indican hacia dónde baja o sube la rampa
        g.strokeStyle = "rgba(34, 211, 238, 0.85)";
        g.lineWidth = 14;
        g.lineCap = "round";
        [h * 0.3, h * 0.7].forEach(function (y) {
            g.beginPath();
            g.moveTo(w * 0.35, y - 34); g.lineTo(w * 0.6, y); g.lineTo(w * 0.35, y + 34);
            g.stroke();
        });
    });
    TX.rampa.wrapS = TX.rampa.wrapT = THREE.RepeatWrapping;
    TX.rampa.repeat.set(0.5, 0.5);

    TX.puente = lienzo(256, 128, function (g, w, h) {
        g.fillStyle = "#9fe7ff";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,0.45)";
        for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 6, h);
        g.strokeStyle = "rgba(14, 116, 144, 0.6)";
        g.lineWidth = 6;
        g.strokeRect(0, 3, w, h - 6);
    });
    TX.puente.wrapS = TX.puente.wrapT = THREE.RepeatWrapping;
    TX.puente.repeat.set(0.5, 0.5);

    TX.meta = lienzo(512, 512, function (g, w, h) {
        const c = w / 2;
        const gr = g.createRadialGradient(c, c, 20, c, c, c);
        gr.addColorStop(0, "#fff7c2");
        gr.addColorStop(0.35, "#c4b5fd");
        gr.addColorStop(1, "#8b7cf0");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(34, 211, 238, 0.9)";
        [0.92, 0.62, 0.34].forEach(function (k, i) {
            g.lineWidth = i === 0 ? 10 : 7;
            g.beginPath(); g.arc(c, c, c * k, 0, Math.PI * 2); g.stroke();
        });
        // estrella central
        g.fillStyle = "#facc15";
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 ? 40 : 95;
            const a = -Math.PI / 2 + i * Math.PI / 5;
            g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
        }
        g.closePath(); g.fill();
    });

    TX.glow = lienzo(128, 128, function (g, w) {
        const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, "rgba(255,255,255,1)");
        gr.addColorStop(0.25, "rgba(255,255,255,0.6)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, w);
    });

    TX.sombra = lienzo(128, 128, function (g, w) {
        const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, "rgba(10,4,30,0.85)");
        gr.addColorStop(0.6, "rgba(10,4,30,0.35)");
        gr.addColorStop(1, "rgba(10,4,30,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, w);
    });

    TX.peligro = lienzo(128, 128, function (g, w, h) {
        g.fillStyle = "#ff9f43";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#ff4d8d";
        for (let i = -h; i < w; i += 32) {
            g.beginPath();
            g.moveTo(i, h); g.lineTo(i + 16, h); g.lineTo(i + 16 + h, 0); g.lineTo(i + h, 0);
            g.closePath(); g.fill();
        }
    });
    TX.peligro.wrapS = TX.peligro.wrapT = THREE.RepeatWrapping;
    TX.peligro.repeat.set(3, 3);

    TX.hoyo = lienzo(16, 256, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#7c3aed");
        gr.addColorStop(0.18, "#3b0f7a");
        gr.addColorStop(0.6, "#12062b");
        gr.addColorStop(1, "#000000");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
    });

    TX.muro = lienzo(64, 256, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "rgba(244, 114, 182, 0.95)");
        gr.addColorStop(0.5, "rgba(168, 85, 247, 0.65)");
        gr.addColorStop(1, "rgba(56, 189, 248, 0.85)");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,0.35)";
        for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 3);
    });
    TX.muro.wrapS = TX.muro.wrapT = THREE.RepeatWrapping;

    TX.rayo = lienzo(64, 256, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "rgba(125, 249, 255, 0)");
        gr.addColorStop(0.3, "rgba(125, 249, 255, 0.55)");
        gr.addColorStop(1, "rgba(255, 255, 255, 0.95)");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,0.35)";
        for (let y = 0; y < h; y += 24) g.fillRect(0, y, w, 6);
    });
    TX.rayo.wrapS = TX.rayo.wrapT = THREE.RepeatWrapping;

    TX.esfera = lienzo(512, 256, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#ffd1f5");
        gr.addColorStop(0.5, "#f472b6");
        gr.addColorStop(1, "#a21caf");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        // bandas de energía: se ve girar la esfera
        g.lineWidth = 14;
        g.strokeStyle = "rgba(255, 255, 255, 0.85)";
        g.beginPath();
        for (let x = 0; x <= w; x += 4) g.lineTo(x, h / 2 + Math.sin(x / w * Math.PI * 4) * 38);
        g.stroke();
        g.lineWidth = 8;
        g.strokeStyle = "rgba(103, 232, 249, 0.9)";
        [0.25, 0.75].forEach(function (k) {
            g.beginPath();
            for (let x = 0; x <= w; x += 4) g.lineTo(x, h * k + Math.cos(x / w * Math.PI * 6) * 14);
            g.stroke();
        });
        g.fillStyle = "rgba(255,255,255,0.9)";
        for (let i = 0; i < 18; i++) {
            g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 0, Math.PI * 2); g.fill();
        }
    });

    TX.cielo = lienzo(1024, 512, function (g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#05041a");
        gr.addColorStop(0.45, "#1d1060");
        gr.addColorStop(0.7, "#3b1a7a");
        gr.addColorStop(1, "#0b0730");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        // nebulosas
        [["rgba(236,72,153,0.35)", 0.2, 0.45, 180], ["rgba(56,189,248,0.3)", 0.62, 0.38, 220], ["rgba(168,85,247,0.35)", 0.85, 0.55, 160], ["rgba(34,211,238,0.2)", 0.4, 0.62, 200]].forEach(function (n) {
            const r = g.createRadialGradient(n[1] * w, n[2] * h, 0, n[1] * w, n[2] * h, n[3]);
            r.addColorStop(0, n[0]);
            r.addColorStop(1, "rgba(0,0,0,0)");
            g.fillStyle = r;
            g.fillRect(0, 0, w, h);
        });
    });

    TX.aviso = lienzo(128, 128, function (g, w) {
        g.fillStyle = "#ffd43b";
        g.strokeStyle = "#ffffff";
        g.lineWidth = 8;
        g.lineJoin = "round";
        g.beginPath(); g.moveTo(w / 2, 12); g.lineTo(w - 10, w - 16); g.lineTo(10, w - 16); g.closePath();
        g.fill(); g.stroke();
        g.fillStyle = "#7c2d12";
        g.fillRect(w / 2 - 7, 42, 14, 44);
        g.beginPath(); g.arc(w / 2, 98, 8, 0, Math.PI * 2); g.fill();
    });

    TX.anillo = lienzo(256, 256, function (g, w) {
        g.strokeStyle = "rgba(255, 230, 80, 1)";
        g.lineWidth = 14;
        g.setLineDash([26, 16]);
        g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 12, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2 - 20);
        gr.addColorStop(0, "rgba(10,4,30,0.7)");
        gr.addColorStop(1, "rgba(10,4,30,0)");
        g.fillStyle = gr;
        g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 20, 0, Math.PI * 2); g.fill();
    });

    TX.planeta1 = lienzo(256, 128, function (g, w, h) {
        for (let y = 0; y < h; y += 8) {
            g.fillStyle = "hsl(" + (20 + Math.sin(y * 0.15) * 14) + ", 85%, " + (55 + Math.sin(y * 0.3) * 10) + "%)";
            g.fillRect(0, y, w, 8);
        }
    });
    TX.planeta2 = lienzo(256, 128, function (g, w, h) {
        for (let y = 0; y < h; y += 6) {
            g.fillStyle = "hsl(" + (190 + Math.sin(y * 0.2) * 20) + ", 75%, " + (55 + Math.cos(y * 0.25) * 12) + "%)";
            g.fillRect(0, y, w, 6);
        }
    });
}

// ------------------------------------------------------------------ materiales compartidos

const MT = {};

function crearMateriales() {
    MT.top = new THREE.MeshStandardMaterial({ map: TX.panel, color: 0xffffff, roughness: 0.55, metalness: 0.25, emissive: 0x2a1a6e, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    MT.rampa = new THREE.MeshStandardMaterial({ map: TX.rampa, color: 0xffffff, roughness: 0.5, metalness: 0.25, emissive: 0x2a1a6e, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    MT.puente = new THREE.MeshStandardMaterial({ map: TX.puente, color: 0xffffff, roughness: 0.3, metalness: 0.4, emissive: 0x0e7490, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    MT.lado = new THREE.MeshStandardMaterial({ color: 0x4b3a99, roughness: 0.5, metalness: 0.6, emissive: 0x160a40, emissiveIntensity: 0.6, side: THREE.DoubleSide });
    MT.metaTop = new THREE.MeshStandardMaterial({ map: TX.meta, roughness: 0.45, metalness: 0.3, emissive: 0x3b2a8a, emissiveIntensity: 0.4 });
    MT.neon = new THREE.MeshBasicMaterial({ color: 0x67f0ff });
    MT.neonRosa = new THREE.MeshBasicMaterial({ color: 0xff7ad9 });
    MT.cristal = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    MT.hoyo = new THREE.MeshBasicMaterial({ map: TX.hoyo, side: THREE.BackSide });
    MT.metalOscuro = new THREE.MeshStandardMaterial({ color: 0x4a4280, roughness: 0.4, metalness: 0.4, emissive: 0x120a30, emissiveIntensity: 0.5 });
    MT.oro = new THREE.MeshStandardMaterial({ color: 0xffd447, roughness: 0.28, metalness: 0.35, emissive: 0xb06f00, emissiveIntensity: 0.75 });
    MT.poste = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.35, metalness: 0.5, emissive: 0x7e22ce, emissiveIntensity: 0.5 });
}

function glowSprite(color, escala, opacidad) {
    const m = new THREE.SpriteMaterial({ map: TX.glow, color: color, transparent: true, opacity: opacidad == null ? 0.8 : opacidad, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(escala || 1);
    desechables.push(m);
    return s;
}

// ------------------------------------------------------------------ partículas (dos sistemas fijos, sin crear objetos por cuadro)

function crearParticulas(n, tamano, conGravedad) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: tamano, map: TX.glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    const sis = { n: n, pos: pos, col: col, geo: geo, pts: pts, vel: new Float32Array(n * 3), vida: new Float32Array(n), vidaMax: new Float32Array(n), base: new Float32Array(n * 3), cur: 0, grav: conGravedad };
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -9999;
    return sis;
}

let chispas = null;
let confeti = null;
const tmpColor = new THREE.Color();

function emitir3d(sis, x, y, z, color, cantidad, rapidez, arriba, vida) {
    if (!sis) return;
    tmpColor.set(color);
    for (let k = 0; k < cantidad; k++) {
        const i = sis.cur;
        sis.cur = (sis.cur + 1) % sis.n;
        const a = Math.random() * Math.PI * 2;
        const b = Math.random() * Math.PI - Math.PI / 2;
        const v = rapidez * (0.4 + Math.random() * 0.6);
        sis.pos[i * 3] = x; sis.pos[i * 3 + 1] = y; sis.pos[i * 3 + 2] = z;
        sis.vel[i * 3] = Math.cos(a) * Math.cos(b) * v;
        sis.vel[i * 3 + 1] = Math.abs(Math.sin(b)) * v * 0.6 + (arriba || 0) * (0.5 + Math.random() * 0.8);
        sis.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * v;
        const c = Array.isArray(color) ? new THREE.Color(color[Math.floor(Math.random() * color.length)]) : tmpColor;
        sis.base[i * 3] = c.r; sis.base[i * 3 + 1] = c.g; sis.base[i * 3 + 2] = c.b;
        sis.vida[i] = sis.vidaMax[i] = (vida || 0.9) * (0.7 + Math.random() * 0.6);
    }
}

function correrParticulas(sis, dt) {
    if (!sis) return;
    for (let i = 0; i < sis.n; i++) {
        if (sis.vida[i] <= 0) continue;
        sis.vida[i] -= dt;
        if (sis.vida[i] <= 0) {
            sis.pos[i * 3 + 1] = -9999;
            continue;
        }
        sis.vel[i * 3 + 1] -= (sis.grav ? 6 : 0.6) * dt;
        if (sis.grav) {
            sis.vel[i * 3] *= 0.985;
            sis.vel[i * 3 + 2] *= 0.985;
        }
        sis.pos[i * 3] += sis.vel[i * 3] * dt;
        sis.pos[i * 3 + 1] += sis.vel[i * 3 + 1] * dt;
        sis.pos[i * 3 + 2] += sis.vel[i * 3 + 2] * dt;
        const f = Math.min(1, sis.vida[i] / sis.vidaMax[i] * 1.6);
        sis.col[i * 3] = sis.base[i * 3] * f;
        sis.col[i * 3 + 1] = sis.base[i * 3 + 1] * f;
        sis.col[i * 3 + 2] = sis.base[i * 3 + 2] * f;
    }
    sis.geo.attributes.position.needsUpdate = true;
    sis.geo.attributes.color.needsUpdate = true;
}

// ------------------------------------------------------------------ fondo: el espacio

const asteroides = [];
let fondoG = null;

function crearFondo() {
    fondoG = new THREE.Group();
    scene.add(fondoG);
    const cielo = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.MeshBasicMaterial({ map: TX.cielo, side: THREE.BackSide, fog: false, depthWrite: false }));
    fondoG.add(cielo);
    // estrellas
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const r = 160 + Math.random() * 120;
        const s = Math.sqrt(1 - u * u);
        pos[i * 3] = Math.cos(a) * s * r;
        pos[i * 3 + 1] = u * r * 0.8 + 20;
        pos[i * 3 + 2] = Math.sin(a) * s * r;
        const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.35, 0.6, 0.75 + Math.random() * 0.25);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const estrellas = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, map: TX.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    fondoG.add(estrellas);
    // planetas
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 20), new THREE.MeshStandardMaterial({ map: TX.planeta1, roughness: 0.9, emissive: 0x3a1a00, emissiveIntensity: 0.3, fog: false }));
    p1.position.set(-90, 35, -170);
    fondoG.add(p1);
    const aro = new THREE.Mesh(new THREE.RingGeometry(21, 30, 48), new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false }));
    aro.position.copy(p1.position);
    aro.rotation.set(-1.2, 0.3, 0.2);
    fondoG.add(aro);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(9, 28, 18), new THREE.MeshStandardMaterial({ map: TX.planeta2, roughness: 0.8, emissive: 0x002a3a, emissiveIntensity: 0.35, fog: false }));
    p2.position.set(120, 55, -140);
    fondoG.add(p2);
    // asteroides que flotan lento alrededor de la pista
    const geoRoca = new THREE.IcosahedronGeometry(1, 0);
    const matRoca = new THREE.MeshStandardMaterial({ color: 0x5b5280, roughness: 0.95, flatShading: true });
    for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(geoRoca, matRoca);
        const a = (i / 12) * Math.PI * 2;
        const r = 30 + Math.random() * 25;
        m.position.set(Math.cos(a) * r, -6 + Math.random() * 16, Math.sin(a) * r * 0.7 - 12);
        if (m.position.y > -10 && cercaDePista(m.position)) m.position.y -= 20;
        m.scale.set(0.8 + Math.random() * 2, 0.7 + Math.random() * 1.6, 0.8 + Math.random() * 2);
        m.userData.giro = new THREE.Vector3(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.2);
        m.userData.y0 = m.position.y;
        m.userData.fase = Math.random() * 6;
        fondoG.add(m);
        asteroides.push(m);
    }
    llenarEspacio();
}

const cometas = [];

/** Los recorridos al azar caen en x ≈ 0…86, z ≈ -60…64, altura 0…6: ahí la decoración se queda muy por debajo. */
function cercaDePista(p) { return p.x > -25 && p.x < 105 && Math.abs(p.z) < 75; }

function animable(m, giro, flota) {
    m.userData.giro = giro || new THREE.Vector3(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.2);
    m.userData.y0 = m.position.y;
    m.userData.fase = Math.random() * 6;
    m.userData.flota = flota == null ? 0.8 : flota;
    asteroides.push(m);
}

/**
 * Decorado del vacío: la cámara mira hacia abajo, así que lo que más se ve es el espacio debajo y alrededor de la pista.
 * Todo queda lejos de la pista (no la tapa) y repartido por la zona donde se generan los recorridos (x ≈ -30…100,
 * z ≈ -50…40). Geometrías compartidas para no multiplicar recursos.
 */
function llenarEspacio() {
    const rnd = Math.random;
    const zona = function (yMin, yMax) {
        return new THREE.Vector3(-35 + rnd() * 140, yMin + rnd() * (yMax - yMin), -55 + rnd() * 100);
    };
    // nubes de nebulosa (manchas de color suaves bajo la pista)
    const TX_NUBE = lienzo(256, 256, function (g, w) {
        for (let i = 0; i < 7; i++) {
            const x = w * (0.3 + rnd() * 0.4), y = w * (0.3 + rnd() * 0.4), r = w * (0.18 + rnd() * 0.22);
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, "rgba(255,255,255,0.55)");
            gr.addColorStop(1, "rgba(255,255,255,0)");
            g.fillStyle = gr;
            g.fillRect(0, 0, w, w);
        }
    });
    const coloresNube = [0xec4899, 0x8b5cf6, 0x22d3ee, 0x6366f1, 0xf472b6, 0x38bdf8];
    for (let i = 0; i < 9; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX_NUBE, color: coloresNube[i % coloresNube.length], transparent: true, opacity: 0.14 + rnd() * 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        m.position.copy(zona(-70, -25));
        m.scale.setScalar(35 + rnd() * 45);
        m.material.rotation = rnd() * 6;
        fondoG.add(m);
    }
    // polvo de estrellas cercano (da profundidad al moverse la cámara)
    const n = 450;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const p = zona(-45, 12);
        if (p.y > -8 && cercaDePista(p)) p.y -= 14;   // fuera del camino de la pista
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        const c = new THREE.Color().setHSL(0.5 + rnd() * 0.45, 0.8, 0.7 + rnd() * 0.3);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    gp.setAttribute("color", new THREE.BufferAttribute(col, 3));
    fondoG.add(new THREE.Points(gp, new THREE.PointsMaterial({ size: 0.55, map: TX.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

    // planetas grandes debajo y a los lados
    // solo dos, muy lejos (a más de 250 unidades): se ven pequeños en el fondo, no encima de la pista
    const planetas = [
        [TX.planeta2, 30, -120, -175, -160, 0x002a3a, true],
        [TX.planeta1, 16, 230, -140, -130, 0x3a1a00, false]
    ];
    planetas.forEach(function (d) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(d[1], 32, 20), new THREE.MeshStandardMaterial({ map: d[0], roughness: 0.85, emissive: d[5], emissiveIntensity: 0.45, fog: false }));
        m.position.set(d[2], d[3], d[4]);
        fondoG.add(m);
        animable(m, new THREE.Vector3(0, 0.03, 0), 0);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: 0x9f7aea, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        halo.position.copy(m.position);
        halo.scale.setScalar(d[1] * 2.8);
        fondoG.add(halo);
        if (d[6]) {
            const aroP = new THREE.Mesh(new THREE.RingGeometry(d[1] * 1.3, d[1] * 1.9, 64), new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.4, side: THREE.DoubleSide, fog: false }));
            aroP.position.copy(m.position);
            aroP.rotation.set(-1.25 + rnd() * 0.3, rnd() * 0.5, rnd() * 0.4);
            fondoG.add(aroP);
        }
    });

    // más asteroides, de varios tamaños, arriba y abajo de la pista
    const geoRoca2 = new THREE.DodecahedronGeometry(1, 0);
    const geoRoca3 = new THREE.IcosahedronGeometry(1, 0);
    const matRocas = [0x5b5280, 0x6d5d9e, 0x46407a].map(function (c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }); });
    for (let i = 0; i < 20; i++) {
        const m = new THREE.Mesh(i % 2 ? geoRoca2 : geoRoca3, matRocas[i % 3]);
        const p = zona(-40, 10);
        if (p.y > -10 && cercaDePista(p)) p.y -= 18;
        m.position.copy(p);
        const k = 0.5 + rnd() * (p.y < -20 ? 4 : 2);
        m.scale.set(k * (0.8 + rnd() * 0.5), k * (0.6 + rnd() * 0.5), k * (0.8 + rnd() * 0.5));
        m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
        fondoG.add(m);
        animable(m, null, 0.4 + rnd());
    }

    // islas flotantes de roca con cristales que brillan
    const geoCristal = new THREE.OctahedronGeometry(1, 0);
    const coloresCristal = [0x67e8f9, 0xf0abfc, 0xa78bfa, 0xfde047];
    const matsCristal = coloresCristal.map(function (c) { return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }); });
    const geoIsla = new THREE.ConeGeometry(1, 1.6, 7, 1);
    geoIsla.rotateX(Math.PI);
    const matIsla = new THREE.MeshStandardMaterial({ color: 0x4c3d8f, roughness: 0.9, flatShading: true });
    const matCesped = new THREE.MeshStandardMaterial({ color: 0x8b7cf0, roughness: 0.6, emissive: 0x2a1a6e, emissiveIntensity: 0.4 });
    for (let i = 0; i < 6; i++) {
        const isla = new THREE.Group();
        const r = 1.5 + rnd() * 3;
        const roca = new THREE.Mesh(geoIsla, matIsla);
        roca.scale.set(r, r * (1 + rnd()), r);
        roca.position.y = -r * 0.8;
        isla.add(roca);
        const tapa = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.3, 7), matCesped);
        isla.add(tapa);
        const nc = 2 + Math.floor(rnd() * 4);
        for (let k = 0; k < nc; k++) {
            const c = new THREE.Mesh(geoCristal, matsCristal[(i + k) % matsCristal.length]);
            const a = rnd() * 6.28, d = rnd() * r * 0.6;
            const s = 0.3 + rnd() * 0.6;
            c.scale.set(s * 0.6, s * 1.8, s * 0.6);
            c.position.set(Math.cos(a) * d, s * 1.4, Math.sin(a) * d);
            c.rotation.z = (rnd() - 0.5) * 0.6;
            isla.add(c);
        }
        const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: coloresCristal[i % 4], transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        brillo.position.y = 1;
        brillo.scale.setScalar(r * 3);
        isla.add(brillo);
        const p = zona(-32, -9);
        if (p.y > -16 && cercaDePista(p)) p.y -= 10;
        isla.position.copy(p);
        isla.rotation.y = rnd() * 6;
        fondoG.add(isla);
        animable(isla, new THREE.Vector3(0, 0.05 + rnd() * 0.08, 0), 0.6);
    }

    // cristales sueltos que giran
    for (let i = 0; i < 8; i++) {
        const c = new THREE.Mesh(geoCristal, matsCristal[i % matsCristal.length]);
        const p = zona(-30, 8);
        if (p.y > -9 && cercaDePista(p)) p.y -= 16;
        c.position.copy(p);
        const s = 0.4 + rnd() * 0.9;
        c.scale.set(s * 0.6, s * 1.5, s * 0.6);
        fondoG.add(c);
        animable(c, new THREE.Vector3(0, 0.6 + rnd() * 0.8, 0), 1.2);
    }

    // estaciones espaciales lejanas con luces
    const matEst = new THREE.MeshStandardMaterial({ color: 0xc7d2fe, roughness: 0.4, metalness: 0.5, emissive: 0x312e81, emissiveIntensity: 0.4 });
    const matLuces = new THREE.MeshBasicMaterial({ color: 0x67f0ff });
    const matLucesRosa = new THREE.MeshBasicMaterial({ color: 0xff7ad9 });
    [[-40, -26, -55, 1.2], [110, -30, 40, 1.0]].forEach(function (d, i) {
        const est = new THREE.Group();
        const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 7, 12), matEst);
        est.add(eje);
        const aroE = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 10, 40), matEst);
        aroE.rotation.x = Math.PI / 2;
        est.add(aroE);
        const luz = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.12, 6, 40), i % 2 ? matLucesRosa : matLuces);
        luz.rotation.x = Math.PI / 2;
        luz.position.y = 0.36;
        est.add(luz);
        [-1, 1].forEach(function (s) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 1.6), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x1d4ed8, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 }));
            panel.position.set(s * 2.6, 3.2, 0);
            est.add(panel);
        });
        const faro = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: i % 2 ? 0xff7ad9 : 0x67f0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
        faro.position.y = 3.8;
        faro.scale.setScalar(3);
        est.add(faro);
        est.position.set(d[0], d[1], d[2]);
        est.scale.setScalar(d[3]);
        est.rotation.z = 0.3;
        fondoG.add(est);
        animable(est, new THREE.Vector3(0, 0.15, 0), 1);
    });

    // cometas que cruzan el cielo de vez en cuando
    for (let i = 0; i < 3; i++) {
        const cg = new THREE.Group();
        const cabeza = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        cabeza.scale.setScalar(2.2);
        cg.add(cabeza);
        for (let k = 1; k <= 8; k++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: k < 4 ? 0x9ff5ff : 0xc084fc, transparent: true, opacity: 0.6 - k * 0.06, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
            s.scale.setScalar(2 - k * 0.18);
            s.position.x = -k * 0.9;
            cg.add(s);
        }
        cg.visible = false;
        fondoG.add(cg);
        cometas.push({ g: cg, t: -(3 + i * 4 + rnd() * 4), dur: 5 + rnd() * 2, a: new THREE.Vector3(), b: new THREE.Vector3() });
    }
}

const dirCometa = new THREE.Vector3();

function moverCometas(dt) {
    cometas.forEach(function (c) {
        c.t += dt;
        if (c.t < 0) {
            c.g.visible = false;
            return;
        }
        if (c.t === dt || !c.g.visible) {
            // nuevo cruce, lejos y por debajo de la pista, siempre cerca de donde mira la cámara
            const f = cam.foco;
            c.a.set(f.x - 45 + Math.random() * 20, f.y - 12 - Math.random() * 25, f.z - 40 - Math.random() * 20);
            c.b.set(c.a.x + 70 + Math.random() * 30, c.a.y - 6 - Math.random() * 10, c.a.z + 25 + Math.random() * 20);
            c.g.visible = true;
            dirCometa.subVectors(c.b, c.a);
            c.g.rotation.set(0, Math.atan2(-dirCometa.z, dirCometa.x), Math.atan2(dirCometa.y, Math.hypot(dirCometa.x, dirCometa.z)));
        }
        const u = c.t / c.dur;
        c.g.position.lerpVectors(c.a, c.b, u);
        c.g.children.forEach(function (s) { s.material.opacity = Math.sin(Math.min(1, u) * Math.PI) * (s === c.g.children[0] ? 0.95 : 0.5); });
        if (u >= 1) {
            c.g.visible = false;
            c.t = -(6 + Math.random() * 8);
        }
    });
}

// ------------------------------------------------------------------ construcción de la pista

const GROSOR = 0.5;

function alturaRecto(pz, u) { return pz.h0 + (pz.h1 - pz.h0) * u / pz.L; }

function geoRecto(pz) {
    const hw = pz.w / 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, -hw);
    shape.lineTo(pz.L, -hw);
    shape.lineTo(pz.L, hw);
    shape.lineTo(0, hw);
    shape.closePath();
    pz.agujeros.forEach(function (a) {
        const path = new THREE.Path();
        path.absarc(a.u, a.v, a.r, 0, Math.PI * 2, true);
        shape.holes.push(path);
    });
    const g = new THREE.ExtrudeGeometry(shape, { depth: GROSOR, bevelEnabled: false, curveSegments: 32 });
    const d = RG.dirDe(pz.th), iz = RG.izqDe(pz.th);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getY(i), k = pos.getZ(i);
        pos.setXYZ(i, pz.ox + d.x * u + iz.x * v, alturaRecto(pz, u) - k, pz.oz + d.z * u + iz.z * v);
    }
    g.computeVertexNormals();
    return g;
}

/** Losa curva (o cualquier tira): parte de arriba (grupo 0) y costados, fondo y tapas (grupo 1). */
function geoTira(n, punto, w, largo) {
    const pos = [];
    const uv = [];
    const hw = w / 2;
    function v3(s, v, abajo) {
        const q = punto(s, v);
        return [q.x, q.h - (abajo ? GROSOR : 0), q.z];
    }
    function quad(a, b, c, d, ua, ub, uc, ud) {
        pos.push.apply(pos, a.concat(b, c, a, c, d));
        uv.push.apply(uv, ua.concat(ub, uc, ua, uc, ud));
    }
    const z0 = [0, 0];
    for (let i = 0; i < n; i++) {
        const s0 = i / n, s1 = (i + 1) / n;
        quad(v3(s0, -hw), v3(s1, -hw), v3(s1, hw), v3(s0, hw), [s0 * largo, -hw], [s1 * largo, -hw], [s1 * largo, hw], [s0 * largo, hw]);
    }
    const nTop = pos.length / 3;
    for (let i = 0; i < n; i++) {
        const s0 = i / n, s1 = (i + 1) / n;
        quad(v3(s0, -hw), v3(s1, -hw), v3(s1, -hw, true), v3(s0, -hw, true), z0, z0, z0, z0);
        quad(v3(s0, hw), v3(s1, hw), v3(s1, hw, true), v3(s0, hw, true), z0, z0, z0, z0);
        quad(v3(s0, -hw, true), v3(s1, -hw, true), v3(s1, hw, true), v3(s0, hw, true), z0, z0, z0, z0);
    }
    quad(v3(0, -hw), v3(0, hw), v3(0, hw, true), v3(0, -hw, true), z0, z0, z0, z0);
    quad(v3(1, -hw), v3(1, hw), v3(1, hw, true), v3(1, -hw, true), z0, z0, z0, z0);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.addGroup(0, nTop, 0);
    g.addGroup(nTop, pos.length / 3 - nTop, 1);
    g.computeVertexNormals();
    return g;
}

function puntoPieza(pz, s, v) {
    if (pz.tipo === "recto") {
        const d = RG.dirDe(pz.th), iz = RG.izqDe(pz.th);
        const u = s * pz.L;
        return { x: pz.ox + d.x * u + iz.x * v, z: pz.oz + d.z * u + iz.z * v, h: alturaRecto(pz, u) };
    }
    const q = RG.puntoCurva(pz, s, v);
    return { x: q.x, z: q.z, h: pz.h0 + (pz.h1 - pz.h0) * s };
}

/** Puntos de un borde (v fijo) a lo largo de la pieza, a la altura de la superficie. */
function borde(pz, v) {
    const n = pz.tipo === "curva" ? Math.max(6, Math.ceil(Math.abs(pz.alfa) * pz.R / 0.5)) : 1;
    const out = [];
    for (let i = 0; i <= n; i++) {
        const q = puntoPieza(pz, i / n, v);
        out.push(new THREE.Vector3(q.x, q.h, q.z));
    }
    return out;
}

/** Baranda: cinta de cristal vertical + tubo de neón arriba y línea de luz abajo (geometrías para fusionar). */
function baranda(puntos, alto, cristales, neones) {
    if (puntos.length < 2) return;
    const pos = [];
    for (let i = 0; i < puntos.length - 1; i++) {
        const a = puntos[i], b = puntos[i + 1];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, b.y + alto, b.z, a.x, a.y, a.z, b.x, b.y + alto, b.z, a.x, a.y + alto, a.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    cristales.push(g);
    const arriba = puntos.map(function (p) { return new THREE.Vector3(p.x, p.y + alto, p.z); });
    const abajo = puntos.map(function (p) { return new THREE.Vector3(p.x, p.y + 0.03, p.z); });
    const seg = Math.max(2, puntos.length * 2);
    const curva = puntos.length > 2 ? new THREE.CatmullRomCurve3(arriba) : new THREE.LineCurve3(arriba[0], arriba[1]);
    const curva2 = puntos.length > 2 ? new THREE.CatmullRomCurve3(abajo) : new THREE.LineCurve3(abajo[0], abajo[1]);
    neones.push(new THREE.TubeGeometry(curva, seg, 0.055, 6, false));
    neones.push(new THREE.TubeGeometry(curva2, seg, 0.035, 5, false));
}

function segmentoBorde(pz, s, v0, v1) {
    const a = puntoPieza(pz, s, v0), b = puntoPieza(pz, s, v1);
    return [new THREE.Vector3(a.x, a.h, a.z), new THREE.Vector3(b.x, b.h, b.z)];
}

function construirPieza(pz, i, piezas) {
    const g = new THREE.Group();
    let mesh;
    const cristales = [];
    const neones = [];
    const ALTO = 0.42;
    if (pz.tipo === "recto") {
        const geo = geoRecto(pz);
        const top = pz.puente ? MT.puente : (Math.abs(pz.h1 - pz.h0) > 0.01 ? MT.rampa : MT.top);
        mesh = new THREE.Mesh(geo, [top, MT.lado]);
        desechables.push(geo);
    } else if (pz.tipo === "curva") {
        const largo = Math.abs(pz.alfa) * pz.R;
        const n = Math.max(10, Math.ceil(largo / 0.35));
        const geo = geoTira(n, function (s, v) { return puntoPieza(pz, s, v); }, pz.w, largo);
        mesh = new THREE.Mesh(geo, [Math.abs(pz.h1 - pz.h0) > 0.01 ? MT.rampa : MT.top, MT.lado]);
        desechables.push(geo);
    } else {
        const geo = new THREE.CylinderGeometry(pz.r, pz.r * 0.82, GROSOR * 1.6, 64);
        mesh = new THREE.Mesh(geo, [MT.lado, MT.metaTop, MT.lado]);
        mesh.position.set(pz.cx, pz.h - GROSOR * 0.8, pz.cz);
        desechables.push(geo);
    }
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    g.add(mesh);

    const prev = piezas[i - 1];
    const sig = piezas[i + 1];
    if (pz.tipo !== "meta") {
        const hw = pz.w / 2;
        baranda(borde(pz, hw), ALTO, cristales, neones);
        baranda(borde(pz, -hw), ALTO, cristales, neones);
        if (i === 0 || pz.inicioCerrado) baranda(segmentoBorde(pz, 0, -hw, hw), ALTO, cristales, neones);
        if (pz.finCerrado) baranda(segmentoBorde(pz, 1, -hw, hw), ALTO, cristales, neones);
        // cambios de ancho entre piezas vecinas (sin salto entre ellas)
        if (sig && sig.tipo !== "meta" && !sig.inicioCerrado && sig.w < pz.w - 0.01) {
            baranda(segmentoBorde(pz, 1, sig.w / 2, hw), ALTO, cristales, neones);
            baranda(segmentoBorde(pz, 1, -hw, -sig.w / 2), ALTO, cristales, neones);
        }
        if (prev && prev.tipo !== "meta" && !pz.inicioCerrado && prev.w < pz.w - 0.01) {
            baranda(segmentoBorde(pz, 0, prev.w / 2, hw), ALTO, cristales, neones);
            baranda(segmentoBorde(pz, 0, -hw, -prev.w / 2), ALTO, cristales, neones);
        }
        // sin pilares: la pista flota sola en el espacio (pedido del usuario: se les veía el final)
    } else {
        // meta: anillo de baranda con la entrada abierta
        const ent = prev ? prev.w / 2 : 1.7;
        const d = RG.dirDe(prev ? (prev.tipo === "curva" ? prev.th0 + prev.alfa : prev.th) : 0);
        const a0 = Math.atan2(-d.z, -d.x);
        const gap = Math.asin(Math.min(0.95, (ent + 0.05) / pz.r));
        const pts = [];
        for (let k = 0; k <= 48; k++) {
            const a = a0 + gap + (Math.PI * 2 - 2 * gap) * k / 48;
            pts.push(new THREE.Vector3(pz.cx + Math.cos(a) * (pz.r - 0.02), pz.h, pz.cz + Math.sin(a) * (pz.r - 0.02)));
        }
        baranda(pts, ALTO, cristales, neones);
    }
    if (cristales.length) {
        const cg = mergeGeometries(cristales);
        const cm = new THREE.Mesh(cg, MT.cristal);
        cm.renderOrder = 2;
        g.add(cm);
        desechables.push(cg);
        cristales.forEach(function (x) { x.dispose(); });
    }
    if (neones.length) {
        const ng = mergeGeometries(neones);
        g.add(new THREE.Mesh(ng, MT.neon));
        desechables.push(ng);
        neones.forEach(function (x) { x.dispose(); });
    }
    return g;
}

function construirAgujero(A) {
    const g = new THREE.Group();
    g.position.set(A.x, A.h, A.z);
    const interior = new THREE.Mesh(new THREE.CylinderGeometry(A.r - 0.005, A.r * 0.7, 3.2, 40, 1, true), MT.hoyo);
    interior.position.y = -1.6;
    g.add(interior);
    const vortice = glowSprite(0x9b5cff, A.r * 1.6, 0.7);
    vortice.position.y = -1.4;
    g.add(vortice);
    const matRim = new THREE.MeshStandardMaterial({ color: 0xff8a50, emissive: 0xff5a2a, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.4 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(A.r + 0.02, 0.07, 8, 48), matRim);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.02;
    g.add(rim);
    const matAro = new THREE.MeshBasicMaterial({ map: TX.peligro, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const aro = new THREE.Mesh(new THREE.RingGeometry(A.r + 0.1, A.r + 0.42, 48), matAro);
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.015;
    g.add(aro);
    const matAviso = new THREE.SpriteMaterial({ map: TX.aviso, transparent: true, opacity: 0, depthWrite: false });
    const aviso = new THREE.Sprite(matAviso);
    aviso.scale.setScalar(0.85);
    aviso.position.y = 1.5;
    aviso.renderOrder = 5;
    g.add(aviso);
    desechables.push(interior.geometry, rim.geometry, aro.geometry, matRim, matAro, matAviso);
    agujerosG[A.id] = { g: g, rim: rim, matRim: matRim, matAro: matAro, aviso: aviso, matAviso: matAviso, vortice: vortice, alerta: 0, alertaObj: 0, A: A };
    return g;
}

function chevron() {
    const s = new THREE.Shape();
    s.moveTo(-0.35, -0.4); s.lineTo(0.05, 0); s.lineTo(-0.35, 0.4); s.lineTo(-0.1, 0.4); s.lineTo(0.3, 0); s.lineTo(-0.1, -0.4); s.closePath();
    return new THREE.ShapeGeometry(s);
}

function construirTrampolin(T) {
    const g = new THREE.Group();
    g.position.set(T.x, T.h, T.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.18, 0.1, 40), MT.metalOscuro);
    base.position.y = 0.05;
    g.add(base);
    const resorte = new THREE.Group();
    for (let k = 0; k < 3; k++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 6, 32), MT.oro);
        t.rotation.x = -Math.PI / 2;
        t.position.y = 0.04 + k * 0.045;
        resorte.add(t);
        desechables.push(t.geometry);
    }
    resorte.position.y = 0.08;
    g.add(resorte);
    const plato = new THREE.Group();
    const matPad = new THREE.MeshStandardMaterial({ color: 0xffd60a, emissive: 0xffb300, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.09, 44), matPad);
    plato.add(pad);
    const borde = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 44), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
    borde.rotation.x = -Math.PI / 2;
    borde.position.y = 0.045;
    plato.add(borde);
    const centro = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.55 }));
    centro.rotation.x = -Math.PI / 2;
    centro.position.y = 0.05;
    plato.add(centro);
    plato.position.y = 0.2;
    g.add(plato);
    const glow = glowSprite(0xffd43b, 3.4, 0.45);
    glow.position.y = 0.35;
    g.add(glow);
    // flechas flotantes hacia el aterrizaje
    const flechas = new THREE.Group();
    const geoCh = chevron();
    const matCh = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    for (let k = 0; k < 2; k++) {
        const m = new THREE.Mesh(geoCh, matCh);
        m.position.set(0.35 + k * 0.55, 1.25 + k * 0.4, 0);
        m.rotation.z = 0.45;
        flechas.add(m);
    }
    flechas.rotation.y = T.rumbo;
    g.add(flechas);
    desechables.push(base.geometry, pad.geometry, borde.geometry, borde.material, centro.geometry, centro.material, matPad, geoCh, matCh);
    trampolinesG[T.id] = { g: g, plato: plato, resorte: resorte, matPad: matPad, glow: glow, flechas: flechas, matCh: matCh, realce: 0, T: T };
    return g;
}

function construirMuro(M) {
    const g = new THREE.Group();
    const alto = M.hTop - M.hBase;
    g.position.set(M.x, M.hBase + alto / 2, M.z);
    g.rotation.y = M.th;
    const mat = new THREE.MeshBasicMaterial({ map: TX.muro.clone(), transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
    mat.map.needsUpdate = true;
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(1, alto / 2);
    const caja = new THREE.Mesh(new THREE.BoxGeometry(M.grosor, alto, M.ancho), mat);
    caja.renderOrder = 3;
    g.add(caja);
    const marco = [];
    [alto / 2, -alto / 2].forEach(function (y) {
        const b = new THREE.BoxGeometry(M.grosor + 0.14, 0.14, M.ancho + 0.14);
        b.translate(0, y, 0);
        marco.push(b);
    });
    [M.ancho / 2, -M.ancho / 2].forEach(function (z) {
        const b = new THREE.BoxGeometry(M.grosor + 0.14, alto, 0.14);
        b.translate(0, 0, z);
        marco.push(b);
    });
    const mg = mergeGeometries(marco);
    marco.forEach(function (x) { x.dispose(); });
    g.add(new THREE.Mesh(mg, MT.neonRosa));
    desechables.push(caja.geometry, mat, mat.map, mg);
    murosG.push({ g: g, mat: mat });
    return g;
}

function construirSeguro(S, i) {
    const mat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff7ad9 : 0x67e8f9, transparent: true, opacity: i === 0 ? 0.7 : 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.78, 6), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(S.x, S.h + 0.02, S.z);
    desechables.push(m.geometry, mat);
    segurosG.push({ m: m, mat: mat, activo: i === 0, pulso: 0 });
    return m;
}

function construirMeta(M) {
    const g = new THREE.Group();
    g.position.set(M.x, M.h, M.z);
    const pilares = [];
    for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        const c = new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8);
        c.translate(Math.cos(a) * (M.r - 0.35), 0.65, Math.sin(a) * (M.r - 0.35));
        pilares.push(c);
    }
    const pg = mergeGeometries(pilares);
    pilares.forEach(function (x) { x.dispose(); });
    const matLuz = new THREE.MeshBasicMaterial({ color: 0x67f0ff });
    g.add(new THREE.Mesh(pg, matLuz));
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(M.r * 0.55, 0.05, 6, 48), matLuz);
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = 0.03;
    g.add(anillo);
    const matHaz = new THREE.MeshBasicMaterial({ map: TX.rayo, color: 0x9ff5ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(M.r * 0.5, M.r * 0.75, 7, 32, 1, true), matHaz);
    haz.position.y = 3.5;
    haz.rotation.x = Math.PI;      // el degradado brilla abajo
    g.add(haz);
    // trofeo holográfico pequeño: dice "aquí es la meta" sin letras
    const holo = trofeo(0.55, true);
    holo.position.y = 2.2;
    g.add(holo);
    const glow = glowSprite(0xfff3a0, 2.6, 0.5);
    glow.position.y = 2.2;
    g.add(glow);
    // podio del final (escondido)
    const podio = new THREE.Group();
    [[M.r * 0.78, 0.45], [M.r * 0.58, 0.45], [M.r * 0.38, 0.45]].forEach(function (p, k) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(p[0], p[0] * 1.04, p[1], 48), [MT.lado, k === 2 ? MT.oro : MT.metaTop, MT.lado]);
        m.position.y = p[1] / 2 + k * p[1];
        m.receiveShadow = true;
        podio.add(m);
        desechables.push(m.geometry);
    });
    podio.scale.set(1, 0.001, 1);
    podio.visible = false;
    g.add(podio);
    desechables.push(pg, matLuz, anillo.geometry, haz.geometry, matHaz);
    metaG = { g: g, matLuz: matLuz, haz: haz, matHaz: matHaz, holo: holo, glow: glow, podio: podio, M: M, fiesta: 0, laseres: null, trofeo: null };
    return g;
}

/** Trofeo con geometría (copa por torno, asas, base); hueco = versión holográfica translúcida. */
function trofeo(escala, holo) {
    const g = new THREE.Group();
    const perfil = [[0, 0], [0.42, 0], [0.42, 0.08], [0.16, 0.14], [0.12, 0.5], [0.2, 0.6], [0.5, 0.75], [0.62, 1.25], [0.55, 1.28], [0.0, 1.0]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    const mat = holo
        ? new THREE.MeshBasicMaterial({ color: 0xffe57a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
        : MT.oro;
    const copa = new THREE.Mesh(new THREE.LatheGeometry(perfil, 32), mat);
    g.add(copa);
    [-1, 1].forEach(function (s) {
        const asa = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20, Math.PI * 1.2), mat);
        asa.position.set(s * 0.6, 0.98, 0);
        asa.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6;
        g.add(asa);
        desechables.push(asa.geometry);
    });
    const est = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    est.position.y = 1.5;
    g.add(est);
    desechables.push(copa.geometry, est.geometry, est.material);
    if (holo) desechables.push(mat);
    g.scale.setScalar(escala);
    return g;
}

function limpiarPista() {
    if (grupoPista) {
        scene.remove(grupoPista);
        grupoPista = null;
    }
    desechables.forEach(function (d) { try { d.dispose(); } catch (e) { /* noop */ } });
    desechables = [];
    piezasG.length = 0;
    segurosG.length = 0;
    murosG.length = 0;
    Object.keys(agujerosG).forEach(function (k) { delete agujerosG[k]; });
    Object.keys(trampolinesG).forEach(function (k) { delete trampolinesG[k]; });
    metaG = null;
}

// ------------------------------------------------------------------ la esfera

const R_ESF = () => (P ? P.opciones.radioEsfera : 0.45);

function crearEsfera() {
    esferaG = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: TX.esfera, roughness: 0.22, metalness: 0.15, emissive: 0xff4fc4, emissiveIntensity: 0.35 });
    esferaMesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 40, 28), mat);
    esferaMesh.castShadow = true;
    esferaG.add(esferaMesh);
    esferaGlow = glowSprite(0xff8ae2, 2.2, 0.55);
    desechables.splice(desechables.indexOf(esferaGlow.material), 1);   // la esfera no se desecha con la pista
    esferaG.add(esferaGlow);
    esferaLuz = new THREE.PointLight(0xff7ad9, 6, 6.5, 1.6);
    esferaLuz.position.y = 0.2;
    esferaG.add(esferaLuz);
    esferaG.visible = false;
    scene.add(esferaG);

    sombraBlob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TX.sombra, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    sombraBlob.rotation.x = -Math.PI / 2;
    sombraBlob.visible = false;
    sombraBlob.renderOrder = 1;
    scene.add(sombraBlob);

    marcaAterrizaje = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: TX.anillo, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    marcaAterrizaje.rotation.x = -Math.PI / 2;
    marcaAterrizaje.visible = false;
    scene.add(marcaAterrizaje);
    const mb = new THREE.SpriteMaterial({ map: TX.glow, color: 0xffe066, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    brilloDestino = new THREE.Sprite(mb);
    brilloDestino.scale.setScalar(3);
    brilloDestino.visible = false;
    scene.add(brilloDestino);

    marcaObjetivo = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 32), new THREE.MeshBasicMaterial({ color: 0x9ff5ff, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    marcaObjetivo.rotation.x = -Math.PI / 2;
    marcaObjetivo.visible = false;
    scene.add(marcaObjetivo);

    const matRayo = new THREE.MeshBasicMaterial({ map: TX.rayo, color: 0x9ff5ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.15, 16, 28, 1, true), matRayo);
    rayo.visible = false;
    scene.add(rayo);

    const mo = new THREE.SpriteMaterial({ map: TX.glow, color: 0xfff3a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    guiaOrbe = new THREE.Sprite(mo);
    guiaOrbe.scale.setScalar(0.9);
    guiaOrbe.visible = false;
    scene.add(guiaOrbe);

    for (let i = 0; i < 9; i++) {
        const m = new THREE.SpriteMaterial({ map: TX.glow, color: 0xff8ae2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const s = new THREE.Sprite(m);
        s.scale.setScalar(0.7 - i * 0.05);
        s.visible = false;
        scene.add(s);
        estela.push({ s: s, p: new THREE.Vector3() });
    }
}

const ejeTmp = new THREE.Vector3();
const qTmp = new THREE.Quaternion();

/** Coloca la esfera (y la hace rodar si se movió en el plano). */
function ponerEsfera(x, y, z, rodar) {
    const p = esferaG.position;
    if (rodar !== false) {
        const dx = x - p.x, dz = z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-5 && d < 3) {
            ejeTmp.set(dz / d, 0, -dx / d);
            qTmp.setFromAxisAngle(ejeTmp, d / R_ESF());
            esferaMesh.quaternion.premultiply(qTmp);
        }
    }
    p.set(x, y, z);
}

function actualizarSombra() {
    if (!P || !esferaG.visible) {
        sombraBlob.visible = false;
        return;
    }
    const p = esferaG.position;
    const s = RG.superficie(P, p.x, p.z, null);
    let suelo = s ? s.h : null;
    if (s && E && modo === "rueda") suelo = E.h;
    if (suelo == null || p.y - suelo < -0.2) {
        sombraBlob.visible = false;
        return;
    }
    const alto = Math.max(0, p.y - R_ESF() - suelo);
    sombraBlob.visible = true;
    sombraBlob.position.set(p.x, suelo + 0.025, p.z);
    const k = 1.25 + alto * 0.35;
    sombraBlob.scale.set(k, k, 1);
    sombraBlob.material.opacity = Math.max(0.15, 0.85 - alto * 0.18);
}

// ------------------------------------------------------------------ cámara

function aspecto() {
    return renderer ? renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight) : 16 / 9;
}

function distanciaJuego() {
    // en 4:3 (tableta) la cámara se aleja un poco para ver lo mismo a lo ancho
    const a = aspecto();
    return a < 1.5 ? 14.5 : 13;
}

function colocarCamara() {
    const d = cam.dist;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    camera.position.set(cam.foco.x + Math.sin(cam.ang) * d * cp, cam.foco.y + d * sp, cam.foco.z + Math.cos(cam.ang) * d * cp);
    camera.lookAt(cam.foco);
}

function actualizarCamara(dt) {
    if (cam.modo === "sigue" && esferaG.visible) {
        const p = esferaG.position;
        const ox = p.x - cam.focoObj.x, oz = p.z - cam.focoObj.z;
        const bx = 2.2, bz = 1.4;
        if (ox > bx) cam.focoObj.x = p.x - bx;
        if (ox < -bx) cam.focoObj.x = p.x + bx;
        if (oz > bz) cam.focoObj.z = p.z - bz;
        if (oz < -bz) cam.focoObj.z = p.z + bz;
        const y = (modo === "salta" || modo === "cae") ? cam.focoObj.y : (E ? E.h : p.y);
        cam.focoObj.y += (y - cam.focoObj.y) * Math.min(1, dt * 2);
        cam.distObj = distanciaJuego();
    }
    const k = 1 - Math.exp(-dt * (cam.modo === "sigue" ? 3.2 : 6));
    cam.foco.lerp(cam.focoObj, k);
    cam.dist += (cam.distObj - cam.dist) * k;
    cam.ang += (cam.angObj - cam.ang) * k;
    colocarCamara();
}

/** Lleva la cámara a mirar un punto (modo libre). */
function camaraA(x, y, z, dist, ms) {
    cam.modo = "libre";
    const f0 = cam.focoObj.clone();
    const d0 = cam.distObj;
    return animar(ms || 1000, function (t) {
        cam.focoObj.set(f0.x + (x - f0.x) * t, f0.y + (y - f0.y) * t, f0.z + (z - f0.z) * t);
        cam.distObj = d0 + (dist - d0) * t;
    });
}

function vistaGeneral(ms) {
    const b = RG.limites(P);
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const spanX = (b.x1 - b.x0) + 6, spanZ = (b.z1 - b.z0) + 6;
    const d = Math.max(spanX / (2 * tan * aspecto()), spanZ * 0.95 / (2 * tan)) * 1.05;
    return camaraA(cx, (b.h0 + b.h1) / 2, cz + 1, Math.max(14, d), ms);
}

function seguirEsfera(inmediato) {
    cam.modo = "sigue";
    cam.angObj = 0;
    if (inmediato && esferaG) {
        cam.focoObj.copy(esferaG.position);
        cam.foco.copy(cam.focoObj);
        cam.dist = cam.distObj = distanciaJuego();
        cam.ang = 0;
    }
}

// ------------------------------------------------------------------ física por cuadro

const tocado = new Set();

function fisica(dt) {
    const ev = RG.paso(P, E, bloqueado ? null : ctrl, dt);
    const r = R_ESF();
    ponerEsfera(E.x, E.h + r, E.z, true);
    const v = Math.hypot(E.vx, E.vz);
    const ahora = performance.now();
    if (v > 0.25 && ahora - ultMueveEv > 250) {
        ultMueveEv = ahora;
        emitir("mueve", v);
    }
    // alertas de los agujeros
    Object.keys(agujerosG).forEach(function (id) { agujerosG[id].alertaObj = 0; });
    if (ev.cerca && agujerosG[ev.cerca]) {
        const A = agujerosG[ev.cerca].A;
        const d = Math.hypot(E.x - A.x, E.z - A.z);
        agujerosG[ev.cerca].alertaObj = Math.max(0.35, 1 - (d - A.r) / (P.opciones.distanciaAlerta + 0.2));
        emitir("cerca", ev.cerca);
    }
    if (ev.pared) {
        if (ahora - ultParedEv > 450 && v > 0.2) {
            ultParedEv = ahora;
            emitir3d(chispas, E.x + E.vx * 0.1, E.h + 0.25, E.z + E.vz * 0.1, 0x9ff5ff, 6, 1.4, 0.4, 0.4);
        }
        emitir("pared", v);
    }
    if (ev.seguro) {
        const i = E.seguro;
        if (segurosG[i] && !segurosG[i].activo) {
            segurosG[i].activo = true;
            segurosG[i].pulso = 1;
            segurosG[i].mat.color.set(0x7cff9a);
            const S = P.seguros[i];
            emitir3d(chispas, S.x, S.h + 0.2, S.z, [0x7cff9a, 0x67e8f9, 0xffffff], 22, 2.2, 1.2, 0.8);
        }
        emitir("seguro", i);
    }
    if (ev.agujero) caer(ev.agujero);
    else if (ev.trampolin) saltar(ev.trampolin);
    else if (ev.meta) llegarMeta();
}

// ------------------------------------------------------------------ caída y rescate

async function caer(id) {
    const A = RG.agujero(P, id);
    if (!A || modo !== "rueda") return;
    modo = "cae";
    marcaObjetivo.visible = false;
    emitir("agujero", id);
    const r = R_ESF();
    const p0 = esferaG.position.clone();
    // 1. cae dentro del agujero, girando
    await animar(650, function (t) {
        const x = p0.x + (A.x - p0.x) * Math.min(1, t * 1.8);
        const z = p0.z + (A.z - p0.z) * Math.min(1, t * 1.8);
        ponerEsfera(x, A.h + r - t * t * 2.1, z, true);
        esferaMesh.scale.setScalar(1 - t * 0.35);
    }, lineal);
    emitir3d(chispas, A.x, A.h - 0.3, A.z, [0x9b5cff, 0xff7ad9], 18, 1.6, 1.4, 0.8);
    // 2. el rayo tractor baja del cielo
    rayo.position.set(A.x, A.h + 6, A.z);
    rayo.visible = true;
    emitir("rayo", id);
    await animar(380, function (t) { rayo.material.opacity = t * 0.8; rayo.scale.set(0.4 + t * 0.6, 1, 0.4 + t * 0.6); });
    // 3. la sube por el rayo
    const yFondo = esferaG.position.y;
    await animar(800, function (t) {
        ponerEsfera(A.x, yFondo + (A.h + 3.4 - yFondo) * t, A.z, false);
        esferaMesh.scale.setScalar(0.65 + t * 0.35);
        esferaMesh.rotation.y += 0.25;
        if (Math.random() < 0.5) emitir3d(chispas, A.x + (Math.random() - 0.5) * 0.8, esferaG.position.y, A.z + (Math.random() - 0.5) * 0.8, 0x9ff5ff, 1, 0.4, 1.5, 0.6);
    });
    // 4. vuela por el aire hasta el último punto seguro
    const S = P.seguros[E.seguro] || P.seguros[0];
    const x0 = A.x, z0 = A.z, y0 = A.h + 3.4;
    await animar(1000, function (t) {
        rayo.material.opacity = 0.8 * (1 - t);
        ponerEsfera(x0 + (S.x - x0) * t, y0 + (S.h + r - y0) * t + Math.sin(t * Math.PI) * 1.2, z0 + (S.z - z0) * t, false);
    });
    rayo.visible = false;
    squash = 1;
    emitir3d(chispas, S.x, S.h + 0.2, S.z, [0x9ff5ff, 0xffffff, 0xff8ae2], 24, 2.4, 1.0, 0.8);
    E.x = S.x; E.z = S.z; E.h = S.h; E.vx = 0; E.vz = 0;
    ponerEsfera(S.x, S.h + r, S.z, false);
    modo = "rueda";
    emitir("rescate", id);
}

// ------------------------------------------------------------------ salto del trampolín

async function saltar(id) {
    const T = RG.trampolin(P, id);
    const TG = trampolinesG[id];
    if (!T || !TG || modo !== "rueda") return;
    modo = "salta";
    marcaObjetivo.visible = false;
    emitir("salto", id);
    const r = R_ESF();
    const p0 = esferaG.position.clone();
    // 1. se centra y el trampolín se comprime y se ilumina
    TG.realce = 1.5;
    await animar(220, function (t) {
        ponerEsfera(p0.x + (T.x - p0.x) * t, T.h + r + 0.15 - t * 0.12, p0.z + (T.z - p0.z) * t, true);
        TG.plato.position.y = 0.2 - t * 0.12;
        TG.resorte.scale.y = 1 - t * 0.6;
        squash = -t * 0.6;
    }, salida);
    emitir3d(chispas, T.x, T.h + 0.3, T.z, [0xffd43b, 0xfff3a0, 0xffffff], 30, 2.6, 2.2, 0.9);
    // 2. el destino se ilumina y aparece la sombra de aterrizaje
    const D = T.destino;
    marcaAterrizaje.position.set(D.x, D.h + 0.03, D.z);
    marcaAterrizaje.visible = true;
    brilloDestino.position.set(D.x, D.h + 0.3, D.z);
    brilloDestino.visible = true;
    // 3. vuelo por la parábola fija (nunca sale del escenario)
    const ms = (P.opciones.duracionSalto || 1.2) * 1000;
    let ultimaChispa = 0;
    await animar(ms, function (t) {
        const q = RG.puntoSalto(T, t);
        ponerEsfera(q.x, q.h + r, q.z, false);
        // gira hacia adelante en el aire
        const d = RG.dirDe(T.rumbo);
        ejeTmp.set(d.z, 0, -d.x);
        qTmp.setFromAxisAngle(ejeTmp, 0.16);
        esferaMesh.quaternion.premultiply(qTmp);
        TG.plato.position.y = 0.08 + 0.12 * elastico(Math.min(1, t * 2.5));
        TG.resorte.scale.y = 0.4 + 0.6 * elastico(Math.min(1, t * 2.5));
        squash = t < 0.3 ? 0.5 * (1 - t / 0.3) : 0;
        const k = 0.6 + Math.sin(t * Math.PI * 6) * 0.3;
        marcaAterrizaje.scale.setScalar(1.25 - t * 0.35);
        marcaAterrizaje.material.opacity = 0.5 + t * 0.5;
        brilloDestino.material.opacity = k;
        if (t - ultimaChispa > 0.06) {
            ultimaChispa = t;
            emitir3d(chispas, q.x, q.h + r, q.z, [0xff8ae2, 0xffd43b], 2, 0.4, 0, 0.5);
        }
    }, lineal);
    marcaAterrizaje.visible = false;
    brilloDestino.visible = false;
    TG.plato.position.y = 0.2;
    TG.resorte.scale.y = 1;
    // 4. aterriza en el carril de destino y sigue con un poco de impulso
    squash = 1;
    emitir3d(chispas, D.x, D.h + 0.15, D.z, [0x9ff5ff, 0xffffff, 0xffd43b], 26, 2.8, 0.8, 0.7);
    const dd = RG.dirDe(T.rumbo);
    E.x = D.x; E.z = D.z; E.h = D.h; E.vx = dd.x * 1.2; E.vz = dd.z * 1.2;
    modo = "rueda";
    emitir("aterriza", id);
}

// ------------------------------------------------------------------ meta

let promesaMeta = null;

function llegarMeta() {
    if (modo !== "rueda" || !P.meta) return;
    modo = "meta";
    marcaObjetivo.visible = false;
    const M = P.meta;
    const r = R_ESF();
    const p0 = esferaG.position.clone();
    emitir("meta");
    promesaMeta = animar(1100, function (t) {
        ponerEsfera(p0.x + (M.x - p0.x) * t, M.h + r, p0.z + (M.z - p0.z) * t, true);
        if (metaG) metaG.fiesta = Math.max(metaG.fiesta, t);
    }, salida).then(function () {
        E.x = M.x; E.z = M.z; E.h = M.h; E.vx = 0; E.vz = 0;
        emitir3d(chispas, M.x, M.h + 0.4, M.z, [0x67f0ff, 0xffd43b, 0xff8ae2, 0xffffff], 50, 3.2, 2.0, 1.2);
    });
    return promesaMeta;
}

// ------------------------------------------------------------------ decorado vivo por cuadro

function actualizarDecor(dt) {
    asteroides.forEach(function (m) {
        m.rotation.x += m.userData.giro.x * dt;
        m.rotation.y += m.userData.giro.y * dt;
        m.position.y = m.userData.y0 + Math.sin(tiempo * 0.3 + m.userData.fase) * (m.userData.flota == null ? 0.8 : m.userData.flota);
    });
    moverCometas(dt);
    Object.keys(agujerosG).forEach(function (id) {
        const a = agujerosG[id];
        a.alerta += (a.alertaObj - a.alerta) * Math.min(1, dt * 6);
        const pulso = 0.5 + 0.5 * Math.sin(tiempo * (4 + a.alerta * 6));
        a.matRim.emissiveIntensity = 0.5 + a.alerta * (0.9 + pulso);
        a.matAro.opacity = 0.32 + a.alerta * 0.45;
        a.matAviso.opacity = Math.min(1, a.alerta * 1.6);
        a.aviso.position.y = 1.4 + Math.sin(tiempo * 5) * 0.08;
        a.vortice.material.rotation += dt * 1.5;
    });
    Object.keys(trampolinesG).forEach(function (id) {
        const T = trampolinesG[id];
        T.realce = Math.max(0, T.realce - dt * 0.8);
        const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3.2);
        T.matPad.emissiveIntensity = 0.45 + pulso * 0.35 + T.realce * 0.6;
        T.glow.material.opacity = 0.3 + pulso * 0.25 + T.realce * 0.3;
        T.glow.scale.setScalar(3 + pulso * 0.5 + T.realce);
        T.flechas.children.forEach(function (m, k) { m.position.y = 1.25 + k * 0.4 + Math.sin(tiempo * 3 + k) * 0.12; });
        T.matCh.opacity = 0.55 + pulso * 0.35;
        if (Math.random() < dt * (3 + T.realce * 20)) emitir3d(chispas, T.T.x + (Math.random() - 0.5) * 1.4, T.T.h + 0.3, T.T.z + (Math.random() - 0.5) * 1.4, 0xffd43b, 1, 0.2, 1.4, 1);
    });
    murosG.forEach(function (m) { m.mat.map.offset.y -= dt * 0.35; });
    segurosG.forEach(function (s) {
        if (s.pulso > 0) {
            s.pulso = Math.max(0, s.pulso - dt * 1.2);
            s.m.scale.setScalar(1 + s.pulso * 0.6);
        }
        s.mat.opacity = s.activo ? 0.75 + Math.sin(tiempo * 3) * 0.15 : 0.3 + Math.sin(tiempo * 2) * 0.08;
    });
    if (metaG) {
        metaG.holo.rotation.y += dt * 1.2;
        metaG.holo.position.y = 2.2 + Math.sin(tiempo * 2) * 0.15;
        metaG.fiesta = Math.max(0, metaG.fiesta - dt * 0.15);
        metaG.matHaz.opacity = 0.18 + Math.sin(tiempo * 2.5) * 0.05 + metaG.fiesta * 0.35;
        metaG.matLuz.color.setHSL(0.52 + metaG.fiesta * Math.sin(tiempo * 6) * 0.3, 1, 0.65);
        metaG.haz.rotation.y += dt * 0.4;
        if (metaG.laseres) {
            metaG.laseres.rotation.y += dt * 0.9;
            metaG.laseres.children.forEach(function (l, k) { if (l.userData.brazo) l.userData.brazo.rotation.z = 0.55 + Math.sin(tiempo * 2 + k) * 0.35; });
        }
        if (metaG.trofeo) metaG.trofeo.rotation.y += dt * 0.8;
    }
    // la esfera: brillo, aplastamiento y estela
    if (esferaG.visible) {
        squash += (0 - squash) * Math.min(1, dt * 7);
        esferaG.scale.set(1 + squash * 0.18, 1 - squash * 0.28, 1 + squash * 0.18);
        const v = E ? Math.hypot(E.vx, E.vz) : 0;
        brilloExtra = Math.max(0, brilloExtra - dt * 0.6);
        esferaMesh.material.emissiveIntensity = 0.3 + Math.min(0.4, v * 0.08) + brilloExtra;
        esferaGlow.material.opacity = 0.45 + Math.min(0.35, v * 0.07) + brilloExtra * 0.4 + Math.sin(tiempo * 4) * 0.05;
        esferaLuz.intensity = 5 + Math.min(4, v) + brilloExtra * 8;
        // estela (más larga cuanto más rápido)
        const rapido = modo === "salta" || v > 1.2;
        for (let i = estela.length - 1; i > 0; i--) estela[i].p.copy(estela[i - 1].p);
        estela[0].p.copy(esferaG.position);
        estela.forEach(function (e, i) {
            e.s.visible = rapido && i > 0;
            e.s.position.copy(e.p);
            e.s.material.opacity = rapido ? (0.35 - i * 0.035) * Math.min(1, (modo === "salta" ? 3 : v) / 3) : 0;
        });
    } else {
        estela.forEach(function (e) { e.s.visible = false; });
    }
    actualizarSombra();
}

// ------------------------------------------------------------------ bucle

function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    const dt = Math.min(0.05, Math.max(0, (ahora - ultimo) / 1000)) || 0.016;
    ultimo = ahora;
    tiempo += dt;
    correrTweens(ahora);
    if (P && E && modo === "rueda") fisica(dt);
    actualizarDecor(dt);
    correrParticulas(chispas, dt);
    correrParticulas(confeti, dt);
    actualizarCamara(dt);
    if (sol) {
        // la sombra nítida sigue a la cámara (mapa de sombras pequeño)
        sol.position.set(cam.foco.x + 8, cam.foco.y + 18, cam.foco.z + 9);
        sol.target.position.copy(cam.foco);
    }
    renderer.render(scene, camera);
}

let sol = null;

function reacomodar() {
    if (!renderer || !contenedor) return;
    const w = contenedor.clientWidth || window.innerWidth;
    const h = contenedor.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
}

function webgl() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

// ------------------------------------------------------------------ API

const proyTmp = new THREE.Vector3();
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cruce = new THREE.Vector3();

const api = {
    listo: function () { return listo; },

    montar: function (el, config) {
        contenedor = el;
        cfgJuego = (config && config.juego) || {};
        if (!el || !webgl() || !RG) return Promise.resolve(false);
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x1a0f4a, 0.016);
        camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 700);
        crearTexturas();
        crearMateriales();
        scene.add(new THREE.HemisphereLight(0xc7b8ff, 0x1b1040, 1.1));
        scene.add(new THREE.AmbientLight(0x6050a0, 0.35));
        sol = new THREE.DirectionalLight(0xfff1e0, 1.7);
        sol.castShadow = true;
        sol.shadow.mapSize.set(1024, 1024);
        sol.shadow.camera.left = -12;
        sol.shadow.camera.right = 12;
        sol.shadow.camera.top = 12;
        sol.shadow.camera.bottom = -12;
        sol.shadow.camera.near = 1;
        sol.shadow.camera.far = 50;
        sol.shadow.bias = -0.0006;
        scene.add(sol);
        scene.add(sol.target);
        const contra = new THREE.DirectionalLight(0x7dd3fc, 0.6);
        contra.position.set(-10, 6, -12);
        scene.add(contra);
        crearFondo();
        crearEsfera();
        chispas = crearParticulas(500, 0.32, false);
        confeti = crearParticulas(420, 0.42, true);
        scene.add(chispas.pts);
        scene.add(confeti.pts);
        reacomodar();
        if (typeof ResizeObserver === "function") new ResizeObserver(reacomodar).observe(el);
        window.addEventListener("resize", reacomodar);
        cam.focoObj.set(0, 0, 0);
        colocarCamara();
        ultimo = performance.now();
        requestAnimationFrame(cuadro);
        listo = true;
        return Promise.resolve(true);
    },

    on: function (h) {
        Object.keys(h || {}).forEach(function (k) { handlers[k] = h[k]; });
    },

    reacomodar: reacomodar,

    /** Construye una pista (P de ReglasGravedad). Con animar, las piezas suben del vacío una tras otra. */
    cargarPista: async function (pista, opts) {
        limpiarPista();
        promesaMeta = null;
        esferaG.scale.set(1, 1, 1);
        P = pista;
        E = RG.nuevoEstado(P);
        modo = "oculta";
        esferaG.visible = false;
        esferaMesh.scale.setScalar(1);
        ctrl = null;
        marcaObjetivo.visible = false;
        grupoPista = new THREE.Group();
        scene.add(grupoPista);
        P.piezas.forEach(function (pz, i) {
            const g = construirPieza(pz, i, P.piezas);
            piezasG.push(g);
            grupoPista.add(g);
        });
        const extras = new THREE.Group();
        grupoPista.add(extras);
        P.agujeros.forEach(function (A) { piezasG[P.piezas.findIndex(function (p) { return p.id === A.pieza; })].add(construirAgujero(A)); });
        P.postes.forEach(function (B) {
            const c = new THREE.Mesh(new THREE.CylinderGeometry(B.r, B.r * 1.1, 1.0, 20), MT.poste);
            c.position.set(B.x, B.h + 0.5, B.z);
            c.castShadow = true;
            const cap = glowSprite(0xe879f9, 1.4, 0.6);
            cap.position.set(B.x, B.h + 1.05, B.z);
            const pg = piezasG[P.piezas.findIndex(function (p) { return p.id === B.pieza; })];
            pg.add(c);
            pg.add(cap);
            desechables.push(c.geometry);
        });
        P.trampolines.forEach(function (T) { extras.add(construirTrampolin(T)); });
        P.muros.forEach(function (M) { extras.add(construirMuro(M)); });
        P.seguros.forEach(function (S, i) { extras.add(construirSeguro(S, i)); });
        if (P.meta) extras.add(construirMeta(P.meta));
        // cámara: vista de la salida
        cam.modo = "libre";
        cam.angObj = cam.ang = 0;
        const s = P.salida;
        // la esfera queda cerca del centro: Zoe (abajo a la izquierda) no la tapa
        cam.focoObj.set(s.x - 0.8, s.h, s.z - 0.6);
        cam.foco.copy(cam.focoObj);
        cam.dist = cam.distObj = distanciaJuego() + 2;
        if (opts && opts.animar && !reducido) {
            piezasG.forEach(function (g) { g.position.y = -14; g.visible = false; });
            extras.position.y = -14;
            await Promise.all(piezasG.map(function (g, i) {
                return esperar(i * 70).then(function () {
                    g.visible = true;
                    return animar(620, function (t) { g.position.y = -14 * (1 - t); }, rebote);
                });
            }));
            await animar(400, function (t) { extras.position.y = -14 * (1 - t); }, salida);
        }
        return true;
    },

    /** La esfera aparece en la salida con un destello. */
    aparecerEsfera: async function () {
        if (!P) return;
        const s = P.salida;
        const r = R_ESF();
        E = RG.nuevoEstado(P);
        esferaG.visible = true;
        esferaMesh.scale.setScalar(0.01);
        ponerEsfera(s.x, s.h + r + 3, s.z, false);
        emitir3d(chispas, s.x, s.h + 1, s.z, [0xff8ae2, 0xffffff, 0x67e8f9], 30, 2.4, 1.0, 0.9);
        await animar(700, function (t) {
            esferaMesh.scale.setScalar(Math.max(0.01, t));
            ponerEsfera(s.x, s.h + r + 3 * (1 - t), s.z, false);
        }, rebote);
        squash = 1;
        brilloExtra = 0.6;
        modo = "rueda";
        seguirEsfera(false);
    },

    /** Presentación: vista de todo el laberinto y la cámara visita agujeros, trampolines y meta. */
    recorrido: async function (cb) {
        if (!P) return;
        cb = cb || function () {};
        await vistaGeneral(1500);
        await esperar(1300);
        for (const A of P.agujeros) {
            await camaraA(A.x, A.h, A.z, 9, 1000);
            if (agujerosG[A.id]) {
                agujerosG[A.id].alertaObj = 1;
                cb("agujero", A.id);
                await esperar(900);
                agujerosG[A.id].alertaObj = 0;
            }
        }
        for (const T of P.trampolines) {
            await camaraA(T.x + 1, T.h, T.z, 9.5, 1000);
            cb("trampolin", T.id);
            await api.botarTrampolin(T.id);
        }
        if (P.meta) {
            await camaraA(P.meta.x, P.meta.h, P.meta.z, 10, 1000);
            metaG.fiesta = 1;
            cb("meta");
            await esperar(900);
        }
        const p = esferaG.position;
        await camaraA(p.x, E ? E.h : p.y, p.z, distanciaJuego(), 1000);
        seguirEsfera(false);
    },

    botarTrampolin: async function (id) {
        const TG = trampolinesG[id];
        if (!TG) return;
        TG.realce = 1.5;
        emitir3d(chispas, TG.T.x, TG.T.h + 0.3, TG.T.z, [0xffd43b, 0xffffff], 18, 2, 2, 0.8);
        await animar(500, function (t) {
            TG.plato.position.y = 0.2 - Math.sin(t * Math.PI) * 0.1;
            TG.resorte.scale.y = 1 - Math.sin(t * Math.PI) * 0.5;
        });
    },

    /** Velo de transición entre pistas (DOM sobre el lienzo). */
    transicion: async function (ms) {
        let velo = contenedor.querySelector(".escenario-velo");
        if (!velo) {
            velo = document.createElement("div");
            velo.className = "escenario-velo";
            contenedor.appendChild(velo);
        }
        velo.style.transition = "opacity " + Math.round((ms || 900) / 2) + "ms ease";
        void velo.offsetWidth;
        velo.style.opacity = "1";
        await esperar((ms || 900) / 2);
        return function () { velo.style.opacity = "0"; };
    },

    quitarVelo: function () {
        const velo = contenedor && contenedor.querySelector(".escenario-velo");
        if (velo) velo.style.opacity = "0";
    },

    bloquear: function (on) {
        bloqueado = !!on;
        if (bloqueado) marcaObjetivo.visible = false;
    },

    /** Control actual: { modo: "punto", x, z } (dedo o demo), { modo: "dir", dx, dz } (teclado) o null. */
    control: function (c) {
        ctrl = c || null;
        if (ctrl && ctrl.modo === "punto" && modo === "rueda" && !bloqueado && !ctrl.oculto) {
            const s = RG.superficie(P, ctrl.x, ctrl.z, null);
            marcaObjetivo.visible = true;
            marcaObjetivo.position.set(ctrl.x, (s ? s.h : E.h) + 0.03, ctrl.z);
        } else {
            marcaObjetivo.visible = false;
        }
    },

    esfera: function () {
        return E ? { x: E.x, z: E.z, h: E.h, vx: E.vx, vz: E.vz, v: Math.hypot(E.vx, E.vz), modo: modo, seguro: E.seguro } : null;
    },

    pista: function () { return P; },
    modo: function () { return modo; },
    esperarMeta: function () { return promesaMeta || Promise.resolve(); },

    /** Punto del mundo (en el plano de la esfera) bajo un punto de la pantalla (px de la ventana). */
    mundoDesdePantalla: function (px, py) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        plano.constant = -(E ? E.h : 0);
        if (!ray.ray.intersectPlane(plano, cruce)) return null;
        return { x: cruce.x, z: cruce.z };
    },

    pantallaDe: function (x, y, z) {
        proyTmp.set(x, y, z).project(camera);
        const r = renderer.domElement.getBoundingClientRect();
        return { x: r.left + (proyTmp.x + 1) / 2 * r.width, y: r.top + (1 - proyTmp.y) / 2 * r.height };
    },

    pantallaEsfera: function () {
        const p = esferaG.position;
        return api.pantallaDe(p.x, p.y, p.z);
    },

    /** Ayuda de orientación: un orbe de luz recorre el siguiente tramo del camino (sin flechas permanentes). */
    destellosCamino: async function (largo) {
        if (!P || !E) return;
        const pr = RG.progresoEn(P, E.x, E.z);
        const pts = [];
        const R = P.ruta;
        const fin = pr.s + (largo || 8);
        let prev = { x: E.x, z: E.z, h: E.h };
        pts.push(prev);
        for (let i = pr.i; i < R.length; i++) {
            if (R[i].tipo === "aterrizaje") break;
            if ((R[i].s || 0) > fin) break;
            pts.push(R[i]);
        }
        if (pts.length < 2) return;
        guiaOrbe.visible = true;
        const lens = [0];
        for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
        const total = lens[lens.length - 1] || 1;
        let ult = 0;
        await animar(Math.min(2600, 600 + total * 220), function (t) {
            const d = t * total;
            let k = 1;
            while (k < lens.length - 1 && lens[k] < d) k++;
            const a = pts[k - 1], b = pts[k];
            const u = (d - lens[k - 1]) / Math.max(0.001, lens[k] - lens[k - 1]);
            const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, h = a.h + (b.h - a.h) * u;
            guiaOrbe.position.set(x, h + 0.45, z);
            guiaOrbe.material.opacity = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 0.9 + 0.1;
            if (t - ult > 0.04) {
                ult = t;
                emitir3d(chispas, x, h + 0.3, z, 0xfff3a0, 2, 0.3, 0.6, 1.1);
            }
        }, lineal);
        guiaOrbe.visible = false;
    },

    resaltarTrampolin: function (id) {
        const TG = trampolinesG[id];
        if (TG) TG.realce = 1.5;
    },

    /** La esfera destella (para mostrar dónde está). */
    resaltarEsfera: function () {
        brilloExtra = 1;
        const p = esferaG.position;
        emitir3d(chispas, p.x, p.y, p.z, [0xff8ae2, 0xffffff], 16, 1.8, 0.8, 0.7);
    },

    chispasEn: function (x, y, z, color, n) { emitir3d(chispas, x, y, z, color, n || 12, 2, 1, 0.8); },

    /**
     * Cinemática final: el podio sube, la esfera brilla y se abre, aparece el trofeo, se encienden los láseres, cae
     * confeti y la cámara gira alrededor. cb(fase) avisa: "podio", "brillo", "trofeo", "laser", "confeti".
     */
    finalCinematica: async function (cb) {
        cb = cb || function () {};
        if (!metaG || !P.meta) return;
        await (promesaMeta || Promise.resolve());
        const M = P.meta;
        const r = R_ESF();
        cam.modo = "libre";
        cam.focoObj.set(M.x, M.h + 1, M.z);
        cam.distObj = 10;
        // 1. la plataforma se transforma en podio
        metaG.podio.visible = true;
        cb("podio");
        const altoPodio = 1.35;
        await animar(1300, function (t) {
            metaG.podio.scale.y = Math.max(0.001, t);
            ponerEsfera(M.x, M.h + r + altoPodio * t, M.z, false);
            metaG.fiesta = 1;
        }, rebote);
        // 2. la esfera se ilumina
        cb("brillo");
        await animar(900, function (t) {
            brilloExtra = t * 1.4;
            esferaMesh.scale.setScalar(1 + Math.sin(t * Math.PI * 3) * 0.08 + t * 0.15);
        });
        // 3. se abre en dos mitades y aparece el trofeo
        const yE = M.h + r + altoPodio;
        const mitades = [];
        [0, Math.PI].forEach(function (rot, k) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 * 1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), esferaMesh.material);
            m.rotation.x = rot;
            m.position.set(M.x, yE, M.z);
            grupoPista.add(m);
            desechables.push(m.geometry);
            mitades.push({ m: m, k: k });
        });
        esferaG.visible = false;
        const tro = trofeo(0.9, false);
        tro.position.set(M.x, M.h + altoPodio, M.z);
        tro.scale.setScalar(0.01);
        tro.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
        grupoPista.add(tro);
        metaG.trofeo = tro;
        const glowT = glowSprite(0xffe066, 4, 0);
        glowT.position.set(M.x, M.h + altoPodio + 1, M.z);
        grupoPista.add(glowT);
        cb("trofeo");
        emitir3d(chispas, M.x, yE, M.z, [0xffd43b, 0xffffff, 0xff8ae2], 60, 4, 1.5, 1.2);
        await animar(1200, function (t) {
            mitades.forEach(function (h) {
                const s = h.k === 0 ? 1 : -1;
                h.m.position.y = yE + s * t * 1.6 + (h.k === 1 ? 0 : 0);
                h.m.position.x = M.x + s * t * 1.4;
                h.m.rotation.z = s * t * 1.2;
                h.m.scale.setScalar(Math.max(0.01, 1 - t));
            });
            tro.scale.setScalar(Math.max(0.01, 1.1 * rebote(t)));
            glowT.material.opacity = t * 0.7;
        });
        mitades.forEach(function (h) { h.m.visible = false; });
        // 4. luces láser de celebración
        const laseres = new THREE.Group();
        laseres.position.set(M.x, M.h + 0.2, M.z);
        const colores = [0xff4fd8, 0x22d3ee, 0xa3e635, 0xfacc15, 0x60a5fa, 0xf472b6];
        colores.forEach(function (c, k) {
            const pivote = new THREE.Group();
            pivote.rotation.y = k / colores.length * Math.PI * 2;
            const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
            const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 22, 6, 1, true), mat);
            haz.position.y = 11;
            const brazo = new THREE.Group();
            brazo.position.x = M.r - 0.35;
            brazo.add(haz);
            pivote.add(brazo);
            brazo.rotation.z = 0.6;
            laseres.add(pivote);
            desechables.push(haz.geometry, mat);
        });
        laseres.children.forEach(function (p) { p.userData.brazo = p.children[0]; });
        metaG.laseres = laseres;
        grupoPista.add(laseres);
        cb("laser");
        // 5. confeti y partículas
        cb("confeti");
        api.confeti();
        // 6. movimiento de cámara cinematográfico corto: gira alrededor del podio
        cam.focoObj.set(M.x, M.h + 1.6, M.z);
        cam.distObj = 8.5;
        const a0 = cam.angObj;
        animar(5200, function (t) { cam.angObj = a0 + t * 1.6; }, suave);
        await esperar(1600);
    },

    confeti: function () {
        if (!P || !P.meta) return;
        const M = P.meta;
        const c = [0xff4fd8, 0x22d3ee, 0xa3e635, 0xfacc15, 0x60a5fa, 0xffffff, 0xfb923c];
        emitir3d(confeti, M.x, M.h + 6, M.z, c, 120, 4.5, 2.5, 3.2);
        emitir3d(chispas, M.x, M.h + 2.5, M.z, c, 40, 5, 2, 1.2);
    },

    ocultarFinal: function () {
        cam.angObj = 0;
    },

    /** Zonas de la pantalla para Zoe (abajo a la izquierda) y Zeus (abajo a la derecha). */
    zonaZoe: function () {
        const W = window.innerWidth, H = window.innerHeight;
        const w = Math.min(260, W * 0.2);
        return { left: 12, top: H * 0.36, width: w, height: H * 0.55, bottom: H - 6 };
    },

    zonaZeus: function () {
        const W = window.innerWidth, H = window.innerHeight;
        const w = Math.min(260, W * 0.2);
        // a la izquierda de los botones de accesibilidad y volumen
        return { left: W - w - 160, top: H * 0.36, width: w, height: H * 0.55, bottom: H - 6 };
    }
};

window.EscenarioPista = api;
