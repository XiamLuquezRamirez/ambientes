/**
 * EscenarioTren — escena three.js de "El Tren de Colores y las Vías Mágicas" (window.EscenarioTren).
 *
 * Valle de juguete con los modelos low-poly de las experiencias (public/assets/modelos, el kit del mapa del mundo:
 * cordillera, colinas, árboles, arbustos, flores, rocas, nubes, vallas, farolas y animalitos), con sus mismos
 * materiales facetados. Cada GLB se carga una vez y los repetidos se dibujan con instancias. Las estaciones de
 * madera pintada y el tren de juguete (caldera, cabina, chimenea, ruedas con biela, faro, cara amigable y vagón con
 * bloques) son geometrías propias con material Lambert facetado, liviano para tabletas de 4 GB.
 *
 * Cada nivel es una ruta con 2, 3 o 4 estaciones a distancias al azar (ReglasTren.generarRuta); el último nivel
 * tiene curvas. El niño construye un hueco (tramo) cada vez y el tren viaja de verdad hasta la estación siguiente.
 *
 * El trazado: el dedo se proyecta con un rayo de la cámara al plano de la vía (Raycaster → intersectPlane), y
 * ReglasTren decide con ese punto del mundo. La vía azul (balasto, traviesas y dos rieles, en cintas que siguen el
 * tramo, recto o curvo) crece exactamente hasta el avance real; los puntos de luz se encienden, la punta es una
 * estrellita y fuera del carril todo titila en ámbar con un hilo que une la punta con el dedo.
 *
 * La escena dibuja y anima; reglas.js decide; script.js ordena el flujo. Un solo ciclo de render
 * (setAnimationLoop) más un respaldo por tiempo si el navegador deja de dar cuadros (pestaña oculta). Las
 * partículas, el vapor y el confeti salen de reservas fijas: no se crean objetos durante la partida. La
 * resolución de dibujo es moderada (≤ 1,5 en PC, ≤ 1,25 en tableta) y baja sola si faltan cuadros.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const R = () => window.ReglasTren;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const PLANO_Y = 0.2;          // altura de la cara superior de los rieles (plano de interacción)
const ELEVACION = 28;         // grados de la cámara sobre el suelo (se ven bien las curvas y el desnivel)
const FOV = 40;
const INCLINA = 0.17;         // la cámara mira un poco por encima de la vía: arriba quedan las montañas y el cielo
// franja del valle por donde pueden pasar las rutas al azar de los 4 niveles (el tren en la primera estación,
// huecos de 18 a 28, estaciones con sus edificios y el tope del final). Ahí no se ponen árboles ni rocas. La
// cámara no la muestra entera: encuadra un hueco por vez (zonaTramo).
const ZONA = { x0: -18.2, x1: 72, z0: -5.2, z1: 4.2, y1: 3.4 };
const ALEJA = 1.04;           // la cámara queda apenas más lejos de lo justo para el hueco actual
const MARGEN = { x: 0.98, arriba: 0.5, abajo: -0.93 };

const PALETAS = {
    rojo: { cuerpo: 0xff5a5f, techo: 0xffd43b, detalle: 0x2f6fed, rueda: 0xffd43b, carga: [0x4dabf7, 0xffd43b, 0x69db7c] },
    azul: { cuerpo: 0x3d8bff, techo: 0xff922b, detalle: 0xffd43b, rueda: 0xff6b6b, carga: [0xff6b6b, 0xffd43b, 0x69db7c] },
    verde: { cuerpo: 0x37c978, techo: 0xffd43b, detalle: 0xff6b6b, rueda: 0x4dabf7, carga: [0xff922b, 0x4dabf7, 0xff6b6b] },
    amarillo: { cuerpo: 0xffc83d, techo: 0x4dabf7, detalle: 0xff6b6b, rueda: 0xff6b6b, carga: [0x37c978, 0xff6b6b, 0x845ef7] },
    arcoiris: { cuerpo: 0xfff4e0, techo: 0x845ef7, detalle: 0xffd43b, rueda: 0xff6b6b, carga: [] }
};

const COL = {
    azulVia: new THREE.Color(0x2f7bff),
    turquesa: new THREE.Color(0x22d3ee),
    oro: new THREE.Color(0xffd43b),
    ambar: new THREE.Color(0xffa94d),
    pendiente: new THREE.Color(0xdff3ff),
    hecho: new THREE.Color(0x39d5ff),
    carril: new THREE.Color(0x9fdcff)
};
const FIESTA = [0x3d8bff, 0x22d3ee, 0xffd43b, 0xff922b, 0x37c978, 0xff6b6b, 0xffffff];

const E = {
    host: null,
    cfg: null,
    renderer: null,
    scene: null,
    camera: null,
    listo: false,
    oyentes: {},
    ultimoCuadro: 0,
    reloj: 0,
    nivel: 0,
    menosEfectos: false,
    trazo: null,
    est: null,
    sVis: 0,
    entradaOn: false,
    ptrId: null,
    demoPtr: false,
    dedo: null,
    velTrazo: 0,
    tAvance: 0,
    tTraviesa: 0,
    ayuda: 0,
    alerta: 0,              // destello ámbar (fuera del carril o toque equivocado)
    destelloInicio: 0,
    estrella: null,         // estrella guía { t, dur, s0, s1, resolver }
    tren: null,
    trenCine: null,
    viaje: null,
    cine: null,
    camBase: { pos: new THREE.Vector3(), mira: new THREE.Vector3() },
    camIntro: 0,
    pan: null,               // deslizamiento de la cámara entre estaciones
    fiesta: false,
    escalaPx: 400
};

// ------------------------------------------------------------------ utilidades

function emitir(nombre, datos) {
    (E.oyentes[nombre] || []).forEach(function (fn) {
        try { fn(datos); } catch (e) { console.warn("[EscenarioTren]", e); }
    });
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 200) : ms); });
}

function lerp(a, b, u) { return a + (b - a) * u; }
function clamp01(u) { return Math.max(0, Math.min(1, u)); }
function suave(u) { u = clamp01(u); return u * u * (3 - 2 * u); }
function suavisimo(u) { u = clamp01(u); return u * u * u * (u * (u * 6 - 15) + 10); }
function azar(a, b) { return a + Math.random() * (b - a); }

/** Pseudoazar con semilla: el paisaje sale igual en cada carga. */
let semilla = 7;
function rnd() {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
}
function rr(a, b) { return a + rnd() * (b - a); }

// ------------------------------------------------------------------ texturas (canvas)

function lienzo(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

const TX = {};

function texturaDe(c, repetir) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repetir) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
    }
    t.anisotropy = 4;
    return t;
}

function crearTexturas() {
    // cielo: azul claro arriba, crema cálido en el horizonte
    let c = lienzo(4, 512);
    let g = c.getContext("2d");
    let gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#58b8ff");
    gr.addColorStop(0.5, "#a9dcff");
    gr.addColorStop(0.8, "#d8f0ff");
    gr.addColorStop(1, "#fff3d6");
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    TX.cielo = texturaDe(c);

    // brillo suave para partículas y halos
    c = lienzo(64, 64);
    g = c.getContext("2d");
    gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(255,255,255,0.7)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    TX.brillo = new THREE.CanvasTexture(c);

    // estrellita de cinco puntas (chispas)
    c = lienzo(64, 64);
    g = c.getContext("2d");
    g.translate(32, 32);
    g.fillStyle = "#fff";
    g.shadowColor = "#fff";
    g.shadowBlur = 8;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 11 : 27;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    TX.estrella = new THREE.CanvasTexture(c);

    // tablas de madera del andén
    c = lienzo(256, 64);
    g = c.getContext("2d");
    const tonos = ["#e0a467", "#d59559", "#e8b07a", "#cf8d50"];
    for (let i = 0; i < 8; i++) {
        g.fillStyle = tonos[i % tonos.length];
        g.fillRect(i * 32, 0, 32, 64);
        g.fillStyle = "rgba(120,60,20,0.35)";
        g.fillRect(i * 32 + 30, 0, 2, 64);
    }
    TX.tablas = texturaDe(c, true);

    // carril: banda celeste con bordes de rayas
    c = lienzo(256, 128);
    g = c.getContext("2d");
    gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "rgba(120,200,255,0.0)");
    gr.addColorStop(0.12, "rgba(120,200,255,0.75)");
    gr.addColorStop(0.5, "rgba(190,232,255,0.55)");
    gr.addColorStop(0.88, "rgba(120,200,255,0.75)");
    gr.addColorStop(1, "rgba(120,200,255,0.0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "rgba(255,255,255,0.95)";
    for (let x = 0; x < 256; x += 64) {
        g.fillRect(x + 6, 14, 36, 7);
        g.fillRect(x + 6, 107, 36, 7);
    }
    TX.carril = texturaDe(c, true);

    // estela de luz de la vía construida
    c = lienzo(8, 64);
    g = c.getContext("2d");
    gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.5, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 8, 64);
    TX.estela = new THREE.CanvasTexture(c);

    // reloj de la estación
    c = lienzo(128, 128);
    g = c.getContext("2d");
    g.fillStyle = "#fffaf0";
    g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#2f6fed"; g.lineWidth = 8;
    g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#13234a";
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        g.beginPath(); g.arc(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44, i % 3 ? 3 : 5, 0, Math.PI * 2); g.fill();
    }
    g.lineCap = "round";
    g.lineWidth = 7; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke();
    g.fillStyle = "#ff6b6b"; g.beginPath(); g.arc(64, 64, 7, 0, Math.PI * 2); g.fill();
    TX.reloj = texturaDe(c);

    // letreros con íconos (los niños de 3-4 años aún no leen)
    TX.letreroInicio = letrero("#2f6fed", "#ffd43b", function (g2) { iconoTren(g2, "#fff"); });
    TX.letreroMeta = letrero("#37b24d", "#fff3bf", function (g2) { iconoEstrella(g2, "#ffd43b"); });

    // bandera a cuadros
    c = lienzo(64, 48);
    g = c.getContext("2d");
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 5; x++) {
            g.fillStyle = (x + y) % 2 ? "#13234a" : "#ffffff";
            g.fillRect(x * 13, y * 12, 13, 12);
        }
    }
    TX.cuadros = texturaDe(c);

    // agua del río (cinemática)
    c = lienzo(128, 128);
    g = c.getContext("2d");
    g.fillStyle = "#4dc3ff";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 4;
    g.lineCap = "round";
    for (let i = 0; i < 9; i++) {
        const x = (i * 37) % 128, y = (i * 53) % 128;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 6, x + 22, y); g.stroke();
    }
    TX.agua = texturaDe(c, true);
}

function letrero(fondo, borde, dibujar) {
    const c = lienzo(256, 128);
    const g = c.getContext("2d");
    g.fillStyle = borde;
    redondo(g, 0, 0, 256, 128, 34);
    g.fill();
    g.fillStyle = fondo;
    redondo(g, 12, 12, 232, 104, 26);
    g.fill();
    g.save();
    g.translate(128, 64);
    dibujar(g);
    g.restore();
    return texturaDe(c);
}

function redondo(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
}

function iconoTren(g, color) {
    g.fillStyle = color;
    redondo(g, -62, -26, 70, 42, 8); g.fill();          // caldera
    redondo(g, 4, -40, 44, 56, 8); g.fill();            // cabina
    g.fillRect(-52, -46, 14, 22);                       // chimenea
    g.fillStyle = "rgba(255,255,255,0.9)";
    [-44, -14, 26].forEach(function (x) { g.beginPath(); g.arc(x, 24, 12, 0, Math.PI * 2); g.fill(); });
}

function iconoEstrella(g, color) {
    g.fillStyle = color;
    g.strokeStyle = "#fff";
    g.lineWidth = 6;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 20 : 46;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.stroke();
}

// ------------------------------------------------------------------ materiales y piezas

const MAT = {};
/**
 * Material liviano (Lambert, como los del kit de las experiencias: color plano y facetado si se pide). Los
 * parámetros r/m (rugosidad/metal) de antes se ignoran; e = brillo propio.
 */
function mat(color, op) {
    const o = op || {};
    const k = color + "|" + (o.e || 0) + "|" + (o.flat ? 1 : 0);
    if (!MAT[k]) {
        MAT[k] = new THREE.MeshLambertMaterial({
            color: color,
            emissive: o.e ? color : 0x000000,
            emissiveIntensity: o.e || 0,
            flatShading: !!o.flat
        });
    }
    return MAT[k];
}

const GEO = {};
function caja(w, h, d) {
    const k = "b" + w + "_" + h + "_" + d;
    return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d));
}
// pocas caras (estilo low-poly de las experiencias y liviano para tabletas)
function cilindro(rt, rb, h, seg) {
    const n = Math.min(16, seg || 14);
    const k = "c" + rt + "_" + rb + "_" + h + "_" + n;
    return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(rt, rb, h, n));
}
function esfera(r, a, b) {
    const na = Math.min(14, a || 14), nb = Math.min(10, b || 10);
    const k = "s" + r + "_" + na + "_" + nb;
    return GEO[k] || (GEO[k] = new THREE.SphereGeometry(r, na, nb));
}

/** Caja con bordes redondeados (juguete): extrusión de un rectángulo redondeado con bisel. */
function cajaRedonda(w, h, d, radio) {
    const k = "r" + w + "_" + h + "_" + d + "_" + radio;
    if (GEO[k]) return GEO[k];
    const r = Math.min(radio, w / 2 - 0.01, h / 2 - 0.01);
    const b = Math.min(r * 0.6, d / 4);
    const s = new THREE.Shape();
    const x0 = -w / 2 + b, y0 = -h / 2 + b, x1 = w / 2 - b, y1 = h / 2 - b, rr2 = Math.max(0.01, r - b);
    s.moveTo(x0 + rr2, y0);
    s.lineTo(x1 - rr2, y0);
    s.quadraticCurveTo(x1, y0, x1, y0 + rr2);
    s.lineTo(x1, y1 - rr2);
    s.quadraticCurveTo(x1, y1, x1 - rr2, y1);
    s.lineTo(x0 + rr2, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - rr2);
    s.lineTo(x0, y0 + rr2);
    s.quadraticCurveTo(x0, y0, x0 + rr2, y0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * b), bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 4 });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    geo.computeVertexNormals();
    GEO[k] = geo;
    return geo;
}

function formaEstrella(rExt, rInt) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? rInt : rExt;
        const a = Math.PI / 2 + i * Math.PI / 5;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
}

function geoEstrella(rExt, prof) {
    const k = "e" + rExt + "_" + prof;
    if (GEO[k]) return GEO[k];
    const geo = new THREE.ExtrudeGeometry(formaEstrella(rExt, rExt * 0.48), { depth: prof, bevelEnabled: true, bevelSize: prof * 0.35, bevelThickness: prof * 0.35, bevelSegments: 2 });
    geo.translate(0, 0, -prof / 2);
    GEO[k] = geo;
    return geo;
}

/**
 * Funde las mallas quietas de un grupo en una por material (en el marco del grupo): una estación pasa de ~90
 * piezas a ~15, el tren de ~60 a ~20. `conservar` son las piezas que se animan solas (quedan aparte).
 */
const M5 = new THREE.Matrix4();
function fundirGrupo(g, conservar) {
    const keep = new Set((conservar || []).filter(Boolean));
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const porMat = new Map();
    const quitar = [];
    g.traverse(function (o) {
        if (o === g || !o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.children.length) return;
        for (let a = o; a && a !== g; a = a.parent) if (keep.has(a)) return;
        let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        Object.keys(geo.attributes).forEach(function (n) { if (n !== "position" && n !== "normal" && n !== "uv") geo.deleteAttribute(n); });
        if (!geo.attributes.normal) geo.computeVertexNormals();
        if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        geo.clearGroups();
        geo.applyMatrix4(M5.multiplyMatrices(inv, o.matrixWorld));
        const lista = porMat.get(o.material) || [];
        lista.push(geo);
        porMat.set(o.material, lista);
        quitar.push(o);
    });
    quitar.forEach(function (o) { o.parent.remove(o); });
    porMat.forEach(function (geos, m) {
        const u = mergeGeometries(geos, false);
        geos.forEach(function (x) { x.dispose(); });
        if (!u) return;
        const mesh = new THREE.Mesh(u, m);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        g.add(mesh);
    });
}

function malla(geo, material, x, y, z, padre, sombra) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    if (sombra !== false) {
        m.castShadow = true;
        m.receiveShadow = true;
    }
    if (padre) padre.add(m);
    return m;
}

// ------------------------------------------------------------------ partículas (reserva fija)

class Reserva {
    constructor(n, tex, aditivo) {
        this.n = n;
        this.libre = 0;
        this.pos = new Float32Array(n * 3);
        this.col = new Float32Array(n * 3);
        this.tam = new Float32Array(n);
        this.alfa = new Float32Array(n);
        this.v = new Float32Array(n * 3);
        this.vida = new Float32Array(n);
        this.edad = new Float32Array(n);
        this.t0 = new Float32Array(n);
        this.t1 = new Float32Array(n);
        this.grav = new Float32Array(n);
        this.freno = new Float32Array(n);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
        geo.setAttribute("tam", new THREE.BufferAttribute(this.tam, 1));
        geo.setAttribute("alfa", new THREE.BufferAttribute(this.alfa, 1));
        this.mat = new THREE.ShaderMaterial({
            uniforms: { mapa: { value: tex }, escala: { value: 400 } },
            vertexShader: "attribute float tam; attribute float alfa; attribute vec3 color; varying vec3 vC; varying float vA;" +
                "uniform float escala; void main(){ vC = color; vA = alfa; vec4 mv = modelViewMatrix * vec4(position,1.0);" +
                "gl_PointSize = tam * escala / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }",
            fragmentShader: "uniform sampler2D mapa; varying vec3 vC; varying float vA;" +
                "void main(){ vec4 t = texture2D(mapa, gl_PointCoord); if (t.a * vA < 0.01) discard; gl_FragColor = vec4(vC * t.rgb, t.a * vA); }",
            transparent: true,
            depthWrite: false,
            blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending
        });
        this.puntos = new THREE.Points(geo, this.mat);
        this.puntos.frustumCulled = false;
        this.puntos.renderOrder = 10;
    }
    emitir(o) {
        const i = this.libre;
        this.libre = (this.libre + 1) % this.n;
        this.pos[i * 3] = o.p.x; this.pos[i * 3 + 1] = o.p.y; this.pos[i * 3 + 2] = o.p.z;
        const v = o.v || [0, 0, 0];
        this.v[i * 3] = v[0]; this.v[i * 3 + 1] = v[1]; this.v[i * 3 + 2] = v[2];
        const c = o.color instanceof THREE.Color ? o.color : new THREE.Color(o.color == null ? 0xffffff : o.color);
        this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
        this.vida[i] = o.vida || 1;
        this.edad[i] = 0;
        this.t0[i] = o.tam || 0.3;
        this.t1[i] = o.tamFin == null ? 0 : o.tamFin;
        this.grav[i] = o.grav || 0;
        this.freno[i] = o.freno || 0;
        this.tam[i] = this.t0[i];
        this.alfa[i] = 1;
    }
    actualizar(dt) {
        for (let i = 0; i < this.n; i++) {
            if (this.vida[i] <= 0) continue;
            this.edad[i] += dt;
            const u = this.edad[i] / this.vida[i];
            if (u >= 1) { this.vida[i] = 0; this.alfa[i] = 0; continue; }
            const f = Math.max(0, 1 - this.freno[i] * dt);
            this.v[i * 3] *= f; this.v[i * 3 + 1] = this.v[i * 3 + 1] * f - this.grav[i] * dt; this.v[i * 3 + 2] *= f;
            this.pos[i * 3] += this.v[i * 3] * dt;
            this.pos[i * 3 + 1] += this.v[i * 3 + 1] * dt;
            this.pos[i * 3 + 2] += this.v[i * 3 + 2] * dt;
            this.tam[i] = lerp(this.t0[i], this.t1[i], u);
            this.alfa[i] = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
        }
        const g = this.puntos.geometry;
        g.attributes.position.needsUpdate = true;
        g.attributes.tam.needsUpdate = true;
        g.attributes.alfa.needsUpdate = true;
        g.attributes.color.needsUpdate = true;
    }
}

