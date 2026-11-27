/**
 * EscenarioGolf — escena three.js de "El Mini Golf Mágico de Pendiente y Obstáculos" (window.EscenarioGolf).
 *
 * Un campo de mini golf sobre una isla que flota en el espacio: cielo galáctico con nebulosas que respiran, estrellas
 * que titilan, constelaciones, planetas que giran, asteroides lejanos, estrellas fugaces, nubes mágicas, polvo
 * cósmico e islitas flotantes. En la isla: césped con relieve real (la altura sale de ReglasGolf.altura), paredes
 * con borde de luz (la pared curva brilla en turquesa), molino con túnel y aspas que giran con el reloj de la física,
 * asteroides que van y vienen, pilares de cristal, hoyo dorado con bandera que ondea, gemas que flotan, rocas luminosas,
 * señales y banderines. En los recorridos largos la cámara sigue a la pelota y una flecha dorada señala el hoyo.
 *
 * La escena dibuja y anima; ReglasGolf decide (física, colisiones, hoyo); script.js ordena el flujo. La física corre
 * a paso fijo con un reloj propio (tFis) que se detiene en pausa: el molino, el asteroide, la pelota y la trayectoria
 * predictiva usan ese mismo reloj, así que la línea de luz es el recorrido real.
 *
 * Un solo ciclo de render (setAnimationLoop) más un respaldo por tiempo; partículas y ondas en reservas fijas.
 */
import * as THREE from "three";

const R = () => window.ReglasGolf;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const ALTO_PARED = 0.24;
const GROSOR_PARED = 0.18;
const BORDE_ISLA = 0.85;
const AZIMUT = 16 * Math.PI / 180;     // la cámara mira desde adelante y un poco a la izquierda
const ELEVACION = 49 * Math.PI / 180;
const FOV = 38;

const COLZONA = { suave: 0x51cf66, media: 0xffd43b, potente: 0xff6fae };

const E = {
    host: null,
    cfg: null,
    j: null,
    renderer: null,
    scene: null,
    camera: null,
    listo: false,
    oyentes: {},
    ultimoCuadro: 0,
    reloj: 0,
    tFis: 0,
    acum: 0,
    pausado: false,
    entrada: false,
    estado: "inactivo",     // inactivo | listo | apuntando | rodando | hoyo
    nv: null,
    ronda: null,
    bola: null,
    apunte: null,
    pred: null,
    predT: 0,
    predCompleta: false,
    ayuda: true,
    demo: false,
    demoCorte: 0,
    fiesta: false,
    camObj: null,           // { pos, mira }
    camAct: null,
    camTween: null,
    sacudir: 0,
    flashCurva: 0,
    flashMolino: 0,
    luzMolino: 0,
    banderaSube: 0,
    banderaObj: 0,
    quietoDesde: 0,
    golpesSinMover: 0,
    ultimoRodar: 0,
    tensionAnterior: 0,
    topeAvisado: false,
    nivelCalidad: 0
};

// ------------------------------------------------------------------ eventos hacia script.js

function emitir(nombre, datos) {
    (E.oyentes[nombre] || []).forEach(function (fn) {
        try { fn(datos); } catch (e) { console.warn("[EscenarioGolf]", e); }
    });
}

function sfx(nombre) {
    const s = window.SonidosGolf;
    if (s && typeof s[nombre] === "function") s[nombre].apply(null, [].slice.call(arguments, 1));
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 200) : ms); });
}

function lerp(a, b, u) { return a + (b - a) * u; }
function suave(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function alt(x, z) { return E.nv ? R().altura(E.nv, x, z) : 0; }

// ------------------------------------------------------------------ texturas (canvas, sin archivos)

function lienzo(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function textura(c, repetir) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
}

const CACHE_TX = {};

/** Césped cortado en franjas, con briznas y destellitos (una textura por par de colores). */
function texCesped(c1, c2) {
    const k = "c" + c1 + c2;
    if (CACHE_TX[k]) return CACHE_TX[k];
    const c = lienzo(512, 512);
    const g = c.getContext("2d");
    for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? c1 : c2;
        g.fillRect(0, i * 64, 512, 64);
    }
    for (let i = 0; i < 9000; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const v = Math.random();
        g.fillStyle = v < 0.5 ? "rgba(20,90,50,0.35)" : (v < 0.92 ? "rgba(170,255,170,0.22)" : "rgba(230,255,240,0.5)");
        g.fillRect(x, y, 1.5, 3 + Math.random() * 3);
    }
    return (CACHE_TX[k] = textura(c, true));
}

/** Tierra mágica del borde de la isla, con destellos de cristal. */
function texTierra(color) {
    const k = "t" + color;
    if (CACHE_TX[k]) return CACHE_TX[k];
    const c = lienzo(256, 256);
    const g = c.getContext("2d");
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
        const v = Math.random();
        g.fillStyle = v < 0.55 ? "rgba(20,10,60,0.35)" : (v < 0.95 ? "rgba(255,255,255,0.16)" : "rgba(150,255,250,0.7)");
        g.beginPath();
        g.arc(Math.random() * 256, Math.random() * 256, v < 0.95 ? 1 + Math.random() * 2.5 : 1.2, 0, Math.PI * 2);
        g.fill();
    }
    return (CACHE_TX[k] = textura(c, true));
}

const TEMA_BASE = { cesped: ["#2fb84a", "#3fcc5a"], tierra: "#4c3d8f", pared: "#6741d9", lomo: "#d0bfff", cielo: "#ffffff" };
let TEMA = TEMA_BASE;

/** Colores del mundo: césped, tierra de la isla, paredes y tono del cielo. */
function aplicarTema(nombre) {
    const temas = (E.cfg && E.cfg.temas) || {};
    TEMA = Object.assign({}, TEMA_BASE, temas[nombre] || {});
    MT.cesped.map = texCesped(TEMA.cesped[0], TEMA.cesped[1]);
    MT.cesped.needsUpdate = true;
    MT.bordeIsla.map = texTierra(TEMA.tierra);
    MT.bordeIsla.needsUpdate = true;
    MT.pared.color.set(TEMA.pared);
    MT.lomo.color.set(TEMA.lomo);
    if (FONDO.cielo) FONDO.cielo.material.color.set(TEMA.cielo);
}

const TX = {};

function radial(paradas, tam) {
    const n = tam || 128;
    const c = lienzo(n, n);
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    paradas.forEach(function (p) { gr.addColorStop(p[0], p[1]); });
    g.fillStyle = gr;
    g.fillRect(0, 0, n, n);
    return textura(c);
}

function crearTexturas() {
    TX.brillo = radial([[0, "rgba(255,255,255,1)"], [0.22, "rgba(255,255,255,0.85)"], [0.5, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]);
    TX.sombra = radial([[0, "rgba(0,10,30,0.55)"], [0.55, "rgba(0,10,30,0.3)"], [1, "rgba(0,10,30,0)"]]);
    TX.hoyo = radial([[0, "rgba(0,0,8,1)"], [0.55, "rgba(4,6,30,1)"], [0.82, "rgba(20,26,80,1)"], [0.96, "rgba(60,40,10,1)"], [1, "rgba(60,40,10,0)"]], 256);

    // estrella con brillo (celebraciones y marca final)
    let c = lienzo(128, 128);
    let g = c.getContext("2d");
    let gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,0.7)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#fff";
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 ? 20 : 50;
        g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    TX.estrella = textura(c);

    // confeti (rectángulo suave)
    c = lienzo(64, 64);
    g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(18, 8, 28, 48);
    TX.confeti = textura(c);

    TX.cesped = texCesped("#2fb84a", "#3fcc5a");
    TX.borde = texTierra("#4c3d8f");

    // roca de la isla (capas violetas con vetas de cristal)
    c = lienzo(256, 256);
    g = c.getContext("2d");
    const rg = g.createLinearGradient(0, 0, 0, 256);
    rg.addColorStop(0, "#5f4b8b");
    rg.addColorStop(0.5, "#3b2a66");
    rg.addColorStop(1, "#1d1540");
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
        g.strokeStyle = "rgba(255,255,255," + (0.04 + Math.random() * 0.08) + ")";
        g.lineWidth = 1 + Math.random() * 3;
        g.beginPath();
        const y = Math.random() * 256;
        g.moveTo(0, y);
        g.bezierCurveTo(80, y + 10 - Math.random() * 20, 170, y + 10 - Math.random() * 20, 256, y);
        g.stroke();
    }
    for (let i = 0; i < 30; i++) {
        g.fillStyle = "rgba(120,240,255," + (0.3 + Math.random() * 0.5) + ")";
        g.beginPath();
        g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 0, Math.PI * 2);
        g.fill();
    }
    TX.roca = textura(c, true);

    // cielo galáctico (equirectangular): degradado, nebulosas y vía láctea
    c = lienzo(2048, 1024);
    g = c.getContext("2d");
    const cg = g.createLinearGradient(0, 0, 0, 1024);
    cg.addColorStop(0, "#1b1f6b");
    cg.addColorStop(0.45, "#101447");
    cg.addColorStop(0.7, "#0b0d33");
    cg.addColorStop(1, "#160b3d");
    g.fillStyle = cg;
    g.fillRect(0, 0, 2048, 1024);
    const nebulosa = function (x, y, r, col) {
        const ng = g.createRadialGradient(x, y, 0, x, y, r);
        ng.addColorStop(0, col);
        ng.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = ng;
        g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (let i = 0; i < 26; i++) {
        const cols = ["rgba(120,80,255,0.28)", "rgba(60,180,255,0.24)", "rgba(255,110,200,0.18)", "rgba(40,230,210,0.16)"];
        nebulosa(Math.random() * 2048, 300 + Math.random() * 700, 120 + Math.random() * 300, cols[i % cols.length]);
    }
    for (let i = 0; i < 2600; i++) {
        const a = Math.random();
        g.fillStyle = "rgba(255,255,255," + (0.2 + a * 0.6) + ")";
        g.fillRect(Math.random() * 2048, Math.random() * 1024, a < 0.95 ? 1 : 2, a < 0.95 ? 1 : 2);
    }
    TX.cielo = textura(c);

    // bandera dorada con estrella
    c = lienzo(256, 160);
    g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 256, 160);
    bg.addColorStop(0, "#fff3bf");
    bg.addColorStop(0.45, "#ffd43b");
    bg.addColorStop(1, "#f08c00");
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 160);
    g.strokeStyle = "#fff9db";
    g.lineWidth = 8;
    g.strokeRect(4, 4, 248, 152);
    g.fillStyle = "#fff";
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 ? 22 : 52;
        g.lineTo(128 + Math.cos(a) * r, 82 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    TX.bandera = textura(c);

    // aspa del molino: marco con rejilla luminosa
    c = lienzo(64, 256);
    g = c.getContext("2d");
    const ag = g.createLinearGradient(0, 0, 0, 256);
    ag.addColorStop(0, "#9775fa");
    ag.addColorStop(1, "#4dabf7");
    g.fillStyle = ag;
    g.fillRect(0, 0, 64, 256);
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 3;
    for (let y = 24; y < 256; y += 28) { g.beginPath(); g.moveTo(6, y); g.lineTo(58, y); g.stroke(); }
    g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 256); g.stroke();
    g.lineWidth = 6;
    g.strokeStyle = "#e5dbff";
    g.strokeRect(3, 3, 58, 250);
    TX.aspa = textura(c);

    // ventanas y ladrillos mágicos del molino
    c = lienzo(256, 256);
    g = c.getContext("2d");
    g.fillStyle = "#e7f5ff";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
        for (let x = (y / 32) % 2 ? 0 : 32; x < 256; x += 64) {
            g.fillStyle = (x + y) % 3 ? "#d0ebff" : "#c5f6fa";
            g.fillRect(x + 2, y + 2, 60, 28);
        }
    }
    TX.muro = textura(c, true);

    // chevrones de pendiente (bajada)
    c = lienzo(128, 128);
    g = c.getContext("2d");
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    [20, 64].forEach(function (y) {
        g.beginPath();
        g.moveTo(28, y);
        g.lineTo(64, y + 34);
        g.lineTo(100, y);
        g.stroke();
    });
    TX.chevron = textura(c);

    // superficie de la pelota de energía (remolinos para que se vea girar)
    c = lienzo(256, 128);
    g = c.getContext("2d");
    const pg = g.createLinearGradient(0, 0, 0, 128);
    pg.addColorStop(0, "#c5f6fa");
    pg.addColorStop(0.5, "#22d3ee");
    pg.addColorStop(1, "#0b7285");
    g.fillStyle = pg;
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 6;
    for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.bezierCurveTo(i * 64 + 30, 40, i * 64 - 20, 88, i * 64 + 16, 128);
        g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.95)";
    [[40, 30], [170, 90], [110, 64], [220, 28]].forEach(function (p) {
        g.beginPath();
        g.arc(p[0], p[1], 7, 0, Math.PI * 2);
        g.fill();
    });
    TX.pelota = textura(c);

    // letrero con flecha
    c = lienzo(256, 128);
    g = c.getContext("2d");
    g.fillStyle = "#5f3dc4";
    g.beginPath();
    g.roundRect(4, 4, 248, 120, 26);
    g.fill();
    g.strokeStyle = "#ffe066";
    g.lineWidth = 8;
    g.stroke();
    g.fillStyle = "#ffe066";
    g.beginPath();
    g.moveTo(40, 52); g.lineTo(150, 52); g.lineTo(150, 26); g.lineTo(220, 64); g.lineTo(150, 102); g.lineTo(150, 76); g.lineTo(40, 76);
    g.closePath();
    g.fill();
    TX.letrero = textura(c);
}

// ------------------------------------------------------------------ entorno para reflejos (sin archivos)

function crearEntorno(renderer) {
    const sc = new THREE.Scene();
    const geo = new THREE.SphereGeometry(20, 32, 16);
    const col = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 20;
        const c = new THREE.Color().setHSL(0.68 - y * 0.08, 0.6, 0.16 + Math.max(0, y) * 0.5);
        col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    [[0xffffff, [0, 14, 4]], [0x7af3ff, [10, 5, -6]], [0xff9ee0, [-10, 4, -3]], [0xffe08a, [4, 6, 10]]].forEach(function (l) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), new THREE.MeshBasicMaterial({ color: l[0] }));
        m.position.set(l[1][0], l[1][1], l[1][2]);
        m.lookAt(0, 0, 0);
        sc.add(m);
    });
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromScene(sc, 0.04).texture;
    pm.dispose();
    geo.dispose();
    return env;
}

// ------------------------------------------------------------------ partículas en reserva (un solo Points por textura)

class Reserva {
    constructor(n, mapa, normal) {
        this.n = n;
        this.pos = new Float32Array(n * 3);
        this.col = new Float32Array(n * 3);
        this.tam = new Float32Array(n);
        this.alfa = new Float32Array(n);
        this.vel = new Float32Array(n * 3);
        this.vida = new Float32Array(n);
        this.vidaMax = new Float32Array(n);
        this.tam0 = new Float32Array(n);
        this.tam1 = new Float32Array(n);
        this.grav = new Float32Array(n);
        this.freno = new Float32Array(n);
        this.cursor = 0;
        this.vivas = 0;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("acolor", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("tam", new THREE.BufferAttribute(this.tam, 1).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("alfa", new THREE.BufferAttribute(this.alfa, 1).setUsage(THREE.DynamicDrawUsage));
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 300);
        this.mat = new THREE.ShaderMaterial({
            uniforms: { mapa: { value: mapa }, escala: { value: 400 } },
            vertexShader: [
                "attribute vec3 acolor; attribute float tam; attribute float alfa;",
                "uniform float escala; varying vec3 vC; varying float vA;",
                "void main(){ vC = acolor; vA = alfa;",
                " vec4 mv = modelViewMatrix * vec4(position, 1.0);",
                " gl_PointSize = alfa > 0.0 ? tam * escala / max(0.1, -mv.z) : 0.0;",
                " gl_Position = projectionMatrix * mv; }"
            ].join("\n"),
            fragmentShader: [
                "uniform sampler2D mapa; varying vec3 vC; varying float vA;",
                "void main(){ vec4 t = texture2D(mapa, gl_PointCoord);",
                " float a = t.a * vA; if (a < 0.01) discard;",
                " gl_FragColor = vec4(vC * t.rgb, a); }"
            ].join("\n"),
            transparent: true,
            depthWrite: false,
            blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending
        });
        this.puntos = new THREE.Points(geo, this.mat);
        this.puntos.frustumCulled = false;
        this.puntos.renderOrder = 8;
        this.geo = geo;
    }

    emitir(o) {
        const i = this.cursor;
        this.cursor = (this.cursor + 1) % this.n;
        const k = i * 3;
        this.pos[k] = o.p.x; this.pos[k + 1] = o.p.y; this.pos[k + 2] = o.p.z;
        this.vel[k] = o.v[0]; this.vel[k + 1] = o.v[1]; this.vel[k + 2] = o.v[2];
        this.col[k] = o.color.r; this.col[k + 1] = o.color.g; this.col[k + 2] = o.color.b;
        this.vida[i] = this.vidaMax[i] = o.vida || 1;
        this.tam0[i] = o.tam || 0.3;
        this.tam1[i] = o.tamFin != null ? o.tamFin : 0;
        this.grav[i] = o.grav || 0;
        this.freno[i] = o.freno || 0;
        this.alfa[i] = 1;
        this.tam[i] = this.tam0[i];
    }

    actualizar(dt) {
        let vivas = 0;
        for (let i = 0; i < this.n; i++) {
            if (this.vida[i] <= 0) {
                if (this.alfa[i] !== 0) this.alfa[i] = 0;
                continue;
            }
            vivas++;
            const k = i * 3;
            this.vida[i] -= dt;
            const f = Math.max(0, 1 - this.freno[i] * dt);
            this.vel[k] *= f; this.vel[k + 1] *= f; this.vel[k + 2] *= f;
            this.vel[k + 1] -= this.grav[i] * dt;
            this.pos[k] += this.vel[k] * dt;
            this.pos[k + 1] += this.vel[k + 1] * dt;
            this.pos[k + 2] += this.vel[k + 2] * dt;
            const u = 1 - Math.max(0, this.vida[i]) / this.vidaMax[i];
            this.tam[i] = lerp(this.tam0[i], this.tam1[i], u);
            this.alfa[i] = this.vida[i] <= 0 ? 0 : Math.min(1, (1 - u) * 1.6);
        }
        this.vivas = vivas;
        const a = this.geo.attributes;
        a.position.needsUpdate = a.acolor.needsUpdate = a.tam.needsUpdate = a.alfa.needsUpdate = true;
    }

    vaciar() {
        this.vida.fill(0);
        this.alfa.fill(0);
    }
}

let CH = null;   // chispas
let ES = null;   // estrellas
let CF = null;   // confeti (mezcla normal)

function cuantas(n) {
    const k = [1, 0.7, 0.45][E.nivelCalidad] || 1;
    return Math.max(1, Math.round(n * k));
}

function estallido(p, color, n, fuerza, opts) {
    opts = opts || {};
    const res = opts.reserva || CH;
    const c = new THREE.Color(color);
    for (let i = 0; i < cuantas(n); i++) {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(Math.random() * 2 - 1);
        const s = fuerza * (0.4 + Math.random() * 0.8);
        let v = [Math.sin(b) * Math.cos(a) * s, Math.abs(Math.cos(b)) * s * (opts.arriba || 1), Math.sin(b) * Math.sin(a) * s];
        if (opts.plano) v = [Math.cos(a) * s, (opts.subir || 0.2) * s, Math.sin(a) * s];
        const cc = opts.arcoiris ? new THREE.Color().setHSL(Math.random(), 0.85, 0.62) : c;
        res.emitir({
            p: p, v: v, color: cc,
            vida: (opts.vida || 0.9) * (0.6 + Math.random() * 0.6),
            tam: (opts.tam || 0.18) * (0.6 + Math.random() * 0.8),
            tamFin: opts.tamFin != null ? opts.tamFin : 0.01,
            grav: opts.grav || 0,
            freno: opts.freno != null ? opts.freno : 1.6
        });
    }
}

// ------------------------------------------------------------------ ondas en reserva

const ONDAS = [];

function crearOndas(scene) {
    const geo = new THREE.TorusGeometry(1, 0.03, 6, 64);
    for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        m.visible = false;
        m.renderOrder = 7;
        scene.add(m);
        ONDAS.push({ m: m, t: 0, dur: 1, r0: 0.1, r1: 1, op: 1 });
    }
}

