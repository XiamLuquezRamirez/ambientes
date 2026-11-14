/**
 * AulaPista — la escena 3D completa de "¡La Pista de Patrones de Huellas y Ritmo!" (window.AulaPista).
 *
 * Una sola escena three.js y UNA sola cámara para todo, así la perspectiva siempre cuadra:
 *   - un aula de Polimotor simulada con geometría sencilla (piso de duela de madera, pared con letrero, paredes de
 *     escalada, espalderas, aros, colchonetas, piscina de pelotas y túnel). No se carga el GLB del aula de la
 *     intro: pesa demasiado para la partida (decisión del usuario);
 *   - sobre el piso, una colchoneta de entrenamiento con las cinco plataformas (bloques con grosor; la tapa lleva
 *     la huella y el nombre dibujados en una textura), el carril de Zeus con sus hitos y tramos por ronda, la
 *     línea de SALIDA, el arco de META de pie, conos y los letreros IZQUIERDA / DERECHA pintados en el piso;
 *   - Zeus (el GLB compartido `SimonDiceCorporal/zeus_animado_suave.glb`) caminando sobre ese piso. Solo usa los
 *     clips del modelo: cada huella es su clip (Levantar_brazo/pie_izquierdo/derecho, Saltar) y para avanzar
 *     Caminar. Al hacer una huella se pone de espaldas al niño, así su izquierda es la izquierda de la pantalla.
 *
 * Los toques se detectan con raycasting sobre las plataformas (ratón y dedo). La cámara mira la pista desde
 * delante y algo arriba (como un niño de pie frente a la pista), y se encuadra sola en el hueco que dejan la
 * cabecera y la fila de progreso.
 *
 * API (script.js; todo lo visual del juego pasa por aquí):
 *   montar(cfg, {alTocar, zonaLibre})  → Promise<boolean> (false si no hay WebGL o el aula no carga)
 *   listo()
 *   encender(id, on) · presionar(id) · rebotar(id) · energia(id) · saltito(id) · menear()
 *   foco(on)        las plataformas no encendidas se apagan (mientras se muestra la secuencia)
 *   habilitar(on)   turno del niño: las plataformas respiran y reaccionan al pasar el ratón
 *   todas(on)       todas encendidas latiendo (meta)
 *   temblor()       sacudida corta de cámara (pies y salto)
 *   hito(p) · tramo(r) · meta(on) · reiniciarCarril()
 *   rect(id)        rectángulo en pantalla de la tapa de una plataforma (efectos Phaser, flechas, mano tutorial)
 *   puntoPaso(p)    punto en pantalla del paso p del carril
 *   zeus            { listo, hacer, caminar, gesto, hablar, mirar, detener, ir(p, ms), punto() }
 *   reencuadrar()
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";

const URL_ZEUS = new URL("../SimonDiceCorporal/zeus_animado_suave.glb", import.meta.url).href;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const PISO_Y = -1;

/*
 * Medidas de la pista (unidades del aula, el aula mide 24 de ancho). La pista va centrada en el piso.
 *   z crece hacia la cámara: la SALIDA está delante (z = Z_SALIDA) y la META al fondo (z = Z_META).
 */
// la colchoneta va desde delante (z = 5.3) hasta casi la pared del fondo del aula (z = -8.9; la pared está en -9.5)
const CENTRO = new THREE.Vector3(0, PISO_Y, -1.8);
const MAT = { ancho: 11.6, fondo: 14.2 };
const ALTO_PLAT = 0.32;
const PLAT = {
    manoIzquierda: { x: -3.75, z: -1.9, w: 3.3, d: 2.7 },
    manoDerecha: { x: 3.75, z: -1.9, w: 3.3, d: 2.7 },
    pieIzquierdo: { x: -3.75, z: 2.2, w: 3.3, d: 2.7 },
    pieDerecho: { x: 3.75, z: 2.2, w: 3.3, d: 2.7 },
    ambosPies: { x: 0, z: 6.3, w: 3.0, d: 1.8 }
};
const CARRIL = { ancho: 1.9, zSalida: 4.95, zMeta: -6.55 };
const ESCALA_ZEUS = 1.7;
const YAW_FRENTE = 0;
const YAW_CAMINO = Math.PI - 0.42;
const PITCH = 50;          // grados que la cámara mira hacia abajo: vista más desde arriba, la sala gana profundidad
const FOV = 40;

let renderer = null;
let scene = null;
let camera = null;
let host = null;
let cfg = null;
let opciones = {};
let listoFlag = false;
let ultimo = performance.now();
const tweens = [];
const plats = {};          // id → { grupo, tapa, matTapa, matLado, luz, halo, base, estado }
const hitos = [];
const tramos = [];
let pasosTotales = 36;
let metaGrupo = null;
let habilitado = false;
let enFoco = false;
let todasOn = false;
let hoverId = null;
let sacudida = 0;
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let camBase = new THREE.Vector3();

// ------------------------------------------------------------------ utilidades

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function facil(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

/** Animación por tiempo: llama a fn(u) con u de 0 a 1 durante `ms`. Devuelve Promise. */
function animar(ms, fn, clave) {
    if (clave) {
        for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].clave === clave) tweens.splice(i, 1);
    }
    const dur = Math.max(1, reducido ? Math.min(ms, 200) : ms);
    return new Promise(function (resolve) {
        tweens.push({ t0: performance.now(), dur: dur, fn: fn, fin: resolve, clave: clave });
    });
}

function correrTweens(ahora) {
    for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const u = Math.min(1, (ahora - tw.t0) / tw.dur);
        try { tw.fn(u); } catch (e) { /* noop */ }
        if (u >= 1) {
            tweens.splice(i, 1);
            tw.fin();
        }
    }
}

function lienzo(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return { c: c, x: c.getContext("2d") };
}

function rectRedondo(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
}

function cargarImagen(src) {
    return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = src;
    });
}

function textura(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    return t;
}

function color(hex, factor) {
    const c = new THREE.Color(hex);
    if (factor != null) c.multiplyScalar(factor);
    return c;
}

// ------------------------------------------------------------------ texturas de la pista