let CH = null;   // chispas (aditivo)
let ES = null;   // estrellas (aditivo)

/** Vapor en burbujas: esferas blancas que suben, crecen y se encogen al final. */
const VAPOR = { n: 46, malla: null, p: [], v: [], vida: [], edad: [], tam: [], libre: 0 };
/** Confeti de papel: planitos de colores que caen girando. */
const CONF = { n: 240, malla: null, p: [], v: [], rot: [], vr: [], vida: [], edad: [], libre: 0, activos: 0 };
const M4 = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const S1 = new THREE.Vector3();
const EU = new THREE.Euler();

function crearReservas(scene) {
    CH = new Reserva(700, TX.brillo, true);
    ES = new Reserva(260, TX.estrella, true);
    scene.add(CH.puntos, ES.puntos);

    VAPOR.malla = new THREE.InstancedMesh(esfera(1, 14, 10), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, emissive: 0xbfd8ff, emissiveIntensity: 0.18 }), VAPOR.n);
    VAPOR.malla.frustumCulled = false;
    for (let i = 0; i < VAPOR.n; i++) {
        VAPOR.p.push(new THREE.Vector3());
        VAPOR.v.push(new THREE.Vector3());
        VAPOR.vida.push(0); VAPOR.edad.push(0); VAPOR.tam.push(0.3);
        M4.makeScale(0, 0, 0);
        VAPOR.malla.setMatrixAt(i, M4);
    }
    scene.add(VAPOR.malla);

    CONF.malla = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF.n);
    CONF.malla.frustumCulled = false;
    const c = new THREE.Color();
    for (let i = 0; i < CONF.n; i++) {
        CONF.p.push(new THREE.Vector3());
        CONF.v.push(new THREE.Vector3());
        CONF.rot.push(new THREE.Vector3());
        CONF.vr.push(new THREE.Vector3());
        CONF.vida.push(0); CONF.edad.push(0);
        M4.makeScale(0, 0, 0);
        CONF.malla.setMatrixAt(i, M4);
        CONF.malla.setColorAt(i, c.set(FIESTA[i % FIESTA.length]));
    }
    scene.add(CONF.malla);
}

function vapor(p, fuerza) {
    const k = fuerza || 1;
    const n = E.menosEfectos ? 1 : (k > 1.4 ? 3 : 1);
    for (let j = 0; j < n; j++) {
        const i = VAPOR.libre;
        VAPOR.libre = (VAPOR.libre + 1) % VAPOR.n;
        VAPOR.p[i].copy(p).add(V1.set(azar(-0.06, 0.06), 0, azar(-0.06, 0.06)));
        VAPOR.v[i].set(azar(-0.25, 0.25) - 0.35 * (k > 1.4 ? 1 : 0), azar(1.1, 1.6) * Math.min(1.6, k), azar(-0.2, 0.2));
        VAPOR.vida[i] = azar(1.2, 1.8);
        VAPOR.edad[i] = 0;
        VAPOR.tam[i] = azar(0.13, 0.2) * (k > 1.4 ? 1.25 : 1);
    }
}

function actualizarVapor(dt) {
    for (let i = 0; i < VAPOR.n; i++) {
        if (VAPOR.vida[i] <= 0) continue;
        VAPOR.edad[i] += dt;
        const u = VAPOR.edad[i] / VAPOR.vida[i];
        if (u >= 1) {
            VAPOR.vida[i] = 0;
            M4.makeScale(0, 0, 0);
            VAPOR.malla.setMatrixAt(i, M4);
            continue;
        }
        VAPOR.v[i].multiplyScalar(1 - 0.9 * dt);
        VAPOR.p[i].addScaledVector(VAPOR.v[i], dt);
        const t = VAPOR.tam[i] * (1 + u * 2.2) * (u > 0.75 ? (1 - u) / 0.25 : 1) * (u < 0.1 ? u / 0.1 : 1);
        M4.compose(VAPOR.p[i], Q.identity(), S1.set(t, t, t));
        VAPOR.malla.setMatrixAt(i, M4);
    }
    VAPOR.malla.instanceMatrix.needsUpdate = true;
}

function confeti(centro, n, radio, alto) {
    const cant = Math.round((n || 60) * (E.menosEfectos ? 0.4 : 1));
    for (let j = 0; j < cant; j++) {
        const i = CONF.libre;
        CONF.libre = (CONF.libre + 1) % CONF.n;
        const a = Math.random() * Math.PI * 2;
        CONF.p[i].set(centro.x + Math.cos(a) * (radio || 1) * Math.random(), centro.y + (alto || 0), centro.z + Math.sin(a) * (radio || 1) * Math.random());
        CONF.v[i].set(Math.cos(a) * azar(0.5, 2.4), azar(3.5, 6.5), Math.sin(a) * azar(0.5, 2.4));
        CONF.rot[i].set(azar(0, 6), azar(0, 6), azar(0, 6));
        CONF.vr[i].set(azar(-9, 9), azar(-9, 9), azar(-9, 9));
        CONF.vida[i] = azar(2.4, 3.4);
        CONF.edad[i] = 0;
    }
}

function lluviaConfeti(centro, n, ancho) {
    const cant = Math.round((n || 40) * (E.menosEfectos ? 0.4 : 1));
    for (let j = 0; j < cant; j++) {
        const i = CONF.libre;
        CONF.libre = (CONF.libre + 1) % CONF.n;
        CONF.p[i].set(centro.x + azar(-ancho, ancho), centro.y + azar(0, 2), centro.z + azar(-ancho * 0.6, ancho * 0.6));
        CONF.v[i].set(azar(-0.6, 0.6), azar(-1, 0), azar(-0.6, 0.6));
        CONF.rot[i].set(azar(0, 6), azar(0, 6), azar(0, 6));
        CONF.vr[i].set(azar(-7, 7), azar(-7, 7), azar(-7, 7));
        CONF.vida[i] = azar(3, 4.2);
        CONF.edad[i] = 0;
    }
}

function actualizarConfeti(dt) {
    let vivos = 0;
    for (let i = 0; i < CONF.n; i++) {
        if (CONF.vida[i] <= 0) continue;
        CONF.edad[i] += dt;
        const u = CONF.edad[i] / CONF.vida[i];
        if (u >= 1) {
            CONF.vida[i] = 0;
            M4.makeScale(0, 0, 0);
            CONF.malla.setMatrixAt(i, M4);
            continue;
        }
        vivos++;
        const v = CONF.v[i];
        v.x *= 1 - 1.4 * dt; v.z *= 1 - 1.4 * dt;
        v.y = Math.max(-1.6, v.y - 7 * dt);
        CONF.p[i].addScaledVector(v, dt);
        CONF.rot[i].addScaledVector(CONF.vr[i], dt);
        Q.setFromEuler(EU.set(CONF.rot[i].x, CONF.rot[i].y, CONF.rot[i].z));
        const t = u > 0.85 ? (1 - u) / 0.15 : 1;
        M4.compose(CONF.p[i], Q, S1.set(t, t, t));
        CONF.malla.setMatrixAt(i, M4);
    }
    if (vivos || CONF.activos) CONF.malla.instanceMatrix.needsUpdate = true;
    CONF.activos = vivos;
}

function destellos(p, color, n, vel, tam) {
    const cant = Math.round((n || 14) * (E.menosEfectos ? 0.5 : 1));
    for (let i = 0; i < cant; i++) {
        const a = Math.random() * Math.PI * 2;
        const b = Math.random() * Math.PI;
        const v = (vel || 2.4) * azar(0.5, 1);
        ES.emitir({
            p: p,
            v: [Math.cos(a) * Math.sin(b) * v, Math.abs(Math.cos(b)) * v + 0.6, Math.sin(a) * Math.sin(b) * v],
            color: color == null ? FIESTA[i % FIESTA.length] : color,
            vida: azar(0.6, 1.1), tam: tam || 0.34, tamFin: 0.05, grav: 2.2, freno: 1.2
        });
    }
}

function fuegoArtificial(p) {
    const color = new THREE.Color(FIESTA[Math.floor(Math.random() * FIESTA.length)]);
    const n = E.menosEfectos ? 22 : 46;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(azar(-1, 1));
        const v = azar(4, 6.5);
        (i % 3 ? CH : ES).emitir({
            p: p,
            v: [Math.cos(a) * Math.sin(b) * v, Math.cos(b) * v, Math.sin(a) * Math.sin(b) * v],
            color: color, vida: azar(1, 1.6), tam: i % 3 ? 0.5 : 0.7, tamFin: 0.05, grav: 2.6, freno: 1.5
        });
    }
    emitir("cineEvento", "fuego");
}

/// ------------------------------------------------------------------ modelos de las experiencias (kit low-poly)
//
// Los mismos GLB que arman el mundo de las experiencias (public/assets/modelos, assets/js/mapa-mundo.js). Cada uno
// se carga una vez; sus piezas se funden por material y los repetidos (árboles, flores, vallas, nubes) se dibujan
// con InstancedMesh: una llamada de dibujo por material, no por árbol. Los materiales se pasan a Lambert facetado
// con su mismo color (el acabado de las experiencias, más liviano en tabletas). Los .glb no se tocan.

const URL_KIT = new URL("../../../assets/modelos/", import.meta.url);
const KIT = new Map();
const MAT_KIT = new Map();
const EJE_Y = new THREE.Vector3(0, 1, 0);

function materialKit(m) {
    if (MAT_KIT.has(m)) return MAT_KIT.get(m);
    const l = new THREE.MeshLambertMaterial({
        name: m.name,
        color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
        map: m.map || null,
        emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0),
        emissiveIntensity: m.emissiveIntensity == null ? 1 : m.emissiveIntensity,
        vertexColors: !!m.vertexColors,
        transparent: !!m.transparent,
        opacity: m.opacity == null ? 1 : m.opacity,
        side: m.side,
        flatShading: true
    });
    MAT_KIT.set(m, l);
    return l;
}

function cargarKit(ruta) {
    if (!KIT.has(ruta)) {
        KIT.set(ruta, crearCargadorGltf().loadAsync(new URL(ruta + ".glb", URL_KIT).href).then(function (gltf) {
            const root = gltf.scene;
            root.updateMatrixWorld(true);
            const porMat = new Map();
            root.traverse(function (o) {
                if (!o.isMesh || !o.geometry) return;
                o.material = materialKit(o.material);
                let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
                const conColor = !!o.material.vertexColors && !!g.attributes.color;
                Object.keys(g.attributes).forEach(function (n) {
                    if (n !== "position" && n !== "normal" && !(conColor && n === "color")) g.deleteAttribute(n);
                });
                if (!g.attributes.normal) g.computeVertexNormals();
                g.morphAttributes = {};
                g.applyMatrix4(o.matrixWorld);
                const lista = porMat.get(o.material) || [];
                lista.push(g);
                porMat.set(o.material, lista);
            });
            const partes = [];
            porMat.forEach(function (geos, m) {
                const unida = mergeGeometries(geos, false);
                geos.forEach(function (g) { g.dispose(); });
                if (unida) partes.push({ geo: unida, mat: m });
            });
            const caja = new THREE.Box3().setFromObject(root);
            return { root: root, partes: partes, animaciones: gltf.animations || [], alto: Math.max(0.01, caja.max.y - caja.min.y), piso: caja.min.y };
        }).catch(function (e) {
            console.warn("[EscenarioTren] no se pudo cargar el modelo " + ruta, e);
            return null;
        }));
    }
    return KIT.get(ruta);
}

/**
 * Coloca muchas copias quietas de un modelo del kit con instancias. lista: [[x, z, alto, giro, y], …].
 * Devuelve las mallas instanciadas (una por material).
 */
async function instanciarKit(padre, ruta, lista, opts) {
    const m = await cargarKit(ruta);
    if (!m || !lista.length) return [];
    const o = opts || {};
    return m.partes.map(function (p) {
        const im = new THREE.InstancedMesh(p.geo, p.mat, lista.length);
        lista.forEach(function (it, i) {
            const k = it[2] / m.alto;
            M4.compose(V1.set(it[0], (it[4] || 0) - m.piso * k, it[1]), Q.setFromAxisAngle(EJE_Y, it[3] || 0), S1.set(k, k, k));
            im.setMatrixAt(i, M4);
        });
        im.castShadow = !o.sinSombra;
        im.receiveShadow = !o.sinSombra;
        im.userData.kit = { m: m, lista: lista };
        padre.add(im);
        return im;
    });
}

