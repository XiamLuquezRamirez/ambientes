/**
 * EscenarioEsfera — escena three.js de "¡Atrapa la Esfera Veloz!" (window.EscenarioEsfera).
 *
 * Túnel de una central de energía, hecho desde cero con geometrías y materiales: paredes de placas con costillas
 * luminosas, pasarela, conductos de energía, pantallas holográficas, luces colgantes, tuberías laterales con bandas
 * de luz, el ANILLO DE CAPTURA en el centro (marco metálico, aro de energía, halo, disco de zona, partículas en
 * órbita) y el reactor al fondo. Las esferas son objetos 3D (núcleo, energía interna, cáscara translúcida, banda,
 * halo, luz propia y estela de partículas) que recorren las trayectorias de reglas.js a velocidad constante.
 *
 * La escena dibuja y anima; reglas.js decide; script.js ordena el flujo. Un solo ciclo de render
 * (setAnimationLoop) más un respaldo por tiempo si el navegador deja de dar cuadros (pestaña oculta).
 * Las partículas y las ondas salen de reservas fijas: no se crean objetos durante la partida.
 */
import * as THREE from "three";

const R = () => window.ReglasEsfera;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const CAM_Z = 10;
const MEDIO_ANCHO = 8.3;   // lo que debe caber a lo ancho en el plano del anillo
const MEDIO_ALTO = 4.4;    // y a lo alto
const RADIO_TUNEL = 7.6;
const LARGO_TUNEL = 74;

const COL = {
    espera: new THREE.Color(0x3bdcff),
    prepara: new THREE.Color(0xd8f55a),
    captura: new THREE.Color(0x3dff6e),
    error: new THREE.Color(0x5c8dff),
    oro: new THREE.Color(0xffd43b)
};

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
    menosEfectos: false,
    ayuda: false,
    energia: 0,            // 0 apagada → 1 encendida (presentación)
    energiaObj: 0,
    fiesta: false,
    reactorObj: 0.35,
    reactor: 0.35,
    pulsoError: 0,
    flashCaptura: 0,
    persecucion: null,     // { t, velocidad, color, arcoiris, inverso }
    cine: null,            // cinemática final: { pos, mira } de la cámara (null = cámara de juego)
    camTween: null,
    cineVel: 0,            // motas aceleradas durante el viaje
    escalaPx: 400
};

// ------------------------------------------------------------------ eventos hacia script.js

function emitir(nombre, datos) {
    (E.oyentes[nombre] || []).forEach(function (fn) {
        try { fn(datos); } catch (e) { console.warn("[EscenarioEsfera]", e); }
    });
}

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 200) : ms); });
}

function lerp(a, b, u) { return a + (b - a) * u; }
function suave(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }

// ------------------------------------------------------------------ texturas (canvas)

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

const TX = {};

function crearTexturas() {
    // brillo radial para halos y partículas
    let c = lienzo(128, 128);
    let g = c.getContext("2d");
    let gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.22, "rgba(255,255,255,0.85)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.25)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    TX.brillo = textura(c);

    // estrella con brillo (celebraciones)
    c = lienzo(128, 128);
    g = c.getContext("2d");
    gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
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

    // placas de la pared del túnel
    c = lienzo(256, 256);
    g = c.getContext("2d");
    g.fillStyle = "#3a4a86";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
            const px = x * 128, py = y * 128;
            const pl = g.createLinearGradient(px, py, px + 128, py + 128);
            pl.addColorStop(0, (x + y) % 2 ? "#4b5da3" : "#45579b");
            pl.addColorStop(1, (x + y) % 2 ? "#33427c" : "#2f3d74");
            g.fillStyle = pl;
            g.fillRect(px + 4, py + 4, 120, 120);
            g.strokeStyle = "rgba(160,190,255,0.35)";
            g.lineWidth = 2;
            g.strokeRect(px + 6, py + 6, 116, 116);
            g.fillStyle = "rgba(200,220,255,0.55)";
            [[14, 14], [114, 14], [14, 114], [114, 114]].forEach(function (p) {
                g.beginPath();
                g.arc(px + p[0], py + p[1], 3.2, 0, Math.PI * 2);
                g.fill();
            });
        }
    }
    g.fillStyle = "rgba(20,26,60,0.9)";
    g.fillRect(0, 126, 256, 4);
    g.fillRect(126, 0, 4, 256);
    TX.placas = textura(c, true);

    // rejilla de la pasarela
    c = lienzo(128, 128);
    g = c.getContext("2d");
    g.fillStyle = "#2a3466";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#5b6fbf";
    g.lineWidth = 6;
    for (let i = 0; i <= 128; i += 32) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    }
    g.strokeStyle = "rgba(150,200,255,0.25)";
    g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) {
        g.beginPath(); g.moveTo(i + 3, 0); g.lineTo(i + 3, 128); g.stroke();
    }
    TX.rejilla = textura(c, true);

    // flujo de energía de los conductos (se desplaza con offset)
    c = lienzo(64, 256);
    g = c.getContext("2d");
    g.fillStyle = "#06223a";
    g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 4; i++) {
        const y = i * 64;
        const fl = g.createLinearGradient(0, y, 0, y + 64);
        fl.addColorStop(0, "rgba(59,220,255,0)");
        fl.addColorStop(0.6, "rgba(120,240,255,0.95)");
        fl.addColorStop(1, "rgba(59,220,255,0)");
        g.fillStyle = fl;
        g.fillRect(0, y, 64, 64);
    }
    TX.flujo = textura(c, true);

    // acero cepillado (vetas a lo largo) y su rugosidad
    c = lienzo(256, 256);
    g = c.getContext("2d");
    g.fillStyle = "#b9c2d3";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
        const y = Math.random() * 256;
        const v = 150 + Math.floor(Math.random() * 90);
        g.strokeStyle = "rgba(" + v + "," + (v + 6) + "," + (v + 18) + "," + (0.25 + Math.random() * 0.4) + ")";
        g.lineWidth = Math.random() * 1.6;
        g.beginPath();
        g.moveTo(Math.random() * 256 - 60, y);
        g.lineTo(Math.random() * 256 + 120, y + (Math.random() - 0.5) * 2);
        g.stroke();
    }
    g.fillStyle = "rgba(60,70,95,0.55)";
    g.fillRect(0, 124, 256, 3);
    TX.acero = textura(c, true);
    TX.acero.repeat.set(1, 6);
    c = lienzo(128, 128);
    g = c.getContext("2d");
    g.fillStyle = "rgb(0,80,0)";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) {
        const v = 40 + Math.floor(Math.random() * 90);
        g.fillStyle = "rgb(0," + v + ",0)";
        g.fillRect(0, Math.random() * 128, 128, 1);
    }
    TX.aceroRugosidad = new THREE.CanvasTexture(c);
    TX.aceroRugosidad.wrapS = TX.aceroRugosidad.wrapT = THREE.RepeatWrapping;
    TX.aceroRugosidad.repeat.set(1, 6);

    // brillo diagonal del espejo (se desliza despacio)
    c = lienzo(256, 128);
    g = c.getContext("2d");
    g.clearRect(0, 0, 256, 128);
    [[40, 26, 0.75], [92, 10, 0.5], [170, 38, 0.6], [214, 8, 0.4]].forEach(function (b) {
        const gr2 = g.createLinearGradient(b[0] - b[1], 0, b[0] + b[1], 0);
        gr2.addColorStop(0, "rgba(255,255,255,0)");
        gr2.addColorStop(0.5, "rgba(230,250,255," + b[2] + ")");
        gr2.addColorStop(1, "rgba(255,255,255,0)");
        g.save();
        g.translate(b[0], 64);
        g.transform(1, 0, -0.6, 1, 0, 0);
        g.translate(-b[0], -64);
        g.fillStyle = gr2;
        g.fillRect(b[0] - b[1], -64, b[1] * 2, 256);
        g.restore();
    });
    TX.reflejo = textura(c, true);

    // cara del manómetro
    c = lienzo(128, 128);
    g = c.getContext("2d");
    g.fillStyle = "#f8f9fa";
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 10;
    [["#40c057", 0.75, 1.25], ["#fab005", 1.25, 1.75], ["#4dabf7", 1.75, 2.25]].forEach(function (a) {
        g.strokeStyle = a[0];
        g.beginPath();
        g.arc(64, 64, 46, Math.PI * a[1], Math.PI * a[2]);
        g.stroke();
    });
    g.fillStyle = "#343a40";
    for (let i = 0; i <= 8; i++) {
        const an = Math.PI * (0.75 + i * 1.5 / 8);
        g.fillRect(64 + Math.cos(an) * 52 - 2, 64 + Math.sin(an) * 52 - 2, 4, 4);
    }
    TX.manometro = textura(c);

    // pantalla holográfica (se redibuja)
    TX.holoLienzo = lienzo(256, 160);
    TX.holo = textura(TX.holoLienzo);
}

function dibujarHolo(t) {
    const c = TX.holoLienzo, g = c.getContext("2d");
    g.clearRect(0, 0, 256, 160);
    g.fillStyle = "rgba(10,40,90,0.55)";
    g.beginPath();
    g.roundRect(6, 6, 244, 148, 18);
    g.fill();
    g.strokeStyle = "rgba(110,230,255,0.95)";
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = "rgba(160,240,255,0.95)";
    g.font = "bold 24px Arial";
    g.fillText("PEDNIA", 22, 38);
    // barras de energía
    for (let i = 0; i < 7; i++) {
        const h = 22 + 46 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.9));
        g.fillStyle = i % 2 ? "rgba(255,140,220,0.9)" : "rgba(90,240,170,0.9)";
        g.fillRect(24 + i * 22, 138 - h, 14, h);
    }
    // medidor circular
    g.strokeStyle = "rgba(255,220,90,0.95)";
    g.lineWidth = 8;
    g.beginPath();
    g.arc(204, 92, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.55 + 0.4 * Math.sin(t * 0.8)));
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath();
    g.arc(204, 92, 8 + 3 * Math.sin(t * 4), 0, Math.PI * 2);
    g.fill();
    TX.holo.needsUpdate = true;
}

// ------------------------------------------------------------------ entorno para reflejos (sin archivos)

