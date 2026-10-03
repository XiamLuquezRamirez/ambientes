/**
 * Mundo del kiosco armado como el kit de proyecto_mapa:
 * cada GLB se carga una vez y se coloca con instancias según mapa.json.
 * La fauna (04_/05_) va clonada para poder animarla.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();
const paleta = new Map();
const SIN_SOMBRA = /terreno|camino|agua|orilla/;
const esVivo = (ruta) => /^0[45]_/.test(ruta);
const Y = new THREE.Vector3(0, 1, 0);
const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

const TIPOS = {
    conejo: { vel: 2.6, radio: 9, espera: [1, 4], salto: 0.35 },
    zorro: { vel: 2.4, radio: 14, espera: [1, 4] },
    oveja: { vel: 0.8, radio: 5, espera: [3, 7], pasta: true },
    vaca_cebu: { vel: 0.55, radio: 6, espera: [4, 9], pasta: true },
    burro: { vel: 0.85, radio: 7, espera: [2, 6], pasta: true },
    gallina: { vel: 1.3, radio: 4, espera: [1, 3] },
    iguana: { vel: 0.4, radio: 3, espera: [2, 6] },
    garza: { vel: 0.45, radio: 4, espera: [2, 5] },
};

function baseModelos() {
    return new URL('../modelos/', import.meta.url);
}

function cargarModelo(ruta) {
    if (!cache.has(ruta)) {
        const url = new URL(`${ruta}.glb`, baseModelos()).href;
        cache.set(ruta, loader.loadAsync(url).then((gltf) => {
            const root = gltf.scene;
            root.updateMatrixWorld(true);
            const partes = [];
            root.traverse((o) => {
                if (!o.isMesh) return;
                const key = o.material.map ? `${o.material.name}@${ruta}` : o.material.name;
                if (!paleta.has(key)) {
                    o.material.flatShading = true;
                    o.material.needsUpdate = true;
                    paleta.set(key, o.material);
                }
                o.material = paleta.get(key);
                partes.push({
                    nombre: o.name,
                    geometry: o.geometry,
                    material: o.material,
                    local: o.matrixWorld.clone(),
                });
            });
            return { ruta, partes, root, animations: gltf.animations || [] };
        }));
    }
    return cache.get(ruta);
}

const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _s = new THREE.Vector3();

function esEstructuraCamino(nombre) {
    return nombre === 'suelo' || nombre === 'borde' || nombre === 'adoquines';
}

function esAdornoSuelto(ruta) {
    return !/terreno_tile|camino_recto|camino_curvo|07_casas_tematicas|10_edificios|\/lago|\/nube/.test(String(ruta || ''));
}

function esEstorboEntrada(ruta) {
    return /03_flores|\/arbusto|\/roca/.test(String(ruta || ''));
}

class Constructor {
    constructor(scene) {
        this.scene = scene;
        this.lotes = new Map();
        this.arboles = [];
        this.flores = [];
        this.farolas = [];
        this.sueltos = [];
        this.estorbos = [];
        this.adornosCamino = [];
    }

    reservar(modelo, n) {
        const meshes = modelo.partes.map((p) => {
            const im = new THREE.InstancedMesh(p.geometry, p.material, n);
            im.name = `${modelo.ruta}/${p.nombre}`;
            im.count = 0;
            im.frustumCulled = false;
            im.receiveShadow = true;
            im.castShadow = !SIN_SOMBRA.test(modelo.ruta + p.material.name);
            this.scene.add(im);
            return im;
        });
        this.lotes.set(modelo.ruta, { partes: modelo.partes, meshes, count: 0 });
    }

    colocar(modelo, { p, r = 0, s = 1, sx, sy, sz }) {
        const lote = this.lotes.get(modelo.ruta);
        const pos = new THREE.Vector3(p[0], p[1], p[2]);
        const quat = new THREE.Quaternion().setFromAxisAngle(Y, r);
        _m.compose(pos, quat, _s.set(sx ?? s, sy ?? s, sz ?? s));
        const i = lote.count++;
        lote.partes.forEach((pt, j) => {
            lote.meshes[j].setMatrixAt(i, _t.multiplyMatrices(_m, pt.local));
        });
        if (String(modelo.ruta).includes('03_flores')) {
            this.flores.push({ ruta: modelo.ruta, i, x: p[0], z: p[2] });
        }
        if (/camino_recto|camino_curvo/.test(modelo.ruta)) {
            const mundo = new THREE.Vector3();
            lote.partes.forEach((pt, j) => {
                if (esEstructuraCamino(pt.nombre)) return;
                mundo.setFromMatrixPosition(pt.local).applyMatrix4(_m);
                this.adornosCamino.push({ mesh: lote.meshes[j], i, x: mundo.x, z: mundo.z });
            });
        }
        return i;
    }

    despejarLista(lista, muestras, radio) {
        const cero = new THREE.Matrix4().makeScale(0, 0, 0);
        const r2 = radio * radio;
        const tocados = new Set();
        lista.forEach((a) => {
            for (let k = 0; k < muestras.length; k++) {
                const dx = a.x - muestras[k][0];
                const dz = a.z - muestras[k][1];
                if (dx * dx + dz * dz >= r2) continue;
                const lote = this.lotes.get(a.ruta);
                if (!lote) return;
                lote.meshes.forEach((m) => m.setMatrixAt(a.i, cero));
                tocados.add(a.ruta);
                return;
            }
        });
        tocados.forEach((ruta) => {
            const lote = this.lotes.get(ruta);
            if (!lote) return;
            lote.meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
        });
    }

    despejarArboles(muestras, radio) {
        this.despejarLista(this.arboles, muestras, radio);
    }

    despejarFlores(muestras, radio) {
        this.despejarLista(this.flores, muestras, radio);
    }

    /** Flores, arbustos y cualquier otro modelo suelto, más las flores del propio GLB del camino. */
    despejarEntrada(muestras, radio) {
        this.despejarLista(this.sueltos, muestras, radio);
        this.despejarLista(this.arboles, muestras, radio);
        const r2 = radio * radio;
        const meshes = new Set();
        const cero = new THREE.Matrix4().makeScale(0, 0, 0);
        this.adornosCamino.forEach((a) => {
            if (a.oculto) return;
            for (let k = 0; k < muestras.length; k++) {
                const dx = a.x - muestras[k][0];
                const dz = a.z - muestras[k][1];
                if (dx * dx + dz * dz >= r2) continue;
                if (a.mesh) {
                    a.mesh.setMatrixAt(a.i, cero);
                    meshes.add(a.mesh);
                } else if (a.o) a.o.visible = false;
                a.oculto = true;
                return;
            }
        });
        meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    }

    /**
     * Solo flores, arbustos y piedras. Las flores y arbustos del GLB del camino
     * entran también: no son el suelo ni el borde.
     */
    quitarEstorbos(muestras, radio) {
        this.despejarLista(this.estorbos, muestras, radio);
        const r2 = radio * radio;
        const meshes = new Set();
        const cero = new THREE.Matrix4().makeScale(0, 0, 0);
        const centroFlor = new THREE.Vector3();
        const cajaFlor = new THREE.Box3();
        this.adornosCamino.forEach((a) => {
            if (a.oculto) return;
            if (a.o && a.o.geometry) {
                a.o.geometry.boundingBox = null;
                a.o.geometry.computeBoundingBox();
                a.o.updateWorldMatrix(true, false);
                cajaFlor.setFromObject(a.o);
                if (!cajaFlor.isEmpty()) {
                    cajaFlor.getCenter(centroFlor);
                    a.x = centroFlor.x;
                    a.z = centroFlor.z;
                }
            }
            for (let k = 0; k < muestras.length; k++) {
                const dx = a.x - muestras[k][0];
                const dz = a.z - muestras[k][1];
                if (dx * dx + dz * dz >= r2) continue;
                if (a.mesh) {
                    a.mesh.setMatrixAt(a.i, cero);
                    meshes.add(a.mesh);
                } else if (a.o) a.o.visible = false;
                a.oculto = true;
                return;
            }
        });
        meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    }

    cerrar() {
        this.lotes.forEach((l) => {
            l.meshes.forEach((m) => {
                m.count = l.count;
                m.instanceMatrix.needsUpdate = true;
            });
        });
    }

    destruir() {
        this.lotes.forEach((l) => {
            l.meshes.forEach((m) => {
                this.scene.remove(m);
            });
        });
        this.lotes.clear();
    }
}