const EJE_Z = new THREE.Vector3(0, 0, 1);

/** Onda circular: por defecto acostada sobre el césped; normal opcional (por ejemplo, la de una pared). */
function onda(p, color, r0, r1, dur, normal, opacidad) {
    const o = ONDAS.find(function (x) { return !x.m.visible; }) || ONDAS[0];
    o.m.position.copy(p);
    o.m.quaternion.setFromUnitVectors(EJE_Z, normal ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0));
    o.m.material.color.set(color);
    o.t = 0;
    o.dur = reducido ? dur * 0.6 : dur;
    o.r0 = r0;
    o.r1 = r1;
    o.op = opacidad == null ? 0.95 : opacidad;
    o.m.visible = true;
}

function actualizarOndas(dt) {
    ONDAS.forEach(function (o) {
        if (!o.m.visible) return;
        o.t += dt;
        const u = Math.min(1, o.t / o.dur);
        const k = 1 - Math.pow(1 - u, 3);
        const r = lerp(o.r0, o.r1, k);
        o.m.scale.set(r, r, r);
        o.m.material.opacity = o.op * (1 - u);
        if (u >= 1) o.m.visible = false;
    });
}

// ------------------------------------------------------------------ materiales

const MT = {};

function crearMateriales() {
    MT.cesped = new THREE.MeshStandardMaterial({ map: TX.cesped, color: 0xffffff, roughness: 0.82, metalness: 0, envMapIntensity: 0.35, vertexColors: true });
    MT.bordeIsla = new THREE.MeshStandardMaterial({ map: TX.borde, color: 0xffffff, roughness: 0.9, envMapIntensity: 0.3 });
    MT.roca = new THREE.MeshStandardMaterial({ map: TX.roca, color: 0xffffff, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.4, flatShading: true });
    MT.pared = new THREE.MeshStandardMaterial({ color: 0x6741d9, roughness: 0.45, metalness: 0.25, envMapIntensity: 0.9 });
    MT.paredCurva = new THREE.MeshStandardMaterial({ color: 0x1098ad, roughness: 0.3, metalness: 0.35, envMapIntensity: 1.1, emissive: 0x0c8599, emissiveIntensity: 0.35 });
    MT.lomo = new THREE.MeshBasicMaterial({ color: 0xd0bfff, toneMapped: false });
    MT.lomoCurva = new THREE.MeshBasicMaterial({ color: 0x66f5ff, toneMapped: false });
    MT.oro = new THREE.MeshStandardMaterial({ color: 0xffc929, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.6, emissive: 0x6b4a00, emissiveIntensity: 0.35 });
    MT.metal = new THREE.MeshStandardMaterial({ color: 0xc9d6f2, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.4 });
    MT.violeta = new THREE.MeshStandardMaterial({ color: 0x7048e8, roughness: 0.4, metalness: 0.3, envMapIntensity: 1 });
    MT.muro = new THREE.MeshStandardMaterial({ map: TX.muro, color: 0xffffff, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.6 });
    MT.techo = new THREE.MeshStandardMaterial({ color: 0x9c36b5, roughness: 0.35, metalness: 0.25, envMapIntensity: 1, flatShading: true });
    MT.ventana = new THREE.MeshBasicMaterial({ color: 0xffe066, toneMapped: false });
    MT.aspa = new THREE.MeshStandardMaterial({ map: TX.aspa, color: 0xffffff, roughness: 0.35, metalness: 0.2, emissive: 0x5c7cfa, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    MT.bordeAspa = new THREE.MeshBasicMaterial({ color: 0x99e9f2, toneMapped: false });
    MT.nucleo = new THREE.MeshBasicMaterial({ color: 0x9ff8ff, toneMapped: false });
    MT.tierra = new THREE.MeshStandardMaterial({ color: 0x2b8a3e, roughness: 0.8 });
}

function sprite(color, escala, opacidad, mapa) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa || TX.brillo, color: color, transparent: true, opacity: opacidad == null ? 0.8 : opacidad, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.set(escala, escala, 1);
    return s;
}

// ------------------------------------------------------------------ fondo espacial (fijo; se crea una vez)

const FONDO = { estrellas: null, nebulosas: [], planetas: [], asteroides: null, fugaces: [], nubes: [], polvo: null, islitas: [], constelaciones: null };

function crearFondo(scene) {
    const cielo = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 24), new THREE.MeshBasicMaterial({ map: TX.cielo, side: THREE.BackSide, depthWrite: false, toneMapped: false, fog: false }));
    cielo.renderOrder = -10;
    scene.add(cielo);
    FONDO.cielo = cielo;

    // estrellas que titilan (fase propia en el shader: cero trabajo por cuadro)
    const n = 1300;
    const pos = new Float32Array(n * 3), fase = new Float32Array(n), tam = new Float32Array(n), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 30;
        const s = Math.sqrt(1 - u * u);
        pos[i * 3] = Math.cos(a) * s * r;
        pos[i * 3 + 1] = u * r;
        pos[i * 3 + 2] = Math.sin(a) * s * r;
        fase[i] = Math.random() * 6.28;
        tam[i] = 0.5 + Math.random() * Math.random() * 2.6;
        const c = new THREE.Color().setHSL([0.58, 0.12, 0.75, 0.5][i % 4], 0.6, 0.85);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("fase", new THREE.BufferAttribute(fase, 1));
    g.setAttribute("tam", new THREE.BufferAttribute(tam, 1));
    g.setAttribute("acolor", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
        uniforms: { t: { value: 0 }, mapa: { value: TX.brillo }, escala: { value: 1 } },
        vertexShader: [
            "attribute float fase; attribute float tam; attribute vec3 acolor; uniform float t; uniform float escala;",
            "varying float vA; varying vec3 vC;",
            "void main(){ vC = acolor; vA = 0.45 + 0.55 * (0.5 + 0.5 * sin(t * (1.2 + fract(fase) * 2.0) + fase * 7.0));",
            " vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = tam * 3.2 * escala; gl_Position = projectionMatrix * mv; }"
        ].join("\n"),
        fragmentShader: [
            "uniform sampler2D mapa; varying float vA; varying vec3 vC;",
            "void main(){ vec4 c = texture2D(mapa, gl_PointCoord); gl_FragColor = vec4(vC, c.a * vA); }"
        ].join("\n"),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    FONDO.estrellas = new THREE.Points(g, mat);
    FONDO.estrellas.renderOrder = -9;
    scene.add(FONDO.estrellas);

    // constelaciones: unas pocas estrellas unidas con líneas tenues
    const lineas = [];
    const grupos = [[[-30, 22, -60], [-24, 26, -62], [-18, 23, -63], [-14, 28, -61], [-9, 25, -62]], [[34, 14, -56], [40, 19, -55], [46, 15, -54], [43, 9, -56], [37, 8, -57]], [[-46, -12, -40], [-40, -6, -44], [-35, -11, -46]]];
    grupos.forEach(function (gr) {
        for (let i = 0; i < gr.length - 1; i++) lineas.push(gr[i][0], gr[i][1], gr[i][2], gr[i + 1][0], gr[i + 1][1], gr[i + 1][2]);
        gr.forEach(function (p) {
            const s = sprite(0xcfe8ff, 2.2, 0.9);
            s.position.set(p[0], p[1], p[2]);
            scene.add(s);
        });
    });
    const gl = new THREE.BufferGeometry();
    gl.setAttribute("position", new THREE.Float32BufferAttribute(lineas, 3));
    FONDO.constelaciones = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0x99c8ff, transparent: true, opacity: 0.35, depthWrite: false }));
    scene.add(FONDO.constelaciones);

    // nebulosas que cambian de intensidad
    [[-38, 6, -60, 70, 0x7c5cff], [42, -8, -55, 60, 0x2fb5ff], [8, -40, -30, 70, 0xff6fd0], [-20, -30, 30, 60, 0x22d3c0]].forEach(function (nb, i) {
        const s = sprite(nb[4], nb[3], 0.22);
        s.position.set(nb[0], nb[1], nb[2]);
        s.renderOrder = -8;
        s.userData.fase = i * 1.7;
        scene.add(s);
        FONDO.nebulosas.push(s);
    });

    // planetas
    const planeta = function (radio, c1, c2, pos, anillo) {
        const c = lienzo(256, 128);
        const g2 = c.getContext("2d");
        const gr = g2.createLinearGradient(0, 0, 0, 128);
        gr.addColorStop(0, c1);
        gr.addColorStop(1, c2);
        g2.fillStyle = gr;
        g2.fillRect(0, 0, 256, 128);
        for (let i = 0; i < 9; i++) {
            g2.fillStyle = "rgba(255,255,255," + (0.05 + Math.random() * 0.12) + ")";
            g2.fillRect(0, Math.random() * 128, 256, 3 + Math.random() * 10);
        }
        const m = new THREE.Mesh(new THREE.SphereGeometry(radio, 32, 20), new THREE.MeshStandardMaterial({ map: textura(c), roughness: 0.8, emissive: new THREE.Color(c1), emissiveIntensity: 0.12, fog: false }));
        m.position.set(pos[0], pos[1], pos[2]);
        m.rotation.z = 0.35;
        scene.add(m);
        if (anillo) {
            const a = new THREE.Mesh(new THREE.RingGeometry(radio * 1.4, radio * 2.1, 64), new THREE.MeshBasicMaterial({ color: 0xffd8a8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false }));
            a.rotation.x = Math.PI / 2.4;
            m.add(a);
        }
        const halo = sprite(new THREE.Color(c1), radio * 3.2, 0.35);
        halo.position.copy(m.position);
        halo.renderOrder = -7;
        scene.add(halo);
        FONDO.planetas.push(m);
        return m;
    };
    planeta(5.5, "#ffb86b", "#c0392b", [-30, -10, -34], true);
    planeta(3.2, "#74c0fc", "#3b5bdb", [30, -4, -36], false);
    planeta(2.2, "#e599f7", "#862e9c", [20, -26, -8], false);
    planeta(8, "#63e6be", "#0b7285", [-26, -38, 10], true);

    // cinturón de asteroides lejanos (una sola malla instanciada)
    const nA = 42;
    const geoA = new THREE.IcosahedronGeometry(1, 0);
    FONDO.asteroides = new THREE.InstancedMesh(geoA, new THREE.MeshStandardMaterial({ color: 0x8c7bb8, roughness: 0.9, flatShading: true }), nA);
    const dummy = new THREE.Object3D();
    FONDO.datosAst = [];
    for (let i = 0; i < nA; i++) {
        const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 16;
        FONDO.datosAst.push({ a: a, r: r, y: -14 + Math.random() * 10, s: 0.3 + Math.random() * 1.1, w: 0.01 + Math.random() * 0.02, rot: Math.random() * 6 });
        dummy.position.set(Math.cos(a) * r, -10, Math.sin(a) * r);
        dummy.updateMatrix();
        FONDO.asteroides.setMatrixAt(i, dummy.matrix);
    }
    scene.add(FONDO.asteroides);

    // estrellas fugaces (dos en reserva): sprites alargados que giran según su recorrido en pantalla
    const cf = lienzo(256, 16);
    const g3 = cf.getContext("2d");
    const grf = g3.createLinearGradient(0, 0, 256, 0);
    grf.addColorStop(0, "rgba(255,255,255,0)");
    grf.addColorStop(0.85, "rgba(200,240,255,0.9)");
    grf.addColorStop(1, "rgba(255,255,255,1)");
    g3.fillStyle = grf;
    g3.fillRect(0, 4, 256, 8);
    const txf = textura(cf);
    for (let i = 0; i < 2; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: txf, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
        m.visible = false;
        m.renderOrder = -6;
        scene.add(m);
        FONDO.fugaces.push({ m: m, t: 0, dur: 1, desde: new THREE.Vector3(), hasta: new THREE.Vector3(), espera: 2 + i * 4 + Math.random() * 4 });
    }

    // nubes mágicas (manchas suaves de color que pasan despacio)
    [[-14, -4, -8, 12, 0xb197fc], [14, -6, -10, 14, 0x74c0fc], [0, -9, 9, 16, 0xfcc2d7], [-16, -7, 6, 11, 0x96f2d7]].forEach(function (nb, i) {
        const s = sprite(nb[4], nb[3], 0.16);
        s.position.set(nb[0], nb[1], nb[2]);
        s.material.blending = THREE.NormalBlending;
        s.material.opacity = 0.18;
        s.userData = { x0: nb[0], fase: i * 1.3 };
        scene.add(s);
        FONDO.nubes.push(s);
    });

    // polvo cósmico flotante alrededor de la isla (se mueve en el shader)
    const nP = 260;
    const pp = new Float32Array(nP * 3), pf = new Float32Array(nP);
    for (let i = 0; i < nP; i++) {
        pp[i * 3] = (Math.random() - 0.5) * 22;
        pp[i * 3 + 1] = -2 + Math.random() * 6;
        pp[i * 3 + 2] = (Math.random() - 0.5) * 16;
        pf[i] = Math.random() * 6.28;
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    gp.setAttribute("fase", new THREE.BufferAttribute(pf, 1));
    FONDO.polvo = new THREE.Points(gp, new THREE.ShaderMaterial({
        uniforms: { t: { value: 0 }, mapa: { value: TX.brillo }, escala: { value: 400 } },
        vertexShader: [
            "attribute float fase; uniform float t; uniform float escala; varying float vA;",
            "void main(){ vec3 p = position; p.y += sin(t * 0.4 + fase) * 0.4; p.x += sin(t * 0.23 + fase * 2.0) * 0.5;",
            " vA = 0.35 + 0.35 * sin(t * 1.7 + fase * 3.0);",
            " vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 0.09 * escala / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }"
        ].join("\n"),
        fragmentShader: [
            "uniform sampler2D mapa; varying float vA;",
            "void main(){ vec4 c = texture2D(mapa, gl_PointCoord); gl_FragColor = vec4(vec3(0.75, 0.95, 1.0), c.a * vA); }"
        ].join("\n"),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    FONDO.polvo.frustumCulled = false;
    scene.add(FONDO.polvo);

    // islitas flotantes con un cristal grande o un racimo de gemas
    [[-11.5, -2.2, -4.5, 1.2], [11, -1.6, -5.5, 1.0], [-10, -3.2, 5.5, 0.9], [12, -3.5, 4.5, 1.3]].forEach(function (is, i) {
        const g4 = new THREE.Group();
        const roca = new THREE.Mesh(new THREE.ConeGeometry(is[3], is[3] * 1.8, 7, 2), MT.roca);
        roca.rotation.x = Math.PI;
        roca.position.y = -is[3] * 0.9;
        g4.add(roca);
        const tapa = new THREE.Mesh(new THREE.CylinderGeometry(is[3] * 1.02, is[3], 0.18, 14), MT.tierra);
        g4.add(tapa);
        if (i % 2 === 0) {
            const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(is[3] * 0.45, 0), new THREE.MeshStandardMaterial({ color: 0x66d9e8, emissive: 0x15aabf, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.3 }));
            cristal.scale.y = 1.8;
            cristal.position.y = is[3] * 0.8;
            g4.add(cristal);
        } else {
            const matRacimo = new THREE.MeshStandardMaterial({ color: 0xff8ae2, emissive: 0xc2255c, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.3, flatShading: true });
            [[0, 0, 1.3, 0], [0.32, 0.1, 0.9, 0.35], [-0.3, -0.12, 0.8, -0.4], [0.05, 0.3, 0.7, 0.2]].forEach(function (c) {
                const cr = new THREE.Mesh(new THREE.OctahedronGeometry(is[3] * 0.22, 0), matRacimo);
                cr.scale.y = 2.2 * c[2];
                cr.position.set(c[0] * is[3], is[3] * 0.4 * c[2] + 0.05, c[1] * is[3]);
                cr.rotation.z = c[3];
                g4.add(cr);
            });
        }
        const brillo = sprite(0x99e9f2, is[3] * 4, 0.18);
        g4.add(brillo);
        g4.position.set(is[0], is[1], is[2]);
        g4.userData = { y0: is[1], fase: i * 1.6 };
        scene.add(g4);
        FONDO.islitas.push(g4);
    });
}

function actualizarFondo(dt) {
    const t = E.reloj;
    FONDO.estrellas.material.uniforms.t.value = t;
    FONDO.polvo.material.uniforms.t.value = t;
    FONDO.nebulosas.forEach(function (s) { s.material.opacity = 0.16 + 0.1 * Math.sin(t * 0.35 + s.userData.fase); });
    FONDO.planetas.forEach(function (p, i) { p.rotation.y += dt * (0.04 + i * 0.015); });
    FONDO.nubes.forEach(function (s) { s.position.x = s.userData.x0 + Math.sin(t * 0.05 + s.userData.fase) * 3; });
    FONDO.islitas.forEach(function (g) {
        g.position.y = g.userData.y0 + Math.sin(t * 0.6 + g.userData.fase) * 0.18;
        g.rotation.y += dt * 0.12;
    });
    const dummy = OBJ_TMP;
    FONDO.datosAst.forEach(function (a, i) {
        a.a += a.w * dt;
        a.rot += dt * 0.3;
        dummy.position.set(Math.cos(a.a) * a.r, a.y, Math.sin(a.a) * a.r);
        dummy.rotation.set(a.rot, a.rot * 0.7, 0);
        dummy.scale.setScalar(a.s);
        dummy.updateMatrix();
        FONDO.asteroides.setMatrixAt(i, dummy.matrix);
    });
    FONDO.asteroides.instanceMatrix.needsUpdate = true;
    // estrellas fugaces
    FONDO.fugaces.forEach(function (f) {
        if (!f.m.visible) {
            f.espera -= dt;
            if (f.espera > 0 || reducido) return;
            const a = Math.random() * Math.PI * 2;
            f.desde.set(Math.cos(a) * 40, -6 + Math.random() * 20, -40 + Math.random() * 20);
            f.hasta.copy(f.desde).add(new THREE.Vector3(-14 - Math.random() * 10, -6 - Math.random() * 6, 6));
            f.t = 0;
            f.dur = 0.9 + Math.random() * 0.5;
            f.m.visible = true;
            return;
        }
        f.t += dt;
        const u = f.t / f.dur;
        f.m.position.lerpVectors(f.desde, f.hasta, u);
        const pa = f.desde.clone().project(E.camera), pb = f.hasta.clone().project(E.camera);
        f.m.material.rotation = Math.atan2((pb.y - pa.y), (pb.x - pa.x) * E.camera.aspect);
        f.m.scale.set(7, 0.45, 1);
        f.m.material.opacity = Math.sin(Math.min(1, u) * Math.PI);
        if (u >= 1) {
            f.m.visible = false;
            f.espera = 4 + Math.random() * 7;
        }
    });
}

const OBJ_TMP = new THREE.Object3D();
let HI = -0.07;   // altura de la tapa de la isla: siempre por debajo del punto más bajo del césped

// ------------------------------------------------------------------ el campo de cada nivel

const C = {
    grupo: null,
    paredes: null,
    lomoCurva: null,
    molino: null,
    asteroide: null,
    hoyo: null,
    bandera: null,
    gemas: null,
    molinos: [],
    asteroides: [],
    postes: [],
    datosGemas: [],
    trofeos: [],
    banderines: [],
    chevrones: null,
    luces: [],
    limites: null
};

function liberar(obj) {
    obj.traverse(function (o) {
        if (o.geometry && !o.geometry.userData.compartida) o.geometry.dispose();
        if (o.material && !o.material.userData.compartido) {
            if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
            else o.material.dispose();
        }
    });
}

function marcarCompartidos() {
    Object.keys(MT).forEach(function (k) { MT[k].userData.compartido = true; });
}

function areaFirmada(pol) {
    let a = 0;
    for (let i = 0; i < pol.length; i++) {
        const p = pol[i], q = pol[(i + 1) % pol.length];
        a += p[0] * q[1] - q[0] * p[1];
    }
    return a / 2;
}

/** Normales hacia afuera en cada vértice del borde (promedio de las aristas vecinas). */
function normalesAfuera(pol) {
    const sg = areaFirmada(pol) > 0 ? 1 : -1;
    const n = pol.length;
    const ne = [];
    for (let i = 0; i < n; i++) {
        const p = pol[i], q = pol[(i + 1) % n];
        const dx = q[0] - p[0], dz = q[1] - p[1];
        const l = Math.hypot(dx, dz) || 1;
        // interior a la izquierda si el área es positiva → afuera a la derecha
        ne.push([sg * dz / l, -sg * dx / l]);
    }
    const nv = [];
    for (let i = 0; i < n; i++) {
        const a = ne[(i - 1 + n) % n], b = ne[i];
        let x = a[0] + b[0], z = a[1] + b[1];
        const l = Math.hypot(x, z) || 1;
        x /= l;
        z /= l;
        const cos = Math.max(0.5, x * b[0] + z * b[1]);
        nv.push([x / cos, z / cos]);
    }
    return nv;
}

/** Envolvente convexa (para la isla). */
function envolvente(pts) {
    const p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    const cruz = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    const lo = [], hi = [];
    p.forEach(function (q) {
        while (lo.length >= 2 && cruz(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
        lo.push(q);
    });
    for (let i = p.length - 1; i >= 0; i--) {
        const q = p[i];
        while (hi.length >= 2 && cruz(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop();
        hi.push(q);
    }
    hi.pop();
    lo.pop();
    return lo.concat(hi);
}

/** Polígono convexo inflado con esquinas redondeadas. */
function inflar(conv, d) {
    const out = [];
    const n = conv.length;
    const sg = areaFirmada(conv) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
        const p = conv[i];
        const a = conv[(i - 1 + n) % n], b = conv[(i + 1) % n];
        const n1 = [sg * (p[1] - a[1]), -sg * (p[0] - a[0])], n2 = [sg * (b[1] - p[1]), -sg * (b[0] - p[0])];
        const l1 = Math.hypot(n1[0], n1[1]) || 1, l2 = Math.hypot(n2[0], n2[1]) || 1;
        let a1 = Math.atan2(n1[1] / l1, n1[0] / l1), a2 = Math.atan2(n2[1] / l2, n2[0] / l2);
        let da = a2 - a1;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const pasos = Math.max(1, Math.ceil(Math.abs(da) / 0.25));
        for (let k = 0; k <= pasos; k++) {
            const ang = a1 + da * k / pasos;
            out.push([p[0] + Math.cos(ang) * d, p[1] + Math.sin(ang) * d]);
        }
    }
    return out;
}

function crearCesped(nv) {
    const pol = nv.borde;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    pol.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
    const paso = 0.1;
    x0 -= 0.2; z0 -= 0.2; x1 += 0.2; z1 += 0.2;
    const nx = Math.ceil((x1 - x0) / paso), nz = Math.ceil((z1 - z0) / paso);
    const dentro = [];
    for (let iz = 0; iz <= nz; iz++) {
        for (let ix = 0; ix <= nx; ix++) dentro.push(R().dentroPoligono(pol, x0 + ix * paso, z0 + iz * paso));
    }
    const pos = [], uv = [], col = [], idx = [];
    const mapa = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
    const vert = function (ix, iz) {
        const k = iz * (nx + 1) + ix;
        if (mapa[k] >= 0) return mapa[k];
        const x = x0 + ix * paso, z = z0 + iz * paso;
        const hg = R().alturaYGrad(nv, x, z);
        pos.push(x, hg.h, z);
        uv.push(x * 0.42, z * 0.42);
        // color por pendiente: bajadas más claras, subidas un poco más oscuras (ayuda a ver el relieve)
        const pend = Math.min(1, Math.hypot(hg.gx, hg.gz) * 6);
        const tono = 0.92 - pend * 0.2 + hg.h * 0.8;
        col.push(tono * 0.9, tono, tono * 0.86);
        mapa[k] = pos.length / 3 - 1;
        return mapa[k];
    };
    for (let iz = 0; iz < nz; iz++) {
        for (let ix = 0; ix < nx; ix++) {
            const k = iz * (nx + 1) + ix;
            if (!(dentro[k] || dentro[k + 1] || dentro[k + nx + 1] || dentro[k + nx + 2])) continue;
            const a = vert(ix, iz), b = vert(ix + 1, iz), c = vert(ix, iz + 1), d = vert(ix + 1, iz + 1);
            idx.push(a, c, b, b, c, d);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, MT.cesped);
    m.receiveShadow = true;
    return m;
}

/** Paredes: cara interior, lomo luminoso y cara exterior, siguiendo la altura del terreno. */
function crearParedes(nv) {
    const pol = nv.borde;
    const nrm = normalesAfuera(pol);
    const n = pol.length;
    const grupos = { borde: { pos: [], idx: [] }, curva: { pos: [], idx: [] } };
    const lomos = { borde: { pos: [], idx: [] }, curva: { pos: [], idx: [] } };
    const aristas = nv.pista.aristas;
    const quad = function (g, a, b, c, d) {
        const i = g.pos.length / 3;
        g.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        g.idx.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
    };
    for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        const tipo = aristas[i] && aristas[i].tipo === "curva" ? "curva" : "borde";
        const p = pol[i], q = pol[k];
        const hp = alt(p[0], p[1]), hq = alt(q[0], q[1]);
        const op = [p[0] + nrm[i][0] * GROSOR_PARED, p[1] + nrm[i][1] * GROSOR_PARED];
        const oq = [q[0] + nrm[k][0] * GROSOR_PARED, q[1] + nrm[k][1] * GROSOR_PARED];
        const g = grupos[tipo];
        // cara interior
        quad(g, [p[0], hp - 0.05, p[1]], [q[0], hq - 0.05, q[1]], [p[0], hp + ALTO_PARED, p[1]], [q[0], hq + ALTO_PARED, q[1]]);
        // cara exterior (baja hasta el borde de la isla)
        quad(g, [oq[0], hq + ALTO_PARED, oq[1]], [op[0], hp + ALTO_PARED, op[1]], [oq[0], HI + 0.01, oq[1]], [op[0], HI + 0.01, op[1]]);
        // lomo luminoso
        quad(lomos[tipo], [p[0], hp + ALTO_PARED, p[1]], [q[0], hq + ALTO_PARED, q[1]], [op[0], hp + ALTO_PARED, op[1]], [oq[0], hq + ALTO_PARED, oq[1]]);
    }
    const g = new THREE.Group();
    const malla = function (d, mat, sombra) {
        if (!d.pos.length) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(d.pos, 3));
        geo.setIndex(d.idx);
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = !!sombra;
        m.receiveShadow = true;
        g.add(m);
        return m;
    };
    malla(grupos.borde, new THREE.MeshStandardMaterial({ color: new THREE.Color(TEMA.pared), roughness: 0.45, metalness: 0.25, envMapIntensity: 0.9, side: THREE.DoubleSide }), true);
    C.paredCurva = malla(grupos.curva, new THREE.MeshStandardMaterial({ color: 0x1098ad, roughness: 0.3, metalness: 0.35, envMapIntensity: 1.1, emissive: 0x0c8599, emissiveIntensity: 0.35, side: THREE.DoubleSide }), true);
    malla(lomos.borde, new THREE.MeshBasicMaterial({ color: new THREE.Color(TEMA.lomo), toneMapped: false, side: THREE.DoubleSide }));
    C.lomoCurva = malla(lomos.curva, new THREE.MeshBasicMaterial({ color: 0x66f5ff, toneMapped: false, side: THREE.DoubleSide }));
    return g;
}

/** La isla flotante: tapa de tierra mágica, falda de roca, raíces colgantes y cristales. */
function crearIsla(nv) {
    const g = new THREE.Group();
    const pts = [];
    nv.borde.forEach(function (p) { pts.push(p); });
    // el molino decorativo también se para sobre la isla
    nv.molinos.forEach(function (m) {
        if (!m.decorativo) return;
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            pts.push([m.x + Math.cos(a) * 1.25, m.z + Math.sin(a) * 1.25]);
        }
    });
    const conv = inflar(envolvente(pts), BORDE_ISLA);
    C.isla = conv;
    const forma = new THREE.Shape(conv.map(function (p) { return new THREE.Vector2(p[0], -p[1]); }));
    const tapa = new THREE.Mesh(new THREE.ShapeGeometry(forma), MT.bordeIsla);
    tapa.geometry.attributes.uv.array.forEach(function (v, i, arr) { arr[i] = v * 0.4; });
    tapa.rotation.x = -Math.PI / 2;
    tapa.position.y = HI;
    tapa.receiveShadow = true;
    g.add(tapa);
    // falda: un anillo que baja desde el borde y se cierra un poco hacia el centro de la isla
    let cx0 = 0, cz0 = 0;
    conv.forEach(function (p) { cx0 += p[0]; cz0 += p[1]; });
    cx0 /= conv.length;
    cz0 /= conv.length;
    const abajo = function (p, k) { return [cx0 + (p[0] - cx0) * k, cz0 + (p[1] - cz0) * k]; };
    const pos = [], idx = [], uv = [];
    let s = 0;
    conv.forEach(function (p, i) {
        const q = conv[(i + 1) % conv.length];
        const base = pos.length / 3;
        const pa = abajo(p, 0.96), qa = abajo(q, 0.96);
        pos.push(p[0], HI, p[1], q[0], HI, q[1], pa[0], HI - 0.68, pa[1], qa[0], HI - 0.68, qa[1]);
        const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
        uv.push(s, 0, s + l * 0.5, 0, s, 1, s + l * 0.5, 1);
        s += l * 0.5;
        idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    });
    const gf = new THREE.BufferGeometry();
    gf.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gf.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    gf.setIndex(idx);
    gf.computeVertexNormals();
    g.add(new THREE.Mesh(gf, new THREE.MeshStandardMaterial({ map: TX.roca, roughness: 0.85, side: THREE.DoubleSide })));
    // raíces de roca colgantes y cristales
    let cx = 0, cz = 0;
    conv.forEach(function (p) { cx += p[0]; cz += p[1]; });
    cx /= conv.length;
    cz /= conv.length;
    let rMax = 0;
    conv.forEach(function (p) { rMax = Math.max(rMax, Math.hypot(p[0] - cx, p[1] - cz)); });
    // panza de roca: un cono con la misma forma de la isla, que termina en punta debajo del centro
    const fondoY = HI - 0.68, puntaY = HI - 0.68 - rMax * 0.7;
    const pv = [], iv = [];
    conv.forEach(function (p) { const b = abajo(p, 0.96); pv.push(b[0], fondoY, b[1]); });
    pv.push(cx, puntaY, cz);
    const ip = conv.length;
    for (let i = 0; i < conv.length; i++) iv.push(i, (i + 1) % conv.length, ip);
    const gp = new THREE.BufferGeometry();
    gp.setAttribute("position", new THREE.Float32BufferAttribute(pv, 3));
    gp.setIndex(iv);
    gp.computeVertexNormals();
    const panza = new THREE.Mesh(gp, new THREE.MeshStandardMaterial({ color: 0x4a3a80, roughness: 0.9, side: THREE.DoubleSide, flatShading: true }));
    g.add(panza);
    // rocas colgantes y cristales, siempre debajo de la isla (entre el centro y el borde)
    for (let i = 0; i < 7; i++) {
        const q = conv[Math.floor((i + 0.5) / 7 * conv.length)];
        const k = 0.35 + Math.random() * 0.3;
        const x = cx + (q[0] - cx) * k, z = cz + (q[1] - cz) * k;
        const largo = 1.2 + Math.random() * 1.8;
        const r = new THREE.Mesh(new THREE.ConeGeometry(0.3 + Math.random() * 0.35, largo, 6), MT.roca);
        r.rotation.x = Math.PI;
        r.position.set(x, HI - 0.7 - rMax * 0.7 * (1 - k) * 0.8 - largo / 2, z);
        g.add(r);
        if (i % 2 === 0) {
            const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: i % 4 ? 0x66f5ff : 0xff8ae2, toneMapped: false }));
            const kk = 0.85;
            cr.position.set(cx + (q[0] - cx) * kk, HI - 0.78, cz + (q[1] - cz) * kk);
            cr.scale.y = 1.8;
            g.add(cr);
        }
    }
    return g;
}