function crearEntorno(renderer) {
    const sc = new THREE.Scene();
    const geo = new THREE.SphereGeometry(20, 32, 16);
    const col = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 20;
        const c = new THREE.Color().setHSL(0.62 - y * 0.08, 0.7, 0.18 + Math.max(0, y) * 0.45);
        col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const luces = [[0x7af3ff, [8, 6, -6]], [0xff8fe0, [-9, 3, -4]], [0xffffff, [0, 12, 4]], [0x8cffb5, [5, -6, 6]]];
    [[0, 10, -3], [0, 9, 6], [-11, 5, 2], [11, 5, 2]].forEach(function (pq) {
        const tira = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        tira.position.set(pq[0], pq[1], pq[2]);
        tira.lookAt(0, 0, 0);
        sc.add(tira);
    });
    luces.forEach(function (l) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 5), new THREE.MeshBasicMaterial({ color: l[0] }));
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
    constructor(n, mapa) {
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
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -20), 200);
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
            blending: THREE.AdditiveBlending
        });
        this.puntos = new THREE.Points(geo, this.mat);
        this.puntos.frustumCulled = false;
        this.puntos.renderOrder = 5;
        this.geo = geo;
    }

    /** o: { p:Vector3, v:[x,y,z], color:Color, vida, tam, tamFin, grav, freno } */
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

let CH = null;    // chispas (brillo)
let ES = null;    // estrellas y confeti

function cuantas(n) {
    const k = Math.min(E.menosEfectos ? 0.35 : 1, NIVELES[E.nivel || 0].particulas);
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
        let v = [Math.sin(b) * Math.cos(a) * s, Math.sin(b) * Math.sin(a) * s, Math.cos(b) * s];
        if (opts.plano) v = [Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.5) * s * 0.3];
        const cc = opts.arcoiris ? new THREE.Color().setHSL(Math.random(), 0.85, 0.62) : c;
        res.emitir({
            p: p, v: v, color: cc,
            vida: (opts.vida || 0.9) * (0.6 + Math.random() * 0.6),
            tam: (opts.tam || 0.35) * (0.6 + Math.random() * 0.8),
            tamFin: opts.tamFin != null ? opts.tamFin : 0.02,
            grav: opts.grav || 0,
            freno: opts.freno != null ? opts.freno : 1.6
        });
    }
}

// ------------------------------------------------------------------ ondas de energía en reserva

const ONDAS = [];
const CASCARAS = [];

function crearOndas(scene) {
    const geo = new THREE.TorusGeometry(1, 0.045, 8, 96);
    for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        m.visible = false;
        m.renderOrder = 6;
        scene.add(m);
        ONDAS.push({ m: m, t: 0, dur: 1, r0: 1, r1: 3, op: 1 });
    }
    const geoC = new THREE.SphereGeometry(1, 32, 20);
    for (let i = 0; i < 2; i++) {
        const m = new THREE.Mesh(geoC, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        m.visible = false;
        scene.add(m);
        CASCARAS.push({ m: m, t: 0, dur: 1, r0: 1, r1: 10, op: 0.5 });
    }
}

/** Onda circular: p, color, r0 → r1, duración; normal opcional (por defecto mira a la cámara). */
function onda(p, color, r0, r1, dur, normal, opacidad) {
    const o = ONDAS.find(function (x) { return !x.m.visible; }) || ONDAS[0];
    o.m.position.copy(p);
    o.m.quaternion.identity();
    if (normal) o.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    o.m.material.color.set(color);
    o.t = 0;
    o.dur = reducido ? dur * 0.6 : dur;
    o.r0 = r0;
    o.r1 = r1;
    o.op = opacidad == null ? 0.95 : opacidad;
    o.m.visible = true;
}

function cascara(p, color, r1, dur, opacidad) {
    const o = CASCARAS.find(function (x) { return !x.m.visible; }) || CASCARAS[0];
    o.m.position.copy(p);
    o.m.material.color.set(color);
    o.t = 0;
    o.dur = dur;
    o.r0 = 0.5;
    o.r1 = r1;
    o.op = opacidad == null ? 0.4 : opacidad;
    o.m.visible = true;
}