class Fauna {
    constructor(scene, mapa) {
        this.scene = scene;
        this.lista = [];
        this.bandadas = new Map();
        this.h = mapa.alturas;
        this.obstaculos = [];
        this.lagos = [];
        for (const paso of mapa.pasos) {
            for (const e of paso.elementos) {
                if (e.m.includes('lago')) {
                    this.lagos.push({ x: e.p[0], z: e.p[2], y: e.p[1], r: 5 * e.s });
                    this.obstaculos.push([e.p[0], e.p[2], 5.4 * e.s]);
                } else if (/07_casas_tematicas|10_edificios|casa|carpa/.test(e.m)) {
                    this.obstaculos.push([e.p[0], e.p[2], 5.2 * (e.s || 1)]);
                } else if (/canaguate|mango|ceiba|palma_coco|platanera|cardon|roca|tronco|tocon|banca|farola|marcador|valla/.test(e.m)) {
                    this.obstaculos.push([e.p[0], e.p[2], 0.6 * e.s]);
                }
            }
        }
    }

    altura(x, z) {
        const { min, paso, n, datos } = this.h;
        const fx = Math.min(n - 1.001, Math.max(0, (x - min) / paso));
        const fz = Math.min(n - 1.001, Math.max(0, (z - min) / paso));
        const i = Math.floor(fx);
        const j = Math.floor(fz);
        const u = fx - i;
        const v = fz - j;
        const d = (a, b) => datos[b * n + a];
        return (d(i, j) * (1 - u) + d(i + 1, j) * u) * (1 - v)
            + (d(i, j + 1) * (1 - u) + d(i + 1, j + 1) * u) * v;
    }

    libre(x, z) {
        for (const [cx, cz, r] of this.obstaculos) {
            if (Math.hypot(x - cx, z - cz) < r) return false;
        }
        return Math.hypot(x, z) < 122;
    }

    agregar(modelo, e) {
        const o = modelo.root.clone(true);
        o.traverse((c) => { if (c.isMesh) c.castShadow = true; });
        const [x, y, z] = e.p;
        o.position.set(x, y, z);
        o.rotation.y = e.r;
        o.scale.setScalar(e.s);
        this.scene.add(o);
        const nombre = e.m.split('/')[1].replace(/_v\d+$/, '');
        const a = {
            o, nombre, s: e.s, x, y, z, yaw: e.r, casaX: x, casaZ: z,
            tx: x, tz: z, espera: rnd(0, 3), fase: rnd(0, 10),
            cabeza: o.getObjectByName('cabeza'),
            alaI: o.getObjectByName('ala_izq'),
            alaD: o.getObjectByName('ala_der'),
        };
        if (nombre.startsWith('ave_') || nombre === 'guacamaya') {
            const k = `${e.m}|${e.r}`;
            if (!this.bandadas.has(k)) {
                this.bandadas.set(k, {
                    cx: x, cz: z, y,
                    radio: rnd(22, 38),
                    vel: rnd(0.07, 0.12) * (Math.random() < 0.5 ? -1 : 1),
                    fase: rnd(0, 6),
                });
            }
            a.bandada = this.bandadas.get(k);
            a.off = new THREE.Vector3(x - a.bandada.cx, y - a.bandada.y, z - a.bandada.cz);
        }
        if (nombre === 'pato' && this.lagos.length) {
            const lago = this.lagos.reduce((b, l) => (
                !b || Math.hypot(l.x - x, l.z - z) < Math.hypot(b.x - x, b.z - z) ? l : b
            ), null);
            a.lago = lago;
            a.radio = Math.hypot(x - lago.x, z - lago.z);
            a.ang = Math.atan2(z - lago.z, x - lago.x);
        }
        this.lista.push(a);
    }

    ocultarEn(muestras, radio) {
        const r2 = radio * radio;
        this.lista.forEach((a) => {
            if (a.fijo) return;
            for (let k = 0; k < muestras.length; k++) {
                const dx = a.x - muestras[k][0];
                const dz = a.z - muestras[k][1];
                if (dx * dx + dz * dz >= r2) continue;
                a.o.visible = false;
                a.fijo = true;
                return;
            }
        });
    }

    update(dt, t) {
        for (const a of this.lista) {
            if (a.fijo) continue;
            const T = TIPOS[a.nombre];
            if (T) this.caminar(a, T, dt);
            else if (a.bandada) this.volar(a, t);
            else if ((a.nombre === 'pato' || a.nombre.startsWith('pez_')) && a.lago) this.nadar(a, dt, t);
            else if (a.nombre === 'mariposa') this.revolotear(a, t);
        }
    }

