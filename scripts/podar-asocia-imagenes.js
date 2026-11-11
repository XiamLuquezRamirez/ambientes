/**
 * Poda config.elementos e imágenes huérfanas de cada juego de Asocia sonido e imagen.
 * Conserva: retos + demo + EXTRA/PIELES del motor + assets de preload (img/) + insignias.
 *
 * Uso: node scripts/podar-asocia-imagenes.js [--dry]
 */
const fs = require("fs");
const path = require("path");

const DRY = process.argv.includes("--dry");
const BASE = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/AsociaSonidoEImagen");

const PORTADA = {
  QueSuena: ["bicicleta", "telefono", "reloj"],
  QueObjetoSuena: ["telefono", "avion", "aspiradora"],
  EscuchaYAsocia: ["reloj", "bicicleta", "tren"],
  UnSonidoDeViaje: ["avion", "tren", "ambulancia"],
  QueEscuchaste: ["tren", "telefono", "reloj"],
  SonidoYObjeto: ["puerta", "ventana", "cajon", "telefono"],
  SonidoDeUnaMaquina: ["aspiradora", "secador", "licuadora", "ventilador"],
  SonidoDeTransporte: ["ambulancia", "camion", "tren", "motocicleta"],
  SonidoDeUnaAccion: ["aplaudiendo", "corriendo", "saltando", "durmiendo"],
  SonidoDelAgua: ["pluma", "ducha", "fuente", "regadera"],
  LaGranAsociacion: ["reloj", "bicicleta", "puerta"], // movil es arte procedural, no elemento
};

function listGames() {
  return fs.readdirSync(BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !["comun", "docs"].includes(d.name))
    .map((d) => d.name)
    .sort();
}

function motorFiles(gameDir) {
  return fs.readdirSync(gameDir)
    .filter((f) => f.endsWith(".js") && !["script.js", "logica.js", "sfx.js"].includes(f))
    .map((f) => path.join(gameDir, f));
}

