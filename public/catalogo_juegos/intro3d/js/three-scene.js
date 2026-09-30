import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = window.INTRO_CONFIG || {};
const container = document.getElementById('three-container');

// Tema del AULA por ambiente (paleta + decoración). Lo define ambientes-tema.js
// a partir del slug detectado en la URL. Fallback seguro (Expresión Artística).
const TEMA = window.INTRO_TEMA || {
    slug: 'expresion-artistica',
    nombre: 'Expresión Artística',
    acento: '#c084fc',
    pared: 0xf3e9ff, paredBaja: 0xd8c2f0, piso: 0xcaa06a,
    cielo: ['#8a6bff', '#b79bff', '#e6dcff', '#f6f0ff'],
    tablero: 0x2f5d3a, acentoTablero: '#c084fc',
    luz: [0xfff2ff, 0x8a7ab0, 1.15],
    deco: ['reloj', 'estante', 'corcho', 'murales', 'caballete'],
};

/** Resuelve assets de intro3d relativos a esta carpeta (sirve en cualquier ambiente/juego). */
function resolverAsset(ruta) {
    if (!ruta) return ruta;
    if (/^(https?:)?\/\//i.test(ruta) || ruta.startsWith('data:') || ruta.startsWith('/')) {
        return ruta;
    }
    // Rutas antiguas relativas a la página (../intro3d/... o ../../intro3d/...)
    if (ruta.indexOf('intro3d/') >= 0) return ruta;
    return new URL('../' + String(ruta).replace(/^\.\//, ''), import.meta.url).href;
}

const scene = new THREE.Scene();
scene.fog = null; // aula interior: sin niebla

const camera = new THREE.PerspectiveCamera(
    54, window.innerWidth / window.innerHeight, 0.1, 100
);
camera.position.set(0, 2.5, 11.6);
camera.lookAt(0, 0.7, 0.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
container.appendChild(renderer.domElement);

// ========================================================================
//  AULA 3D DETALLADA — base común + decoración específica por ambiente.
//  Referencias: ilustraciones de cada ambiente (ventana, estanterías,
//  banderines, pizarra con dibujo, carteles temáticos, props de suelo).
// ========================================================================
const Y = -1.02;                 // nivel del piso
const usaProp = (n) => Array.isArray(TEMA.props) && TEMA.props.indexOf(n) >= 0;
const elementosAnimados = [];
const nubes = [];
let tiempoNubes = 0;

const AULA_W = 26, AULA_D = 24, AULA_H = 7.6, ZB = -9; // pared del fondo en z=ZB

scene.background = new THREE.Color(TEMA.pared);

// ---- Helpers de color / material ----
const numColor = (hex) => (typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16));
const mat = (color, rough = 0.9, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: numColor(color), roughness: rough }, extra || {}));
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cil = (rt, rb, h, m, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const esf = (r, m, s = 14) => new THREE.Mesh(new THREE.SphereGeometry(r, s, s), m);

// Textura de canvas a partir de una función de pintura.
function texturaCanvas(w, h, pintar) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    pintar(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
}

// ---- Materiales base del aula ----
const M_PARED = mat(TEMA.pared, 0.97);
const M_ZOCALO = mat(TEMA.zocalo, 0.95);
const M_PISO = mat(TEMA.piso, 0.8);
const M_MAD = mat(0xc98a4e, 0.8);          // madera mueble
const M_MAD_CLARA = mat(0xe0b06a, 0.75);
const M_BLANCO = mat(0xffffff, 0.85);
const M_METAL = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.5, metalness: 0.4 });

// ---- Iluminación (interior cálido y parejo) ----
scene.add(new THREE.HemisphereLight(0xfff6e8, 0xcfd8c8, 0.85));
const key = new THREE.DirectionalLight(0xfff2d8, 1.1);
key.position.set(4, 9, 7); key.castShadow = true;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 34;
key.shadow.camera.left = -14; key.shadow.camera.right = 14;
key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfeaff, 0.45);
fill.position.set(-6, 4, 5);
scene.add(fill);

// ====================== ESTRUCTURA DEL AULA ======================

// Piso de madera con listones (líneas del entablado en z).
const pisoTex = texturaCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#' + numColor(TEMA.piso).toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,70,25,0.28)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { const x = (w / 8) * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,70,25,0.12)';
    for (let i = 0; i <= 16; i++) { const y = (h / 16) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
});
pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping; pisoTex.repeat.set(3, 3);
const piso = new THREE.Mesh(new THREE.PlaneGeometry(AULA_W, AULA_D), new THREE.MeshStandardMaterial({ map: pisoTex, roughness: 0.82 }));
piso.rotation.x = -Math.PI / 2; piso.position.set(0, Y, ZB + AULA_D / 2); piso.receiveShadow = true;
scene.add(piso);

// Pared del fondo: parte alta beige + zócalo salvia + cenefa ondulada de color.
function paredConZocalo(w, x, z, ry) {
    const g = new THREE.Group();
    const alto = box(w, AULA_H, 0.2, M_PARED); alto.position.y = Y + AULA_H / 2; alto.receiveShadow = true; g.add(alto);
    const zoc = box(w, 2.0, 0.24, M_ZOCALO); zoc.position.set(0, Y + 1.0, 0.03); zoc.receiveShadow = true; g.add(zoc);
    // Cenefa ondulada de color en la parte superior (banner del ambiente).
    const cenefaTex = texturaCanvas(1024, 128, (ctx, cw, ch) => {
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#' + numColor(TEMA.acentoRGB).toString(16).padStart(6, '0');
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw, 0); ctx.lineTo(cw, ch * 0.62);
        const olas = 26, amp = ch * 0.32;
        for (let i = olas; i >= 0; i--) {
            const px = (cw / olas) * i;
            const py = ch * 0.62 + (i % 2 === 0 ? amp : 0);
            ctx.quadraticCurveTo(px + cw / olas / 2, ch * 0.62 + amp, px, py);
        }
        ctx.closePath(); ctx.fill();
    });
    const cenefa = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5),
        new THREE.MeshStandardMaterial({ map: cenefaTex, transparent: true, roughness: 0.9 }));
    cenefa.position.set(0, Y + AULA_H - 0.75, 0.13); g.add(cenefa);
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    return g;
}
paredConZocalo(AULA_W, 0, ZB, 0);
paredConZocalo(AULA_D, -AULA_W / 2, ZB + AULA_D / 2, Math.PI / 2);
paredConZocalo(AULA_D, AULA_W / 2, ZB + AULA_D / 2, -Math.PI / 2);

// Techo.
const techo = new THREE.Mesh(new THREE.PlaneGeometry(AULA_W, AULA_D), mat(0xfffdf8, 1));
techo.rotation.x = Math.PI / 2; techo.position.set(0, Y + AULA_H, ZB + AULA_D / 2); scene.add(techo);

// ====================== VENTANA IZQUIERDA (con paisaje) ======================
(function ventana() {
    const g = new THREE.Group();
    const vistaTex = texturaCanvas(256, 200, (ctx, w, h) => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#8fd1ff'); grad.addColorStop(1, '#d6f0ff');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        // césped
        ctx.fillStyle = '#8ec96a'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
        // sol
        ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(w * 0.2, h * 0.22, 16, 0, 6.3); ctx.fill();
        // nubes
        ctx.fillStyle = '#ffffff';
        [[0.55, 0.2, 20], [0.7, 0.28, 14], [0.42, 0.28, 12]].forEach(([px, py, r]) => { ctx.beginPath(); ctx.arc(w * px, h * py, r, 0, 6.3); ctx.fill(); });
        // árbol
        ctx.fillStyle = '#7a4a24'; ctx.fillRect(w * 0.14, h * 0.55, 8, h * 0.2);
        ctx.fillStyle = '#4f9e46'; ctx.beginPath(); ctx.arc(w * 0.16, h * 0.5, 24, 0, 6.3); ctx.fill();
        // escuelita
        ctx.fillStyle = '#e08a5a'; ctx.fillRect(w * 0.6, h * 0.55, 46, 30);
        ctx.fillStyle = '#b5563a'; ctx.beginPath(); ctx.moveTo(w * 0.6 - 4, h * 0.55); ctx.lineTo(w * 0.6 + 23, h * 0.55 - 18); ctx.lineTo(w * 0.6 + 50, h * 0.55); ctx.fill();
    });
    const vista = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), new THREE.MeshBasicMaterial({ map: vistaTex }));
    vista.rotation.y = Math.PI / 2; vista.position.set(0.02, 0, 0); g.add(vista);
    const marcoMat = mat(0xffffff, 0.7);
    const cV = box(0.14, 3.6, 0.18, marcoMat); cV.rotation.y = Math.PI / 2; cV.position.set(0.05, 0, 0); g.add(cV);
    const cH = box(0.14, 0.16, 5.0, marcoMat); cH.position.set(0.05, 0, 0); g.add(cH);
    const cont = box(0.2, 3.9, 5.4, mat(0xcdd6df, 0.8)); cont.position.set(-0.03, 0, 0); g.add(cont);
    // cortina superior
    const cort = box(0.06, 0.5, 5.2, mat(0x9fc4ff, 0.85)); cort.position.set(0.16, 1.85, 0); g.add(cort);
    g.position.set(-AULA_W / 2 + 0.14, Y + 4.0, ZB + 5.2); scene.add(g);
})();