    caminar(a, T, dt) {
        const dx = a.tx - a.x;
        const dz = a.tz - a.z;
        const d = Math.hypot(dx, dz);
        let moviendo = false;
        if (a.espera > 0) a.espera -= dt;
        else if (d < 0.3) {
            a.espera = rnd(...T.espera);
            for (let k = 0; k < 8; k++) {
                const an = rnd(0, Math.PI * 2);
                const r = rnd(2, T.radio);
                const nx = a.casaX + Math.cos(an) * r;
                const nz = a.casaZ + Math.sin(an) * r;
                if (this.libre(nx, nz)) { a.tx = nx; a.tz = nz; break; }
            }
        } else {
            moviendo = true;
            a.yaw += angDiff(a.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 5);
            const paso = Math.min(d, T.vel * dt);
            const nx = a.x + Math.sin(a.yaw) * paso;
            const nz = a.z + Math.cos(a.yaw) * paso;
            if (this.libre(nx, nz)) { a.x = nx; a.z = nz; }
            else { a.tx = a.x; a.tz = a.z; }
        }
        a.fase += dt * (moviendo ? 9 : 2);
        let y = this.altura(a.x, a.z) - 0.03;
        if (moviendo) y += Math.abs(Math.sin(a.fase)) * (T.salto || 0.04);
        a.o.position.set(a.x, y, a.z);
        a.o.rotation.y = a.yaw;
        if (a.cabeza && T.pasta) {
            const bajar = !moviendo && Math.sin(a.fase * 0.4) > 0 ? 0.9 : 0;
            a.cabeza.rotation.x = THREE.MathUtils.lerp(a.cabeza.rotation.x, bajar, Math.min(1, dt * 4));
        }
    }

    volar(a, t) {
        const b = a.bandada;
        const ang = t * b.vel + b.fase;
        const cx = b.cx + Math.cos(ang) * b.radio - b.radio;
        const cz = b.cz + Math.sin(ang) * b.radio;
        a.o.position.set(cx + a.off.x, b.y + a.off.y + Math.sin(t * 1.5 + a.fase) * 0.6, cz + a.off.z);
        a.o.rotation.y = Math.atan2(-Math.sin(ang) * b.vel, Math.cos(ang) * b.vel);
        this.aletear(a, Math.sin(t * 12 + a.fase) * 0.8);
    }

    nadar(a, dt, t) {
        a.ang += dt * 0.35 / Math.max(1.5, a.radio);
        const x = a.lago.x + Math.cos(a.ang) * a.radio;
        const z = a.lago.z + Math.sin(a.ang) * a.radio;
        const superficie = a.nombre.startsWith('pez_') ? a.lago.y - 0.02 : a.lago.y + 0.08;
        a.o.position.set(x, superficie + Math.sin(t * 2 + a.fase) * 0.03, z);
        a.o.rotation.y = Math.atan2(-Math.sin(a.ang), Math.cos(a.ang));
        a.o.rotation.z = Math.sin(t * 1.7 + a.fase) * 0.06;
    }

    revolotear(a, t) {
        const k = t * 0.7 + a.fase;
        const x = a.casaX + Math.cos(k) * 1.6 + Math.sin(k * 2.3) * 0.5;
        const z = a.casaZ + Math.sin(k) * 1.6;
        a.o.position.set(x, this.altura(x, z) + 1 + Math.sin(t * 3 + a.fase) * 0.35, z);
        a.o.rotation.y = Math.atan2(-Math.sin(k), Math.cos(k));
        this.aletear(a, Math.sin(t * 22 + a.fase) * 1.1);
    }

    aletear(a, v) {
        if (a.alaI) a.alaI.rotation.z = v;
        if (a.alaD) a.alaD.rotation.z = -v;
    }

    destruir() {
        this.lista.forEach((a) => this.scene.remove(a.o));
        this.lista = [];
        this.bandadas.clear();
    }
}

/** Eje del sendero guardado en mapa.json (el GLB único del camino ya no está en el kit). */
function curvaDesdePuntos(puntos) {
    if (!Array.isArray(puntos) || puntos.length < 2) return null;
    const verts = puntos.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.CatmullRomCurve3(verts, false, 'catmullrom', 0.2);
}

function materialNombrado(modelo, nombre) {
    let hallado = null;
    modelo.root.traverse((o) => {
        if (hallado || !o.isMesh || !o.material) return;
        if (o.material.name === nombre) hallado = o.material;
    });
    return hallado;
}

function tablaArco(curva) {
    const n = 500;
    const tabla = [];
    let prev = curva.getPoint(0);
    let acc = 0;
    tabla.push({ d: 0, p: prev.clone() });
    for (let i = 1; i <= n; i++) {
        const p = curva.getPoint(i / n);
        acc += p.distanceTo(prev);
        tabla.push({ d: acc, p: p.clone() });
        prev = p;
    }
    return tabla;
}

function muestraEn(tabla, dist) {
    const ultimo = tabla[tabla.length - 1];
    if (dist <= 0) {
        return { p: tabla[0].p.clone(), tan: tabla[1].p.clone().sub(tabla[0].p) };
    }
    if (dist >= ultimo.d) {
        const a = tabla[tabla.length - 2];
        return { p: ultimo.p.clone(), tan: ultimo.p.clone().sub(a.p) };
    }
    let lo = 0;
    let hi = tabla.length - 1;
    while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (tabla[mid].d < dist) lo = mid;
        else hi = mid;
    }
    const a = tabla[lo];
    const b = tabla[hi];
    const t = (dist - a.d) / Math.max(1e-6, b.d - a.d);
    return { p: a.p.clone().lerp(b.p, t), tan: b.p.clone().sub(a.p) };
}

/**
 * Cinta continua bajo los tramos. camino_recto mide 10 m (de -5 a +5)
 * y en un giro el borde exterior no llega a juntarse: la cinta tapa ese hueco.
 */
