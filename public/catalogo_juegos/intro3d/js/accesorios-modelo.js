/**
 * Accesorios para los modelos 3D de Zeus y Zoe (se enganchan a un hueso y siguen las animaciones).
 * ponerCareta: careta de buceo con tubo, para los mundos bajo el agua.
 * Los juegos la piden con window.PedniaAccesorioPj = "careta".
 */
/** Rectángulo de esquinas redondeadas (para el marco y el vidrio de la careta). */
function formaRedonda(THREE, w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
}

/**
 * Careta de buceo con visor, cinta y tubo: se mide con la cabeza del modelo (hueso «cabeza» y malla
 * «malla_cabeza_piel») y se engancha al hueso para que siga todas las animaciones.
 */
export function ponerCareta(THREE, malla) {
    if (!malla || malla.userData.careta) return;
    let piel = null, hueso = null;
    malla.traverse(function (n) { if (n.name === "malla_cabeza_piel") piel = n; if (n.isBone && n.name === "cabeza") hueso = n; });
    if (!piel || !hueso) return;
    // Se mide con el modelo sin mover (sin escala, giro ni posición) y luego se restituye.
    const pos0 = malla.position.clone(), rot0 = malla.quaternion.clone(), esc0 = malla.scale.clone();
    malla.position.set(0, 0, 0); malla.quaternion.identity(); malla.scale.set(1, 1, 1);
    malla.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(piel);
    const c = caja.getCenter(new THREE.Vector3());
    const ancho = caja.max.x - caja.min.x, alto = caja.max.y - caja.min.y, fondo = caja.max.z - caja.min.z;
    const g = new THREE.Group();
    const mat = function (color, op) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.45, metalness: 0.05 }, op || {})); };
    const aw = ancho * 0.94, ah = alto * 0.42, esp = ancho * 0.07;
    // Falda de goma oscura, marco de color y vidrio.
    const goma = new THREE.Mesh(new THREE.ExtrudeGeometry(formaRedonda(THREE, aw * 1.06, ah * 1.12, ah * 0.4), { depth: esp * 0.6, bevelEnabled: false }), mat(0x1c2733));
    goma.position.z = 0;
    const marcoForma = formaRedonda(THREE, aw, ah, ah * 0.38);
    marcoForma.holes.push(formaRedonda(THREE, aw * 0.86, ah * 0.74, ah * 0.3));
    const marco = new THREE.Mesh(new THREE.ExtrudeGeometry(marcoForma, { depth: esp, bevelEnabled: true, bevelSize: esp * 0.18, bevelThickness: esp * 0.18, bevelSegments: 2 }), mat(0x19b7ff));
    marco.position.z = esp * 0.5;
    const vidrio = new THREE.Mesh(new THREE.ShapeGeometry(formaRedonda(THREE, aw * 0.87, ah * 0.75, ah * 0.3)), new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0, depthWrite: false }));
    vidrio.position.z = esp * 1.55;
    const brillo = new THREE.Mesh(new THREE.PlaneGeometry(aw * 0.07, ah * 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    brillo.position.set(-aw * 0.26, ah * 0.04, esp * 1.6); brillo.rotation.z = 0.5;
    const puente = new THREE.Mesh(new THREE.BoxGeometry(aw * 0.1, ah * 0.2, esp * 0.8), mat(0x1c2733));
    puente.position.set(0, -ah * 0.52, esp * 0.5);
    g.add(goma, marco, vidrio, brillo, puente);
    // Cinta alrededor de la cabeza.
    const cinta = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 40), mat(0x1c2733));
    cinta.rotation.x = Math.PI / 2;
    cinta.scale.set(ancho * 0.5 * 1.04, fondo * 0.5 * 1.02, ah * 0.28);
    cinta.position.set(0, 0, -fondo * 0.5 - 0.005);
    g.add(cinta);
    // Tubo de buceo en el lado, con boquilla.
    const tubo = new THREE.Group();
    const caña = new THREE.Mesh(new THREE.CylinderGeometry(ancho * 0.028, ancho * 0.028, alto * 1.25, 12), mat(0xff922b));
    caña.position.y = alto * 0.55;
    const punta = new THREE.Mesh(new THREE.CylinderGeometry(ancho * 0.036, ancho * 0.036, alto * 0.14, 12), mat(0xffd43b));
    punta.position.y = alto * 1.2;
    const codo = new THREE.Mesh(new THREE.TorusGeometry(ancho * 0.05, ancho * 0.022, 8, 12, Math.PI / 2), mat(0xff922b));
    codo.rotation.z = Math.PI; codo.position.set(ancho * 0.05, -alto * 0.07, 0);
    tubo.add(caña, punta, codo);
    tubo.position.set(-aw * 0.58, -ah * 0.35, esp * 0.2);
    tubo.rotation.z = -0.12;
    g.add(tubo);
    // Colocación: al frente de la cara, a la altura de los ojos, y enganchada al hueso de la cabeza.
    g.position.set(c.x, c.y + alto * 0.02, caja.max.z - esp * 0.5);
    malla.add(g);
    hueso.attach(g);
    malla.userData.careta = true;
    malla.position.copy(pos0); malla.quaternion.copy(rot0); malla.scale.copy(esc0);
    malla.updateMatrixWorld(true);
}