// ====================== ESTANTERÍA IZQUIERDA (cubos 3x2) ======================
(function estanteriaIzq() {
    const g = new THREE.Group();
    const cuerpo = box(4.2, 2.9, 1.1, M_MAD); cuerpo.position.y = Y + 1.45; cuerpo.castShadow = cuerpo.receiveShadow = true; g.add(cuerpo);
    // separadores → 3 columnas x 2 filas
    for (let i = 1; i < 3; i++) { const s = box(0.08, 2.7, 1.0, M_MAD_CLARA); s.position.set(-2.1 + i * 1.4, Y + 1.45, 0.05); g.add(s); }
    const div = box(4.0, 0.08, 1.0, M_MAD_CLARA); div.position.set(0, Y + 1.45, 0.05); g.add(div);
    const casillaX = [-1.4, 0, 1.4];
    // fila superior: libros / lápices / bote
    // libros de colores
    [0xe0574f, 0x3aa0ff, 0x4caf6d, 0xffd166].forEach((c, i) => {
        const l = box(0.16, 0.7, 0.7, mat(c, 0.7)); l.position.set(casillaX[0] - 0.5 + i * 0.2, Y + 2.15, 0.1); g.add(l);
    });
    // bote con lápices
    const bote = cil(0.28, 0.24, 0.55, mat(0xffc24d, 0.6)); bote.position.set(casillaX[1], Y + 2.05, 0.1); g.add(bote);
    for (let i = 0; i < 6; i++) { const lap = cil(0.03, 0.03, 0.7, mat([0xff5252, 0x2f80ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6, 0xff8c42][i], 0.6)); lap.position.set(casillaX[1] - 0.14 + i * 0.055, Y + 2.35, 0.1); lap.rotation.z = (i - 2.5) * 0.05; g.add(lap); }
    const bote2 = cil(0.26, 0.22, 0.5, mat(0xf06fae, 0.6)); bote2.position.set(casillaX[2], Y + 2.05, 0.1); g.add(bote2);
    // fila inferior: cajones de colores
    [0xe0574f, 0x4caf6d, 0x8b5cf6].forEach((c, i) => {
        const cj = box(1.05, 0.75, 0.85, mat(c, 0.65)); cj.position.set(casillaX[i], Y + 0.75, 0.08); g.add(cj);
    });
    // encima: globo terráqueo + planta
    const eje = cil(0.03, 0.03, 0.9, M_METAL); eje.position.set(-1.4, Y + 3.35, 0); g.add(eje);
    const globo = esf(0.42, mat(0x3a8fd0, 0.6), 20); globo.position.set(-1.4, Y + 3.35, 0);
    globo.material = new THREE.MeshStandardMaterial({ map: texturaCanvas(128, 64, (ctx, w, h) => { ctx.fillStyle = '#3a8fd0'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#5fb35a'; [[20, 30, 18], [70, 20, 22], [95, 45, 14]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); }); }), roughness: 0.6 }); g.add(globo);
    g.add(plantaMaceta(1.4, Y + 2.95, 0, 0.9));
    g.position.set(-9.4, 0, ZB + 0.6); scene.add(g);
})();

// Planta en maceta reutilizable.
function plantaMaceta(x, y, z, s) {
    const g = new THREE.Group();
    const maceta = cil(0.28 * s, 0.2 * s, 0.4 * s, mat(0xd98a4a, 0.8)); maceta.position.y = 0.2 * s; g.add(maceta);
    for (let i = 0; i < 7; i++) {
        const hoja = box(0.06 * s, 0.6 * s, 0.16 * s, mat(i % 2 ? 0x4caf3f : 0x66c452, 0.7));
        hoja.position.set((Math.random() - 0.5) * 0.3 * s, 0.55 * s, (Math.random() - 0.5) * 0.2 * s);
        hoja.rotation.z = (Math.random() - 0.5) * 0.9; hoja.rotation.x = (Math.random() - 0.5) * 0.5; g.add(hoja);
    }
    g.position.set(x, y, z); return g;
}

// ====================== BANDERINES (arriba derecha) ======================
(function banderines() {
    const g = new THREE.Group();
    const cols = [0xff8c42, 0xf06fae, 0x4caf6d, 0xffd166, 0x8b5cf6, 0x3aa0ff, 0xff8c42, 0xf06fae];
    const x0 = 1.5, x1 = 10.5, y0 = Y + 6.3, y1 = Y + 5.9;
    // cuerda
    const cuerda = box((x1 - x0), 0.03, 0.03, mat(0x8a8f98, 0.6)); cuerda.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.15, ZB + 0.14); cuerda.rotation.z = -0.03; g.add(cuerda);
    cols.forEach((c, i) => {
        const t = i / (cols.length - 1);
        const bx = x0 + (x1 - x0) * t;
        const by = (y0 + (y1 - y0) * t) + 0.15 - 0.28;
        const tri = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), mat(c, 0.75));
        tri.position.set(bx, by, ZB + 0.14); tri.rotation.x = Math.PI; g.add(tri);
    });
    scene.add(g);
})();

// ====================== PIZARRA / CORCHO DERECHO (con dibujo) ======================
(function pizarra() {
    const g = new THREE.Group();
    const marco = box(5.4, 3.0, 0.2, M_MAD); marco.castShadow = true; g.add(marco);
    const dibujoTex = texturaCanvas(360, 200, (ctx, w, h) => {
        ctx.fillStyle = '#eef3d8'; ctx.fillRect(0, 0, w, h);
        // rejilla suave
        ctx.strokeStyle = 'rgba(120,150,90,0.25)'; ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 14) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 14) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
        // sol
        ctx.strokeStyle = '#e0a020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * 0.42, 40, 16, 0, 6.3); ctx.stroke();
        // nubes
        ctx.strokeStyle = '#6a8fd0'; [[70, 34], [150, 30], [270, 36]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.3); ctx.stroke(); });
        // casa
        ctx.strokeStyle = '#c05a3a'; ctx.strokeRect(150, 100, 60, 45);
        ctx.beginPath(); ctx.moveTo(146, 100); ctx.lineTo(180, 74); ctx.lineTo(214, 100); ctx.stroke();
        // árboles
        ctx.strokeStyle = '#4a8a3a'; [90, 250, 300].forEach((x) => { ctx.beginPath(); ctx.arc(x, 110, 14, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, 124); ctx.lineTo(x, 145); ctx.stroke(); });
        // suelo
        ctx.strokeStyle = '#5a8a3a'; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(w, 150); ctx.stroke();
    });
    const dibujo = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.6), new THREE.MeshStandardMaterial({ map: dibujoTex, roughness: 0.9 }));
    dibujo.position.z = 0.11; g.add(dibujo);
    g.position.set(7.6, Y + 4.4, ZB + 0.12); scene.add(g);
})();

// ====================== ESTANTERÍA DERECHA (pequeña) ======================
(function estanteriaDer() {
    const g = new THREE.Group();
    const cuerpo = box(2.2, 2.2, 0.9, M_MAD); cuerpo.position.y = Y + 1.1; cuerpo.castShadow = true; g.add(cuerpo);
    const div = box(2.0, 0.07, 0.8, M_MAD_CLARA); div.position.set(0, Y + 1.1, 0.05); g.add(div);
    [0xe0574f, 0x3aa0ff, 0x4caf6d].forEach((c, i) => { const l = box(0.14, 0.5, 0.5, mat(c, 0.7)); l.position.set(-0.5 + i * 0.2, Y + 1.6, 0.1); g.add(l); });
    // bloques
    [0xff8c42, 0x8b5cf6].forEach((c, i) => { const b = box(0.3, 0.3, 0.3, mat(c, 0.7)); b.position.set(-0.2 + i * 0.4, Y + 0.75, 0.1); g.add(b); });
    g.add(plantaMaceta(0, Y + 2.2, 0, 0.7));
    g.position.set(11.2, 0, ZB + 0.5); scene.add(g);
})();

// Florecita junto a la estantería derecha.
(function flor() {
    const g = new THREE.Group();
    const tallo = cil(0.03, 0.03, 0.5, mat(0x4caf3f)); tallo.position.y = 0.25; g.add(tallo);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; const p = esf(0.1, mat(0xf06fae, 0.6)); p.position.set(Math.cos(a) * 0.12, 0.52, Math.sin(a) * 0.12); g.add(p); }
    const centroFlor = esf(0.07, mat(0xffe14a)); centroFlor.position.set(0, 0.52, 0); g.add(centroFlor);
    g.position.set(12.6, Y + 2.2, ZB + 0.5); scene.add(g);
})();

// ====================== CARTELES TEMÁTICOS (pared central) ======================
(function carteles() {
    const lista = TEMA.carteles || [];
    const n = lista.length;
    const span = Math.min(9, n * 1.9);
    const x0 = -span / 2;
    lista.forEach((cartel, i) => {
        const x = n === 1 ? 0 : x0 + (span / (n - 1)) * i;
        const tex = texturaCanvas(200, 200, (ctx, w, h) => {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(6, 6, w - 12, h - 12);
            ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.font = '86px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(cartel.e || '⭐', w / 2, h * 0.42);
            ctx.fillStyle = cartel.c || '#333'; ctx.font = 'bold 30px "Comic Sans MS", Arial';
            ctx.fillText(cartel.t || '', w / 2, h * 0.82);
        });
        const lam = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
        lam.position.set(x, Y + 4.35, ZB + 0.12); lam.rotation.z = (Math.random() - 0.5) * 0.05; scene.add(lam);
        // chinchetas
        [[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6]].forEach(([dx, dy]) => {
            const ch = esf(0.05, mat([0xff5252, 0x2f80ff, 0x3dcf5a, 0xffd24a][Math.floor(Math.random() * 4)], 0.4));
            ch.position.set(x + dx, Y + 4.35 + dy, ZB + 0.16); scene.add(ch);
        });
    });
})();

// ====================== ALFOMBRA ======================
const alfombra = new THREE.Mesh(new THREE.CircleGeometry(3.5, 56), mat(TEMA.alfombra, 0.95));
alfombra.rotation.x = -Math.PI / 2; alfombra.position.set(0, Y + 0.02, 0.4); alfombra.receiveShadow = true;
scene.add(alfombra);
const alfBorde = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.5, 56), mat(numColor(TEMA.alfombra) & 0xd0d0d0, 0.95, { side: THREE.DoubleSide }));
alfBorde.rotation.x = -Math.PI / 2; alfBorde.position.set(0, Y + 0.03, 0.4); scene.add(alfBorde);