/** Una copia suelta (animales: se animan con sus propios clips). */
async function colocarKit(padre, ruta, x, z, alto, giro) {
    const m = await cargarKit(ruta);
    if (!m) return null;
    const o = m.root.clone(true);
    const k = alto / m.alto;
    o.scale.setScalar(k);
    o.position.set(x, -m.piso * k, z);
    o.rotation.y = giro || 0;
    o.traverse(function (c) { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    padre.add(o);
    return { o: o, m: m };
}

const ARBOLES = ["02_vegetacion/ceiba", "02_vegetacion/mango", "02_vegetacion/canaguate", "02_vegetacion/palma_coco", "02_vegetacion/platanera"];
const ALTO_ARBOL = { "02_vegetacion/ceiba": 5.4, "02_vegetacion/mango": 4.6, "02_vegetacion/canaguate": 4.8, "02_vegetacion/palma_coco": 5.6, "02_vegetacion/platanera": 2.6 };
const FLORES = ["03_flores_y_suelo/margarita", "03_flores_y_suelo/tulipan", "03_flores_y_suelo/silvestre", "03_flores_y_suelo/campanula"];

/** ¿Se puede poner algo alto en (x, z)? Nada sobre la zona de juego, delante de la cámara ni en el pasillo del gran viaje. */
function libreAlto(x, z) {
    if (x > ZONA.x0 - 2 && x < ZONA.x1 + 2 && z > ZONA.z0 - 2.2 && z < ZONA.z1 + 1.5) return false;
    if (z > ZONA.z1 - 1 && x > ZONA.x0 - 14 && x < ZONA.x1 + 14) return false;   // nada alto delante de la cámara
    if (x > 11 && x < 200 && z > -6.5) return false;                  // pasillo y cámara de la cinemática
    if (x > 76) return false;                                          // más allá: el mundo del gran viaje (río, túnel) trae sus árboles
    return true;
}

// ------------------------------------------------------------------ paisaje fijo

function crearPaisaje(scene) {
    semilla = 11;
    // suelo de pradera (colores del pasto del kit) con una manta más clara bajo la zona de juego
    const suelo = malla(new THREE.CircleGeometry(170, 40), mat(0x85c841), 0, 0, 0, scene, false);
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    const manta = malla(new THREE.CircleGeometry(1, 48), mat(0x9fd653), 27, 0.005, -0.4, scene, false);
    manta.rotation.x = -Math.PI / 2;
    manta.scale.set(52, 8, 1);
    manta.receiveShadow = true;

    // estrellas doradas que flotan sobre el valle
    E.estrellasDeco = [];
    [[-12, 7.5, -12], [-4, 9.2, -17], [6.5, 8, -14], [14, 9.6, -19], [0.5, 10.8, -26]].forEach(function (p, i) {
        const m = malla(geoEstrella(0.6, 0.18), mat(0xffd43b, { e: 0.25 }), p[0], p[1], p[2], scene, false);
        m.userData.fase = i * 1.3;
        m.userData.y = p[1];
        E.estrellasDeco.push(m);
    });
    E.nubes = null;
    E.animales = [];
    return crearPaisajeKit(scene);
}

/** Relieve, árboles, flores, vallas, nubes y animalitos del kit (asíncrono: se cargan los GLB). */
function crearPaisajeKit(scene) {
    const tareas = [];
    // montañas y colinas al fondo
    tareas.push(instanciarKit(scene, "01_relieve/cordillera", [[0, -120, 22, 0], [95, -125, 24, 0.5]], { sinSombra: true }));
    tareas.push(instanciarKit(scene, "01_relieve/cerro_serrania", [[-70, -95, 16, 0.6], [52, -100, 15, 2.2], [150, -98, 16, 1.2]], { sinSombra: true }));
    tareas.push(instanciarKit(scene, "01_relieve/colinas", [[-20, -30, 3, 0.2], [19, -32, 3.4, 2.9], [0, -44, 4.2, 1.4], [-42, -20, 3, 0.8], [42, -30, 3.2, 2.4], [62, -40, 4, 0.9], [82, -28, 3.4, 2]], { sinSombra: true }));

    // árboles alrededor (detrás de la vía y a los lados, como una maqueta)
    const porModelo = {};
    ARBOLES.forEach(function (r) { porModelo[r] = []; });
    const puestos = [];
    let intentos = 0;
    while (puestos.length < 78 && intentos < 2500) {
        intentos++;
        const x = rr(-40, 76);
        const z = rr(-30, 12);
        if (!libreAlto(x, z)) continue;
        if (puestos.some(function (a) { return Math.hypot(a[0] - x, a[1] - z) < 3.2; })) continue;
        puestos.push([x, z]);
    }
    // marco cercano: a los lados y detrás de la zona de juego
    [[-21.5, -2.5], [-22.8, 1.8], [-20.6, -6.8], [19.6, -8.4], [-12, -9.6], [-4, -10.2], [4.6, -9.8], [11.5, -9.4], [-23.5, -9.5]].forEach(function (p) { puestos.push(p); });
    puestos.forEach(function (p) {
        const r = ARBOLES[Math.floor(rnd() * ARBOLES.length)];
        porModelo[r].push([p[0], p[1], ALTO_ARBOL[r] * rr(0.75, 1.1), rr(0, Math.PI * 2)]);
    });
    ARBOLES.forEach(function (r) { tareas.push(instanciarKit(scene, r, porModelo[r])); });

    // arbustos, rocas y troncos
    const arbustos = [];
    for (let i = 0; i < 50; i++) {
        const x = rr(-30, 74), z = rr(-14, 9);
        if (x > ZONA.x0 - 0.8 && x < ZONA.x1 + 0.8 && z > ZONA.z0 - 0.8 && z < ZONA.z1 + 0.3) continue;
        if (z > ZONA.z1 + 1.2 && x > ZONA.x0 - 4 && x < ZONA.x1 + 4) continue;
        arbustos.push([x, z, rr(0.8, 1.2), rr(0, 6)]);
    }
    tareas.push(instanciarKit(scene, "02_vegetacion/arbusto", arbustos));
    const rocas = [];
    for (let i = 0; i < 22; i++) {
        const x = rr(-28, 74), z = rr(-14, 8);
        if (x > ZONA.x0 - 0.6 && x < ZONA.x1 + 0.6 && z > ZONA.z0 - 0.6 && z < ZONA.z1 + 0.4) continue;
        rocas.push([x, z, rr(0.4, 0.9), rr(0, 6)]);
    }
    tareas.push(instanciarKit(scene, "06_rocas_y_cielo/roca", rocas));
    tareas.push(instanciarKit(scene, "03_flores_y_suelo/tronco_caido", [[-24, -4.5, 0.7, 0.4], [21.5, -11, 0.7, 2.1]]));

    // flores pequeñas: delante de la escena (no tapan nada) y detrás de la vía
    FLORES.forEach(function (r) {
        const lista = [];
        for (let i = 0; i < 44; i++) {
            const x = rr(-26, 74);
            const z = i % 2 ? rr(ZONA.z1 + 0.5, ZONA.z1 + 5) : rr(-12, ZONA.z0 - 0.5);
            lista.push([x, z, rr(0.38, 0.55), rr(0, 6)]);
        }
        tareas.push(instanciarKit(scene, r, lista, { sinSombra: true }));
    });
    tareas.push(instanciarKit(scene, "03_flores_y_suelo/girasol", [[-20.5, -7.6, 1.6, 0.2], [-19.2, -8.1, 1.4, 1], [17.8, -10.6, 1.5, 2], [6.2, -7.8, 1.3, 0.4]]));

    // valla de madera al fondo de la zona de juego (con huecos)
    const vallas = [];
    for (let x = -16.5; x < 72; x += 3.3) {
        if (rnd() < 0.22) continue;
        vallas.push([x + 1.65, ZONA.z0 - 1.1, 1, 0]);
    }
    tareas.push(instanciarKit(scene, "12_props/valla", vallas));

    // nubes que viajan despacio (instancias que se mueven)
    tareas.push(instanciarKit(scene, "06_rocas_y_cielo/nube", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function () {
        return [rr(-50, 115), rr(-44, -24), rr(2, 3.2), rr(0, 6), rr(10, 15)];
    }), { sinSombra: true }).then(function (mallas) {
        if (!mallas.length) return;
        const kit = mallas[0].userData.kit;
        mallas.forEach(function (im) { im.frustumCulled = false; });   // se mueven: su esfera de recorte no sirve
        E.nubes = { mallas: mallas, lista: kit.lista, vel: kit.lista.map(function () { return rr(0.25, 0.6); }), m: kit.m };
    }));

    // animalitos que pastan detrás de la vía (con sus propios clips). Solo los de pocas piezas: cada pieza animada
    // es una llamada de dibujo (la vaca y la gallina tienen 37 y 25)
    [["04_animales/oveja", -9, -8.6, 1.0, 0.5], ["04_animales/oveja", 8.6, -10.8, 0.9, 1.8],
        ["04_animales/pato", 1.5, -7.9, 0.55, 2.5], ["04_animales/conejo", -21.5, 0.6, 0.6, 1.2],
        ["04_animales/oveja", 31, -9.2, 1, 2.4], ["04_animales/pato", 47, -8, 0.55, 0.8], ["04_animales/conejo", 62, -8.4, 0.6, -0.6]].forEach(function (a) {
        tareas.push(colocarKit(scene, a[0], a[1], a[2], a[3], a[4]).then(function (r) {
            if (!r || !r.m.animaciones.length) return;
            const mixer = new THREE.AnimationMixer(r.o);
            const acc = {};
            r.m.animaciones.forEach(function (c) { acc[c.name] = mixer.clipAction(c); });
            const quieto = acc.reposo || acc[r.m.animaciones[0].name];
            if (quieto) quieto.play();
            E.animales.push({ mixer: mixer, acc: acc, t: rr(2, 6), pasta: false });
        }));
    });
    return Promise.all(tareas);
}

/** Nubes y animalitos (cada cuadro). */
function actualizarPaisaje(dt) {
    const n = E.nubes;
    if (n && n.mallas) {
        n.lista.forEach(function (it, i) {
            it[0] += n.vel[i] * dt;
            if (it[0] > 125) it[0] = -60;
            const k = it[2] / n.m.alto;
            M4.compose(V1.set(it[0], it[4] - n.m.piso * k, it[1]), Q.setFromAxisAngle(EJE_Y, it[3]), S1.set(k, k, k));
            n.mallas.forEach(function (im) { im.setMatrixAt(i, M4); });
        });
        n.mallas.forEach(function (im) { im.instanceMatrix.needsUpdate = true; });
    }
    if (!E.animales || !E.animales.length) return;
    if (E.menosEfectos) {
        // en la calidad más baja los animales se animan a medio ritmo
        E.animalesPar = !E.animalesPar;
        if (E.animalesPar) return;
        dt *= 2;
    }
    E.animales.forEach(function (a) {
        a.mixer.update(dt);
        a.t -= dt;
        if (a.t <= 0) {
            // alterna reposo y pastar (o picotear), como en el mapa de las experiencias
            a.t = rr(3, 7);
            a.pasta = !a.pasta;
            const pasto = a.acc.pastar || a.acc.picotear;
            const ir = a.pasta ? pasto : a.acc.reposo;
            const de = a.pasta ? a.acc.reposo : pasto;
            if (ir && de && ir !== de) {
                ir.reset().play();
                de.crossFadeTo(ir, 0.5, false);
            }
        }
    });
}

// ------------------------------------------------------------------ cintas que siguen un camino (recto o curvo)

/**
 * Cinta que sigue el trazo t entre s = a y s = b con la sección `perfil` ([[lateral, y], …], abierta). uv: u = s/rep,
 * v = 0..1 a lo ancho. Los triángulos van ordenados por s: revelar(c, s) la recorta con setDrawRange hasta s.
 */
function cinta(t, a, b, paso, perfil, rep) {
    const n = Math.max(1, Math.ceil((b - a) / paso));
    const np = perfil.length;
    const pos = new Float32Array((n + 1) * np * 3);
    const uv = new Float32Array((n + 1) * np * 2);
    for (let j = 0; j <= n; j++) {
        const s = a + (b - a) * j / n;
        const p = R().puntoExt(t, s);
        const d = R().direccion(t, s);
        for (let k = 0; k < np; k++) {
            const i = j * np + k;
            pos[i * 3] = p.x + d.nx * perfil[k][0];
            pos[i * 3 + 1] = perfil[k][1];
            pos[i * 3 + 2] = p.z + d.nz * perfil[k][0];
            uv[i * 2] = s / (rep || 1);
            uv[i * 2 + 1] = np > 1 ? k / (np - 1) : 0;
        }
    }
    const idx = [];
    for (let j = 0; j < n; j++) {
        for (let k = 0; k < np - 1; k++) {
            const i0 = j * np + k, i1 = i0 + np, i2 = i1 + 1, i3 = i0 + 1;
            idx.push(i0, i3, i1, i3, i2, i1);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return { geo: geo, n: n, a: a, paso: (b - a) / n, porSeg: (np - 1) * 6 };
}

function revelar(c, s) {
    const k = Math.max(0, Math.min(c.n, Math.floor((s - c.a) / c.paso + 1e-6)));
    c.geo.setDrawRange(0, k * c.porSeg);
}

const PERFIL_BALASTO = [[-0.68, 0.005], [-0.58, 0.08], [0.58, 0.08], [0.68, 0.005]];
function perfilRiel(lat) {
    return [[lat - 0.045, PLANO_Y - 0.07], [lat - 0.045, PLANO_Y], [lat + 0.045, PLANO_Y], [lat + 0.045, PLANO_Y - 0.07]];
}

/** Giro (cuaternión) para que el eje x local siga la dirección (ux, uz) del suelo. */
function giroDe(ux, uz, q) {
    return (q || new THREE.Quaternion()).setFromAxisAngle(EJE_Y, -Math.atan2(uz, ux));
}

/** Tramo de vía de madera fijo (bajo el tren y hasta el tope): balasto, traviesas y rieles grises. */
function viaFija(padre, t, a, b, colores) {
    const o = colores || {};
    const g = new THREE.Group();
    padre.add(g);
    const bal = cinta(t, a, b, 0.5, PERFIL_BALASTO, 1);
    const mb = new THREE.Mesh(bal.geo, mat(o.balasto || 0xc9b8a3));
    mb.receiveShadow = true;
    g.add(mb);
    const largo = b - a;
    const n = Math.max(2, Math.round(largo / 0.56));
    const trav = new THREE.InstancedMesh(caja(0.24, 0.07, 1.16), mat(o.traviesa || 0xa86b3c), n);
    for (let i = 0; i < n; i++) {
        const s = a + (i + 0.5) * largo / n;
        const p = R().puntoExt(t, s);
        const d = R().direccion(t, s);
        M4.compose(V1.set(p.x, 0.11, p.z), giroDe(d.ux, d.uz, Q), S1.set(1, 1, 1));
        trav.setMatrixAt(i, M4);
    }
    trav.castShadow = true;
    trav.receiveShadow = true;
    g.add(trav);
    [-0.4, 0.4].forEach(function (lat) {
        const r = cinta(t, a, b, 0.5, perfilRiel(lat), 1);
        const m = new THREE.Mesh(r.geo, mat(o.riel || 0x8ea4c8));
        m.castShadow = true;
        g.add(m);
    });
    return g;
}

/** Tope de fin de vía en s, mirando hacia la marcha (o hacia atrás si atras). */
function topeVia(padre, t, s, atras) {
    const g = new THREE.Group();
    const p = R().puntoExt(t, s);
    const d = R().direccion(t, s);
    g.position.set(p.x, 0, p.z);
    g.quaternion.copy(giroDe(atras ? -d.ux : d.ux, atras ? -d.uz : d.uz));
    malla(caja(0.3, 0.55, 1.2), mat(0xff6b6b), 0, 0.42, 0, g);
    malla(caja(0.32, 0.12, 1.22), mat(0xffffff), 0, 0.52, 0, g);
    [-0.3, 0.3].forEach(function (z) { malla(cilindro(0.11, 0.11, 0.2, 10), mat(0xffd43b), -0.24, 0.42, z, g).rotation.z = Math.PI / 2; });
    padre.add(g);
    return g;
}

// ------------------------------------------------------------------ estaciones

const MAT_DOBLE = {};
function matDoble(color) {
    return MAT_DOBLE[color] || (MAT_DOBLE[color] = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide }));
}

function banderines(padre, desde, hasta, n, caida) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.34, 0], 3));
    geo.computeVertexNormals();
    const tonos = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x69db7c, 0xff922b, 0xf783ac];
    const cuerda = [];
    const lista = [];
    for (let i = 0; i <= n; i++) {
        const u = i / n;
        const p = new THREE.Vector3().lerpVectors(desde, hasta, u);
        p.y -= Math.sin(u * Math.PI) * (caida || 0.35);
        cuerda.push(p);
        if (i > 0 && i < n) {
            const b = new THREE.Mesh(geo, matDoble(tonos[i % tonos.length]));
            b.position.copy(p);
            b.lookAt(p.x + (hasta.z - desde.z), p.y, p.z - (hasta.x - desde.x));
            b.userData.fase = i * 0.7;
            padre.add(b);
            lista.push(b);
        }
    }
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cuerda), new THREE.LineBasicMaterial({ color: 0x6d4c41 }));
    padre.add(linea);
    return lista;
}

function farol(padre, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    malla(cilindro(0.06, 0.08, 1.9, 8), mat(0x2f3b66, { m: 0.4, r: 0.4 }), 0, 0.95, 0, g);
    malla(caja(0.3, 0.06, 0.3), mat(0x2f3b66), 0, 1.92, 0, g);
    const luz = malla(esfera(0.15, 14, 10), new THREE.MeshLambertMaterial({ color: 0xfff3bf, emissive: 0xffd43b, emissiveIntensity: 0.9 }), 0, 2.08, 0, g, false);
    malla(new THREE.ConeGeometry(0.22, 0.2, 4), mat(0x2f3b66), 0, 2.3, 0, g).rotation.y = Math.PI / 4;
    padre.add(g);
    return luz;
}

function maceta(padre, x, z, color) {
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
    malla(cilindro(0.17, 0.12, 0.26, 12), mat(0xd9480f), 0, 0.13, 0, g);
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        malla(esfera(0.09, 8, 6), mat(color || 0xffd43b), Math.cos(a) * 0.1, 0.36, Math.sin(a) * 0.1, g, false);
    }
    malla(esfera(0.07, 8, 6), mat(0xff922b), 0, 0.42, 0, g, false);
    padre.add(g);
}

const TABLAS = {};
function matTablas(ext) {
    const k = String(ext);
    if (!TABLAS[k]) {
        const t = TX.tablas.clone();
        t.needsUpdate = true;
        t.repeat.set(2.5 * ext, 1);
        TABLAS[k] = new THREE.MeshLambertMaterial({ map: t });
    }
    return TABLAS[k];
}

/**
 * Estación de madera pintada. Marco local: la vía corre por el eje x (z = 0), el andén y el edificio quedan
 * detrás (z negativo). tipo: "inicio" | "parada" (estación intermedia, compacta y centrada) | "meta" | "gran".
 */
