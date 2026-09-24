import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = window.INTRO_CONFIG || {};
const container = document.getElementById('three-container');

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
scene.fog = new THREE.Fog(0x7eb6ff, 14, 38);

const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 2.35, 9.4);
camera.lookAt(0, 0.45, 0.4);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

function crearCielo() {
    scene.background = new THREE.Color(0x7ec8ff);

    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#3f8fff');
    grad.addColorStop(0.4, '#79b8ff');
    grad.addColorStop(0.75, '#c5e4ff');
    grad.addColorStop(1, '#eef7ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 256);

    const textura = new THREE.CanvasTexture(canvas);
    const cielo = new THREE.Mesh(
        new THREE.SphereGeometry(40, 32, 16),
        new THREE.MeshBasicMaterial({
            map: textura,
            side: THREE.BackSide,
            depthWrite: false
        })
    );
    cielo.position.y = 4;
    scene.add(cielo);
}

function crearNube(x, y, z, escala) {
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.9
    });
    const grupo = new THREE.Group();
    const piezas = [
        [0, 0, 0, 1],
        [0.55, 0.12, 0.1, 0.72],
        [-0.5, 0.08, -0.05, 0.68],
        [0.15, 0.28, -0.08, 0.55]
    ];

    piezas.forEach(([px, py, pz, s]) => {
        const nube = new THREE.Mesh(
            new THREE.SphereGeometry(0.55 * s, 16, 16),
            material
        );
        nube.position.set(px, py, pz);
        grupo.add(nube);
    });

    grupo.position.set(x, y, z);
    grupo.scale.setScalar(escala);
    scene.add(grupo);
    return grupo;
}

crearCielo();
const nubes = [
    { mesh: crearNube(-6.5, 4.2, -8, 1.5), baseX: -6.5, fase: 0, amp: 0.48, vel: 0.75 },
    { mesh: crearNube(5.8, 3.6, -10, 1.8), baseX: 5.8, fase: 2.1, amp: 0.42, vel: 0.58 },
    { mesh: crearNube(0.5, 4.8, -12, 1.2), baseX: 0.5, fase: 4.0, amp: 0.52, vel: 0.62 }
];
let tiempoNubes = 0;

scene.add(new THREE.HemisphereLight(0xfff2dd, 0x4d6b3a, 1.35));

const keyLight = new THREE.DirectionalLight(0xfff0c8, 2.4);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 28;
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -12;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xa8d4ff, 0.85);
fillLight.position.set(-5, 3, 2);
scene.add(fillLight);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(16, 64),
    new THREE.MeshStandardMaterial({
        color: 0x6faf5b,
        roughness: 0.92,
        metalness: 0.02
    })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.02;
floor.receiveShadow = true;
scene.add(floor);

const pista = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 48),
    new THREE.MeshStandardMaterial({
        color: 0x8bc46f,
        roughness: 0.88,
        metalness: 0.02
    })
);
pista.rotation.x = -Math.PI / 2;
pista.position.y = -1.01;
pista.receiveShadow = true;
scene.add(pista);

const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.24, 64),
    new THREE.MeshBasicMaterial({
        color: 0xfff4a8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -0.99;
scene.add(ring);

// 3 colinas: 2 adelante + 1 atrás — [x, z, rx, ry, rz, color, y]
[
    // Atrás (más oscura, más grande)
    [0.0, -16.0, 7.5, 3.9, 3.2, 0x355f2e, 0],
    // Adelante
    [-6.5, -12.0, 6.8, 2.1, -1.8, 0x6eab58, -0.4],
    [6.5, -12.0, 8.8, 3.1, 3.8, 0x5f9a4d, 0]
].forEach(([x, z, rx, ry, rz, color, y]) => {
    const colina = new THREE.Mesh(
        new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: color, roughness: 1 })
    );
    colina.position.set(x, -1.05 + (y != null ? y : 0), z);
    colina.scale.set(rx, ry, rz);
    colina.receiveShadow = true;
    scene.add(colina);
});

const Y_SUELO = -1.02;
const matTronco = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 });
const matHojaA = new THREE.MeshStandardMaterial({ color: 0x3f9e48, roughness: 0.82 });
const matHojaB = new THREE.MeshStandardMaterial({ color: 0x58b560, roughness: 0.82 });
const matHojaC = new THREE.MeshStandardMaterial({ color: 0x2f8640, roughness: 0.85 });
const matMadera = new THREE.MeshStandardMaterial({ color: 0x9c6b3c, roughness: 0.88 });
const matRoca = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.95 });