// Anillo indicador (gira en animate()).
const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.24, 64),
    new THREE.MeshBasicMaterial({ color: numColor(TEMA.acentoRGB), transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.set(0, Y + 0.05, 0.4); scene.add(ring);

// ========================================================================
//  PROPS DE SUELO POR AMBIENTE — variados, detallados, en laterales/fondo.
//  Centro (alfombra, |x|<2.2, z 0..2) libre para los personajes.
// ========================================================================

// Helper: grupo posicionado y rotado.
function grupoEn(x, z, yaw) { const g = new THREE.Group(); g.position.set(x, 0, z); if (yaw) g.rotation.y = yaw; scene.add(g); return g; }

// ------------------------------------------------------------------ ARTÍSTICA
if (usaProp('caballete')) {
    crearCaballete(-6.9, 3.2, 0.95, 0.45);        // rincón izquierdo
    crearTambor(-4.6, 4.7, 0.85);
    crearXilofono(-7.6, 4.7, 0.8);
    crearMaracas(-3.0, 5.2);
    crearGuitarra(-5.6, 5.4);                      // guitarra apoyada
    crearAtril(7.0, 3.2, 0.85, -0.45);            // atril con partitura
    crearPiano(7.6, 4.9, 0.8);
    crearBotesPintura(5.2, 5.0);
    crearPandereta(4.2, 5.6);                      // pandereta
    crearEstanteArte(6.0, 3.4);                    // repisa con rollos y vasos
    crearCaballitoNotas();                         // notas musicales flotando
    crearMuralesArte();                            // cuadros extra en la pared
}

// ------------------------------------------------------------------ MULTISABERES
if (usaProp('numerosAlfombra')) crearNumerosAlfombra();
if (usaProp('bloques')) {
    crearBloquesTorre(-6.9, 3.5);
    crearTorreAnillos(-4.4, 5.0);
    crearLibrosApilados(-7.8, 4.9);
    crearRompecabezasPiso(-3.0, 5.4);
    crearRelojAprender(-6.0, 3.3);                 // reloj de enseñar la hora
    crearAbaco(7.6, 3.3, 0.8);
    crearMesaRedonda(5.6, 3.0, 0xf06fae);         // mesa + silla derecha
    crearBloquesTorre(6.6, 4.6);
    crearRegletas(4.2, 5.6);                       // regletas de conteo
    crearLetrasMagneticas(6.4, 5.6);              // pizarra con letras
}

// ------------------------------------------------------------------ MULTISENSORIAL
if (usaProp('bandejasSensoriales')) crearBandejasSensoriales();   // fila frontal
if (usaProp('tuboBurbujas')) {
    crearTuboBurbujas(-7.4, 3.4);
    crearPanelTextura(-6.0, 4.9);                 // panel táctil
    crearEspejoSensorial(-4.2, 5.2);              // vista
    crearPelotaTexturas(-3.0, 5.6);               // pelota sensorial
    crearTuboBurbujas(7.4, 3.4, 0.9);
    crearCampanasViento(5.4, 3.0);                // sonido/oído
    crearFrascosAroma(6.6, 5.0);                  // olfato
    crearCortinaCintas(4.2, 5.6);                 // cortina de cintas de colores
}

// ------------------------------------------------------------------ POLIMOTOR
if (usaProp('setGateo')) {
    crearSetGateo(-6.8, 4.2);                     // rampa/escalera lateral izq.
    crearPelotasCesta(-7.8, 3.1);
    crearCuerdaSaltar(-5.2, 5.6);
    crearVigaEquilibrio(-3.4, 5.8);              // viga de equilibrio
    crearPelotaGrande(-4.4, 5.0);                 // pelota de equilibrio
}
if (usaProp('tunel')) crearTunel(7.0, 4.2);
if (usaProp('arosSuelo')) { crearArosSuelo(4.4, 5.2, true); crearEscaleraCoord(6.2, 5.6); }
if (usaProp('conos')) { crearConos(3.2, 5.4); crearColchoneta(5.6, 3.0); crearCanastaBaja(7.2, 5.0); }

// ------------------------------------------------------------------ TECNOLOGÍA
if (usaProp('robotPanda')) {
    crearEscritorioComputadora(-6.9, 3.4);        // escritorio con monitor+teclado+torre
    crearRobotPanda(-4.6, 5.0);
    crearCarritoRobot(-2.9, 5.4);
    crearCajaHerramientas(-7.7, 5.0);
    crearRobotHumanoide(7.2, 3.2);
    crearMesaTecno(5.6, 3.2);                      // mesa con tablet + laptop
    crearDron(3.0, 5.2, 0.85);
    crearPanelControl(7.6, 4.8);                   // panel con botones/luces
    crearCircuitosPiso(-4.6, 6.2);                 // cables/placas en el piso
    crearCubosCodigo(4.4, 5.6);                    // bloques de programación
    crearEngranajesPared();
}

// ========================================================================
//  CONSTRUCTORES — cada objeto detallado y bien armado.
// ========================================================================

// ---------- ARTÍSTICA ----------
function crearCaballete(x, z, s, yaw) {
    const g = grupoEn(x, z, yaw);
    // trípode: 3 patas que convergen arriba
    [[-0.4, 0.25, 0.16], [0.4, 0.25, -0.16], [0, -0.42, 0]].forEach(([px, pz, rz]) => {
        const p = cil(0.045 * s, 0.06 * s, 2.2 * s, M_MAD, 6);
        p.position.set(px * s, Y + 1.05 * s, pz * s);
        p.rotation.z = rz; p.rotation.x = pz > 0 ? 0.16 : -0.22; p.castShadow = true; g.add(p);
    });
    const bandeja = box(1.0 * s, 0.08 * s, 0.14 * s, M_MAD); bandeja.position.set(0, Y + 1.15 * s, 0.16 * s); g.add(bandeja);
    const tex = texturaCanvas(200, 240, (ctx, w, h) => {
        ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(w * 0.74, 42, 20, 0, 6.3); ctx.fill();
        ['#ff5252', '#ff8c42', '#ffd24a', '#3dcf5a', '#3aa0ff', '#8b5cf6'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(w / 2, h * 0.56, 54 - i * 9, Math.PI, 0); ctx.stroke(); });
        ctx.fillStyle = '#7ec8ff'; [[66, 140, 13], [90, 143, 15], [114, 140, 13]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill(); });
        ctx.fillStyle = '#6ab04c'; ctx.fillRect(0, h - 44, w, 44);
        ctx.fillStyle = '#f06fae'; for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; ctx.beginPath(); ctx.arc(w * 0.5 + Math.cos(a) * 13, h - 60 + Math.sin(a) * 13, 8, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(w * 0.5, h - 60, 7, 0, 6.3); ctx.fill();
    });
    const marcoLienzo = box(1.5 * s, 1.9 * s, 0.08 * s, mat(0xd9a566, 0.7)); marcoLienzo.position.set(0, Y + 2.0 * s, 0.2 * s); g.add(marcoLienzo);
    const lienzo = new THREE.Mesh(new THREE.PlaneGeometry(1.34 * s, 1.72 * s), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    lienzo.position.set(0, Y + 2.0 * s, 0.25 * s); lienzo.castShadow = true; g.add(lienzo);
}

function crearAtril(x, z, s, yaw) {
    const g = grupoEn(x, z, yaw);
    const poste = cil(0.05 * s, 0.06 * s, 1.6 * s, M_METAL); poste.position.y = Y + 0.8 * s; g.add(poste);
    [[-0.3, 0.2], [0.3, 0.2], [0, -0.3]].forEach(([px, pz]) => { const p = cil(0.03 * s, 0.03 * s, 0.5 * s, M_METAL); p.position.set(px * s, Y + 0.1, pz * s); p.rotation.x = pz > 0 ? 0.9 : -0.9; g.add(p); });
    const tabla = box(1.0 * s, 0.7 * s, 0.05 * s, mat(0xfffdf5, 0.8)); tabla.position.set(0, Y + 1.55 * s, 0.06 * s); tabla.rotation.x = -0.35; g.add(tabla);
    // pentagrama con notas
    const notas = texturaCanvas(160, 110, (ctx, w, h) => { ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const y = 25 + i * 14; ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(w - 10, y); ctx.stroke(); } ctx.fillStyle = '#222'; [[40, 40], [70, 55], [100, 45], [130, 60]].forEach(([nx, ny]) => { ctx.beginPath(); ctx.ellipse(nx, ny, 6, 4, -0.3, 0, 6.3); ctx.fill(); ctx.fillRect(nx + 5, ny - 26, 2, 26); }); });
    const part = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 0.62 * s), new THREE.MeshStandardMaterial({ map: notas, roughness: 0.9 })); part.position.set(0, Y + 1.55 * s, 0.09 * s); part.rotation.x = -0.35; g.add(part);
}

function crearTambor(x, z, s) {
    const g = grupoEn(x, z);
    const cuerpo = cil(0.5 * s, 0.44 * s, 0.66 * s, mat(0xc0392b, 0.6)); cuerpo.position.y = Y + 0.5 * s; cuerpo.castShadow = true; g.add(cuerpo);
    // zig-zag decorativo (aros claros arriba/abajo)
    [0.16, 0.84].forEach((f) => { const aro = new THREE.Mesh(new THREE.TorusGeometry(0.48 * s, 0.04 * s, 8, 24), mat(0xf5e6c8, 0.6)); aro.rotation.x = Math.PI / 2; aro.position.y = Y + f * s; g.add(aro); });
    const parche = cil(0.5 * s, 0.5 * s, 0.05 * s, mat(0xf5e6c8, 0.5)); parche.position.y = Y + 0.85 * s; g.add(parche);
    // baquetas cruzadas encima
    [[-0.3, 0.5], [0.3, -0.5]].forEach(([bx, rot]) => { const baq = cil(0.025, 0.025, 0.7, M_MAD_CLARA); baq.position.set(bx * s, Y + 0.95 * s, 0.1); baq.rotation.z = rot; g.add(baq); const bola = esf(0.06, M_MAD_CLARA); bola.position.set(bx * s + (rot > 0 ? -0.32 : 0.32), Y + 0.95 * s + 0.16, 0.1); g.add(bola); });
}

function crearXilofono(x, z, s) {
    const g = grupoEn(x, z);
    const base = box(1.3 * s, 0.12 * s, 0.55 * s, M_MAD); base.position.y = Y + 0.1; base.castShadow = true; g.add(base);
    [0xff5252, 0xff8c42, 0xffd24a, 0x3dcf5a, 0x3aa0ff, 0x6a5cff, 0x8b5cf6].forEach((c, i) => {
        const w = (0.95 - i * 0.05) * s; const t = box(0.13 * s, 0.05 * s, w, mat(c, 0.5)); t.position.set(-0.55 * s + i * 0.16 * s, Y + 0.2, 0); t.castShadow = true; g.add(t);
    });
    // baquetas
    [-0.1, 0.1].forEach((bx, i) => { const baq = cil(0.02, 0.02, 0.5, M_MAD_CLARA); baq.position.set(bx, Y + 0.3, 0.34); baq.rotation.z = i ? -0.5 : 0.5; g.add(baq); });
}

function crearMaracas(x, z) {
    const g = grupoEn(x, z);
    [[-0.15, -0.4], [0.15, 0.4]].forEach(([ox, rot]) => {
        const bola = esf(0.16, mat(0xffb020, 0.5)); bola.position.set(ox, Y + 0.5, 0); g.add(bola);
        const mango = cil(0.03, 0.04, 0.4, M_MAD_CLARA); mango.position.set(ox, Y + 0.22, 0); g.add(mango);
        const puntos = mat(0xe0574f, 0.5); for (let i = 0; i < 4; i++) { const p = esf(0.03, puntos); const a = i * 1.57; p.position.set(ox + Math.cos(a) * 0.12, Y + 0.5 + Math.sin(a) * 0.1, 0.14); g.add(p); }
        bola.parent.rotation.z = rot;
    });
    g.rotation.z = 0;
}

function crearPiano(x, z, s) {
    const g = grupoEn(x, z, -0.3);
    const cuerpo = box(1.4 * s, 0.5 * s, 0.5 * s, mat(0x8b5cf6, 0.5)); cuerpo.position.y = Y + 0.55 * s; cuerpo.castShadow = true; g.add(cuerpo);
    const patas = [[-0.6, -0.2], [0.6, -0.2], [-0.6, 0.2], [0.6, 0.2]]; patas.forEach(([px, pz]) => { const p = cil(0.04, 0.04, 0.3 * s, M_MAD); p.position.set(px * s, Y + 0.15, pz * s); g.add(p); });
    // teclas
    const teclado = box(1.3 * s, 0.06 * s, 0.24 * s, mat(0xffffff, 0.6)); teclado.position.set(0, Y + 0.82 * s, 0.16 * s); g.add(teclado);
    for (let i = 0; i < 8; i++) { const neg = box(0.05 * s, 0.06 * s, 0.14 * s, mat(0x222222, 0.4)); neg.position.set(-0.55 * s + i * 0.16 * s, Y + 0.86 * s, 0.12 * s); g.add(neg); }
}

function crearBotesPintura(x, z) {
    const g = grupoEn(x, z);
    const cols = [0x2f80ff, 0x8b5cf6, 0x3dcf5a, 0xe0574f, 0xffd24a];
    cols.forEach((c, i) => { const b = cil(0.14, 0.16, 0.34, mat(c, 0.45)); b.position.set((i - 2) * 0.34, Y + 0.17, 0); b.castShadow = true; g.add(b); const tapa = cil(0.15, 0.15, 0.05, mat(0xffffff, 0.6)); tapa.position.set((i - 2) * 0.34, Y + 0.36, 0); g.add(tapa); const chorro = esf(0.06, mat(c, 0.4)); chorro.scale.y = 0.4; chorro.position.set((i - 2) * 0.34, Y + 0.4, 0); g.add(chorro); });
    // vaso con pinceles
    const vaso = cil(0.15, 0.13, 0.4, mat(0xffc24d, 0.6)); vaso.position.set(-1.0, Y + 0.2, 0.2); g.add(vaso);
    for (let i = 0; i < 4; i++) { const p = cil(0.02, 0.02, 0.5, M_MAD_CLARA); p.position.set(-1.0 + (i - 1.5) * 0.05, Y + 0.42, 0.2); p.rotation.z = (i - 1.5) * 0.1; g.add(p); const punta = esf(0.03, mat([0xff5252, 0x2f80ff, 0x3dcf5a, 0x8b5cf6][i], 0.4)); punta.position.set(-1.0 + (i - 1.5) * 0.09, Y + 0.66, 0.2); g.add(punta); }
    crearPaleta.call(null); // sin uso; paleta va aparte
    const pal = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), mat(0xe8d3a8, 0.6)); pal.rotation.x = -Math.PI / 2; pal.position.set(1.0, Y + 0.05, 0.25); g.add(pal);
    [0xe0574f, 0x2f80ff, 0xffd24a, 0x3dcf5a, 0x8b5cf6].forEach((c, i) => { const a = (i / 5) * 6.28; const m = esf(0.06, mat(c, 0.5)); m.scale.y = 0.4; m.position.set(1.0 + Math.cos(a) * 0.18, Y + 0.08, 0.25 + Math.sin(a) * 0.18); g.add(m); });
}

function crearPaleta() { /* integrado en botesPintura */ }

function crearCaballitoNotas() {
    // notas musicales flotando en el aire (sobre laterales)
    ['♪', '♫', '♩', '♬'].forEach((n, i) => {
        const tex = texturaCanvas(64, 64, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = ['#e0574f', '#3aa0ff', '#8b5cf6', '#3dcf5a'][i]; ctx.font = 'bold 52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, 32, 36); });
        const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        const x = i < 2 ? -5.5 - i * 0.8 : 5.5 + (i - 2) * 0.8;
        sp.position.set(x, Y + 2.6 + (i % 2) * 0.4, 4.0); scene.add(sp);
        elementosAnimados.push({ mesh: sp, base: sp.position.y, fase: i * 1.6, amp: 0.3, vel: 1.0, mira: true });
    });
}

function crearMuralesArte() {
    // dos cuadros enmarcados extra en la pared del fondo
    [[-2.4, 0xff6b8a, 'flor'], [2.4, 0x3aa0ff, 'sol']].forEach(([x, c, tipo]) => {
        const marco = box(1.4, 1.1, 0.08, mat(0xd9a566, 0.7)); marco.position.set(x, Y + 5.7, ZB + 0.1); scene.add(marco);
        const tex = texturaCanvas(140, 110, (ctx, w, h) => { ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, w, h); if (tipo === 'flor') { ctx.fillStyle = c; for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * 22, h / 2 + Math.sin(a) * 22, 14, 0, 6.3); ctx.fill(); } ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 14, 0, 6.3); ctx.fill(); } else { ctx.fillStyle = c; ctx.fillRect(0, h * 0.6, w, h * 0.4); ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.3, 20, 0, 6.3); ctx.fill(); } });
        const arte = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); arte.position.set(x, Y + 5.7, ZB + 0.15); scene.add(arte);
    });
}