async function texturaTapa(a, w, d) {
    const W = 512;
    const H = Math.round(512 * d / w);
    const t = lienzo(W, H);
    const x = t.x;
    // fondo de la tapa con su color y borde blanco
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, a.colorClaro || a.color);
    g.addColorStop(0.75, a.color);
    rectRedondo(x, 8, 8, W - 16, H - 16, 46);
    x.fillStyle = g;
    x.fill();
    x.lineWidth = 16;
    x.strokeStyle = "#ffffff";
    x.stroke();
    // brillo interior
    rectRedondo(x, 30, 30, W - 60, H * 0.42, 34);
    x.fillStyle = "rgba(255,255,255,0.14)";
    x.fill();
    // huella
    const img = await cargarImagen(window.IconosHuellas ? window.IconosHuellas.dataUri(a.id) : "");
    const lado = Math.min(W * 0.5, H * 0.62);
    if (img) {
        x.save();
        x.shadowColor = "rgba(0,0,0,0.3)";
        x.shadowOffsetY = 8;
        x.drawImage(img, (W - lado) / 2, H * 0.06, lado, lado);
        x.restore();
    }
    // nombre
    const tam = Math.round(Math.min(58, W * 0.105));
    x.font = "700 " + tam + "px Fredoka, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineJoin = "round";
    x.lineWidth = 14;
    x.strokeStyle = "rgba(5,10,31,0.85)";
    x.strokeText(a.nombre, W / 2, H - tam * 0.95);
    x.fillStyle = "#ffffff";
    x.fillText(a.nombre, W / 2, H - tam * 0.95);
    return textura(t.c);
}

function texturaColchoneta() {
    const H = Math.round(1024 * MAT.fondo / MAT.ancho);
    const t = lienzo(1024, H);
    const x = t.x;
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#26407f");
    g.addColorStop(1, "#1b2d63");
    rectRedondo(x, 0, 0, 1024, H, 60);
    x.fillStyle = g;
    x.fill();
    // losetas de goma
    x.strokeStyle = "rgba(255,255,255,0.08)";
    x.lineWidth = 4;
    for (let i = 1; i < 12; i++) { x.beginPath(); x.moveTo(i * 1024 / 12, 0); x.lineTo(i * 1024 / 12, H); x.stroke(); }
    for (let y = 85; y < H; y += 85) { x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y); x.stroke(); }
    // borde de neón
    rectRedondo(x, 18, 18, 988, H - 36, 48);
    x.lineWidth = 12;
    x.strokeStyle = "#5ce1ff";
    x.shadowColor = "#5ce1ff";
    x.shadowBlur = 24;
    x.stroke();
    x.shadowBlur = 0;
    // letreros de lado pintados delante
    x.font = "700 54px Fredoka, sans-serif";
    x.textAlign = "center";
    x.fillStyle = "rgba(255,255,255,0.55)";
    x.fillText("IZQUIERDA", 1024 * 0.18, H - 70);
    x.fillText("DERECHA", 1024 * 0.82, H - 70);
    return textura(t.c);
}

function texturaCuadros(cols, filas) {
    const t = lienzo(cols * 32, filas * 32);
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < filas; j++) {
            t.x.fillStyle = (i + j) % 2 ? "#111" : "#fff";
            t.x.fillRect(i * 32, j * 32, 32, 32);
        }
    }
    const tx = textura(t.c);
    tx.magFilter = THREE.NearestFilter;
    return tx;
}

function texturaCarril() {
    const t = lienzo(128, 512);
    const x = t.x;
    x.fillStyle = "rgba(255,255,255,0.10)";
    x.fillRect(0, 0, 128, 512);
    x.fillStyle = "rgba(255,255,255,0.75)";
    x.fillRect(0, 0, 8, 512);
    x.fillRect(120, 0, 8, 512);
    for (let y = 0; y < 512; y += 64) x.fillRect(58, y + 10, 12, 34);
    return textura(t.c);
}

function texturaCartelMeta() {
    const t = lienzo(512, 128);
    const x = t.x;
    x.fillStyle = "#0b1433";
    x.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 32; i++) {
        x.fillStyle = i % 2 ? "#111" : "#fff";
        x.fillRect(i * 16, 0, 16, 16);
        x.fillStyle = i % 2 ? "#fff" : "#111";
        x.fillRect(i * 16, 112, 16, 16);
    }
    x.font = "700 70px Fredoka, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = "#ffd43b";
    x.shadowColor = "#ffd43b";
    x.shadowBlur = 16;
    x.fillText("META", 256, 66);
    return textura(t.c);
}

function texturaRayas() {
    const t = lienzo(32, 256);
    for (let y = 0; y < 256; y += 64) {
        t.x.fillStyle = "#ffffff";
        t.x.fillRect(0, y, 32, 32);
        t.x.fillStyle = "#ff6b6b";
        t.x.fillRect(0, y + 32, 32, 32);
    }
    const tx = textura(t.c);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    return tx;
}

function texturaHalo() {
    const t = lienzo(128, 128);
    const g = t.x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    t.x.fillStyle = g;
    t.x.fillRect(0, 0, 128, 128);
    return textura(t.c);
}

// ------------------------------------------------------------------ aula simulada (sin modelo GLB)

/*
 * El gimnasio de Polimotor construido con geometría sencilla (nada que descargar): piso de losetas, pared del
 * fondo con franja de neón y letrero, paredes de escalada a los lados con presas de colores, espalderas, aros
 * colgados, colchonetas apiladas, una piscina de pelotas y un túnel de gateo. Todo en la MISMA escena que la
 * pista, así la perspectiva es una sola. Las presas y las pelotas van con InstancedMesh (pocas llamadas de
 * dibujo, liviano en tablet).
 */
const AULA = { ancho: 30, fondo: 22, alto: 9, zFondo: -9.5 };
const COLORES_PRESA = [0xffd43b, 0x5ce1ff, 0x51cf66, 0xf783ac, 0xbe4bdb, 0xff922b, 0xff6b6b];

/**
 * Piso de duela de madera de gimnasio: tablones largos desfasados, cada uno con su tono y vetas suaves, y una
 * franja de línea deportiva. Nada de damero (se confundía con el fondo transparente de un PNG).
 */
function texturaLosetas() {
    const W = 1024;
    const H = 1024;
    const t = lienzo(W, H);
    const x = t.x;
    const tonos = ["#d9a066", "#cf9459", "#e0aa70", "#c98c52", "#dba36a", "#d29a5f"];
    let r = 13;
    const azar = function () { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const altoTablon = 64;
    for (let fila = 0; fila < H / altoTablon; fila++) {
        const y = fila * altoTablon;
        // cada fila empieza desfasada, como una duela real
        let xx = -Math.floor(azar() * 300);
        while (xx < W) {
            const largo = 260 + Math.floor(azar() * 240);
            x.fillStyle = tonos[Math.floor(azar() * tonos.length)];
            x.fillRect(xx, y, largo, altoTablon);
            // vetas
            x.strokeStyle = "rgba(120,70,30,0.13)";
            x.lineWidth = 2;
            for (let v = 0; v < 3; v++) {
                const vy = y + 10 + azar() * (altoTablon - 20);
                x.beginPath();
                x.moveTo(xx + 8, vy);
                x.bezierCurveTo(xx + largo * 0.3, vy - 4, xx + largo * 0.6, vy + 4, xx + largo - 8, vy);
                x.stroke();
            }
            // junta entre tablones
            x.fillStyle = "rgba(90,50,20,0.35)";
            x.fillRect(xx, y, 2, altoTablon);
            xx += largo;
        }
        x.fillStyle = "rgba(90,50,20,0.3)";
        x.fillRect(0, y, W, 2);
    }
    // brillo de barniz
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0.05)");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const tx = textura(t.c);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(AULA.ancho / 8, AULA.fondo / 8);
    return tx;
}