function crearArbolRedondo(x, z, escala) {
    const s = escala != null ? escala : 1;
    const grupo = new THREE.Group();
    const tronco = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 1.7 * s, 8),
        matTronco
    );
    tronco.position.y = Y_SUELO + 0.85 * s;
    tronco.castShadow = true;
    grupo.add(tronco);
    [
        [0, 2.35, 0, 1.05],
        [0.55, 2.15, 0.2, 0.72],
        [-0.5, 2.2, -0.15, 0.7],
        [0.15, 2.85, 0.05, 0.62]
    ].forEach(([px, py, pz, r], i) => {
        const hoja = new THREE.Mesh(
            new THREE.SphereGeometry(r * s, 14, 12),
            i % 2 ? matHojaB : matHojaA
        );
        hoja.position.set(px * s, Y_SUELO + py * s, pz * s);
        hoja.castShadow = true;
        grupo.add(hoja);
    });
    grupo.position.set(x, 0, z);
    scene.add(grupo);
    return grupo;
}

function crearPino(x, z, escala, y) {
    const s = escala != null ? escala : 1;
    const offsetY = y != null ? y : 0;
    const grupo = new THREE.Group();
    const tronco = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 0.9 * s, 7),
        matTronco
    );
    tronco.position.y = Y_SUELO + 0.45 * s;
    tronco.castShadow = true;
    grupo.add(tronco);
    [
        [1.15, 1.0],
        [0.9, 1.55],
        [0.62, 2.05]
    ].forEach(([radio, py], i) => {
        const piso = new THREE.Mesh(
            new THREE.ConeGeometry(radio * s, 0.95 * s, 10),
            i === 1 ? matHojaB : matHojaC
        );
        piso.position.y = Y_SUELO + py * s;
        piso.castShadow = true;
        grupo.add(piso);
    });
    grupo.position.set(x, offsetY, z);
    scene.add(grupo);
    return grupo;
}

function crearArbusto(x, z, escala) {
    const s = escala != null ? escala : 1;
    const grupo = new THREE.Group();
    [
        [0, 0.35, 0, 0.48],
        [0.35, 0.28, 0.12, 0.38],
        [-0.32, 0.26, -0.1, 0.36],
        [0.05, 0.5, -0.08, 0.3]
    ].forEach(([px, py, pz, r], i) => {
        const m = new THREE.Mesh(
            new THREE.SphereGeometry(r * s, 10, 8),
            i % 2 ? matHojaB : matHojaC
        );
        m.position.set(px * s, Y_SUELO + py * s, pz * s);
        m.castShadow = true;
        grupo.add(m);
    });
    grupo.position.set(x, 0, z);
    scene.add(grupo);
    return grupo;
}

function crearFlor(x, z, escala, colorIdx) {
    const s = escala != null ? escala : 1;
    const grupo = new THREE.Group();
    const tallo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.38 * s, 5),
        matHojaC
    );
    tallo.position.y = Y_SUELO + 0.19 * s;
    grupo.add(tallo);

    const coloresFlor = [0xff6b8a, 0xffd166, 0xc77dff, 0xffffff, 0xff9f43];
    const color = coloresFlor[(colorIdx || 0) % coloresFlor.length];
    const petaloMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.65,
        emissive: color,
        emissiveIntensity: 0.06
    });
    for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const petalo = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), petaloMat);
        petalo.position.set(
            Math.cos(ang) * 0.12 * s,
            Y_SUELO + 0.4 * s,
            Math.sin(ang) * 0.12 * s
        );
        grupo.add(petalo);
    }
    const centro = new THREE.Mesh(
        new THREE.SphereGeometry(0.075 * s, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe566, roughness: 0.55 })
    );
    centro.position.y = Y_SUELO + 0.4 * s;
    grupo.add(centro);

    grupo.position.set(x, 0, z);
    scene.add(grupo);
    return grupo;
}

function crearRoca(x, z, escala) {
    const s = escala != null ? escala : 1;
    const grupo = new THREE.Group();
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 10, 8), matRoca);
    a.scale.set(1.3, 0.7, 1.1);
    a.position.y = Y_SUELO + 0.16 * s;
    a.castShadow = true;
    a.receiveShadow = true;
    grupo.add(a);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 6), matRoca);
    b.scale.set(1.2, 0.65, 1);
    b.position.set(0.22 * s, Y_SUELO + 0.1 * s, 0.08 * s);
    grupo.add(b);
    grupo.position.set(x, 0, z);
    scene.add(grupo);
    return grupo;
}