// ---------- MULTISABERES ----------
function crearNumerosAlfombra() {
    const nums = ['1', '2', '3', '5', '6', '7', '8'];
    const cols = [0xff5252, 0xffd24a, 0x3aa0ff, 0x8b5cf6, 0x3dcf5a, 0xf06fae, 0xff8c42];
    nums.forEach((num, i) => {
        const a = (i / nums.length) * 6.28, r = 2.2 + (i % 2) * 0.5;
        const tex = texturaCanvas(96, 96, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#' + cols[i].toString(16).padStart(6, '0'); ctx.font = 'bold 84px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(num, w / 2, h / 2 + 6); });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7 }));
        p.rotation.x = -Math.PI / 2; p.position.set(Math.cos(a) * r, Y + 0.06, 0.4 + Math.sin(a) * r * 0.55); scene.add(p);
    });
}
function crearBloquesTorre(x, z) {
    const g = grupoEn(x, z);
    const cols = [0xe0574f, 0x3aa0ff, 0x4caf6d, 0xffd166];
    for (let i = 0; i < 3; i++) { const b = box(0.42, 0.42, 0.42, mat(cols[i], 0.6)); b.position.set(0, Y + 0.21 + i * 0.42, 0); b.rotation.y = i * 0.18; b.castShadow = true; g.add(b);
        // letra en la cara
        const tex = texturaCanvas(64, 64, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.fillRect(4, 4, w - 8, h - 8); ctx.fillStyle = '#' + cols[i].toString(16).padStart(6, '0'); ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABC'[i], w / 2, h / 2 + 4); });
        const cara = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); cara.position.set(0, Y + 0.21 + i * 0.42, 0.22); cara.rotation.y = i * 0.18; g.add(cara); }
    const arco = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.1, 8, 16, Math.PI), mat(0xffd166, 0.6)); arco.position.set(0, Y + 1.28, 0); g.add(arco);
    [[-0.9, 0.2, 0x8b5cf6], [-0.6, 0.5, 0x3dcf5a]].forEach(([bx, bz, c]) => { const b = box(0.34, 0.34, 0.34, mat(c, 0.6)); b.position.set(bx, Y + 0.17, bz); b.castShadow = true; g.add(b); });
}
function crearTorreAnillos(x, z) {
    const g = grupoEn(x, z);
    const base = cil(0.36, 0.42, 0.14, mat(0xa9713d, 0.7)); base.position.y = Y + 0.07; g.add(base);
    const eje = cil(0.05, 0.05, 0.85, M_MAD_CLARA); eje.position.y = Y + 0.5; g.add(eje);
    [0x3aa0ff, 0x3dcf5a, 0xffd24a, 0xff8c42, 0xe0574f].forEach((c, i) => { const an = new THREE.Mesh(new THREE.TorusGeometry(0.3 - i * 0.045, 0.08, 8, 20), mat(c, 0.5)); an.rotation.x = Math.PI / 2; an.position.y = Y + 0.2 + i * 0.15; g.add(an); });
}
function crearAbaco(x, z, s) {
    const g = grupoEn(x, z, -0.3);
    const marco = box(1.1 * s, 0.9 * s, 0.12 * s, mat(0xa9713d, 0.7)); marco.position.y = Y + 0.6 * s; g.add(marco);
    const cols = [0xff5252, 0x3aa0ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6];
    for (let f = 0; f < 5; f++) { const barra = cil(0.02, 0.02, 0.9 * s, M_METAL); barra.rotation.z = Math.PI / 2; barra.position.set(0, Y + 0.28 * s + f * 0.15 * s, 0.02); g.add(barra); for (let b = 0; b < 5; b++) { const bola = esf(0.06 * s, mat(cols[f], 0.4)); bola.position.set(-0.38 * s + b * 0.19 * s, Y + 0.28 * s + f * 0.15 * s, 0.02); g.add(bola); } }
}
function crearLibrosApilados(x, z) {
    const g = grupoEn(x, z);
    const cols = [0xe0574f, 0x3aa0ff, 0x3dcf5a, 0xffd166, 0x8b5cf6];
    cols.forEach((c, i) => { const l = box(0.7, 0.14, 0.5, mat(c, 0.6)); l.position.set((Math.random() - 0.5) * 0.14, Y + 0.07 + i * 0.14, 0); l.rotation.y = (Math.random() - 0.5) * 0.3; l.castShadow = true; g.add(l); });
}
function crearRompecabezasPiso(x, z) {
    const g = grupoEn(x, z);
    const cols = [0xe0574f, 0x3aa0ff, 0x3dcf5a, 0xffd166];
    for (let i = 0; i < 4; i++) { const pz = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), mat(cols[i], 0.6)); pz.position.set((i % 2) * 0.36, Y + 0.03, Math.floor(i / 2) * 0.36); pz.rotation.y = (Math.random() - 0.5) * 0.2; scene.add(pz); pz.position.add(g.position); }
}

// ---------- MULTISENSORIAL ----------
function crearBandejasSensoriales() {
    const defs = [{ c: 0xe0574f, r: 'tierra' }, { c: 0xffb020, r: 'cesped' }, { c: 0x8bc34a, r: 'esponjas' }, { c: 0x2f80ff, r: 'piedras' }, { c: 0x8b5cf6, r: 'carton' }];
    const total = 5, sep = 1.55, x0 = -(total - 1) * sep / 2;
    defs.forEach((d, i) => {
        const x = x0 + i * sep, z = 3.9;
        const paredes = box(1.32, 0.3, 1.02, mat(d.c, 0.5)); paredes.position.set(x, Y + 0.15, z); paredes.castShadow = true; scene.add(paredes);
        const hueco = box(1.14, 0.2, 0.84, mat(0x2a2a2a, 1)); hueco.position.set(x, Y + 0.2, z); scene.add(hueco);
        if (d.r === 'tierra') { const t = box(1.1, 0.12, 0.82, mat(0x8a5a2b, 0.95)); t.position.set(x, Y + 0.28, z); scene.add(t); for (let k = 0; k < 10; k++) { const g = esf(0.03, mat(0x6a4520, 0.9)); g.position.set(x - 0.45 + Math.random() * 0.9, Y + 0.35, z - 0.35 + Math.random() * 0.7); scene.add(g); } }
        if (d.r === 'cesped') { const t = box(1.1, 0.14, 0.82, mat(0x5fae3a, 0.9)); t.position.set(x, Y + 0.29, z); scene.add(t); for (let k = 0; k < 30; k++) { const br = box(0.02, 0.14, 0.02, mat(0x6fc043, 0.8)); br.position.set(x - 0.5 + Math.random(), Y + 0.4, z - 0.38 + Math.random() * 0.76); scene.add(br); } }
        if (d.r === 'esponjas') { const cs = [0xe0574f, 0x3aa0ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6, 0xf06fae]; for (let k = 0; k < 9; k++) { const e = box(0.24, 0.18, 0.24, mat(cs[k % cs.length], 0.55)); e.position.set(x - 0.38 + (k % 3) * 0.36, Y + 0.32, z - 0.28 + Math.floor(k / 3) * 0.28); e.rotation.y = k; scene.add(e); } }
        if (d.r === 'piedras') { for (let k = 0; k < 12; k++) { const p = esf(0.08 + Math.random() * 0.06, mat([0x9aa3ab, 0x7a8288, 0xc0c8ce][k % 3], 0.9)); p.scale.y = 0.55; p.position.set(x - 0.44 + Math.random() * 0.88, Y + 0.3, z - 0.34 + Math.random() * 0.68); scene.add(p); } }
        if (d.r === 'carton') { const t = box(1.08, 0.08, 0.8, mat(0xcaa06a, 0.95)); t.position.set(x, Y + 0.28, z); scene.add(t); for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { const h = cil(0.09, 0.09, 0.12, mat(0xa9713d, 0.9), 8); h.position.set(x - 0.36 + b * 0.24, Y + 0.32, z - 0.24 + a * 0.24); scene.add(h); } }
    });
}
function crearTuboBurbujas(x, z, s) {
    s = s || 1; const g = grupoEn(x, z);
    const base = cil(0.34 * s, 0.38 * s, 0.22 * s, mat(0x333a44, 0.5)); base.position.y = Y + 0.11 * s; g.add(base);
    const tubo = cil(0.27 * s, 0.27 * s, 2.1 * s, new THREE.MeshStandardMaterial({ color: 0x2f80ff, transparent: true, opacity: 0.55, roughness: 0.2, emissive: 0x1a5fd0, emissiveIntensity: 0.35 })); tubo.position.y = Y + 1.25 * s; g.add(tubo);
    for (let i = 0; i < 7; i++) { const b = esf((0.05 + Math.random() * 0.04) * s, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, emissive: 0x88ccff, emissiveIntensity: 0.5 })); b.position.set((Math.random() - 0.5) * 0.2, Y + (0.5 + Math.random() * 1.5) * s, (Math.random() - 0.5) * 0.2); g.add(b); elementosAnimados.push({ mesh: b, base: b.position.y, fase: Math.random() * 6.28, amp: 0.7, vel: 0.6 + Math.random() * 0.4 }); }
    const tapa = cil(0.32 * s, 0.32 * s, 0.14 * s, mat(0x333a44, 0.5)); tapa.position.y = Y + 2.36 * s; g.add(tapa);
}
function crearPanelTextura(x, z) {
    const g = grupoEn(x, z, 0.3);
    const marco = box(1.4, 1.4, 0.1, mat(0xa9713d, 0.7)); marco.position.y = Y + 1.3; g.add(marco);
    const cs = [0xe0574f, 0x3aa0ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6, 0xf06fae, 0xff8c42, 0x2f80ff, 0x4caf6d];
    for (let i = 0; i < 9; i++) { const t = box(0.36, 0.36, 0.08, mat(cs[i], 0.6)); t.position.set(-0.44 + (i % 3) * 0.44, Y + 0.86 + Math.floor(i / 3) * 0.44, 0.08); g.add(t); }
    const pata = cil(0.05, 0.06, 0.6, M_MAD); pata.position.y = Y + 0.3; g.add(pata);
}
function crearCampanasViento(x, z) {
    const g = grupoEn(x, z);
    const soporte = box(0.7, 0.06, 0.06, M_MAD); soporte.position.y = Y + 2.0; g.add(soporte);
    const poste = cil(0.04, 0.05, 2.0, M_MAD); poste.position.y = Y + 1.0; g.add(poste);
    [0xffd24a, 0xe0574f, 0x3aa0ff, 0x3dcf5a].forEach((c, i) => { const tubo = cil(0.05, 0.05, 0.5 - i * 0.06, mat(c, 0.4, { metalness: 0.4 })); tubo.position.set(-0.28 + i * 0.19, Y + 1.7, 0); g.add(tubo); elementosAnimados.push({ mesh: tubo, fase: i, vel: 2, giroZ: 0.03 }); });
}
function crearFrascosAroma(x, z) {
    const g = grupoEn(x, z);
    const bandeja = box(0.9, 0.08, 0.5, M_MAD_CLARA); bandeja.position.y = Y + 0.04; g.add(bandeja);
    [0x8b5cf6, 0xffd24a, 0x3dcf5a, 0xe0574f].forEach((c, i) => { const fr = cil(0.08, 0.09, 0.28, new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.6, roughness: 0.2 })); fr.position.set(-0.3 + i * 0.2, Y + 0.22, 0); g.add(fr); const tapa = cil(0.06, 0.06, 0.06, M_METAL); tapa.position.set(-0.3 + i * 0.2, Y + 0.39, 0); g.add(tapa); });
}
function crearEspejoSensorial(x, z) {
    const g = grupoEn(x, z, 0.25);
    const marco = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 28), mat(0xffd24a, 0.5)); marco.position.y = Y + 1.4; g.add(marco);
    const espejo = new THREE.Mesh(new THREE.CircleGeometry(0.48, 28), new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: 0.1, metalness: 0.8 })); espejo.position.set(0, Y + 1.4, 0.02); g.add(espejo);
    const pata = cil(0.05, 0.06, 0.95, M_MAD); pata.position.y = Y + 0.47; g.add(pata);
}

