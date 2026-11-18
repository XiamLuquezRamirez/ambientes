/**
 * NaveSprites — la nave espacial de Zeus en 3D (window.NaveSprites).
 *
 * Modelo three.js hecho a mano (no hay una nave reutilizable en el proyecto): fuselaje torneado naranja y blanco,
 * alas en flecha, aleta, toberas con anillo de luz, luces en las puntas y una cúpula de cristal. Dentro de la cabina
 * va Zeus: el mismo nino.glb de la intro, en su pose de reposo ("Quieto"), con el cuerpo escondido en el fuselaje.
 *
 * La nave se renderiza UNA vez, con una cámara ortográfica que tiene la misma inclinación que el tablero isométrico
 * (el suelo se ve con razón alto/ancho 0,5625 → elevación ≈ 34°), en 32 rumbos. Phaser usa esas 32 vistas como
 * cuadros de una hoja de sprites y elige la del rumbo en que se mueve la nave: el volumen, las luces y Zeus se ven en
 * 3D de verdad sin un segundo motor corriendo durante la partida.
 *
 *   window.NaveSprites = { canvas, cuadros, tam, columnas, pxPorUnidad, celdasPorUnidad, conZeus }
 *   evento "nave-sprites-listos" en window cuando está listo.
 * Si no hay WebGL, no se publica nada y la escena dibuja su nave 2D de respaldo.
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { agregarLucesModelo } from "../../intro3d/js/luces-modelo.js";

const URL_ZEUS = new URL("../../intro3d/models/nino.glb", import.meta.url).href;
const CUADROS = 32;
const COLUMNAS = 8;
const TAM = 200;
const MEDIO = 1.75;          // medio ancho del encuadre ortográfico (unidades del modelo)
const ELEV = Math.asin(0.5625);
const CELDAS_POR_UNIDAD = 0.4;   // nave más pequeña: cabe holgada en el camino

function webgl() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

function mat(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.42, metalness: 0.25 }, extra || {}));
}

/** La nave: el frente mira a +x; el suelo es el plano x-z. */
function crearNave() {
    const nave = new THREE.Group();
    const naranja = mat(0xff7a1a, { roughness: 0.35 });
    const blanco = mat(0xf8fafc, { roughness: 0.3, metalness: 0.15 });
    const azul = mat(0x2563eb, { roughness: 0.3, metalness: 0.4 });
    const metal = mat(0x94a3b8, { roughness: 0.25, metalness: 0.85 });
    const luzCian = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 2.4 });
    const luzNaranja = new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xff8a00, emissiveIntensity: 2.6 });

    // fuselaje torneado (perfil de la punta a la cola, girado sobre el eje x)
    const perfil = [];
    const pts = [[1.28, 0], [1.2, 0.17], [1.02, 0.33], [0.7, 0.45], [0.2, 0.5], [-0.4, 0.48], [-0.85, 0.4], [-1.05, 0.33], [-1.08, 0]];
    pts.forEach(function (p) { perfil.push(new THREE.Vector2(p[1], p[0])); });
    const cuerpoGeo = new THREE.LatheGeometry(perfil, 40);
    cuerpoGeo.rotateZ(-Math.PI / 2);
    const cuerpo = new THREE.Mesh(cuerpoGeo, blanco);
    nave.add(cuerpo);

    // franja naranja y punta naranja
    const franja = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.49, 0.36, 40, 1, true), naranja);
    franja.rotation.z = Math.PI / 2;
    franja.position.x = -0.42;
    nave.add(franja);
    const puntaPerfil = [[1.29, 0], [1.2, 0.175], [1.02, 0.335], [0.92, 0.37]].map(function (p) { return new THREE.Vector2(p[1] + 0.006, p[0]); });
    const puntaGeo = new THREE.LatheGeometry(puntaPerfil, 40);
    puntaGeo.rotateZ(-Math.PI / 2);
    nave.add(new THREE.Mesh(puntaGeo, naranja));

    // alas en flecha
    const ala = new THREE.Shape();
    ala.moveTo(0.35, 0);
    ala.lineTo(-0.55, 0.95);
    ala.lineTo(-0.95, 0.98);
    ala.lineTo(-0.85, 0);
    ala.closePath();
    const alaGeo = new THREE.ExtrudeGeometry(ala, { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    alaGeo.rotateX(Math.PI / 2);
    [1, -1].forEach(function (lado) {
        const a = new THREE.Mesh(alaGeo, naranja);
        a.scale.z = lado;
        a.position.set(0, -0.1, 0.25 * lado);
        if (lado < 0) a.position.y = -0.03;
        nave.add(a);
        // luz en la punta del ala
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), lado > 0 ? luzCian : luzNaranja);
        l.position.set(-0.75, -0.08, 1.22 * lado);
        nave.add(l);
        // franja azul en el ala
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), azul);
        fr.position.set(-0.45, -0.05, 0.72 * lado);
        fr.rotation.y = -0.75 * lado;
        nave.add(fr);
    });

    // aleta de cola
    const aleta = new THREE.Shape();
    aleta.moveTo(-0.3, 0);
    aleta.lineTo(-0.85, 0.62);
    aleta.lineTo(-1.08, 0.62);
    aleta.lineTo(-1.0, 0);
    aleta.closePath();
    const aletaGeo = new THREE.ExtrudeGeometry(aleta, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
    const cola = new THREE.Mesh(aletaGeo, naranja);
    cola.position.set(0, 0.32, -0.03);
    nave.add(cola);

    // tobera con anillo de luz
    const tobera = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.26, 32), metal);
    tobera.rotation.z = Math.PI / 2;
    tobera.position.x = -1.18;
    nave.add(tobera);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.055, 12, 32), luzNaranja);
    anillo.rotation.y = Math.PI / 2;
    anillo.position.x = -1.32;
    nave.add(anillo);
    const nucleo = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32), luzCian);
    nucleo.rotation.y = -Math.PI / 2;
    nucleo.position.x = -1.31;
    nave.add(nucleo);

    // propulsores laterales
    [1, -1].forEach(function (lado) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 20), metal);
        p.rotation.z = Math.PI / 2;
        p.position.set(-0.86, -0.12, 0.55 * lado);
        nave.add(p);
        const lp = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), luzNaranja);
        lp.rotation.y = -Math.PI / 2;
        lp.position.set(-1.08, -0.12, 0.55 * lado);
        nave.add(lp);
    });

    // ventanillas
    [0.75, 0.45].forEach(function (x) {
        [1, -1].forEach(function (lado) {
            const v = new THREE.Mesh(new THREE.CircleGeometry(0.07, 18), luzCian);
            v.position.set(x, 0.05, (lado > 0 ? 0.47 : -0.47) - (x - 0.45) * 0.12 * lado);
            v.rotation.y = lado > 0 ? 0 : Math.PI;
            nave.add(v);
        });
    });

    // aro de la cabina
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.06, 12, 40), azul);
    aro.rotation.x = Math.PI / 2;
    aro.position.set(0.12, 0.36, 0);
    nave.add(aro);

    // cúpula de cristal (se agrega al final: es transparente)
    const cupula = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, emissive: 0x0c4a6e, emissiveIntensity: 0.25, depthWrite: false })
    );
    cupula.scale.set(1.08, 1.0, 1);
    cupula.position.set(0.12, 0.36, 0);
    cupula.renderOrder = 5;
    nave.add(cupula);
    const brillo = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })
    );
    brillo.scale.set(1.4, 0.5, 0.7);
    brillo.position.set(0.2, 0.72, 0.18);
    brillo.renderOrder = 6;
    nave.add(brillo);

    return nave;
}