function actualizarOndas(dt) {
    ONDAS.concat(CASCARAS).forEach(function (o) {
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
    MT.pared = new THREE.MeshStandardMaterial({ map: TX.placas, color: 0xb8c6ff, metalness: 0.45, roughness: 0.42, side: THREE.BackSide, envMapIntensity: 0.6 });
    MT.pared.map.repeat.set(10, 18);
    MT.metal = new THREE.MeshStandardMaterial({ color: 0x8fa3dc, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.1 });
    MT.metalOsc = new THREE.MeshStandardMaterial({ color: 0x4a5a99, metalness: 0.75, roughness: 0.35, envMapIntensity: 0.9 });
    MT.marco = new THREE.MeshStandardMaterial({ color: 0xcfd9f5, metalness: 0.9, roughness: 0.2, envMapIntensity: 1.3, emissive: 0x16305a, emissiveIntensity: 0.4 });
    MT.rejilla = new THREE.MeshStandardMaterial({ map: TX.rejilla, color: 0xffffff, metalness: 0.6, roughness: 0.45, envMapIntensity: 0.6 });
    MT.rejilla.map.repeat.set(4, 34);
    MT.flujo = new THREE.MeshBasicMaterial({ map: TX.flujo, color: 0xffffff, toneMapped: false });
    MT.flujo.map.repeat.set(1, 10);
    MT.holo = new THREE.MeshBasicMaterial({ map: TX.holo, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    MT.cian = new THREE.MeshBasicMaterial({ color: 0x3bdcff, toneMapped: false });
    // acero cepillado: muy metálico, con vetas y reflejos del entorno
    MT.acero = new THREE.MeshStandardMaterial({ map: TX.acero, color: 0xdfe6f2, metalness: 0.95, roughness: 0.3, roughnessMap: TX.aceroRugosidad, envMapIntensity: 1.7 });
    MT.aceroBrillo = new THREE.MeshStandardMaterial({ color: 0xf1f5ff, metalness: 1, roughness: 0.14, envMapIntensity: 2 });
    MT.aceroOscuro = new THREE.MeshStandardMaterial({ color: 0x59657e, metalness: 0.9, roughness: 0.38, envMapIntensity: 1.2 });
    MT.perno = new THREE.MeshStandardMaterial({ color: 0xcfd6e4, metalness: 1, roughness: 0.22, envMapIntensity: 1.8 });
    MT.interior = new THREE.MeshStandardMaterial({ color: 0x1a2340, metalness: 0.8, roughness: 0.5, side: THREE.BackSide });
    // materiales propios para las mallas instanciadas: compartir un material entre una malla normal y una
    // instanciada obliga a three.js a recalcular el programa de sombreado en cada dibujo (mucha CPU en tableta)
    MT.metalOscInst = MT.metalOsc.clone();
    MT.metalInst = MT.metal.clone();
    MT.pernoInst = MT.perno.clone();
    MT.cianInst = MT.cian.clone();
    MT.espejo = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, metalness: 1, roughness: 0.03, envMapIntensity: 2.4 });
}

function sprite(color, escala, opacidad) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.brillo, color: color, transparent: true, opacity: opacidad == null ? 0.8 : opacidad, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.set(escala, escala, 1);
    return s;
}

// ------------------------------------------------------------------ el túnel

const COSTILLAS = [];
let LUCES_COSTILLAS = null;              // InstancedMesh: un solo dibujo para todos los aros de luz
const colTmp = new THREE.Color();
const MOTAS = { puntos: null, pos: null, vel: null, n: 0 };
const CONDUCTOS = [];
let reactor = null;

function costillaChocaEspejo(z) {
    return ((E.cfg && E.cfg.espejos) || []).some(function (es) {
        return z + 0.3 > es.z0 - 0.45 && z - 0.3 < es.z1 + 0.45;
    });
}

function crearTunel(scene) {
    const g = new THREE.Group();
    // pared curva (cilindro visto desde dentro)
    const cil = new THREE.CylinderGeometry(RADIO_TUNEL, RADIO_TUNEL, LARGO_TUNEL, 40, 1, true);
    cil.rotateX(Math.PI / 2);
    const pared = new THREE.Mesh(cil, MT.pared);
    pared.position.set(0, 0.3, -LARGO_TUNEL / 2 + 8);
    pared.receiveShadow = true;
    g.add(pared);

    // costillas metálicas con un aro de luz cada una (se encienden en secuencia)
    const geoC = new THREE.TorusGeometry(RADIO_TUNEL - 0.12, 0.26, 10, 64);
    const geoL = new THREE.TorusGeometry(RADIO_TUNEL - 0.42, 0.07, 6, 72);
    const zs = [];
    for (let z = 6; z > -60; z -= 5) {
        // sin costilla donde están los espejos laterales: la atravesaría (marco = z0 − 0,45 … z1 + 0,45, + grosor)
        if (!costillaChocaEspejo(z)) zs.push(z);
    }
    // instancias: todas las costillas en un dibujo y todos los aros de luz en otro (color por instancia)
    const metal = new THREE.InstancedMesh(geoC, MT.metalOscInst, zs.length);
    LUCES_COSTILLAS = new THREE.InstancedMesh(geoL, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 }), zs.length);
    const o = new THREE.Object3D();
    zs.forEach(function (z, i) {
        o.position.set(0, 0.3, z);
        o.updateMatrix();
        metal.setMatrixAt(i, o.matrix);
        LUCES_COSTILLAS.setMatrixAt(i, o.matrix);
        LUCES_COSTILLAS.setColorAt(i, new THREE.Color(0x3bdcff));
        COSTILLAS.push({ i: i, z: z, brillo: 0, extra: 0, color: new THREE.Color(0x3bdcff) });
    });
    metal.frustumCulled = false;
    LUCES_COSTILLAS.frustumCulled = false;
    g.add(metal, LUCES_COSTILLAS);

    // pasarela con bordes de luz
    const pas = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.25, LARGO_TUNEL), MT.rejilla);
    pas.position.set(0, -4.5, -LARGO_TUNEL / 2 + 8);
    pas.receiveShadow = true;
    g.add(pas);
    [-4.3, 4.3].forEach(function (x) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, LARGO_TUNEL), MT.cian);
        b.position.set(x, -4.33, -LARGO_TUNEL / 2 + 8);
        g.add(b);
    });

    // conductos de energía a lo largo de las paredes (el flujo se desplaza)
    const posAbrazaderas = [];
    [[-0.78, 6.7], [0.78, 6.7], [-2.25, 6.6], [2.25, 6.6]].forEach(function (d) {
        const ang = Math.PI / 2 + d[0];
        const x = Math.cos(ang) * d[1], y = Math.sin(ang) * d[1] + 0.3;
        const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, LARGO_TUNEL, 16, 1, true), MT.metal);
        tubo.rotation.x = Math.PI / 2;
        tubo.position.set(x, y, -LARGO_TUNEL / 2 + 8);
        g.add(tubo);
        const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, LARGO_TUNEL, 10, 1, true), MT.flujo);
        nucleo.rotation.x = Math.PI / 2;
        nucleo.position.set(x * 0.985, y * 0.985, -LARGO_TUNEL / 2 + 8);
        g.add(nucleo);
        // abrazaderas
        for (let z = 4; z > -50; z -= 7) posAbrazaderas.push([x, y, z]);
        CONDUCTOS.push(nucleo);
    });
    const abr = new THREE.InstancedMesh(new THREE.TorusGeometry(0.4, 0.07, 6, 18), MT.metalOscInst, posAbrazaderas.length);
    const oa = new THREE.Object3D();
    posAbrazaderas.forEach(function (q, i) {
        oa.position.set(q[0], q[1], q[2]);
        oa.updateMatrix();
        abr.setMatrixAt(i, oa.matrix);
    });
    abr.frustumCulled = false;
    g.add(abr);

    // pantallas holográficas, de cara al centro (decorado tranquilo)
    [[-6.5, 0.9, -11, 0.95], [6.5, 1.4, -15, -0.95], [-6.3, -1.3, -22, 0.95], [6.3, -0.8, -27, -0.95]].forEach(function (p) {
        const pan = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.62), MT.holo);
        pan.position.set(p[0], p[1], p[2]);
        pan.rotation.y = p[3];
        g.add(pan);
        const marco = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 0.1), MT.metalOsc);
        marco.position.set(p[0] - Math.sin(p[3]) * 0.08, p[1], p[2] - Math.cos(p[3]) * 0.08);
        marco.rotation.y = p[3];
        g.add(marco);
    });

    // luces colgantes del techo
    [-6, -17, -29].forEach(function (z, i) {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), MT.metalOsc);
        cable.position.set(i % 2 ? 1.8 : -1.8, 6.6, z);
        g.add(cable);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.55, 0.45, 18), MT.metal);
        cap.position.set(cable.position.x, 5.6, z);
        g.add(cap);
        const foco = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff3bf, toneMapped: false }));
        foco.position.set(cable.position.x, 5.32, z);
        g.add(foco);
        const h = sprite(0xffe9a8, 2.6, 0.55);
        h.position.copy(foco.position);
        g.add(h);
    });

    scene.add(g);

    // motas de energía que flotan en el aire
    const n = 160;
    MOTAS.n = n;
    MOTAS.pos = new Float32Array(n * 3);
    MOTAS.vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 5;
        MOTAS.pos[i * 3] = Math.cos(a) * r;
        MOTAS.pos[i * 3 + 1] = Math.sin(a) * r * 0.8;
        MOTAS.pos[i * 3 + 2] = -45 + Math.random() * 50;
        MOTAS.vel[i] = 0.4 + Math.random() * 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(MOTAS.pos, 3).setUsage(THREE.DynamicDrawUsage));
    MOTAS.puntos = new THREE.Points(geo, new THREE.PointsMaterial({ map: TX.brillo, color: 0x9ff0ff, size: 0.22, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    MOTAS.puntos.frustumCulled = false;
    scene.add(MOTAS.puntos);

    // reactor al fondo del túnel
    reactor = new THREE.Group();
    reactor.position.set(0, 0.3, -52);
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 20), new THREE.MeshBasicMaterial({ color: 0x7af3ff, toneMapped: false }));
    reactor.add(nucleo);
    const energiaR = new THREE.Mesh(new THREE.IcosahedronGeometry(2.25, 1), new THREE.MeshBasicMaterial({ color: 0xe3fafc, wireframe: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    reactor.add(energiaR);
    const cascaraR = new THREE.Mesh(new THREE.SphereGeometry(2.6, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0x3bc9db, emissive: 0x1098ad, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false }));
    reactor.add(cascaraR);
    const halo = sprite(0x7af3ff, 16, 0.75);
    reactor.add(halo);
    const aros = [];
    [3.6, 4.6, 5.6].forEach(function (r, i) {
        const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 10, 80), MT.marco);
        a.rotation.x = 0.6 + i * 0.5;
        a.rotation.y = i * 0.9;
        reactor.add(a);
        aros.push(a);
    });
    const luz = new THREE.PointLight(0x7af3ff, 40, 40, 1.4);
    reactor.add(luz);
    // columna de energía (cinemática final) y onda que recorre el túnel de vuelta
    const columna = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 16, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xbff7ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    columna.visible = false;
    columna.userData.t = 0;
    reactor.add(columna);
    const columnaNucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 16, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    columnaNucleo.visible = false;
    reactor.add(columnaNucleo);
    const ondaViajera = new THREE.Mesh(new THREE.TorusGeometry(RADIO_TUNEL - 0.9, 0.28, 12, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    ondaViajera.position.set(0, 0.3, -50);
    ondaViajera.visible = false;
    ondaViajera.userData = { t: 0, dur: 2.4 };
    scene.add(ondaViajera);
    reactor.userData = { nucleo: nucleo, halo: halo, aros: aros, luz: luz, columna: columna, columnaNucleo: columnaNucleo, ondaViajera: ondaViajera, energiaR: energiaR, cascaraR: cascaraR, alinear: 0, alinearObj: 0 };
    scene.add(reactor);
}

function actualizarTunel(dt, antic) {
    const t = E.reloj;
    // persecución de luces (captura, ronda, final): una ola que viaja por las costillas
    const ps = E.persecucion;
    if (ps) {
        ps.t += dt;
        if (ps.t > ps.dur) E.persecucion = null;
    }
    COSTILLAS.forEach(function (c, i) {
        let extra = 0;
        let col = null;
        if (ps) {
            const frente = ps.t * ps.velocidad;
            const d = ps.inverso ? Math.abs((c.z + 56) - frente) : Math.abs((6 - c.z) - frente);
            extra = Math.max(0, 1 - d / 6) * (1 - Math.min(1, ps.t / ps.dur));
            if (extra > 0.05) col = ps.arcoiris ? new THREE.Color().setHSL(((i * 0.09) + t * 0.4) % 1, 0.9, 0.6) : ps.color;
        }
        if (E.cine) {
            // la cinemática enciende las costillas al pasar la cámara
            const dz = Math.abs(c.z - E.cine.pos.z);
            if (dz < 6) {
                extra = Math.max(extra, 1 - dz / 6);
                col = new THREE.Color().setHSL(((i * 0.09) + t * 0.3) % 1, 0.9, 0.62);
            }
        }
        if (E.fiesta) {
            col = new THREE.Color().setHSL(((i * 0.08) + t * 0.25) % 1, 0.9, 0.6);
            extra = Math.max(extra, 0.6 + 0.4 * Math.sin(t * 5 + i));
        }
        const base = 0.25 + 0.5 * E.energia + 0.35 * antic + (E.ayuda ? 0.1 : 0);
        const v = Math.min(1.6, base + extra * 1.3);
        c.color.copy(col || COL.espera);
        LUCES_COSTILLAS.setColorAt(c.i, colTmp.copy(c.color).multiplyScalar(v));
    });
    LUCES_COSTILLAS.instanceColor.needsUpdate = true;
    CONDUCTOS.forEach(function (n, i) {
        n.material.map.offset.y -= dt * (0.6 + E.energia * 1.4 + antic * 1.5) * (i % 2 ? 1 : 1.2);
        n.material.color.setScalar(0.25 + 0.75 * E.energia);
    });
    // motas: viajan despacio hacia la cámara; al acercarse una esfera se agitan un poco
    const p = MOTAS.pos;
    const vel = (reducido ? 0.3 : 1) * (1 + antic * 1.5 + (E.fiesta ? 2 : 0) + E.cineVel);
    for (let i = 0; i < MOTAS.n; i++) {
        p[i * 3 + 2] += MOTAS.vel[i] * dt * vel;
        p[i * 3 + 1] += Math.sin(t * 1.3 + i) * dt * 0.08;
        if (p[i * 3 + 2] > 6) p[i * 3 + 2] = -45;
    }
    MOTAS.puntos.geometry.attributes.position.needsUpdate = true;
    MOTAS.puntos.material.opacity = (0.25 + 0.5 * E.energia) * (E.menosEfectos ? 0.5 : 1);
    // reactor
    E.reactor = lerp(E.reactor, E.reactorObj, Math.min(1, dt * 2));
    const u = reactor.userData;
    const k = E.reactor;
    u.nucleo.scale.setScalar(0.75 + 0.35 * k + 0.04 * Math.sin(t * 3));
    u.halo.material.opacity = 0.3 + 0.6 * k;
    u.halo.scale.setScalar(10 + 14 * k);
    u.luz.intensity = 15 + 45 * k;
    u.energiaR.rotation.x += dt * (0.4 + 2 * k);
    u.energiaR.rotation.y += dt * (0.6 + 2.5 * k);
    u.energiaR.scale.setScalar(1 + 0.05 * Math.sin(t * 6 * (0.5 + k)));
    u.cascaraR.material.emissiveIntensity = 0.4 + 0.8 * k;
    if (E.fiesta) {
        u.nucleo.material.color.setHSL((t * 0.15) % 1, 0.8, 0.7);
        u.halo.material.color.copy(u.nucleo.material.color);
        u.cascaraR.material.color.copy(u.nucleo.material.color);
        u.energiaR.material.color.copy(u.nucleo.material.color).lerp(new THREE.Color(0xffffff), 0.5);
    } else {
        u.nucleo.material.color.set(0x7af3ff);
        u.halo.material.color.set(0x7af3ff);
        u.cascaraR.material.color.set(0x3bc9db);
        u.energiaR.material.color.set(0xe3fafc);
    }
    u.alinear = lerp(u.alinear || 0, u.alinearObj || 0, Math.min(1, dt * 1.6));
    u.aros.forEach(function (a, i) {
        a.rotation.z += dt * (0.2 + i * 0.15) * (1 + 3 * k + 6 * u.alinear);
        if (u.alinearObj) {
            // los tres aros se alinean de frente (como una diana) antes de lanzar la columna
            a.rotation.x = lerp(a.rotation.x % (Math.PI * 2), 0, Math.min(1, dt * 2.5));
            a.rotation.y = lerp(a.rotation.y % (Math.PI * 2), 0, Math.min(1, dt * 2.5));
        } else {
            a.rotation.x += dt * 0.1 * (i % 2 ? 1 : -1);
        }
    });
    const col = u.columna;
    if (col.visible) {
        col.userData.t += dt;
        const cu = Math.min(1, col.userData.t / 0.7);
        col.scale.set(1 + 0.15 * Math.sin(t * 20), Math.max(0.01, suave(cu)), 1 + 0.15 * Math.sin(t * 20));
        col.material.opacity = 0.5 * (0.8 + 0.2 * Math.sin(t * 30));
        col.material.color.setHSL((t * 0.4) % 1, 0.85, 0.6);
        u.columnaNucleo.material.color.setHSL((t * 0.4 + 0.5) % 1, 0.6, 0.8);
        u.columnaNucleo.scale.copy(col.scale);
    }
    const ov = u.ondaViajera;
    if (ov.visible) {
        ov.userData.t += dt;
        const ou = Math.min(1, ov.userData.t / ov.userData.dur);
        ov.position.z = lerp(-50, 9, ou);
        ov.material.color.setHSL((t * 0.5) % 1, 0.9, 0.62);
        ov.material.opacity = 0.9 * (1 - Math.max(0, ou - 0.8) / 0.2);
        if (ou >= 1) ov.visible = false;
    }
    if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) dibujarHolo(t);
}

// ------------------------------------------------------------------ tuberías laterales (dos, de acero) y espejos

const TUBOS = {};
const ESPEJOS = {};

/** Pernos alrededor de una brida (InstancedMesh: un solo objeto por brida). */
function pernos(radio, n, pos, quat) {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.InstancedMesh(geo, MT.pernoInst, n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        o.position.set(Math.cos(a) * radio, Math.sin(a) * radio, 0);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
    }
    m.position.copy(pos);
    m.quaternion.copy(quat);
    return m;
}

/** Brida: anillo grueso de acero con pernos, orientada según la tangente del tubo. */
function brida(g, pos, tan, radio, grosor) {
    const z = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(z, tan);
    const geo = new THREE.CylinderGeometry(radio, radio, grosor, 40, 1, false);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, MT.acero);
    m.position.copy(pos);
    m.quaternion.copy(q);
    m.castShadow = true;
    g.add(m);
    const borde = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.045, 8, 48), MT.aceroBrillo);
    borde.position.copy(pos).addScaledVector(tan, grosor / 2);
    borde.quaternion.copy(q);
    g.add(borde);
    g.add(pernos(radio - 0.13, 10, new THREE.Vector3().copy(pos).addScaledVector(tan, grosor / 2 + 0.03), q));
}