function texturaParedFondo() {
    const t = lienzo(1024, 320);
    const x = t.x;
    const g = x.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, "#9fb4e8");
    g.addColorStop(1, "#c8d5f2");
    x.fillStyle = g;
    x.fillRect(0, 0, 1024, 320);
    // zócalo acolchado
    x.fillStyle = "#4c6ef5";
    x.fillRect(0, 276, 1024, 44);
    for (let i = 0; i < 16; i++) {
        x.fillStyle = "rgba(255,255,255,0.18)";
        x.fillRect(i * 64 + 4, 280, 56, 36);
    }
    // franja de neón
    x.fillStyle = "#5ce1ff";
    x.shadowColor = "#5ce1ff";
    x.shadowBlur = 18;
    x.fillRect(60, 196, 904, 6);
    x.shadowBlur = 0;
    return textura(t.c);
}

/** Presas de escalada sobre un panel: pequeñas esferas aplastadas de colores (InstancedMesh). */
function presas(grupo, ancho, alto, n, semilla) {
    const geo = new THREE.SphereGeometry(0.2, 12, 8);
    geo.scale(1, 0.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4();
    let r = semilla;
    const azar = function () { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < n; i++) {
        m.makeTranslation((azar() - 0.5) * (ancho - 0.6), 0.4 + azar() * (alto - 0.8), 0.12);
        inst.setMatrixAt(i, m);
        inst.setColorAt(i, new THREE.Color(COLORES_PRESA[i % COLORES_PRESA.length]));
    }
    inst.castShadow = true;
    grupo.add(inst);
}

function construirAula() {
    const aula = new THREE.Group();
    scene.add(aula);

    // piso de losetas
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(AULA.ancho, AULA.fondo),
        new THREE.MeshStandardMaterial({ map: texturaLosetas(), roughness: 0.55 }));
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, PISO_Y, AULA.zFondo + AULA.fondo / 2);
    piso.receiveShadow = true;
    aula.add(piso);

    // pared del fondo
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(AULA.ancho, AULA.alto),
        new THREE.MeshStandardMaterial({ map: texturaParedFondo(), roughness: 0.9 }));
    fondo.position.set(0, PISO_Y + AULA.alto / 2, AULA.zFondo);
    fondo.receiveShadow = true;
    aula.add(fondo);

    // paredes laterales con su panel de escalada (izquierda naranja, derecha turquesa)
    [[-1, 0xe8590c, 0xf08c00, 11], [1, 0x0b7285, 0x22b8cf, 29]].forEach(function (d) {
        const lado = d[0];
        const pared = new THREE.Mesh(new THREE.PlaneGeometry(AULA.fondo, AULA.alto),
            new THREE.MeshStandardMaterial({ color: 0xb7c6ea, roughness: 0.9 }));
        pared.rotation.y = -lado * Math.PI / 2;
        pared.position.set(lado * AULA.ancho / 2, PISO_Y + AULA.alto / 2, AULA.zFondo + AULA.fondo / 2);
        pared.receiveShadow = true;
        aula.add(pared);
        const panel = new THREE.Group();
        const placa = new THREE.Mesh(new THREE.BoxGeometry(7, 7.4, 0.25),
            new THREE.MeshStandardMaterial({ color: d[2], roughness: 0.7 }));
        placa.position.y = 3.7;
        placa.receiveShadow = true;
        panel.add(placa);
        const presasG = new THREE.Group();
        presasG.position.set(0, 0, 0.12);
        presas(presasG, 7, 7.4, 26, d[3]);
        panel.add(presasG);
        panel.rotation.y = -lado * Math.PI / 2;
        panel.position.set(lado * (AULA.ancho / 2 - 0.15), PISO_Y, AULA.zFondo + 5);
        aula.add(panel);
    });

    // espalderas de madera contra la pared del fondo
    const madera = new THREE.MeshStandardMaterial({ color: 0xc99a5b, roughness: 0.7 });
    [-8.5, 8.5].forEach(function (x0) {
        const esp = new THREE.Group();
        [-1, 1].forEach(function (s) {
            const largero = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.6, 0.22), madera);
            largero.position.set(s * 1.1, 2.8, 0);
            largero.castShadow = true;
            esp.add(largero);
        });
        for (let k = 0; k < 10; k++) {
            const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), madera);
            barra.rotation.z = Math.PI / 2;
            barra.position.set(0, 0.5 + k * 0.52, 0);
            esp.add(barra);
        }
        esp.position.set(x0, PISO_Y, AULA.zFondo + 0.35);
        aula.add(esp);
    });

    // aros de colores colgados en el fondo
    [[3.6, 0xffd43b], [5.1, 0x51cf66], [6.6, 0xff6b6b]].forEach(function (a) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 12, 40),
            new THREE.MeshStandardMaterial({ color: a[1], roughness: 0.4 }));
        aro.position.set(a[0], PISO_Y + 2.5, AULA.zFondo + 0.3);
        aula.add(aro);
    });

    // colchonetas apiladas a los lados de la pista
    [[-8.6, -1.2, [0x4dabf7, 0xffd43b, 0xf783ac]], [8.6, -1.2, [0x51cf66, 0xff922b, 0x845ef7]]].forEach(function (c) {
        c[2].forEach(function (col, k) {
            const w = 3.2 - k * 0.45;
            const mat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 2.2 - k * 0.2),
                new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 }));
            mat.position.set(c[0], PISO_Y + 0.25 + k * 0.5, c[1]);
            mat.castShadow = true;
            mat.receiveShadow = true;
            aula.add(mat);
        });
    });

    // piscina de pelotas (al fondo a la izquierda)
    const piscina = new THREE.Group();
    const borde = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.9, 40, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x7048e8, roughness: 0.6, side: THREE.DoubleSide }));
    borde.position.y = 0.45;
    piscina.add(borde);
    const aroBorde = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 12, 48),
        new THREE.MeshStandardMaterial({ color: 0x9775fa, roughness: 0.5 }));
    aroBorde.rotation.x = Math.PI / 2;
    aroBorde.position.y = 0.9;
    piscina.add(aroBorde);
    const nBolas = 140;
    const bolas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8),
        new THREE.MeshStandardMaterial({ roughness: 0.35 }), nBolas);
    const m = new THREE.Matrix4();
    let r = 7;
    const azar = function () { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < nBolas; i++) {
        const ang = azar() * Math.PI * 2;
        const rad = Math.sqrt(azar()) * 1.85;
        m.makeTranslation(Math.cos(ang) * rad, 0.55 + azar() * 0.3, Math.sin(ang) * rad);
        bolas.setMatrixAt(i, m);
        bolas.setColorAt(i, new THREE.Color(COLORES_PRESA[i % COLORES_PRESA.length]));
    }
    piscina.add(bolas);
    piscina.position.set(-9.8, PISO_Y, AULA.zFondo + 4.2);
    aula.add(piscina);

    // túnel de gateo (al fondo a la derecha)
    const tunel = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.8, 32, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x40c057, roughness: 0.6, side: THREE.DoubleSide }));
    tunel.rotation.z = Math.PI / 2;
    tunel.position.set(9.6, PISO_Y + 1.05, AULA.zFondo + 4);
    tunel.castShadow = true;
    aula.add(tunel);
    [-1.4, 1.4].forEach(function (dx) {
        const boca = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.14, 10, 36),
            new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.5 }));
        boca.rotation.y = Math.PI / 2;
        boca.position.set(9.6 + dx, PISO_Y + 1.05, AULA.zFondo + 4);
        aula.add(boca);
    });

    // rampa de espuma
    const cuna = new THREE.Shape();
    cuna.moveTo(0, 0);
    cuna.lineTo(2.6, 0);
    cuna.lineTo(0, 1.1);
    cuna.closePath();
    const rampa = new THREE.Mesh(new THREE.ExtrudeGeometry(cuna, { depth: 1.8, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }),
        new THREE.MeshStandardMaterial({ color: 0xffa94d, roughness: 0.7 }));
    rampa.position.set(6.4, PISO_Y, AULA.zFondo + 1.2);
    rampa.castShadow = true;
    aula.add(rampa);
    return aula;
}