// ---------- POLIMOTOR ----------
function crearSetGateo(x, z) {
    const g = grupoEn(x, z, 0.4);
    const rampa = box(1.5, 0.12, 1.3, mat(0xffd166, 0.6)); rampa.position.set(-1.3, Y + 0.55, 0); rampa.rotation.z = 0.5; rampa.castShadow = true; g.add(rampa);
    for (let i = 0; i < 3; i++) { const e = box(1.5, 0.55, 0.55, mat(0xff8c42, 0.6)); e.position.set(1.0, Y + 0.28 + i * 0.55, 0.55 - i * 0.55); e.castShadow = true; g.add(e); }
    const arco = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 18, 1, true, 0, Math.PI), mat(0x8b5cf6, 0.6, { side: THREE.DoubleSide })); arco.rotation.z = Math.PI / 2; arco.rotation.y = Math.PI / 2; arco.position.set(-0.1, Y + 0.75, 0); g.add(arco);
}
function crearTunel(x, z) {
    const g = grupoEn(x, z, -0.35);
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 2.6, 22, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f80ff, roughness: 0.55, side: THREE.DoubleSide })); tubo.rotation.z = Math.PI / 2; tubo.position.y = Y + 0.72; g.add(tubo);
    for (let i = 0; i < 6; i++) { const aro = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.05, 8, 24), mat(0x3dcf5a, 0.5)); aro.position.set(-1.05 + i * 0.42, Y + 0.72, 0); aro.rotation.y = Math.PI / 2; g.add(aro); }
}
function crearArosSuelo(x, z, alt) {
    const cols = alt ? [0xffd24a, 0x8b5cf6, 0x2f80ff] : [0x2f80ff, 0xffd24a, 0x8b5cf6];
    cols.forEach((c, i) => { const aro = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 10, 28), mat(c, 0.4)); aro.rotation.x = -Math.PI / 2; aro.position.set(x + (i - 1) * 0.5, Y + 0.06, z + (i % 2) * 0.4); scene.add(aro); });
}
function crearConos(x, z) {
    [[0, 0], [0.55, 0.35], [-0.5, 0.4]].forEach(([dx, dz], i) => { const cono = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 18), mat(i % 2 ? 0xff8c42 : 0x8b5cf6, 0.5)); cono.position.set(x + dx, Y + 0.25, z + dz); cono.castShadow = true; scene.add(cono); const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), mat(0xffffff, 0.5)); anillo.rotation.x = -Math.PI / 2; anillo.position.set(x + dx, Y + 0.02, z + dz); scene.add(anillo); });
}
function crearPelotasCesta(x, z) {
    const g = grupoEn(x, z);
    const cesta = cil(0.5, 0.4, 0.5, mat(0x8a5a2b, 0.8), 16); cesta.position.y = Y + 0.25; g.add(cesta);
    const cols = [0xe0574f, 0x3aa0ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6, 0xf06fae];
    for (let i = 0; i < 6; i++) { const p = esf(0.16, mat(cols[i], 0.5)); const a = (i / 6) * 6.28; p.position.set(Math.cos(a) * 0.18, Y + 0.55 + (i % 2) * 0.15, Math.sin(a) * 0.18); p.castShadow = true; g.add(p); }
}
function crearColchoneta(x, z) {
    const g = grupoEn(x, z, -0.2);
    const col = box(1.6, 0.18, 1.0, mat(0x3dcf5a, 0.6)); col.position.y = Y + 0.09; col.castShadow = true; g.add(col);
    for (let i = 0; i < 3; i++) { const linea = box(0.03, 0.19, 1.0, mat(0x2aa84a, 0.6)); linea.position.set(-0.4 + i * 0.4, Y + 0.09, 0); g.add(linea); }
}
function crearCuerdaSaltar(x, z) {
    const g = grupoEn(x, z);
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.6, Y + 0.02, 0), new THREE.Vector3(0, Y + 0.02, 0.3), new THREE.Vector3(0.6, Y + 0.02, 0)]);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 20, 0.03, 8), mat(0xf06fae, 0.5)); g.add(tubo);
    [[-0.6], [0.6]].forEach(([hx]) => { const mango = cil(0.04, 0.04, 0.2, mat(0xffd24a, 0.5)); mango.position.set(hx, Y + 0.02, 0); mango.rotation.x = Math.PI / 2; g.add(mango); });
}

// ---------- TECNOLOGÍA ----------
function crearRobotPanda(x, z) {
    const g = grupoEn(x, z);
    const cuerpo = esf(0.4, mat(0xffffff, 0.5)); cuerpo.scale.set(1, 1.15, 0.92); cuerpo.position.y = Y + 0.55; cuerpo.castShadow = true; g.add(cuerpo);
    const panza = esf(0.26, mat(0xeaf0f4, 0.5)); panza.scale.set(1, 1.1, 0.6); panza.position.set(0, Y + 0.5, 0.26); g.add(panza);
    const cabeza = esf(0.36, mat(0xffffff, 0.5)); cabeza.position.y = Y + 1.05; g.add(cabeza);
    [[-0.34], [0.34]].forEach(([ox]) => { const or = esf(0.13, mat(0x222222, 0.4)); or.position.set(ox, Y + 1.32, 0); g.add(or); });
    [[-0.14], [0.14]].forEach(([ox]) => { const par = esf(0.11, mat(0x222222, 0.4)); par.scale.set(1, 1.2, 0.5); par.position.set(ox, Y + 1.06, 0.3); g.add(par); const oj = esf(0.05, new THREE.MeshStandardMaterial({ color: 0x33e1ff, emissive: 0x33e1ff, emissiveIntensity: 0.7 })); oj.position.set(ox, Y + 1.08, 0.36); g.add(oj); });
    const nariz = esf(0.04, mat(0x222222, 0.4)); nariz.position.set(0, Y + 0.98, 0.36); g.add(nariz);
    elementosAnimados.push({ mesh: cabeza, base: cabeza.position.y, fase: 0, amp: 0.03, vel: 1.6 });
}
function crearRobotHumanoide(x, z) {
    const g = grupoEn(x, z, -0.4);
    const M = mat(0x6a7fd0, 0.4, { metalness: 0.3 });
    const cuerpo = box(0.5, 0.6, 0.36, M); cuerpo.position.y = Y + 0.85; cuerpo.castShadow = true; g.add(cuerpo);
    const panel = box(0.3, 0.3, 0.04, new THREE.MeshStandardMaterial({ color: 0x0e2a4a, emissive: 0x38e1ff, emissiveIntensity: 0.4 })); panel.position.set(0, Y + 0.88, 0.2); g.add(panel);
    const cabeza = box(0.42, 0.36, 0.36, M); cabeza.position.y = Y + 1.38; g.add(cabeza);
    const cara = box(0.34, 0.2, 0.05, new THREE.MeshStandardMaterial({ color: 0x0e2a4a, emissive: 0x38e1ff, emissiveIntensity: 0.5 })); cara.position.set(0, Y + 1.4, 0.19); g.add(cara);
    const ant = cil(0.02, 0.02, 0.25, M_METAL); ant.position.y = Y + 1.68; g.add(ant); const bola = esf(0.06, new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff5252, emissiveIntensity: 0.6 })); bola.position.y = Y + 1.82; g.add(bola);
    [[-0.36], [0.36]].forEach(([ox]) => { const br = box(0.12, 0.5, 0.12, M); br.position.set(ox, Y + 0.85, 0); g.add(br); const mano = esf(0.09, M); mano.position.set(ox, Y + 0.58, 0); g.add(mano); });
    [[-0.15], [0.15]].forEach(([ox]) => { const pa = box(0.16, 0.45, 0.16, M); pa.position.set(ox, Y + 0.27, 0); g.add(pa); });
    elementosAnimados.push({ mesh: bola, base: bola.position.y, fase: 1, amp: 0.02, vel: 3 });
}
function crearCarritoRobot(x, z) {
    const g = grupoEn(x, z, 0.3);
    const chasis = box(0.95, 0.3, 0.62, mat(0x455a7a, 0.4, { metalness: 0.3 })); chasis.position.y = Y + 0.36; chasis.castShadow = true; g.add(chasis);
    const placa = box(0.72, 0.1, 0.46, new THREE.MeshStandardMaterial({ color: 0x1a7a3a, roughness: 0.5 })); placa.position.y = Y + 0.56; g.add(placa);
    // chips
    for (let i = 0; i < 3; i++) { const chip = box(0.1, 0.05, 0.1, mat(0x222222, 0.4)); chip.position.set(-0.2 + i * 0.2, Y + 0.63, 0); g.add(chip); }
    [[-0.42, -0.36], [0.42, -0.36], [-0.42, 0.36], [0.42, 0.36]].forEach(([wx, wz]) => { const r = cil(0.18, 0.18, 0.13, mat(0x222222, 0.6), 16); r.rotation.z = Math.PI / 2; r.position.set(wx, Y + 0.18, wz); g.add(r); const tapa = cil(0.09, 0.09, 0.14, mat(0xffd24a, 0.4), 12); tapa.rotation.z = Math.PI / 2; tapa.position.set(wx, Y + 0.18, wz); g.add(tapa); });
    // antena
    const ant = cil(0.015, 0.015, 0.3, M_METAL); ant.position.set(0.3, Y + 0.75, -0.2); g.add(ant); const b = esf(0.04, new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff5252, emissiveIntensity: 0.5 })); b.position.set(0.3, Y + 0.9, -0.2); g.add(b);
}
function crearCajaHerramientas(x, z) {
    const g = grupoEn(x, z);
    const caja = box(0.8, 0.32, 0.52, mat(0x2f80ff, 0.4)); caja.position.y = Y + 0.16; caja.castShadow = true; g.add(caja);
    const tapa = box(0.82, 0.06, 0.54, mat(0x1f60cf, 0.4)); tapa.position.y = Y + 0.34; g.add(tapa);
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16, Math.PI), M_METAL); asa.position.set(0, Y + 0.36, 0); g.add(asa);
    // herramientas al lado
    const llave = box(0.44, 0.05, 0.09, M_METAL); llave.position.set(-0.7, Y + 0.03, 0.4); llave.rotation.y = 0.5; g.add(llave);
    const dest = cil(0.03, 0.03, 0.35, mat(0xff8c42, 0.5)); dest.position.set(0.7, Y + 0.03, 0.35); dest.rotation.z = Math.PI / 2; g.add(dest);
    [[0.3, 0.6], [-0.2, 0.7]].forEach(([gx, gz]) => { const eng = cil(0.13, 0.13, 0.05, mat(0xffb020, 0.4), 8); eng.position.set(gx, Y + 0.03, gz); eng.rotation.x = Math.PI / 2; g.add(eng); });
}
function crearDron(x, z, s) {
    s = s || 1; const g = grupoEn(x, z);
    const cuerpo = box(0.3 * s, 0.1 * s, 0.3 * s, mat(0x333a44, 0.4, { metalness: 0.4 })); cuerpo.position.y = Y + 1.4 * s; g.add(cuerpo);
    [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(([bx, bz]) => { const brazo = box(0.28 * s, 0.04 * s, 0.05 * s, M_METAL); brazo.position.set(bx * s / 2, Y + 1.4 * s, bz * s / 2); brazo.lookAt(new THREE.Vector3(0, Y + 1.4 * s, 0)); g.add(brazo); const helice = cil(0.14 * s, 0.14 * s, 0.02 * s, mat(0x2f80ff, 0.3, { transparent: true, opacity: 0.5 }), 12); helice.position.set(bx * s, Y + 1.46 * s, bz * s); g.add(helice); elementosAnimados.push({ mesh: helice, giroY: 0.8 }); });
    const luz = esf(0.04 * s, new THREE.MeshStandardMaterial({ color: 0x33e1ff, emissive: 0x33e1ff, emissiveIntensity: 0.7 })); luz.position.set(0, Y + 1.34 * s, 0.16 * s); g.add(luz);
    elementosAnimados.push({ mesh: g, base: Y + 0, fase: 0, amp: 0.15, vel: 1.2, esGrupo: true });
}
function crearTabletSoporte(x, z) {
    const g = grupoEn(x, z, -0.3);
    const base = cil(0.2, 0.24, 0.1, mat(0x333a44, 0.4)); base.position.y = Y + 0.05; g.add(base);
    const poste = cil(0.03, 0.03, 0.6, M_METAL); poste.position.y = Y + 0.35; g.add(poste);
    const tablet = box(0.7, 0.5, 0.04, mat(0x1a2440, 0.3)); tablet.position.set(0, Y + 0.75, 0.05); tablet.rotation.x = -0.3; g.add(tablet);
    const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x0e3a6a, emissive: 0x2f9be0, emissiveIntensity: 0.5 })); pantalla.position.set(0, Y + 0.76, 0.08); pantalla.rotation.x = -0.3; g.add(pantalla);
    elementosAnimados.push({ mesh: pantalla, tipo: 'panel', mat: pantalla.material, fase: 0, vel: 2 });
}
function crearEngranajesPared() {
    [[-2.6, 0xffb020, 1.0], [2.6, 0x8b5cf6, 0.8], [1.6, 0x3dcf5a, 0.6]].forEach(([x, c, s]) => {
        const dientes = 10; const g2 = new THREE.Group();
        const centro = cil(0.3 * s, 0.3 * s, 0.08, mat(c, 0.4), 8); centro.rotation.x = Math.PI / 2; g2.add(centro);
        for (let i = 0; i < dientes; i++) { const a = (i / dientes) * 6.28; const d = box(0.1 * s, 0.08, 0.12 * s, mat(c, 0.4)); d.position.set(Math.cos(a) * 0.34 * s, Math.sin(a) * 0.34 * s, 0); d.rotation.z = a; g2.add(d); }
        g2.position.set(x, Y + 5.6, ZB + 0.2); scene.add(g2);
        elementosAnimados.push({ mesh: g2, giroZ: 0.3 * (x < 0 ? 1 : -1) });
    });
}

