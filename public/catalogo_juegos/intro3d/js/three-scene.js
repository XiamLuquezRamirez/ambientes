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
crearNube(-6.5, 4.2, -8, 1.5);
crearNube(5.8, 3.6, -10, 1.8);
crearNube(0.5, 4.8, -12, 1.2);

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

[-7.5, -3.2, 2.8, 7.1].forEach((x, i) => {
    const colina = new THREE.Mesh(
        new THREE.SphereGeometry(2.4 + (i % 2) * 0.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
            color: i % 2 ? 0x5f9a4d : 0x6eab58,
            roughness: 1
        })
    );
    colina.position.set(x, -1.05, -7.5 - (i % 3));
    colina.scale.set(1.4, 0.55, 1.1);
    colina.receiveShadow = true;
    scene.add(colina);
});

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
    }

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