function crearCerca(x, z, largo, yaw, numeroPosts) {
    const grupo = new THREE.Group();
    const posts = numeroPosts;
    const span = largo / (posts - 1);
    for (let i = 0; i < posts; i++) {
        const poste = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.07, 0.7, 6),
            matMadera
        );
        poste.position.set(-largo / 2 + i * span, Y_SUELO + 0.35, 0);
        poste.castShadow = true;
        grupo.add(poste);
    }
    [0.28, 0.48].forEach((py) => {
        const liston = new THREE.Mesh(
            new THREE.BoxGeometry(largo + 0.1, 0.08, 0.06),
            matMadera
        );
        liston.position.set(0, Y_SUELO + py, 0);
        liston.castShadow = true;
        grupo.add(liston);
    });
    grupo.position.set(x, 0, z);
    grupo.rotation.y = yaw || 0;
    scene.add(grupo);
    return grupo;
}

function crearArcoiris() {
    const grupo = new THREE.Group();
    const colores = [
        0xff3b3b,
        0xff8c1a,
        0xffe14a,
        0x3dcf5a,
        0x3aa0ff,
        0x6b5cff,
        0xc45cff
    ];
    const radioBase = 8.6;
    const grosor = 0.2;
    const sep = 0.26;

    colores.forEach((color, i) => {
        const radio = radioBase - i * sep;
        // Torus en plano XY = arco de pie (sin rotation.x que lo acostaba)
        const tubo = new THREE.Mesh(
            new THREE.TorusGeometry(radio, grosor, 12, 72, Math.PI),
            new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.4,
                metalness: 0.04,
                emissive: color,
                emissiveIntensity: 0.22,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            })
        );
        grupo.add(tubo);
    });

    // Base en el suelo, curva hacia arriba, detrás de los personajes
    grupo.position.set(0, -0.4, -14.5);
    scene.add(grupo);
    return grupo;
}

[
    [-7.6, -3.2, 1.85],
    [-8.8, -6.0, 1.45],
    [7.6, -3.2, 1.85],
    [8.8, -6.0, 1.45]
].forEach(([x, z, escala]) => crearArbolRedondo(x, z, escala));

[
    // [x, z, escala, y]
    [-4.4, -4.8, 1.2, 0],
    [-1.8, -7.0, 1.0, 0],
    [5.4, -4.8, 1.2, 0],
    [2.8, -7.0, 0.8, 0],
    [5.0, -11.0, 0.4, 3],
    [-5.0, -11.0, 0.4, 1.2]
].forEach(([x, z, escala, y]) => crearPino(x, z, escala, y));

crearCerca(-4.9, -2.0, 6.4, 0.12, 8);
crearCerca(4.9, -2.0, 6.4, -0.12, 8);
crearCerca(0, -2.4, 3.4, 0, 4);

crearRoca(-5.0, -1.2, 1.1);
crearRoca(5.0, 1, 1);
crearRoca(-3.2, 2.8, 0.9);
crearRoca(3.2, -2.8, 0.3);
crearRoca(3.2, 2.8, 0.9);

crearRoca(0.4, -5.8, 0.8);

[
    [-5.2, 3.4, 1.55],
    [-3.6, 4.4, 1.25],
    [5.2, 3.4, 1.55],
    [3.6, 4.4, 1.25],
    [-6.4, 2.2, 1.2],
    [6.4, 2.2, 1.2],
    [-5.8, -3.0, 0.95],
    [3.8, -4.0, 0.55]
].forEach(([x, z, escala]) => crearArbusto(x, z, escala));

[
    [-4.4, 2.6, 1.05, 0], [-3.6, 3.2, 0.95, 1], [-5.4, 3.8, 0.9, 2],
    [-2.8, 3.8, 0.85, 3], [-4.0, 4.8, 0.85, 4],
    [4.4, 2.6, 1.05, 1], [3.6, 3.2, 0.95, 2], [5.4, 3.8, 0.9, 3],
    [2.8, 3.8, 0.85, 4], [4.0, 4.8, 0.85, 0],
    [-5.6, -1.0, 0.85, 0], [-4.2, -0.6, 0.8, 1],
    [5.6, -1.0, 0.85, 2], [4.2, -0.4, 0.8, 3],
    [4.6, -0.6, 0.8, 1], [4.5, -0.3, 0.8, 2],
    [0.7, -5.8, 0.8, 0], [0.1, -5.8, 0.8, 1]
].forEach(([x, z, escala, ci]) => crearFlor(x, z, escala, ci));

crearArcoiris();

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