// Escritorio con computadora: monitor + teclado + torre (Tecnología).
function crearEscritorioComputadora(x, z) {
    const g = grupoEn(x, z, 0.25);
    const M_MESA = mat(0xc98a4e, 0.7);
    // tablero + patas
    const tablero = box(2.0, 0.1, 1.0, M_MESA); tablero.position.y = Y + 0.9; tablero.castShadow = true; g.add(tablero);
    [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].forEach(([px, pz]) => { const p = cil(0.06, 0.06, 0.9, M_MESA); p.position.set(px, Y + 0.45, pz); g.add(p); });
    // monitor
    const soporte = box(0.12, 0.3, 0.12, mat(0x333a44, 0.5)); soporte.position.set(0, Y + 1.1, -0.2); g.add(soporte);
    const baseMon = box(0.4, 0.04, 0.25, mat(0x333a44, 0.5)); baseMon.position.set(0, Y + 0.96, -0.2); g.add(baseMon);
    const marco = box(1.1, 0.72, 0.08, mat(0x1a2230, 0.5)); marco.position.set(0, Y + 1.5, -0.22); marco.castShadow = true; g.add(marco);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.6), new THREE.MeshStandardMaterial({ color: 0x0e3a6a, emissive: 0x2f9be0, emissiveIntensity: 0.5, roughness: 0.3 }));
    pant.position.set(0, Y + 1.5, -0.17); g.add(pant);
    // iconos en la pantalla
    [[-0.3, 0.12, 0xffd24a], [0, 0.12, 0x3dcf5a], [0.3, 0.12, 0xff5252]].forEach(([ix, iy, c]) => { const ic = box(0.12, 0.12, 0.01, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4 })); ic.position.set(ix, Y + 1.5 + iy, -0.16); g.add(ic); });
    elementosAnimados.push({ mesh: pant, tipo: 'panel', mat: pant.material, fase: 0, vel: 1.6 });
    // teclado + mouse
    const teclado = box(0.7, 0.04, 0.28, mat(0xe8ecf0, 0.5)); teclado.position.set(0, Y + 0.96, 0.25); g.add(teclado);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { const tecla = box(0.06, 0.02, 0.05, mat(0xc8ced6, 0.5)); tecla.position.set(-0.3 + c * 0.085, Y + 0.99, 0.16 + r * 0.07); g.add(tecla); }
    const mouse = esf(0.06, mat(0xe8ecf0, 0.5)); mouse.scale.set(1, 0.6, 1.4); mouse.position.set(0.55, Y + 0.97, 0.28); g.add(mouse);
    // torre CPU en el piso
    const torre = box(0.32, 0.8, 0.6, mat(0x2a3340, 0.5)); torre.position.set(-1.1, Y + 0.4, 0.2); torre.castShadow = true; g.add(torre);
    [[0.12, 0x33e1ff], [-0.02, 0x3dcf5a]].forEach(([oy, c]) => { const led = esf(0.03, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 })); led.position.set(-0.94, Y + 0.7 + oy, 0.2); g.add(led); });
}

// Mesa con tablet apoyada + laptop (Tecnología).
function crearMesaTecno(x, z) {
    const g = grupoEn(x, z, -0.2);
    const tablero = cil(0.95, 0.95, 0.1, mat(0xf06fae, 0.5), 24); tablero.position.y = Y + 1.0; tablero.castShadow = true; g.add(tablero);
    [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([px, pz]) => { const p = cil(0.06, 0.07, 1.0, M_MAD_CLARA); p.position.set(px, Y + 0.5, pz); g.add(p); });
    // silla
    const silla = new THREE.Group();
    const asiento = box(0.5, 0.08, 0.5, mat(0x3aa0ff, 0.5)); asiento.position.y = Y + 0.55; silla.add(asiento);
    const resp = box(0.5, 0.6, 0.08, mat(0x3aa0ff, 0.5)); resp.position.set(0, Y + 0.85, -0.24); silla.add(resp);
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([px, pz]) => { const p = cil(0.04, 0.04, 0.55, M_MAD_CLARA); p.position.set(px, Y + 0.28, pz); silla.add(p); });
    silla.position.set(0, 0, 1.35); g.add(silla);
    // TABLET apoyada (plana, con app de colores)
    const tabletBody = box(0.5, 0.03, 0.68, mat(0x1a2230, 0.4)); tabletBody.position.set(-0.3, Y + 1.06, 0); tabletBody.rotation.y = 0.3; g.add(tabletBody);
    const tabletTex = texturaCanvas(80, 110, (ctx, w, h) => { ctx.fillStyle = '#0e3a6a'; ctx.fillRect(0, 0, w, h); const cs = ['#ffd24a', '#3dcf5a', '#ff5252', '#8b5cf6', '#2f9be0', '#ff8c42']; cs.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(10 + (i % 2) * 34, 12 + Math.floor(i / 2) * 32, 26, 24); }); });
    const tabletScr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.6), new THREE.MeshStandardMaterial({ map: tabletTex, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.3 }));
    tabletScr.rotation.x = -Math.PI / 2; tabletScr.position.set(-0.3, Y + 1.08, 0); tabletScr.rotation.z = 0.3; g.add(tabletScr);
    // LAPTOP abierta
    const lapBase = box(0.55, 0.03, 0.4, mat(0x455a7a, 0.4, { metalness: 0.3 })); lapBase.position.set(0.35, Y + 1.06, 0.05); lapBase.rotation.y = -0.3; g.add(lapBase);
    const lapTapa = box(0.55, 0.36, 0.03, mat(0x2a3340, 0.4)); lapTapa.position.set(0.45, Y + 1.24, -0.1); lapTapa.rotation.y = -0.3; lapTapa.rotation.x = -0.25; g.add(lapTapa);
    const lapScr = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.3), new THREE.MeshStandardMaterial({ color: 0x0e3a6a, emissive: 0x2f9be0, emissiveIntensity: 0.5, roughness: 0.3 }));
    lapScr.position.set(0.45, Y + 1.24, -0.08); lapScr.rotation.y = -0.3; lapScr.rotation.x = -0.25; g.add(lapScr);
}

// Panel de control con botones y luces (Tecnología).
function crearPanelControl(x, z) {
    const g = grupoEn(x, z, -0.3);
    const poste = cil(0.05, 0.06, 0.9, M_METAL); poste.position.y = Y + 0.45; g.add(poste);
    const tabla = box(0.9, 0.6, 0.1, mat(0x2a3340, 0.5)); tabla.position.set(0, Y + 1.1, 0); tabla.rotation.x = -0.25; g.add(tabla);
    const cs = [0xff5252, 0x3dcf5a, 0xffd24a, 0x2f9be0, 0x8b5cf6, 0xff8c42];
    for (let i = 0; i < 6; i++) { const btn = cil(0.06, 0.06, 0.04, new THREE.MeshStandardMaterial({ color: cs[i], emissive: cs[i], emissiveIntensity: 0.5 }), 12); btn.rotation.x = Math.PI / 2 - 0.25; btn.position.set(-0.28 + (i % 3) * 0.28, Y + 1.16 - Math.floor(i / 3) * 0.2, 0.06); g.add(btn); elementosAnimados.push({ mesh: btn, tipo: 'panel', mat: btn.material, fase: i, vel: 2 + i * 0.3 }); }
    // palanca
    const palanca = cil(0.02, 0.02, 0.2, M_METAL); palanca.position.set(0.35, Y + 1.2, 0.1); palanca.rotation.z = 0.4; g.add(palanca);
    const bolaP = esf(0.05, mat(0xff5252, 0.4)); bolaP.position.set(0.42, Y + 1.32, 0.1); g.add(bolaP);
}

// Cables y placas de circuito en el piso (Tecnología).
function crearCircuitosPiso(x, z) {
    const g = grupoEn(x, z);
    // placa verde
    const placa = box(0.7, 0.04, 0.5, new THREE.MeshStandardMaterial({ color: 0x1a7a3a, roughness: 0.5 })); placa.position.y = Y + 0.03; g.add(placa);
    for (let i = 0; i < 6; i++) { const chip = box(0.08, 0.04, 0.08, mat(0x222222, 0.4)); chip.position.set(-0.25 + (i % 3) * 0.25, Y + 0.06, -0.12 + Math.floor(i / 3) * 0.24); g.add(chip); }
    // cables de colores serpenteando
    [0xff5252, 0x3dcf5a, 0x2f9be0].forEach((c, i) => {
        const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.5 + i * 0.1, Y + 0.03, 0.4), new THREE.Vector3(0.1, Y + 0.03, 0.6 + i * 0.1), new THREE.Vector3(0.6, Y + 0.03, 0.35)]);
        const cable = new THREE.Mesh(new THREE.TubeGeometry(curva, 20, 0.02, 6), mat(c, 0.4)); g.add(cable);
    });
}

// Cubos de programación (bloques de código de colores) (Tecnología).
function crearCubosCodigo(x, z) {
    const g = grupoEn(x, z);
    const defs = [{ c: 0xff8c42, s: '▶' }, { c: 0x3dcf5a, s: '↻' }, { c: 0x2f9be0, s: '↑' }, { c: 0x8b5cf6, s: '★' }];
    defs.forEach((d, i) => {
        const cubo = box(0.34, 0.34, 0.34, mat(d.c, 0.5)); cubo.position.set((i % 2) * 0.4, Y + 0.17 + Math.floor(i / 2) * 0.36, Math.floor(i / 2) * 0.1); cubo.rotation.y = (Math.random() - 0.5) * 0.3; cubo.castShadow = true; g.add(cubo);
        const tex = texturaCanvas(64, 64, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.s, w / 2, h / 2 + 4); });
        const cara = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
        cara.position.copy(cubo.position); cara.position.z += 0.18; cara.rotation.y = cubo.rotation.y; g.add(cara);
    });
}

