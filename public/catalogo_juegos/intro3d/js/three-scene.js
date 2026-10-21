import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = window.INTRO_CONFIG || {};
const container = document.getElementById('three-container');

const TEMA = window.INTRO_TEMA || {
    slug: 'expresion-artistica',
    nombre: 'Expresión Artística',
    modeloAula: 'models/aulas/expresion_artistica.glb',
};

const AULA_CFG = Object.assign({
    controlesManuales: false,
    rotacionX: 0,
    rotacionY: 0,
    rotacionZ: 0,
    posicion: { x: 0, y: 0, z: 0 },
    escala: null,
    anchoObjetivo: 24,
    pisoY: -1,
    zoom: 1,
    camaraPosicion: { x: 0, y: 0, z: 0 },
    lookPosicion: { x: 0, y: 0, z: 0 },
    iluminacion: {},
    lucesModelo: { escala: 0.0004 },
    bombillos: [],
}, CONFIG.aula || {});

if (!AULA_CFG.posicion || typeof AULA_CFG.posicion !== 'object') {
    AULA_CFG.posicion = { x: 0, y: 0, z: 0 };
}
if (!AULA_CFG.camaraPosicion || typeof AULA_CFG.camaraPosicion !== 'object') {
    AULA_CFG.camaraPosicion = { x: 0, y: 0, z: 0 };
}
if (!AULA_CFG.lookPosicion || typeof AULA_CFG.lookPosicion !== 'object') {
    AULA_CFG.lookPosicion = { x: 0, y: 0, z: 0 };
}

// Compat: rotacion: { x, y, z } de configs viejos.
if (AULA_CFG.rotacion && typeof AULA_CFG.rotacion === 'object') {
    if (CONFIG.aula?.rotacionX == null && AULA_CFG.rotacion.x != null) {
        AULA_CFG.rotacionX = Number(AULA_CFG.rotacion.x) || 0;
    }
    if (CONFIG.aula?.rotacionY == null && AULA_CFG.rotacion.y != null) {
        AULA_CFG.rotacionY = Number(AULA_CFG.rotacion.y) || 0;
    }
    if (CONFIG.aula?.rotacionZ == null && AULA_CFG.rotacion.z != null) {
        AULA_CFG.rotacionZ = Number(AULA_CFG.rotacion.z) || 0;
    }
}
if (AULA_CFG.offset && !CONFIG.aula?.posicion) {
    AULA_CFG.posicion = Object.assign({ x: 0, y: 0, z: 0 }, AULA_CFG.offset);
}
if (AULA_CFG.camaraAlto && !(CONFIG.aula?.camaraPosicion)) {
    AULA_CFG.camaraPosicion = Object.assign(
        { x: 0, y: 0, z: 0 },
        AULA_CFG.camaraPosicion,
        { y: (AULA_CFG.camaraPosicion?.y || 0) + Number(AULA_CFG.camaraAlto) }
    );
}
if (AULA_CFG.lookAlto && !(CONFIG.aula?.lookPosicion)) {
    AULA_CFG.lookPosicion = Object.assign(
        { x: 0, y: 0, z: 0 },
        AULA_CFG.lookPosicion,
        { y: (AULA_CFG.lookPosicion?.y || 0) + Number(AULA_CFG.lookAlto) }
    );
}

const LUZ_CFG = Object.assign({
    exposicion: 0.9,
    ambiente: { color: '#ffffff', intensidad: 0.18 },
    hemisferio: { cielo: '#fff6e8', suelo: '#dfe6d8', intensidad: 0.35 },
    key: { color: '#fff2d8', intensidad: 0.25, posicion: { x: 4, y: 9, z: 7 } },
    fill: { color: '#dfeaff', intensidad: 0.2, posicion: { x: -6, y: 4, z: 5 } },
}, AULA_CFG.iluminacion || {});

const LUCES_MODELO_CFG = Object.assign(
    { escala: 0.0004 },
    AULA_CFG.lucesModelo || {}
);

