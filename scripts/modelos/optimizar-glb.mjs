// Optimiza un GLB de catalogo_juegos/intro3d/models. Partir SIEMPRE del modelo sin optimizar.
//
// Dependencias (no están en package.json; instalar en una carpeta aparte y copiar este archivo allí):
//   npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp
//
// Uso: node optimizar-glb.mjs <entrada.glb> <salida.glb> <aula|nino> <ratio> <error>
//   Niños:  UMBRAL_TRIS=6000 node optimizar-glb.mjs nino.glb salida.glb nino 0.25 0.001
//   Aulas:  UMBRAL_TRIS=300  node optimizar-glb.mjs aula.glb salida.glb aula 0.35 0.001
//           (multisensorial: 0.1 0.002)
//
// Un aula nueva necesita además su cajaAula en intro3d/js/ambientes-tema.js, medida en el modelo
// sin optimizar con new THREE.Box3().setFromObject(gltf.scene).
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { NodeIO, Logger, Verbosity } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, resample, simplifyPrimitive, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [entrada, salida, tipo, ratioTxt, errorTxt] = process.argv.slice(2);
const ratio = Number(ratioTxt);
const error = Number(errorTxt);

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);

const io = new NodeIO()
    .setLogger(new Logger(Verbosity.WARN))
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(entrada);

function resumen(d) {
    const root = d.getRoot();
    let tris = 0, verts = 0, prims = 0;
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
        prims++;
        const pos = p.getAttribute('POSITION');
        const idx = p.getIndices();
        verts += pos.getCount();
        tris += (idx ? idx.getCount() : pos.getCount()) / 3;
    }
    const luces = root.listNodes().filter((n) => n.getExtension('KHR_lights_punctual')).length;
    return { nodos: root.listNodes().length, mallas: root.listMeshes().length, prims, verts, tris: Math.round(tris),
        mat: root.listMaterials().length, skins: root.listSkins().length, anim: root.listAnimations().length, luces };
}

console.log('antes  ', JSON.stringify(resumen(doc)));

const pasos = [
    prune({ keepAttributes: false, keepLeaves: true, keepSolidTextures: false }),
    dedup(),
    weld(),
];
const UMBRAL = Number(process.env.UMBRAL_TRIS || 0);
const PESO_NORMAL = Number(process.env.PESO_NORMAL || 1);
const PROTEGIDOS = /^(boca|dientes|lengua|parpados)$/i;
if (ratio < 1) {
    // Simplifica teniendo en cuenta las normales: así no se deforman los reflejos en pisos y paredes
    // ni el sombreado de la piel. Boca, dientes, lengua, párpados y piezas pequeñas quedan intactos.
    pasos.push((d) => {
        for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
            const idx = p.getIndices();
            const tris = (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
            if (tris < UMBRAL || PROTEGIDOS.test(p.getMaterial()?.getName() || '')) continue;
            const simplifier = {
                simplify(indices, posiciones, paso, objetivo, err, banderas) {
                    const normales = p.getAttribute('NORMAL')?.getArray();
                    if (!(normales instanceof Float32Array)) return MeshoptSimplifier.simplify(indices, posiciones, paso, objetivo, err, banderas);
                    return MeshoptSimplifier.simplifyWithAttributes(indices, posiciones, paso, normales, 3, [PESO_NORMAL, PESO_NORMAL, PESO_NORMAL], null, objetivo, err, banderas);
                },
            };
            simplifyPrimitive(p, { simplifier, ratio, error });
        }
    });
}
if (tipo === 'aula') {
    pasos.push(flatten(), join({ keepNamed: false }));
} else {
    pasos.push(resample({ tolerance: 1e-4 }));
}
pasos.push(prune({ keepAttributes: false, keepLeaves: true }));
if (doc.getRoot().listTextures().length) {
    pasos.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 85 }));
}
pasos.push(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

await doc.transform(...pasos);
await io.write(salida, doc);

const mb = (n) => (n / 1048576).toFixed(2);
const bytes = readFileSync(salida);
console.log('después', JSON.stringify(resumen(doc)));
console.log(`tamaño: ${mb(statSync(entrada).size)} MB → ${mb(bytes.length)} MB (gzip ${mb(gzipSync(bytes).length)} MB)`);
