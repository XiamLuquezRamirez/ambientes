/**
 * recorrido3d/vegetacion.js — Árboles, arbustos, flores, rocas, montañas y lago.
 * Módulo de decoración estática. Recibe la escena y un objeto `deps` con los
 * datos y funciones del terreno que necesita (no escribe estado que otros lean).
 *
 * deps = {
 *   TAM, ZONA_LIMPIA, lagoRadio,
 *   lagoCentro, casaInicioCentro, zonaJuegosCentro,  // zonas a evitar
 *   distanciaAlCamino(x,z), alturaTerreno(x,z),      // del sistema de terreno
 *   centroFallback,                                  // centro del lago si no hay lagoCentro
 * }
 */
import * as THREE from 'three';

const TONOS = ['#3f7a4b', '#4b8c57', '#356b41', '#5a9c63', '#2f6b3f'];

function pino(x, y, z, tint) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: '#6b4f2a', roughness: 1, flatShading: true }));
    tronco.position.y = 0.7; tronco.castShadow = true; g.add(tronco);
    const capas = 2 + (Math.random() * 2 | 0);
    for (let c = 0; c < capas; c++) {
        const copa = new THREE.Mesh(new THREE.ConeGeometry(1.5 - c * 0.35, 1.6, 7),
            new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
        copa.position.y = 1.9 + c * 1.0; copa.castShadow = true; g.add(copa);
    }
    g.position.set(x, y, z); g.scale.setScalar(0.7 + Math.random() * 0.8); return g;
}

function frondoso(x, y, z, tint) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.6, 6),
        new THREE.MeshStandardMaterial({ color: '#7a5a30', roughness: 1, flatShading: true }));
    tronco.position.y = 0.8; tronco.castShadow = true; g.add(tronco);
    const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1),
        new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
    copa.position.y = 2.6; copa.castShadow = true; copa.scale.y = 0.9; g.add(copa);
    g.position.set(x, y, z); g.scale.setScalar(0.7 + Math.random() * 0.7); return g;
}

function arbusto(x, y, z, tint) {
    const g = new THREE.Group();
    for (let b = 0; b < 3; b++) {
        const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.3, 0),
            new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
        bola.position.set((Math.random() - .5) * 0.7, 0.4 + Math.random() * 0.2, (Math.random() - .5) * 0.7);
        bola.castShadow = true; g.add(bola);
    }
    g.position.set(x, y, z); return g;
}

function flor(x, y, z) {
    const g = new THREE.Group();
    const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4),
        new THREE.MeshStandardMaterial({ color: '#3f7a4b' }));
    tallo.position.y = 0.25; g.add(tallo);
    const colFlor = ['#f87171', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa'][Math.random() * 5 | 0];
    const petalos = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({ color: colFlor, roughness: .7 }));
    petalos.position.y = 0.55; g.add(petalos);
    g.position.set(x, y, z); return g;
}

function roca(x, y, z) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 0.6, 0),
        new THREE.MeshStandardMaterial({ color: '#8a8175', roughness: 1, flatShading: true }));
    m.position.set(x, y + 0.3, z); m.rotation.set(Math.random(), Math.random(), Math.random());
    m.castShadow = true; m.receiveShadow = true; return m;
}