function crearEstacion(tipo) {
    const g = new THREE.Group();
    const gran = tipo === "gran";
    const meta = tipo === "meta";
    const parada = tipo === "parada";
    const ext = gran ? 1.5 : (parada ? 0.72 : 1);
    const xc = meta ? 1.3 : (gran || parada ? 0 : -3.2);      // centro del edificio sobre x
    const out = { grupo: g, banderas: [], luces: [], globos: [], saltan: [] };

    // andén de tablas con borde amarillo
    malla(caja(5.2 * ext, 0.42, 1.25), matTablas(ext), xc, 0.21, -1.42, g);
    malla(caja(5.24 * ext, 0.08, 0.1), mat(0xffd43b), xc, 0.42, -0.83, g);

    // edificio con techo a dos aguas a rayas
    const cuerpo = new THREE.Group();
    cuerpo.position.set(xc, 0.42, -2.75);
    g.add(cuerpo);
    const ancho = 3.0 * ext, alto = 1.75 * (gran ? 1.25 : 1), fondo = 1.5;
    malla(cajaRedonda(ancho, alto, fondo, 0.12), mat(meta ? 0xfff3d6 : 0xfff0d1, { r: 0.7 }), 0, alto / 2, 0, cuerpo);
    malla(caja(ancho + 0.1, 0.22, fondo + 0.1), mat(meta ? 0x37b24d : 0x2f6fed), 0, 0.11, 0, cuerpo);
    // puerta y ventanas redondas
    malla(cajaRedonda(0.62, 1.05, 0.12, 0.2), mat(meta ? 0xff922b : 0xff6b6b), 0, 0.55, fondo / 2 + 0.02, cuerpo);
    malla(esfera(0.05, 8, 6), mat(0xffd43b, { m: 0.4 }), 0.18, 0.55, fondo / 2 + 0.1, cuerpo, false);
    [-ancho * 0.32, ancho * 0.32].forEach(function (x) {
        const v = malla(cilindro(0.3, 0.3, 0.1, 20), mat(0x9ad8ff, { r: 0.15, m: 0.1 }), x, alto * 0.58, fondo / 2 + 0.03, cuerpo);
        v.rotation.x = Math.PI / 2;
        const marco = malla(new THREE.TorusGeometry(0.31, 0.06, 8, 20), mat(meta ? 0x37b24d : 0x2f6fed), x, alto * 0.58, fondo / 2 + 0.07, cuerpo);
        marco.castShadow = false;
    });
    // techo
    const techo = new THREE.Group();
    techo.position.y = alto;
    cuerpo.add(techo);
    const coloresTecho = meta ? [0x37b24d, 0xffffff] : (parada ? [0x845ef7, 0xffd43b] : [0xff922b, 0x4dabf7]);
    [-1, 1].forEach(function (lado) {
        const ala = new THREE.Group();
        ala.position.z = lado * 0.02;
        ala.rotation.x = lado * 0.62;
        techo.add(ala);
        const n = 6;
        for (let i = 0; i < n; i++) {
            const w = (ancho + 0.5) / n;
            malla(caja(w, 0.12, 1.12), mat(coloresTecho[i % 2], { r: 0.5 }), -ancho / 2 - 0.25 + w * (i + 0.5), 0.2, lado * 0.5, ala);
        }
    });
    // frontón con reloj
    const front = malla(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 3, 1, false), mat(0xfff0d1), 0, 0.32, fondo / 2 - 0.02, techo);
    front.rotation.x = Math.PI / 2;
    front.rotation.y = Math.PI / 2;
    front.scale.set(1, 1, 0.8);
    const reloj = malla(cilindro(0.3, 0.3, 0.08, 24), [mat(0x2f6fed), new THREE.MeshLambertMaterial({ map: TX.reloj }), mat(0x2f6fed)], 0, 0.3, fondo / 2 + 0.08, techo, false);
    reloj.rotation.x = Math.PI / 2;
    reloj.rotation.y = Math.PI;
    // chimenea de la estación
    malla(caja(0.32, 0.7, 0.32), mat(0xd9480f), ancho * 0.3, 0.75, -0.25, techo);

    // alero a rayas sobre la fachada (sin tapar puerta, ventanas ni reloj desde la cámara)
    const marq = new THREE.Group();
    marq.position.set(xc, 0.42 + alto - 0.12, -2.75 + fondo / 2 + 0.3);
    g.add(marq);
    const toldo = malla(caja(ancho + 0.3, 0.08, 0.62), mat(meta || gran ? 0x37b24d : 0xff6b6b, { r: 0.5 }), 0, 0, 0, marq);
    toldo.rotation.x = 0.32;
    const nOnda = Math.round(9 * ext);
    for (let i = 0; i < nOnda; i++) {
        const w = (ancho + 0.3) / nOnda;
        const m = malla(new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 12, 1, false, 0, Math.PI), mat(i % 2 ? 0xffffff : (meta || gran ? 0x37b24d : 0xff6b6b)), -(ancho + 0.3) / 2 + w * (i + 0.5), -0.12, 0.3, marq, false);
        m.rotation.x = Math.PI / 2 + 0.32;
    }
    [-ancho / 2 + 0.1, ancho / 2 - 0.1].forEach(function (x) {
        malla(cilindro(0.05, 0.05, 1.5, 8), mat(0xffffff), x, -0.8, 0.28, marq);
    });

    // letrero con ícono sobre dos postes
    const xl = meta ? -0.2 : (parada ? 1.75 : -0.7);
    const letrero = new THREE.Group();
    letrero.position.set(gran ? -3.8 : xl, 0, -0.95);
    g.add(letrero);
    [-0.5, 0.5].forEach(function (x) { malla(cilindro(0.05, 0.05, 1.9, 8), mat(0x8d5a3b), x, 0.95, 0, letrero); });
    const cartel = malla(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshLambertMaterial({ map: meta || gran ? TX.letreroMeta : TX.letreroInicio }), 0, 1.92, 0.04, letrero, false);
    malla(caja(1.5, 0.78, 0.06), mat(0x8d5a3b), 0, 1.92, 0, letrero);
    cartel.position.z = 0.04;
    out.saltan.push(letrero);

    // faroles y macetas
    out.luces.push(farol(g, xc - 2.5 * ext, -0.95));
    out.luces.push(farol(g, xc + 2.5 * ext, -0.95));
    maceta(g, xc - 1.2 * ext, -1.5, 0xff6b6b);
    maceta(g, xc + 1.6 * ext, -1.55, 0xffd43b);

    // banderines desde el techo a un poste
    const poste = malla(cilindro(0.06, 0.06, 3.2, 8), mat(0x8d5a3b), xc + ancho / 2 + 1.0, 1.6, -3.4, g);
    poste.castShadow = true;
    out.banderas = out.banderas.concat(banderines(g, new THREE.Vector3(xc - ancho / 2 - 0.2, 2.9, -2.1), new THREE.Vector3(xc + ancho / 2 + 1.0, 3.1, -3.4), 9, 0.4));

    if (meta || gran) {
        // torre con bandera a cuadros y anillo dorado de llegada
        const torre = new THREE.Group();
        torre.position.set(xc - ancho / 2 - 0.55, 0, -2.6);
        g.add(torre);
        malla(cilindro(0.42, 0.5, 2.8, 12), mat(0xfff0d1), 0, 1.4, 0, torre);
        malla(new THREE.ConeGeometry(0.62, 0.9, 12), mat(0xff6b6b), 0, 3.25, 0, torre);
        malla(cilindro(0.03, 0.03, 1.2, 6), mat(0x6d4c41), 0, 4.2, 0, torre);
        const bandera = malla(new THREE.PlaneGeometry(0.8, 0.55, 8, 1), new THREE.MeshLambertMaterial({ map: TX.cuadros, side: THREE.DoubleSide }), 0.4, 4.5, 0, torre, false);
        out.banderaMeta = bandera;
        out.banderaBase = bandera.geometry.attributes.position.array.slice();
    }
    if (gran) {
        // estrella dorada sobre el edificio y globos
        const est = malla(geoEstrella(0.7, 0.22), mat(0xffd43b, { r: 0.3, m: 0.3, e: 0.3 }), xc, 0.42 + alto + 1.6, -2.75, g, false);
        out.estrella = est;
        const tonos = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xf783ac, 0xff922b];
        for (let i = 0; i < 6; i++) {
            const gl = new THREE.Group();
            const x = xc - 3.6 + i * 1.45;
            gl.position.set(x, 0, 0.9 + (i % 2) * 0.5);
            malla(esfera(0.34, 16, 12), mat(tonos[i], { r: 0.25 }), 0, 3.2 + (i % 3) * 0.3, 0, gl).scale.set(1, 1.18, 1);
            const hilo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, 2.8 + (i % 3) * 0.3, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
            gl.add(hilo);
            gl.userData.fase = i;
            g.add(gl);
            out.globos.push(gl);
        }
    }
    // la estación intermedia queda un poco más atrás: las curvas del último nivel pasan sin pisar el andén
    if (parada) g.children.forEach(function (c) { c.position.z -= 0.5; });
    fundirGrupo(g, [].concat(out.saltan, out.banderas, out.luces, out.globos, [out.estrella, out.banderaMeta]));
    return out;
}

// ------------------------------------------------------------------ tren

/**
 * Locomotora de juguete + vagones. Marco local: la marcha es +x, el frente de la locomotora en x = 0, las ruedas
 * apoyadas en los rieles (y = PLANO_Y). Devuelve las piezas que se animan.
 */
function crearTren(paleta, vagones) {
    const P = PALETAS[paleta] || PALETAS.rojo;
    const grupo = new THREE.Group();     // locomotora y vagones (cada uno se apoya por su cuenta en la vía)
    const raiz = new THREE.Group();
    grupo.add(raiz);
    const cuerpo = new THREE.Group();     // lo que se balancea y se aplasta (sin las ruedas)
    cuerpo.position.y = PLANO_Y;
    raiz.add(cuerpo);
    const t = { grupo: grupo, raiz: raiz, cuerpo: cuerpo, ruedas: [], bielas: [], vagones: [], ojos: [], paleta: paleta };
    const cCuerpo = mat(P.cuerpo, { r: 0.35, m: 0.05 });
    const cTecho = mat(P.techo, { r: 0.4 });
    const cDet = mat(P.detalle, { r: 0.35, m: 0.2 });
    const oscuro = mat(0x2b2f4a, { r: 0.5, m: 0.3 });
    const oro = mat(0xffd43b, { r: 0.25, m: 0.5 });

    // chasis
    malla(cajaRedonda(3.0, 0.26, 1.02, 0.08), oscuro, -1.5, 0.42, 0, cuerpo);
    // caldera
    const caldera = malla(cilindro(0.5, 0.5, 1.75, 28), cCuerpo, -0.95, 0.98, 0, cuerpo);
    caldera.rotation.z = Math.PI / 2;
    if (paleta === "arcoiris") {
        [0xff6b6b, 0xff922b, 0xffd43b, 0x37c978, 0x4dabf7].forEach(function (c, i) {
            const b = malla(cilindro(0.515, 0.515, 0.22, 28), mat(c, { r: 0.35 }), -1.65 + i * 0.32, 0.98, 0, cuerpo);
            b.rotation.z = Math.PI / 2;
        });
    }
    [-1.6, -1.0, -0.36].forEach(function (x) {
        const b = malla(new THREE.TorusGeometry(0.505, 0.045, 8, 28), oro, x, 0.98, 0, cuerpo);
        b.rotation.y = Math.PI / 2;
    });
    // cara amigable al frente de la caldera
    const cara = malla(cilindro(0.48, 0.48, 0.08, 28), mat(0xfff4e0, { r: 0.5 }), -0.06, 0.98, 0, cuerpo);
    cara.rotation.z = Math.PI / 2;
    [-0.17, 0.17].forEach(function (z) {
        const ojo = new THREE.Group();
        ojo.position.set(0.0, 1.07, z);
        cuerpo.add(ojo);
        malla(esfera(0.1, 14, 10), mat(0xffffff, { r: 0.3 }), 0, 0, 0, ojo, false).scale.set(0.6, 1.15, 1);
        const pupila = malla(esfera(0.055, 12, 8), mat(0x13234a, { r: 0.3 }), 0.04, -0.01, 0, ojo, false);
        t.ojos.push(pupila);
        malla(esfera(0.07, 10, 8), mat(0xff8fab, { r: 0.6 }), -0.01, -0.14, z * 1.55, cuerpo, false).scale.set(0.4, 0.7, 1);
    });
    const sonrisa = malla(new THREE.TorusGeometry(0.13, 0.026, 8, 16, Math.PI), mat(0x13234a), 0.0, 0.88, 0, cuerpo, false);
    sonrisa.rotation.set(0, Math.PI / 2, Math.PI);
    // chimenea con boca ancha
    const chim = new THREE.Group();
    chim.position.set(-0.45, 1.42, 0);
    cuerpo.add(chim);
    malla(cilindro(0.15, 0.17, 0.5, 16), oscuro, 0, 0.25, 0, chim);
    malla(cilindro(0.28, 0.16, 0.24, 16), cDet, 0, 0.6, 0, chim);
    malla(new THREE.TorusGeometry(0.27, 0.04, 8, 20), oro, 0, 0.72, 0, chim).rotation.x = Math.PI / 2;
    t.boca = new THREE.Object3D();
    t.boca.position.set(0, 0.78, 0);
    chim.add(t.boca);
    t.chimenea = chim;
    // domo dorado y campana
    malla(esfera(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), oro, -1.2, 1.45, 0, cuerpo).scale.set(1, 0.9, 1);
    // faro
    malla(cilindro(0.13, 0.13, 0.14, 16), oro, -0.08, 1.56, 0, cuerpo).rotation.z = Math.PI / 2;
    t.faro = malla(cilindro(0.1, 0.1, 0.03, 16), new THREE.MeshLambertMaterial({ color: 0xfff9db, emissive: 0xffe066, emissiveIntensity: 1.2 }), 0.0, 1.56, 0, cuerpo, false);
    t.faro.rotation.z = Math.PI / 2;
    t.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.brillo, color: 0xfff3bf, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    t.halo.scale.set(0.9, 0.9, 1);
    t.halo.position.set(0.12, 1.56, 0);
    cuerpo.add(t.halo);
    // cabina
    malla(cajaRedonda(1.1, 1.15, 1.08, 0.12), cCuerpo, -2.35, 1.12, 0, cuerpo);
    [-0.545, 0.545].forEach(function (z) {
        malla(cajaRedonda(0.6, 0.48, 0.04, 0.1), mat(0x9ad8ff, { r: 0.12 }), -2.3, 1.32, z * 1.0, cuerpo, false);
    });
    malla(cajaRedonda(0.55, 0.42, 0.04, 0.1), mat(0x9ad8ff, { r: 0.12 }), -1.79, 1.38, 0, cuerpo, false).rotation.y = Math.PI / 2;
    malla(cajaRedonda(1.42, 0.16, 1.32, 0.07), cTecho, -2.35, 1.78, 0, cuerpo);
    malla(cajaRedonda(1.0, 0.1, 1.0, 0.05), cTecho, -2.35, 1.9, 0, cuerpo);
    // limpiavías
    const lv = malla(new THREE.ConeGeometry(0.5, 0.42, 4, 1), cDet, 0.12, 0.33, 0, cuerpo);
    lv.rotation.set(0, Math.PI / 4, -Math.PI / 2);
    lv.scale.set(1, 1, 0.55);
    [-0.32, 0.32].forEach(function (z) { malla(cilindro(0.07, 0.07, 0.16, 10), oro, 0.1, 0.5, z, cuerpo).rotation.z = Math.PI / 2; });

    // ruedas: dos grandes y una delantera por lado, con biela que las une
    const ruedaGeo = cilindro(0.3, 0.3, 0.12, 22);
    const ruedaChica = cilindro(0.21, 0.21, 0.12, 18);
    const rayo = caja(0.5, 0.06, 0.13);
    const rayoChico = caja(0.34, 0.05, 0.13);
    [[-0.45, 0.21, ruedaChica, rayoChico], [-1.35, 0.3, ruedaGeo, rayo], [-2.25, 0.3, ruedaGeo, rayo]].forEach(function (r) {
        [-0.53, 0.53].forEach(function (z) {
            const rueda = new THREE.Group();
            rueda.position.set(r[0], PLANO_Y + r[1], z);
            raiz.add(rueda);
            const m = malla(r[2], mat(P.rueda, { r: 0.35, m: 0.2 }), 0, 0, 0, rueda);
            m.rotation.x = Math.PI / 2;
            malla(r[3], mat(0xffffff, { r: 0.4 }), 0, 0, z > 0 ? 0.01 : -0.01, rueda, false);
            const r2 = malla(r[3], mat(0xffffff, { r: 0.4 }), 0, 0, z > 0 ? 0.01 : -0.01, rueda, false);
            r2.rotation.z = Math.PI / 2;
            malla(cilindro(0.08, 0.08, 0.16, 12), oro, 0, 0, 0, rueda, false).rotation.x = Math.PI / 2;
            t.ruedas.push({ g: rueda, r: r[1] });
        });
    });
    [-0.6, 0.6].forEach(function (z) {
        const biela = malla(caja(1.0, 0.07, 0.05), mat(0xc0c8e0, { r: 0.3, m: 0.7 }), -1.8, PLANO_Y + 0.3, z, raiz, false);
        t.bielas.push(biela);
    });

    // vagones con bloques de juguete
    const colores = vagones || [P.cuerpo];
    let x = -3.25;
    colores.forEach(function (c, i) {
        const v = crearVagon(c, P.carga.length ? P.carga : [0xffd43b, 0xffffff, 0xff6b6b], paleta === "arcoiris");
        v.atras = -x;                    // distancia del frente de la locomotora al frente del vagón
        grupo.add(v.raiz);
        t.vagones.push(v);
        t.ruedas = t.ruedas.concat(v.ruedas);
        // enganche
        malla(caja(0.3, 0.07, 0.07), oscuro, 0.12, PLANO_Y + 0.42, 0, v.raiz, false);
        x -= 2.15;
        void i;
    });
    t.largo = -x;
    t.ruedas.forEach(function (r) { if (r.g.parent === raiz) fundirGrupo(r.g); });
    fundirGrupo(cuerpo, t.ojos.concat([t.faro, t.halo]));
    return t;
}

function crearVagon(color, carga, conEstrella) {
    const raiz = new THREE.Group();
    const cuerpo = new THREE.Group();
    cuerpo.position.y = PLANO_Y;
    raiz.add(cuerpo);
    const v = { raiz: raiz, cuerpo: cuerpo, ruedas: [] };
    malla(cajaRedonda(1.9, 0.22, 1.0, 0.07), mat(0x2b2f4a, { r: 0.5, m: 0.3 }), -0.95, 0.42, 0, cuerpo);
    // caja abierta del vagón
    const c = mat(color, { r: 0.35 });
    malla(cajaRedonda(1.85, 0.12, 1.06, 0.05), c, -0.95, 0.58, 0, cuerpo);
    [[-0.95, 0.5, 1.85, 0.1], [-0.95, -0.5, 1.85, 0.1]].forEach(function (p) { malla(cajaRedonda(p[2], 0.52, p[3], 0.04), c, p[0], 0.88, p[1], cuerpo); });
    [-0.05, -1.85].forEach(function (x) { malla(cajaRedonda(0.1, 0.52, 1.06, 0.04), c, x, 0.88, 0, cuerpo); });
    malla(caja(1.9, 0.06, 0.06), mat(0xffd43b, { m: 0.4, r: 0.3 }), -0.95, 1.16, 0.52, cuerpo, false);
    malla(caja(1.9, 0.06, 0.06), mat(0xffd43b, { m: 0.4, r: 0.3 }), -0.95, 1.16, -0.52, cuerpo, false);
    if (conEstrella) {
        const e = malla(geoEstrella(0.38, 0.14), mat(0xffd43b, { r: 0.3, m: 0.3, e: 0.35 }), -0.95, 1.38, 0, cuerpo);
        v.estrella = e;
    } else {
        // bloques de juguete: cubo, cilindro y triángulo
        malla(cajaRedonda(0.42, 0.42, 0.42, 0.08), mat(carga[0], { r: 0.4 }), -1.4, 0.88, -0.12, cuerpo).rotation.y = 0.3;
        malla(cilindro(0.2, 0.2, 0.46, 16), mat(carga[1], { r: 0.4 }), -0.85, 0.9, 0.15, cuerpo);
        const tri = malla(cilindro(0.26, 0.26, 0.3, 3), mat(carga[2], { r: 0.4 }), -0.4, 0.96, -0.1, cuerpo);
        tri.rotation.x = Math.PI / 2;
    }
    [-0.4, -1.5].forEach(function (x) {
        [-0.52, 0.52].forEach(function (z) {
            const rueda = new THREE.Group();
            rueda.position.set(x, PLANO_Y + 0.22, z);
            raiz.add(rueda);
            malla(cilindro(0.22, 0.22, 0.1, 18), mat(0x2b2f4a, { r: 0.4, m: 0.3 }), 0, 0, 0, rueda).rotation.x = Math.PI / 2;
            const tapa = malla(cilindro(0.13, 0.13, 0.12, 14), mat(color, { r: 0.4 }), 0, 0, 0, rueda, false);
            tapa.rotation.x = Math.PI / 2;
            malla(caja(0.3, 0.05, 0.13), mat(0xffffff), 0, 0, 0, rueda, false);
            v.ruedas.push({ g: rueda, r: 0.22 });
            fundirGrupo(rueda);
        });
    });
    fundirGrupo(cuerpo, [v.estrella]);
    return v;
}

/**
 * Apoya cada coche del tren sobre el camino (recto o curvo): el frente de la locomotora en s = sFrente y cada
 * vagón detrás, girado según la vía bajo sus ruedas. Fuera de los extremos del camino se prolonga en recta.
 */
function apoyar(obj, camino, sFrente, largo) {
    const a = R().puntoExt(camino, sFrente);
    const b = R().puntoExt(camino, sFrente - largo);
    obj.position.x = a.x;
    obj.position.z = a.z;
    obj.rotation.y = -Math.atan2(a.z - b.z, a.x - b.x);
}

function ponerTren(t, camino, sFrente) {
    apoyar(t.raiz, camino, sFrente, 2.6);
    t.vagones.forEach(function (v) { apoyar(v.raiz, camino, sFrente - v.atras, 1.9); });
    t.s = sFrente;
}

function girarRuedas(t, dist) {
    t.ruedas.forEach(function (r) { r.g.rotation.z -= dist / r.r; });
    if (t.bielas.length) {
        const ang = t.ruedas[2] ? t.ruedas[2].g.rotation.z : 0;
        t.bielas.forEach(function (b) {
            b.position.x = -1.8 + Math.cos(ang) * 0.14;
            b.position.y = PLANO_Y + 0.3 + Math.sin(ang) * 0.14;
        });
    }
}

/// ------------------------------------------------------------------ ruta del nivel (se arma en cargar)