function crearTubos(scene, cfg) {
    (cfg.tubos || []).forEach(function (tb) {
        const boca = v3(tb.boca);
        const lado = Math.sign(boca.x) || 1;
        const R0 = 0.72;
        const xPared = lado * 6.55;
        // recorrido: pegada a la pared desde el fondo, codo y tramo recto hasta la boca (de frente al anillo)
        const cam = new THREE.CurvePath();
        const pFondo = new THREE.Vector3(xPared, boca.y, -16);
        const pCodo0 = new THREE.Vector3(xPared, boca.y, boca.z - 1.1);
        const pCodoC = new THREE.Vector3(xPared, boca.y, boca.z);
        const pCodo1 = new THREE.Vector3(xPared - lado * 1.1, boca.y, boca.z);
        cam.add(new THREE.LineCurve3(pFondo, pCodo0));
        cam.add(new THREE.QuadraticBezierCurve3(pCodo0, pCodoC, pCodo1));
        cam.add(new THREE.LineCurve3(pCodo1, boca.clone()));
        const g = new THREE.Group();
        const matTubo = MT.acero.clone();
        matTubo.emissive = new THREE.Color(0x0b1a3a);
        matTubo.emissiveIntensity = 0.2;
        const tubo = new THREE.Mesh(new THREE.TubeGeometry(cam, 140, R0, 36, false), matTubo);
        tubo.castShadow = true;
        tubo.receiveShadow = true;
        g.add(tubo);
        // bridas con pernos a lo largo, en el codo y una grande en la boca
        [-13.5, -10, -6.5, -3].forEach(function (zz) {
            brida(g, new THREE.Vector3(xPared, boca.y, zz), new THREE.Vector3(0, 0, 1), R0 + 0.16, 0.22);
        });
        brida(g, pCodo0.clone(), new THREE.Vector3(0, 0, 1), R0 + 0.14, 0.18);
        brida(g, pCodo1.clone(), new THREE.Vector3(-lado, 0, 0), R0 + 0.14, 0.18);
        const tan = new THREE.Vector3(-lado, 0, 0);
        brida(g, boca.clone().addScaledVector(tan, -0.16), tan, R0 + 0.3, 0.32);
        // labio de la boca, interior oscuro y luz de energía al fondo
        const labio = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.02, 0.09, 12, 48), MT.aceroBrillo);
        labio.position.copy(boca);
        labio.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
        g.add(labio);
        const interior = new THREE.Mesh(new THREE.CylinderGeometry(R0 - 0.04, R0 - 0.04, 0.9, 32, 1, true), MT.interior);
        interior.rotation.z = Math.PI / 2;
        interior.position.copy(boca).addScaledVector(tan, -0.45);
        g.add(interior);
        const disco = new THREE.Mesh(new THREE.CircleGeometry(R0 - 0.06, 40), new THREE.MeshBasicMaterial({ color: 0x9ff0ff, toneMapped: false, transparent: true, opacity: 0.95 }));
        disco.position.copy(boca).addScaledVector(tan, -0.7);
        disco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
        g.add(disco);
        const halo = sprite(0x9ff0ff, 3.2, 0.4);
        halo.position.copy(boca).addScaledVector(tan, 0.25);
        g.add(halo);
        // ventanas de energía (anillos de vidrio con luz) que se encienden hacia la boca al lanzar
        const bandas = [];
        const geoB = new THREE.TorusGeometry(R0 + 0.03, 0.1, 10, 48);
        const largoTotal = cam.getLength();
        [3, 6.5, 10, 13.6, largoTotal - 0.9].forEach(function (dist) {
            const u = Math.min(0.995, dist / largoTotal);
            const m = new THREE.Mesh(geoB, new THREE.MeshBasicMaterial({ color: 0x9ff0ff, toneMapped: false }));
            m.position.copy(cam.getPointAt(u));
            m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cam.getTangentAt(u));
            g.add(m);
            bandas.push({ m: m, u: u });
        });
        // abrazaderas a la pared
        [-11.7, -4.8].forEach(function (zz) {
            const ab = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.06, 0.08, 8, 32, Math.PI), MT.aceroOscuro);
            ab.position.set(xPared, boca.y, zz);
            ab.rotation.z = lado > 0 ? -Math.PI / 2 : Math.PI / 2;
            g.add(ab);
            const pata = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), MT.aceroOscuro);
            pata.position.set(xPared + lado * (R0 + 0.2), boca.y, zz);
            g.add(pata);
        });
        // manómetro sobre el tubo
        const reloj = new THREE.Group();
        const caja = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 28), MT.aceroBrillo);
        caja.rotation.x = Math.PI / 2;
        reloj.add(caja);
        const cara = new THREE.Mesh(new THREE.CircleGeometry(0.29, 28), new THREE.MeshBasicMaterial({ map: TX.manometro, toneMapped: false }));
        cara.position.z = 0.075;
        reloj.add(cara);
        const aguja = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
        aguja.geometry.translate(0, 0.1, 0);
        aguja.position.z = 0.09;
        reloj.add(aguja);
        const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 10), MT.aceroOscuro);
        cuello.position.y = -0.4;
        reloj.add(cuello);
        // detrás del espejo (más al fondo que su marco, z < −2,65) y entre la brida de −6,5 y la abrazadera de −4,8
        reloj.position.set(xPared - lado * 0.05, boca.y + R0 + 0.55, -5.6);
        reloj.rotation.y = -lado * 0.9;
        g.add(reloj);
        scene.add(g);
        TUBOS[tb.id] = { curva: cam, bandas: bandas, disco: disco, halo: halo, boca: boca, tan: tan, mat: matTubo, aguja: aguja, reloj: reloj, destello: 0, flujo: -1, encendido: 0 };
    });
    crearEspejos(scene, cfg);
}

/** Espejos laterales: marco de acero, superficie que refleja el entorno, brillo que se desliza y luces. */
function crearEspejos(scene, cfg) {
    (cfg.espejos || []).forEach(function (es) {
        const lado = Math.sign(es.x) || 1;
        const xs = es.x + lado * 0.5;                   // la superficie: el plano de rebote + el radio de la esfera
        const alto = es.y1 - es.y0 + 0.4, ancho = es.z1 - es.z0 + 0.4;
        const cy = (es.y0 + es.y1) / 2, cz = (es.z0 + es.z1) / 2;
        const g = new THREE.Group();
        g.position.set(xs, cy, cz);
        g.rotation.y = -lado * Math.PI / 2;            // mira hacia el centro del túnel
        const fondo = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.5, alto + 0.5, 0.25), MT.aceroOscuro);
        fondo.position.z = -0.16;
        g.add(fondo);
        const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), MT.espejo);
        g.add(vidrio);
        const brillo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: TX.reflejo.clone(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        brillo.material.map.wrapS = THREE.RepeatWrapping;
        brillo.position.z = 0.01;
        g.add(brillo);
        // marco de acero y tiras de luz
        const luces = [];
        [[0, alto / 2 + 0.12, ancho + 0.48, 0.24], [0, -alto / 2 - 0.12, ancho + 0.48, 0.24], [ancho / 2 + 0.12, 0, 0.24, alto], [-ancho / 2 - 0.12, 0, 0.24, alto]].forEach(function (m) {
            const barra = new THREE.Mesh(new THREE.BoxGeometry(m[2], m[3], 0.22), MT.acero);
            barra.position.set(m[0], m[1], 0.02);
            barra.castShadow = true;
            g.add(barra);
            const tira = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.05, m[2] - 0.12), Math.max(0.05, m[3] - 0.12), 0.04), new THREE.MeshBasicMaterial({ color: 0x9ff0ff, toneMapped: false }));
            tira.scale.set(m[2] > m[3] ? 1 : 0.25, m[3] > m[2] ? 1 : 0.25, 1);
            tira.position.set(m[0], m[1], 0.14);
            g.add(tira);
            luces.push(tira);
        });
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (k) {
            const tornillo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), MT.perno);
            tornillo.rotation.x = Math.PI / 2;
            tornillo.position.set(k[0] * (ancho / 2 + 0.12), k[1] * (alto / 2 + 0.12), 0.16);
            g.add(tornillo);
        });
        const halo = sprite(0xbff7ff, 4, 0);
        halo.position.z = 0.3;
        g.add(halo);
        scene.add(g);
        ESPEJOS[es.id] = { g: g, brillo: brillo, luces: luces, halo: halo, x: xs, lado: lado, destello: 0, color: new THREE.Color(0x9ff0ff) };
    });
}