function armarCintaCamino(scene, modelo, curva) {
    const tabla = tablaArco(curva);
    const largoCurva = tabla[tabla.length - 1].d;
    const grupo = new THREE.Group();
    grupo.name = 'camino';
    const material = materialNombrado(modelo, 'camino');
    const medio = 2.7;
    const ySuelo = 0.16;
    const pasos = Math.max(32, Math.ceil(largoCurva / 0.7));
    const pos = [];
    const idx = [];
    for (let i = 0; i <= pasos; i++) {
        const m = muestraEn(tabla, (largoCurva * i) / pasos);
        const tan = m.tan.clone();
        tan.y = 0;
        if (tan.lengthSq() < 1e-8) tan.set(0, 0, 1);
        tan.normalize();
        const der = new THREE.Vector3(tan.z, 0, -tan.x);
        pos.push(m.p.x + der.x * medio, ySuelo, m.p.z + der.z * medio);
        pos.push(m.p.x - der.x * medio, ySuelo, m.p.z - der.z * medio);
        if (i < pasos) {
            const a = i * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const suelo = new THREE.Mesh(geo, material);
    suelo.receiveShadow = true;
    suelo.castShadow = false;
    suelo.frustumCulled = false;
    suelo.userData.propio = true;
    grupo.add(suelo);
    scene.add(grupo);
    return { material, grupo };
}

function diffAng(a, b) {
    return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

// camino_curvo es un cuarto de círculo a la izquierda: centro (-3.6, -3.6),
// radio 7.2, entra por +Z en (3.6, -3.6) y sale hacia -X en (-3.6, 3.6).
const CENTRO_CURVA_X = -3.6;
const CENTRO_CURVA_Z = -3.6;
const RADIO_PIEZA = 7.2;
const ARCO_PIEZA = (Math.PI / 2) * RADIO_PIEZA;
const GIRO_MIN = 12 * Math.PI / 180;

function headingEn(tabla, total, dist) {
    const a = muestraEn(tabla, Math.max(0, dist - 0.4));
    const b = muestraEn(tabla, Math.min(total, dist + 0.4));
    return Math.atan2(b.p.x - a.p.x, b.p.z - a.p.z);
}

/**
 * Círculo que pasa por los dos extremos del tramo, con la tangente de entrada.
 * El GLB se deforma a ese radio y a ese ángulo: el de catálogo es 90° y 7.2 m,
 * y este recorrido no tiene ninguna esquina así.
 */
function encajeCurva(tabla, total, d0, d1) {
    const arc = d1 - d0;
    if (arc < 6) return null;
    const h = headingEn(tabla, total, d0);
    const th = diffAng(h, headingEn(tabla, total, d1));
    if (Math.abs(th) < GIRO_MIN) return null;
    const P = muestraEn(tabla, d0).p;
    const Q = muestraEn(tabla, d1).p;
    const izquierda = th < 0;
    const nx = izquierda ? -Math.cos(h) : Math.cos(h);
    const nz = izquierda ? Math.sin(h) : -Math.sin(h);
    const vx = Q.x - P.x;
    const vz = Q.z - P.z;
    const den = 2 * (vx * nx + vz * nz);
    if (den <= 0.5) return null;
    const radio = (vx * vx + vz * vz) / den;
    if (radio < 5 || radio > 60) return null;
    const cx = P.x + nx * radio;
    const cz = P.z + nz * radio;
    const sweep = diffAng(Math.atan2(P.z - cz, P.x - cx), Math.atan2(Q.z - cz, Q.x - cx));
    if (izquierda ? sweep <= 0.05 : sweep >= -0.05) return null;
    if (Math.abs(sweep) > Math.PI * 0.85) return null;
    return { d0, d1, h, radio, angulo: Math.abs(sweep), izquierda, p: P };
}

/** Curvas donde el tramo gira; rectas de hasta 10 m en el resto. */
function piezasDeCurva(curva) {
    const tabla = tablaArco(curva);
    const total = tabla[tabla.length - 1].d;
    const curvas = [];
    const rectos = [];
    let d = 0;
    while (d < total - 0.35) {
        const encaje = encajeCurva(tabla, total, d, Math.min(d + ARCO_PIEZA, total));
        if (encaje) {
            curvas.push(encaje);
            d = encaje.d1;
            continue;
        }
        let fin = Math.min(d + 10, total);
        for (let s = d + 2; s < fin - 5; s += 1) {
            const s1 = Math.min(s + ARCO_PIEZA, total);
            if (s1 - s < 6) break;
            if (encajeCurva(tabla, total, s, s1)) {
                fin = s;
                break;
            }
        }
        if (fin - d < 0.35) {
            d = Math.min(total, d + 0.5);
            continue;
        }
        const a = muestraEn(tabla, d).p;
        const b = muestraEn(tabla, fin).p;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist >= 0.2) {
            rectos.push({
                p: [(a.x + b.x) / 2, 0.14, (a.z + b.z) / 2],
                r: Math.atan2(dx, dz),
                sx: 1,
                sy: 1,
                sz: dist / 10,
            });
        }
        d = fin;
    }
    return { curvas, rectos };
}

/** Mueve los vértices al arco del tramo. El ancho se conserva; el giro a la derecha espeja en X. */
function doblarCurva(modelo, pieza) {
    const root = modelo.root.clone(true);
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const inv = new THREE.Matrix4();
    root.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        const geo = o.geometry.clone();
        o.geometry = geo;
        o.userData.propio = true;
        const pos = geo.attributes.position;
        inv.copy(o.matrixWorld).invert();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            const dx = v.x - CENTRO_CURVA_X;
            const dz = v.z - CENTRO_CURVA_Z;
            const rad = Math.hypot(dx, dz);
            const ang = Math.atan2(dz, dx);
            const t = ang / (Math.PI / 2);
            const ang2 = t * pieza.angulo;
            const rad2 = pieza.radio + (rad - RADIO_PIEZA);
            v.x = CENTRO_CURVA_X + Math.cos(ang2) * rad2;
            v.z = CENTRO_CURVA_Z + Math.sin(ang2) * rad2;
            if (!pieza.izquierda) v.x = -v.x;
            v.applyMatrix4(inv);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
        if (!pieza.izquierda && geo.index) {
            const idx = geo.index;
            for (let i = 0; i < idx.count; i += 3) {
                const b = idx.getX(i + 1);
                idx.setX(i + 1, idx.getX(i + 2));
                idx.setX(i + 2, b);
            }
            idx.needsUpdate = true;
        }
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
    });
    const lx = pieza.izquierda ? (CENTRO_CURVA_X + pieza.radio) : -(CENTRO_CURVA_X + pieza.radio);
    const lz = CENTRO_CURVA_Z;
    const h = pieza.h;
    const ox = lx * Math.cos(h) + lz * Math.sin(h);
    const oz = -lx * Math.sin(h) + lz * Math.cos(h);
    root.position.set(pieza.p.x - ox, 0.14, pieza.p.z - oz);
    root.rotation.y = h;
    return root;
}

/** Baldosas de 20 m, el terreno del catálogo. */
function celdasTerreno(mapa) {
    let minX = -140;
    let maxX = 140;
    let minZ = -140;
    let maxZ = 140;
    (mapa.pasos || []).forEach((p) => (p.elementos || []).forEach((e) => {
        if (!e.p) return;
        minX = Math.min(minX, e.p[0]);
        maxX = Math.max(maxX, e.p[0]);
        minZ = Math.min(minZ, e.p[2]);
        maxZ = Math.max(maxZ, e.p[2]);
    }));
    const margen = 30;
    const x0 = Math.floor((minX - margen) / 20) * 20;
    const x1 = Math.ceil((maxX + margen) / 20) * 20;
    const z0 = Math.floor((minZ - margen) / 20) * 20;
    const z1 = Math.ceil((maxZ + margen) / 20) * 20;
    const celdas = [];
    for (let x = x0; x <= x1; x += 20) {
        for (let z = z0; z <= z1; z += 20) celdas.push({ p: [x, 0, z], r: 0, s: 1 });
    }
    return celdas;
}

const RADIO_CAMINO = 14;
const RADIO_CASA = 18;
const MEZCLA_RELIEVE = 14;

function muestrasDeCurva(c) {
    const out = [];
    if (!c || typeof c.getPoint !== 'function') return out;
    for (let i = 0; i <= 72; i++) {
        const p = c.getPoint(i / 72);
        out.push([p.x, p.z]);
    }
    return out;
}

