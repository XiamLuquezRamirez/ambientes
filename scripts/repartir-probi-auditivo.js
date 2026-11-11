/**
 * Reparte SVG de Multisensorial/probi a los juegos del eje auditivo
 * que aún los tienen como falta_disenar (img/<id>.svg).
 *
 * Uso: node scripts/repartir-probi-auditivo.js [--dry]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const PROBI = path.join(ROOT, "probi");
const REPORT = path.resolve(__dirname, "../docs/informe-arte-percepcion-auditiva.json");

/** stem de archivo probi (sin prefijo N_ y espacios) → id canónico del juego */
const ALIAS = {
  moto: "motocicleta",
  lavadora: "lavadora",
};

function normalizeStem(filename) {
  let stem = path.basename(filename, path.extname(filename));
  stem = stem.replace(/^\d+_/, "").replace(/\s+/g, "").toLowerCase();
  return ALIAS[stem] || stem;
}

function walkProbi(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkProbi(abs, acc);
    else if (/\.svg$/i.test(ent.name)) {
      acc.push({
        abs,
        id: normalizeStem(ent.name),
        rel: path.relative(PROBI, abs).replace(/\\/g, "/"),
        bytes: fs.statSync(abs).size,
      });
    }
  }
  return acc;
}

execFileSync(process.execPath, [path.resolve(__dirname, "informe-arte-auditivo.js")], {
  stdio: "inherit",
});
const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));

const fuentes = walkProbi(PROBI);
const byId = new Map();
for (const f of fuentes) {
  if (byId.has(f.id)) {
    console.warn("DUPLICADO probi id=" + f.id + " → " + f.rel + " (se ignora; ya hay " + byId.get(f.id).rel + ")");
    continue;
  }
  byId.set(f.id, f);
}

console.log("Probi → IDs:", [...byId.keys()].sort().join(", "));

/** id → Set de rutas eje/juego */
const destinos = new Map();
for (const [eje, juegos] of Object.entries(report.porEje || {})) {
  for (const g of juegos) {
    for (const c of g.clasificacion || []) {
      if (c.estado !== "falta_disenar") continue;
      if (!byId.has(c.id)) continue;
      if (!destinos.has(c.id)) destinos.set(c.id, new Set());
      destinos.get(c.id).add(eje + "/" + g.juego);
    }
  }
}

let copied = 0;
let skipped = 0;
let configTouches = 0;
let missingDest = 0;
const logByGame = {};

for (const [id, fuente] of [...byId.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const games = destinos.get(id);
  if (!games || !games.size) {
    console.warn("SIN DESTINO (nadie lo pide como falta_disenar): " + id + " ← " + fuente.rel);
    missingDest += 1;
    continue;
  }
  const buf = fs.readFileSync(fuente.abs);
  for (const dest of [...games].sort()) {
    const gameDir = path.join(ROOT, dest);
    const imgDir = path.join(gameDir, "img");
    if (!fs.existsSync(imgDir)) {
      if (!DRY) fs.mkdirSync(imgDir, { recursive: true });
    }
    const destRel = "img/" + id + ".svg";
    const destAbs = path.join(gameDir, destRel);
    const same = fs.existsSync(destAbs) && fs.readFileSync(destAbs).equals(buf);
    if (same) {
      skipped += 1;
    } else {
      if (!DRY) fs.writeFileSync(destAbs, buf);
      copied += 1;
      console.log((DRY ? "[dry] " : "") + "copy " + id + " ← " + fuente.rel + " → " + dest + "/" + destRel);
    }
    logByGame[dest] = logByGame[dest] || [];
    if (!logByGame[dest].includes(id)) logByGame[dest].push(id);

    const cfgPath = path.join(gameDir, "config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (cfg.elementos && cfg.elementos[id]) {
        const before = cfg.elementos[id].img;
        let changed = false;
        if (before !== destRel) {
          cfg.elementos[id].img = destRel;
          changed = true;
        }
        if (Array.isArray(cfg.elementos[id].fotogramas)) {
          const keep = cfg.elementos[id].fotogramas.filter((f) => {
            const abs = path.join(gameDir, f);
            return fs.existsSync(abs) && fs.statSync(abs).size >= 8000;
          });
          if (keep.length) cfg.elementos[id].fotogramas = keep;
          else {
            delete cfg.elementos[id].fotogramas;
            changed = true;
          }
        }
        if (changed) {
          if (!DRY) fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
          configTouches += 1;
          if (before !== destRel) {
            console.log((DRY ? "[dry] " : "") + dest + ": " + id + " img " + before + " → " + destRel);
          }
        }
      }
    }
  }
}