// Lago/estanque azul decorativo, plano, junto al recorrido.
function construirLago(grupo, centro) {
    const lago = new THREE.Group();
    lago.position.set(centro.x, 0, centro.z);

    const orilla = new THREE.Mesh(new THREE.CircleGeometry(7.4, 40),
        (function () {
            const m = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 });
            m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m;
        })());
    orilla.rotation.x = -Math.PI / 2; orilla.position.y = 0.05; orilla.scale.set(1, 0.72, 1);
    orilla.receiveShadow = true; lago.add(orilla);

    function agua(radio, color, y, offset) {
        const m = new THREE.MeshStandardMaterial({
            color, roughness: 0.25, metalness: 0.0,
            emissive: new THREE.Color(color), emissiveIntensity: 0.18,
        });
        m.polygonOffset = true; m.polygonOffsetFactor = -2 - offset; m.polygonOffsetUnits = -4 - offset * 2;
        const malla = new THREE.Mesh(new THREE.CircleGeometry(radio, 40), m);
        malla.rotation.x = -Math.PI / 2; malla.position.y = y; malla.scale.set(1, 0.72, 1);
        return malla;
    }
    lago.add(agua(6.4, '#5fb3e6', 0.08, 0));
    lago.add(agua(4.6, '#3f9fe0', 0.10, 1));

    const brillo = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24),
        new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.35, depthWrite: false }));
    brillo.rotation.x = -Math.PI / 2; brillo.position.set(-2.0, 0.12, -1.4); brillo.scale.set(1, 0.5, 1);
    lago.add(brillo);

    grupo.add(lago);
}

// Puebla el paisaje: vegetación dispersa (evitando camino/lago/casa/carpa),
// anillo de montañas en el horizonte y el lago. Estático: no devuelve nada.
export function crearVegetacion(scene, deps) {
    const {
        TAM, ZONA_LIMPIA, lagoRadio,
        lagoCentro, casaInicioCentro, zonaJuegosCentro,
        distanciaAlCamino, alturaTerreno, centroFallback,
    } = deps;

    const grupo = new THREE.Group();
    scene.add(grupo);

    let intentos = 0, colocados = 0;
    while (colocados < 130 && intentos < 1400) {
        intentos++;
        const x = (Math.random() - 0.5) * TAM * 0.92, z = (Math.random() - 0.5) * TAM * 0.92;
        if (distanciaAlCamino(x, z) < ZONA_LIMPIA) continue;
        if (lagoCentro && Math.hypot(x - lagoCentro.x, z - lagoCentro.z) < lagoRadio) continue;
        if (casaInicioCentro && Math.hypot(x - casaInicioCentro.x, z - casaInicioCentro.z) < casaInicioCentro.r) continue;
        if (zonaJuegosCentro && Math.hypot(x - zonaJuegosCentro.x, z - zonaJuegosCentro.z) < zonaJuegosCentro.r) continue;
        const y = alturaTerreno(x, z);
        const tint = TONOS[(Math.random() * TONOS.length) | 0];
        const r = Math.random();
        let obj;
        if (r < 0.42) obj = pino(x, y, z, tint);
        else if (r < 0.62) obj = frondoso(x, y, z, tint);
        else if (r < 0.78) obj = arbusto(x, y, z, tint);
        else if (r < 0.90) obj = flor(x, y, z);
        else obj = roca(x, y, z);
        grupo.add(obj); colocados++;
    }

    // Montañas lejanas en el horizonte (anillo de conos con nieve, sin sombra).
    const matMonte = new THREE.MeshStandardMaterial({ color: '#5b7c6a', roughness: 1, flatShading: true });
    const matNieve = new THREE.MeshStandardMaterial({ color: '#e8eef2', roughness: 1, flatShading: true });
    const nMontes = 14, R = TAM * 0.62;
    for (let i = 0; i < nMontes; i++) {
        const ang = (i / nMontes) * Math.PI * 2 + Math.random() * 0.2;
        const mx = Math.cos(ang) * R, mz = Math.sin(ang) * R;
        const h = 16 + Math.random() * 14;
        const monte = new THREE.Mesh(new THREE.ConeGeometry(9 + Math.random() * 5, h, 6), matMonte);
        monte.position.set(mx, h / 2 - 2, mz); monte.rotation.y = Math.random(); grupo.add(monte);
        const nieve = new THREE.Mesh(new THREE.ConeGeometry(3.2, h * 0.28, 6), matNieve);
        nieve.position.set(mx, h - h * 0.14 - 2, mz); nieve.rotation.y = monte.rotation.y; grupo.add(nieve);
    }

    construirLago(grupo, lagoCentro || centroFallback);
}
