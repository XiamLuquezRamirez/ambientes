/**
 * Sincroniza arte diseñado (≥6KB SVG o PNG≥8KB) entre juegos del eje Percepción Auditiva.
 * Fuente canónica por id = archivo más grande del eje.
 *
 * Uso: node scripts/sincronizar-arte-auditivo.js [--dry]
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const EJES = [
  "AsociaSonidoEImagen",
  "MemoriaAuditiva",
  "EncuentraElSonido",
  "QueSonidoEscuchas",
  "RepiteLaSecuencia",
];
const MIN_SVG = 6000;
const SKIP = new Set([
  "escuchar", "estrella", "carrito", "topo", "cofre", "fondo", "fondo_frente",
  "fondo_sin_movil", "movil", "sol", "insignia_experto", "insignia_maestro",
  "insignia_logro", "insignia_guardian", "insignia_detective", "arbol",
]);

function hash(p) {
  return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
}
function isDesigned(p) {
  if (!fs.existsSync(p)) return false;
  const n = fs.statSync(p).size;
  if (/\.png$/i.test(p)) return n >= 8000;
  if (/\.svg$/i.test(p)) return n >= MIN_SVG;
  return false;
}
function skipId(id) {
  return SKIP.has(id) || /^mariposa\d$/.test(id) || /^nube\d$/.test(id);
}
function games() {
  const out = [];
  for (const eje of EJES) {
    const base = path.join(ROOT, eje);
    if (!fs.existsSync(base)) continue;
    for (const g of fs.readdirSync(base, { withFileTypes: true })) {
      if (!g.isDirectory() || ["comun", "docs", "img"].includes(g.name)) continue;
      out.push({ eje, juego: g.name, dir: path.join(base, g.name) });
    }
  }
  return out;
}

const catalog = new Map(); // id → { abs, bytes, rel, ext }
const targets = new Map(); // id → Set of gameDir

function addTarget(id, gameDir) {
  if (skipId(id)) return;
  if (!targets.has(id)) targets.set(id, new Set());
  targets.get(id).add(gameDir);
}

const allGames = games();

for (const g of allGames) {
  const imgDir = path.join(g.dir, "img");
  if (fs.existsSync(imgDir)) {
    for (const f of fs.readdirSync(imgDir)) {
      if (!/\.(svg|png)$/i.test(f)) continue;
      const id = path.basename(f, path.extname(f));
      if (skipId(id)) continue;
      const abs = path.join(imgDir, f);
      if (isDesigned(abs)) {
        const bytes = fs.statSync(abs).size;
        const prev = catalog.get(id);
        if (!prev || bytes > prev.bytes) {
          catalog.set(id, {
            abs,
            bytes,
            rel: path.relative(ROOT, abs).replace(/\\/g, "/"),
            ext: path.extname(f).toLowerCase(),
          });
        }
      }
      // cualquier presencia = destino potencial
      addTarget(id, g.dir);
    }
  }
  const cfgPath = path.join(g.dir, "config.json");
  if (!fs.existsSync(cfgPath)) continue;
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  for (const poolName of ["elementos", "sonidos"]) {
    const pool = cfg[poolName] || {};
    for (const id of Object.keys(pool)) addTarget(id, g.dir);
  }
}

let copied = 0;
let skipped = 0;
let configTouches = 0;
const byId = {};

for (const [id, src] of [...catalog.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const dirs = targets.get(id);
  if (!dirs || !dirs.size) continue;
  const buf = fs.readFileSync(src.abs);
  const srcHash = hash(src.abs);
  for (const gameDir of [...dirs].sort()) {
    const imgDir = path.join(gameDir, "img");
    if (!fs.existsSync(imgDir)) {
      if (!DRY) fs.mkdirSync(imgDir, { recursive: true });
    }
    const destAbs = path.join(imgDir, id + src.ext);
    const same = fs.existsSync(destAbs) && hash(destAbs) === srcHash;
    if (same) {
      skipped += 1;
    } else {
      if (!DRY) fs.writeFileSync(destAbs, buf);
      copied += 1;
      byId[id] = (byId[id] || 0) + 1;
      console.log(
        (DRY ? "[dry] " : "") +
          "copy " +
          id +
          " ← " +
          src.rel +
          " → " +
          path.relative(ROOT, destAbs).replace(/\\/g, "/")
      );
    }

    // Si había svg plano y la fuente es png (o al revés), actualizar config
    const cfgPath = path.join(gameDir, "config.json");
    if (!fs.existsSync(cfgPath)) continue;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    let changed = false;
    const destRel = "img/" + id + src.ext;
    for (const poolName of ["elementos", "sonidos"]) {
      const pool = cfg[poolName];
      if (!pool || !pool[id]) continue;
      if (pool[id].img !== destRel) {
        pool[id].img = destRel;
        changed = true;
      }
      if (Array.isArray(pool[id].fotogramas)) {
        delete pool[id].fotogramas;
        changed = true;
      }
    }
    if (changed) {
      if (!DRY) fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
      configTouches += 1;
    }
  }
}

console.log("\nResumen", DRY ? "DRY" : "APPLY");
console.log("  ids diseñados en eje:", catalog.size, [...catalog.keys()].sort().join(", "));
console.log("  archivos copiados:", copied);
console.log("  ya iguales:", skipped);
console.log("  configs:", configTouches);
console.log(
  "  actualizados:",
  Object.entries(byId)
    .map(([k, v]) => k + "×" + v)
    .join(", ") || "—"
);