/** Rebote: el espejo destella, sale una onda sobre su superficie y chispas. */
function rebote(id, p, color) {
    const es = ESPEJOS[id];
    if (!es) return;
    es.destello = 1;
    es.color.set(color);
    const punto = new THREE.Vector3(es.x - es.lado * 0.05, p.y, p.z);
    onda(punto, color, 0.3, 1.5, 0.55, new THREE.Vector3(-es.lado, 0, 0), 0.95);
    onda(punto, 0xffffff, 0.2, 0.9, 0.4, new THREE.Vector3(-es.lado, 0, 0), 0.8);
    const c = new THREE.Color(color);
    for (let i = 0; i < cuantas(18); i++) {
        CH.emitir({
            p: punto, v: [-es.lado * (1 + Math.random() * 2.5), (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3],
            color: Math.random() < 0.4 ? new THREE.Color(0xffffff) : c, vida: 0.5 + Math.random() * 0.3, tam: 0.3, tamFin: 0.02, freno: 2
        });
    }
    emitir("evento", "rebote");
}

function actualizarEspejos(dt) {
    const t = E.reloj;
    Object.keys(ESPEJOS).forEach(function (id, j) {
        const es = ESPEJOS[id];
        es.destello = Math.max(0, es.destello - dt * 2.2);
        es.brillo.material.map.offset.x = (t * 0.05 + j * 0.5) % 1;
        es.brillo.material.opacity = 0.35 + 0.15 * Math.sin(t * 0.8 + j) + es.destello * 0.4;
        const base = (0.3 + 0.6 * E.energia);
        const col = E.fiesta ? new THREE.Color().setHSL((t * 0.3 + j * 0.5) % 1, 0.9, 0.62) : (es.destello > 0.02 ? es.color : COL.espera);
        es.luces.forEach(function (l) { l.material.color.copy(col).multiplyScalar(Math.min(1.6, base + es.destello * 1.2)); });
        es.halo.material.opacity = es.destello * 0.8;
        es.halo.material.color.copy(es.color);
    });
}

/** La tubería se ilumina hacia la boca (salida de una esfera). Promesa al llegar la luz a la boca. */
function flujoTubo(id, color) {
    const tb = TUBOS[id];
    if (!tb) return Promise.resolve();
    tb.flujo = 0;
    tb.colorFlujo = new THREE.Color(color || 0x9ff0ff);
    emitir("evento", "tubo");
    return sleep(520);
}

function destelloTubo(id, k) {
    const tb = TUBOS[id];
    if (tb) tb.destello = Math.max(tb.destello, k == null ? 1 : k);
}

function actualizarTubos(dt) {
    const t = E.reloj;
    Object.keys(TUBOS).forEach(function (id, j) {
        const tb = TUBOS[id];
        tb.destello = Math.max(0, tb.destello - dt * 1.6);
        if (tb.flujo >= 0) {
            tb.flujo += dt * 2.2;
            if (tb.flujo > 1.6) tb.flujo = -1;
        }
        const enc = Math.min(1, tb.encendido);
        tb.bandas.forEach(function (b) {
            let v = (0.15 + 0.55 * enc) * (0.85 + 0.15 * Math.sin(t * 2 + b.u * 6 + j));
            let col = null;
            if (tb.flujo >= 0) {
                const d = Math.abs(b.u - tb.flujo);
                if (d < 0.22) {
                    v += (1 - d / 0.22) * 1.4;
                    col = tb.colorFlujo;
                }
            }
            if (E.fiesta) col = new THREE.Color().setHSL((t * 0.3 + b.u + j * 0.17) % 1, 0.9, 0.62);
            b.m.material.color.copy(col || new THREE.Color(0x9ff0ff)).multiplyScalar(Math.min(1.8, v + tb.destello));
        });
        const boca = (0.2 + 0.7 * enc) + tb.destello * 1.2 + (tb.flujo > 0.8 ? 0.8 : 0);
        tb.disco.material.color.set(tb.colorFlujo && tb.flujo >= 0 ? tb.colorFlujo : 0x9ff0ff).multiplyScalar(Math.min(1.8, boca));
        tb.halo.material.opacity = Math.min(1, 0.1 + 0.3 * enc + tb.destello * 0.7 + (tb.flujo > 0.8 ? 0.4 : 0));
        tb.mat.emissiveIntensity = 0.2 + tb.destello * 1.2;
        tb.mat.emissive.set(tb.destello > 0.05 ? (tb.colorFlujo || 0x9ff0ff) : 0x0b1a3a);
        if (tb.aguja) tb.aguja.rotation.z = -1.2 + 2.0 * enc * (0.85 + 0.15 * Math.sin(t * 1.7 + j)) + tb.destello * 0.4;
    });
}

// ------------------------------------------------------------------ el anillo de captura

const A = {
    grupo: null, marco: null, aro: null, halo: null, disco: null, luz: null, orbita: null, trazos: null,
    color: new THREE.Color(0x3bdcff), brillo: 0.3, fase: "espera", antic: 0, pulso: 0, absorbe: 0
};

function crearAnillo(scene, cfg) {
    const rA = Number((cfg.juego || {}).radioAnillo) || 2.05;
    const g = new THREE.Group();
    // marco metálico exterior
    A.marco = new THREE.Mesh(new THREE.TorusGeometry(rA + 0.32, 0.26, 24, 120), MT.marco);
    A.marco.castShadow = true;
    g.add(A.marco);
    // borde interior oscuro (da volumen al aro de luz)
    const borde = new THREE.Mesh(new THREE.TorusGeometry(rA + 0.02, 0.16, 16, 120), MT.metalOsc);
    borde.position.z = -0.06;
    g.add(borde);
    // abrazaderas alrededor del marco
    const abs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.7, 0.62), MT.metalInst, 8);
    const leds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 10, 8), MT.cianInst, 8);
    const oi = new THREE.Object3D();
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        oi.position.set(Math.cos(a) * (rA + 0.38), Math.sin(a) * (rA + 0.38), 0);
        oi.rotation.set(0, 0, a);
        oi.updateMatrix();
        abs.setMatrixAt(i, oi.matrix);
        oi.position.z = 0.33;
        oi.updateMatrix();
        leds.setMatrixAt(i, oi.matrix);
    }
    abs.castShadow = true;
    g.add(abs, leds);
    // aro de energía (cambia de color con el estado)
    A.aro = new THREE.Mesh(new THREE.TorusGeometry(rA, 0.11, 16, 160), new THREE.MeshBasicMaterial({ color: 0x3bdcff, toneMapped: false }));
    A.aro.position.z = 0.05;
    g.add(A.aro);
    // trazos que giran por dentro (movimiento de energía)
    A.trazos = new THREE.Group();
    for (let i = 0; i < 6; i++) {
        const arco = new THREE.Mesh(new THREE.TorusGeometry(rA - 0.2, 0.03, 6, 40, Math.PI / 5), new THREE.MeshBasicMaterial({ color: 0xe3fafc, toneMapped: false, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
        arco.rotation.z = i * Math.PI / 3;
        A.trazos.add(arco);
    }
    g.add(A.trazos);
    // disco translúcido de la zona de captura
    A.disco = new THREE.Mesh(new THREE.CircleGeometry(rA - 0.08, 80), new THREE.MeshBasicMaterial({ color: 0x3bdcff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    g.add(A.disco);
    // halo
    A.halo = sprite(0x3bdcff, rA * 3.8, 0.35);
    A.halo.position.z = -0.2;
    g.add(A.halo);
    // partículas en órbita
    const n = 54;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = rA + 0.55 + (Math.random() - 0.5) * 0.4;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    A.orbita = new THREE.Points(geo, new THREE.PointsMaterial({ map: TX.brillo, color: 0x9ff0ff, size: 0.28, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(A.orbita);
    // soportes al techo y a la pasarela: fuera del grupo que se escala; se estiran para seguir tocando el aro
    A.soportes = [];
    [[1, 7.3], [-1, -4.4]].forEach(function (s) {
        const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 12), MT.metalOsc);
        brazo.castShadow = true;
        scene.add(brazo);
        A.soportes.push({ m: brazo, lado: s[0], tope: s[1] });
    });
    // luz del anillo
    A.luz = new THREE.PointLight(0x3bdcff, 6, 16, 1.2);
    A.luz.position.set(0, 0, 1);
    g.add(A.luz);
    A.grupo = g;
    A.rA = rA;          // radio con el que se construyó (escala 1)
    A.rAct = rA;        // radio actual (se achica en cada ronda)
    A.rObj = rA;
    scene.add(g);
    ubicarSoportes(1);
}

function ubicarSoportes(esc) {
    const borde = A.rAct * esc + 0.55;
    A.soportes.forEach(function (s) {
        const desde = s.lado * borde;
        const largo = Math.abs(s.tope - desde);
        s.m.scale.set(1, largo, 1);
        s.m.position.set(0, (desde + s.tope) / 2, -0.15);
    });
}

/** El aro se achica (o crece) hasta el radio r con una animación suave; la promesa resuelve al terminar. */
function tamanoAnillo(r) {
    const obj = Number(r) || A.rA;
    if (Math.abs(obj - A.rObj) < 0.01 && Math.abs(obj - A.rAct) < 0.01) return Promise.resolve();
    const achica = obj < A.rAct;
    A.rObj = obj;
    A.cambioT = 0;
    A.rDesde = A.rAct;
    if (achica) {
        // aviso visual: la energía se concentra en el aro mientras se cierra
        onda(new THREE.Vector3(0, 0, 0.05), 0xffd43b, A.rAct * 1.25, obj, 0.9, null, 0.9);
        estallido(new THREE.Vector3(0, 0, 0.05), 0xffe066, 30, 2.2, { plano: true, vida: 0.8, tam: 0.3 });
        A.pulso = 1;
        emitir("evento", "anillo-achica");
    }
    return sleep(reducido ? 200 : 1300);
}

function actualizarAnillo(dt, fase, antic) {
    const t = E.reloj;
    A.fase = fase;
    A.antic = antic;
    // color objetivo según el estado
    let obj = COL.espera.clone();
    let brillo = 0.35 + 0.65 * E.energia;
    if (fase === "preparacion") {
        obj.lerp(COL.prepara, antic * 0.75);
        brillo += antic * 0.4;
    } else if (fase === "captura") {
        obj = COL.captura.clone();
        brillo = 1.6;
    }
    if (E.ayuda && fase !== "captura") brillo += 0.25 * (0.5 + 0.5 * Math.sin(t * 4));
    if (E.pulsoError > 0) {
        obj.lerp(COL.error, Math.min(1, E.pulsoError));
        E.pulsoError = Math.max(0, E.pulsoError - dt * 2.5);
    }
    if (E.flashCaptura > 0) {
        obj.lerp(COL.captura, Math.min(1, E.flashCaptura));
        brillo = Math.max(brillo, 1 + E.flashCaptura);
        E.flashCaptura = Math.max(0, E.flashCaptura - dt * 1.2);
    }
    if (E.fiesta) obj.setHSL((t * 0.2) % 1, 0.9, 0.62);
    A.color.lerp(obj, Math.min(1, dt * (fase === "captura" ? 14 : 5)));
    A.brillo = lerp(A.brillo, brillo, Math.min(1, dt * 6));
    A.aro.material.color.copy(A.color).multiplyScalar(Math.min(1, 0.55 + A.brillo * 0.45));
    A.halo.material.color.copy(A.color);
    const respira = fase === "captura" ? 0.5 + 0.5 * Math.sin(t * 16) : 0.5 + 0.5 * Math.sin(t * (2 + antic * 6));
    A.halo.material.opacity = Math.min(1, (0.16 + A.brillo * 0.32) * (E.menosEfectos ? 0.7 : 1) + respira * 0.1);
    A.disco.material.color.copy(A.color);
    A.disco.material.opacity = fase === "captura" ? 0.2 + 0.08 * respira : 0.03 + antic * 0.08 + (E.ayuda ? 0.04 : 0);
    A.luz.color.copy(A.color);
    A.luz.intensity = 3 + A.brillo * 9;
    // pulsación: suave en espera, más rápida al acercarse, grande dentro de la ventana; el pulso de error es corto
    let esc = 1 + 0.015 * Math.sin(t * 2.2);
    if (fase === "preparacion") esc += 0.025 * antic * Math.sin(t * 9);
    if (fase === "captura") esc = 1.07 + 0.025 * Math.sin(t * 16);
    esc += E.pulsoError * 0.05 + A.pulso * 0.12;
    A.pulso = Math.max(0, A.pulso - dt * 2.5);
    if (reducido) esc = 1 + (fase === "captura" ? 0.05 : 0);
    // tamaño por ronda: interpolación suave con un pequeño rebote al final
    if (A.rObj !== A.rAct || A.cambioT != null) {
        A.cambioT = (A.cambioT || 0) + dt / (reducido ? 0.2 : 1.2);
        const u = Math.min(1, A.cambioT);
        const reb = u < 1 ? Math.sin(u * Math.PI) * 0.06 * (A.rObj < A.rDesde ? -1 : 1) : 0;
        A.rAct = lerp(A.rDesde, A.rObj, suave(u)) + reb;
        if (u >= 1) {
            A.rAct = A.rObj;
            A.cambioT = null;
        }
    }
    const k = A.rAct / A.rA;
    A.grupo.scale.setScalar(esc * k);
    ubicarSoportes(esc);
    // energía que gira
    const vel = 0.4 + antic * 2.5 + (fase === "captura" ? 4 : 0) + (E.fiesta ? 3 : 0);
    A.trazos.rotation.z -= dt * vel * (reducido ? 0.3 : 1);
    A.trazos.children.forEach(function (a) { a.material.color.copy(A.color).lerp(new THREE.Color(0xffffff), 0.5); });
    A.orbita.rotation.z += dt * (0.25 + antic * 0.8 + (fase === "captura" ? 1.5 : 0));
    A.orbita.material.color.copy(A.color).lerp(new THREE.Color(0xffffff), 0.3);
    A.orbita.material.opacity = 0.35 + 0.55 * E.energia;
    A.marco.material.emissive.copy(A.color).multiplyScalar(0.12 + 0.25 * (fase === "captura" ? 1 : antic));
}

// ------------------------------------------------------------------ la esfera luminosa (una, reutilizada)

const S = {
    grupo: null, nucleo: null, energia: null, cascara: null, banda: null, halo: null, luz: null,
    activa: false, t: 0, tray: null, radio: 0.5, color: new THREE.Color(), capturada: false, auto: false,
    absorbe: 0, desde: new THREE.Vector3(), resolver: null, fase: "espera", aparece: 0, ventanaAvisada: false,
    estela: 0, prev: new THREE.Vector3(), tubo: null
};

function crearEsfera(scene) {
    const g = new THREE.Group();
    S.nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    g.add(S.nucleo);
    S.energia = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(S.energia);
    S.cascara = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.72, depthWrite: false, envMapIntensity: 1.4 }));
    S.cascara.castShadow = true;
    g.add(S.cascara);
    S.banda = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 }));
    S.banda.rotation.x = 1.2;
    g.add(S.banda);
    S.halo = sprite(0xffffff, 5.6, 0.85);
    g.add(S.halo);
    g.visible = false;
    S.grupo = g;
    scene.add(g);
    S.luz = new THREE.PointLight(0xffffff, 0, 9, 1.3);
    scene.add(S.luz);
}