/** Chevrones animados donde el terreno baja (señalan hacia dónde rodará la pelota). */
function crearChevrones(nv) {
    const lista = [];
    const c = nv.pista.centro;
    for (let i = 0; i < c.length; i += 3) {
        for (let l = -1; l <= 1; l += 2) {
            const x = c[i].x - Math.sin(c[i].psi) * l * nv.pista.ancho * 0.3;
            const z = c[i].z + Math.cos(c[i].psi) * l * nv.pista.ancho * 0.3;
            const hg = R().alturaYGrad(nv, x, z);
            const gm = Math.hypot(hg.gx, hg.gz);
            if (gm < 0.04) continue;
            if (Math.hypot(x - nv.hoyo.x, z - nv.hoyo.z) < nv.hoyo.r * 3) continue;
            if (Math.hypot(x - nv.salida.x, z - nv.salida.z) < 0.6) continue;
            lista.push({ x: x, z: z, h: hg.h, ang: Math.atan2(-hg.gz, -hg.gx), fuerza: gm });
        }
    }
    if (!lista.length) return null;
    const geo = new THREE.PlaneGeometry(0.42, 0.42);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: TX.chevron, color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    lista.forEach(function (it, i) {
        OBJ_TMP.position.set(it.x, it.h + 0.012, it.z);
        // la textura apunta hacia +z de la imagen (abajo); se gira hacia la bajada
        OBJ_TMP.rotation.set(0, -it.ang + Math.PI / 2, 0);
        OBJ_TMP.scale.setScalar(0.8 + Math.min(1, it.fuerza * 4) * 0.5);
        OBJ_TMP.updateMatrix();
        m.setMatrixAt(i, OBJ_TMP.matrix);
    });
    m.userData.lista = lista;
    return m;
}