// La franja del camino y el solar de cada casa quedan a Y=0. Más afuera el
// relieve original vuelve con una mezcla, para no dejar un escalón.
function crearAplanador(scene, mapa, curva, terrenoMesh) {
    const h = mapa.alturas;
    const original = h && h.datos ? h.datos.slice() : null;
    const camino = muestrasDeCurva(curva);
    const casas = [];
    const lagos = [];
    (mapa.pasos || []).forEach((p) => (p.elementos || []).forEach((e) => {
        const m = String(e.m || '');
        if (/07_casas_tematicas|10_edificios|casa|carpa/.test(m)) casas.push([e.p[0], e.p[2]]);
        else if (m.includes('lago')) lagos.push({ x: e.p[0], z: e.p[2], r: 5 * (e.s || 1) });
    }));
    const terrenos = [];
    scene.traverse((o) => {
        if (!o.isInstancedMesh || !String(o.name).startsWith('00_mapa/terreno_mapa')) return;
        const attr = o.geometry && o.geometry.attributes.position;
        if (!attr) return;
        const mat = new THREE.Matrix4();
        o.getMatrixAt(0, mat);
        const inv = mat.clone().invert();
        const v = new THREE.Vector3();
        const n = attr.count;
        const x = new Float32Array(n);
        const y = new Float32Array(n);
        const z = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            v.set(attr.getX(i), attr.getY(i), attr.getZ(i)).applyMatrix4(mat);
            x[i] = v.x; y[i] = v.y; z[i] = v.z;
        }
        terrenos.push({ mesh: o, inv, x, y, z });
    });
    if (terrenoMesh && terrenoMesh.geometry && terrenoMesh.geometry.attributes.position) {
        const attr = terrenoMesh.geometry.attributes.position;
        const inv = new THREE.Matrix4();
        const n = attr.count;
        const x = new Float32Array(n);
        const y = new Float32Array(n);
        const z = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            x[i] = attr.getX(i);
            y[i] = attr.getY(i);
            z[i] = attr.getZ(i);
        }
        terrenos.push({ mesh: terrenoMesh, inv, x, y, z });
    }
    const anclas = [];
    const q0 = new THREE.Quaternion();
    const s0 = new THREE.Vector3();
    const p0 = new THREE.Vector3();
    const mat0 = new THREE.Matrix4();
    scene.traverse((o) => {
        if (!o.isInstancedMesh || String(o.name).startsWith('00_mapa/terreno_mapa')) return;
        const nombre = String(o.name);
        if (nombre.includes('/camino') || nombre.includes('lago') || nombre.includes('nube') || nombre.includes('terreno')) return;
        for (let i = 0; i < o.count; i++) {
            o.getMatrixAt(i, mat0);
            mat0.decompose(p0, q0, s0);
            anclas.push({
                mesh: o,
                i,
                x: p0.x,
                y: p0.y,
                z: p0.z,
                h0: alturaOriginal(p0.x, p0.z),
                qx: q0.x, qy: q0.y, qz: q0.z, qw: q0.w,
                sx: s0.x, sy: s0.y, sz: s0.z,
            });
        }
    });

    function alturaOriginal(x, z) {
        if (!original || !h) return 0;
        const { min, paso, n } = h;
        const fx = Math.min(n - 1.001, Math.max(0, (x - min) / paso));
        const fz = Math.min(n - 1.001, Math.max(0, (z - min) / paso));
        const ix = Math.floor(fx);
        const iz = Math.floor(fz);
        const u = fx - ix;
        const v = fz - iz;
        const d = (a, b) => original[b * n + a];
        return (d(ix, iz) * (1 - u) + d(ix + 1, iz) * u) * (1 - v)
            + (d(ix, iz + 1) * (1 - u) + d(ix + 1, iz + 1) * u) * v;
    }

    function distMin(pts, x, z, tope) {
        let m = Infinity;
        const limite = tope * tope;
        for (let i = 0; i < pts.length; i++) {
            const dx = x - pts[i][0];
            const dz = z - pts[i][1];
            const d2 = dx * dx + dz * dz;
            if (d2 < limite && d2 < m) m = d2;
        }
        return m === Infinity ? Infinity : Math.sqrt(m);
    }

    // El suelo visible es la baldosa, plana. El relieve del kit son los cerros,
    // no una malla de alturas. Todo el valle queda a Y=0 para que nada flote.
    function factor() {
        return 0;
    }

    function aplicar() {
        if (original && h) {
            const { min, paso, n } = h;
            for (let j = 0; j < n; j++) {
                const z = min + j * paso;
                for (let i = 0; i < n; i++) {
                    const idx = j * n + i;
                    const f = factor(min + i * paso, z);
                    h.datos[idx] = original[idx] * f;
                }
            }
        }
        const v = new THREE.Vector3();
        terrenos.forEach((t) => {
            const attr = t.mesh.geometry.attributes.position;
            for (let i = 0; i < t.x.length; i++) {
                const f = factor(t.x[i], t.z[i]);
                v.set(t.x[i], t.y[i] * f, t.z[i]).applyMatrix4(t.inv);
                attr.setXYZ(i, v.x, v.y, v.z);
            }
            attr.needsUpdate = true;
            t.mesh.geometry.computeVertexNormals();
            t.mesh.geometry.computeBoundingSphere();
        });
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        const mat = new THREE.Matrix4();
        const tocados = new Set();
        anclas.forEach((a) => {
            const f = factor(a.x, a.z);
            pos.set(a.x, a.y - a.h0 * (1 - f), a.z);
            quat.set(a.qx, a.qy, a.qz, a.qw);
            scl.set(a.sx, a.sy, a.sz);
            a.mesh.setMatrixAt(a.i, mat.compose(pos, quat, scl));
            tocados.add(a.mesh);
        });
        tocados.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    }

    return {
        aplicar,
        sumar(curvas, puntos) {
            (curvas || []).forEach((c) => {
                muestrasDeCurva(c).forEach((p) => camino.push(p));
            });
            (puntos || []).forEach((p) => {
                if (!p) return;
                casas.push([p.x, p.z]);
            });
            aplicar();
        },
    };
}