function pintarEsfera(color) {
    S.color.set(color);
    const claro = S.color.clone().lerp(new THREE.Color(0xffffff), 0.4);
    S.nucleo.material.color.copy(claro);
    S.energia.material.color.copy(claro);
    S.cascara.material.color.copy(S.color);
    S.cascara.material.emissive.copy(S.color);
    S.banda.material.color.copy(claro);
    S.halo.material.color.copy(S.color);
    S.luz.color.copy(S.color);
}

/**
 * Lanza una esfera: la tubería se ilumina, la esfera aparece en la boca y recorre la trayectoria.
 * opts: { velocidad, radioEsfera, tolerancia, ventanaExtra, auto }
 * Promesa: { resultado: "capturada" | "paso" }.
 */
function lanzar(esfera, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
        const cfg = E.cfg;
        const tray = R().trayectoria(cfg, esfera, {
            velocidad: opts.velocidad, tolerancia: opts.tolerancia, ventanaExtra: opts.ventanaExtra,
            radioCaptura: Number(opts.radioCaptura) || Number((cfg.juego || {}).radioCaptura) || 1.45
        });
        const color = R().color(cfg, esfera.color);
        S.resolver = resolve;
        S.tray = null;
        S.activa = false;
        flujoTubo(esfera.tubo, color).then(function () {
            if (S.resolver !== resolve) return;
            pintarEsfera(color);
            S.tray = tray;
            S.t = 0;
            S.radio = Number(opts.radioEsfera) || 0.5;
            S.capturada = false;
            S.absorbe = 0;
            S.auto = !!opts.auto;
            S.fase = "espera";
            S.aparece = 0;
            S.tubo = esfera.tubo;
            S.reboteIdx = 0;
            S.activa = true;
            S.grupo.visible = true;
            const p = tray.en(0);
            S.grupo.position.set(p.x, p.y, p.z);
            S.prev.copy(S.grupo.position);
            const tb = TUBOS[esfera.tubo];
            destelloTubo(esfera.tubo, 1);
            if (tb) {
                onda(tb.boca, color, 0.4, 1.6, 0.6, tb.tan, 0.9);
                estallido(tb.boca, color, 14, 2.2, { vida: 0.5, tam: 0.3 });
            }
            emitir("evento", "aparece");
        });
    });
}

function resolverEsfera(resultado) {
    const r = S.resolver;
    S.resolver = null;
    S.activa = false;
    S.tray = null;
    S.grupo.visible = false;
    S.luz.intensity = 0;
    if (r) r({ resultado: resultado });
}

function capturar() {
    if (!S.activa || S.capturada || !S.tray) return false;
    S.capturada = true;
    S.absorbe = 0;
    S.desde.copy(S.grupo.position);
    const centro = new THREE.Vector3(0, 0, 0.05);
    // respuesta del entorno
    E.flashCaptura = 1.4;
    A.pulso = 1;
    onda(centro, 0x3dff6e, A.rAct * 0.9, A.rAct * 2.6, 0.75, null, 1);
    onda(centro, 0xffffff, A.rAct * 0.5, A.rAct * 1.8, 0.55, null, 0.7);
    estallido(centro, 0x8cffb5, 40, 4.5, { plano: true, vida: 0.9, tam: 0.42 });
    estallido(S.grupo.position, S.color, 26, 3, { vida: 0.7, tam: 0.35 });
    E.persecucion = { t: 0, dur: 1.4, velocidad: 48, color: COL.captura.clone(), arcoiris: false };
    Object.keys(TUBOS).forEach(function (id) { destelloTubo(id, 0.8); });
    E.reactorObj = Math.min(1, E.reactorObj + 0.04);
    E.reactor = Math.min(1.3, E.reactor + 0.35);
    emitir("evento", "captura");
    return true;
}