// ------------------------------------------------------------------ molino

function crearMolino(m) {
    const g = new THREE.Group();
    const f = R().marcoMolino(m);
    g.position.set(m.x, m.decorativo ? HI + 0.05 : alt(m.x, m.z), m.z);
    g.rotation.y = -m.yaw;
    const D = m.D, w = m.w / 2;
    const casaV = w + 0.26;
    // pilares del túnel y casa encima (local: X = u hacia adelante, Z = v a un lado)
    [-1, 1].forEach(function (sg) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(D, 0.5, casaV - w), MT.muro);
        pil.position.set(0, 0.25, sg * (w + (casaV - w) / 2));
        pil.castShadow = true;
        pil.receiveShadow = true;
        g.add(pil);
    });
    if (!m.decorativo) {
        // bloques bajos que cierran la pista a los lados de la torre y el embudo
        [-1, 1].forEach(function (sg) {
            const forma = new THREE.Shape();
            const W = m.W / 2 + 0.15;
            const p = sg > 0 ? [[-D / 2, w], [D / 2, w], [D / 2 + 0.35, W], [-D / 2 - m.F, W]] : [[-D / 2 - m.F, -W], [D / 2 + 0.35, -W], [D / 2, -w], [-D / 2, -w]];
            forma.moveTo(p[0][0], -p[0][1]);
            for (let i = 1; i < p.length; i++) forma.lineTo(p[i][0], -p[i][1]);
            forma.closePath();
            const geo = new THREE.ExtrudeGeometry(forma, { depth: ALTO_PARED + 0.06, bevelEnabled: false });
            geo.rotateX(-Math.PI / 2);
            const b = new THREE.Mesh(geo, MT.pared);
            b.position.y = -0.06;
            b.castShadow = true;
            b.receiveShadow = true;
            g.add(b);
            // lomo luminoso del embudo
            const lomo = new THREE.Mesh(new THREE.ShapeGeometry(forma), MT.lomo);
            lomo.rotation.x = -Math.PI / 2;
            lomo.position.y = ALTO_PARED + 0.005;
            g.add(lomo);
        });
    }
    const altoCasa = Math.max(0.7, m.H - 0.45);
    const casa = new THREE.Mesh(new THREE.BoxGeometry(D, altoCasa, casaV * 2), MT.muro);
    casa.position.y = 0.5 + altoCasa / 2;
    casa.castShadow = true;
    casa.receiveShadow = true;
    g.add(casa);
    // arco luminoso de la boca y ventanas
    const arco = new THREE.Mesh(new THREE.TorusGeometry(w, 0.05, 8, 24, Math.PI), MT.ventana);
    arco.rotation.y = Math.PI / 2;
    arco.position.set(-D / 2 - 0.01, 0.0, 0);
    arco.scale.y = 0.95;
    g.add(arco);
    [-1, 1].forEach(function (sg) {
        const ven = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), MT.ventana);
        ven.rotation.y = -Math.PI / 2;
        ven.position.set(-D / 2 - 0.012, 0.5 + altoCasa * 0.45, sg * casaV * 0.6);
        g.add(ven);
    });
    const techo = new THREE.Mesh(new THREE.ConeGeometry(casaV * 1.3, 0.7, 4), MT.techo);
    techo.rotation.y = Math.PI / 4;
    techo.scale.set(D / (casaV * 1.7), 1, 1);
    techo.position.y = 0.5 + altoCasa + 0.35;
    techo.castShadow = true;
    g.add(techo);
    const punta = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), MT.oro);
    punta.position.y = 0.5 + altoCasa + 0.74;
    g.add(punta);
    // plataforma redonda de soporte
    const base = new THREE.Mesh(new THREE.CylinderGeometry(casaV * 1.25, casaV * 1.35, 0.1, 28), MT.metal);
    base.position.y = -0.03;
    if (m.decorativo) g.add(base);
    // eje, núcleo de energía y aspas
    const ug = R().bocaMolino(m);
    const rotor = new THREE.Group();
    rotor.position.set(ug, m.H, 0);
    g.add(rotor);
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, Math.abs(ug) - D / 2 + 0.25, 12), MT.metal);
    eje.rotation.z = Math.PI / 2;
    eje.position.set(-ug - D / 2 + (Math.abs(ug) - D / 2 + 0.25) / 2 - 0.1 + ug - ug, m.H, 0);
    eje.position.x = (ug + (-D / 2)) / 2;
    g.add(eje);
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), MT.nucleo);
    rotor.add(nucleo);
    const halo = sprite(0x66f5ff, 0.9, 0.8);
    rotor.add(halo);
    [0.24, 0.32].forEach(function (rr, i) {
        const an = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.025, 8, 32), i ? MT.oro : MT.bordeAspa);
        an.rotation.y = Math.PI / 2;
        g.add(an);
        an.position.set(ug - 0.02 - i * 0.02, m.H, 0);
    });
    const aspas = new THREE.Group();
    rotor.add(aspas);
    const largoVis = m.L - 0.12;
    const matAspa = MT.aspa.clone();
    const matBorde = MT.bordeAspa.clone();
    for (let k = 0; k < 4; k++) {
        const brazo = new THREE.Group();
        brazo.rotation.x = -k * Math.PI / 2;
        const pala = new THREE.Mesh(new THREE.BoxGeometry(0.05, largoVis, m.bw * 2.3), matAspa);
        pala.position.y = -(0.18 + largoVis / 2);
        pala.castShadow = true;
        brazo.add(pala);
        const filo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, m.bw * 2.3 + 0.04), matBorde);
        filo.position.y = -(0.18 + largoVis);
        brazo.add(filo);
        const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), MT.metal);
        vara.position.y = -0.1;
        brazo.add(vara);
        aspas.add(brazo);
    }
    g.userData = { aspas: aspas, rotor: rotor, matAspa: matAspa, matBorde: matBorde, halo: halo, ventanas: MT.ventana };
    return g;
}

// ------------------------------------------------------------------ hoyo, bandera y trofeos

function crearHoyo(nv) {
    const g = new THREE.Group();
    const h = nv.hoyo;
    let hBorde = -Infinity;
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        hBorde = Math.max(hBorde, alt(h.x + Math.cos(a) * h.r, h.z + Math.sin(a) * h.r));
    }
    g.position.set(h.x, hBorde + 0.006, h.z);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(h.r, 40), new THREE.MeshBasicMaterial({ map: TX.hoyo, transparent: true, depthWrite: false }));
    disco.rotation.x = -Math.PI / 2;
    disco.renderOrder = 2;
    g.add(disco);
    const borde = new THREE.Mesh(new THREE.TorusGeometry(h.r, 0.035, 10, 48), MT.oro);
    borde.rotation.x = Math.PI / 2;
    g.add(borde);
    const aura = sprite(0xffd43b, h.r * 5, 0.45);
    aura.position.y = 0.05;
    g.add(aura);
    const anillo = new THREE.Mesh(new THREE.RingGeometry(h.r * 1.05, h.r * 1.35, 48), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = 0.004;
    g.add(anillo);
    const luz = new THREE.PointLight(0xffd43b, 1.2, 3, 2);
    luz.position.y = 0.5;
    g.add(luz);
    // bandera: poste detrás del hoyo (no tapa la boca) y paño que ondea
    const asta = new THREE.Group();
    asta.position.set(-0.05, 0, -(h.r + 0.07));
    g.add(asta);
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.3, 10), MT.metal);
    poste.position.y = 0.65;
    poste.castShadow = true;
    asta.add(poste);
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), MT.oro);
    bola.position.y = 1.32;
    asta.add(bola);
    const estrellaTope = sprite(0xffe066, 0.5, 0.9, TX.estrella);
    estrellaTope.position.y = 1.36;
    asta.add(estrellaTope);
    const geoPano = new THREE.PlaneGeometry(0.62, 0.4, 12, 4);
    geoPano.translate(0.31, 0, 0);
    const pano = new THREE.Mesh(geoPano, new THREE.MeshStandardMaterial({ map: TX.bandera, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2, emissive: 0x8a5a00, emissiveIntensity: 0.25 }));
    pano.position.y = 1.08;
    pano.castShadow = true;
    asta.add(pano);
    const base0 = geoPano.attributes.position.array.slice();
    g.userData = { aura: aura, anillo: anillo, luz: luz, asta: asta, pano: pano, base0: base0, estrellaTope: estrellaTope, hBorde: hBorde };
    return g;
}

function trofeo(escala) {
    const g = new THREE.Group();
    const copa = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.18, 0.02), new THREE.Vector2(0.2, 0.12), new THREE.Vector2(0.07, 0.18), new THREE.Vector2(0.05, 0.32), new THREE.Vector2(0.12, 0.36), new THREE.Vector2(0.24, 0.52), new THREE.Vector2(0.26, 0.72), new THREE.Vector2(0.22, 0.72), new THREE.Vector2(0.2, 0.55), new THREE.Vector2(0.0, 0.5)], 24), MT.oro);
    g.add(copa);
    [-1, 1].forEach(function (sg) {
        const asa = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), MT.oro);
        asa.position.set(sg * 0.26, 0.58, 0);
        asa.rotation.z = sg > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(asa);
    });
    const est = sprite(0xffffff, 0.45, 0.85, TX.estrella);
    est.position.y = 0.86;
    g.add(est);
    g.scale.setScalar(escala || 1);
    return g;
}

// ------------------------------------------------------------------ adornos alrededor del campo

function lugaresLibres(nv, n, minDist, cerca) {
    const out = [];
    const conv = C.isla;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    conv.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
    let intentos = 0;
    while (out.length < n && intentos < n * 80) {
        intentos++;
        const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0);
        if (!R().dentroPoligono(conv, x, z)) continue;
        if (R().dentroPoligono(nv.borde, x, z)) continue;
        let dPared = Infinity;
        nv.borde.forEach(function (p) { dPared = Math.min(dPared, Math.hypot(p[0] - x, p[1] - z)); });
        if (dPared < 0.42) continue;
        // no muy cerca del borde de la isla
        let dIsla = Infinity;
        conv.forEach(function (p) { dIsla = Math.min(dIsla, Math.hypot(p[0] - x, p[1] - z)); });
        if (dIsla < 0.18) continue;
        if (nv.molinos.some(function (m) { return Math.hypot(m.x - x, m.z - z) < 1.6; })) continue;
        if (cerca && Math.hypot(cerca.x - x, cerca.z - z) > cerca.r) continue;
        if (out.some(function (o) { return Math.hypot(o.x - x, o.z - z) < minDist; })) continue;
        out.push({ x: x, z: z });
    }
    return out;
}

function crearAdornos(nv, grupo) {
    // gemas espaciales: un diamante tallado flota y gira sobre una piedrita (dos dibujos para todas)
    const area = Math.abs(areaFirmada(C.isla));
    const lugares = lugaresLibres(nv, Math.max(22, Math.min(60, Math.round(area / 2.6))), 0.45);
    const nF = lugares.length;
    if (nF) {
        const geoB = new THREE.DodecahedronGeometry(0.09, 0);
        geoB.scale(1, 0.55, 1);
        const bases = new THREE.InstancedMesh(geoB, MT.roca, nF);
        // talla brillante: pabellón en punta abajo, corona y mesa arriba
        const geoG = new THREE.LatheGeometry([new THREE.Vector2(0, -0.13), new THREE.Vector2(0.1, 0), new THREE.Vector2(0.065, 0.055), new THREE.Vector2(0, 0.055)], 8);
        const gemas = new THREE.InstancedMesh(geoG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.35, envMapIntensity: 2.2, flatShading: true, emissive: 0x222244, emissiveIntensity: 0.6 }), nF);
        const cols = [0xff6fd0, 0x4dd8ff, 0xffd43b, 0xb197fc, 0x63e6be, 0xff8787];
        C.datosGemas = lugares.map(function (p, i) {
            gemas.setColorAt(i, new THREE.Color(cols[i % cols.length]));
            OBJ_TMP.position.set(p.x, HI + 0.04, p.z);
            OBJ_TMP.rotation.set(0, Math.random() * 6, 0);
            OBJ_TMP.scale.setScalar(1.3 + Math.random() * 0.6);
            OBJ_TMP.updateMatrix();
            bases.setMatrixAt(i, OBJ_TMP.matrix);
            return { x: p.x, z: p.z, fase: Math.random() * 6, tam: 1.5 + Math.random() * 0.8, color: new THREE.Color(cols[i % cols.length]) };
        });
        gemas.instanceColor.needsUpdate = true;
        bases.instanceMatrix.needsUpdate = true;
        grupo.add(bases, gemas);
        C.gemas = { bases: bases, gemas: gemas };
    }
    // rocas luminosas con cristales
    const rocas = lugaresLibres(nv, Math.max(7, Math.min(18, Math.round(area / 8))), 0.9);
    rocas.forEach(function (p, i) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + Math.random() * 0.12, 0), MT.roca);
        r.position.set(p.x, HI + 0.05, p.z);
        r.rotation.set(Math.random(), Math.random() * 3, 0);
        r.castShadow = true;
        grupo.add(r);
        const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x66f5ff : 0xffa8e8, toneMapped: false }));
        cr.position.set(p.x + 0.08, HI + 0.23, p.z);
        cr.scale.y = 2;
        grupo.add(cr);
    });
    // señal de dirección junto a la salida, apuntando por la pista
    const s0 = nv.salida;
    const lado = R().puntoPista(nv.pista, 0.2, nv.pista.ancho / 2 + 0.55);
    const ok = R().dentroPoligono(C.isla, lado.x, lado.z);
    const ls = ok ? lado : R().puntoPista(nv.pista, 0.2, -(nv.pista.ancho / 2 + 0.55));
    const letrero = new THREE.Group();
    const posteL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.7, 8), MT.metal);
    posteL.position.y = 0.35;
    letrero.add(posteL);
    const tabla = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: TX.letrero, side: THREE.DoubleSide, toneMapped: false }));
    tabla.position.y = 0.72;
    letrero.add(tabla);
    letrero.position.set(ls.x, HI + 0.04, ls.z);
    letrero.rotation.y = -s0.psi;
    grupo.add(letrero);
    // banderines entre dos postes en el fondo de la isla
    C.banderines = [];
    const fondo = lugaresLibres(nv, 30, 0.3).sort(function (a, b) { return a.z - b.z; }).slice(0, 8);
    if (fondo.length >= 2) {
        let a = fondo[0], b = null;
        fondo.forEach(function (p) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d > 2.2 && d < 4.5 && (!b || d > Math.hypot(b.x - a.x, b.z - a.z))) b = p; });
        if (b) {
            [a, b].forEach(function (p) {
                const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.0, 8), MT.metal);
                pp.position.set(p.x, HI + 0.55, p.z);
                grupo.add(pp);
                const lz = sprite(0xffe066, 0.3, 0.8);
                lz.position.set(p.x, HI + 1.07, p.z);
                grupo.add(lz);
            });
            const n = 9;
            const cols = [0xff6fae, 0xffd43b, 0x4dabf7, 0x69db7c, 0xb197fc];
            for (let i = 1; i < n; i++) {
                const u = i / n;
                const x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u);
                const y = HI + 1.02 - Math.sin(u * Math.PI) * 0.22;
                const tri = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 3), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], emissive: cols[i % cols.length], emissiveIntensity: 0.15, roughness: 0.5, flatShading: true }));
                tri.rotation.x = Math.PI;
                tri.position.set(x, y - 0.1, z);
                tri.userData.fase = i;
                grupo.add(tri);
                C.banderines.push(tri);
            }
        }
    }
    // estrellas de recompensa flotantes
    C.estrellitas = [];
    lugaresLibres(nv, Math.max(4, Math.min(10, Math.round(area / 12))), 1.2).forEach(function (p, i) {
        const s = sprite(0xffe066, 0.42, 0.85, TX.estrella);
        s.position.set(p.x, HI + 0.82, p.z);
        s.userData = { y0: HI + 0.82, fase: i * 1.7 };
        grupo.add(s);
        C.estrellitas.push(s);
    });
}

// ------------------------------------------------------------------ asteroide móvil (nivel 3)