/**
 * VIA.ruta: estaciones al azar (ReglasTren.generarRuta). VIA.camino: el camino completo (vía fija, tramos y vía
 * fija), por donde se mueve el tren. VIA.tramos[i] = { t: trazo del hueco i, vis: sus piezas }; VIA.idx es el que
 * se construye ahora. Los tramos hechos quedan como vía de verdad; los que faltan no se ven hasta su turno.
 */
const VIA = {
    grupo: null,
    ruta: null,
    camino: null,
    tramos: [],
    idx: 0,
    estaciones: [],
    hilo: null
};

function vis() {
    const tr = VIA.tramos[VIA.idx];
    return tr ? tr.vis : null;
}

function liberar(obj) {
    obj.traverse(function (o) {
        if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
    });
}

/** Piezas de un tramo: carril, cintas de balasto/rieles/estela, traviesas, puntos de luz, flechas, inicio y punta. */
function construirTramo(padre, t) {
    const g = new THREE.Group();
    padre.add(g);
    const L = t.largo;
    const v = { grupo: g, t: t, nIluminados: -1, pulsoS: 0 };

    // carril de interacción: banda celeste con bordes de rayas
    const texC = TX.carril.clone();
    texC.needsUpdate = true;
    const c = cinta(t, -0.4, L + 0.4, 0.2, [[-t.ancho / 2, 0.03], [t.ancho / 2, 0.03]], 2.2);
    v.carril = new THREE.Mesh(c.geo, new THREE.MeshBasicMaterial({ map: texC, color: COL.carril.clone(), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    v.carril.renderOrder = 2;
    g.add(v.carril);

    // balasto, rieles azules y estela que crecen con el avance (cintas recortadas hasta s)
    v.cBalasto = cinta(t, 0, L, 0.14, PERFIL_BALASTO, 1);
    v.balasto = new THREE.Mesh(v.cBalasto.geo, mat(0xd8cbb8));
    v.balasto.receiveShadow = true;
    g.add(v.balasto);
    v.matRiel = new THREE.MeshLambertMaterial({ color: 0x2f7bff, emissive: 0x1c64ff, emissiveIntensity: 0.35 });
    v.cRieles = [-0.4, 0.4].map(function (lat) {
        const r = cinta(t, 0, L, 0.14, perfilRiel(lat), 1);
        const m = new THREE.Mesh(r.geo, v.matRiel);
        m.castShadow = true;
        g.add(m);
        return r;
    });
    v.cEstela = cinta(t, 0, L, 0.14, [[-0.75, PLANO_Y + 0.02], [0.75, PLANO_Y + 0.02]], 1);
    v.estela = new THREE.Mesh(v.cEstela.geo, new THREE.MeshBasicMaterial({ map: TX.estela, color: 0x4fc3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    v.estela.renderOrder = 5;
    g.add(v.estela);
    [v.cBalasto, v.cEstela].concat(v.cRieles).forEach(function (cc) { revelar(cc, 0); });

    // traviesas: aparecen con un saltito cuando la vía pasa por encima
    const colTrav = [0xa86b3c, 0xc98a4b];
    v.traviesas = new THREE.InstancedMesh(caja(0.24, 0.07, 1.16), mat(0xffffff), t.traviesas.length);
    v.trav = t.traviesas.map(function (s, i) {
        const p = R().punto(t, s);
        const d = R().direccion(t, s);
        M4.makeScale(0, 0, 0);
        v.traviesas.setMatrixAt(i, M4);
        v.traviesas.setColorAt(i, new THREE.Color(colTrav[i % 2]));
        return { s: s, t: -1, x: p.x, z: p.z, q: giroDe(d.ux, d.uz) };
    });
    v.traviesas.castShadow = true;
    v.traviesas.receiveShadow = true;
    // las traviesas nacen escondidas en el origen: si three.js calcula su esfera de recorte con eso, al deslizarse
    // la cámara a otra estación las descarta aunque estén a la vista (desaparecía la madera desde el nivel 2)
    v.traviesas.frustumCulled = false;
    g.add(v.traviesas);

    // puntos de luz del recorrido
    v.puntos = new THREE.InstancedMesh(esfera(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), t.puntos.length);
    v.pp = t.puntos.map(function (s, i) {
        const p = R().punto(t, s);
        M4.makeTranslation(p.x, PLANO_Y + 0.14, p.z);
        v.puntos.setMatrixAt(i, M4);
        v.puntos.setColorAt(i, COL.pendiente);
        return { s: s, x: p.x, z: p.z };
    });
    v.puntos.renderOrder = 6;
    g.add(v.puntos);

    // flechitas que señalan la dirección (siguen la curva)
    v.flechas = [];
    const fGeo = GEO.flecha || (GEO.flecha = new THREE.ShapeGeometry((function () {
        const sh = new THREE.Shape();
        sh.moveTo(0.28, 0); sh.lineTo(-0.14, 0.26); sh.lineTo(-0.04, 0); sh.lineTo(-0.14, -0.26); sh.closePath();
        return sh;
    })()));
    for (let s = 1.6; s < L - 0.8; s += 2.4) {
        const p = R().punto(t, s);
        const d = R().direccion(t, s);
        const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false });
        [1, -1].forEach(function (lado) {
            const f = new THREE.Mesh(fGeo, m);
            f.rotation.set(-Math.PI / 2, -Math.atan2(d.uz, d.ux), 0, "YXZ");
            f.position.set(p.x + d.nx * t.ancho * 0.36 * lado, 0.05, p.z + d.nz * t.ancho * 0.36 * lado);
            f.renderOrder = 4;
            f.userData.s = s;
            g.add(f);
            v.flechas.push(f);
        });
    }

    // punto INICIO: anillo que late y una flecha que rebota encima
    const ini = new THREE.Group();
    const p0 = R().punto(t, 0);
    ini.position.set(p0.x, 0.06, p0.z);
    g.add(ini);
    const anillo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 36), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    anillo.rotation.x = -Math.PI / 2;
    ini.add(anillo);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: 0xfff3bf, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = -0.005;
    ini.add(disco);
    const onda = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.9, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
    onda.rotation.x = -Math.PI / 2;
    ini.add(onda);
    const dedo = malla(new THREE.ConeGeometry(0.26, 0.6, 12), mat(0xffd43b, { e: 0.35 }), 0, 1.35, 0, ini, false);
    dedo.rotation.x = Math.PI;
    v.inicio = { grupo: ini, anillo: anillo, onda: onda, dedo: dedo, disco: disco };
    ini.renderOrder = 7;

    // anillo verde de llegada en la estación siguiente
    const pL = R().punto(t, L);
    const fin = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.82, 36), new THREE.MeshBasicMaterial({ color: 0x69db7c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    fin.rotation.x = -Math.PI / 2;
    fin.position.set(pL.x, 0.06, pL.z);
    g.add(fin);
    v.fin = fin;

    // punta: estrellita que marca dónde va la vía y dónde se retoma
    v.punta = malla(geoEstrella(0.34, 0.1), mat(0xffd43b, { e: 0.6 }), 0, PLANO_Y + 0.55, 0, g, false);
    v.puntaHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.brillo, color: 0x8fe3ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    v.puntaHalo.scale.set(1.5, 1.5, 1);
    g.add(v.puntaHalo);

    // pulso de luz que recorre la vía construida
    v.pulso = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.brillo, color: 0xbff4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    v.pulso.scale.set(1.1, 1.1, 1);
    g.add(v.pulso);
    return v;
}

/** futuro (no se ve) | actual (todo) | hecho (solo la vía construida, completa). */
function estadoTramo(v, modo) {
    v.modo = modo;
    v.grupo.visible = modo !== "futuro";
    const actual = modo === "actual";
    [v.carril, v.puntos, v.inicio.grupo, v.fin, v.punta, v.puntaHalo, v.pulso, v.estela].forEach(function (o) { o.visible = actual; });
    v.flechas.forEach(function (f) { f.visible = actual; });
    if (modo === "hecho") {
        const L = v.t.largo;
        [v.cBalasto].concat(v.cRieles).forEach(function (c) { revelar(c, L + 1); });
        v.trav.forEach(function (tv, i) {
            tv.t = 1;
            M4.compose(V1.set(tv.x, 0.11, tv.z), tv.q, S1.set(1, 1, 1));
            v.traviesas.setMatrixAt(i, M4);
        });
        v.traviesas.instanceMatrix.needsUpdate = true;
        v.matRiel.emissiveIntensity = 0.55;
    }
}

/** Arma el nivel: ruta al azar, vías fijas, tramos vacíos y estaciones en su sitio. */
function construirNivel(def) {
    if (VIA.grupo) {
        E.scene.remove(VIA.grupo);
        liberar(VIA.grupo);
    }
    const g = new THREE.Group();
    VIA.grupo = g;
    E.scene.add(g);
    const juego = E.cfg && E.cfg.juego;
    const ruta = R().generarRuta(def, E.cfg && E.cfg.ruta);
    VIA.ruta = ruta;
    VIA.camino = R().construir({ puntos: ruta.camino, ancho: 1 }, juego);
    VIA.tramos = ruta.tramos.map(function (d) {
        const t = R().construir(d, juego);
        return { t: t, vis: construirTramo(g, t) };
    });
    const sE = ruta.sEstaciones;
    const ultima = sE.length - 1;
    // vía fija bajo el tren (antes de la primera estación) y hasta el tope (después de la última)
    viaFija(g, VIA.camino, 0, sE[0]);
    VIA.viaFin = viaFija(g, VIA.camino, sE[ultima], VIA.camino.largo);
    VIA.topeA = topeVia(g, VIA.camino, 0.15, true);
    VIA.topeFin = topeVia(g, VIA.camino, VIA.camino.largo - 0.15, false);
    // estaciones, giradas como la vía en ese punto
    VIA.estaciones = ruta.estaciones.map(function (e, i) {
        const est = crearEstacion(i === 0 ? "inicio" : (i === ultima ? "meta" : "parada"));
        const d = R().direccion(VIA.camino, sE[i]);
        est.grupo.position.set(e.x, 0, e.z);
        est.grupo.rotation.y = -Math.atan2(d.uz, d.ux);
        g.add(est.grupo);
        return est;
    });
    VIA.tramos.forEach(function (tr, i) { estadoTramo(tr.vis, i === 0 ? "actual" : "futuro"); });
    VIA.idx = 0;
}

/** Pasa al hueco siguiente (el anterior queda como vía hecha). */
function activarTramo(i) {
    VIA.tramos.forEach(function (tr, j) { estadoTramo(tr.vis, j < i ? "hecho" : (j === i ? "actual" : "futuro")); });
    VIA.idx = i;
    E.trazo = VIA.tramos[i].t;
    E.est = R().nuevoEstado(E.trazo);
    E.sVis = 0;
    E.ptrId = null;
    E.demoPtr = false;
    E.dedo = null;
    E.alerta = 0;
}

/** s del frente del tren esperando al inicio del tramo i (detenido en su estación, junto al punto INICIO). */
const S_TREN_ANTES = 0.75;
const S_TREN_LLEGADA_EXTRA = 1.75;
function sTrenEn(i) {
    return VIA.ruta.sEstaciones[i] - S_TREN_ANTES;
}

/** Avance de todo el nivel (0..1): tramos hechos más lo construido del actual. */
function kNivel() {
    if (!VIA.tramos.length || !E.est) return 0;
    let total = 0, hecho = 0;
    VIA.tramos.forEach(function (tr, i) {
        total += tr.t.largo;
        if (i < VIA.idx) hecho += tr.t.largo;
    });
    hecho += Math.min(E.est.s, E.trazo.largo);
    return total > 0 ? hecho / total : 0;
}

function actualizarVia(dt) {
    const t = E.trazo;
    const v = vis();
    if (!t || !v) return;
    const est = E.est;
    // la vía visible sigue al avance real; si retrocede (reinicio tras la demo) se recoge con suavidad
    if (est.s >= E.sVis) E.sVis = est.s;
    else E.sVis = Math.max(est.s, E.sVis - 14 * dt);
    const s = E.sVis;
    [v.cBalasto, v.cEstela].concat(v.cRieles).forEach(function (c) { revelar(c, s); });
    v.estela.material.opacity = (s > 0 ? 0.45 : 0) + Math.sin(E.reloj * 5) * 0.08;

    // traviesas: aparecen con un saltito cuando la vía pasa por encima
    let cambio = false;
    v.trav.forEach(function (tv, i) {
        if (tv.s <= s && tv.t < 0) {
            tv.t = 0;
            if (!E.demoPtr && E.reloj - E.tTraviesa > 0.07) {
                E.tTraviesa = E.reloj;
                emitir("traviesa");
            }
        }
        if (tv.s > s && tv.t >= 0) {
            tv.t = -1;
            M4.makeScale(0, 0, 0);
            v.traviesas.setMatrixAt(i, M4);
            cambio = true;
        }
        if (tv.t >= 0 && tv.t < 1) {
            tv.t = Math.min(1, tv.t + dt / 0.28);
            const k = tv.t < 0.6 ? lerp(0.2, 1.25, tv.t / 0.6) : lerp(1.25, 1, (tv.t - 0.6) / 0.4);
            M4.compose(V1.set(tv.x, 0.11 + (1 - tv.t) * 0.25, tv.z), tv.q, S1.set(k, k, k));
            v.traviesas.setMatrixAt(i, M4);
            cambio = true;
        }
    });
    if (cambio) v.traviesas.instanceMatrix.needsUpdate = true;

    // puntos: los recorridos se encienden turquesa; los pendientes laten en ola hacia adelante
    let n = 0;
    while (n < v.pp.length && v.pp[n].s <= s + 0.01) n++;
    const fuera = est.estado === "fuera";
    const alerta = E.alerta > 0 ? (Math.sin(E.reloj * 18) > 0 ? 1 : 0) : 0;
    if (n !== v.nIluminados) {
        for (let i = 0; i < v.pp.length; i++) v.puntos.setColorAt(i, i < n ? COL.hecho : COL.pendiente);
        if (n > v.nIluminados && v.nIluminados >= 0 && !E.demoPtr) {
            const p = aMundoLocal(v.pp[Math.max(0, n - 1)].s, PLANO_Y + 0.2);
            CH.emitir({ p: p, v: [0, 1.2, 0], color: COL.turquesa, vida: 0.6, tam: 0.8, tamFin: 0.1 });
        }
        v.nIluminados = n;
        v.puntos.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < v.pp.length; i++) {
        const pp = v.pp[i];
        let k = 1;
        if (i >= n) {
            const fase = (pp.s - s) * 1.6 - E.reloj * 5.5;
            k = 0.85 + Math.max(0, Math.sin(fase)) * 0.45;
            if (fuera || alerta) k = 1 + Math.max(0, Math.sin(E.reloj * 14)) * 0.5;
        } else {
            k = 1.05 + Math.sin(E.reloj * 3 + i) * 0.08;
        }
        M4.compose(V1.set(pp.x, PLANO_Y + 0.14 + (i < n ? 0.04 : 0), pp.z), Q.identity(), S1.set(k, k, k));
        v.puntos.setMatrixAt(i, M4);
    }
    v.puntos.instanceMatrix.needsUpdate = true;

    // carril: celeste; ámbar que titila si se sale o si toca donde no es
    const ambar = fuera ? (0.55 + Math.sin(E.reloj * 12) * 0.45) : (E.alerta > 0 ? E.alerta * (0.5 + Math.sin(E.reloj * 16) * 0.5) : 0);
    v.carril.material.color.copy(COL.carril).lerp(COL.ambar, clamp01(ambar));
    v.carril.material.opacity = 0.85 + Math.sin(E.reloj * 2.4) * 0.08 + clamp01(ambar) * 0.15;
    E.alerta = Math.max(0, E.alerta - dt * 0.8);

    // flechas: brillan en secuencia por delante de la punta (más fuerte si se perdió el camino o con la ayuda)
    const fuerza = (fuera ? 1 : 0) + (E.ayuda > 0 ? 1 : 0) + (est.estado === "lista" ? 0.55 : 0.3);
    v.flechas.forEach(function (f) {
        const ds = f.userData.s - s;
        const ola = Math.max(0, Math.sin(f.userData.s * 0.9 - E.reloj * 4.5));
        f.material.opacity = ds > 0 ? Math.min(0.95, (0.25 + ola * 0.7) * Math.min(1, fuerza)) : 0;
        f.material.color.copy(fuera ? COL.ambar : COL.oro).lerp(BLANCO, 0.35);
    });

    // INICIO: visible mientras no se ha empezado
    const iniVisible = est.estado === "lista" && s < 0.05;
    const ini = v.inicio;
    const latido = 1 + Math.sin(E.reloj * 4) * 0.08 + E.destelloInicio * 0.35;
    ini.grupo.visible = iniVisible;
    ini.anillo.scale.set(latido, latido, 1);
    const ondaU = (E.reloj * 0.8) % 1;
    ini.onda.scale.set(1 + ondaU * 0.9, 1 + ondaU * 0.9, 1);
    ini.onda.material.opacity = 0.6 * (1 - ondaU);
    ini.dedo.position.y = 1.35 + Math.abs(Math.sin(E.reloj * 3.2)) * 0.35;
    ini.dedo.rotation.y += dt * 2;
    E.destelloInicio = Math.max(0, E.destelloInicio - dt * 1.5);
    v.fin.material.opacity = 0.6 + Math.sin(E.reloj * 3) * 0.25;
    const kf = 1 + Math.sin(E.reloj * 3) * 0.06;
    v.fin.scale.set(kf, kf, 1);

    // punta (estrellita): sobre el final de la vía; late más cuando espera que la retomen
    const pausa = est.estado === "pausa";
    const enMeta = est.estado === "meta";
    v.punta.visible = !iniVisible && !enMeta;
    v.puntaHalo.visible = v.punta.visible;
    const salto = pausa ? Math.abs(Math.sin(E.reloj * 4)) * 0.35 : Math.sin(E.reloj * 6) * 0.05;
    const ps = R().punto(t, s);
    v.punta.position.set(ps.x, PLANO_Y + 0.55 + salto, ps.z);
    v.punta.rotation.y += dt * (pausa ? 2.5 : 5);
    v.puntaHalo.position.set(ps.x, PLANO_Y + 0.5, ps.z);
    const kh = pausa ? 1.7 + Math.sin(E.reloj * 6) * 0.4 : 1.3 + Math.min(1, E.velTrazo / 4) * 0.5;
    v.puntaHalo.scale.set(kh, kh, 1);
    v.puntaHalo.material.color.set(fuera ? 0xffc078 : 0x8fe3ff);

    // pulso de luz que recorre la vía ya construida
    if (s > 0.8) {
        v.pulsoS = (v.pulsoS + dt * 6) % (s + 1.5);
        const pu = R().punto(t, Math.min(s, v.pulsoS));
        v.pulso.position.set(pu.x, PLANO_Y + 0.08, pu.z);
        v.pulso.material.opacity = v.pulsoS > s ? 0 : 0.85;
    } else {
        v.pulso.material.opacity = 0;
    }

    // estela de chispas detrás de la punta mientras se traza
    if ((est.estado === "trazando") && E.velTrazo > 0.4 && !E.menosEfectos) {
        const p = aMundoLocal(s, PLANO_Y + 0.25);
        CH.emitir({ p: p, v: [azar(-0.4, 0.4), azar(0.6, 1.4), azar(-0.4, 0.4)], color: Math.random() < 0.5 ? COL.turquesa : COL.azulVia, vida: 0.7, tam: 0.42, tamFin: 0.05, grav: 0.8 });
        if (Math.random() < 0.3) ES.emitir({ p: p, v: [azar(-0.6, 0.6), azar(0.8, 1.6), azar(-0.6, 0.6)], color: COL.oro, vida: 0.8, tam: 0.26, tamFin: 0.04, grav: 1.4 });
    }

    // hilo ámbar punta → dedo
    if (fuera && E.dedo && !E.demoPtr) {
        const a = aMundoLocal(s, PLANO_Y + 0.1);
        const arr = VIA.hilo.geometry.attributes.position.array;
        arr[0] = a.x; arr[1] = a.y; arr[2] = a.z;
        arr[3] = E.dedo.x; arr[4] = PLANO_Y + 0.1; arr[5] = E.dedo.z;
        VIA.hilo.geometry.attributes.position.needsUpdate = true;
        VIA.hilo.computeLineDistances();
        VIA.hilo.visible = true;
        VIA.hilo.material.opacity = 0.6 + Math.sin(E.reloj * 12) * 0.4;
    } else {
        VIA.hilo.visible = false;
    }
    E.ayuda = Math.max(0, E.ayuda - dt);
}

const BLANCO = new THREE.Color(0xffffff);

/** Punto del eje del tramo actual en el mundo (s en unidades, y absoluta). */
function aMundoLocal(s, y) {
    const p = R().puntoExt(E.trazo, s);
    return new THREE.Vector3(p.x, y, p.z);
}

// ------------------------------------------------------------------ estrella guía (demostración visual)

function crearEstrellaGuia(scene) {
    const g = new THREE.Group();
    const m = malla(geoEstrella(0.42, 0.14), mat(0xffe066, { r: 0.25, m: 0.2, e: 0.9 }), 0, 0, 0, g, false);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.brillo, color: 0xfff3bf, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(2, 2, 1);
    g.add(halo);
    g.visible = false;
    g.userData.malla = m;
    scene.add(g);
    E.estrellaObj = g;
}

/** Una estrella recorre el carril de s0 al final dejando una estela; no construye nada. */
function estrellaGuia(desde, dur) {
    const t = E.trazo;
    if (!t) return Promise.resolve();
    if (E.estrella && E.estrella.resolver) E.estrella.resolver();
    return new Promise(function (resolve) {
        const ms = reducido ? 600 : (dur || 3000);
        E.estrella = { t: 0, dur: ms / 1000, s0: Math.max(0, desde || 0), s1: t.largo, resolver: resolve };
        emitir("estrella");
        setTimeout(function () {
            if (E.estrella && E.estrella.resolver === resolve) terminarEstrella();
        }, ms + 900);
    });
}

function terminarEstrella() {
    const e = E.estrella;
    if (!e) return;
    E.estrella = null;
    E.estrellaObj.visible = false;
    if (e.resolver) e.resolver();
}

function actualizarEstrella(dt) {
    const e = E.estrella;
    if (!e) return;
    e.t += dt;
    const u = clamp01(e.t / e.dur);
    const s = lerp(e.s0, e.s1, suave(u));
    const p = aMundoLocal(s, PLANO_Y + 0.6 + Math.sin(u * Math.PI) * 0.35);
    const g = E.estrellaObj;
    g.visible = true;
    g.position.copy(p);
    g.userData.malla.rotation.y += dt * 6;
    const k = u < 0.08 ? u / 0.08 : (u > 0.92 ? (1 - u) / 0.08 : 1);
    g.scale.setScalar(Math.max(0.01, k));
    if (!E.menosEfectos || Math.random() < 0.5) {
        ES.emitir({ p: p, v: [azar(-0.3, 0.3), azar(-0.1, 0.5), azar(-0.3, 0.3)], color: Math.random() < 0.5 ? COL.oro : 0xffffff, vida: 0.9, tam: 0.36, tamFin: 0.04, grav: 0.4 });
        CH.emitir({ p: p, v: [0, 0, 0], color: 0xfff3bf, vida: 0.5, tam: 0.7, tamFin: 0.1 });
    }
    if (u >= 1) {
        destellos(p, null, 16, 2.6, 0.32);
        emitir("estrellaFin");
        terminarEstrella();
    }
}

// ------------------------------------------------------------------ tren: animación en espera y viaje

function actualizarTren(t, dt, enEspera) {
    if (!t) return;
    const r = E.reloj;
    if (enEspera) {
        // respira: se balancea apenas, las ruedas se mecen y echa vapor de vez en cuando
        const k = E.trazo && E.est ? E.est.s / E.trazo.largo : 0;
        t.cuerpo.position.y = PLANO_Y + Math.sin(r * 3.2) * 0.02;
        t.dySalto = 0;                    // la altura se acaba de fijar: el saltito empieza desde aquí
        t.cuerpo.rotation.z = -0.02 * k + Math.sin(r * 1.6) * 0.012;      // se inclina hacia adelante con el avance
        const meneo = Math.sin(r * 1.6) * 0.012 * (1 + k * 2);
        t.ruedas.forEach(function (w) { w.g.rotation.z = meneo / w.r * 0.3; });
        t.vagones.forEach(function (v, i) { v.cuerpo.position.y = PLANO_Y + Math.sin(r * 3.2 + 1 + i) * 0.015; });
        t.vaporT = (t.vaporT || 0) - dt;
        if (t.vaporT <= 0) {
            t.vaporT = k > 0.02 ? lerp(0.9, 0.35, k) : 1.4;
            vapor(t.boca.getWorldPosition(V2), 1);
        }
    }
    // los ojos miran hacia la punta de la vía
    if (E.trazo && t.ojos.length && !E.cine) {
        const objetivo = enEspera ? Math.min(1, E.sVis / 3) : 0;
        t.ojos.forEach(function (o) { o.position.z = lerp(o.position.z, 0.02 * Math.sin(r * 0.7), 0.1); o.position.y = -0.01 - objetivo * 0.015; });
    }
    const flick = 1.1 + Math.sin(r * 9) * 0.08 + Math.sin(r * 23) * 0.05 + (t.brillo || 0);
    t.faro.material.emissiveIntensity = flick;
    t.halo.material.opacity = 0.45 + (t.brillo || 0) * 0.4 + Math.sin(r * 9) * 0.05;
    t.brillo = Math.max(0, (t.brillo || 0) - dt * 0.8);
    // saltito (hito, llegada): se quita el desplazamiento del cuadro anterior antes de poner el nuevo. Antes se
    // sumaba sin descontar y, mientras el tren no estaba en espera (al llegar a la estación o en la cinemática),
    // la cabina subía y quedaba flotando.
    t.cuerpo.position.y -= t.dySalto || 0;
    t.dySalto = 0;
    if (t.salto) {
        t.salto = Math.max(0, t.salto - dt * 3);
        t.dySalto = Math.sin((1 - t.salto) * Math.PI) * 0.18;
        t.cuerpo.position.y += t.dySalto;
    }
}

/** Fases del viaje: activar la vía → anticipación → marcha → llegada. */
function viajar() {
    const t = E.trazo;
    const tren = E.tren;
    if (!t || !tren) return Promise.resolve();
    if (E.viaje && E.viaje.resolver) E.viaje.resolver();
    return new Promise(function (resolve) {
        // del inicio de este hueco a la estación siguiente (o hasta el tope si es la última)
        const i = VIA.idx;
        const ultimo = i + 1 >= VIA.tramos.length;
        const s0 = sTrenEn(i);
        const s1 = ultimo ? VIA.ruta.sEstaciones[i + 1] + S_TREN_LLEGADA_EXTRA : sTrenEn(i + 1);
        const durMarcha = reducido ? 1.2 : Math.max(2.6, (s1 - s0) / 5.5);
        E.viaje = { fase: "activar", t: 0, s0: s0, s1: s1, s: s0, durMarcha: durMarcha, pitos: 0, chu: 0, resolver: resolve, destino: VIA.estaciones[i + 1], ultimo: ultimo };
        emitir("activar");
        setTimeout(function () {
            if (E.viaje && E.viaje.resolver === resolve) {
                ponerTren(tren, VIA.camino, s1);
                E.viaje = null;
                resolve();
            }
        }, (durMarcha + 5.5) * 1000);
    });
}

function actualizarViaje(dt) {
    const v = E.viaje;
    if (!v) return;
    const t = E.trazo;
    const tren = E.tren;
    v.t += dt;
    if (v.fase === "activar") {
        // un barrido de luz dorada recorre la vía terminada y todos los puntos brillan
        const u = clamp01(v.t / 0.9);
        const p = aMundoLocal(u * t.largo, PLANO_Y + 0.15);
        CH.emitir({ p: p, v: [0, 1.6, 0], color: COL.oro, vida: 0.8, tam: 1.1, tamFin: 0.1 });
        if (Math.random() < 0.6) ES.emitir({ p: p, v: [azar(-1, 1), azar(1, 2.4), azar(-1, 1)], color: COL.turquesa, vida: 0.9, tam: 0.34, tamFin: 0.05, grav: 1.6 });
        vis().matRiel.emissiveIntensity = 0.35 + Math.sin(u * Math.PI) * 1.4;
        if (u >= 1) {
            v.fase = "anticipa";
            v.t = 0;
            vis().matRiel.emissiveIntensity = 0.75;
            emitir("pitido");
            tren.brillo = 1;
        }
        return;
    }
    if (v.fase === "anticipa") {
        // se encoge hacia atrás, echa una nube de vapor y arranca
        const u = clamp01(v.t / 0.75);
        const atras = Math.sin(u * Math.PI) * 0.22;
        ponerTren(tren, VIA.camino, v.s0 - atras);
        const sq = Math.sin(u * Math.PI);
        tren.cuerpo.scale.set(1 - sq * 0.07, 1 + sq * 0.08, 1);
        if (Math.random() < 0.5) vapor(tren.boca.getWorldPosition(V2), 1.8);
        if (u >= 1) {
            tren.cuerpo.scale.set(1, 1, 1);
            v.fase = "marcha";
            v.t = 0;
            emitir("arranca");
        }
        return;
    }
    if (v.fase === "marcha") {
        const u = clamp01(v.t / v.durMarcha);
        // acelera, avanza y frena suave al llegar
        const k = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const s = lerp(v.s0, v.s1, k);
        const ds = s - v.s;
        v.s = s;
        ponerTren(tren, VIA.camino, s);
        girarRuedas(tren, ds);
        const vel = ds / Math.max(1e-4, dt);
        tren.cuerpo.rotation.z = -Math.min(0.05, vel * 0.008) * (u < 0.5 ? 1 : -0.6);
        tren.cuerpo.position.y = PLANO_Y + Math.abs(Math.sin(E.reloj * 14)) * 0.02 * Math.min(1, vel / 3);
        tren.dySalto = 0;
        v.chu += ds;
        if (v.chu > 0.95) {
            v.chu = 0;
            emitir("chuchu");
            vapor(tren.boca.getWorldPosition(V2), 1.3);
        }
        if (u > 0.82 && v.pitos === 0) {
            v.pitos = 1;
            emitir("pitido");
        }
        if (u >= 1) {
            v.fase = "llega";
            v.t = 0;
            tren.salto = 1;
            tren.cuerpo.rotation.z = 0;
            const pe = v.destino.grupo.position;
            celebrarEstacion(v.destino, new THREE.Vector3(pe.x, 2.2, pe.z - 0.6));
            // la cámara se desliza hasta dejar a la vista la estación siguiente
            if (!v.ultimo) panear(VIA.idx + 1, 2.2);
            emitir("llegada");
        }
        return;
    }
    if (v.fase === "llega") {
        if (v.t > (v.ultimo ? 1.5 : 2.6)) {
            const r = v.resolver;
            E.viaje = null;
            if (r) r();
        }
    }
}

function celebrarEstacion(est, p) {
    est.fiesta = 2.4;
    confeti(p, 70, 1.4, 0.4);
    destellos(p, null, 18, 3, 0.36);
    est.saltan.forEach(function (s) { s.userData.salto = 1; });
}

function actualizarEstacion(est, dt) {
    if (!est) return;
    const r = E.reloj;
    const fiesta = est.fiesta || 0;
    est.banderas.forEach(function (b) {
        b.rotation.x = Math.sin(r * (fiesta > 0 ? 9 : 2.4) + b.userData.fase) * (fiesta > 0 ? 0.45 : 0.18);
    });
    if (est.banderaMeta) {
        const pos = est.banderaMeta.geometry.attributes.position;
        const base = est.banderaBase;
        for (let i = 0; i < pos.count; i++) {
            const x = base[i * 3];
            pos.array[i * 3 + 2] = Math.sin(r * (fiesta > 0 ? 9 : 4) + x * 6) * 0.08 * (x + 0.4);
        }
        pos.needsUpdate = true;
    }
    est.luces.forEach(function (l, i) { l.material.emissiveIntensity = 0.8 + Math.sin(r * 2 + i) * 0.15 + fiesta * 0.4; });
    est.saltan.forEach(function (s) {
        if (s.userData.salto) {
            s.userData.salto = Math.max(0, s.userData.salto - dt * 1.8);
            s.position.y = Math.abs(Math.sin((1 - s.userData.salto) * Math.PI * 3)) * 0.25 * s.userData.salto;
        }
    });
    est.globos.forEach(function (gl) {
        gl.position.y = Math.sin(r * 1.6 + gl.userData.fase) * 0.15 + (gl.userData.suelto ? (gl.userData.suelto += dt * 1.6) : 0);
        gl.rotation.z = Math.sin(r * 1.2 + gl.userData.fase) * 0.08;
    });
    if (est.estrella) est.estrella.rotation.y += dt * 1.2;
    est.fiesta = Math.max(0, fiesta - dt);
}

// ------------------------------------------------------------------ cinemática final «El gran viaje de colores»

const CINE = { grupo: null, estacionInicio: null, estacionFinal: null, agua: null };
const CINE_A = 0;           // frente del tren al empezar (el tren de 4 vagones cabe sin tocar árboles)
const CINE_META = 58.5;     // frente del tren al llegar a la gran estación (el último vagón ya fuera del túnel)
const CINE_RIO = [18.5, 25.5];
const CINE_TUNEL = [32.2, 43.8];

function crearMundoCine(scene) {
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    CINE.grupo = g;
    // El grupo del gran viaje se coloca al empezar la cinemática, justo después de la última estación del nivel
    // 4 (su x local 0 es el frente del tren detenido allí). La vía se arma también entonces (CINE.via).
    // río y puente de arcos
    const rio = malla(new THREE.PlaneGeometry(CINE_RIO[1] - CINE_RIO[0], 90), new THREE.MeshLambertMaterial({ map: TX.agua.clone() }), (CINE_RIO[0] + CINE_RIO[1]) / 2, 0.02, 0, g, false);
    rio.rotation.x = -Math.PI / 2;
    rio.material.map.needsUpdate = true;
    rio.material.map.repeat.set(2, 22);
    CINE.agua = rio.material.map;
    [CINE_RIO[0] - 0.4, CINE_RIO[1] + 0.4].forEach(function (x) {
        const orilla = malla(caja(0.8, 0.18, 90), mat(0xd8c08a, { r: 0.9 }), x, 0.06, 0, g, false);
        orilla.receiveShadow = true;
    });
    const puente = new THREE.Group();
    g.add(puente);
    malla(caja(CINE_RIO[1] - CINE_RIO[0] + 1.6, 0.18, 1.8), mat(0xff6b6b, { r: 0.5 }), (CINE_RIO[0] + CINE_RIO[1]) / 2, 0.02, 0, puente);
    [CINE_RIO[0] + 1.75, (CINE_RIO[0] + CINE_RIO[1]) / 2, CINE_RIO[1] - 1.75].forEach(function (x) {
        [-0.85, 0.85].forEach(function (z) {
            const arco = malla(new THREE.TorusGeometry(1.15, 0.14, 8, 20, Math.PI), mat(0xffd43b, { r: 0.4 }), x, 0.02, z, puente);
            arco.rotation.z = Math.PI;
        });
    });
    [-0.95, 0.95].forEach(function (z) {
        malla(caja(CINE_RIO[1] - CINE_RIO[0] + 1.6, 0.08, 0.08), mat(0xffffff), (CINE_RIO[0] + CINE_RIO[1]) / 2, 0.85, z, puente);
        for (let x = CINE_RIO[0] - 0.6; x <= CINE_RIO[1] + 0.6; x += 0.9) malla(cilindro(0.05, 0.05, 0.75, 8), mat(0xffffff), x, 0.45, z, puente);
    });
    // montaña del túnel
    const mx = (CINE_TUNEL[0] + CINE_TUNEL[1]) / 2;
    const monte = malla(esfera(1, 18, 12), mat(0x6fbd52, { r: 0.9, flat: true }), mx, -0.4, -0.6, g);
    monte.scale.set((CINE_TUNEL[1] - CINE_TUNEL[0]) / 2 + 0.2, 6.2, 5.8);
    const pico = malla(new THREE.ConeGeometry(3.2, 3.4, 8), mat(0x9aa0e6, { r: 0.8, flat: true }), mx, 6.6, -1.2, g);
    malla(new THREE.ConeGeometry(1.3, 1.4, 8), mat(0xffffff, { flat: true }), 0, 1.05, 0, pico);
    [CINE_TUNEL[0] + 0.35, CINE_TUNEL[1] - 0.35].forEach(function (x, i) {
        const portal = new THREE.Group();
        portal.position.set(x, 0, 0);
        portal.rotation.y = i ? Math.PI / 2 : -Math.PI / 2;
        g.add(portal);
        const boca = malla(new THREE.CircleGeometry(1.45, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1a1430 }), 0, 0, 0.02, portal, false);
        void boca;
        malla(new THREE.TorusGeometry(1.5, 0.22, 8, 22, Math.PI), mat(0xbfc4d6, { r: 0.8, flat: true }), 0, 0, 0.05, portal);
    });
    // árboles del kit a lo largo del viaje (solo detrás de la vía: la cámara va por delante)
    semilla = 99;
    const porModelo = {};
    ARBOLES.forEach(function (r) { porModelo[r] = []; });
    for (let i = 0; i < 30; i++) {
        const x = rr(-6, CINE_META + 8);
        if (x > CINE_RIO[0] - 1 && x < CINE_RIO[1] + 1) continue;
        if (x > CINE_TUNEL[0] - 1 && x < CINE_TUNEL[1] + 1) continue;
        const r = ARBOLES[i % ARBOLES.length];
        porModelo[r].push([x, -rr(3.6, 10), ALTO_ARBOL[r] * rr(0.6, 0.85), rr(0, 6)]);
    }
    ARBOLES.forEach(function (r) { instanciarKit(g, r, porModelo[r]); });
    instanciarKit(g, "02_vegetacion/arbusto", [[-3, -2.6, 1, 0], [9, -2.8, 0.9, 1], [15, -2.7, 1, 2], [47, -2.8, 1, 3], [52, -2.9, 0.9, 4]]);

    // gran estación final
    const gran = crearEstacion("gran");
    gran.grupo.position.set(CINE_META - 1, 0, 0);
    g.add(gran.grupo);
    CINE.estacionFinal = gran;
}

/**
 * Camino del gran viaje: la ruta del nivel hasta el frente del tren, una curva suave (8 de largo) que lo deja
 * mirando a +x y después una recta larga. Así el tren y sus vagones siguen la vía real hacia atrás y el mundo
 * del viaje (río, puente, túnel, gran estación) queda alineado con x.
 */
const CINE_CURVA = 8;
function prepararCaminoCine(tc) {
    const sF = tc.s;
    const pts = [];
    for (let s = 0; s < sF - 0.25; s += 0.5) {
        const q = R().punto(VIA.camino, s);
        pts.push([q.x, q.z]);
    }
    const p0 = R().puntoExt(VIA.camino, sF);
    const d0 = R().direccion(VIA.camino, sF);
    pts.push([p0.x, p0.z]);
    const th0 = Math.atan2(d0.uz, d0.ux);
    let x = p0.x, z = p0.z;
    const n = 32;
    for (let i = 1; i <= n; i++) {
        const th = th0 * (1 - suave((i - 0.5) / n));
        x += Math.cos(th) * CINE_CURVA / n;
        z += Math.sin(th) * CINE_CURVA / n;
        pts.push([x, z]);
    }
    pts.push([x + 160, z]);
    CINE.linea = R().construir({ puntos: pts });
    CINE.sOff = R().proyectar(CINE.linea, p0).s;
    // x local del grupo ≈ distancia recorrida desde el frente del tren
    CINE.grupo.position.set(x - CINE_CURVA, 0, z);
    // vía del gran viaje: desde la última estación hasta el tope de la gran estación
    if (CINE.via) {
        E.scene.remove(CINE.via);
        liberar(CINE.via);
    }
    CINE.via = new THREE.Group();
    E.scene.add(CINE.via);
    const ultima = VIA.ruta.estaciones[VIA.ruta.estaciones.length - 1];
    const sEst = R().proyectar(CINE.linea, ultima).s;
    viaFija(CINE.via, CINE.linea, sEst, CINE.sOff + CINE_META + 3, { riel: 0x2f7bff, traviesa: 0xb7773f, balasto: 0xd8cbb8 });
    topeVia(CINE.via, CINE.linea, CINE.sOff + CINE_META + 3.2, false);
}

/** Punto del mundo a partir de coordenadas locales del gran viaje. */
function enCine(x, y, z) {
    return new THREE.Vector3(CINE.grupo.position.x + x, y, CINE.grupo.position.z + z);
}

/** Los vagones de los otros niveles, en el orden de los niveles, detrás del vagón del tren actual. */
function vagonesExtra(tc) {
    const colores = ((E.cfg && E.cfg.vias) || []).map(function (v) { return v.color; }).filter(function (c) { return c && c !== tc.paleta && PALETAS[c]; });
    return colores.map(function (c) {
        const P = PALETAS[c];
        const v = crearVagon(P.cuerpo, P.carga, false);
        malla(caja(0.3, 0.07, 0.07), mat(0x2b2f4a), 0.12, PLANO_Y + 0.42, 0, v.raiz, false);
        v.atras = 3.25 + 2.15 * tc.vagones.length;
        v.color = P.cuerpo;
        v.raiz.visible = false;
        tc.grupo.add(v.raiz);
        tc.vagones.push(v);
        tc.ruedas = tc.ruedas.concat(v.ruedas);
        return v;
    });
}

/** Tomas de cámara según dónde va el tren (se mezclan suave): de lado, puente bajo, túnel desde arriba, llegada. */
function tomaCine(x) {
    const tomas = [
        { x: -1, off: [2.5, 4.6, 12.5], mira: [1.5, 0.9, 0] },
        { x: 10, off: [3.5, 3.4, 10.5], mira: [3, 1, 0] },
        { x: 20, off: [-3.5, 1.8, 8.5], mira: [2.5, 1.2, 0] },
        { x: 29, off: [1.5, 9.5, 15], mira: [3.5, 0.5, 0] },
        { x: 40, off: [4, 8.5, 14], mira: [4, 0.5, 0] },
        { x: 50, off: [8.5, 4.2, 10.5], mira: [2.5, 1.4, -0.6] },
        { x: CINE_META, off: [5.5, 4.6, 13], mira: [-2.5, 1.8, -1] }
    ];
    let i = 0;
    while (i < tomas.length - 2 && x > tomas[i + 1].x) i++;
    const a = tomas[i], b = tomas[i + 1];
    const u = suave((x - a.x) / (b.x - a.x));
    return {
        off: [lerp(a.off[0], b.off[0], u), lerp(a.off[1], b.off[1], u), lerp(a.off[2], b.off[2], u)],
        mira: [lerp(a.mira[0], b.mira[0], u), lerp(a.mira[1], b.mira[1], u), lerp(a.mira[2], b.mira[2], u)]
    };
}

function cinematica() {
    if (!CINE.grupo) return Promise.resolve();
    return new Promise(function (resolve) {
        // empieza en la última estación del nivel, con el mismo tren: la vía sigue hacia el gran viaje
        const tc = E.tren;
        E.trenCine = tc;
        if (VIA.hilo) VIA.hilo.visible = false;
        if (VIA.viaFin) VIA.viaFin.visible = false;
        if (VIA.topeFin) VIA.topeFin.visible = false;
        if (vis()) estadoTramo(vis(), "hecho");
        prepararCaminoCine(tc);
        CINE.grupo.visible = true;
        CINE.via.visible = true;
        const nuevos = vagonesExtra(tc);
        ponerTren(tc, CINE.linea, CINE.sOff);
        E.cine = { t: 0, x: CINE_A, fase: "acople", nuevos: nuevos, fuegos: 0, eventos: {}, resolver: resolve, pos: new THREE.Vector3(), mira: new THREE.Vector3() };
        emitir("cine", true);
        setTimeout(function () {
            if (E.cine && E.cine.resolver === resolve) {
                E.cine.resolver = null;
                resolve();
            }
        }, 24000);
    });
}

const CINE_DUR = { acople: 2.6, pita: 0.9, viaje: 10.5, fiesta: 3.6 };

function actualizarCine(dt) {
    const c = E.cine;
    if (!c) return;
    const tc = E.trenCine;
    c.t += dt;
    const una = function (k, fn) { if (!c.eventos[k]) { c.eventos[k] = true; fn(); } };
    if (CINE.agua) CINE.agua.offset.y -= dt * 0.25;
    actualizarTren(tc, dt, c.fase === "acople" || c.fase === "pita");
    actualizarEstacion(CINE.estacionFinal, dt);
    VIA.estaciones.forEach(function (est) { actualizarEstacion(est, dt); });
    if (c.fase === "acople") {
        // los vagones de los otros trenes caen uno a uno y se enganchan detrás (uno por cada nivel)
        const cada = CINE_DUR.acople / 3.6;
        c.nuevos.forEach(function (v, i) {
            const t0 = 0.35 + i * cada;
            if (c.t >= t0) {
                if (!v.raiz.visible) {
                    v.raiz.visible = true;
                    emitir("cineEvento", "acople");
                }
                const u = clamp01((c.t - t0) / 0.5);
                v.raiz.position.y = u < 1 ? (1 - u) * (1 - u) * 3 + Math.sin(u * Math.PI) * 0.15 : 0;
                if (u >= 1 && !v.listo) {
                    v.listo = true;
                    destellos(v.raiz.getWorldPosition(V2).add(V1.set(0, 1.2, 0)), v.color, 12, 2.2, 0.3);
                }
            }
        });
        if (c.t >= CINE_DUR.acople) { c.fase = "pita"; c.t = 0; emitir("cineEvento", "pitido"); tc.brillo = 1; }
    } else if (c.fase === "pita") {
        if (Math.random() < 0.6) vapor(tc.boca.getWorldPosition(V2), 1.9);
        const sq = Math.sin(clamp01(c.t / CINE_DUR.pita) * Math.PI);
        tc.cuerpo.scale.set(1 - sq * 0.06, 1 + sq * 0.07, 1);
        if (c.t >= CINE_DUR.pita) { c.fase = "viaje"; c.t = 0; tc.cuerpo.scale.set(1, 1, 1); emitir("cineEvento", "arranca"); }
    } else if (c.fase === "viaje") {
        const u = clamp01(c.t / CINE_DUR.viaje);
        // velocidad: acelera 18 %, crucero y frena el último 15 % (integral normalizada)
        const x = CINE_A + (CINE_META - CINE_A) * perfilViaje(u);
        const dx = x - c.x;
        c.x = x;
        ponerTren(tc, CINE.linea, CINE.sOff + x);
        girarRuedas(tc, dx);
        const vel = dx / Math.max(1e-4, dt);
        tc.cuerpo.position.y = PLANO_Y + Math.abs(Math.sin(E.reloj * 14)) * 0.02 * Math.min(1, vel / 4);
        tc.dySalto = 0;
        c.chu = (c.chu || 0) + dx;
        if (c.chu > 1.2) {
            c.chu = 0;
            emitir("cineEvento", "chuchu");
            vapor(tc.boca.getWorldPosition(V2), 1.3);
        }
        if (x > CINE_RIO[0] - 1) una("puente", function () { emitir("cineEvento", "puente"); });
        if (x > CINE_TUNEL[0] - 1) una("tunel", function () { emitir("cineEvento", "tunel"); });
        if (x > CINE_TUNEL[1] + 1) una("salida", function () { emitir("cineEvento", "pitido"); tc.brillo = 1; });
        if (x > CINE_META - 6) una("llega", function () { emitir("cineEvento", "pitido"); });
        // estrellas que se desprenden de los vagones durante el viaje
        if (!E.menosEfectos && Math.random() < 0.4) {
            const v = tc.vagones[Math.floor(Math.random() * tc.vagones.length)];
            ES.emitir({ p: v.raiz.getWorldPosition(V2).add(V1.set(-0.9, 1.4, 0)), v: [azar(-1, 0), azar(0.6, 1.4), azar(-0.5, 0.5)], color: FIESTA[Math.floor(Math.random() * 6)], vida: 1, tam: 0.3, tamFin: 0.04, grav: 0.8 });
        }
        if (u >= 1) {
            c.fase = "fiesta";
            c.t = 0;
            tc.salto = 1;
            CINE.estacionFinal.globos.forEach(function (gl, i) { gl.userData.suelto = 0.001 + i * 0.05; });
            celebrarEstacion(CINE.estacionFinal, enCine(CINE_META - 1, 3, -1.5));
            emitir("cineEvento", "llegada");
            E.fiesta = true;
        }
    } else if (c.fase === "fiesta") {
        c.fuegos -= dt;
        if (c.fuegos <= 0) {
            c.fuegos = E.menosEfectos ? 0.7 : 0.38;
            fuegoArtificial(enCine(CINE_META - 1 + azar(-6, 5), azar(4.5, 7), azar(-4, -1)));
            if (Math.random() < 0.6) lluviaConfeti(enCine(CINE_META - 2, 6, 0), 16, 6);
        }
        if (c.t >= CINE_DUR.fiesta && c.resolver) {
            const r = c.resolver;
            c.resolver = null;
            r();
        }
    }
    // cámara de cine: sigue a la locomotora con tomas que se mezclan (las tomas eligen según la x del viaje)
    const x = c.fase === "acople" || c.fase === "pita" ? CINE_A : c.x;
    const toma = tomaCine(x);
    const loco = tc.raiz.position;
    let fx = loco.x, ox = toma.off[0], oy = toma.off[1], oz = toma.off[2];
    if (c.fase === "acople") {
        // se acerca desde la vista del juego a los vagones que se enganchan
        const u = suave(c.t / CINE_DUR.acople);
        oy = lerp(8, oy + 1, u);
        oz = lerp(18, oz + 2, u);
        fx = loco.x - 4.5;
    } else if (c.fase === "pita") {
        const u = suave(c.t / CINE_DUR.pita);
        fx = loco.x - 4.5 * (1 - u);
        oy += 1 - u;
        oz += 2 * (1 - u);
    } else if (c.fase === "fiesta") {
        // la cámara se aleja despacio para ver los fuegos
        const u = suave(c.t / CINE_DUR.fiesta);
        oy += u * 2.5;
        oz += u * 3.5;
    }
    c.pos.set(fx + ox, oy, loco.z + oz);
    c.mira.set(fx + toma.mira[0], toma.mira[1], loco.z + toma.mira[2]);
    if (!c.camIni) {
        // sin salto: parte de donde estaba la cámara del juego
        c.camIni = true;
        c.mirando = E.camBase.mira.clone();
    }
    const k = reducido ? 1 : 1 - Math.exp(-dt * 3.2);
    E.camera.position.lerp(c.pos, k);
    c.mirando.lerp(c.mira, k);
    E.camera.lookAt(c.mirando);
    // la luz del sol acompaña a la cámara para que haya sombras durante el viaje
    if (E.sol) {
        E.sol.position.set(c.mirando.x - 8, 16, c.mirando.z + 10);
        E.sol.target.position.set(c.mirando.x, 0, c.mirando.z);
    }
}

/** Avance normalizado 0..1 del viaje con aceleración (0..0,18), crucero y frenado (0,85..1). */
function perfilViaje(u) {
    const a = 0.18, b = 0.85;
    const vMax = 1 / (a / 2 + (b - a) + (1 - b) / 2);
    if (u < a) return vMax * u * u / (2 * a);
    if (u < b) return vMax * (a / 2 + (u - a));
    const w = u - b;
    return vMax * (a / 2 + (b - a) + w - w * w / (2 * (1 - b)));
}

function terminarFiesta() {
    E.fiesta = false;
}

// ------------------------------------------------------------------ calidad adaptable (tabletas)

// resolución de dibujo moderada (los personajes y la interfaz van aparte, en HTML)
const NIVELES = [
    { pr: function () { return Math.min(window.devicePixelRatio || 1, 1.5); }, sombras: true },
    { pr: function () { return Math.min(window.devicePixelRatio || 1, 1.25); }, sombras: false },
    { pr: function () { return Math.min(window.devicePixelRatio || 1, 1); }, sombras: false }
];

function esTableta() {
    const tactil = (navigator.maxTouchPoints || 0) > 0 || ("ontouchstart" in window);
    const grueso = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    return grueso || (tactil && Math.min(screen.width, screen.height) <= 1100);
}

function aplicarNivel(n) {
    E.nivel = Math.max(0, Math.min(NIVELES.length - 1, n));
    const nv = NIVELES[E.nivel];
    E.menosEfectos = E.nivel >= 2;
    if (E.renderer.shadowMap.enabled !== nv.sombras) {
        E.renderer.shadowMap.enabled = nv.sombras;
        E.scene.traverse(function (o) { if (o.isMesh && o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
    }
    reacomodar();
}

const RENDIMIENTO = { tiempo: 0, cuadros: 0, fps: 60, calentar: 4, bajos: 0 };

function medirRendimiento(dt) {
    if (document.hidden || dt <= 0) return;
    if (RENDIMIENTO.calentar > 0) {
        RENDIMIENTO.calentar -= dt;
        return;
    }
    RENDIMIENTO.tiempo += dt;
    RENDIMIENTO.cuadros++;
    if (RENDIMIENTO.tiempo < 2) return;
    RENDIMIENTO.fps = RENDIMIENTO.cuadros / RENDIMIENTO.tiempo;
    RENDIMIENTO.tiempo = 0;
    RENDIMIENTO.cuadros = 0;
    RENDIMIENTO.bajos = RENDIMIENTO.fps < 42 ? RENDIMIENTO.bajos + 1 : 0;
    if (RENDIMIENTO.bajos >= 2 && E.nivel < NIVELES.length - 1) {
        RENDIMIENTO.bajos = 0;
        aplicarNivel(E.nivel + 1);
    }
}

// ------------------------------------------------------------------ cámara, tamaño y proyección del puntero

/**
 * Zona que debe verse mientras se construye el hueco i: el tren esperando en su estación, el hueco y la estación
 * siguiente (con sus edificios). El resto de la ruta y del valle queda fuera de la pantalla; al llegar a la
 * estación, la cámara se desliza hasta la zona del hueco siguiente (panear). Sin ruta, toda la ZONA.
 */
const ANCHO_MIN = 17;          // en huecos cortos la cámara no se acerca más que esto
function zonaTramo(i) {
    if (!VIA.ruta || !VIA.camino || !VIA.tramos.length) return ZONA;
    const k = Math.max(0, Math.min(VIA.tramos.length - 1, i));
    const sE = VIA.ruta.sEstaciones;
    const ultima = k + 1 === sE.length - 1;
    const largoTren = E.tren && E.tren.largo ? E.tren.largo : 5.4;
    const a = Math.max(0, sE[k] - S_TREN_ANTES - largoTren - 0.5);
    const b = Math.min(VIA.camino.largo, sE[k + 1] + (ultima ? 3.4 : 2.4));
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let s = a; s <= b + 1e-6; s += 0.4) {
        const p = R().puntoExt(VIA.camino, s);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
        z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
    }
    if (x1 - x0 < ANCHO_MIN) {
        const c = (x0 + x1) / 2;
        x0 = c - ANCHO_MIN / 2;
        x1 = c + ANCHO_MIN / 2;
    }
    return { x0: x0, x1: x1, z0: z0 - 3.7, z1: z1 + 1.3, y1: 3.4 };
}

/**
 * Busca la distancia de la cámara para que la zona quepa con márgenes (sirve para 16:9 y 4:3). Devuelve
 * { pos, mira } sin dejar la cámara movida de forma permanente (el ciclo de render la coloca en cada cuadro).
 */
function encuadre(Z) {
    const cam = E.camera;
    const el = THREE.MathUtils.degToRad(ELEVACION);
    const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
    const centro = new THREE.Vector3((Z.x0 + Z.x1) / 2, 0.6, (Z.z0 + Z.z1) / 2 + 0.2);
    const esquinas = [];
    [Z.x0, Z.x1].forEach(function (x) {
        [0, Z.y1].forEach(function (y) {
            [Z.z0, Z.z1].forEach(function (z) { esquinas.push(new THREE.Vector3(x, y, z)); });
        });
    });
    const mira = new THREE.Vector3();
    const cabe = function (d) {
        cam.position.copy(centro).addScaledVector(dir, d);
        mira.copy(centro);
        mira.y += d * INCLINA;
        cam.lookAt(mira);
        cam.updateMatrixWorld();
        for (let i = 0; i < esquinas.length; i++) {
            const p = V1.copy(esquinas[i]).project(cam);
            if (p.x < -MARGEN.x || p.x > MARGEN.x || p.y > MARGEN.arriba || p.y < MARGEN.abajo) return false;
        }
        return true;
    };
    let lo = 4, hi = 120;
    for (let i = 0; i < 28; i++) {
        const mid = (lo + hi) / 2;
        if (cabe(mid)) hi = mid; else lo = mid;
    }
    cabe(hi * ALEJA);
    return { pos: cam.position.clone(), mira: mira.clone() };
}

/** Encuadre inmediato del hueco actual (al cargar el nivel o al cambiar el tamaño de la pantalla). */
function ajustarCamara() {
    const c = encuadre(zonaTramo(VIA.idx));
    if (E.pan) {
        // si se estaba deslizando, se rehace hacia el hueco al que iba
        const a = encuadre(zonaTramo(E.pan.i));
        E.pan.aPos.copy(a.pos);
        E.pan.aMira.copy(a.mira);
        return;
    }
    E.camBase.pos.copy(c.pos);
    E.camBase.mira.copy(c.mira);
}

/** La cámara se desliza (dur s) desde donde está hasta dejar a la vista el hueco i y su estación siguiente. */
function panear(i, dur) {
    const a = encuadre(zonaTramo(i));
    E.pan = {
        i: i, t: 0, dur: reducido ? 0.3 : (dur || 1.6),
        dPos: E.camBase.pos.clone(), dMira: E.camBase.mira.clone(),
        aPos: a.pos, aMira: a.mira
    };
    emitir("panea", { tramo: i });
}

function actualizarPaneo(dt) {
    const p = E.pan;
    if (!p) return;
    p.t += dt;
    const u = suavisimo(p.t / p.dur);
    E.camBase.pos.lerpVectors(p.dPos, p.aPos, u);
    E.camBase.mira.lerpVectors(p.dMira, p.aMira, u);
    if (p.t >= p.dur) E.pan = null;
}

function reacomodar() {
    if (!E.renderer || !E.host) return;
    const w = Math.max(10, E.host.clientWidth || window.innerWidth);
    const h = Math.max(10, E.host.clientHeight || window.innerHeight);
    E.renderer.setPixelRatio(NIVELES[E.nivel].pr());
    E.renderer.setSize(w, h, true);
    E.camera.aspect = w / h;
    E.camera.fov = FOV;
    E.camera.updateProjectionMatrix();
    ajustarCamara();
    const px = h * E.renderer.getPixelRatio() / 2 / Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    E.escalaPx = px;
    if (CH) CH.mat.uniforms.escala.value = px;
    if (ES) ES.mat.uniforms.escala.value = px;
}

function aPantalla(x, y, z) {
    if (!E.camera || !E.host) return { x: 0, y: 0 };
    const v = new THREE.Vector3(x, y, z || 0).project(E.camera);
    const r = E.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
}

const RAYO = new THREE.Raycaster();
const PLANO = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANO_Y);
const NDC = new THREE.Vector2();
const CORTE = new THREE.Vector3();

/** Rayo desde la cámara por el punto de la pantalla hasta el plano de la vía: punto del mundo { x, z }. */
function aMundo(cx, cy) {
    const r = E.renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    NDC.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    E.camera.updateMatrixWorld();
    RAYO.setFromCamera(NDC, E.camera);
    const p = RAYO.ray.intersectPlane(PLANO, CORTE);
    return p ? { x: p.x, z: p.z } : null;
}

// ------------------------------------------------------------------ entrada (Pointer Events)

function enlazarEntrada(canvas) {
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", function (ev) {
        if (ev.isPrimary === false) return;
        if (ev.button != null && ev.button > 0) return;
        ev.preventDefault();
        if (!E.entradaOn || E.ptrId !== null || !E.trazo || E.viaje || E.cine) return;
        const p = aMundo(ev.clientX, ev.clientY);
        if (!p) return;
        const r = R().tocar(E.trazo, E.est, p);
        if (r.ok) {
            E.ptrId = ev.pointerId;
            E.dedo = p;
            E.velTrazo = 0;
            try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* puntero sintético */ }
            if (r.evento === "inicio") {
                destellos(aMundoLocal(0, PLANO_Y + 0.4), COL.oro, 14, 2.4, 0.32);
                E.tren.brillo = 0.8;
                vapor(E.tren.boca.getWorldPosition(V2), 1.4);
            }
            emitir(r.evento, { s: E.est.s });
        } else {
            E.alerta = 1;
            E.destelloInicio = 1;
            emitir("tocaFuera", { motivo: r.motivo, x: ev.clientX, y: ev.clientY });
        }
    }, { passive: false });
    const mover = function (ev) {
        if (ev.pointerId !== E.ptrId) return;
        ev.preventDefault();
        const p = aMundo(ev.clientX, ev.clientY);
        if (p) E.dedo = p;
    };
    canvas.addEventListener("pointermove", mover, { passive: false });
    const fin = function (ev) {
        if (ev.pointerId !== E.ptrId) return;
        soltarPuntero();
    };
    canvas.addEventListener("pointerup", fin);
    canvas.addEventListener("pointercancel", fin);
    canvas.addEventListener("lostpointercapture", fin);
    window.addEventListener("blur", function () { if (E.ptrId !== null) soltarPuntero(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden && E.ptrId !== null) soltarPuntero(); });
}

function soltarPuntero() {
    const id = E.ptrId;
    E.ptrId = null;
    E.velTrazo = 0;
    try { if (id != null && E.renderer.domElement.hasPointerCapture && E.renderer.domElement.hasPointerCapture(id)) E.renderer.domElement.releasePointerCapture(id); } catch (e) { /* ya liberado */ }
    if (E.est && R().soltar(E.est)) emitir("soltar", { s: E.est.s, k: E.est.s / E.trazo.largo });
}

function procesarTrazo(dt) {
    if (!E.trazo || !E.dedo) return;
    if (E.ptrId === null && !E.demoPtr) return;
    const antes = E.est.s;
    const eventos = R().mover(E.trazo, E.est, E.dedo, dt);
    const ds = E.est.s - antes;
    E.velTrazo = lerp(E.velTrazo, dt > 0 ? ds / dt : 0, 0.25);
    eventos.forEach(function (ev) {
        if (ev === "avance") {
            if (E.reloj - E.tAvance > 0.05) {
                E.tAvance = E.reloj;
                emitir("avance", { s: E.est.s, k: E.est.s / E.trazo.largo, kNivel: kNivel(), vel: E.velTrazo, demo: E.demoPtr });
            }
        } else if (ev === "hito") {
            const p = aMundoLocal(E.est.s, PLANO_Y + 0.4);
            destellos(p, COL.oro, 16, 2.6, 0.34);
            if (E.tren) { E.tren.salto = 1; vapor(E.tren.boca.getWorldPosition(V2), 1.6); }
            if (!E.demoPtr) emitir("hito", { n: E.est.hitos, k: E.est.s / E.trazo.largo });
        } else if (ev === "fuera") {
            E.alerta = 1;
            if (!E.demoPtr) emitir("fuera", { motivo: E.est.motivo });
        } else if (ev === "vuelve") {
            if (!E.demoPtr) emitir("vuelve");
        } else if (ev === "meta") {
            const id = E.ptrId;
            E.ptrId = null;
            E.velTrazo = 0;
            try { if (id != null) E.renderer.domElement.releasePointerCapture(id); } catch (e) { /* noop */ }
            destellos(aMundoLocal(E.trazo.largo, PLANO_Y + 0.5), null, 24, 3, 0.36);
            emitir("meta", { demo: E.demoPtr });
        }
    });
    if (E.est.estado !== "trazando") E.velTrazo = lerp(E.velTrazo, 0, 0.3);
}

// ------------------------------------------------------------------ ciclo de render (uno solo)

function tick() {
    const ahora = performance.now();
    let dt = (ahora - (E.ultimoCuadro || ahora)) / 1000;
    E.ultimoCuadro = ahora;
    dt = Math.max(0, Math.min(0.1, dt));
    E.reloj += dt;
    medirRendimiento(dt);
    procesarTrazo(dt);
    actualizarVia(dt);
    actualizarEstrella(dt);
    if (!E.cine) {
        actualizarTren(E.tren, dt, !E.viaje);
        actualizarViaje(dt);
        VIA.estaciones.forEach(function (est) { actualizarEstacion(est, dt); });
    } else {
        actualizarCine(dt);
    }
    // nubes, animalitos y estrellas
    actualizarPaisaje(dt);
    E.estrellasDeco.forEach(function (s) {
        s.rotation.y += dt * 0.8;
        s.position.y = s.userData.y + Math.sin(E.reloj * 1.2 + s.userData.fase) * 0.25;
    });
    if (E.fiesta && !E.cine) {
        E.fiestaT = (E.fiestaT || 0) - dt;
        if (E.fiestaT <= 0) {
            E.fiestaT = 0.5;
            lluviaConfeti(new THREE.Vector3(E.camBase.mira.x, 8, -1), 14, 9);
        }
    }
    CH.actualizar(dt);
    ES.actualizar(dt);
    actualizarVapor(dt);
    actualizarConfeti(dt);
    if (!E.cine) {
        // la cámara de juego: entra desde un poco más lejos, se desliza entre estaciones y flota apenas
        actualizarPaneo(dt);
        E.camIntro = Math.max(0, E.camIntro - dt / 1.8);
        const u = suave(E.camIntro);
        E.camera.position.copy(E.camBase.pos);
        E.camera.position.y += u * 3.5;
        E.camera.position.z += u * 4;
        if (!reducido) {
            E.camera.position.x += Math.sin(E.reloj * 0.21) * 0.08;
            E.camera.position.y += Math.sin(E.reloj * 0.29) * 0.05;
        }
        E.camera.lookAt(E.camBase.mira);
        // el sol (y su caja de sombras) acompaña a la cámara a lo largo de la ruta
        E.sol.position.set(E.camBase.mira.x - 8, 16, 10);
        E.sol.target.position.set(E.camBase.mira.x, 0, 0);
    }
    E.renderer.render(E.scene, E.camera);
}

// ------------------------------------------------------------------ montaje

function webglDisponible() {
    try {
        const c = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
        return false;
    }
}

function montar(host, cfg) {
    if (E.renderer) return Promise.resolve(true);
    E.host = host;
    E.cfg = cfg;
    if (!webglDisponible()) {
        host.classList.add("sin-webgl");
        return Promise.resolve(false);
    }
    const tableta = esTableta();
    // en tableta sin antialias (ahorra memoria de video en equipos de 4 GB); la calidad baja sola si faltan cuadros
    const renderer = new THREE.WebGLRenderer({ antialias: !tableta, powerPreference: "high-performance" });
    E.nivel = tableta ? 1 : 0;
    renderer.setPixelRatio(NIVELES[E.nivel].pr());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = NIVELES[E.nivel].sombras;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    E.renderer = renderer;

    const scene = new THREE.Scene();
    crearTexturas();
    scene.background = TX.cielo;
    scene.fog = new THREE.Fog(0xd8f0ff, 90, 260);
    E.scene = scene;
    E.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 420);

    scene.add(new THREE.HemisphereLight(0xd6eeff, 0x8fbf6a, 1.35));
    const sol = new THREE.DirectionalLight(0xfff1d6, 2.1);
    sol.position.set(-8, 16, 10);
    sol.target.position.set(0, 0, 0);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -22;
    sol.shadow.camera.right = 22;
    sol.shadow.camera.top = 13;
    sol.shadow.camera.bottom = -13;
    sol.shadow.camera.near = 1;
    sol.shadow.camera.far = 50;
    sol.shadow.bias = -0.0006;
    sol.shadow.normalBias = 0.02;
    scene.add(sol, sol.target);
    E.sol = sol;

    crearReservas(scene);
    const kit = crearPaisaje(scene);
    // hilo punteado ámbar de la punta al dedo cuando se sale del carril (en coordenadas del mundo)
    VIA.hilo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xffa94d, dashSize: 0.22, gapSize: 0.16, depthTest: false, transparent: true }));
    VIA.hilo.renderOrder = 20;
    VIA.hilo.frustumCulled = false;
    VIA.hilo.visible = false;
    scene.add(VIA.hilo);
    crearEstrellaGuia(scene);
    crearMundoCine(scene);

    enlazarEntrada(renderer.domElement);
    reacomodar();
    E.camera.position.copy(E.camBase.pos);
    E.camera.lookAt(E.camBase.mira);
    if (typeof ResizeObserver === "function") new ResizeObserver(reacomodar).observe(host);
    renderer.setAnimationLoop(tick);
    // respaldo: si el navegador deja de dar cuadros, la escena sigue avanzando
    setInterval(function () {
        if (performance.now() - E.ultimoCuadro > 250) tick();
    }, 120);
    E.listo = true;
    // se espera a los modelos del kit (con tope: si la red es lenta, el juego sigue y aparecen al llegar)
    return Promise.race([kit, sleep(9000)]).then(function () {
        try { renderer.compile(scene, E.camera); } catch (e) { /* noop */ }
        return true;
    });
}