// ------------------------------------------------------------------ pista

async function construirPista() {
    const pista = new THREE.Group();
    pista.position.copy(CENTRO);
    scene.add(pista);

    // colchoneta de entrenamiento (con grosor)
    const matCol = new THREE.MeshStandardMaterial({ map: texturaColchoneta(), roughness: 0.85 });
    const matBorde = new THREE.MeshStandardMaterial({ color: 0x0d1638, roughness: 0.9 });
    const col = new THREE.Mesh(new THREE.BoxGeometry(MAT.ancho, 0.12, MAT.fondo),
        [matBorde, matBorde, matCol, matBorde, matBorde, matBorde]);
    col.position.y = 0.06;
    col.receiveShadow = true;
    pista.add(col);

    // carril de Zeus con tramos de color por ronda
    const largo = CARRIL.zSalida - CARRIL.zMeta;
    const carril = new THREE.Mesh(new THREE.PlaneGeometry(CARRIL.ancho, largo),
        new THREE.MeshStandardMaterial({ map: texturaCarril(), transparent: true, roughness: 0.6 }));
    carril.rotation.x = -Math.PI / 2;
    carril.position.set(0, 0.125, (CARRIL.zSalida + CARRIL.zMeta) / 2);
    carril.receiveShadow = true;
    pista.add(carril);

    const rondas = (cfg.rondas || []);
    const colores = [0x5ce1ff, 0xb197fc, 0xffd43b];
    let desde = 0;
    pasosTotales = rondas.reduce(function (n, r) { return n + (Number(r.items) || 3) * (Number(r.baldosas) || 4); }, 0) || 36;
    rondas.forEach(function (r, i) {
        const pasos = (Number(r.items) || 3) * (Number(r.baldosas) || 4);
        const z0 = zPaso(desde);
        const z1 = zPaso(desde + pasos);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(CARRIL.ancho - 0.12, Math.abs(z0 - z1)),
            new THREE.MeshBasicMaterial({ color: colores[i % 3], transparent: true, opacity: 0.22, depthWrite: false }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(0, 0.128, (z0 + z1) / 2);
        pista.add(m);
        tramos.push(m);
        desde += pasos;
    });

    // hitos: uno por ítem
    let p = 0;
    rondas.forEach(function (r) {
        for (let k = 0; k < (Number(r.items) || 3); k++) {
            p += (Number(r.baldosas) || 4);
            const h = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32),
                new THREE.MeshStandardMaterial({ color: 0x0d1638, emissive: 0x000000, roughness: 0.4 }));
            const aro = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 10, 32),
                new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
            aro.rotation.x = Math.PI / 2;
            h.add(aro);
            h.position.set(0, 0.15, zPaso(p));
            h.userData.p = p;
            pista.add(h);
            hitos.push(h);
        }
    });

    // línea de salida (cuadros) y su cartel
    const salida = new THREE.Mesh(new THREE.PlaneGeometry(CARRIL.ancho + 0.5, 0.42),
        new THREE.MeshStandardMaterial({ map: texturaCuadros(12, 2), roughness: 0.7 }));
    salida.rotation.x = -Math.PI / 2;
    salida.position.set(0, 0.13, CARRIL.zSalida + 0.3);
    pista.add(salida);

    // arco de META de pie al final del carril
    metaGrupo = new THREE.Group();
    metaGrupo.position.set(0, 0.12, CARRIL.zMeta - 0.15);
    const rayas = texturaRayas();
    rayas.repeat.set(1, 3);
    const matPoste = new THREE.MeshStandardMaterial({ map: rayas, roughness: 0.5, emissive: 0x000000 });
    [-1, 1].forEach(function (s) {
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.6, 16), matPoste);
        poste.position.set(s * (CARRIL.ancho / 2 + 0.35), 1.8, 0);
        poste.castShadow = true;
        metaGrupo.add(poste);
    });
    const cartel = new THREE.Mesh(new THREE.BoxGeometry(CARRIL.ancho + 1.3, 0.62, 0.1), [
        new THREE.MeshStandardMaterial({ color: 0xffd43b }), new THREE.MeshStandardMaterial({ color: 0xffd43b }),
        new THREE.MeshStandardMaterial({ color: 0xffd43b }), new THREE.MeshStandardMaterial({ color: 0xffd43b }),
        new THREE.MeshStandardMaterial({ map: texturaCartelMeta(), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }),
        new THREE.MeshStandardMaterial({ color: 0x0b1433 })
    ]);
    cartel.position.set(0, 3.45, 0);
    cartel.castShadow = true;
    metaGrupo.add(cartel);
    metaGrupo.userData.cartel = cartel;
    metaGrupo.userData.poste = matPoste;
    pista.add(metaGrupo);

    // conos de entrenamiento
    const matCono = new THREE.MeshStandardMaterial({ color: 0xff922b, roughness: 0.5 });
    const matFranja = new THREE.MeshStandardMaterial({ color: 0xffffff });
    [[-1.35, 4.8], [1.35, 4.8], [-1.35, 0.15], [1.35, 0.15], [-1.35, -4.2], [1.35, -4.2]].forEach(function (pos) {
        const cono = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 20), matCono);
        cono.position.set(pos[0], 0.42, pos[1]);
        cono.castShadow = true;
        const franja = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.08, 20), matFranja);
        franja.position.y = 0.02;
        cono.add(franja);
        pista.add(cono);
    });

    // vallas de obstáculos en el tramo del fondo (decoración de la pista de obstáculos)
    const matValla = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const matBarra = new THREE.MeshStandardMaterial({ map: rayas, roughness: 0.5 });
    [-3.75, 3.75].forEach(function (vx) {
        const valla = new THREE.Group();
        [-1, 1].forEach(function (sx) {
            const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), matValla);
            pata.position.set(sx * 1.1, 0.45, 0);
            pata.castShadow = true;
            valla.add(pata);
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.6), matValla);
            base.position.set(sx * 1.1, 0.03, 0);
            valla.add(base);
        });
        const barra = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.08), matBarra);
        barra.position.y = 0.85;
        barra.castShadow = true;
        valla.add(barra);
        valla.position.set(vx, 0.12, -5.2);
        pista.add(valla);
    });

    // las cinco plataformas
    const halo = texturaHalo();
    const lista = cfg.acciones || [];
    for (let i = 0; i < lista.length; i++) {
        const a = lista[i];
        const def = PLAT[a.id];
        if (!def) continue;
        const grupo = new THREE.Group();
        grupo.position.set(def.x, 0.12, def.z);
        const matTapa = new THREE.MeshStandardMaterial({
            map: await texturaTapa(a, def.w, def.d), roughness: 0.45,
            emissive: new THREE.Color(a.colorClaro || a.color), emissiveIntensity: 0
        });
        const matLado = new THREE.MeshStandardMaterial({ color: color(a.color, 0.55), roughness: 0.6 });
        const caja = new THREE.Mesh(new THREE.BoxGeometry(def.w, ALTO_PLAT, def.d),
            [matLado, matLado, matTapa, matLado, matLado, matLado]);
        caja.position.y = ALTO_PLAT / 2;
        caja.castShadow = true;
        caja.receiveShadow = true;
        caja.userData.id = a.id;
        grupo.add(caja);
        // brillo bajo la plataforma y luz de color al encenderse
        const brillo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: halo, color: new THREE.Color(a.colorClaro || a.color), transparent: true, opacity: 0,
            depthWrite: false, blending: THREE.AdditiveBlending
        }));
        brillo.scale.set(def.w * 1.9, def.w * 1.9, 1);
        brillo.position.y = ALTO_PLAT + 0.25;
        grupo.add(brillo);
        const luz = new THREE.PointLight(new THREE.Color(a.colorClaro || a.color), 0, 6, 2);
        luz.position.y = 1.2;
        grupo.add(luz);
        pista.add(grupo);
        plats[a.id] = {
            id: a.id, i: i, grupo: grupo, caja: caja, matTapa: matTapa, matLado: matLado, brillo: brillo, luz: luz,
            def: def, color: new THREE.Color(a.color), on: false, gris: false, alto: 0, extraY: 0
        };
    }
    return pista;
}