function crearAsteroide(a) {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(a.r, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const k = 0.85 + Math.random() * 0.25;
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    geo.computeVertexNormals();
    const roca = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8e7cc3, roughness: 0.75, metalness: 0.1, flatShading: true, emissive: 0x3b2a8a, emissiveIntensity: 0.4 }));
    roca.castShadow = true;
    g.add(roca);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(a.r * 1.35, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: 0xff8ae2, toneMapped: false }));
    anillo.rotation.x = Math.PI / 2.3;
    g.add(anillo);
    const halo = sprite(0xff8ae2, a.r * 4, 0.35);
    g.add(halo);
    // carril luminoso por donde va y viene
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.07), new THREE.MeshBasicMaterial({ color: 0xff8ae2, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    const dx = a.x1 - a.x0, dz = a.z1 - a.z0;
    rail.scale.x = Math.hypot(dx, dz) + a.r * 2;
    rail.rotation.x = -Math.PI / 2;
    rail.rotation.z = -Math.atan2(dz, dx);
    const mx = (a.x0 + a.x1) / 2, mz = (a.z0 + a.z1) / 2;
    rail.position.set(mx, alt(mx, mz) + 0.015, mz);
    g.userData = { roca: roca, anillo: anillo, halo: halo, rail: rail };
    return g;
}

// ------------------------------------------------------------------ pilares de cristal (rebotan, no se mueven)

function crearPoste(p) {
    const g = new THREE.Group();
    const y = alt(p.x, p.z);
    g.position.set(p.x, y, p.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.12, 0.36, 6), MT.roca);
    base.position.y = 0.16;
    base.castShadow = true;
    g.add(base);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(p.r * 1.02, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: 0x66f5ff, toneMapped: false }));
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.34;
    g.add(aro);
    const matCristal = new THREE.MeshStandardMaterial({ color: 0x9ff3ff, emissive: 0x15aabf, emissiveIntensity: 0.7, roughness: 0.12, metalness: 0.3, flatShading: true });
    const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(p.r * 0.85, 0), matCristal);
    cristal.scale.y = 1.9;
    cristal.position.y = 0.34 + p.r * 1.5;
    cristal.castShadow = true;
    g.add(cristal);
    const halo = sprite(0x66f5ff, p.r * 5, 0.3);
    halo.position.y = 0.6;
    g.add(halo);
    g.userData = { cristal: cristal, mat: matCristal, halo: halo, aro: aro, flash: 0, fase: Math.random() * 6 };
    return g;
}

// ------------------------------------------------------------------ pelota de energía

const B = { grupo: null, cuerpo: null, nucleo: null, halo: null, sombra: null, motas: [], escala: 1, brillo: 0, visible: true, hundir: 0 };

function crearPelota(scene, r) {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ map: TX.pelota, color: 0xffffff, roughness: 0.18, metalness: 0.15, envMapIntensity: 1.4, emissive: 0x0c8599, emissiveIntensity: 0.45, transparent: true, opacity: 0.95 }));
    cuerpo.castShadow = true;
    g.add(cuerpo);
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc5f6fa, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(nucleo);
    const halo = sprite(0x3bdcff, r * 6, 0.55);
    g.add(halo);
    for (let i = 0; i < 3; i++) {
        const m = sprite(0xffffff, r * 0.9, 0.9);
        g.add(m);
        B.motas.push(m);
    }
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.2, r * 3.2), new THREE.MeshBasicMaterial({ map: TX.sombra, transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.renderOrder = 3;
    scene.add(sombra);
    scene.add(g);
    B.grupo = g;
    B.cuerpo = cuerpo;
    B.nucleo = nucleo;
    B.halo = halo;
    B.sombra = sombra;
    B.r = r;
}

const Q_TMP = new THREE.Quaternion();
const V_TMP = new THREE.Vector3();

function ubicarPelota(dt, vx, vz) {
    const b = E.bola;
    if (!b || !B.grupo) return;
    const r = B.r;
    const h = alt(b.x, b.z);
    B.grupo.position.set(b.x, h + r - B.hundir * r * 2.2, b.z);
    B.sombra.position.set(b.x, h + 0.008, b.z);
    B.sombra.material.opacity = (1 - B.hundir) * (B.visible ? 1 : 0);
    const sp = Math.hypot(vx || 0, vz || 0);
    if (sp > 1e-4 && dt > 0) {
        V_TMP.set(vz / sp, 0, -vx / sp);
        Q_TMP.setFromAxisAngle(V_TMP, sp * dt / r);
        B.cuerpo.quaternion.premultiply(Q_TMP);
    }
    const tens = E.apunte ? E.apunte.T : 0;
    B.brillo = lerp(B.brillo, tens, Math.min(1, dt * 10));
    const pulso = 0.5 + 0.5 * Math.sin(E.reloj * 3);
    B.halo.material.opacity = 0.35 + 0.2 * pulso + B.brillo * 0.5;
    const s = r * (5.5 + B.brillo * 4 + pulso * 0.6);
    B.halo.scale.set(s, s, 1);
    B.nucleo.material.opacity = 0.5 + 0.5 * B.brillo + 0.15 * pulso;
    B.cuerpo.material.emissiveIntensity = 0.4 + B.brillo * 1.2;
    B.motas.forEach(function (m, i) {
        const a = E.reloj * (1.6 + B.brillo * 4) + i * 2.1;
        m.position.set(Math.cos(a) * r * 1.9, Math.sin(a * 1.3) * r * 0.6, Math.sin(a) * r * 1.9);
    });
    B.grupo.scale.setScalar(B.escala);
    B.grupo.visible = B.visible;
}

// ------------------------------------------------------------------ trayectoria predictiva, flecha y goma

const P = { puntos: null, n: 160, rebotes: [], fin: null, finEstrella: null, aspa: null, flecha: null, goma: null, hoyoMarca: null };

function crearPrediccion(scene) {
    const geo = new THREE.SphereGeometry(0.05, 8, 6);
    P.puntos = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), P.n);
    P.puntos.count = 0;
    P.puntos.frustumCulled = false;
    P.puntos.renderOrder = 6;
    scene.add(P.puntos);
    for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color: 0x66f5ff, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
        m.rotation.x = Math.PI / 2;
        m.visible = false;
        scene.add(m);
        P.rebotes.push(m);
    }
    P.fin = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 32), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    P.fin.rotation.x = -Math.PI / 2;
    P.fin.visible = false;
    scene.add(P.fin);
    P.finEstrella = sprite(0xffe066, 0.4, 0.9, TX.estrella);
    P.finEstrella.visible = false;
    scene.add(P.finEstrella);
    P.aspa = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    P.aspa.rotation.x = Math.PI / 2;
    P.aspa.visible = false;
    scene.add(P.aspa);
    // flecha de dirección y fuerza (acostada sobre el césped)
    const forma = new THREE.Shape();
    forma.moveTo(0, -0.06);
    forma.lineTo(0.72, -0.06);
    forma.lineTo(0.72, -0.15);
    forma.lineTo(1, 0);
    forma.lineTo(0.72, 0.15);
    forma.lineTo(0.72, 0.06);
    forma.lineTo(0, 0.06);
    forma.closePath();
    const gf = new THREE.ShapeGeometry(forma);
    gf.rotateX(-Math.PI / 2);
    P.flecha = new THREE.Mesh(gf, new THREE.MeshBasicMaterial({ color: 0x51cf66, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    P.flecha.visible = false;
    P.flecha.renderOrder = 6;
    scene.add(P.flecha);
    // goma: línea punteada de la pelota al dedo
    const gg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    P.goma = new THREE.Line(gg, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.75, depthWrite: false }));
    P.goma.visible = false;
    P.goma.renderOrder = 6;
    scene.add(P.goma);
    // marca dorada cuando la trayectoria termina en el hoyo
    P.hoyoMarca = sprite(0xffe066, 1.1, 0.9, TX.estrella);
    P.hoyoMarca.visible = false;
    scene.add(P.hoyoMarca);
}

function ocultarPrediccion() {
    P.puntos.count = 0;
    P.rebotes.forEach(function (m) { m.visible = false; });
    P.fin.visible = false;
    P.finEstrella.visible = false;
    P.aspa.visible = false;
    P.flecha.visible = false;
    P.goma.visible = false;
    P.hoyoMarca.visible = false;
    E.pred = null;
}

const COL_TMP = new THREE.Color();

function calcularPrediccion() {
    const a = E.apunte;
    if (!a || !E.nv) return;
    const largo = E.predCompleta ? Infinity : E.nv.prediccion;
    E.pred = R().simular(E.nv, E.j, E.bola, E.tFis, a.ang, a.T, { largoMax: largo, hastaRebote: true, cada: 0.17 });
    E.predT = E.reloj;
}

function pintarPrediccion() {
    const s = E.pred;
    const a = E.apunte;
    if (!s || !a) { ocultarPrediccion(); return; }
    const pts = s.puntos;
    const n = Math.min(P.n, pts.length);
    const base = new THREE.Color(COLZONA[R().zona(a.T)]);
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        const fl = 0.55 + 0.45 * Math.sin(E.reloj * 6 - i * 0.55);
        const u = i / Math.max(1, n - 1);
        OBJ_TMP.position.set(p[0], alt(p[0], p[1]) + 0.045, p[1]);
        OBJ_TMP.rotation.set(0, 0, 0);
        OBJ_TMP.scale.setScalar(1 - u * 0.35);
        OBJ_TMP.updateMatrix();
        P.puntos.setMatrixAt(i, OBJ_TMP.matrix);
        COL_TMP.setRGB(1, 0.92, 0.45).lerp(base, 0.35).multiplyScalar((1 - u * 0.55) * fl);
        P.puntos.setColorAt(i, COL_TMP);
    }
    P.puntos.count = n;
    P.puntos.instanceMatrix.needsUpdate = true;
    if (P.puntos.instanceColor) P.puntos.instanceColor.needsUpdate = true;
    P.rebotes.forEach(function (m, i) {
        const r = s.rebotes[i];
        if (!r) { m.visible = false; return; }
        m.visible = true;
        m.position.set(r.x, alt(r.x, r.z) + 0.1, r.z);
        m.material.color.set(r.clase === "curva" ? 0x66f5ff : 0xd0bfff);
        const k = 1 + 0.15 * Math.sin(E.reloj * 8);
        m.scale.set(k, k, k);
    });
    P.aspa.visible = !!s.aspa;
    if (s.aspa) {
        P.aspa.position.set(s.aspa.x, alt(s.aspa.x, s.aspa.z) + 0.12, s.aspa.z);
        const k = 1 + 0.2 * Math.sin(E.reloj * 10);
        P.aspa.scale.set(k, k, k);
    }
    const fin = s.fin;
    P.hoyoMarca.visible = !!s.hoyo;
    P.fin.visible = !s.hoyo && !s.cortada;
    P.finEstrella.visible = !s.hoyo && !s.cortada;
    if (s.hoyo) {
        P.hoyoMarca.position.set(E.nv.hoyo.x, alt(E.nv.hoyo.x, E.nv.hoyo.z) + 0.35, E.nv.hoyo.z);
        const k = 0.9 + 0.25 * Math.sin(E.reloj * 7);
        P.hoyoMarca.scale.set(k, k, 1);
    } else {
        P.fin.position.set(fin.x, alt(fin.x, fin.z) + 0.02, fin.z);
        P.finEstrella.position.set(fin.x, alt(fin.x, fin.z) + 0.2, fin.z);
    }
    // flecha y goma
    const b = E.bola;
    const hb = alt(b.x, b.z);
    P.flecha.visible = true;
    P.flecha.material.color.set(COLZONA[R().zona(a.T)]);
    P.flecha.position.set(b.x, hb + 0.03, b.z);
    P.flecha.rotation.set(0, -a.ang, 0);
    const largoF = 0.35 + a.T * 1.0;
    P.flecha.scale.set(largoF, 1, 1 + a.T * 0.4);
    if (a.suelo) {
        P.goma.visible = true;
        const arr = P.goma.geometry.attributes.position.array;
        arr[0] = b.x; arr[1] = hb + B.r; arr[2] = b.z;
        arr[3] = a.suelo.x; arr[4] = hb + B.r; arr[5] = a.suelo.z;
        P.goma.geometry.attributes.position.needsUpdate = true;
        P.goma.computeLineDistances();
    } else {
        P.goma.visible = false;
    }
}

// ------------------------------------------------------------------ entrada: tocar, arrastrar hacia atrás y soltar

const raycaster = new THREE.Raycaster();
const PLANO = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const NDC = new THREE.Vector2();

function sueloBajo(clientX, clientY, y) {
    const r = E.host.getBoundingClientRect();
    NDC.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(NDC, E.camera);
    PLANO.constant = -y;
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(PLANO, p) ? p : null;
}

function aPantalla(x, y, z) {
    if (!E.camera || !E.host) return { x: 0, y: 0 };
    const v = new THREE.Vector3(x, y, z).project(E.camera);
    const r = E.host.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
}

function pantallaPelota() {
    const b = E.bola;
    return aPantalla(b.x, alt(b.x, b.z) + B.r, b.z);
}

function radioPelotaPx() {
    const b = E.bola;
    const a = aPantalla(b.x, alt(b.x, b.z) + B.r, b.z);
    const c = aPantalla(b.x, alt(b.x, b.z) + B.r * 2, b.z);
    return Math.max(4, Math.hypot(c.x - a.x, c.y - a.y));
}

function arrastreMaxPx() {
    const r = E.host.getBoundingClientRect();
    return Math.max(120, Math.min(r.width, r.height) * (E.j.arrastreMaxPantalla || 0.24));
}

/** Actualiza el apunte a partir de la posición del dedo (en pantalla). */
function apuntarA(clientX, clientY) {
    const a = E.apunte;
    if (!a) return;
    const pp = pantallaPelota();
    const dpx = Math.hypot(clientX - pp.x, clientY - pp.y);
    const zona = 14;
    a.T = Math.max(0, Math.min(1, (dpx - zona) / (arrastreMaxPx() - zona)));
    const b = E.bola;
    const hb = alt(b.x, b.z) + B.r;
    const suelo = sueloBajo(clientX, clientY, hb);
    if (suelo) {
        const dx = b.x - suelo.x, dz = b.z - suelo.z;
        if (Math.hypot(dx, dz) > 0.02) a.ang = Math.atan2(dz, dx);
        // la goma no se estira más allá de la fuerza máxima
        const lim = 0.35 + 1.6 * a.T;
        const l = Math.hypot(dx, dz) || 1;
        const k = Math.min(1, lim / l);
        a.suelo = { x: b.x - dx * k, z: b.z - dz * k };
    }
    a.cx = clientX;
    a.cy = clientY;
    if (a.T >= 0.995 && !E.topeAvisado) {
        E.topeAvisado = true;
        sfx("alTope");
        emitir("alTope");
    }
    if (a.T < 0.9) E.topeAvisado = false;
    sfx("tension", a.T);
    emitir("tension", { T: a.T, zona: R().zona(a.T), activo: true });
    calcularPrediccion();
}

function empezarApunte(clientX, clientY, demo) {
    E.estado = "apuntando";
    E.quietoVeces = 0;
    E.apunte = { T: 0, ang: 0, suelo: null, cx: clientX, cy: clientY, demo: !!demo };
    E.topeAvisado = false;
    const b = E.bola;
    const p = new THREE.Vector3(b.x, alt(b.x, b.z) + 0.02, b.z);
    onda(p, 0x66f5ff, 0.1, 0.7, 0.7, null, 0.9);
    estallido(p, 0x99f6ff, 10, 0.8, { plano: true, subir: 0.6, vida: 0.6, tam: 0.12 });
    sfx("agarra");
    emitir("agarra", { demo: !!demo });
    emitir("tension", { T: 0, zona: "suave", activo: true });
}

function cancelarApunte(silencio) {
    if (E.estado !== "apuntando") return;
    E.estado = "listo";
    E.apunte = null;
    ocultarPrediccion();
    sfx("tensionFin");
    if (!silencio) sfx("cancela");
    emitir("tension", { T: 0, zona: "suave", activo: false });
    if (!silencio) emitir("cancela");
}

function soltarApunte() {
    const a = E.apunte;
    if (!a || E.estado !== "apuntando") return;
    sfx("tensionFin");
    if (a.T < (E.j.tensionMin || 0.07)) {
        cancelarApunte(false);
        return;
    }
    disparar(a.ang, a.T, a.demo);
}

function disparar(ang, T, demo) {
    const b = E.bola;
    E.inicioGolpe = { x: b.x, z: b.z };
    R().golpear(E.j, b, ang, T);
    E.estado = "rodando";
    E.apunte = null;
    E.golpeInfo = { aspa: false, pasoHoyo: false, rebotes: 0, curva: false, molino: false, demo: !!demo, T: T };
    ocultarPrediccion();
    const p = new THREE.Vector3(b.x, alt(b.x, b.z) + 0.02, b.z);
    onda(p, COLZONA[R().zona(T)], 0.15, 1.2 + T, 0.8, null, 1);
    onda(p, 0xffffff, 0.1, 0.8, 0.6, null, 0.7);
    estallido(p, 0x99f6ff, 18, 1.4 + T * 1.5, { plano: true, subir: 0.5, vida: 0.7 });
    sfx("golpe", T);
    emitir("tension", { T: 0, zona: "suave", activo: false });
    emitir("golpe", { tension: T, angulo: ang, demo: !!demo, zona: R().zona(T) });
}

