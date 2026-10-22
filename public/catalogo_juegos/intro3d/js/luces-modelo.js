/**
 * Relleno para Zeus/Zoe fuera del aula (demo, partida y victoria).
 * El aula se ilumina con las luces del GLB; estas escenas no las traen.
 * En three r180 el difuso se divide por PI: sin ambiente el modelo queda oscuro.
 */
import * as THREE from "three";

export function agregarLucesModelo(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 1.85));
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0xc5d0dc, 0.5));

    const frente = new THREE.DirectionalLight(0xfff8f0, 2.4);
    frente.position.set(1.6, 3.6, 4.2);
    scene.add(frente);

    const relleno = new THREE.DirectionalLight(0xe7eeff, 1.05);
    relleno.position.set(-2.8, 2.1, 1.5);
    scene.add(relleno);
}