function actualizarEsfera(dt) {
    if (!S.activa || !S.tray) {
        return { fase: "espera", antic: 0 };
    }
    const tr = S.tray;
    const prep = Number((E.cfg.juego || {}).preparacionS) || 1.3;
    if (S.capturada) {
        // absorción: la esfera va al centro del anillo, gira y se encoge
        S.absorbe += dt / (reducido ? 0.2 : 0.42);
        const u = suave(S.absorbe);
        S.grupo.position.lerpVectors(S.desde, new THREE.Vector3(0, 0, 0.05), u);
        S.grupo.scale.setScalar(S.radio * Math.max(0.02, 1 - u));
        S.grupo.rotation.y += dt * 14;
        S.luz.intensity = 14 * (1 - u);
        S.luz.position.copy(S.grupo.position);
        if (S.absorbe >= 1) {
            estallido(new THREE.Vector3(0, 0, 0.1), 0xffffff, 18, 2, { vida: 0.6, tam: 0.3 });
            resolverEsfera("capturada");
        }
        return { fase: "captura", antic: 1 };
    }
    S.t += dt;
    while (tr.rebotes && S.reboteIdx < tr.rebotes.length && S.t >= tr.rebotes[S.reboteIdx].t) {
        const rb = tr.rebotes[S.reboteIdx];
        rebote(rb.espejo, rb.p, S.color);
        S.reboteIdx++;
    }
    const p = tr.en(S.t);
    S.grupo.position.set(p.x, p.y, p.z);
    // aparece creciendo desde la boca
    S.aparece = Math.min(1, S.aparece + dt / 0.3);
    let esc = S.radio * (0.3 + 0.7 * suave(S.aparece));
    // se desvanece al final del recorrido
    const resta = tr.tFin - S.t;
    if (resta < 0.5) esc *= Math.max(0.05, resta / 0.5);
    S.grupo.scale.setScalar(esc * (1 + 0.04 * Math.sin(E.reloj * 10)));
    S.energia.rotation.x += dt * 2.2;
    S.energia.rotation.y += dt * 3.1;
    S.banda.rotation.z += dt * 4;
    S.banda.rotation.y += dt * 1.5;
    S.halo.material.opacity = 0.75 + 0.2 * Math.sin(E.reloj * 8);
    S.luz.position.copy(S.grupo.position);
    S.luz.intensity = 10 * Math.min(1, S.aparece) * Math.max(0, Math.min(1, resta / 0.5));
    // estela: partículas que quedan atrás
    S.estela += dt;
    const paso = E.menosEfectos ? 0.05 : 0.018 / NIVELES[E.nivel || 0].particulas;
    while (S.estela > paso) {
        S.estela -= paso;
        const q = S.prev.clone().lerp(S.grupo.position, Math.random());
        CH.emitir({
            p: q, v: [(Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4],
            color: Math.random() < 0.3 ? new THREE.Color(0xffffff) : S.color,
            vida: 0.45 + Math.random() * 0.25, tam: S.radio * 1.5, tamFin: 0.02, freno: 1
        });
    }
    S.prev.copy(S.grupo.position);
    // fases
    const fase = R().faseAnillo(S.t, tr, prep);
    const antic = R().anticipacion(S.t, tr, prep);
    if (fase !== S.fase) {
        S.fase = fase;
        emitir("fase", fase);
    }
    if (Math.abs(antic - (S.anticAviso || 0)) > 0.05 || (antic === 0 && S.anticAviso)) {
        S.anticAviso = antic;
        emitir("cerca", antic);
    }
    if (S.auto && S.t >= tr.tc) capturar();
    if (S.t >= tr.tFin) {
        resolverEsfera("paso");
        return { fase: "espera", antic: 0 };
    }
    return { fase: fase === "paso" ? "espera" : fase, antic: fase === "paso" ? 0 : antic };
}

// ------------------------------------------------------------------ calidad adaptable (tabletas)
//
// Nivel 0 (computador): resolución hasta 1,5×, sombras. Nivel 1 (tableta o fps bajos): resolución 1×, sin sombras.
// Nivel 2 (fps aún bajos): resolución 0,75×, sin sombras y menos partículas. Tras 4 s de calentamiento, baja de nivel
// sola si dos ventanas seguidas de 2 s quedan por debajo de 45 fps; nunca vuelve a subir (evita saltos).

const NIVELES = [
    { pr: function () { return Math.min(window.devicePixelRatio || 1, 1.5); }, sombras: true, particulas: 1 },
    { pr: function () { return 1; }, sombras: false, particulas: 0.7 },
    { pr: function () { return 0.75; }, sombras: false, particulas: 0.4 }
];

function esTableta() {
    const tactil = (navigator.maxTouchPoints || 0) > 0 || ("ontouchstart" in window);
    const grueso = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    return grueso || (tactil && Math.min(screen.width, screen.height) <= 1100);
}

function aplicarNivel(n) {
    E.nivel = Math.max(0, Math.min(NIVELES.length - 1, n));
    const nv = NIVELES[E.nivel];
    if (E.renderer.shadowMap.enabled !== nv.sombras) {
        E.renderer.shadowMap.enabled = nv.sombras;
        E.scene.traverse(function (o) { if (o.material && o.material.needsUpdate !== undefined && o.isMesh) o.material.needsUpdate = true; });
    }
    reacomodar();
}

const RENDIMIENTO = { tiempo: 0, cuadros: 0, fps: 60, calentar: 4, bajos: 0 };

function medirRendimiento(dt) {
    if (document.hidden || dt <= 0) return;
    // los primeros segundos (carga, compilación de materiales, intro) no cuentan
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
    // hacen falta dos ventanas lentas seguidas para bajar de nivel (un tirón aislado no cuenta)
    RENDIMIENTO.bajos = RENDIMIENTO.fps < 45 ? RENDIMIENTO.bajos + 1 : 0;
    if (RENDIMIENTO.bajos >= 2 && E.nivel < NIVELES.length - 1) {
        RENDIMIENTO.bajos = 0;
        aplicarNivel(E.nivel + 1);
    }
}

// ------------------------------------------------------------------ cámara y tamaño

function reacomodar() {
    if (!E.renderer || !E.host) return;
    const w = Math.max(10, E.host.clientWidth || window.innerWidth);
    const h = Math.max(10, E.host.clientHeight || window.innerHeight);
    E.renderer.setPixelRatio(NIVELES[E.nivel].pr());
    E.renderer.setSize(w, h, true);   // true: también fija el tamaño CSS (en pantallas 2× se veía al doble y cortado)
    const asp = w / h;
    E.camera.aspect = asp;
    const medio = Math.max(MEDIO_ALTO, MEDIO_ANCHO / asp);
    E.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(medio / CAM_Z));
    E.camera.updateProjectionMatrix();
    const px = h * E.renderer.getPixelRatio() / 2 / Math.tan(THREE.MathUtils.degToRad(E.camera.fov) / 2);
    E.escalaPx = px;
    CH.mat.uniforms.escala.value = px;
    ES.mat.uniforms.escala.value = px;
}

function aPantalla(x, y, z) {
    if (!E.camera || !E.host) return { x: 0, y: 0 };
    const v = new THREE.Vector3(x, y, z || 0).project(E.camera);
    const r = E.host.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
}

// ------------------------------------------------------------------ ciclo de render (uno solo)

function tick() {
    const ahora = performance.now();
    let dt = (ahora - (E.ultimoCuadro || ahora)) / 1000;
    E.ultimoCuadro = ahora;
    dt = Math.max(0, Math.min(0.1, dt));
    E.reloj += dt;
    medirRendimiento(dt);
    E.energia = lerp(E.energia, E.energiaObj, Math.min(1, dt * 2.2));
    const est = actualizarEsfera(dt);
    actualizarAnillo(dt, est.fase, est.antic);
    actualizarTubos(dt);
    actualizarEspejos(dt);
    actualizarTunel(dt, est.antic);
    actualizarOndas(dt);
    if (E.fiesta) fiestaTick(dt);
    CH.actualizar(dt);
    ES.actualizar(dt);
    // la cámara flota apenas (sin giros bruscos)
    if (E.camTween) avanzarCamara(dt);
    if (E.cine) {
        E.camera.position.copy(E.cine.pos);
        E.camera.lookAt(E.cine.mira);
    } else {
        if (!reducido) {
            E.camera.position.x = Math.sin(E.reloj * 0.23) * 0.12;
            E.camera.position.y = 0.6 + Math.sin(E.reloj * 0.31) * 0.08;
        } else {
            E.camera.position.set(0, 0.6, CAM_Z);
        }
        E.camera.lookAt(0, 0.05, -2);
    }
    E.renderer.render(E.scene, E.camera);
}

// ------------------------------------------------------------------ fiesta final

let fiestaAcum = 0;

function fiestaTick(dt) {
    fiestaAcum += dt;
    if (fiestaAcum < (E.menosEfectos ? 0.5 : 0.18)) return;
    fiestaAcum = 0;
    // confeti luminoso que cae, estrellas y aros de energía
    for (let i = 0; i < 4; i++) {
        ES.emitir({
            p: new THREE.Vector3((Math.random() - 0.5) * 12, 5.5, -1 - Math.random() * 6),
            v: [(Math.random() - 0.5) * 1.2, -1 - Math.random(), (Math.random() - 0.5) * 0.6],
            color: new THREE.Color().setHSL(Math.random(), 0.85, 0.65),
            vida: 3, tam: 0.35 + Math.random() * 0.3, tamFin: 0.2, grav: 0.4, freno: 0.2
        });
    }
    if (Math.random() < 0.35) onda(new THREE.Vector3(0, 0, 0.05), new THREE.Color().setHSL(Math.random(), 0.9, 0.6), A.rAct, A.rAct * 2.8, 1.2, null, 0.7);
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    E.nivel = esTableta() ? 1 : 0;
    renderer.setPixelRatio(NIVELES[E.nivel].pr());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = NIVELES[E.nivel].sombras;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    E.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1236);
    scene.fog = new THREE.FogExp2(0x0b1236, 0.022);
    E.scene = scene;
    E.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
    E.camera.position.set(0, 0.6, CAM_Z);

    crearTexturas();
    scene.environment = crearEntorno(renderer);
    crearMateriales();
    dibujarHolo(0);

    scene.add(new THREE.HemisphereLight(0xa9c4ff, 0x2a1d5c, 1.1));
    scene.add(new THREE.AmbientLight(0x4a5aa8, 0.6));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(3, 8, 7);
    sol.target.position.set(0, -2, -2);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -8;
    sol.shadow.camera.right = 8;
    sol.shadow.camera.top = 8;
    sol.shadow.camera.bottom = -8;
    sol.shadow.camera.near = 1;
    sol.shadow.camera.far = 30;
    sol.shadow.bias = -0.0008;
    scene.add(sol, sol.target);

    CH = new Reserva(900, TX.brillo);
    ES = new Reserva(260, TX.estrella);
    scene.add(CH.puntos, ES.puntos);

    crearTunel(scene);
    crearTubos(scene, cfg);
    crearAnillo(scene, cfg);
    crearEsfera(scene);
    crearOndas(scene);

    // entrada: un toque o clic en cualquier parte de la escena (solo el puntero principal)
    host.addEventListener("pointerdown", function (ev) {
        if (ev.isPrimary === false) return;
        if (ev.button != null && ev.button > 0) return;
        ev.preventDefault();
        emitir("toque", { x: ev.clientX, y: ev.clientY });
    });

    reacomodar();
    if (typeof ResizeObserver === "function") new ResizeObserver(reacomodar).observe(host);
    renderer.setAnimationLoop(tick);
    // respaldo: si el navegador deja de dar cuadros, la escena sigue avanzando
    setInterval(function () {
        if (performance.now() - E.ultimoCuadro > 250) tick();
    }, 120);
    // compilar todo de una vez (evita tirones al aparecer la primera esfera)
    try { renderer.compile(scene, E.camera); } catch (e) { /* noop */ }
    E.listo = true;
    apagar();
    return Promise.resolve(true);
}

// ------------------------------------------------------------------ API para script.js

function apagar() {
    E.energiaObj = 0;
    E.energia = 0;
    Object.keys(TUBOS).forEach(function (id) { TUBOS[id].encendido = 0; });
}

/** Presentación: las tuberías se encienden una a una y el anillo empieza a brillar. */
async function encender() {
    const ids = Object.keys(TUBOS);
    for (let i = 0; i < ids.length; i++) {
        const tb = TUBOS[ids[i]];
        tb.encendido = 1;
        tb.flujo = 0;
        tb.colorFlujo = new THREE.Color(0x9ff0ff);
        destelloTubo(ids[i], 0.8);
        emitir("evento", "tubo");
        await sleep(300);
    }
    E.energiaObj = 1;
    E.persecucion = { t: 0, dur: 1.8, velocidad: 40, color: COL.espera.clone(), arcoiris: false };
    A.pulso = 1;
    onda(new THREE.Vector3(0, 0, 0.05), 0x3bdcff, A.rAct, A.rAct * 2.2, 0.9, null, 0.8);
    emitir("evento", "anillo");
    await sleep(1100);
}

function encendidoTotal() {
    E.energiaObj = 1;
    E.energia = 1;
    Object.keys(TUBOS).forEach(function (id) { TUBOS[id].encendido = 1; });
}

function estadoVuelo() {
    return { activa: S.activa && !!S.tray, t: S.activa ? S.t : null, tray: S.tray, capturada: S.capturada, fase: S.fase };
}

/** Pulso azul suave (toque antes o después): sin explosión, vuelve enseguida a su estado. */
function pulsoError() {
    E.pulsoError = 1;
    onda(new THREE.Vector3(0, 0, 0.05), 0x5c8dff, A.rAct * 0.95, A.rAct * 1.25, 0.4, null, 0.55);
}