function enlazarEntrada(host) {
    host.addEventListener("pointerdown", function (ev) {
        if (ev.isPrimary === false) return;
        if (ev.button != null && ev.button > 0) return;
        ev.preventDefault();
        if (!E.entrada || E.pausado || E.estado !== "listo") {
            if (E.entrada && E.estado === "rodando") emitir("tocaRodando");
            return;
        }
        const pp = pantallaPelota();
        const zona = Math.max(E.j.zonaToquePx || 70, radioPelotaPx() * 2.6);
        if (Math.hypot(ev.clientX - pp.x, ev.clientY - pp.y) > zona) {
            // tocó lejos: la pelota late para mostrar dónde empezar
            const b = E.bola;
            onda(new THREE.Vector3(b.x, alt(b.x, b.z) + 0.02, b.z), 0xffe066, 0.1, 0.9, 0.8, null, 0.9);
            emitir("tocaLejos");
            return;
        }
        try { host.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        E.idPuntero = ev.pointerId;
        empezarApunte(ev.clientX, ev.clientY, false);
        E.quietoDesde = performance.now();
    });
    host.addEventListener("pointermove", function (ev) {
        if (E.estado !== "apuntando" || ev.pointerId !== E.idPuntero || (E.apunte && E.apunte.demo)) return;
        ev.preventDefault();
        apuntarA(ev.clientX, ev.clientY);
    });
    const fin = function (ev) {
        if (ev.pointerId !== E.idPuntero) return;
        E.idPuntero = null;
        if (E.estado !== "apuntando" || (E.apunte && E.apunte.demo)) return;
        if (ev.type === "pointerup") {
            apuntarA(ev.clientX, ev.clientY);
            soltarApunte();
        } else {
            cancelarApunte(false);
        }
        E.quietoDesde = performance.now();
    };
    host.addEventListener("pointerup", fin);
    host.addEventListener("pointercancel", fin);
    host.addEventListener("lostpointercapture", function (ev) {
        if (ev.pointerId === E.idPuntero) fin({ pointerId: ev.pointerId, type: "pointercancel" });
    });
    host.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
}

// ------------------------------------------------------------------ física en el ciclo y sus efectos

const EV = [];

function pasoFisica(dt) {
    if (E.pausado || !E.nv || !E.bola) return;
    E.acum += Math.min(dt, 0.1);
    const DT = R().DT;
    let mx = 0, mz = 0;
    let pasos = 0;
    while (E.acum >= DT && pasos < 30) {
        E.acum -= DT;
        pasos++;
        if (E.estado === "rodando") {
            const x0 = E.bola.x, z0 = E.bola.z;
            R().paso(E.nv, E.j, E.bola, E.tFis, EV);
            mx += E.bola.x - x0;
            mz += E.bola.z - z0;
            while (EV.length) efecto(EV.shift());
            if (E.estado === "rodando" && E.bola.quieta) detenida();
        } else if ((E.estado === "listo" || E.estado === "apuntando") && !E.demo && R().empujarQuieta(E.nv, E.j, E.bola, E.tFis)) {
            // una pieza móvil alcanzó a la pelota quieta: la empuja (no cuenta como golpe)
            if (E.estado === "apuntando") cancelarApunte(true);
            E.estado = "rodando";
            E.golpeInfo = { empujada: true, rebotes: 0 };
            E.inicioGolpe = { x: E.bola.x, z: E.bola.z };
            E.bola.tRodando = 0;
            E.bola.quieta = false;
            emitir("empujada");
        }
        E.tFis += DT;
    }
    return { vx: mx / Math.max(dt, 1e-3), vz: mz / Math.max(dt, 1e-3) };
}

function efecto(e) {
    const gi = E.golpeInfo || {};
    const y = alt(e.x, e.z);
    if (e.tipo === "rebote") {
        gi.rebotes = (gi.rebotes || 0) + 1;
        const p = new THREE.Vector3(e.x, y + 0.14, e.z);
        const n = new THREE.Vector3(e.nx, 0, e.nz);
        const curva = e.clase === "curva";
        if (curva) {
            gi.curva = true;
            E.flashCurva = 1;
        }
        onda(p, curva ? 0x66f5ff : 0xd0bfff, 0.05, curva ? 0.7 : 0.45, 0.6, n, 0.95);
        estallido(p, curva ? 0x66f5ff : 0xe5dbff, curva ? 14 : 8, 1 + e.fuerza * 0.3, { vida: 0.5, tam: 0.12 });
        sfx("rebote", Math.min(1, e.fuerza / 4), curva);
        emitir("rebote", { clase: e.clase, demo: gi.demo, fuerza: e.fuerza });
    } else if (e.tipo === "aspa") {
        gi.aspa = true;
        E.sacudir = 1;
        E.flashMolino = 1;
        const p = new THREE.Vector3(e.x, y + 0.15, e.z);
        estallido(p, 0xb197fc, 14, 1.4, { vida: 0.6, tam: 0.14 });
        onda(p, 0xffa94d, 0.05, 0.5, 0.5, null, 0.9);
        sfx("aspa", Math.min(1, e.fuerza / 3));
        emitir("aspa", { demo: gi.demo });
    } else if (e.tipo === "asteroide") {
        const p = new THREE.Vector3(e.x, y + 0.15, e.z);
        estallido(p, 0xff8ae2, 14, 1.4, { vida: 0.6, tam: 0.14 });
        const ga = C.asteroides[e.indice || 0];
        if (ga) ga.userData.flash = 1;
        sfx("asteroide");
        emitir("asteroide", { demo: gi.demo });
    } else if (e.tipo === "molinoSuperado") {
        gi.molino = true;
        E.luzMolino = 1;
        const m = E.nv.molinos[e.molino || 0] || E.nv.molino;
        estallido(new THREE.Vector3(m.x, alt(m.x, m.z) + 1.5, m.z), 0x66f5ff, 22, 1.8, { vida: 0.9, tam: 0.16 });
        sfx("superado");
        emitir("molinoSuperado", { demo: gi.demo });
    } else if (e.tipo === "poste") {
        const p = new THREE.Vector3(e.x, y + 0.2, e.z);
        estallido(p, 0x99f6ff, 16, 1.5, { vida: 0.6, tam: 0.14 });
        onda(p, 0x66f5ff, 0.05, 0.6, 0.5, null, 0.9);
        const gp = C.postes[e.indice || 0];
        if (gp) gp.userData.flash = 1;
        sfx("rebote", Math.min(1, e.fuerza / 4), true);
        emitir("poste", { demo: gi.demo });
    } else if (e.tipo === "sobreHoyo") {
        gi.pasoHoyo = true;
        sfx("rozaHoyo");
        emitir("sobreHoyo", { demo: gi.demo, vel: e.vel });
    } else if (e.tipo === "hoyo") {
        entrarHoyo();
    }
}

function detenida() {
    E.estado = "listo";
    const b = E.bola;
    const gi = E.golpeInfo || {};
    const cons = R().consejo(E.nv, E.j, E.inicioGolpe || b, b, gi);
    const dHoyo = Math.hypot(b.x - E.nv.hoyo.x, b.z - E.nv.hoyo.z);
    sfx("parada");
    E.quietoDesde = performance.now();
    onda(new THREE.Vector3(b.x, alt(b.x, b.z) + 0.02, b.z), 0xffe066, 0.1, 0.55, 0.6, null, 0.7);
    emitir("detenida", { consejo: cons, cerca: dHoyo < 0.9, dist: dHoyo, demo: gi.demo, empujada: gi.empujada, info: gi });
}

let animHoyo = null;

function entrarHoyo() {
    E.estado = "hoyo";
    const gi = E.golpeInfo || {};
    const h = E.nv.hoyo;
    const b = E.bola;
    sfx("cae");
    animHoyo = { t: 0, x0: b.x, z0: b.z };
    const p = new THREE.Vector3(h.x, C.hoyo.userData.hBorde + 0.05, h.z);
    setTimeout(function () {
        if (!E.nv || E.nv.hoyo !== h) return;
        sfx("campana");
        onda(p, 0xffd43b, 0.2, 1.8, 1.0, null, 1);
        onda(p, 0xffffff, 0.2, 1.2, 0.8, null, 0.8);
        estallido(p, 0xffd43b, 40, 2.6, { vida: 1.2, tam: 0.2, arriba: 1.6, grav: 1.2 });
        estallido(p, 0xffffff, 22, 2.0, { reserva: ES, vida: 1.4, tam: 0.3, arriba: 1.8, grav: 0.8 });
        E.banderaObj = 1;
    }, 380);
    emitir("hoyo", { demo: gi.demo, info: gi });
}

function animarHoyoBola(dt) {
    if (!animHoyo) return;
    animHoyo.t += dt;
    const u = Math.min(1, animHoyo.t / 0.45);
    const h = E.nv.hoyo;
    E.bola.x = lerp(animHoyo.x0, h.x, suave(u));
    E.bola.z = lerp(animHoyo.z0, h.z, suave(u));
    B.hundir = suave(u);
    B.escala = 1 - 0.4 * u;
    if (u >= 1) {
        B.visible = false;
        animHoyo = null;
    }
}

// ------------------------------------------------------------------ cámara

const DIR_CAM = new THREE.Vector3(-Math.sin(AZIMUT) * Math.cos(ELEVACION), Math.sin(ELEVACION), Math.cos(AZIMUT) * Math.cos(ELEVACION));

/** Cámara que deja todos los puntos dentro de la pantalla (con márgenes para el HUD). */
function encuadrarPuntos(pts, cx, cz) {
    const dir = DIR_CAM;
    const r = E.host.getBoundingClientRect();
    const cam = E.camera;
    cam.aspect = Math.max(0.5, r.width / Math.max(1, r.height));
    cam.fov = FOV;
    cam.updateProjectionMatrix();
    const mira = new THREE.Vector3(cx, 0, cz);
    // márgenes en NDC: arriba el panel de nivel, abajo el indicador de fuerza, a los lados los botones
    const xMax = E.margenX || 0.86, yArr = 0.72, yAb = -0.74;
    let dist = 12;
    for (let it = 0; it < 4; it++) {
        let lo = 3, hi = 80;
        for (let k = 0; k < 26; k++) {
            const d = (lo + hi) / 2;
            cam.position.copy(mira).addScaledVector(dir, d);
            cam.lookAt(mira);
            cam.updateMatrixWorld();
            let ok = true;
            for (let i = 0; i < pts.length && ok; i++) {
                const v = pts[i].clone().project(cam);
                if (v.x < -xMax || v.x > xMax || v.y > yArr || v.y < yAb) ok = false;
            }
            if (ok) hi = d; else lo = d;
        }
        dist = hi;
        // recentrar: mover la mira para equilibrar los márgenes
        cam.position.copy(mira).addScaledVector(dir, dist);
        cam.lookAt(mira);
        cam.updateMatrixWorld();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(function (p) {
            const v = p.clone().project(cam);
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        });
        const offX = (minX + maxX) / 2, offY = (minY + maxY) / 2 - (yArr + yAb) / 2;
        const derecha = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
        const adelante = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).setY(0).normalize();
        const escala = dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
        mira.addScaledVector(derecha, offX * escala * cam.aspect);
        mira.addScaledVector(adelante, offY * escala / Math.sin(ELEVACION));
    }
    cam.position.copy(mira).addScaledVector(dir, dist);
    return { pos: cam.position.clone(), mira: mira.clone() };
}

function encuadre(nv) {
    const pts = [];
    nv.borde.forEach(function (p) { pts.push(new THREE.Vector3(p[0], 0, p[1]), new THREE.Vector3(p[0], ALTO_PARED, p[1])); });
    nv.molinos.forEach(function (m) { pts.push(new THREE.Vector3(m.x, m.decorativo ? 2.2 : 2.4, m.z)); });
    const ho = nv.hoyo;
    pts.push(new THREE.Vector3(ho.x, 1.4, ho.z));
    let cx = 0, cz = 0;
    nv.borde.forEach(function (p) { cx += p[0]; cz += p[1]; });
    return encuadrarPuntos(pts, cx / nv.borde.length, cz / nv.borde.length);
}

/**
 * Modo seguir (recorridos largos): la cámara mira una ventana de unos 11 × 7 m alrededor de la pelota. Devuelve el
 * desplazamiento cámara − mira para esa ventana.
 */
function desplazamientoSeguir() {
    const pts = [];
    [[-5.4, -3.3], [5.4, -3.3], [5.4, 3.3], [-5.4, 3.3]].forEach(function (q) { pts.push(new THREE.Vector3(q[0], 0, q[1]), new THREE.Vector3(q[0], 0.3, q[1])); });
    const c = encuadrarPuntos(pts, 0, 0);
    return c.pos.sub(c.mira);
}

/** Hacia dónde mira la cámara que sigue: la pelota (rodando), un poco adelante del camino (quieta) o el hoyo. */
function objetivoSeguir() {
    const b = E.bola;
    const nv = E.nv;
    if (!b || !nv) return new THREE.Vector3();
    if (E.estado === "hoyo") return new THREE.Vector3(nv.hoyo.x, 0, nv.hoyo.z);
    if (E.estado === "rodando") return new THREE.Vector3(b.x + b.vx * 0.35, 0, b.z + b.vz * 0.35);
    const sp = R().sDePunto(nv.pista, b.x, b.z);
    const ad = R().puntoCentro(nv.pista, sp.s + 2.2);
    return new THREE.Vector3(b.x * 0.62 + ad.x * 0.38, 0, b.z * 0.62 + ad.z * 0.38);
}

function camaraEn(mira) {
    return { pos: mira.clone().add(E.ofsSeguir), mira: mira.clone() };
}

function aplicarCamara(dt) {
    if (!E.camObj) return;
    if (E.camTween) {
        const tw = E.camTween;
        tw.t += dt;
        const u = suave((tw.t - (tw.espera || 0)) / tw.dur);
        E.camAct.pos.lerpVectors(tw.desde.pos, E.camObj.pos, u);
        E.camAct.mira.lerpVectors(tw.desde.mira, E.camObj.mira, u);
        if (tw.t >= tw.dur + (tw.espera || 0)) {
            E.camTween = null;
            if (E.seguir) E.miraSeguir = E.camAct.mira.clone();
        }
    } else if (E.seguir) {
        // sigue con suavidad; mientras se apunta, la cámara queda quieta
        if (E.estado !== "apuntando") {
            const k = 1 - Math.exp(-dt * (E.estado === "rodando" ? 3.2 : 2));
            E.miraSeguir.lerp(objetivoSeguir(), k);
        }
        E.camAct = camaraEn(E.miraSeguir);
    }
    const c = E.camAct;
    E.camera.position.copy(c.pos);
    if (!reducido && !E.camTween) {
        E.camera.position.x += Math.sin(E.reloj * 0.21) * 0.06;
        E.camera.position.y += Math.sin(E.reloj * 0.17) * 0.05;
    }
    if (E.sacudir > 0) {
        E.camera.position.x += (Math.random() - 0.5) * 0.04 * E.sacudir;
        E.camera.position.y += (Math.random() - 0.5) * 0.03 * E.sacudir;
    }
    E.camera.lookAt(c.mira);
}

// ------------------------------------------------------------------ calidad y tamaño

const CALIDAD = [
    { pr: function () { return Math.min(window.devicePixelRatio || 1, 1.6); }, sombras: true },
    { pr: function () { return Math.min(window.devicePixelRatio || 1, 1.15); }, sombras: false },
    { pr: function () { return 0.85; }, sombras: false }
];

function esTableta() {
    const tactil = (navigator.maxTouchPoints || 0) > 0 || ("ontouchstart" in window);
    const grueso = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    return grueso || (tactil && Math.min(screen.width, screen.height) <= 1100);
}

const RENDIMIENTO = { tiempo: 0, cuadros: 0, fps: 60, calentar: 5, bajos: 0 };

function medirRendimiento(dt) {
    if (document.hidden || dt <= 0) return;
    if (RENDIMIENTO.calentar > 0) { RENDIMIENTO.calentar -= dt; return; }
    RENDIMIENTO.tiempo += dt;
    RENDIMIENTO.cuadros++;
    if (RENDIMIENTO.tiempo < 2) return;
    RENDIMIENTO.fps = RENDIMIENTO.cuadros / RENDIMIENTO.tiempo;
    RENDIMIENTO.tiempo = 0;
    RENDIMIENTO.cuadros = 0;
    RENDIMIENTO.bajos = RENDIMIENTO.fps < 42 ? RENDIMIENTO.bajos + 1 : 0;
    if (RENDIMIENTO.bajos >= 2 && E.nivelCalidad < CALIDAD.length - 1) {
        RENDIMIENTO.bajos = 0;
        aplicarCalidad(E.nivelCalidad + 1);
    }
}