function zPaso(p) {
    const f = Math.min(1.1, p / Math.max(1, pasosTotales));
    return CARRIL.zSalida - f * (CARRIL.zSalida - CARRIL.zMeta);
}

/** Posición en el mundo del paso p del carril (sobre la colchoneta). */
function mundoPaso(p) {
    const extra = p > pasosTotales ? 0.9 : 0;
    return new THREE.Vector3(CENTRO.x, CENTRO.y + 0.13, CENTRO.z + zPaso(Math.min(p, pasosTotales)) - extra);
}

// ------------------------------------------------------------------ estado visual de las plataformas (cada cuadro)

function pintarPlataformas(ahora) {
    Object.keys(plats).forEach(function (id) {
        const P = plats[id];
        const encendida = P.on || todasOn;
        // altura: encendida sube; hover sube un poco; extraY la ponen los rebotes/saltitos
        const objetivo = (encendida ? 0.32 : 0) + (habilitado && hoverId === id && !encendida ? 0.14 : 0);
        P.alto += (objetivo - P.alto) * 0.22;
        P.grupo.position.y = 0.12 + P.alto + P.extraY;
        // brillo: encendida fuerte; turno del niño "respira"; foco apaga las demás
        let emis = 0;
        if (encendida) emis = todasOn ? 0.55 + 0.25 * Math.sin(ahora / 160 + P.i) : 0.75;
        else if (habilitado) emis = (hoverId === id ? 0.35 : 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(ahora / 380 + P.i * 1.3)));
        P.matTapa.emissiveIntensity += (emis - P.matTapa.emissiveIntensity) * 0.25;
        const oscuro = (enFoco && !encendida) ? 0.42 : (P.gris ? 0.6 : 1);
        P.matTapa.color.setScalar(1).multiplyScalar(oscuro);
        if (P.gris) P.matTapa.color.setRGB(0.62, 0.64, 0.68);
        P.brillo.material.opacity += ((encendida ? 0.85 : 0) - P.brillo.material.opacity) * 0.25;
        P.luz.intensity += ((encendida ? 18 : 0) - P.luz.intensity) * 0.25;
    });
}

// ------------------------------------------------------------------ cámara y encuadre

/**
 * Coloca la cámara con un ángulo fijo (PITCH) y busca la distancia para que toda la pista (colchoneta, arco
 * de meta y Zeus) quepa en la zona libre de la pantalla; luego desplaza la imagen (setViewOffset) para centrar
 * la pista en esa zona (debajo de la cabecera y la fila de progreso).
 */