/** Piloto de respaldo (si nino.glb no carga): casco con visor. */
function pilotoSimple() {
    const g = new THREE.Group();
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), mat(0xf2c6a0, { roughness: 0.6 }));
    cabeza.position.set(0.12, 0.56, 0);
    g.add(cabeza);
    const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7c4a1e, { roughness: 0.8 }));
    pelo.position.set(0.1, 0.58, 0);
    pelo.rotation.z = 0.25;
    g.add(pelo);
    return g;
}

function cargarZeus(maxMs) {
    return new Promise(function (resolve) {
        let hecho = false;
        const fin = function (v) {
            if (hecho) return;
            hecho = true;
            resolve(v);
        };
        setTimeout(function () { fin(null); }, maxMs);
        try {
            crearCargadorGltf().load(URL_ZEUS, fin, undefined, function () { fin(null); });
        } catch (e) {
            fin(null);
        }
    });
}

/** Zeus sentado en la cabina: pose de reposo, mirando al frente de la nave, el cuerpo dentro del fuselaje. */
function zeusEnCabina(gltf) {
    const modelo = gltf.scene;
    const animaciones = gltf.animations || [];
    const quieto = animaciones.filter(function (c) { return c.name === "Quieto"; })[0] || animaciones[0];
    if (quieto) {
        const mixer = new THREE.AnimationMixer(modelo);
        mixer.clipAction(quieto).play();
        mixer.update(0.4);
    }
    modelo.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(modelo);
    const alto = Math.max(0.01, caja.max.y - caja.min.y);
    const escala = 1.02 / alto;
    modelo.scale.setScalar(escala);
    modelo.rotation.y = Math.PI / 2;      // de mirar a +z a mirar a +x
    const grupo = new THREE.Group();
    grupo.add(modelo);
    // los hombros quedan a la altura del aro de la cabina; la cabeza dentro de la cúpula
    modelo.position.set(0.1, 0.36 - (caja.min.y * escala) - 0.8 * 1.02 + 0.06, 0);
    modelo.traverse(function (o) {
        if (o.isMesh) o.frustumCulled = false;
    });
    return grupo;
}