function aplicarCalidad(n) {
    E.nivelCalidad = Math.max(0, Math.min(CALIDAD.length - 1, n));
    const q = CALIDAD[E.nivelCalidad];
    if (E.renderer.shadowMap.enabled !== q.sombras) {
        E.renderer.shadowMap.enabled = q.sombras;
        E.scene.traverse(function (o) { if (o.isMesh && o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
    }
    reacomodar();
}

function reacomodar() {
    if (!E.renderer || !E.host) return;
    const w = Math.max(10, E.host.clientWidth || window.innerWidth);
    const h = Math.max(10, E.host.clientHeight || window.innerHeight);
    E.renderer.setPixelRatio(CALIDAD[E.nivelCalidad].pr());
    E.renderer.setSize(w, h, true);
    E.camera.aspect = w / h;
    E.camera.updateProjectionMatrix();
    const px = h * E.renderer.getPixelRatio() / 2 / Math.tan(THREE.MathUtils.degToRad(E.camera.fov) / 2);
    [CH, ES, CF].forEach(function (res) { if (res) res.mat.uniforms.escala.value = px; });
    if (FONDO.polvo) FONDO.polvo.material.uniforms.escala.value = px;
    if (FONDO.estrellas) FONDO.estrellas.material.uniforms.escala.value = E.renderer.getPixelRatio();
    if (E.nv) {
        if (E.seguir) {
            E.ofsSeguir = desplazamientoSeguir();
            E.camObj = camaraEn(E.miraSeguir || objetivoSeguir());
            if (!E.camTween) E.camAct = camaraEn(E.miraSeguir || objetivoSeguir());
        } else {
            const c = encuadre(E.nv);
            E.camObj = c;
            if (!E.camTween) E.camAct = { pos: c.pos.clone(), mira: c.mira.clone() };
        }
    }
}

// ------------------------------------------------------------------ ciclo de render (uno solo)

function animarCampo(dt) {
    const t = E.reloj;
    const nv = E.nv;
    if (!nv) return;
    // molinos: las aspas siguen el reloj de la física
    E.flashMolino = Math.max(0, E.flashMolino - dt * 2.5);
    E.luzMolino = Math.max(0, E.luzMolino - dt * 0.6);
    C.molinos.forEach(function (gm, i) {
        const m = nv.molinos[i];
        const u = gm.userData;
        u.aspas.rotation.x = -R().anguloMolino(m, E.tFis);
        const fiesta = E.fiesta ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
        u.matAspa.emissiveIntensity = 0.35 + E.flashMolino * 1.6 + E.luzMolino * 0.9 + fiesta;
        if (E.fiesta) u.matAspa.emissive.setHSL((t * 0.3) % 1, 0.8, 0.5);
        else u.matAspa.emissive.set(0x5c7cfa);
        u.matBorde.color.setHSL(0.52 + E.luzMolino * 0.1, 0.9, 0.7 + E.flashMolino * 0.2);
        const k = 0.8 + 0.2 * Math.sin(t * 4) + E.luzMolino;
        u.halo.scale.set(k, k, 1);
        gm.position.x = m.x + (E.sacudir > 0 && !m.decorativo ? (Math.random() - 0.5) * 0.03 * E.sacudir : 0);
    });
    E.sacudir = Math.max(0, E.sacudir - dt * 3);
    // pared curva: brillo al rebotar
    E.flashCurva = Math.max(0, E.flashCurva - dt * 1.6);
    if (C.lomoCurva) C.lomoCurva.material.color.setHSL(0.5, 0.95, 0.62 + 0.18 * E.flashCurva + 0.05 * Math.sin(t * 2));
    if (C.paredCurva) C.paredCurva.material.emissiveIntensity = 0.35 + 1.3 * E.flashCurva + 0.12 * Math.sin(t * 2) + (E.fiesta ? 0.6 : 0);
    // asteroides que van y vienen
    C.asteroides.forEach(function (ga, i) {
        const a = nv.asteroides[i];
        const pa = R().posAsteroide(a, E.tFis);
        const u = ga.userData;
        ga.position.set(pa.x, alt(pa.x, pa.z) + a.r * 0.95, pa.z);
        u.roca.rotation.y += dt * 0.8;
        u.roca.rotation.x += dt * 0.5;
        u.anillo.rotation.z += dt * 1.5;
        u.flash = Math.max(0, (u.flash || 0) - dt * 2);
        u.halo.material.opacity = 0.3 + 0.5 * u.flash + 0.08 * Math.sin(t * 3);
    });
    // pilares de cristal: brillan y destellan al rebotar
    C.postes.forEach(function (gp) {
        const u = gp.userData;
        u.flash = Math.max(0, u.flash - dt * 2);
        u.cristal.rotation.y += dt * 0.6;
        u.mat.emissiveIntensity = 0.6 + 0.25 * Math.sin(t * 2 + u.fase) + u.flash * 1.6;
        u.halo.material.opacity = 0.25 + 0.4 * u.flash;
        const k = 1 + u.flash * 0.25;
        u.cristal.scale.set(k, 1.9 * k, k);
    });
    // hoyo: pulso, bandera que ondea y sube al acertar
    if (C.hoyo) {
        const u = C.hoyo.userData;
        const pulso = 0.5 + 0.5 * Math.sin(t * 2.6);
        u.aura.material.opacity = 0.32 + 0.22 * pulso + E.banderaSube * 0.4;
        u.anillo.material.opacity = 0.25 + 0.35 * pulso;
        u.anillo.scale.setScalar(1 + 0.08 * pulso);
        u.luz.intensity = 0.9 + 0.6 * pulso + E.banderaSube * 2;
        E.banderaSube = lerp(E.banderaSube, E.banderaObj, Math.min(1, dt * 3));
        u.asta.position.y = E.banderaSube * 0.45;
        u.pano.material.emissiveIntensity = 0.25 + E.banderaSube * 0.9;
        const arr = u.pano.geometry.attributes.position.array;
        const b0 = u.base0;
        for (let i = 0; i < arr.length; i += 3) {
            const x = b0[i];
            arr[i + 2] = b0[i + 2] + Math.sin(x * 9 - t * 5) * 0.05 * x / 0.62 * (1 + E.banderaSube);
        }
        u.pano.geometry.attributes.position.needsUpdate = true;
        u.pano.geometry.computeVertexNormals();
        if (Math.random() < dt * 3) {
            const a = Math.random() * Math.PI * 2;
            CH.emitir({ p: new THREE.Vector3(nv.hoyo.x + Math.cos(a) * nv.hoyo.r, u.hBorde + 0.03, nv.hoyo.z + Math.sin(a) * nv.hoyo.r), v: [0, 0.4 + Math.random() * 0.3, 0], color: new THREE.Color(0xffd43b), vida: 1.2, tam: 0.1, tamFin: 0, grav: 0, freno: 0.5 });
        }
    }
    // gemas que flotan, giran y destellan (en la fiesta saltan más alto)
    if (C.gemas) {
        C.datosGemas.forEach(function (f, i) {
            const salto = E.fiesta ? Math.abs(Math.sin(t * 4 + f.fase)) * 0.25 : 0;
            OBJ_TMP.position.set(f.x, HI + 0.36 + Math.sin(t * 1.4 + f.fase) * 0.06 + salto, f.z);
            OBJ_TMP.rotation.set(0.15 * Math.sin(t + f.fase), t * 0.9 + f.fase, 0);
            OBJ_TMP.scale.setScalar(f.tam);
            OBJ_TMP.updateMatrix();
            C.gemas.gemas.setMatrixAt(i, OBJ_TMP.matrix);
        });
        C.gemas.gemas.instanceMatrix.needsUpdate = true;
        if (Math.random() < dt * 5) {
            const f = C.datosGemas[Math.floor(Math.random() * C.datosGemas.length)];
            ES.emitir({ p: new THREE.Vector3(f.x + (Math.random() - 0.5) * 0.12, HI + 0.42, f.z + (Math.random() - 0.5) * 0.18), v: [0, 0.12, 0], color: f.color.clone().lerp(new THREE.Color(0xffffff), 0.5), vida: 0.6, tam: 0.2, tamFin: 0, grav: 0, freno: 0 });
        }
    }
    // estrellitas flotantes
    (C.estrellitas || []).forEach(function (s) {
        s.position.y = s.userData.y0 + Math.sin(t * 1.5 + s.userData.fase) * 0.1;
        s.material.rotation = t * 0.6 + s.userData.fase;
    });
    C.banderines.forEach(function (b) {
        b.rotation.z = Math.sin(t * 2.4 + b.userData.fase) * 0.25;
        b.material.emissiveIntensity = E.fiesta ? 0.5 + 0.5 * Math.sin(t * 8 + b.userData.fase) : 0.15;
    });
    if (C.chevrones) {
        const op = 0.28 + 0.18 * Math.sin(t * 3);
        C.chevrones.material.opacity = op;
    }
    // luces que pasean sobre el campo (en los recorridos largos, alrededor de lo que se ve)
    const cl = E.seguir && E.camAct ? { x: E.camAct.mira.x, z: E.camAct.mira.z } : C.centro;
    const rl = E.seguir ? 4.5 : C.radio;
    C.luces.forEach(function (l, i) {
        const a = t * (0.25 + i * 0.07) + i * Math.PI;
        l.position.set(cl.x + Math.cos(a) * rl * 0.6, 2.4, cl.z + Math.sin(a) * rl * 0.45);
    });
    // destellos del césped
    if (Math.random() < dt * 4) {
        const c = nv.pista.centro[Math.floor(Math.random() * nv.pista.centro.length)];
        const l = (Math.random() - 0.5) * nv.pista.ancho * 0.8;
        const x = c.x - Math.sin(c.psi) * l, z = c.z + Math.cos(c.psi) * l;
        ES.emitir({ p: new THREE.Vector3(x, alt(x, z) + 0.05, z), v: [0, 0.15, 0], color: new THREE.Color(0xc3fae8), vida: 0.9, tam: 0.12, tamFin: 0, grav: 0, freno: 0 });
    }
}

function estela(dt, vx, vz) {
    if (E.estado !== "rodando") return;
    const sp = Math.hypot(vx, vz);
    const b = E.bola;
    const h = alt(b.x, b.z);
    const n = sp * dt * 9;
    let k = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    while (k-- > 0) {
        CH.emitir({ p: new THREE.Vector3(b.x + (Math.random() - 0.5) * 0.08, h + B.r * (0.4 + Math.random()), b.z + (Math.random() - 0.5) * 0.08), v: [-vx * 0.08, 0.25, -vz * 0.08], color: new THREE.Color().setHSL(0.5 + Math.random() * 0.06, 0.9, 0.65), vida: 0.55, tam: 0.11, tamFin: 0, grav: 0, freno: 1.5 });
    }
    // el césped reacciona al paso: chispitas verdes
    if (Math.random() < sp * dt * 2) {
        CH.emitir({ p: new THREE.Vector3(b.x, h + 0.02, b.z), v: [(Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4], color: new THREE.Color(0x8ce99a), vida: 0.5, tam: 0.08, tamFin: 0, grav: 1, freno: 1 });
    }
    sfx("rodar", sp);
    E.ultimoRodar = E.reloj;
}

function tick() {
    const ahora = performance.now();
    let dt = (ahora - (E.ultimoCuadro || ahora)) / 1000;
    E.ultimoCuadro = ahora;
    dt = Math.max(0, Math.min(0.1, dt));
    E.reloj += dt;
    medirRendimiento(dt);
    const v = pasoFisica(dt) || { vx: 0, vz: 0 };
    animarHoyoBola(dt);
    ubicarPelota(dt, v.vx, v.vz);
    estela(dt, v.vx, v.vz);
    if (E.reloj - E.ultimoRodar > 0.12) sfx("rodar", 0);
    // la predicción se rehace sola mientras se apunta (el molino y el asteroide se mueven)
    if (E.estado === "apuntando" && E.apunte && E.reloj - E.predT > 0.09) calcularPrediccion();
    if (E.estado === "apuntando") pintarPrediccion();
    animarCampo(dt);
    actualizarFondo(dt);
    actualizarOndas(dt);
    if (E.fiesta) fiestaTick(dt);
    CH.actualizar(dt);
    ES.actualizar(dt);
    CF.actualizar(dt);
    aplicarCamara(dt);
    acompanarSol();
    flechaHoyo();
    vigilarQuieto();
    E.renderer.render(E.scene, E.camera);
}

/** En los recorridos largos el sol (y su sombra) acompaña a la cámara. */
function acompanarSol() {
    if (!E.seguir || !E.camAct) return;
    const m = E.camAct.mira;
    E.sol.target.position.set(m.x, 0, m.z);
    E.sol.position.set(m.x - 5, 12, m.z + 7);
}

let elFlecha = null;

/** Flecha dorada en el borde de la pantalla que señala el hoyo cuando no se ve (solo en los recorridos largos). */
function flechaHoyo() {
    if (!elFlecha) {
        elFlecha = document.createElement("div");
        elFlecha.className = "flecha-hoyo";
        elFlecha.innerHTML = '<span class="flecha-hoyo-punta"></span><i class="fa-solid fa-flag"></i>';
        elFlecha.hidden = true;
        document.body.appendChild(elFlecha);
    }
    const nv = E.nv;
    const ver = E.seguir && nv && E.estado !== "hoyo" && E.estado !== "inactivo" && !E.fiesta;
    if (!ver) { elFlecha.hidden = true; return; }
    const v = new THREE.Vector3(nv.hoyo.x, alt(nv.hoyo.x, nv.hoyo.z) + 0.3, nv.hoyo.z).project(E.camera);
    const r = E.host.getBoundingClientRect();
    const detras = v.z > 1;
    let x = (v.x + 1) / 2 * r.width, y = (1 - v.y) / 2 * r.height;
    if (detras) { x = r.width - x; y = r.height - y; }
    const m = 70;
    const dentro = !detras && x > m && x < r.width - m && y > m + 60 && y < r.height - m - 40;
    if (dentro) { elFlecha.hidden = true; return; }
    const cx = r.width / 2, cy = r.height / 2;
    const ang = Math.atan2(y - cy, x - cx);
    // se apoya en el borde, en la dirección del hoyo
    const kx = (r.width / 2 - m) / Math.max(1e-3, Math.abs(Math.cos(ang)));
    const ky = (r.height / 2 - m - 40) / Math.max(1e-3, Math.abs(Math.sin(ang)));
    const k = Math.min(kx, ky);
    elFlecha.hidden = false;
    elFlecha.style.left = (r.left + cx + Math.cos(ang) * k) + "px";
    elFlecha.style.top = (r.top + cy + Math.sin(ang) * k) + "px";
    elFlecha.style.setProperty("--ang", ang + "rad");
}

function vigilarQuieto() {
    if (!E.entrada || E.estado !== "listo" || E.pausado || E.demo) return;
    // cada aviso espera el doble que el anterior (12 s, 24 s, 48 s…): no se interrumpe con audios a cada rato
    const ms = Math.min(90000, (Number(E.j.quietoParaAyudaMs) || 12000) * Math.pow(2, E.quietoVeces || 0));
    if (performance.now() - E.quietoDesde > ms) {
        E.quietoDesde = performance.now();
        E.quietoVeces = (E.quietoVeces || 0) + 1;
        const b = E.bola;
        onda(new THREE.Vector3(b.x, alt(b.x, b.z) + 0.02, b.z), 0xffe066, 0.1, 1.0, 1.0, null, 0.9);
        emitir("quieto");
    }
}

let fiestaAcum = 0;

function fiestaTick(dt) {
    fiestaAcum += dt;
    if (fiestaAcum < 0.12) return;
    fiestaAcum = 0;
    const c = E.seguir && E.camAct ? { x: E.camAct.mira.x, z: E.camAct.mira.z } : C.centro;
    const rr = E.seguir ? 5 : C.radio;
    for (let i = 0; i < 4; i++) {
        CF.emitir({
            p: new THREE.Vector3(c.x + (Math.random() - 0.5) * rr * 1.6, 5 + Math.random(), c.z + (Math.random() - 0.5) * rr),
            v: [(Math.random() - 0.5) * 0.8, -1 - Math.random() * 0.6, (Math.random() - 0.5) * 0.5],
            color: new THREE.Color().setHSL(Math.random(), 0.85, 0.6),
            vida: 4, tam: 0.22 + Math.random() * 0.12, tamFin: 0.18, grav: 0.15, freno: 0.1
        });
    }
    if (Math.random() < 0.3 && E.nv) {
        const cc = E.nv.pista.centro[Math.floor(Math.random() * E.nv.pista.centro.length)];
        onda(new THREE.Vector3(cc.x, alt(cc.x, cc.z) + 0.03, cc.z), new THREE.Color().setHSL(Math.random(), 0.9, 0.6), 0.2, 1.6, 1.2, null, 0.7);
    }
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
    E.j = cfg.juego || {};
    if (!webglDisponible()) {
        host.classList.add("sin-webgl");
        return Promise.resolve(false);
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    E.nivelCalidad = esTableta() ? 1 : 0;
    renderer.setPixelRatio(CALIDAD[E.nivelCalidad].pr());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = CALIDAD[E.nivelCalidad].sombras;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    E.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d33);
    E.scene = scene;
    E.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 400);
    E.camera.position.set(0, 10, 10);

    crearTexturas();
    scene.environment = crearEntorno(renderer);
    crearMateriales();
    marcarCompartidos();

    scene.add(new THREE.HemisphereLight(0xc5d8ff, 0x3a2470, 1.15));
    scene.add(new THREE.AmbientLight(0x6070b8, 0.45));
    const sol = new THREE.DirectionalLight(0xfff4e0, 1.9);
    sol.position.set(-5, 12, 7);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -9;
    sol.shadow.camera.right = 9;
    sol.shadow.camera.top = 9;
    sol.shadow.camera.bottom = -9;
    sol.shadow.camera.near = 2;
    sol.shadow.camera.far = 40;
    sol.shadow.bias = -0.0006;
    scene.add(sol, sol.target);
    E.sol = sol;

    CH = new Reserva(700, TX.brillo);
    ES = new Reserva(260, TX.estrella);
    CF = new Reserva(360, TX.confeti, true);
    scene.add(CH.puntos, ES.puntos, CF.puntos);

    crearFondo(scene);
    crearOndas(scene);
    crearPelota(scene, E.j.radio || 0.13);
    crearPrediccion(scene);
    E.bola = R().pelota(0, 0);

    enlazarEntrada(host);
    reacomodar();
    if (typeof ResizeObserver === "function") new ResizeObserver(reacomodar).observe(host);
    renderer.setAnimationLoop(tick);
    setInterval(function () {
        if (performance.now() - E.ultimoCuadro > 250) tick();
    }, 120);
    E.listo = true;
    return Promise.resolve(true);
}

/** Carga un nivel (preparado por ReglasGolf.prepararNivel): rehace el campo, el molino, el hoyo y los adornos. */
function cargar(nv, ronda, opciones) {
    E.margenX = opciones && opciones.presentacion ? 0.58 : 0.86;
    if (C.grupo) {
        E.scene.remove(C.grupo);
        liberar(C.grupo);
    }
    C.luces.forEach(function (l) { E.scene.remove(l); l.dispose && l.dispose(); });
    C.luces = [];
    animHoyo = null;
    E.nv = nv;
    E.ronda = ronda || {};
    E.estado = "inactivo";
    E.apunte = null;
    E.banderaSube = E.banderaObj = 0;
    E.flashCurva = E.flashMolino = E.luzMolino = 0;
    E.predCompleta = false;
    ocultarPrediccion();
    CH.vaciar();
    ES.vaciar();
    CF.vaciar();
    let hMin = 0;
    nv.borde.forEach(function (p) { hMin = Math.min(hMin, R().altura(nv, p[0], p[1])); });
    nv.pista.centro.forEach(function (p) { hMin = Math.min(hMin, R().altura(nv, p.x, p.z)); });
    HI = hMin - 0.07;
    aplicarTema(nv.tema || (ronda && ronda.tema));
    const g = new THREE.Group();
    C.grupo = g;
    g.add(crearIsla(nv));
    g.add(crearCesped(nv));
    g.add(crearParedes(nv));
    C.chevrones = crearChevrones(nv);
    if (C.chevrones) g.add(C.chevrones);
    C.molinos = nv.molinos.map(function (m) {
        const gm = crearMolino(m);
        g.add(gm);
        return gm;
    });
    C.asteroides = nv.asteroides.map(function (a) {
        const ga = crearAsteroide(a);
        g.add(ga);
        g.add(ga.userData.rail);
        return ga;
    });
    C.postes = nv.postes.map(function (p) {
        const gp = crearPoste(p);
        g.add(gp);
        return gp;
    });
    C.hoyo = crearHoyo(nv);
    g.add(C.hoyo);
    crearAdornos(nv, g);
    // centro y radio para luces, confeti y sombras
    let cx = 0, cz = 0;
    nv.borde.forEach(function (p) { cx += p[0]; cz += p[1]; });
    cx /= nv.borde.length;
    cz /= nv.borde.length;
    let rad = 0;
    nv.borde.forEach(function (p) { rad = Math.max(rad, Math.hypot(p[0] - cx, p[1] - cz)); });
    C.centro = { x: cx, z: cz };
    C.radio = rad;
    [0x66f5ff, 0xff8ae2].forEach(function (col) {
        const l = new THREE.PointLight(col, 1.6, 6, 2);
        E.scene.add(l);
        C.luces.push(l);
    });
    FONDO.islitas.forEach(function (isl, i) {
        // detrás y a los lados del campo (nunca entre la cámara y la isla)
        const a = [-2.7, -0.45, -2.0, -1.15][i % 4];
        isl.position.x = cx + Math.cos(a) * (rad + 2.6 + i * 0.3);
        isl.position.z = cz + Math.sin(a) * (rad * 0.7 + 2.2) - 0.8;
        isl.userData.y0 = HI - 1.6 - (i % 2) * 0.9;
    });
    E.sol.position.set(cx - 5, 12, cz + 7);
    E.sol.target.position.set(cx, 0, cz);
    E.scene.add(g);
    // pelota en la salida
    E.bola = R().pelota(nv.salida.x, nv.salida.z);
    B.visible = true;
    B.escala = 1;
    B.hundir = 0;
    B.cuerpo.quaternion.identity();
    // cámara: todo el campo a la vista o, si es un recorrido largo, siguiendo a la pelota
    E.seguir = !!(ronda && ronda.camara === "seguir") && !(opciones && opciones.presentacion);
    E.camTween = null;
    if (E.seguir) {
        E.ofsSeguir = desplazamientoSeguir();
        E.estado = "listo";
        E.miraSeguir = objetivoSeguir();
        E.estado = "inactivo";
        E.camObj = camaraEn(E.miraSeguir);
        E.camAct = camaraEn(E.miraSeguir);
    } else {
        const c = encuadre(nv);
        E.camObj = c;
        E.camAct = { pos: c.pos.clone(), mira: c.mira.clone() };
    }
    try { E.renderer.compile(E.scene, E.camera); } catch (e) { /* noop */ }
}

// ------------------------------------------------------------------ velo de transición (DOM)

function velo() {
    let v = document.getElementById("velo-golf");
    if (!v) {
        v = document.createElement("div");
        v.id = "velo-golf";
        v.className = "velo-golf";
        document.body.appendChild(v);
    }
    return v;
}

function transicion() {
    const v = velo();
    sfx("transicion");
    v.classList.remove("abre");
    v.classList.add("cierra");
    return sleep(520);
}

/** Destapa la escena con un vuelo corto de cámara hasta el encuadre del nivel. */
function presentar() {
    const v = velo();
    if (E.seguir && E.camObj) {
        const hoyo = new THREE.Vector3(E.nv.hoyo.x, 0, E.nv.hoyo.z);
        const desde = camaraEn(hoyo);
        desde.pos.addScaledVector(DIR_CAM, 2.5);
        E.camAct = { pos: desde.pos.clone(), mira: desde.mira.clone() };
        E.camTween = { t: 0, espera: reducido ? 0 : 1.1, dur: reducido ? 0.3 : 2.6, desde: desde };
        v.classList.remove("cierra");
        v.classList.add("abre");
        return sleep(reducido ? 600 : 3800);
    }
    if (E.camObj) {
        const desde = {
            pos: E.camObj.pos.clone().add(new THREE.Vector3(-1.5, 3.2, 3.5)),
            mira: E.camObj.mira.clone().add(new THREE.Vector3(0.6, 0, -0.4))
        };
        E.camAct = { pos: desde.pos.clone(), mira: desde.mira.clone() };
        E.camTween = { t: 0, dur: reducido ? 0.2 : 1.5, desde: desde };
    }
    v.classList.remove("cierra");
    v.classList.add("abre");
    return sleep(1300);
}

function salida() {
    return sleep(250);
}

// ------------------------------------------------------------------ celebraciones

function celebrarNivel() {
    E.luzMolino = 1;
    E.flashCurva = 1;
    const c = C.centro;
    for (let i = 0; i < 3; i++) {
        setTimeout(function () {
            sfx("estrella", i);
            const p = new THREE.Vector3(E.nv.hoyo.x + (i - 1) * 0.6, C.hoyo.userData.hBorde + 1.2 + (i === 1 ? 0.3 : 0), E.nv.hoyo.z);
            estallido(p, 0xffe066, 16, 1.6, { reserva: ES, vida: 1.2, tam: 0.35 });
        }, 300 + i * 260);
    }
    for (let i = 0; i < 60; i++) {
        CF.emitir({
            p: new THREE.Vector3(E.nv.hoyo.x + (Math.random() - 0.5) * 2, 3.5 + Math.random(), E.nv.hoyo.z + (Math.random() - 0.5) * 2),
            v: [(Math.random() - 0.5) * 1.2, -0.6 - Math.random(), (Math.random() - 0.5) * 1.2],
            color: new THREE.Color().setHSL(Math.random(), 0.85, 0.6), vida: 3, tam: 0.22, tamFin: 0.18, grav: 0.3, freno: 0.2
        });
    }
    onda(new THREE.Vector3(c.x, 0.05, c.z), 0x66f5ff, 0.5, C.radio * 1.2, 1.4, null, 0.6);
    return sleep(2400);
}

let trofeoFinal = null;

function celebrarFinal() {
    E.fiesta = true;
    E.banderaObj = 1;
    E.luzMolino = 1;
    sfx("trofeo");
    const h = E.nv.hoyo;
    if (trofeoFinal) { E.scene.remove(trofeoFinal); liberar(trofeoFinal); }
    trofeoFinal = trofeo(1.6);
    // al centro del campo, cerca de la cámara: queda a la vista debajo del panel del mensaje final
    const destino = E.seguir && E.camAct
        ? new THREE.Vector3(E.camAct.mira.x, HI + 0.12, E.camAct.mira.z + 1.2)
        : new THREE.Vector3(C.centro.x, HI + 0.12, C.centro.z + C.radio * 0.25);
    trofeoFinal.position.set(destino.x, 6, destino.z);
    E.scene.add(trofeoFinal);
    const t0 = performance.now();
    const bajar = function () {
        if (!trofeoFinal) return;
        const u = Math.min(1, (performance.now() - t0) / 1800);
        trofeoFinal.position.y = lerp(6, destino.y, 1 - Math.pow(1 - u, 3));
        trofeoFinal.rotation.y += 0.05;
        if (u < 1) requestAnimationFrame(bajar);
        else {
            estallido(destino.clone().setY(1), 0xffd43b, 50, 2.6, { vida: 1.4, tam: 0.22, arriba: 1.5, grav: 1 });
            estallido(destino.clone().setY(1), 0xffffff, 26, 2, { reserva: ES, vida: 1.5, tam: 0.35 });
            onda(new THREE.Vector3(destino.x, 0.05, destino.z), 0xffd43b, 0.3, 3, 1.4, null, 0.9);
        }
    };
    requestAnimationFrame(bajar);
    for (let i = 0; i < 5; i++) setTimeout(function () { sfx("estrella", i); }, 600 + i * 300);
    return sleep(3600);
}

function fiesta(on) {
    E.fiesta = !!on;
    if (!on && trofeoFinal) {
        E.scene.remove(trofeoFinal);
        liberar(trofeoFinal);
        trofeoFinal = null;
    }
}

// ------------------------------------------------------------------ mensajes flotantes (DOM)

function mensaje(texto, color, x, z) {
    if (!texto) return;
    const d = document.createElement("div");
    d.className = "flotante-golf";
    d.textContent = texto;
    if (color) d.style.color = color;
    let p;
    if (x != null) p = aPantalla(x, alt(x, z) + 0.6, z);
    else if (E.bola) p = aPantalla(E.bola.x, alt(E.bola.x, E.bola.z) + 0.7, E.bola.z);
    else p = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    d.style.left = Math.max(120, Math.min(window.innerWidth - 120, p.x)) + "px";
    d.style.top = Math.max(150, Math.min(window.innerHeight - 160, p.y)) + "px";
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1900);
}

// ------------------------------------------------------------------ demostración automática

/**
 * La mano toca la pelota, arrastra hacia atrás (la fuerza sube y aparece la línea de luz), espera el momento del
 * molino y suelta; la pelota pasa por el túnel, rebota en la pared curva y entra en el hoyo. No cuenta.
 * mover(x, y, fase): fase = aparece | presiona | arrastra | suelta.
 */
async function demo(mover) {
    if (!E.nv) return;
    const corte = ++E.demoCorte;
    const vivo = function () { return corte === E.demoCorte && E.demo; };
    E.demo = true;
    const nv = E.nv;
    const g = (E.cfg.demo && E.cfg.demo.golpe) || {};
    // pelota en la salida
    animHoyo = null;
    E.bola = R().pelota(nv.salida.x, nv.salida.z);
    B.visible = true;
    B.escala = 1;
    B.hundir = 0;
    E.banderaObj = 0;
    E.estado = "listo";
    let ang = g.angulo, T = g.tension;
    // el molino se pone en la fase del golpe calculado para el instante de soltar
    const espera = 3.0;
    const tSoltar = E.tFis + espera;
    if (nv.molino && g.fase != null) nv.molino.fase = g.fase - nv.molino.omega * tSoltar;
    // si el golpe guardado no entra (otro tamaño de pista), se busca uno nuevo
    const prueba = R().simular(nv, E.j, E.bola, tSoltar, ang, T, {});
    if (!prueba.hoyo) {
        const otro = R().buscarGolpe(nv, E.j, E.bola, tSoltar, { angulos: 90, tensiones: 16 });
        if (otro) { ang = otro.angulo; T = otro.tension; }
    }
    const pp = function () { return pantallaPelota(); };
    // dirección en pantalla hacia atrás del golpe
    const b = E.bola;
    const hb = alt(b.x, b.z) + B.r;
    const a0 = aPantalla(b.x, hb, b.z), a1 = aPantalla(b.x - Math.cos(ang), hb, b.z - Math.sin(ang));
    let dx = a1.x - a0.x, dy = a1.y - a0.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const maxPx = arrastreMaxPx();
    const p0 = pp();
    mover(p0.x + 60, p0.y + 50, "aparece");
    await sleep(500);
    if (!vivo()) return;
    mover(p0.x, p0.y, "presiona");
    await sleep(380);
    if (!vivo()) return;
    empezarApunte(p0.x, p0.y, true);
    const tIni = performance.now(), durArr = 1400;
    while (vivo()) {
        const u = Math.min(1, (performance.now() - tIni) / durArr);
        const Tu = T * suave(u);
        const d = 14 + Tu * (maxPx - 14);
        const cx = p0.x + dx * d, cy = p0.y + dy * d;
        mover(cx, cy, "arrastra");
        E.apunte.T = Tu;
        E.apunte.ang = ang;
        const sl = sueloBajo(cx, cy, hb);
        E.apunte.suelo = sl ? { x: sl.x, z: sl.z } : null;
        sfx("tension", Tu);
        emitir("tension", { T: Tu, zona: R().zona(Tu), activo: true, demo: true });
        calcularPrediccion();
        if (u >= 1) break;
        await sleep(40);
    }
    // espera el momento justo (el reloj de la física llega al instante calculado)
    while (vivo() && E.tFis < tSoltar) {
        if (E.reloj - E.predT > 0.09) calcularPrediccion();
        await sleep(30);
    }
    if (!vivo()) { cancelarApunte(true); return; }
    // el molino queda exactamente en la fase calculada para este golpe (la diferencia es de un cuadro)
    if (nv.molino && g.fase != null && ang === g.angulo) nv.molino.fase = g.fase - nv.molino.omega * E.tFis;
    sfx("tensionFin");
    disparar(ang, T, true);
    mover(p0.x + dx * maxPx * 0.6, p0.y + dy * maxPx * 0.6 - 30, "suelta");
    // la pelota rueda hasta el hoyo (o se detiene)
    const tR = performance.now();
    while (vivo() && E.estado === "rodando" && performance.now() - tR < 12000) await sleep(80);
    await sleep(1500);
    if (!vivo()) return;
    E.demo = false;
}

function detenerDemo() {
    E.demoCorte++;
    E.demo = false;
    if (E.estado === "apuntando") cancelarApunte(true);
    ocultarPrediccion();
    emitir("tension", { T: 0, zona: "suave", activo: false });
}

// ------------------------------------------------------------------ API para script.js

window.EscenarioGolf = {
    montar: montar,
    listo: function () { return E.listo; },
    al: function (nombre, fn) { (E.oyentes[nombre] = E.oyentes[nombre] || []).push(fn); },
    reacomodar: reacomodar,
    cargar: cargar,
    presentar: presentar,
    transicion: transicion,
    salida: salida,
    /** on: la pelota puede tomarse. */
    entrada: function (on) {
        E.entrada = !!on;
        if (!on && E.estado === "apuntando" && !(E.apunte && E.apunte.demo)) cancelarApunte(true);
        E.quietoDesde = performance.now();
    },
    /** Deja la pelota lista en la salida del nivel. */
    iniciarRonda: function () {
        if (!E.nv) return;
        E.quietoVeces = 0;
        if (E.estado !== "rodando") {
            E.bola = R().pelota(E.nv.salida.x, E.nv.salida.z);
            B.visible = true;
            B.escala = 1;
            B.hundir = 0;
            E.estado = "listo";
            E.banderaObj = 0;
        }
        E.quietoDesde = performance.now();
    },
    ayudaAutomatica: function (on) { E.ayuda = !!on; },
    prediccionCompleta: function (on) { E.predCompleta = !!on; },
    demo: demo,
    detenerDemo: detenerDemo,
    celebrarNivel: celebrarNivel,
    celebrarFinal: celebrarFinal,
    fiesta: fiesta,
    mensaje: mensaje,
    pausar: function (on) {
        E.pausado = !!on;
        if (on && E.estado === "apuntando" && !(E.apunte && E.apunte.demo)) cancelarApunte(true);
        if (on) sfx("rodar", 0);
    },
    aPantalla: aPantalla,
    puntoPelota: function () { return E.bola ? pantallaPelota() : null; },
    estado: function () { return { estado: E.estado, tFis: E.tFis, bola: E.bola ? { x: E.bola.x, z: E.bola.z, vx: E.bola.vx, vz: E.bola.vz } : null, demo: E.demo, entrada: E.entrada, pausado: E.pausado }; },
    nivel: function () { return E.nv; },
    prediccion: function () { return E.pred; },
    /** Pruebas: golpe directo con ángulo (rad) y tensión (0..1), como si el niño soltara. */
    golpear: function (ang, T) {
        if (E.estado !== "listo") return false;
        disparar(ang, T, false);
        return true;
    },
    calidad: function () { return { nivel: E.nivelCalidad, fps: Math.round(RENDIMIENTO.fps), pr: E.renderer ? E.renderer.getPixelRatio() : 0, sombras: E.renderer ? E.renderer.shadowMap.enabled : false, llamadas: E.renderer ? E.renderer.info.render.calls : 0, triangulos: E.renderer ? E.renderer.info.render.triangles : 0 }; },
    stats: function () { return { chispas: CH ? CH.vivas : 0, estrellas: ES ? ES.vivas : 0, confeti: CF ? CF.vivas : 0, reloj: E.reloj }; }
};