function encuadrar() {
    if (!renderer || !camera) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = FOV;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const zona = (opciones.zonaLibre && opciones.zonaLibre()) || { top: 0.22 * H, bottom: H };
    const altoLibre = Math.max(100, zona.bottom - zona.top);
    const objetivo = new THREE.Vector3(CENTRO.x, CENTRO.y + 0.4, CENTRO.z + 0.3);
    const dir = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(PITCH)), Math.cos(THREE.MathUtils.degToRad(PITCH)));
    const puntos = [];
    [-1, 1].forEach(function (sx) {
        [-1, 1].forEach(function (sz) {
            puntos.push(new THREE.Vector3(CENTRO.x + sx * MAT.ancho / 2, CENTRO.y, CENTRO.z + sz * MAT.fondo / 2));
        });
    });
    // lo alto del arco de meta y de Zeus también tiene que verse
    puntos.push(new THREE.Vector3(CENTRO.x, CENTRO.y + 4.2, CENTRO.z + CARRIL.zMeta));
    puntos.push(new THREE.Vector3(CENTRO.x, CENTRO.y + 2.4, CENTRO.z + CARRIL.zSalida));
    let lo = 4;
    let hi = 60;
    let caja = null;
    for (let it = 0; it < 30; it++) {
        const d = (lo + hi) / 2;
        camera.position.copy(objetivo).addScaledVector(dir, d);
        camera.lookAt(objetivo);
        camera.updateMatrixWorld(true);
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        puntos.forEach(function (pt) {
            const v = pt.clone().project(camera);
            x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
            y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
        });
        const anchoPx = (x1 - x0) / 2 * W;
        const altoPx = (y1 - y0) / 2 * H;
        if (anchoPx <= W * 0.84 && altoPx <= altoLibre * 0.9) {
            hi = d;
            caja = { y0: y0, y1: y1 };
        } else {
            lo = d;
        }
    }
    camera.position.copy(objetivo).addScaledVector(dir, hi);
    camera.lookAt(objetivo);
    camera.updateMatrixWorld(true);
    camBase.copy(camera.position);
    // centrar la pista en la zona libre
    if (caja) {
        const centroPx = (1 - (caja.y0 + caja.y1) / 2) / 2 * H;
        const deseado = zona.top + altoLibre / 2;
        camera.setViewOffset(W, H, 0, Math.round(centroPx - deseado), W, H);
    }
    camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------ proyección a pantalla

function aPantalla(v) {
    const p = v.clone().project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
}

function rect(id) {
    const P = plats[id];
    if (!P || !camera) return null;
    P.grupo.updateMatrixWorld(true);
    const y = ALTO_PLAT;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) {
        const v = new THREE.Vector3(s[0] * P.def.w / 2, y, s[1] * P.def.d / 2).applyMatrix4(P.grupo.matrixWorld);
        const q = aPantalla(v);
        x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
        y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    });
    return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0, x: x0, y: y0 };
}

function puntoPaso(p) {
    if (!camera) return null;
    return aPantalla(mundoPaso(p));
}

// ------------------------------------------------------------------ toques (raycasting)

function idEnPantalla(ev) {
    if (!renderer || !camera) return null;
    const r = renderer.domElement.getBoundingClientRect();
    puntero.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    puntero.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camera);
    const cajas = Object.keys(plats).map(function (k) { return plats[k].caja; });
    const hit = raycaster.intersectObjects(cajas, false)[0];
    return hit ? hit.object.userData.id : null;
}

function enlazarToques(el) {
    el.addEventListener("pointerdown", function (ev) {
        if (ev.isPrimary === false || (ev.pointerType === "mouse" && ev.button !== 0)) return;
        const id = idEnPantalla(ev);
        if (!id) return;
        ev.preventDefault();
        if (typeof opciones.alTocar === "function") opciones.alTocar(id);
    });
    el.addEventListener("pointermove", function (ev) {
        if (ev.pointerType !== "mouse") return;
        const id = habilitado ? idEnPantalla(ev) : null;
        hoverId = id;
        el.style.cursor = id ? "pointer" : "";
    });
    el.addEventListener("pointerleave", function () { hoverId = null; el.style.cursor = ""; });
    el.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
}

// ------------------------------------------------------------------ efectos de plataforma

function encender(id, on) {
    const P = plats[id];
    if (P) P.on = !!on;
}

function presionar(id) {
    const P = plats[id];
    if (!P) return;
    animar(260, function (u) { P.extraY = -0.12 * Math.sin(u * Math.PI); }, "y-" + id);
    onda(id, 0xffffff, 600);
}

function rebotar(id) {
    const P = plats[id];
    if (!P) return;
    P.gris = true;
    animar(720, function (u) {
        P.extraY = 0.5 * Math.abs(Math.sin(u * Math.PI * 2.2)) * (1 - u);
        P.grupo.rotation.z = 0.06 * Math.sin(u * Math.PI * 4) * (1 - u);
    }, "y-" + id).then(function () {
        P.gris = false;
        P.grupo.rotation.z = 0;
    });
    onda(id, 0xced4da, 700);
}

function saltito(id) {
    const P = plats[id];
    if (!P) return;
    animar(620, function (u) { P.extraY = 0.42 * Math.sin(u * Math.PI); }, "y-" + id);
}

function menear() {
    Object.keys(plats).forEach(function (id) {
        const P = plats[id];
        animar(1800, function (u) { P.grupo.rotation.y = 0.07 * Math.sin(u * Math.PI * 6) * (1 - u); }, "r-" + id);
    });
}

/** Anillo de luz que sale de la plataforma y sube (acierto) o se expande (toque). */
function onda(id, hex, ms) {
    const P = plats[id];
    if (!P) return;
    const geo = new THREE.RingGeometry(0.62, 0.78, 48);
    const mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
    const aro = new THREE.Mesh(geo, mat);
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = ALTO_PLAT + 0.04;
    P.grupo.add(aro);
    animar(ms || 650, function (u) {
        const s = 0.5 + u * 2.4;
        aro.scale.set(s, s, s);
        mat.opacity = 0.95 * (1 - u);
    }).then(function () {
        P.grupo.remove(aro);
        geo.dispose();
        mat.dispose();
    });
}

function energia(id) {
    const P = plats[id];
    if (!P) return;
    [0, 160, 320].forEach(function (retraso) {
        setTimeout(function () {
            const geo = new THREE.RingGeometry(0.9, 1.02, 48);
            const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfgAccion(id).colorClaro || "#fff"), transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
            const aro = new THREE.Mesh(geo, mat);
            aro.rotation.x = -Math.PI / 2;
            aro.position.y = ALTO_PLAT + 0.05;
            P.grupo.add(aro);
            animar(900, function (u) {
                aro.position.y = ALTO_PLAT + 0.05 + u * 1.6;
                const s = 1 + u * 0.6;
                aro.scale.set(s, s, s);
                mat.opacity = 1 - u;
            }).then(function () { P.grupo.remove(aro); geo.dispose(); mat.dispose(); });
        }, retraso);
    });
}