// Mesa redonda con silla (Multisaberes / Tecnología).
function crearMesaRedonda(x, z, color) {
    const g = grupoEn(x, z);
    const tablero = cil(0.9, 0.9, 0.1, mat(color || 0xf06fae, 0.5), 24); tablero.position.y = Y + 1.0; tablero.castShadow = true; g.add(tablero);
    [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([px, pz]) => { const p = cil(0.06, 0.07, 1.0, M_MAD_CLARA); p.position.set(px, Y + 0.5, pz); g.add(p); });
    // silla azul
    const silla = new THREE.Group();
    const asiento = box(0.5, 0.08, 0.5, mat(0x3aa0ff, 0.5)); asiento.position.y = Y + 0.55; silla.add(asiento);
    const resp = box(0.5, 0.6, 0.08, mat(0x3aa0ff, 0.5)); resp.position.set(0, Y + 0.85, -0.24); silla.add(resp);
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([px, pz]) => { const p = cil(0.04, 0.04, 0.55, M_MAD_CLARA); p.position.set(px, Y + 0.28, pz); silla.add(p); });
    silla.position.set(-1.4, 0, 0.7); g.add(silla);
}

// ============ PROPS EXTRA — ARTÍSTICA ============
function crearGuitarra(x, z) {
    const g = grupoEn(x, z, 0.3);
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(0xd9772e, 0.5)); cuerpo.scale.set(1, 1.3, 0.35); cuerpo.position.y = Y + 0.55; cuerpo.castShadow = true; g.add(cuerpo);
    const boca = cil(0.1, 0.1, 0.02, mat(0x2a1a0e, 0.5), 16); boca.rotation.x = Math.PI / 2; boca.position.set(0, Y + 0.6, 0.13); g.add(boca);
    const mastil = box(0.1, 1.0, 0.08, mat(0x8a5a2b, 0.6)); mastil.position.set(0, Y + 1.35, 0); g.add(mastil);
    const clavijero = box(0.16, 0.24, 0.06, mat(0x5a3a1a, 0.6)); clavijero.position.set(0, Y + 1.95, 0); g.add(clavijero);
    for (let i = 0; i < 4; i++) { const cuerda = box(0.008, 1.3, 0.008, mat(0xe8e8e8, 0.3, { metalness: 0.6 })); cuerda.position.set(-0.045 + i * 0.03, Y + 1.1, 0.05); g.add(cuerda); }
}
function crearPandereta(x, z) {
    const g = grupoEn(x, z);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 10, 24), mat(0xffb020, 0.5)); aro.rotation.x = -Math.PI / 2 + 0.3; aro.position.y = Y + 0.35; g.add(aro);
    const membrana = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), mat(0xf5e6c8, 0.6)); membrana.position.y = Y + 0.35; membrana.rotation.x = -Math.PI / 2 + 0.3; g.add(membrana);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; const sonaja = cil(0.05, 0.05, 0.02, mat(0xd0d0d0, 0.3, { metalness: 0.6 }), 10); sonaja.position.set(Math.cos(a) * 0.28, Y + 0.35 + Math.sin(a) * 0.28 * 0.3, Math.sin(a) * 0.28 * 0.95); sonaja.rotation.x = -Math.PI / 2 + 0.3; g.add(sonaja); }
}
function crearEstanteArte(x, z) {
    const g = grupoEn(x, z, -0.3);
    const cuerpo = box(1.3, 1.3, 0.5, M_MAD); cuerpo.position.y = Y + 0.65; cuerpo.castShadow = true; g.add(cuerpo);
    const div = box(1.2, 0.06, 0.42, M_MAD_CLARA); div.position.set(0, Y + 0.65, 0.04); g.add(div);
    // rollos de papel de colores parados
    [0xff5252, 0x3aa0ff, 0x3dcf5a, 0xffd24a].forEach((c, i) => { const rollo = cil(0.08, 0.08, 0.5, mat(c, 0.5), 12); rollo.position.set(-0.4 + i * 0.22, Y + 1.05, 0.1); g.add(rollo); });
    // vasos con crayones
    [-0.35, 0.1].forEach((vx, k) => { const vaso = cil(0.13, 0.11, 0.24, mat([0xf06fae, 0xffc24d][k], 0.5)); vaso.position.set(vx, Y + 0.42, 0.12); g.add(vaso); for (let i = 0; i < 5; i++) { const cr = cil(0.02, 0.02, 0.3, mat([0xff5252, 0x3aa0ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6][i], 0.5)); cr.position.set(vx - 0.06 + i * 0.03, Y + 0.62, 0.12); cr.rotation.z = (i - 2) * 0.06; g.add(cr); } });
}

// ============ PROPS EXTRA — MULTISABERES ============
function crearRelojAprender(x, z) {
    const g = grupoEn(x, z, 0.3);
    const poste = cil(0.05, 0.06, 1.0, M_MAD); poste.position.y = Y + 0.5; g.add(poste);
    const cara = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), mat(0xffffff, 0.5)); cara.position.set(0, Y + 1.2, 0.04); g.add(cara);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 10, 32), mat(0xff5252, 0.5)); aro.position.set(0, Y + 1.2, 0.04); g.add(aro);
    // números 12/3/6/9 como marcas de colores
    [[0, 0.32, 0xff5252], [0.32, 0, 0x3aa0ff], [0, -0.32, 0x3dcf5a], [-0.32, 0, 0xffd24a]].forEach(([dx, dy, c]) => { const m = box(0.07, 0.07, 0.02, mat(c, 0.5)); m.position.set(dx, Y + 1.2 + dy, 0.06); g.add(m); });
    const h1 = box(0.04, 0.26, 0.02, mat(0x3aa0ff, 0.4)); h1.position.set(0, Y + 1.28, 0.07); g.add(h1);
    const h2 = box(0.04, 0.18, 0.02, mat(0xff5252, 0.4)); h2.position.set(0.06, Y + 1.24, 0.07); h2.rotation.z = -1.0; g.add(h2);
}
function crearRegletas(x, z) {
    const g = grupoEn(x, z);
    const cols = [0xff5252, 0x3dcf5a, 0xffd24a, 0x3aa0ff, 0x8b5cf6];
    cols.forEach((c, i) => { const largo = 0.2 + i * 0.14; const reg = box(largo, 0.1, 0.14, mat(c, 0.5)); reg.position.set(-0.3 + i * 0.02, Y + 0.05, -0.3 + i * 0.16); reg.castShadow = true; g.add(reg); });
}
function crearLetrasMagneticas(x, z) {
    const g = grupoEn(x, z, -0.3);
    const poste = cil(0.05, 0.06, 0.8, M_MAD); poste.position.y = Y + 0.4; g.add(poste);
    const tablero = box(1.0, 0.8, 0.06, mat(0xffffff, 0.5)); tablero.position.set(0, Y + 1.1, 0); g.add(tablero);
    const marco = box(1.06, 0.86, 0.04, mat(0xffd24a, 0.5)); marco.position.set(0, Y + 1.1, -0.02); g.add(marco);
    const letras = ['A', 'B', 'C', '1', '2', '3']; const cols = [0xff5252, 0x3aa0ff, 0x3dcf5a, 0xffd24a, 0x8b5cf6, 0xff8c42];
    letras.forEach((ch, i) => { const tex = texturaCanvas(48, 48, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#' + cols[i].toString(16).padStart(6, '0'); ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, w / 2, h / 2 + 3); }); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 })); l.position.set(-0.32 + (i % 3) * 0.32, Y + 1.24 - Math.floor(i / 3) * 0.3, 0.04); g.add(l); });
}

// ============ PROPS EXTRA — MULTISENSORIAL ============
function crearPelotaTexturas(x, z) {
    const g = grupoEn(x, z);
    const bola = esf(0.28, mat(0xf06fae, 0.6)); bola.position.y = Y + 0.28; bola.castShadow = true; g.add(bola);
    // pinchos suaves de colores
    const cs = [0xffd24a, 0x3dcf5a, 0x2f9be0, 0x8b5cf6, 0xff5252];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28; const b = (i % 4) / 4 * 3.14; const p = cil(0.02, 0.04, 0.12, mat(cs[i % cs.length], 0.5), 6); const px = Math.cos(a) * Math.sin(b) * 0.32, py = Math.cos(b) * 0.32, pz = Math.sin(a) * Math.sin(b) * 0.32; p.position.set(px, Y + 0.28 + py, pz); p.lookAt(new THREE.Vector3(px * 2, Y + 0.28 + py * 2, pz * 2)); g.add(p); }
}
function crearCortinaCintas(x, z) {
    const g = grupoEn(x, z, -0.2);
    const barra = box(1.2, 0.06, 0.06, M_MAD); barra.position.y = Y + 2.2; g.add(barra);
    const poste1 = cil(0.04, 0.05, 2.2, M_MAD); poste1.position.set(-0.6, Y + 1.1, 0); g.add(poste1);
    const poste2 = cil(0.04, 0.05, 2.2, M_MAD); poste2.position.set(0.6, Y + 1.1, 0); g.add(poste2);
    const cs = [0xff5252, 0xff8c42, 0xffd24a, 0x3dcf5a, 0x2f9be0, 0x8b5cf6, 0xf06fae];
    for (let i = 0; i < 12; i++) { const cinta = box(0.06, 1.4, 0.02, mat(cs[i % cs.length], 0.5, { transparent: true, opacity: 0.85 })); cinta.position.set(-0.55 + i * 0.1, Y + 1.45, 0); g.add(cinta); elementosAnimados.push({ mesh: cinta, fase: i * 0.5, vel: 1.5, giroZ: 0 }); }
}

// ============ PROPS EXTRA — POLIMOTOR ============
function crearVigaEquilibrio(x, z) {
    const g = grupoEn(x, z, 0.3);
    const viga = box(2.2, 0.14, 0.3, mat(0x3dcf5a, 0.6)); viga.position.y = Y + 0.35; viga.castShadow = true; g.add(viga);
    [[-0.9], [0.9]].forEach(([sx]) => { const sop = box(0.3, 0.28, 0.4, mat(0xffd24a, 0.6)); sop.position.set(sx, Y + 0.14, 0); g.add(sop); });
    // pisadas dibujadas en la viga
    for (let i = 0; i < 5; i++) { const pie = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), mat(0xffffff, 0.5)); pie.rotation.x = -Math.PI / 2; pie.position.set(-0.8 + i * 0.4, Y + 0.43, 0); g.add(pie); }
}
function crearPelotaGrande(x, z) {
    const g = grupoEn(x, z);
    const bola = esf(0.45, mat(0x2f9be0, 0.5)); bola.position.y = Y + 0.45; bola.castShadow = true; g.add(bola);
    // franjas
    [0, 1, 2].forEach((i) => { const franja = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 8, 30), mat(0xffffff, 0.5)); franja.rotation.x = Math.PI / 2; franja.rotation.z = i * 0.6; franja.position.y = Y + 0.45; g.add(franja); });
}
function crearEscaleraCoord(x, z) {
    const g = grupoEn(x, z, -0.2);
    // escalera de agilidad plana en el piso
    const cols = [0xff5252, 0xffd24a];
    for (let i = 0; i < 6; i++) { const trav = box(0.7, 0.02, 0.06, mat(cols[i % 2], 0.5)); trav.position.set(0, Y + 0.02, -0.6 + i * 0.24); g.add(trav); }
    [[-0.34], [0.34]].forEach(([sx]) => { const lado = box(0.04, 0.02, 1.5, mat(0x555555, 0.5)); lado.position.set(sx, Y + 0.02, 0); g.add(lado); });
}
function crearCanastaBaja(x, z) {
    const g = grupoEn(x, z, -0.3);
    const poste = cil(0.06, 0.07, 1.8, M_METAL); poste.position.y = Y + 0.9; g.add(poste);
    const tablero = box(0.7, 0.5, 0.05, mat(0xffffff, 0.5)); tablero.position.set(0, Y + 1.7, 0); g.add(tablero);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), mat(0xff5252, 0.5)); aro.rotation.x = Math.PI / 2; aro.position.set(0, Y + 1.5, 0.24); g.add(aro);
    // red (conos)
    const red = cil(0.22, 0.14, 0.24, mat(0xffffff, 0.6, { transparent: true, opacity: 0.4, side: THREE.DoubleSide }), 12); red.position.set(0, Y + 1.38, 0.24); g.add(red);
}