function cieloDegradado() {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#2f8fe6');
    g.addColorStop(0.55, '#8cc8f2');
    g.addColorStop(1, '#cfeaf9');
    x.fillStyle = g;
    x.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function ponerLuces(scene, modesto) {
    scene.add(new THREE.HemisphereLight(0xe4f3ff, 0x5c8f34, 1.25));
    const sun = new THREE.DirectionalLight(0xfff3dd, 2.2);
    sun.position.set(-70, 140, 75);
    sun.castShadow = true;
    const sm = modesto ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -90, right: 130, top: 80, bottom: -70, near: 10, far: 320 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.08;
    sun.target.position.set(35, 0, -6);
    scene.add(sun);
    scene.add(sun.target);
}

const CASAS_AMBIENTE = {
    'expresion-artistica': '07_casas_tematicas/expresion_artistica',
    'expresion_artistica': '07_casas_tematicas/expresion_artistica',
    musica: '07_casas_tematicas/expresion_artistica',
    polimotor: '07_casas_tematicas/polimotor',
    multisaberes: '07_casas_tematicas/multisaberes',
    logico: '07_casas_tematicas/multisaberes',
    multisensorial: '07_casas_tematicas/multisensorial',
    tecnologia: '07_casas_tematicas/tecnologia',
};

function casaDelAmbiente(slug) {
    return CASAS_AMBIENTE[String(slug || '').toLowerCase()] || null;
}

/**
 * Quita las 5 casas temáticas y los marcadores de nivel del plano.
 * En el puesto del refugio (inicio del camino) queda solo la casa del ambiente actual.
 */
function planoDelAmbiente(mapa, ambiente, escalaInicio = 1, posXInicio = 0, posYInicio = 0) {
    const ruta = casaDelAmbiente(ambiente);
    const escala = Number.isFinite(escalaInicio) && escalaInicio > 0 ? escalaInicio : 1;
    const dx = Number.isFinite(posXInicio) ? posXInicio : 0;
    const dz = Number.isFinite(posYInicio) ? posYInicio : 0;
    let puestoInicio = null;
    const pasos = mapa.pasos.map((p) => ({
        ...p,
        elementos: p.elementos.filter((e) => {
            if (e.m.endsWith('casa_refugio')) {
                puestoInicio = e;
                return false;
            }
            if (e.m.startsWith('07_casas_tematicas/')) return false;
            if (e.m.includes('marcador_nivel')) return false;
            return true;
        }),
    }));
    if (puestoInicio && ruta) {
        const p = puestoInicio.p.slice();
        p[0] += dx;
        p[2] += dz;
        pasos[0].elementos.push({
            m: ruta,
            p,
            r: puestoInicio.r,
            s: (puestoInicio.s || 1) * escala,
        });
    } else if (puestoInicio) {
        const p = puestoInicio.p.slice();
        p[0] += dx;
        p[2] += dz;
        pasos[0].elementos.push({ ...puestoInicio, p, s: (puestoInicio.s || 1) * escala });
    }
    return { ...mapa, pasos };
}

/**
 * Arma el valle completo. No anima la aparición: el kiosco lo necesita ya puesto.
 * @returns {Promise<{curva: THREE.Curve, altura: Function, carpa: object|null, actualizar: Function, destruir: Function}>}
 */
export async function armarMundo(scene, { modesto = false, ambiente = '', escalaCasaInicio = 1, posXCasaInicio = 0, posYCasaInicio = 0 } = {}) {
    const mapa = planoDelAmbiente(await (await fetch(new URL('mapa.json', baseModelos()))).json(), ambiente, escalaCasaInicio, posXCasaInicio, posYCasaInicio);
    const esCarpa = (m) => /(^|\/)carpa$/.test(String(m || ''));
    const usos = new Map();
    mapa.pasos.forEach((p) => p.elementos.forEach((e) => {
        if (esCarpa(e.m)) return;
        usos.set(e.m, (usos.get(e.m) || 0) + 1);
    }));

    const modelos = {};
    await Promise.all([...usos.keys()].map(async (ruta) => {
        modelos[ruta] = await cargarModelo(ruta);
    }));

    const obra = new Constructor(scene);
    const fauna = new Fauna(scene, mapa);
    usos.forEach((n, ruta) => {
        if (!esVivo(ruta)) obra.reservar(modelos[ruta], n);
    });

    let carpa = null;
    let casaInicio = null;
    const rutaInicio = casaDelAmbiente(ambiente);
    const esArbol = (ruta) => /02_vegetacion\/(canaguate|mango|ceiba|palma_coco|platanera|cardon_cactus)/.test(ruta);
    mapa.pasos.forEach((p) => p.elementos.forEach((e) => {
        if (esCarpa(e.m)) {
            carpa = { x: e.p[0], y: e.p[1], z: e.p[2], r: e.r || 0 };
            return;
        }
        if (esVivo(e.m)) fauna.agregar(modelos[e.m], e);
        else {
            const i = obra.colocar(modelos[e.m], e);
            if (rutaInicio && e.m === rutaInicio) {
                casaInicio = { ruta: e.m, i, x: e.p[0], y: e.p[1], z: e.p[2], r: e.r || 0 };
            }
            if (esArbol(e.m)) obra.arboles.push({ ruta: e.m, i, x: e.p[0], z: e.p[2] });
            if (esAdornoSuelto(e.m)) {
                const suelto = { ruta: e.m, i, x: e.p[0], z: e.p[2] };
                obra.sueltos.push(suelto);
                if (esEstorboEntrada(e.m)) obra.estorbos.push(suelto);
            }
            if (String(e.m).includes('farola')) {
                obra.farolas.push({
                    ruta: e.m, i, x: e.p[0], y: e.p[1], z: e.p[2], r: e.r || 0, s: e.s || 1,
                });
            }
        }
    }));
    obra.cerrar();

    const curva = curvaDesdePuntos(mapa.curva);
    const aplanar = crearAplanador(scene, mapa, curva, null);
    aplanar.aplicar();

    const terreno = await cargarModelo('01_relieve/terreno_tile_20m');
    const celdas = celdasTerreno(mapa);
    obra.reservar(terreno, celdas.length);
    celdas.forEach((c) => obra.colocar(terreno, c));

    obra.cerrar();

    let materialCamino = null;
    let grupoCamino = null;
    if (curva) {
        const modeloRecto = await cargarModelo('11_camino_y_agua/camino_recto');
        const modeloCurvo = await cargarModelo('11_camino_y_agua/camino_curvo');
        const cinta = armarCintaCamino(scene, modeloRecto, curva);
        materialCamino = cinta.material;
        grupoCamino = cinta.grupo;
        const piezas = piezasDeCurva(curva);
        if (piezas.rectos.length) {
            obra.reservar(modeloRecto, piezas.rectos.length);
            piezas.rectos.forEach((t) => obra.colocar(modeloRecto, t));
        }
        piezas.curvas.forEach((pieza) => {
            const root = doblarCurva(modeloCurvo, pieza);
            grupoCamino.add(root);
            root.updateMatrixWorld(true);
            const caja = new THREE.Box3();
            const centro = new THREE.Vector3();
            root.traverse((o) => {
                if (!o.isMesh || esEstructuraCamino(o.name) || !o.geometry) return;
                o.geometry.boundingBox = null;
                o.geometry.computeBoundingBox();
                caja.setFromObject(o);
                if (caja.isEmpty()) return;
                caja.getCenter(centro);
                obra.adornosCamino.push({ o, x: centro.x, z: centro.z });
            });
        });
        obra.cerrar();
    }
    scene.background = cieloDegradado();
    scene.fog = new THREE.Fog(0xcfeaf9, 160, 520);
    ponerLuces(scene, modesto);

    let mostradaX = Number.isFinite(posXCasaInicio) ? posXCasaInicio : 0;
    let mostradaZ = Number.isFinite(posYCasaInicio) ? posYCasaInicio : 0;
    const moverCasaInicio = (x, z) => {
        if (!casaInicio) return;
        const lote = obra.lotes.get(casaInicio.ruta);
        if (!lote) return;
        const ddx = x - mostradaX;
        const ddz = z - mostradaZ;
        if (Math.abs(ddx) < 1e-6 && Math.abs(ddz) < 1e-6) return;
        mostradaX = x;
        mostradaZ = z;
        casaInicio.x += ddx;
        casaInicio.z += ddz;
        const cur = new THREE.Matrix4();
        const mov = new THREE.Matrix4();
        lote.meshes.forEach((mesh) => {
            mesh.getMatrixAt(casaInicio.i, cur);
            mov.makeTranslation(ddx, 0, ddz);
            mesh.setMatrixAt(casaInicio.i, mov.multiply(cur));
            mesh.instanceMatrix.needsUpdate = true;
        });
    };

    return {
        curva,
        materialCamino,
        altura: (x, z) => fauna.altura(x, z),
        aplanarAlrededor: (curvas, puntos) => aplanar.sumar(curvas, puntos),
        obstaculos: fauna.obstaculos,
        carpa,
        casaInicio: casaInicio ? {
            fijar: moverCasaInicio,
            punto: () => new THREE.Vector3(casaInicio.x, casaInicio.y + 2, casaInicio.z),
            frente: () => new THREE.Vector3(Math.sin(casaInicio.r), 0, Math.cos(casaInicio.r)),
            leer: () => ({ x: mostradaX, y: mostradaZ }),
        } : null,
        despejarArboles: (curvas, radio) => {
            const muestras = [];
            (curvas || []).forEach((c) => {
                if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number') {
                    muestras.push(c);
                    return;
                }
                if (!c || typeof c.getPoint !== 'function') return;
                for (let s = 0; s <= 56; s++) {
                    const p = c.getPoint(s / 56);
                    muestras.push([p.x, p.z]);
                }
            });
            obra.despejarArboles(muestras, radio);
        },
        despejarFlores: (puntos, radio) => {
            obra.despejarFlores(puntos || [], radio);
        },
        despejarEntrada: (puntos, radio) => {
            const muestras = [];
            (puntos || []).forEach((c) => {
                if (Array.isArray(c) && typeof c[0] === 'number') {
                    muestras.push(c);
                    return;
                }
                if (!c || typeof c.getPoint !== 'function') return;
                for (let s = 0; s <= 48; s++) {
                    const p = c.getPoint(s / 48);
                    muestras.push([p.x, p.z]);
                }
            });
            const r = radio || 5;
            obra.despejarEntrada(muestras, r);
            fauna.ocultarEn(muestras, r);
        },
        quitarEstorbos: (puntos, radio) => {
            const muestras = [];
            (puntos || []).forEach((c) => {
                if (Array.isArray(c) && typeof c[0] === 'number') muestras.push(c);
            });
            if (!muestras.length) return;
            obra.quitarEstorbos(muestras, radio || 5.5);
        },
        farolas: obra.farolas,
        colocarProp: (item, x, z) => {
            const lote = obra.lotes.get(item.ruta);
            if (!lote) return;
            const pos = new THREE.Vector3(x, item.y, z);
            const quat = new THREE.Quaternion().setFromAxisAngle(Y, item.r || 0);
            _m.compose(pos, quat, _s.setScalar(item.s || 1));
            lote.partes.forEach((pt, j) => {
                lote.meshes[j].setMatrixAt(item.i, _t.multiplyMatrices(_m, pt.local));
                lote.meshes[j].instanceMatrix.needsUpdate = true;
            });
            item.x = x;
            item.z = z;
            const suelto = obra.sueltos.find((a) => a.ruta === item.ruta && a.i === item.i);
            if (suelto) {
                suelto.x = x;
                suelto.z = z;
            }
        },
        actualizar: (dt, t) => fauna.update(dt, t),
        destruir: () => {
            obra.destruir();
            fauna.destruir();
            if (!grupoCamino) return;
            scene.remove(grupoCamino);
            grupoCamino.traverse((o) => {
                if (o.userData && o.userData.propio && o.geometry) o.geometry.dispose();
            });
        },
    };
}