function cfgAccion(id) {
    return ((cfg && cfg.acciones) || []).find(function (a) { return a.id === id; }) || {};
}

function hito(p) {
    hitos.forEach(function (h) {
        if (h.userData.p !== p || h.userData.on) return;
        h.userData.on = true;
        h.material.color.set(0xffd43b);
        h.material.emissive.set(0xffa94d);
        h.material.emissiveIntensity = 0.9;
        animar(700, function (u) {
            const s = 1 + 0.6 * Math.sin(u * Math.PI);
            h.scale.set(s, 1, s);
        });
    });
}

function tramo(r) {
    const m = tramos[r];
    if (!m) return;
    animar(600, function (u) { m.material.opacity = 0.22 + 0.4 * u; });
}

function reiniciarCarril() {
    hitos.forEach(function (h) {
        h.userData.on = false;
        h.material.color.set(0x0d1638);
        h.material.emissive.set(0x000000);
        h.scale.set(1, 1, 1);
    });
    tramos.forEach(function (m) { m.material.opacity = 0.22; });
    meta(false);
}

function meta(on) {
    if (!metaGrupo) return;
    const cartel = metaGrupo.userData.cartel;
    const caraFrente = cartel.material[4];
    caraFrente.emissiveMap = caraFrente.map;
    caraFrente.emissiveIntensity = on ? 0.8 : 0;
    caraFrente.needsUpdate = true;
    metaGrupo.userData.poste.emissive.set(on ? 0x664400 : 0x000000);
}

function temblor() {
    sacudida = 1;
}

// ------------------------------------------------------------------ Zeus en la escena

const Z = {
    mesh: null,
    mixer: null,
    acciones: {},
    actual: null,
    hablando: false,
    enGesto: false,
    mov: null,
    turno: {},
    yaw: YAW_FRENTE,
    listo: false,
    sombra: null
};

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Porra_con_pompones"],
    baila: ["Bailar"],
    piensa: ["Pensar"],
    meta: ["Porra_con_pompones", "Celebrar"]
};

const MOVIMIENTOS = {
    manoIzquierda: { clip: "Levantar_brazo_izquierdo", contactos: [0.42] },
    manoDerecha: { clip: "Levantar_brazo_derecho", contactos: [0.42] },
    pieIzquierdo: { clip: "Levantar_pie_izquierdo", contactos: [0.44] },
    pieDerecho: { clip: "Levantar_pie_derecho", contactos: [0.44] },
    ambosPies: { clip: "Saltar", contactos: [0.68], vuelo: [0.3, 0.68, 1.1] },
    caminar: { clip: "Caminar", contactos: [0.25, 0.75], bucle: true }
};

const DURACION_CLIP = {
    Levantar_brazo_derecho: 3.2,
    Levantar_brazo_izquierdo: 3.2,
    Levantar_pie_derecho: 3.0,
    Levantar_pie_izquierdo: 3.0,
    Saltar: 2.33,
    Caminar: 2.1
};

function zClip(n) { return Z.acciones[n] || null; }
function zBase() { return Z.hablando ? (zClip("Hablar") || zClip("Quieto")) : zClip("Quieto"); }

function zCruzar(sig, dur) {
    if (!sig || sig === Z.actual) return;
    sig.reset();
    sig.setEffectiveWeight(1);
    sig.play();
    if (Z.actual) Z.actual.crossFadeTo(sig, dur != null ? dur : 0.3, false);
    Z.actual = sig;
}

function zApagarOtras(a, dur) {
    Object.keys(Z.acciones).forEach(function (k) {
        if (Z.acciones[k] !== a && Z.acciones[k].isRunning()) Z.acciones[k].fadeOut(dur);
    });
}

function zEvaluar(ahora) {
    const m = Z.mov;
    if (!m) return;
    const u = Math.min(1, (ahora - m.t0) / m.dur);
    if (Z.mesh) {
        let sube = 0;
        if (m.vuelo && u > m.vuelo[0] && u < m.vuelo[1]) {
            const k = (u - m.vuelo[0]) / (m.vuelo[1] - m.vuelo[0]);
            sube = m.vuelo[2] * 4 * k * (1 - k);
        }
        Z.mesh.position.y = sube * 0.09 * ESCALA_ZEUS;
    }
    if (u >= 1) zTerminar();
}

function zTerminar() {
    const m = Z.mov;
    Z.mov = null;
    if (Z.mesh) Z.mesh.position.y = 0;
    if (m && m.accion) m.accion.timeScale = 1;
    if (Z.listo && !Z.enGesto) zCruzar(zBase(), 0.25);
    if (m && m.resolver) m.resolver(true);
}

function zReproducir(id, opts) {
    opts = opts || {};
    const def = MOVIMIENTOS[id];
    const dur = Math.max(350, (reducido ? 0.8 : 1) * (opts.ms || 1400));
    if (Z.mov) zTerminar();
    if (!def) return Promise.resolve(false);
    const a = Z.listo ? zClip(def.clip) : null;
    if (!a) return sleep(dur);
    Z.enGesto = false;
    const natural = DURACION_CLIP[def.clip] || (a.getClip() && a.getClip().duration) || 2;
    if (def.bucle) {
        a.setLoop(THREE.LoopRepeat, Infinity);
        a.timeScale = reducido ? 0.8 : 1.2;
    } else {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
        a.timeScale = natural / (dur / 1000);
    }
    Z.actual = null;
    zCruzar(a, 0.18);
    zApagarOtras(a, 0.18);
    return new Promise(function (resolve) {
        Z.mov = { accion: a, vuelo: def.vuelo || null, t0: performance.now(), dur: dur, resolver: resolve };
        const propio = Z.mov;
        const respaldo = function () {
            if (Z.mov !== propio) return;
            if (performance.now() - ultimo > 120) zEvaluar(performance.now());
            if (Z.mov === propio) setTimeout(respaldo, 60);
        };
        setTimeout(respaldo, 60);
    });
}

function zMirar(hacia) {
    Z.yaw = hacia === "camino" ? YAW_CAMINO : YAW_FRENTE;
}

let zPos = 0;

