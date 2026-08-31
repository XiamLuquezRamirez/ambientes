/**
 * recorrido3d/fuegos.js — Fuegos pirotécnicos de la celebración final.
 * Módulo independiente con estado propio. `iniciar(posFin)` programa una salva
 * sobre la posición dada; `animar(dt)` mueve/desvanece las partículas.
 */
import * as THREE from 'three';

const COLORES = ['#ff4d4d', '#ffd24d', '#4dff88', '#4db8ff', '#e04dff', '#ff8f4d', '#ffffff'];

export function crearFuegos(scene) {
    const fuegos = [];
    let activos = false;

    // Explosión de partículas en (x,y,z): esferitas radiales con gravedad y fade.
    function lanzarExplosion(x, y, z) {
        const color = new THREE.Color(COLORES[(Math.random() * COLORES.length) | 0]);
        const nPart = 26 + (Math.random() * 14 | 0);
        const geo = new THREE.SphereGeometry(0.22, 6, 6);
        const grupo = new THREE.Group();
        grupo.position.set(x, y, z);
        scene.add(grupo);
        const parts = [];
        for (let i = 0; i < nPart; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: 1, depthWrite: false });
            const m = new THREE.Mesh(geo, mat);
            const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
            const spd = 6 + Math.random() * 7;
            const v = new THREE.Vector3(
                Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)
            ).multiplyScalar(spd);
            grupo.add(m);
            parts.push({ m, v });
        }
        fuegos.push({ grupo, parts, vida: 0, dur: 1.6 });
    }

    // Programa una salva sobre `posFin` (THREE.Vector3) durante unos segundos.
    function iniciar(posFin) {
        if (activos) return;
        activos = true;
        const base = posFin ? posFin.clone() : new THREE.Vector3(0, 0, 0);
        let lanzadas = 0;
        const total = 14;
        const salva = () => {
            if (!activos || lanzadas >= total) return;
            lanzadas++;
            const ex = base.x + 4 + (Math.random() - 0.5) * 18;
            const ey = 12 + Math.random() * 8;
            const ez = base.z + (Math.random() - 0.5) * 18;
            lanzarExplosion(ex, ey, ez);
            setTimeout(salva, 350 + Math.random() * 300);
        };
        salva();
        setTimeout(() => { activos = false; }, 7000);
    }

    function animar(dtSeg) {
        if (!fuegos.length) return;
        const G = 9;
        for (let i = fuegos.length - 1; i >= 0; i--) {
            const f = fuegos[i];
            f.vida += dtSeg;
            const k = f.vida / f.dur;
            for (const p of f.parts) {
                p.v.y -= G * dtSeg;
                p.m.position.addScaledVector(p.v, dtSeg);
                p.m.material.opacity = Math.max(0, 1 - k);
            }
            if (f.vida >= f.dur) {
                scene.remove(f.grupo);
                f.parts.forEach(p => p.m.material.dispose());
                fuegos.splice(i, 1);
            }
        }
    }

    return { iniciar, animar };
}