// Portada Asocia: ampliar CON_DISENO con IDs que ahora tienen SVG grande local
const portadaPath = path.join(ROOT, "AsociaSonidoEImagen", "comun", "portada.js");
let portada = fs.readFileSync(portadaPath, "utf8");
const m = portada.match(/var CON_DISENO = \{([\s\S]*?)\n    \};/);
if (!m) {
  console.warn("No se encontró CON_DISENO en portada.js");
} else {
  const conDiseno = {};
  // parse existing entries loosely
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^\s*(\w+)\s*:\s*\[([^\]]*)\]/);
    if (!mm) continue;
    conDiseno[mm[1]] = [...mm[2].matchAll(/['"]([a-z0-9_]+)['"]/g)].map((x) => x[1]);
  }
  for (const [dest, ids] of Object.entries(logByGame)) {
    if (!dest.startsWith("AsociaSonidoEImagen/")) continue;
    const juego = dest.split("/")[1];
    // Solo IDs que el juego necesita (config) y que acabamos de repartir / ya estaban en CON_DISENO
    const need = new Set();
    const cfgPath = path.join(ROOT, dest, "config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      for (const n of cfg.niveles || []) {
        for (const r of n.retos || []) {
          for (const id of r.opciones || []) need.add(id);
          if (r.correcto) need.add(r.correcto);
        }
      }
      if (cfg.demo) {
        for (const id of cfg.demo.opciones || []) need.add(id);
        if (cfg.demo.correcto) need.add(cfg.demo.correcto);
      }
    }
    const set = new Set((conDiseno[juego] || []).filter((id) => need.has(id)));
    for (const id of ids) if (need.has(id)) set.add(id);
    // diseño previo de fuentes Asocia (SVG grande) solo si el reto lo usa
    const imgDir = path.join(ROOT, dest, "img");
    if (fs.existsSync(imgDir)) {
      for (const id of need) {
        const p = path.join(imgDir, id + ".svg");
        if (fs.existsSync(p) && fs.statSync(p).size >= 6000) set.add(id);
      }
    }
    conDiseno[juego] = [...set].sort();
  }
  const block =
    "    var CON_DISENO = {\n" +
    Object.keys(conDiseno)
      .sort()
      .map((j) => "        " + j + ": [" + conDiseno[j].map((id) => "'" + id + "'").join(", ") + "]")
      .join(",\n") +
    "\n    };";
  portada = portada.replace(/var CON_DISENO = \{[\s\S]*?\n    \};/, block);
  if (!DRY) fs.writeFileSync(portadaPath, portada, "utf8");
  console.log((DRY ? "[dry] " : "") + "portada CON_DISENO:", Object.keys(conDiseno).sort().join(", "));
}

console.log("\nResumen:", DRY ? "DRY" : "APPLY");
console.log("  IDs en probi:", byId.size);
console.log("  archivos copiados:", copied);
console.log("  ya iguales (skip):", skipped);
console.log("  configs tocados:", configTouches);
console.log("  probi sin destino:", missingDest);
console.log("  juegos tocados:", Object.keys(logByGame).length);

if (!DRY) {
  const arreglar = path.resolve(__dirname, "arreglar-portadas-asocia.js");
  if (fs.existsSync(arreglar)) {
    try {
      execFileSync(process.execPath, [arreglar], { stdio: "inherit" });
    } catch (e) {
      console.warn("arreglar-portadas-asocia.js falló (¿archivo bloqueado?):", e.message);
    }
  }
  execFileSync(process.execPath, [path.resolve(__dirname, "informe-arte-auditivo.js")], { stdio: "inherit" });
  const after = JSON.parse(fs.readFileSync(REPORT, "utf8"));
  console.log("\nInforme:");
  console.log("  faltan diseñar:", after.resumenGlobal.idsFaltaDisenar.length, after.resumenGlobal.idsFaltaDisenar.join(", ") || "—");
  const cubiertos = [...byId.keys()].filter((id) => !after.resumenGlobal.idsFaltaDisenar.includes(id));
  console.log("  probi ya cubiertos:", cubiertos.length, cubiertos.join(", "));
}