function colorCfg(valor, fallback) {
    if (valor == null) return new THREE.Color(fallback);
    return new THREE.Color(valor);
}

/** Resuelve assets de intro3d relativos a esta carpeta (sirve en cualquier ambiente/juego). */
function resolverAsset(ruta) {
    if (!ruta) return ruta;
    if (/^(https?:)?\/\//i.test(ruta) || ruta.startsWith('data:') || ruta.startsWith('/')) {
        return ruta;
    }
    if (ruta.indexOf('intro3d/') >= 0) return ruta;
    return new URL('../' + String(ruta).replace(/^\.\//, ''), import.meta.url).href;
}

const scene = new THREE.Scene();
scene.fog = null;
scene.background = new THREE.Color(0xf3e6c8);

const camera = new THREE.PerspectiveCamera(
    54, window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(0, 2.5, 11.6);
camera.lookAt(0, 0.7, 0.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = Number(LUZ_CFG.exposicion) || 1.0;
container.appendChild(renderer.domElement);

// ---- Iluminación (valores desde INTRO_CONFIG.aula.iluminacion) ----
const hemiCfg = LUZ_CFG.hemisferio || {};
scene.add(new THREE.HemisphereLight(
    colorCfg(hemiCfg.cielo, '#fff6e8'),
    colorCfg(hemiCfg.suelo, '#dfe6d8'),
    Number(hemiCfg.intensidad) || 1.05
));

const keyCfg = LUZ_CFG.key || {};
const keyPos = keyCfg.posicion || {};
const key = new THREE.DirectionalLight(
    colorCfg(keyCfg.color, '#fff2d8'),
    Number(keyCfg.intensidad) || 0.5
);
key.position.set(keyPos.x ?? 4, keyPos.y ?? 9, keyPos.z ?? 7);
key.castShadow = true;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 40;
key.shadow.camera.left = -16;
key.shadow.camera.right = 16;
key.shadow.camera.top = 16;
key.shadow.camera.bottom = -16;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

const fillCfg = LUZ_CFG.fill || {};
const fillPos = fillCfg.posicion || {};
const fill = new THREE.DirectionalLight(
    colorCfg(fillCfg.color, '#dfeaff'),
    Number(fillCfg.intensidad) || 0.35
);
fill.position.set(fillPos.x ?? -6, fillPos.y ?? 4, fillPos.z ?? 5);
scene.add(fill);

const ambCfg = LUZ_CFG.ambiente || {};
scene.add(new THREE.AmbientLight(
    colorCfg(ambCfg.color, '#ffffff'),
    Number(ambCfg.intensidad) || 0.3
));

// Bombillos del techo (PointLight) desde INTRO_CONFIG.aula.bombillos.
const bombillosLuces = [];
(function crearBombillos() {
    const lista = Array.isArray(AULA_CFG.bombillos) ? AULA_CFG.bombillos : [];
    lista.forEach((def, i) => {
        if (!def) return;
        const pos = def.posicion || {};
        const luz = new THREE.PointLight(
            colorCfg(def.color, '#fff5e0'),
            Number(def.intensidad) || 2,
            Number(def.distancia) || 14,
            Number(def.decay) != null ? Number(def.decay) : 2
        );
        luz.position.set(
            Number(pos.x) || 0,
            Number(pos.y) || 5,
            Number(pos.z) || 0
        );
        luz.castShadow = false;
        luz.name = 'bombillo_' + (i + 1);
        scene.add(luz);
        bombillosLuces.push({ luz: luz, def: def, indice: i });
    });
})();

const loader = new GLTFLoader();
const clock = new THREE.Clock();
const actores = [];
let listoEnviado = false;
let salidaEnviada = false;
let introArrancada = false;

// ========================================================================
//  AULA GLB — un modelo por ambiente, auto-fit a unidades de escena.
// ========================================================================

let aulaRoot = null;
let panelAulaEl = null;
let logAulaTimer = null;
const lucesDelModelo = [];

/** Atenuá luces embebidas del GLB (Blender exporta miles de candelas). */
function atenuarLucesModelo(root) {
    if (!root) return;
    const escala = num3(LUCES_MODELO_CFG.escala, 0.0004);
    if (!lucesDelModelo.length) {
        root.traverse((obj) => {
            if (!obj.isLight) return;
            if (obj.userData._intensityBase == null) {
                obj.userData._intensityBase = obj.intensity;
            }
            lucesDelModelo.push(obj);
        });
    }
    lucesDelModelo.forEach((luz) => {
        const base = luz.userData._intensityBase;
        if (base == null) return;
        luz.intensity = base * escala;
    });
}

function num3(n, fallback) {
    const v = Number(n);
    return Number.isFinite(v) ? v : fallback;
}

function ajustarCamaraAAula(box) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const zoom = Number(AULA_CFG.zoom);
    const zoomSafe = Number.isFinite(zoom) && zoom > 0.05 ? zoom : 1;
    const halfW = Math.max(size.x, 1) * 0.5;
    const distBase = Math.max(
        halfW / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 0.72,
        10
    );
    const dist = distBase / zoomSafe;
    const camOff = AULA_CFG.camaraPosicion || {};
    const lookOff = AULA_CFG.lookPosicion || {};

    const camX = center.x + num3(camOff.x, 0);
    const camY = AULA_CFG.pisoY + Math.max(size.y * 0.38, 2.2) + num3(camOff.y, 0);
    const camZ = center.z + dist + num3(camOff.z, 0);

    const lookX = center.x + num3(lookOff.x, 0);
    const lookY = AULA_CFG.pisoY + Math.max(size.y * 0.22, 0.7) + num3(lookOff.y, 0);
    const lookZ = center.z + num3(lookOff.z, 0);

    camera.position.set(camX, camY, camZ);
    camera.near = 0.1;
    camera.far = Math.max(200, dist + size.z + 40);
    camera.updateProjectionMatrix();
    camera.lookAt(lookX, lookY, lookZ);
}

/** Idempotente: se puede llamar varias veces al mover sliders. */
function colocarAula(root) {
    if (!root) return null;

    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);

    root.rotation.set(
        THREE.MathUtils.degToRad(num3(AULA_CFG.rotacionX, 0)),
        THREE.MathUtils.degToRad(num3(AULA_CFG.rotacionY, 0)),
        THREE.MathUtils.degToRad(num3(AULA_CFG.rotacionZ, 0))
    );
    root.updateMatrixWorld(true);

    const box0 = new THREE.Box3().setFromObject(root);
    const size0 = new THREE.Vector3();
    box0.getSize(size0);

    let escala = AULA_CFG.escala;
    if (escala == null || !(escala > 0)) {
        const ancho = Math.max(size0.x, 0.001);
        escala = (AULA_CFG.anchoObjetivo || 24) / ancho;
    }
    root.scale.setScalar(escala);
    root.updateMatrixWorld(true);

    const box1 = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    box1.getCenter(center);

    // 1) Centrar y apoyar piso SIN offset de usuario → base fija para la cámara.
    root.position.set(
        -center.x,
        AULA_CFG.pisoY - box1.min.y,
        -center.z
    );
    root.updateMatrixWorld(true);

    const boxBase = new THREE.Box3().setFromObject(root);
    // Cámara sigue el origen del aula, no el offset → posicion mueve el modelo en pantalla.
    ajustarCamaraAAula(boxBase);

    // 2) Offset manual del modelo respecto a la cámara / pantalla.
    const pos = AULA_CFG.posicion || {};
    root.position.x += num3(pos.x, 0);
    root.position.y += num3(pos.y, 0);
    root.position.z += num3(pos.z, 0);
    root.updateMatrixWorld(true);

    const boxFinal = new THREE.Box3().setFromObject(root);
    const half = Math.max(boxFinal.max.x - boxFinal.min.x, boxFinal.max.z - boxFinal.min.z) * 0.55;
    key.shadow.camera.left = -half;
    key.shadow.camera.right = half;
    key.shadow.camera.top = half;
    key.shadow.camera.bottom = -half;
    key.shadow.camera.updateProjectionMatrix();

    return boxFinal;
}

function snippetConfigAula() {
    const p = AULA_CFG.posicion || {};
    const c = AULA_CFG.camaraPosicion || {};
    const l = AULA_CFG.lookPosicion || {};
    const r = (n) => {
        const v = num3(n, 0);
        return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
    };
    const lineas = [
        'rotacionX: ' + r(AULA_CFG.rotacionX) + ',',
        'rotacionY: ' + r(AULA_CFG.rotacionY) + ',',
        'rotacionZ: ' + r(AULA_CFG.rotacionZ) + ',',
        'posicion: { x: ' + r(p.x) + ', y: ' + r(p.y) + ', z: ' + r(p.z) + ' },',
        'zoom: ' + r(AULA_CFG.zoom) + ',',
        'camaraPosicion: { x: ' + r(c.x) + ', y: ' + r(c.y) + ', z: ' + r(c.z) + ' },',
        'lookPosicion: { x: ' + r(l.x) + ', y: ' + r(l.y) + ', z: ' + r(l.z) + ' },',
        'lucesModelo: { escala: ' + r(LUCES_MODELO_CFG.escala) + ' },',
    ];
    if ((AULA_CFG.bombillos || []).length) {
        lineas.push('bombillos: [');
        (AULA_CFG.bombillos || []).forEach((b, i) => {
            if (!b) return;
            const bp = b.posicion || {};
            const coma = i < (AULA_CFG.bombillos.length - 1) ? ',' : '';
            lineas.push(
                '  { color: "' + (b.color || '#FFFFFF') + '", intensidad: ' + r(b.intensidad)
                + ', distancia: ' + r(b.distancia) + ', decay: ' + r(b.decay)
                + ', posicion: { x: ' + r(bp.x) + ', y: ' + r(bp.y) + ', z: ' + r(bp.z) + ' } }' + coma
            );
        });
        lineas.push('],');
    }
    return lineas.join('\n');
}

function syncBombilloLuz(entry) {
    if (!entry || !entry.luz || !entry.def) return;
    const def = entry.def;
    const pos = def.posicion || {};
    entry.luz.intensity = num3(def.intensidad, 2);
    entry.luz.distance = num3(def.distancia, 14);
    entry.luz.decay = num3(def.decay, 2);
    entry.luz.position.set(num3(pos.x, 0), num3(pos.y, 5), num3(pos.z, 0));
    if (def.color) entry.luz.color.set(def.color);
}

function aplicarBombillos() {
    bombillosLuces.forEach(syncBombilloLuz);
    logConfigAula(false);
}

function logConfigAula(forzar) {
    const texto = snippetConfigAula();
    if (forzar) {
        console.log('%c[aula config — pegar en INTRO_CONFIG.aula]', 'color:#0a7;font-weight:bold');
        console.log(texto);
        return;
    }
    clearTimeout(logAulaTimer);
    logAulaTimer = setTimeout(() => {
        console.log('%c[aula config — pegar en INTRO_CONFIG.aula]', 'color:#0a7;font-weight:bold');
        console.log(texto);
    }, 250);
}

function aplicarControlesAula() {
    if (!aulaRoot) return;
    colocarAula(aulaRoot);
    atenuarLucesModelo(aulaRoot);
    logConfigAula(false);
}

function mostrarControlesAula() {
    const porUrl = /(?:\?|&)debugAula=1(?:&|$)/.test(location.search);
    if (!AULA_CFG.controlesManuales && !porUrl) return;
    if (panelAulaEl) return;

    const host = document.getElementById('intro3d-root') || document.body;
    const panel = document.createElement('div');
    panel.id = 'aula-controles';
    panel.innerHTML = [
        '<div class="aula-controles-head">',
        '  <strong>Aula debug</strong>',
        '  <button type="button" data-act="toggle">−</button>',
        '</div>',
        '<div class="aula-controles-body"></div>',
        '<div class="aula-controles-foot">',
        '  <button type="button" data-act="log">Log consola</button>',
        '  <button type="button" data-act="copy">Copiar</button>',
        '</div>',
    ].join('');
    host.appendChild(panel);
    panelAulaEl = panel;

    const body = panel.querySelector('.aula-controles-body');
    const filas = [
        ['rotX', 'Rotación X', 'rotacionX', -180, 180, 1],
        ['rotY', 'Rotación Y', 'rotacionY', -180, 180, 1],
        ['rotZ', 'Rotación Z', 'rotacionZ', -180, 180, 1],
        ['posX', 'Posición X', 'posicion.x', -20, 20, 0.1],
        ['posY', 'Posición Y', 'posicion.y', -10, 10, 0.1],
        ['posZ', 'Posición Z', 'posicion.z', -20, 20, 0.1],
        ['zoom', 'Zoom cámara', 'zoom', 0.3, 3, 0.01],
        ['camX', 'Cámara X', 'camaraPosicion.x', -20, 20, 0.1],
        ['camY', 'Cámara Y', 'camaraPosicion.y', -10, 10, 0.1],
        ['camZ', 'Cámara Z', 'camaraPosicion.z', -20, 20, 0.1],
        ['lookX', 'Look X', 'lookPosicion.x', -20, 20, 0.1],
        ['lookY', 'Look Y', 'lookPosicion.y', -10, 10, 0.1],
        ['lookZ', 'Look Z', 'lookPosicion.z', -20, 20, 0.1],
    ];

    function leerRuta(ruta) {
        const partes = ruta.split('.');
        if (partes.length === 1) return num3(AULA_CFG[partes[0]], 0);
        return num3((AULA_CFG[partes[0]] || {})[partes[1]], 0);
    }

    function escribirRuta(ruta, valor) {
        const partes = ruta.split('.');
        if (partes.length === 1) {
            AULA_CFG[partes[0]] = valor;
            return;
        }
        if (!AULA_CFG[partes[0]] || typeof AULA_CFG[partes[0]] !== 'object') {
            AULA_CFG[partes[0]] = { x: 0, y: 0, z: 0 };
        }
        AULA_CFG[partes[0]][partes[1]] = valor;
    }

    function addSlider(label, min, max, step, valorInicial, onChange) {
        const row = document.createElement('label');
        row.className = 'aula-ctrl-row';
        row.innerHTML = [
            '<span class="aula-ctrl-label">' + label + '</span>',
            '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + valorInicial + '">',
            '<input type="number" step="' + step + '" value="' + valorInicial + '">',
        ].join('');
        const range = row.querySelector('input[type="range"]');
        const number = row.querySelector('input[type="number"]');
        const sync = (v, desde) => {
            const n = num3(v, 0);
            if (desde !== 'range') range.value = String(n);
            if (desde !== 'number') number.value = String(n);
            onChange(n);
        };
        range.addEventListener('input', () => sync(range.value, 'range'));
        number.addEventListener('change', () => sync(number.value, 'number'));
        body.appendChild(row);
        return { range: range, number: number, set: (v) => {
            range.value = String(v);
            number.value = String(v);
        } };
    }

    filas.forEach(([, label, ruta, min, max, step]) => {
        addSlider(label, min, max, step, leerRuta(ruta), (n) => {
            escribirRuta(ruta, n);
            aplicarControlesAula();
        });
    });

    // ---- Luces del GLB (atenuación) ----
    const sepLuces = document.createElement('div');
    sepLuces.className = 'aula-ctrl-sep';
    sepLuces.textContent = 'Luces del modelo';
    body.appendChild(sepLuces);

    addSlider('Escala luces', 0.00005, 0.01, 0.00005, num3(LUCES_MODELO_CFG.escala, 0.0004), (n) => {
        LUCES_MODELO_CFG.escala = n;
        if (!AULA_CFG.lucesModelo || typeof AULA_CFG.lucesModelo !== 'object') {
            AULA_CFG.lucesModelo = {};
        }
        AULA_CFG.lucesModelo.escala = n;
        atenuarLucesModelo(aulaRoot);
        logConfigAula(false);
    });

    // ---- Bombillos manuales (solo si hay en config) ----
    if (bombillosLuces.length) {
        const sep = document.createElement('div');
        sep.className = 'aula-ctrl-sep';
        sep.textContent = 'Bombillos manuales';
        body.appendChild(sep);

        let bombilloSel = -1;
        const selRow = document.createElement('label');
        selRow.className = 'aula-ctrl-row aula-ctrl-select';
        const opts = ['<option value="-1">Todos</option>']
            .concat(bombillosLuces.map((e) => '<option value="' + e.indice + '">#' + (e.indice + 1) + '</option>'));
        selRow.innerHTML = [
            '<span class="aula-ctrl-label">Luz</span>',
            '<select>' + opts.join('') + '</select>',
            '<span></span>',
        ].join('');
        const select = selRow.querySelector('select');
        body.appendChild(selRow);

        function defsObjetivo() {
            if (bombilloSel < 0) return bombillosLuces.map((e) => e.def);
            const entry = bombillosLuces.find((e) => e.indice === bombilloSel);
            return entry ? [entry.def] : [];
        }

        function valorBombillo(campo, fallback) {
            const defs = defsObjetivo();
            if (!defs.length) return fallback;
            return num3(defs[0][campo], fallback);
        }

        const slInt = addSlider('Intensidad', 0, 40, 0.1, valorBombillo('intensidad', 10), (n) => {
            defsObjetivo().forEach((d) => { d.intensidad = n; });
            aplicarBombillos();
        });
        const slDist = addSlider('Distancia', 1, 120, 0.5, valorBombillo('distancia', 40), (n) => {
            defsObjetivo().forEach((d) => { d.distancia = n; });
            aplicarBombillos();
        });
        const slDec = addSlider('Decay', 0, 4, 0.05, valorBombillo('decay', 2), (n) => {
            defsObjetivo().forEach((d) => { d.decay = n; });
            aplicarBombillos();
        });

        select.addEventListener('change', () => {
            bombilloSel = parseInt(select.value, 10);
            if (!Number.isFinite(bombilloSel)) bombilloSel = -1;
            slInt.set(valorBombillo('intensidad', 10));
            slDist.set(valorBombillo('distancia', 40));
            slDec.set(valorBombillo('decay', 2));
        });
    }

    panel.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        if (act === 'toggle') {
            panel.classList.toggle('is-collapsed');
            btn.textContent = panel.classList.contains('is-collapsed') ? '+' : '−';
        } else if (act === 'log') {
            logConfigAula(true);
        } else if (act === 'copy') {
            const texto = snippetConfigAula();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).then(() => {
                    console.log('%c[aula config copiado al portapapeles]', 'color:#06c');
                    console.log(texto);
                }).catch(() => logConfigAula(true));
            } else {
                logConfigAula(true);
            }
        }
    });

    console.log('%c[aula] Controles manuales activos — mové los sliders y pegá el log en config.js', 'color:#0a7');
    logConfigAula(true);
}