// ------------------------------------------------------------------ API para script.js

/**
 * Prepara el nivel: ruta nueva al azar (estaciones y huecos), vías vacías y el tren del color del nivel esperando
 * en la primera estación. Devuelve { tramos } (cuántos huecos hay que construir).
 */
function cargar(def) {
    if (!E.listo) return null;
    E.viaje = null;
    // si se vuelve a jugar después del final, se apaga el mundo del gran viaje
    E.cine = null;
    E.trenCine = null;
    if (CINE.grupo) CINE.grupo.visible = false;
    if (CINE.via) CINE.via.visible = false;
    E.fiesta = false;
    if (E.estrella) terminarEstrella();
    construirNivel(def || {});
    activarTramo(0);
    if (E.tren) {
        E.scene.remove(E.tren.grupo);
        liberar(E.tren.grupo);
    }
    E.tren = crearTren((def && def.color) || "rojo");
    E.scene.add(E.tren.grupo);
    ponerTren(E.tren, VIA.camino, sTrenEn(0));
    E.pan = null;
    ajustarCamara();
    return { tramos: VIA.tramos.length };
}

/** Tras el viaje: el hueco siguiente queda listo para construir (el tren ya espera en su estación). */
function siguienteTramo() {
    if (VIA.idx + 1 >= VIA.tramos.length) return null;
    activarTramo(VIA.idx + 1);
    if (E.tren) ponerTren(E.tren, VIA.camino, sTrenEn(VIA.idx));
    if (!E.pan) ajustarCamara();
    return { tramo: VIA.idx, tramos: VIA.tramos.length };
}

