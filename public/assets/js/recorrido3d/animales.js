/**
 * recorrido3d/animales.js — Pez que salta en el lago + gaviotas que vuelan.
 * Módulo independiente: recibe THREE, la escena, el centro del lago y el flag
 * de equipo modesto; devuelve un controlador con { animar(now, dt) }.
 */
import * as THREE from 'three';

// Gaviota blanca low-poly (cuerpo fusiforme + dos alas que baten en "V").
function crearAve() {
    const g = new THREE.Group();
    const matAve = new THREE.MeshStandardMaterial({
        color: '#ffffff', roughness: .85, flatShading: true,
        emissive: new THREE.Color('#dfe9f5'), emissiveIntensity: .35,
    });
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.7, 4, 8), matAve);
    cuerpo.rotation.z = Math.PI / 2; g.add(cuerpo);
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), matAve);
    cabeza.position.x = 0.5; g.add(cabeza);
    const cola = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 3), matAve);
    cola.rotation.z = -Math.PI / 2; cola.position.x = -0.55; cola.scale.set(1, 1, 0.35); g.add(cola);
    const geoAla = new THREE.ConeGeometry(0.28, 1.25, 3);
    const hacerAla = (signo) => {
        const pivote = new THREE.Group();
        const ala = new THREE.Mesh(geoAla, matAve);
        ala.rotation.x = signo * Math.PI / 2;
        ala.scale.set(1.6, 1, 0.12);
        ala.position.z = signo * 0.62;
        pivote.add(ala);
        g.add(pivote);
        return pivote;
    };
    return { grupo: g, alaIzq: hacerAla(-1), alaDer: hacerAla(1) };
}

// Construye el pez del lago + las aves. Devuelve { animar(now, dt) }.
// Si no hay lago, el pez se omite (pero las aves igual vuelan).
export function crearAnimales(scene, lagoCentro, equipoModesto) {
    let pez = null, pezT = 0;
    const aves = [];

    if (lagoCentro) {
        pez = new THREE.Group();
        const matPez = new THREE.MeshStandardMaterial({ color: '#ff8c42', roughness: .5, flatShading: true });
        const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), matPez);
        cuerpo.scale.set(1.5, 0.8, 0.6); pez.add(cuerpo);
        const cola = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 4), matPez);
        cola.rotation.z = Math.PI / 2; cola.position.x = -0.85; cola.scale.set(1, 1, 0.5); pez.add(cola);
        const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshStandardMaterial({ color: '#111' }));
        ojo.position.set(0.45, 0.12, 0.28); pez.add(ojo);
        pez.position.copy(lagoCentro); pez.position.y = -1;
        pez.visible = false;
        scene.add(pez);
    }

    const N_AVES = equipoModesto ? 3 : 5;
    for (let i = 0; i < N_AVES; i++) {
        const a = crearAve();
        const radio = 22 + Math.random() * 26;
        const cx = (Math.random() - 0.5) * 40, cz = (Math.random() - 0.5) * 40;
        const alt = 20 + Math.random() * 12;
        const vel = 0.15 + Math.random() * 0.2;
        const fase = Math.random() * Math.PI * 2;
        a.grupo.scale.setScalar(0.9 + Math.random() * 0.6);
        scene.add(a.grupo);
        aves.push({ ...a, radio, cx, cz, alt, vel, fase, aleteo: 2.2 + Math.random() * 1.8 });
    }

    // Pez: ciclo ~4.5s, salta en arco ~1s. Aves: círculos + aleteo en "V".
    function animar(now, dtSeg) {
        if (pez && lagoCentro) {
            pezT += dtSeg;
            const CICLO = 4.5, SALTO = 1.05;
            const t = pezT % CICLO;
            if (t < SALTO) {
                const k = t / SALTO;
                pez.visible = true;
                const altura = Math.sin(k * Math.PI) * 2.2;
                pez.position.set(lagoCentro.x, 0.2 + altura, lagoCentro.z);
                pez.rotation.z = (k - 0.5) * 2.2;
                pez.rotation.y = now / 400;
            } else {
                pez.visible = false;
            }
        }
        for (const a of aves) {
            a.fase += a.vel * dtSeg;
            const x = a.cx + Math.cos(a.fase) * a.radio;
            const z = a.cz + Math.sin(a.fase) * a.radio;
            a.grupo.position.set(x, a.alt + Math.sin(a.fase * 2) * 1.5, z);
            a.grupo.rotation.y = -a.fase;
            a.grupo.rotation.z = Math.sin(a.fase) * 0.12;
            const flap = Math.sin(now / 1000 * a.aleteo * 6);
            a.alaIzq.rotation.x = -flap * 0.9;
            a.alaDer.rotation.x = flap * 0.9;
        }
    }

    return { animar };
}
