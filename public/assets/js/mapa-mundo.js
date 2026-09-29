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
    ciervo: { vel: 1.5, radio: 12, espera: [3, 8], pasta: true },
    zorro: { vel: 2.4, radio: 14, espera: [1, 4] },
    oveja: { vel: 0.8, radio: 5, espera: [3, 7], pasta: true },
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

class Constructor {
    constructor(scene) {
        this.scene = scene;
        this.lotes = new Map();
        this.arboles = [];
        this.flores = [];
        this.farolas = [];
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

    colocar(modelo, { p, r = 0, s = 1 }) {
        const lote = this.lotes.get(modelo.ruta);
        const pos = new THREE.Vector3(p[0], p[1], p[2]);
        const quat = new THREE.Quaternion().setFromAxisAngle(Y, r);
        _m.compose(pos, quat, _s.setScalar(s));
        const i = lote.count++;
        lote.partes.forEach((pt, j) => {
            lote.meshes[j].setMatrixAt(i, _t.multiplyMatrices(_m, pt.local));
        });
        if (String(modelo.ruta).includes('03_flores')) {
            this.flores.push({ ruta: modelo.ruta, i, x: p[0], z: p[2] });
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
                } else if (e.m.includes('casa') || e.m.includes('carpa')) {
                    this.obstaculos.push([e.p[0], e.p[2], 4.8 * (e.s || 1)]);
                } else if (/pino|arbol|roca|tronco|tocon|banca|farola|marcador/.test(e.m)) {
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
        if (nombre.startsWith('ave_')) {
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

    update(dt, t) {
        for (const a of this.lista) {
            const T = TIPOS[a.nombre];
            if (T) this.caminar(a, T, dt);
            else if (a.bandada) this.volar(a, t);
            else if (a.nombre === 'pato' && a.lago) this.nadar(a, dt, t);
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
        a.o.position.set(x, a.lago.y + 0.08 + Math.sin(t * 2 + a.fase) * 0.03, z);
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

/** Eje del sendero a partir del mesh `suelo` (pares de vértices a lo ancho). */
function curvaDesdeCamino(modelo) {
    const suelo = modelo.root.getObjectByName('suelo');
    const attr = suelo && suelo.geometry && suelo.geometry.attributes.position;
    if (!attr || attr.count < 4) return null;
    const puntos = [];
    const paso = 10;
    for (let i = 0; i + 1 < attr.count; i += 2 * paso) {
        puntos.push(new THREE.Vector3(
            (attr.getX(i) + attr.getX(i + 1)) / 2,
            (attr.getY(i) + attr.getY(i + 1)) / 2,
            (attr.getZ(i) + attr.getZ(i + 1)) / 2,
        ));
    }
    const ult = attr.count - (attr.count % 2) - 2;
    if (ult > 0) {
        puntos.push(new THREE.Vector3(
            (attr.getX(ult) + attr.getX(ult + 1)) / 2,
            (attr.getY(ult) + attr.getY(ult + 1)) / 2,
            (attr.getZ(ult) + attr.getZ(ult + 1)) / 2,
        ));
    }
    return new THREE.CatmullRomCurve3(puntos, false, 'catmullrom', 0.2);
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
function crearAplanador(scene, mapa, curva) {
    const h = mapa.alturas;
    const original = h && h.datos ? h.datos.slice() : null;
    const camino = muestrasDeCurva(curva);
    const casas = [];
    const lagos = [];
    (mapa.pasos || []).forEach((p) => (p.elementos || []).forEach((e) => {
        const m = String(e.m || '');
        if (m.includes('casa') || m.includes('carpa')) casas.push([e.p[0], e.p[2]]);
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
    const anclas = [];
    const q0 = new THREE.Quaternion();
    const s0 = new THREE.Vector3();
    const p0 = new THREE.Vector3();
    const mat0 = new THREE.Matrix4();
    scene.traverse((o) => {
        if (!o.isInstancedMesh || String(o.name).startsWith('00_mapa/terreno_mapa')) return;
        if (String(o.name).startsWith('00_mapa/camino_mapa')) return;
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

    function factor(x, z) {
        const dc = distMin(camino, x, z, RADIO_CAMINO + MEZCLA_RELIEVE);
        const dh = casas.length ? distMin(casas, x, z, RADIO_CASA + MEZCLA_RELIEVE) : Infinity;
        for (let i = 0; i < lagos.length; i++) {
            if (Math.hypot(x - lagos[i].x, z - lagos[i].z) < lagos[i].r && dc > 6) return 1;
        }
        const fuera = Math.min(dc - RADIO_CAMINO, dh - RADIO_CASA);
        if (fuera <= 0) return 0;
        if (fuera >= MEZCLA_RELIEVE) return 1;
        const t = fuera / MEZCLA_RELIEVE;
        return t * t * (3 - 2 * t);
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
    'expresion-artistica': '07_casas_tematicas/casa_expresion_artistica',
    'expresion_artistica': '07_casas_tematicas/casa_expresion_artistica',
    musica: '07_casas_tematicas/casa_expresion_artistica',
    polimotor: '07_casas_tematicas/casa_polimotor',
    multisaberes: '07_casas_tematicas/casa_multisaberes',
    logico: '07_casas_tematicas/casa_multisaberes',
    multisensorial: '07_casas_tematicas/casa_multisensorial',
    tecnologia: '07_casas_tematicas/casa_tecnologia',
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
    const esArbol = (ruta) => ruta.includes('02_vegetacion/pino') || ruta.includes('02_vegetacion/arbol');
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
            if (String(e.m).includes('farola')) {
                obra.farolas.push({
                    ruta: e.m, i, x: e.p[0], y: e.p[1], z: e.p[2], r: e.r || 0, s: e.s || 1,
                });
            }
        }
    }));
    obra.cerrar();

    const modeloCamino = modelos['00_mapa/camino_mapa'];
    const suelo = modeloCamino && modeloCamino.root.getObjectByName('suelo');
    const curva = curvaDesdeCamino(modeloCamino);
    const aplanar = crearAplanador(scene, mapa, curva);
    aplanar.aplicar();
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
        materialCamino: suelo ? suelo.material : null,
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
        },
        actualizar: (dt, t) => fauna.update(dt, t),
        destruir: () => {
            obra.destruir();
            fauna.destruir();
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
    if (!carpeta) throw new Error('Ambiente sin modelos de estación');
    const n = numero === 2 || numero === 3 ? numero : 1;
    const modelo = await cargarModelo(`11_estaciones/${carpeta}/estacion${n}`);
    return clonarConPuerta(modelo);
}

/** Meta del final. Las animacion_loop se arrancan al llegar, no al colocar. */
export async function clonarCastillo() {
    const modelo = await cargarModelo('11_estaciones/meta_final');
    return clonarConPuerta(modelo);
}

/** Parque de juegos. animacion_loop va desde que aparece. */
export async function clonarParque() {
    const modelo = await cargarModelo('11_estaciones/parque_juegos');
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

/** Niño o niña. Sin `cualPedido` elige al azar. Los GLB ya traen Idle, Walk, Run, Wave y Yes. */
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
    scene.add(objeto);
    const mixer = new THREE.AnimationMixer(objeto);
    const acciones = {};
    ['Idle', 'Walk', 'Run', 'Wave', 'Yes'].forEach((nombre) => {
        const clip = THREE.AnimationClip.findByName(gltf.animations, nombre);
        if (!clip) return;
        const accion = mixer.clipAction(clip);
        accion.loop = THREE.LoopRepeat;
        acciones[nombre] = accion;
    });
    if (acciones.Idle) acciones.Idle.play();
    return { objeto, mixer, acciones, cual };
}