function extractArray(src, name) {
  const re = new RegExp("var\\s+" + name + "\\s*=\\s*\\[([^\\]]*)\\]");
  const m = src.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/['"]([a-z0-9_]+)['"]/g)].map((x) => x[1]);
}

function extractDisenoFiles(src) {
  const out = new Set();
  for (const m of src.matchAll(/DISENO\s*\+\s*['"]([^'"]+)['"]/g)) out.add(m[1]);
  for (const m of src.matchAll(/img\/([A-Za-z0-9_.-]+\.(?:svg|png))/g)) out.add(m[1]);
  // Cualquier 'archivo.svg|.png' en el motor con DISENO se carga desde img/
  // (incluye svg('pa:estrella@' + t, 'estrella.svg', …) donde la clave no es literal).
  if (/\bDISENO\b/.test(src)) {
    for (const m of src.matchAll(/['"]([A-Za-z0-9_.-]+\.(?:svg|png))['"]/g)) out.add(m[1]);
  }
  // 'mariposa' + i + '.svg'
  if (/['"]mariposa['"]\s*\+\s*i/.test(src)) {
    for (let i = 1; i <= 5; i++) out.add("mariposa" + i + ".svg");
  }
  // CIELO: id 'nubeN' / 'sol' → DISENO + id + '.png'
  if (/\bCIELO\b/.test(src)) {
    for (const m of src.matchAll(/id:\s*['"](nube\d+|sol)['"]/g)) out.add(m[1] + ".png");
  }
  return [...out];
}

function idsFromConfig(cfg) {
  const ids = new Set();
  for (const n of cfg.niveles || []) {
    for (const r of n.retos || []) {
      for (const id of r.opciones || []) ids.add(id);
      if (r.correcto) ids.add(r.correcto);
    }
  }
  const demo = cfg.demo || {};
  for (const id of demo.opciones || []) ids.add(id);
  if (demo.correcto) ids.add(demo.correcto);
  return ids;
}

function keptPaths(cfg, keepIds) {
  const paths = new Set();
  for (const id of keepIds) {
    const e = cfg.elementos[id];
    if (!e) continue;
    if (e.img) paths.add(e.img.replace(/\\/g, "/"));
    for (const f of e.fotogramas || []) paths.add(String(f).replace(/\\/g, "/"));
  }
  for (const n of cfg.niveles || []) {
    if (n.insignia && n.insignia.img) paths.add(n.insignia.img.replace(/\\/g, "/"));
  }
  return paths;
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function pruneGame(name) {
  const gameDir = path.join(BASE, name);
  const cfgPath = path.join(gameDir, "config.json");
  if (!fs.existsSync(cfgPath)) {
    console.log("SKIP " + name + " (sin config)");
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const motors = motorFiles(gameDir).map((f) => fs.readFileSync(f, "utf8")).join("\n");

  const keepIds = new Set([
    ...idsFromConfig(cfg),
    ...extractArray(motors, "EXTRA"),
    ...extractArray(motors, "PIELES"),
    ...(PORTADA[name] || []),
  ]);

  // Hardcodes sueltos (p. ej. SonidoDelAgua demo de llaves)
  for (const m of motors.matchAll(/\[['"]([a-z_]+)['"]\s*,\s*['"]([a-z_]+)['"]\]/g)) {
    // solo si ambos son elementos conocidos
    if (cfg.elementos[m[1]]) keepIds.add(m[1]);
    if (cfg.elementos[m[2]]) keepIds.add(m[2]);
  }

  const missing = [...keepIds].filter((id) => !cfg.elementos[id]);
  if (missing.length) {
    console.warn("  WARN " + name + ": keepIds sin entrada en elementos: " + missing.join(", "));
  }

  const before = Object.keys(cfg.elementos);
  const next = {};
  for (const id of before) {
    if (keepIds.has(id)) next[id] = cfg.elementos[id];
  }
  // orden estable: keepIds en orden de aparición original
  cfg.elementos = next;

  const assetPaths = keptPaths(cfg, keepIds);
  const motorAssets = new Set(extractDisenoFiles(motors));
  for (const p of assetPaths) {
    const m = p.match(/^img\/(.+)$/);
    if (m) motorAssets.add(m[1]);
  }

  const imgDir = path.join(gameDir, "img");
  const allImgs = walkFiles(imgDir).filter((f) => /\.(svg|png|jpe?g|gif|webp)$/i.test(f));
  const toDelete = [];
  for (const abs of allImgs) {
    const rel = path.relative(gameDir, abs).replace(/\\/g, "/");
    const base = path.basename(rel);
    if (!motorAssets.has(base) && !assetPaths.has(rel)) toDelete.push(abs);
  }

  console.log("==== " + name + " ====");
  console.log("  elementos: " + before.length + " → " + Object.keys(next).length + " (" + Object.keys(next).join(", ") + ")");
  console.log("  borrar imgs: " + toDelete.length);
  for (const f of toDelete) console.log("    - " + path.relative(gameDir, f).replace(/\\/g, "/"));

  if (!DRY) {
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    for (const f of toDelete) fs.unlinkSync(f);
  }
}

function cleanHtmlPortadas() {
  // Quita data-laboratorio hacia assets borrados y el 4º slot de pluma en juegos 3-item.
  for (const name of listGames()) {
    const htmlPath = path.join(BASE, name, "index.html");
    if (!fs.existsSync(htmlPath)) continue;
    let html = fs.readFileSync(htmlPath, "utf8");
    const before = html;
    // data-laboratorio solo aplica a nivel 5; si apunta a img/ plano que ya no existe, quitar attr
    html = html.replace(/\s+data-laboratorio="img\/[^"]+\.svg"/g, "");
    // Si portada tiene 3 items y hay ie4 con pluma, dejarlo (portada.js lo oculta) — no tocar HTML estructural.
    if (html !== before) {
      console.log("HTML limpio data-laboratorio: " + name);
      if (!DRY) fs.writeFileSync(htmlPath, html, "utf8");
    }
  }
}

console.log(DRY ? "[DRY RUN]" : "[APPLY]");
for (const g of listGames()) pruneGame(g);
cleanHtmlPortadas();
console.log("Listo.");