async function generar() {
    if (!webgl()) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(TAM, TAM, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    agregarLucesModelo(scene);
    const calida = new THREE.PointLight(0xff9a3c, 1.4, 6);
    calida.position.set(-2.2, 0.4, 0);
    scene.add(calida);
    const fria = new THREE.DirectionalLight(0x9ad8ff, 0.8);
    fria.position.set(-1, 2, -3);
    scene.add(fria);

    const camera = new THREE.OrthographicCamera(-MEDIO, MEDIO, MEDIO, -MEDIO, 0.1, 40);
    const d = 12;
    camera.position.set(Math.cos(ELEV) * d / Math.SQRT2, Math.sin(ELEV) * d, Math.cos(ELEV) * d / Math.SQRT2);
    camera.lookAt(0, 0, 0);

    const pivote = new THREE.Group();
    const nave = crearNave();
    pivote.add(nave);
    scene.add(pivote);

    const gltf = await cargarZeus(9000);
    let conZeus = false;
    if (gltf) {
        try {
            nave.add(zeusEnCabina(gltf));
            conZeus = true;
        } catch (e) {
            console.warn("[NaveSprites] Zeus no entró en la cabina", e);
            nave.add(pilotoSimple());
        }
    } else {
        nave.add(pilotoSimple());
    }
    // la cúpula transparente se pinta después de Zeus
    nave.children.sort(function (a, b) { return (a.renderOrder || 0) - (b.renderOrder || 0); });

    const filas = Math.ceil(CUADROS / COLUMNAS);
    const hoja = document.createElement("canvas");
    hoja.width = TAM * COLUMNAS;
    hoja.height = TAM * filas;
    const ctx = hoja.getContext("2d");
    for (let k = 0; k < CUADROS; k++) {
        const rumbo = k / CUADROS * Math.PI * 2;   // rumbo en el plano (x = columna, z = fila)
        pivote.rotation.y = -rumbo;
        renderer.render(scene, camera);
        ctx.drawImage(renderer.domElement, (k % COLUMNAS) * TAM, Math.floor(k / COLUMNAS) * TAM);
    }
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) { /* noop */ }

    window.NaveSprites = {
        canvas: hoja,
        cuadros: CUADROS,
        tam: TAM,
        columnas: COLUMNAS,
        pxPorUnidad: TAM / (MEDIO * 2),
        celdasPorUnidad: CELDAS_POR_UNIDAD,
        conZeus: conZeus
    };
    window.dispatchEvent(new CustomEvent("nave-sprites-listos"));
}

generar().catch(function (e) { console.warn("[NaveSprites]", e); });