const CARPETA_ESTACION = {
    'expresion-artistica': 'artistica',
    expresion_artistica: 'artistica',
    musica: 'artistica',
    polimotor: 'polimotor',
    multisaberes: 'multisaberes',
    logico: 'multisaberes',
    multisensorial: 'multisensorial',
    tecnologia: 'tecnologia',
};

const ESTACIONES_POR_CARPETA = {
    polimotor: [
        'estacion_polimotor_saltos',
        'estacion_polimotor_equilibrio',
        'estacion_polimotor_punteria',
    ],
    artistica: [
        'estacion_artistica_pintura',
        'estacion_artistica_musica',
        'estacion_artistica_teatro',
    ],
    multisaberes: [
        'estacion_multisaberes_biblioteca',
        'estacion_multisaberes_laboratorio',
        'estacion_multisaberes_huerta',
    ],
    multisensorial: [
        'estacion_multisensorial_texturas',
        'estacion_multisensorial_sonidos',
        'estacion_multisensorial_luz',
    ],
    tecnologia: [
        'estacion_tecnologia_robotica',
        'estacion_tecnologia_programacion',
        'estacion_tecnologia_energia',
    ],
};

export function carpetaEstacion(slug) {
    return CARPETA_ESTACION[String(slug || '').toLowerCase()] || null;
}

/**
 * Clon con la base en y=0 y el centro en XZ. No cambia el tamaño del GLB.
 * Deja mixer con puerta_abrir, puerta_cerrar y las animacion_loop sin reproducir.
 */
function clonarConPuerta(modelo) {
    const root = modelo.root.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    const grupo = new THREE.Group();
    grupo.add(root);
    grupo.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
    });
    grupo.updateMatrixWorld(true);
    const medida = new THREE.Box3().setFromObject(grupo).getSize(new THREE.Vector3());
    grupo.userData.ancho = Math.max(medida.x, medida.z, 0.001);
    const puerta = grupo.getObjectByName('puerta');
    let frente = medida.z * 0.5;
    if (puerta) {
        const p = new THREE.Vector3();
        puerta.getWorldPosition(p);
        if (p.z > 0.4) frente = p.z;
    }
    grupo.userData.frente = frente;
    const mixer = new THREE.AnimationMixer(grupo);
    const acciones = { loops: [] };
    (modelo.animations || []).forEach((clip) => {
        const acc = mixer.clipAction(clip);
        if (clip.name === 'animacion_loop') {
            acc.setLoop(THREE.LoopRepeat, Infinity);
            acciones.loops.push(acc);
        } else if (clip.name === 'puerta_abrir' || clip.name === 'puerta_cerrar') {
            acc.setLoop(THREE.LoopOnce, 1);
            acc.clampWhenFinished = true;
            acciones[clip.name] = acc;
        }
    });
    grupo.userData.mixer = mixer;
    grupo.userData.acciones = acciones;
    return grupo;
}