function presentar() {
    E.camIntro = reducido ? 0 : 1;
    if (E.tren) {
        E.tren.brillo = 1;
        E.tren.salto = 1;
    }
    setTimeout(function () {
        if (E.tren) vapor(E.tren.boca.getWorldPosition(V2), 1.8);
        emitir("pitidoCorto");
    }, 700);
    return sleep(1700);
}

function estado() {
    if (!E.est || !E.trazo) return null;
    return { estado: E.est.estado, s: E.est.s, largo: E.trazo.largo, k: E.est.s / E.trazo.largo, kNivel: kNivel(), tramo: VIA.idx, tramos: VIA.tramos.length, motivo: E.est.motivo, agarrado: E.ptrId !== null };
}

function puntoPantalla(s) {
    if (!E.trazo) return { x: 0, y: 0 };
    const p = aMundoLocal(s, PLANO_Y);
    return aPantalla(p.x, p.y, p.z);
}

function entrada(on) {
    E.entradaOn = !!on;
    if (!on && E.ptrId !== null) soltarPuntero();
}

// demostración: el "dedo" de la mano sigue las reglas reales
function tomarDemo() {
    if (!E.trazo) return;
    E.demoPtr = true;
    E.dedo = R().punto(E.trazo, 0);
    R().tocar(E.trazo, E.est, E.dedo);
    vapor(E.tren.boca.getWorldPosition(V2), 1.4);
}
function moverDemo(s) {
    if (!E.trazo) return;
    E.dedo = R().punto(E.trazo, s);
}
function soltarDemo() {
    if (E.est) R().soltar(E.est);
}
/** Deshace lo construido (tras la demo): la vía se recoge y la punta vuelve al INICIO. */
function reiniciarTrazo() {
    E.demoPtr = false;
    E.dedo = null;
    E.ptrId = null;
    if (E.est) R().reiniciar(E.est);
}