function cargarAula() {
    const ruta = TEMA.modeloAula || 'models/aulas/expresion_artistica.glb';
    loader.load(
        resolverAsset(ruta),
        (gltf) => {
            const root = gltf.scene;
            root.traverse((obj) => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
            scene.add(root);
            aulaRoot = root;
            atenuarLucesModelo(root);
            colocarAula(root);
            mostrarControlesAula();
            if (lucesDelModelo.length) {
                console.log(
                    '%c[aula] Luces del GLB: ' + lucesDelModelo.length
                    + ' — escala ' + LUCES_MODELO_CFG.escala
                    + ' (Blender exporta miles de candelas)',
                    'color:#c80'
                );
            }
        },
        undefined,
        (error) => {
            console.error('Error cargando el aula GLB', TEMA.slug, error);
        }
    );
}

cargarAula();

// ========================================================================
//  PERSONAJES — aparecen en pasillo (inicio) y caminan al centro (fin).
// ========================================================================

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
    clip.setLoop(THREE.LoopRepeat, Infinity);
    clip.clampWhenFinished = false;

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

function salioDelEncuadre(mesh) {
    const punto = mesh.position.clone();
    punto.y += 0.9;
    punto.project(camera);
    return Math.abs(punto.x) > 1.15 || Math.abs(punto.y) > 1.15;
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
        baseY: def.posicionY ?? AULA_CFG.pisoY ?? -1,
        inicioX: def.inicioX ?? 0,
        inicioZ: (def.inicioZ ?? 0) + (Number(def.posicionZ) || 0),
        finX: def.finX ?? 0,
        finZ: (def.finZ ?? 0) + (Number(def.posicionZ) || 0),
        destinoX: def.finX ?? 0,
        destinoZ: (def.finZ ?? 0) + (Number(def.posicionZ) || 0),
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
                const clips = CONFIG.clips || {};
                actor.caminar = tomarClip(actions, def.caminar || clips.caminar || ['Caminar']);
                actor.idle = tomarClip(actions, def.idle || clips.quieto || ['Quieto']);

                (def.gestos || clips.hablar || ['Hablar']).forEach((nombre) => {
                    const gesto = tomarClip(actions, [nombre]);
                    if (gesto && actor.gestos.indexOf(gesto) < 0) actor.gestos.push(gesto);
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

        actor.espera = 0;
        const lado = actor.inicioX < 0 ? -1 : 1;
        actor.destinoX = lado * 22;
        actor.destinoZ = actor.inicioZ;

        const dx = actor.destinoX - actor.mesh.position.x;
        const dz = actor.destinoZ - actor.mesh.position.z;

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
        else if (actor.estado === 'listo' || actor.estado === 'girando') cruzar(actor, actor.idle, 0.2);
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

        if (actor.estado === 'saliendo' && salioDelEncuadre(actor.mesh)) {
            actor.estado = 'fuera';
            if (actor.activo) actor.activo.fadeOut(0.15);
            actor.mesh.visible = false;
            marcarSalida();
            return;
        }

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
                actor.mesh.visible = false;
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

let rafIntro = null;
let introLiberada = false;

function animate() {
    if (introLiberada) return;
    rafIntro = requestAnimationFrame(animate);

    let pendiente = Math.min(clock.getDelta(), 0.5);
    while (pendiente > 0.0001) {
        const delta = Math.min(0.033, pendiente);
        pendiente -= delta;
        actores.forEach((actor) => actualizarActor(actor, delta));
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (introLiberada) return;
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

window.__intro3dDebug = () => ({
    slug: TEMA.slug,
    modeloAula: TEMA.modeloAula,
    cam: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
    },
    actores: actores.map((a) => ({
        id: a.id,
        estado: a.estado,
        x: a.mesh ? a.mesh.position.x : null,
        y: a.mesh ? a.mesh.position.y : null,
        z: a.mesh ? a.mesh.position.z : null,
        visible: a.mesh ? a.mesh.visible : false,
    })),
});

window.__intro3dDispose = () => {
    introLiberada = true;
    if (rafIntro != null) {
        cancelAnimationFrame(rafIntro);
        rafIntro = null;
    }
    if (panelAulaEl && panelAulaEl.parentNode) {
        panelAulaEl.parentNode.removeChild(panelAulaEl);
        panelAulaEl = null;
    }
    try {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    } catch (e) { /* noop */ }
};

animate();
