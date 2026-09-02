/**
 * recorrido3d/nubes.js — Nubes del cielo que derivan en bucle.
 * Módulo independiente: recibe THREE, la escena y el tamaño del terreno (TAM),
 * y devuelve un controlador con su propio estado interno.
 */
import * as THREE from 'three';

// Construye N nubes low-poly al fondo del cielo y devuelve { animar(dt) }.
export function crearNubes(scene, TAM) {
    const nubes = [];
    const grupo = new THREE.Group();
    scene.add(grupo);
    const matNube = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 1, flatShading: true,
        transparent: true, opacity: 0.95,
    });
    const N_NUBES = 10;
    for (let i = 0; i < N_NUBES; i++) {
        const nube = new THREE.Group();
        const bolas = 3 + (Math.random() * 3 | 0);
        for (let b = 0; b < bolas; b++) {
            const r = 1.4 + Math.random() * 1.6;
            const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), matNube);
            bola.position.set((b - bolas / 2) * 1.9 + (Math.random() - .5) * 1.1,
                (Math.random() - .5) * 0.9, (Math.random() - .5) * 1.6);
            bola.scale.y = 0.6;
            nube.add(bola);
        }
        const escala = 0.55 + Math.random() * 0.6;
        nube.scale.setScalar(escala);
        // Al fondo del cielo (Z negativo, lejos), a media altura, siempre detrás
        // del recorrido para no cruzar por delante del personaje/carretera.
        nube.position.set((Math.random() - 0.5) * TAM * 1.0,
            16 + Math.random() * 12,
            -TAM * 0.30 - Math.random() * TAM * 0.30);
        grupo.add(nube);
        nubes.push({ obj: nube, vel: 1.0 + Math.random() * 1.6 });
    }

    // Deriva horizontal en bucle infinito (reaparecen por el lado opuesto).
    function animar(dtSeg) {
        const limite = TAM * 0.6;
        for (const n of nubes) {
            n.obj.position.x += n.vel * dtSeg;
            if (n.obj.position.x > limite) n.obj.position.x = -limite;
        }
    }

    return { animar };
}