function pulsoAyuda() {
    E.ayuda = 3;
    E.destelloInicio = 1;
    if (E.est && E.trazo) estrellaGuia(E.est.s, 1800);
}
function limpiarAyuda() { E.ayuda = 0; }

window.EscenarioTren = {
    montar: montar,
    listo: function () { return E.listo; },
    al: function (nombre, fn) {
        (E.oyentes[nombre] = E.oyentes[nombre] || []).push(fn);
    },
    cargar: cargar,
    siguienteTramo: siguienteTramo,
    ruta: function () { return VIA.ruta; },
    presentar: presentar,
    estrellaGuia: estrellaGuia,
    entrada: entrada,
    estado: estado,
    aPantalla: aPantalla,
    aMundo: aMundo,
    puntoPantalla: puntoPantalla,
    puntaPantalla: function () { return E.est ? puntoPantalla(E.est.s) : { x: 0, y: 0 }; },
    tomarDemo: tomarDemo,
    moverDemo: moverDemo,
    soltarDemo: soltarDemo,
    reiniciarTrazo: reiniciarTrazo,
    pulsoAyuda: pulsoAyuda,
    limpiarAyuda: limpiarAyuda,
    destelloInicio: function () { E.destelloInicio = 1; },
    viajar: viajar,
    cinematica: cinematica,
    terminarFiesta: terminarFiesta,
    reacomodar: reacomodar,
    calidad: function () { return { nivel: E.nivel, fps: Math.round(RENDIMIENTO.fps), pr: E.renderer ? E.renderer.getPixelRatio() : 0, sombras: E.renderer ? E.renderer.shadowMap.enabled : false, llamadas: E.renderer ? E.renderer.info.render.calls : 0 }; },
    step: function () { tick(); },
    _E: E
};