const loader = new GLTFLoader();
const clock = new THREE.Clock();
const actores = [];
let listoEnviado = false;
let salidaEnviada = false;
let introArrancada = false;

function deltaAngulo(desde, hacia) {
    let diferencia = hacia - desde;
    while (diferencia > Math.PI) diferencia -= Math.PI * 2;
    while (diferencia < -Math.PI) diferencia += Math.PI * 2;
    return diferencia;
}

function tomarClip(actions, nombres) {
    const claves = Object.keys(actions);

    for (const nombre of nombres || []) {
        const exacta = claves.find(
            (clave) => clave.toLowerCase() === nombre.toLowerCase()
        );
        if (exacta) return actions[exacta];
    }

    for (const nombre of nombres || []) {
        const parcial = claves.find((clave) =>
            clave.toLowerCase().includes(nombre.toLowerCase())
        );
        if (parcial) return actions[parcial];
    }

    return null;
}

function cruzar(actor, siguiente, duracion) {
    if (!siguiente || actor.activo === siguiente) return;
    if (actor.activo) actor.activo.fadeOut(duracion);
    siguiente.reset().fadeIn(duracion).play();
    actor.activo = siguiente;
}

function reproducirGesto(actor) {
    if (!actor.gestos.length || !actor.mixer) return;

    const clip = actor.gestos[actor.gestoIndice % actor.gestos.length];
    actor.gestoIndice += 1;
    clip.setLoop(THREE.LoopOnce, 1);
    clip.clampWhenFinished = true;

    if (actor.activo && actor.activo !== clip) {
        actor.activo.fadeOut(0.2);
    }

    clip.reset().fadeIn(0.2).play();
    actor.activo = clip;
    actor.gestoActual = clip;
}

function marcarListo(actor) {
    actor.estado = 'listo';
    if (listoEnviado) return;
    if (!actores.every((item) => item.estado === 'listo' || item.fallo)) return;
    listoEnviado = true;
    window.dispatchEvent(new CustomEvent('characters-ready'));
}

function marcarSalida() {
    if (salidaEnviada) return;
    if (!actores.every((item) => item.estado === 'fuera' || item.fallo)) return;
    salidaEnviada = true;
    window.dispatchEvent(new CustomEvent('characters-exited'));
}

function crearActor(def) {
    const actor = {
        id: def.id,
        mesh: null,
        mixer: null,
        activo: null,
        caminar: null,
        idle: null,
        gestos: [],
        gestoIndice: 0,
        gestoActual: null,
        estado: 'pausado',
        espera: def.retraso ?? 0,
        baseY: def.posicionY ?? -1,
        inicioX: def.inicioX ?? 0,
        inicioZ: def.inicioZ ?? 0,
        finX: def.finX ?? 0,
        finZ: def.finZ ?? 0,
        destinoX: def.finX ?? 0,
        destinoZ: def.finZ ?? 0,
        velocidad: def.velocidad ?? 1.2,
        mirarAlHablar: def.mirarAlHablar ?? 0,
        mirarAlEscuchar: def.mirarAlEscuchar ?? 0,
        correccionYaw: def.correccionYaw || 0,
        yawObjetivo: Math.PI,
        fallo: false
    };

    actores.push(actor);

    loader.load(
        resolverAsset(def.modelo),
        (gltf) => {
            const mesh = gltf.scene;
            mesh.traverse((obj) => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });

            mesh.scale.setScalar(def.escala ?? 1);
            mesh.position.set(actor.inicioX, actor.baseY, actor.inicioZ);

            const dx = actor.finX - mesh.position.x;
            const dz = actor.finZ - mesh.position.z;
            actor.yawObjetivo = Math.atan2(dx, dz);
            mesh.rotation.y = actor.yawObjetivo + actor.correccionYaw;

            scene.add(mesh);
            actor.mesh = mesh;

            if (gltf.animations.length) {
                const mixer = new THREE.AnimationMixer(mesh);
                const actions = {};

                gltf.animations.forEach((clip) => {
                    actions[clip.name] = mixer.clipAction(clip);
                });

                actor.mixer = mixer;
                actor.caminar = tomarClip(actions, def.caminar);
                actor.idle = tomarClip(actions, def.idle);

                (def.gestos || []).forEach((nombre) => {
                    const gesto = tomarClip(actions, [nombre]);
                    if (gesto) actor.gestos.push(gesto);
                });

                mixer.addEventListener('finished', (evento) => {
                    if (evento.action !== actor.gestoActual) return;
                    actor.gestoActual = null;
                    if (actor.idle) {
                        evento.action.fadeOut(0.25);
                        actor.idle.reset().fadeIn(0.25).play();
                        actor.activo = actor.idle;
                    }
                });

                if (actor.idle) {
                    actor.idle.play();
                    actor.activo = actor.idle;
                }
            }

            if (introArrancada && actor.estado === 'pausado') {
                actor.estado = 'espera';
            }
        },
        undefined,
        (error) => {
            console.error('Error cargando el GLB de', def.id, error);
            actor.fallo = true;
            actor.estado = 'listo';
            marcarListo(actor);
        }
    );
}

(CONFIG.personajes || []).forEach(crearActor);

if (!document.getElementById('intro3d-root')) {
    introArrancada = true;
    actores.forEach((actor) => {
        if (actor.estado === 'pausado') actor.estado = 'espera';
    });
}

window.addEventListener('intro3d-start', () => {
    if (introArrancada) return;
    introArrancada = true;
    actores.forEach((actor) => {
        if (actor.estado === 'pausado') {
            actor.estado = 'espera';
        }
    });
});

window.addEventListener('characters-exit', () => {
    salidaEnviada = false;

    actores.forEach((actor) => {
        if (!actor.mesh || actor.fallo) {
            actor.estado = 'fuera';
            return;
        }

        // Cancela espera/entrada y manda de vuelta al origen.
        actor.espera = 0;
        actor.destinoX = actor.inicioX;
        actor.destinoZ = actor.inicioZ;

        const dx = actor.destinoX - actor.mesh.position.x;
        const dz = actor.destinoZ - actor.mesh.position.z;
        const distancia = Math.hypot(dx, dz);

        if (distancia < 0.08) {
            actor.mesh.position.x = actor.inicioX;
            actor.mesh.position.z = actor.inicioZ;
            actor.estado = 'fuera';
            if (actor.activo) actor.activo.fadeOut(0.15);
            return;
        }

        actor.yawObjetivo = Math.atan2(dx, dz);
        actor.estado = 'saliendo';
        cruzar(actor, actor.caminar || actor.idle, 0.15);
    });

    marcarSalida();
});

window.addEventListener('dialogue-line', (evento) => {
    const id = evento.detail?.personaje;

    actores.forEach((actor) => {
        if (!actor.mesh) return;
        const habla = actor.id === id;
        actor.yawObjetivo = habla
            ? actor.mirarAlHablar
            : actor.mirarAlEscuchar;
        if (habla) reproducirGesto(actor);
    });
});

function salidaHabilitada() {
    return actores.length > 0 && actores.every((item) => item.mesh || item.fallo);
}

function actualizarActor(actor, delta) {
    if (!actor.mesh) return;
    if (actor.mixer) actor.mixer.update(delta);
    if (!salidaHabilitada()) return;
    if (actor.estado === 'pausado' || actor.estado === 'fuera') return;

    if (actor.estado === 'espera') {
        actor.espera -= delta;
        if (actor.espera <= 0) {
            actor.destinoX = actor.finX;
            actor.destinoZ = actor.finZ;
            actor.estado = 'caminando';
            cruzar(actor, actor.caminar || actor.idle, 0.2);
        }
        return;
    }

    if (actor.estado === 'caminando' || actor.estado === 'saliendo') {
        const dx = actor.destinoX - actor.mesh.position.x;
        const dz = actor.destinoZ - actor.mesh.position.z;
        const distancia = Math.hypot(dx, dz);

        if (distancia > 0.045) {
            const paso = Math.min(distancia, actor.velocidad * delta);
            actor.mesh.position.x += (dx / distancia) * paso;
            actor.mesh.position.z += (dz / distancia) * paso;
            actor.yawObjetivo = Math.atan2(dx, dz);
        } else {
            actor.mesh.position.x = actor.destinoX;
            actor.mesh.position.z = actor.destinoZ;

            if (actor.estado === 'saliendo') {
                actor.estado = 'fuera';
                if (actor.activo) actor.activo.fadeOut(0.2);
                marcarSalida();
                return;
            }

            actor.estado = 'girando';
            actor.yawObjetivo = actor.mirarAlEscuchar;
            cruzar(actor, actor.idle, 0.25);
        }
    }

    if (actor.estado === 'girando' || actor.estado === 'listo') {
        const objetivo = actor.yawObjetivo + actor.correccionYaw;
        const diferencia = Math.abs(
            deltaAngulo(actor.mesh.rotation.y, objetivo)
        );

        actor.mesh.rotation.y += deltaAngulo(
            actor.mesh.rotation.y,
            objetivo
        ) * Math.min(1, delta * 2.6);

        if (actor.estado === 'girando' && diferencia < 0.08) {
            actor.mesh.rotation.y = objetivo;
            marcarListo(actor);
        }
        return;
    }

    const objetivoCaminar = actor.yawObjetivo + actor.correccionYaw;
    actor.mesh.rotation.y += deltaAngulo(
        actor.mesh.rotation.y,
        objetivoCaminar
    ) * Math.min(1, delta * 4);
}

function animate() {
    requestAnimationFrame(animate);

    let pendiente = Math.min(clock.getDelta(), 0.5);
    while (pendiente > 0.0001) {
        const delta = Math.min(0.033, pendiente);
        pendiente -= delta;
        actores.forEach((actor) => actualizarActor(actor, delta));
        ring.rotation.z += delta * 0.55;
        tiempoNubes += delta;
    }

    nubes.forEach((n) => {
        n.mesh.position.x = n.baseX + Math.sin(tiempoNubes * n.vel + n.fase) * n.amp;
    });

    // Props especiales del ambiente: flotar, girar y latir (paneles).
    elementosAnimados.forEach((el) => {
        const t = tiempoNubes * (el.vel || 1) + (el.fase || 0);
        if (el.amp != null && el.base != null) {
            el.mesh.position.y = el.base + Math.sin(t) * el.amp;
        }
        if (el.giro) el.mesh.rotation.y += el.giro * 0.016;
        if (el.giroY) el.mesh.rotation.y += el.giroY;
        if (el.giroZ) el.mesh.rotation.z += el.giroZ * 0.016;
        if (el.tipo === 'panel' && el.mat) {
            el.mat.emissiveIntensity = 0.45 + Math.sin(t) * 0.2;
        }
    });

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.__intro3dHeadScreen = (personajeId) => {
    const actor = actores.find((item) => item.id === personajeId);
    if (!actor || !actor.mesh) return null;

        const altura = 2.35 * (actor.mesh.scale.y || 1);
    const punto = new THREE.Vector3(
        actor.mesh.position.x,
        actor.baseY + altura,
        actor.mesh.position.z
    );
    punto.project(camera);

    return {
        x: (punto.x * 0.5 + 0.5) * window.innerWidth,
        y: (-punto.y * 0.5 + 0.5) * window.innerHeight
    };
};

window.__intro3dDispose = () => {
    try {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    } catch (e) { /* noop */ }
};

animate();