/** Lleva a Zeus al paso p del carril en `ms` (0 = al instante). */
function zIr(p, ms) {
    if (!Z.raiz) return Promise.resolve();
    const desde = Z.raiz.position.clone();
    const hasta = mundoPaso(p);
    zPos = p;
    if (!ms) {
        Z.raiz.position.copy(hasta);
        return Promise.resolve();
    }
    return animar(ms, function (u) { Z.raiz.position.lerpVectors(desde, hasta, u); }, "zeus-ir");
}

async function cargarZeus(cargador) {
    const raiz = new THREE.Group();
    scene.add(raiz);
    Z.raiz = raiz;
    raiz.position.copy(mundoPaso(0));
    // sombra de contacto (queda en el piso al saltar)
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.42 * ESCALA_ZEUS / 1.12, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.01;
    raiz.add(sombra);
    const gltf = await new Promise(function (resolve, reject) { cargador.load(URL_ZEUS, resolve, undefined, reject); });
    const mesh = gltf.scene;
    mesh.scale.setScalar(ESCALA_ZEUS);
    mesh.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    raiz.add(mesh);
    Z.mesh = mesh;
    Z.mixer = new THREE.AnimationMixer(mesh);
    (gltf.animations || []).forEach(function (c) { Z.acciones[c.name] = Z.mixer.clipAction(c); });
    ["Quieto", "Hablar"].forEach(function (n) { if (Z.acciones[n]) Z.acciones[n].setLoop(THREE.LoopRepeat, Infinity); });
    Z.mixer.addEventListener("finished", function (ev) {
        if (ev.action !== Z.actual) return;
        Z.enGesto = false;
        zCruzar(zBase(), 0.35);
    });
    zCruzar(zBase(), 0);
    Z.listo = true;
}

const zeusApi = {
    listo: function () { return Z.listo; },
    hacer: function (huella, opts) { zMirar("camino"); return zReproducir(huella, opts); },
    caminar: function (ms) { zMirar("camino"); return zReproducir("caminar", { ms: ms }); },
    gesto: function (nombre) {
        if (!Z.listo) return;
        const ops = GESTOS[nombre];
        if (!ops) return;
        if (Z.mov) zTerminar();
        zMirar("frente");
        Z.turno[nombre] = (Z.turno[nombre] || 0) + 1;
        const a = zClip(ops[(Z.turno[nombre] - 1) % ops.length]);
        if (!a) return;
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
        a.timeScale = 1;
        Z.enGesto = true;
        Z.actual = null;
        zCruzar(a, 0.25);
        zApagarOtras(a, 0.25);
    },
    hablar: function (on) {
        Z.hablando = !!on;
        if (on) zMirar("frente");
        if (!Z.listo || Z.enGesto || Z.mov) return;
        zCruzar(zBase(), 0.25);
    },
    mirar: zMirar,
    detener: function () { if (Z.mov) zTerminar(); },
    ir: zIr,
    paso: function () { return zPos; },
    /** Punto en pantalla de la cabeza de Zeus (para la estrella que vuela al progreso). */
    punto: function () {
        if (!Z.raiz || !camera) return null;
        return aPantalla(Z.raiz.position.clone().add(new THREE.Vector3(0, 2.3, 0)));
    }
};

// ------------------------------------------------------------------ bucle

function bucle() {
    requestAnimationFrame(bucle);
    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
    ultimo = ahora;
    correrTweens(ahora);
    if (Z.mixer) Z.mixer.update(reducido ? dt * 0.6 : dt);
    zEvaluar(ahora);
    if (Z.mesh) Z.mesh.rotation.y += (Z.yaw - Z.mesh.rotation.y) * Math.min(1, dt * 7);
    pintarPlataformas(ahora);
    if (sacudida > 0.01) {
        camera.position.set(camBase.x + (Math.random() - 0.5) * 0.08 * sacudida, camBase.y + (Math.random() - 0.5) * 0.08 * sacudida, camBase.z);
        sacudida *= 0.82;
    } else if (sacudida > 0) {
        sacudida = 0;
        camera.position.copy(camBase);
    }
    renderer.render(scene, camera);
}

function webgl() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

async function montar(config, opts) {
    cfg = config;
    opciones = opts || {};
    host = document.getElementById("aula-3d");
    if (!host || renderer || !webgl()) return false;
    try { if (document.fonts && document.fonts.load) await document.fonts.load("700 40px Fredoka"); } catch (e) { /* noop */ }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb7c6ea);
    camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 200);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "aula-3d-canvas";
    host.appendChild(renderer.domElement);

    // iluminación: relleno suave (como la intro) + una luz principal con sombras sobre la pista
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0xdfe6d8, 0.55));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sol = new THREE.DirectionalLight(0xfff2d8, 1.5);
    sol.position.set(4, 14, 9);
    sol.target.position.copy(CENTRO);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.camera.left = -9;
    sol.shadow.camera.right = 9;
    sol.shadow.camera.top = 9;
    sol.shadow.camera.bottom = -9;
    sol.shadow.camera.near = 1;
    sol.shadow.camera.far = 40;
    sol.shadow.bias = -0.0008;
    scene.add(sol);
    scene.add(sol.target);
    const relleno = new THREE.DirectionalLight(0xdfeaff, 0.5);
    relleno.position.set(-6, 5, 8);
    scene.add(relleno);

    const cargador = crearCargadorGltf();
    construirAula();
    await construirPista();
    encuadrar();
    enlazarToques(renderer.domElement);
    window.addEventListener("resize", encuadrar);
    bucle();
    try {
        await cargarZeus(cargador);
        window.dispatchEvent(new CustomEvent("zeus3d-listo"));
    } catch (e) {
        console.warn("[AulaPista] no se pudo cargar Zeus 3D", e);
    }
    listoFlag = true;
    document.body.classList.add("aula-3d-lista");
    return true;
}

window.AulaPista = {
    montar: montar,
    listo: function () { return listoFlag; },
    encender: encender,
    presionar: presionar,
    rebotar: rebotar,
    energia: energia,
    saltito: saltito,
    menear: menear,
    foco: function (on) { enFoco = !!on; },
    habilitar: function (on) { habilitado = !!on; if (!on) hoverId = null; },
    todas: function (on) { todasOn = !!on; },
    temblor: temblor,
    hito: hito,
    tramo: tramo,
    meta: meta,
    reiniciarCarril: reiniciarCarril,
    rect: rect,
    puntoPaso: puntoPaso,
    zeus: zeusApi,
    reencuadrar: encuadrar,
    // depuración desde la consola
    _escena: function () { return { scene: scene, camera: camera, renderer: renderer }; }
};
window.dispatchEvent(new CustomEvent("aulapista-modulo"));