export async function clonarEstacion(slug, numero) {
    const carpeta = carpetaEstacion(slug);
    const lista = carpeta && ESTACIONES_POR_CARPETA[carpeta];
    if (!lista) throw new Error('Ambiente sin modelos de estación');
    const idx = numero === 2 || numero === 3 ? numero - 1 : 0;
    const modelo = await cargarModelo(`08_estaciones/${carpeta}/${lista[idx]}`);
    return clonarConPuerta(modelo);
}

/** Meta del final. Las animacion_loop se arrancan al llegar, no al colocar. */
export async function clonarCastillo() {
    const modelo = await cargarModelo('10_edificios/meta_final');
    return clonarConPuerta(modelo);
}

/** Zona de juegos del ambiente. animacion_loop va desde que aparece. */
export async function clonarParque(slug) {
    const carpeta = carpetaEstacion(slug);
    if (!carpeta) throw new Error('Ambiente sin zona de juegos');
    const modelo = await cargarModelo(`09_zonas_de_juegos/zona_juegos_${carpeta}`);
    const grupo = clonarConPuerta(modelo);
    iniciarLoops(grupo);
    return grupo;
}

export function iniciarLoops(grupo) {
    const lista = grupo && grupo.userData.acciones && grupo.userData.acciones.loops;
    if (!lista) return;
    lista.forEach((acc) => {
        if (acc.isRunning()) return;
        acc.reset().play();
    });
}

/** Abre o cierra la puerta una vez y espera a que termine. Resuelve igual si no hay clip. */
export function animarPuerta(grupo, abrir) {
    const acciones = grupo && grupo.userData && grupo.userData.acciones;
    const acc = acciones && acciones[abrir ? 'puerta_abrir' : 'puerta_cerrar'];
    if (!acc) return Promise.resolve();
    ['puerta_abrir', 'puerta_cerrar'].forEach((nombre) => {
        const otra = acciones[nombre];
        if (!otra) return;
        otra.stop();
        otra.enabled = false;
    });
    acc.enabled = true;
    acc.reset();
    acc.setLoop(THREE.LoopOnce, 1);
    acc.clampWhenFinished = true;
    acc.play();
    const mixer = grupo.userData.mixer;
    const ms = ((acc.getClip().duration || 1) * 1000) + 300;
    return new Promise((resolve) => {
        let listo = false;
        const soltar = () => {
            if (listo) return;
            listo = true;
            if (mixer) mixer.removeEventListener('finished', alFin);
            resolve();
        };
        const alFin = (e) => { if (e.action === acc) soltar(); };
        if (mixer) mixer.addEventListener('finished', alFin);
        setTimeout(soltar, ms);
    });
}

// Tamaño en el mapa. 1 = el GLB tal cual. Mayor crece, menor encoge.
export const ESCALA_NINO = 2.55;
export const ESCALA_NINA = 2.55;

// Tracks NLA de nino.glb y nina.glb. El string es el nombre del clip.
export const ANIMACIONES_PERSONAJE = [
    'FROG_JUMP',
    'LOOK_AROUND',
    'HIP_DANCE',
    'FIST_PUMP',
    'STRETCH',
    'SHY',
    'RAISE_HAND',
    'SPIN',
    'AIRPLANE',
    'HOPSCOTCH',
    'SKIP',
    'JUMPING_JACKS',
    'CHEER_POMPOMS',
    'PARTY',
    'CHEER',
    'YES',
    'SURPRISE',
    'SAD',
    'THINK',
    'POINT_UP',
    'POINT_R',
    'POINT_L',
    'DANCE',
    'CROUCH',
    'SIT',
    'JUMP',
    'RUN',
    'WALK',
    'CLAP',
    'HAPPY',
    'HELLO',
    'TALK',
    'IDLE',
];

// Poses de prueba del mismo archivo. El recorrido no las pone solas.
export const ANIMACIONES_PRUEBA = [
    'TEST_21_BAILAR',
    'TEST_20_SALUDAR',
    'TEST_19_SALTAR',
    'TEST_18_CORRER',
    'TEST_17_CAMINAR',
    'TEST_16_CABEZA_INCLINADA',
    'TEST_15_CABEZA_DER',
    'TEST_14_CABEZA_IZQ',
    'TEST_13_AGACHADO',
    'TEST_12_SENTADO',
    'TEST_11_RODILLAS',
    'TEST_10_PIERNA_DER',
    'TEST_09_PIERNA_IZQ',
    'TEST_08_BRAZO_DER_DOBLADO',
    'TEST_07_BRAZO_IZQ_DOBLADO',
    'TEST_06_AMBOS_BRAZOS',
    'TEST_05_BRAZO_DER_ARRIBA',
    'TEST_04_BRAZO_IZQ_ARRIBA',
    'TEST_03_BRAZOS_ABAJO',
    'TEST_02_A_POSE',
    'TEST_01_T_POSE',
];

// Qué clip de ANIMACIONES_PERSONAJE usa cada momento del mapa.
export const CLIP_QUIETO = 'IDLE';
export const CLIP_CAMINAR = 'WALK';
export const CLIP_CORRER = 'RUN';
export const CLIP_SALUDAR = 'HELLO';
export const CLIP_HABLAR = 'TALK';
export const CLIP_AFIRMAR = 'YES';

function guardarClip(gltf, mixer, acciones, nombre) {
    if (!nombre || acciones[nombre]) return;
    const clip = THREE.AnimationClip.findByName(gltf.animations, nombre);
    if (!clip) return;
    const accion = mixer.clipAction(clip);
    accion.loop = THREE.LoopRepeat;
    acciones[nombre] = accion;
}

/** Niño o niña. Sin `cualPedido` elige al azar. */
export async function cargarPersonaje(scene, cualPedido) {
    const cual = cualPedido === 'nino' || cualPedido === 'nina'
        ? cualPedido
        : (Math.random() < 0.5 ? 'nino' : 'nina');
    const url = new URL(`${cual}.glb`, baseModelos()).href;
    const gltf = await loader.loadAsync(url);
    const objeto = gltf.scene;
    objeto.traverse((c) => {
        if (!c.isMesh) return;
        c.castShadow = true;
        c.frustumCulled = false;
    });
    const escala = cual === 'nina' ? ESCALA_NINA : ESCALA_NINO;
    if (Number.isFinite(escala) && escala > 0) objeto.scale.setScalar(escala);
    scene.add(objeto);
    const mixer = new THREE.AnimationMixer(objeto);
    const acciones = {};
    ANIMACIONES_PERSONAJE.forEach((nombre) => guardarClip(gltf, mixer, acciones, nombre));
    ANIMACIONES_PRUEBA.forEach((nombre) => guardarClip(gltf, mixer, acciones, nombre));
    if (acciones[CLIP_QUIETO]) acciones[CLIP_QUIETO].play();
    return { objeto, mixer, acciones, cual };
}