async function celebrarRonda() {
    E.persecucion = { t: 0, dur: 2.2, velocidad: 34, color: COL.oro.clone(), arcoiris: true };
    A.pulso = 1;
    const c = new THREE.Vector3(0, 0, 0.05);
    onda(c, 0xffd43b, A.rAct, A.rAct * 3, 1, null, 0.9);
    estallido(c, 0xffd43b, 50, 5, { reserva: ES, vida: 1.4, tam: 0.45, arcoiris: true, grav: 1.2, freno: 1 });
    Object.keys(TUBOS).forEach(function (id) { destelloTubo(id, 1); });
    E.reactor = 1;
    await sleep(1700);
}

/** Final: la energía se expande por el túnel, tuberías y reactor se encienden, onda 3D y fiesta. */
// ------------------------------------------------------------------ cinemática final: «Viaje al reactor»

/** Mueve la cámara de cine (posición y punto de mira) en dur segundos; arco = desvío lateral en curva. */
function camara(pos, mira, dur, arco) {
    if (!E.cine) E.cine = { pos: E.camera.position.clone(), mira: new THREE.Vector3(0, 0.05, -2) };
    return new Promise(function (resolve) {
        if (E.camTween && E.camTween.resolve) E.camTween.resolve();
        E.camTween = {
            p0: E.cine.pos.clone(), p1: pos.clone(), m0: E.cine.mira.clone(), m1: mira.clone(),
            t: 0, dur: Math.max(0.05, dur), arco: arco || 0, resolve: resolve
        };
    });
}

function avanzarCamara(dt) {
    const tw = E.camTween;
    tw.t += dt;
    const u = Math.min(1, tw.t / tw.dur);
    const k = suave(u);
    E.cine.pos.lerpVectors(tw.p0, tw.p1, k);
    E.cine.pos.x += Math.sin(u * Math.PI) * tw.arco;
    E.cine.mira.lerpVectors(tw.m0, tw.m1, k);
    if (u >= 1) {
        E.camTween = null;
        tw.resolve();
    }
}

function esperarCamara(p, dur) {
    return Promise.race([p, sleep((dur + 1.5) * 1000)]);
}

/**
 * Final cinemático «Viaje al reactor»:
 *  1. destello verde de la última captura;  2. la cámara cruza el aro y viaja por el túnel (las costillas se
 *  encienden a su paso);  3. el reactor despierta: sus aros se alinean y lanza una columna de energía;
 *  4. una onda de colores recorre el túnel de vuelta;  5. la cámara regresa en curva y cruza el aro de nuevo;
 *  6. fiesta (confeti, estrellas, aros). Con movimiento reducido la cámara no se mueve.
 */
async function final() {
    const c = new THREE.Vector3(0, 0, 0.05);
    const R0 = reactor.position;
    const u = reactor.userData;
    E.flashCaptura = 2;
    E.persecucion = { t: 0, dur: 2, velocidad: 30, color: COL.captura.clone(), arcoiris: true };
    onda(c, 0x3dff6e, A.rAct, A.rAct * 3, 1, null, 1);
    emitir("evento", "final-expande");
    emitir("cine", true);
    await sleep(700);
    const ids = Object.keys(TUBOS);
    ids.forEach(function (id, i) {
        destelloTubo(id, 1.4);
        TUBOS[id].flujo = 0;
        TUBOS[id].colorFlujo = new THREE.Color().setHSL(i / ids.length, 0.9, 0.62);
    });
    if (!reducido) {
        // 2. cruza el aro y viaja hacia el reactor
        emitir("evento", "cine-viaje");
        E.cineVel = 4;
        await esperarCamara(camara(new THREE.Vector3(0, 0.15, 1.2), new THREE.Vector3(0, 0.1, -20), 1.4, 0), 1.4);
        await esperarCamara(camara(new THREE.Vector3(0, 0.6, -38), new THREE.Vector3(0, 0.3, -52), 2.8, 0.8), 2.8);
        E.cineVel = 0;
    }
    // 3. el reactor despierta
    u.alinearObj = 1;
    E.reactorObj = 1;
    E.reactor = 1.2;
    emitir("evento", "final-reactor");
    await sleep(reducido ? 300 : 1100);
    u.columna.visible = true;
    u.columnaNucleo.visible = true;
    u.columna.userData.t = 0;
    cascara(R0, 0xbff7ff, 14, 1.4, 0.5);
    estallido(R0, 0x9ff0ff, 70, 9, { vida: 1.6, tam: 1.1 });
    estallido(R0, 0xffffff, 40, 6, { reserva: ES, vida: 1.8, tam: 0.6, arcoiris: true, freno: 0.6 });
    emitir("evento", "cine-columna");
    await sleep(reducido ? 300 : 1300);
    // 4. la onda recorre el túnel de vuelta y 5. la cámara regresa en curva hasta el aro
    u.ondaViajera.visible = true;
    u.ondaViajera.userData.t = 0;
    E.persecucion = { t: 0, dur: 2.6, velocidad: 24, color: COL.oro.clone(), arcoiris: true, inverso: true };
    emitir("evento", "cine-regreso");
    if (!reducido) {
        await esperarCamara(camara(new THREE.Vector3(0, 0.6, CAM_Z), new THREE.Vector3(0, 0.05, -2), 3.2, -2.6), 3.2);
        E.cine = null;
    }
    // 6. fiesta
    cascara(c, 0x9ff0ff, 18, 1.8, 0.45);
    onda(c, 0xffffff, A.rAct, A.rAct * 4, 1.4, null, 1);
    estallido(c, 0xffffff, 80, 7, { reserva: ES, vida: 2, tam: 0.5, arcoiris: true, grav: 0.8, freno: 0.8 });
    E.fiesta = true;
    emitir("evento", "final-fiesta");
    emitir("cine", false);
    await sleep(900);
}

function reiniciar() {
    if (!E.listo) return;
    if (S.resolver) {
        const r = S.resolver;
        S.resolver = null;
        r({ resultado: "cancelada" });
    }
    S.activa = false;
    S.tray = null;
    S.capturada = false;
    S.grupo.visible = false;
    S.luz.intensity = 0;
    E.fiesta = false;
    E.persecucion = null;
    if (E.camTween && E.camTween.resolve) E.camTween.resolve();
    E.camTween = null;
    E.cine = null;
    E.cineVel = 0;
    const ur = reactor.userData;
    ur.alinearObj = 0;
    ur.columna.visible = false;
    ur.columnaNucleo.visible = false;
    ur.ondaViajera.visible = false;
    E.pulsoError = 0;
    E.flashCaptura = 0;
    E.reactorObj = 0.35;
    E.ayuda = false;
    CH.vaciar();
    ES.vaciar();
    ONDAS.concat(CASCARAS).forEach(function (o) { o.m.visible = false; });
    encendidoTotal();
}

window.EscenarioEsfera = {
    montar: montar,
    listo: function () { return E.listo; },
    al: function (nombre, fn) {
        (E.oyentes[nombre] = E.oyentes[nombre] || []).push(fn);
    },
    reacomodar: reacomodar,
    reiniciar: reiniciar,
    apagar: apagar,
    encender: encender,
    encendidoTotal: encendidoTotal,
    lanzar: lanzar,
    capturar: capturar,
    estadoVuelo: estadoVuelo,
    pulsoError: pulsoError,
    celebrarRonda: celebrarRonda,
    final: final,
    ayuda: function (on) { E.ayuda = !!on; },
    tamanoAnillo: tamanoAnillo,
    radioAnillo: function () { return A.rAct; },
    menosEfectos: function (on) { E.menosEfectos = !!on; },
    reactorSube: function (k) { E.reactorObj = Math.max(E.reactorObj, k); },
    /** Centro del anillo en la pantalla (la mano de la demo toca ahí). */
    puntoAnillo: function () { return aPantalla(0, 0, 0); },
    /** Radio del anillo en píxeles de pantalla. */
    radioAnilloPx: function () {
        const a = aPantalla(0, 0, 0), b = aPantalla(A.rAct, 0, 0);
        return Math.abs(b.x - a.x);
    },
    aPantalla: aPantalla,
    posicionEsfera: function () {
        if (!S.activa) return null;
        const p = S.grupo.position;
        return aPantalla(p.x, p.y, p.z);
    },
    /** Hueco de Zoe 3D (abajo a la izquierda, sin tapar el anillo). */
    zonaZoe: function () {
        const r = E.host ? E.host.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const h = r.height * 0.5;
        const w = h * 0.62;
        return { left: r.left + r.width * 0.06, top: r.top + r.height - h - r.height * 0.03, width: w, height: h };
    },
    /** Diagnóstico: pares manómetro/espejo cuyas cajas 3D se tocan (debe ser []). */
    choquesDecorado: function () {
        const fuera = [];
        Object.keys(TUBOS).forEach(function (id) {
            const a = new THREE.Box3().setFromObject(TUBOS[id].reloj);
            Object.keys(ESPEJOS).forEach(function (k) {
                if (a.intersectsBox(new THREE.Box3().setFromObject(ESPEJOS[k].g))) fuera.push("reloj " + id + " / espejo " + k);
            });
        });
        return fuera;
    },
    /** Profundidad de las costillas del túnel (ninguna debe caer en el tramo de los espejos). */
    costillasZ: function () { return COSTILLAS.map(function (c) { return c.z; }); },
    /** Diagnóstico: materiales compartidos por objetos que obligan a cambiar de programa (debe ser []). */
    materialesMixtos: function () {
        const uso = new Map();
        E.scene.traverse(function (o) {
            if (!o.material || Array.isArray(o.material)) return;
            const k = [o.isInstancedMesh ? "inst" : (o.isPoints ? "pts" : (o.isSprite ? "spr" : "mesh")), o.receiveShadow ? "rs" : "", o.isInstancedMesh && o.instanceColor ? "ic" : ""].join("|");
            if (!uso.has(o.material)) uso.set(o.material, new Set());
            uso.get(o.material).add(k);
        });
        const fuera = [];
        uso.forEach(function (ks, m) { if (ks.size > 1) fuera.push(m.type + " " + (m.color ? m.color.getHexString() : "") + " → " + Array.from(ks).join(" / ")); });
        return fuera;
    },
    calidad: function () { return { nivel: E.nivel, fps: Math.round(RENDIMIENTO.fps), pr: E.renderer ? E.renderer.getPixelRatio() : 0, sombras: E.renderer ? E.renderer.shadowMap.enabled : false, llamadas: E.renderer ? E.renderer.info.render.calls : 0 }; },
    stats: function () { return { chispas: CH ? CH.vivas : 0, estrellas: ES ? ES.vivas : 0, reloj: E.reloj, energia: E.energia }; }
};
