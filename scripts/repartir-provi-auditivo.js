/**
 * Reparte public/catalogo_juegos/Multisensorial/provi → img/ de Percepción Auditiva.
 * Sobrescribe archivos vivos, alinea alias (moto→motocicleta, carro→carro.svg)
 * y actualiza config.json cuando cambia la extensión.
 *
 * Uso: node scripts/repartir-provi-auditivo.js [--dry]
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const PROVI = path.join(ROOT, "provi");
const EJES = [
  "AsociaSonidoEImagen",
  "MemoriaAuditiva",
  "EncuentraElSonido",
  "QueSonidoEscuchas",
  "RepiteLaSecuencia",
];

/** clave canónica → nombres de archivo destino (sin extensión forzada) */
const ALIASES = {
  moto: ["motocicleta", "moto"],
  carro: ["carro"],
  "carro-22": ["carro"],
};

function md5(buf) {
  return crypto.createHash("md5").update(buf).digest("hex");
}

function canonicalKey(baseName) {
  let k = baseName.replace(/^\d+_\s*/, "").replace(/\s+$/, "").toLowerCase();
  if (k === "carro-22") k = "carro";
  return k;
}

function targetBasenames(key) {
  if (ALIASES[key]) return ALIASES[key];
  return [key];
}

function walkFiles(dir, pred) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(p, pred));
    else if (!pred || pred(p, ent.name)) out.push(p);
  }
  return out;
}

function isImgAsset(filePath) {
  const norm = filePath.replace(/\\/g, "/");
  if (!/\/img(\/|$)/i.test(norm)) return false;
  if (/\/provi\//i.test(norm)) return false;
  return /\.(svg|png|jpg|jpeg|webp)$/i.test(filePath);
}

function loadProvi() {
  const map = new Map(); // key -> { abs, buf, hash }
  for (const abs of walkFiles(PROVI, (p) => /\.svg$/i.test(p))) {
    const key = canonicalKey(path.basename(abs, path.extname(abs)));
    const buf = fs.readFileSync(abs);
    map.set(key, { abs, buf, hash: md5(buf), rel: path.relative(PROVI, abs) });
  }
  return map;
}

function findLiveMatches(basenames) {
  const lower = new Set(basenames.map((b) => b.toLowerCase()));
  const hits = [];
  for (const eje of EJES) {
    const ejeDir = path.join(ROOT, eje);
    for (const abs of walkFiles(ejeDir, isImgAsset)) {
      const base = path.basename(abs, path.extname(abs)).toLowerCase();
      if (lower.has(base)) hits.push(abs);
    }
  }
  return hits;
}

function gamesNeedingId(id) {
  const games = new Set();
  for (const eje of EJES) {
    const ejeDir = path.join(ROOT, eje);
    if (!fs.existsSync(ejeDir)) continue;
    for (const game of fs.readdirSync(ejeDir, { withFileTypes: true })) {
      if (!game.isDirectory() || ["comun", "docs"].includes(game.name)) continue;
      const cfgPath = path.join(ejeDir, game.name, "config.json");
      if (!fs.existsSync(cfgPath)) continue;
      const raw = fs.readFileSync(cfgPath, "utf8");
      // id como clave de elementos o literal en retos
      const re = new RegExp(
        `["']${id}["']\\s*:|"${id}"|'${id}'|/${id}\\.(?:svg|png)`,
        "i"
      );
      if (re.test(raw)) games.add(path.join(eje, game.name));
    }
  }
  return [...games];
}

function patchConfigsCarroPngToSvg(touchedConfigs) {
  const changes = [];
  for (const eje of EJES) {
    const ejeDir = path.join(ROOT, eje);
    if (!fs.existsSync(ejeDir)) continue;
    for (const abs of walkFiles(ejeDir, (p) => /config\.json$/i.test(p))) {
      const raw = fs.readFileSync(abs, "utf8");
      if (!/carro\.png/i.test(raw)) continue;
      const next = raw.replace(/carro\.png/gi, "carro.svg");
      if (next === raw) continue;
      if (!DRY) fs.writeFileSync(abs, next, "utf8");
      changes.push(path.relative(ROOT, abs));
      touchedConfigs.add(abs);
    }
  }
  return changes;
}

function main() {
  if (!fs.existsSync(PROVI)) {
    console.error("No existe carpeta provi:", PROVI);
    process.exit(1);
  }

  const provi = loadProvi();
  console.log(`Provi: ${provi.size} SVG`);
  console.log(DRY ? "[DRY RUN]\n" : "");

  const report = {
    overwritten: [],
    created: [],
    alreadySame: [],
    configPatches: [],
    missingTargets: [],
  };

  for (const [key, src] of [...provi.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const basenames = targetBasenames(key);
    const lives = findLiveMatches(basenames);

    if (lives.length === 0) {
      // Crear en juegos cuyo config pide el id
      const needing = gamesNeedingId(basenames[0]).concat(
        basenames.slice(1).flatMap(gamesNeedingId)
      );
      const uniqueGames = [...new Set(needing)];
      if (uniqueGames.length === 0) {
        report.missingTargets.push({
          key,
          reason: "sin archivo vivo ni config que lo pida en PA",
        });
        continue;
      }
      for (const g of uniqueGames) {
        const destName = `${basenames[0]}.svg`;
        const dest = path.join(ROOT, g, "img", destName);
        const existed = fs.existsSync(dest);
        if (existed && md5(fs.readFileSync(dest)) === src.hash) {
          report.alreadySame.push(path.relative(ROOT, dest));
          continue;
        }
        if (!DRY) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, src.buf);
        }
        (existed ? report.overwritten : report.created).push(
          path.relative(ROOT, dest)
        );
      }
      continue;
    }

    for (const live of lives) {
      const ext = path.extname(live).toLowerCase();
      const dir = path.dirname(live);
      const base = path.basename(live, ext).toLowerCase();

      // Preferir .svg como destino canónico
      let dest = live;
      if (ext !== ".svg") {
        dest = path.join(dir, `${base}.svg`);
      }

      const sameLive =
        fs.existsSync(dest) && md5(fs.readFileSync(dest)) === src.hash;
      if (sameLive) {
        report.alreadySame.push(path.relative(ROOT, dest));
        // si quedaba png viejo junto al svg nuevo, marcar para limpieza
        if (dest !== live && !DRY && fs.existsSync(live)) {
          fs.unlinkSync(live);
          report.overwritten.push(
            `DELETE ${path.relative(ROOT, live)} (reemplazado por .svg)`
          );
        }
        continue;
      }

      if (!DRY) {
        fs.writeFileSync(dest, src.buf);
        if (dest !== live && fs.existsSync(live)) fs.unlinkSync(live);
      }
      report.overwritten.push(
        dest === live
          ? path.relative(ROOT, dest)
          : `${path.relative(ROOT, live)} → ${path.basename(dest)}`
      );
    }
  }

  const touched = new Set();
  report.configPatches = patchConfigsCarroPngToSvg(touched);

  // Verificación post-escritura
  const mismatches = [];
  if (!DRY) {
    for (const [key, src] of provi) {
      const lives = findLiveMatches(targetBasenames(key));
      for (const live of lives) {
        if (md5(fs.readFileSync(live)) !== src.hash) {
          mismatches.push(path.relative(ROOT, live));
        }
      }
    }
  }

  console.log("=== RESULTADO ===");
  console.log(`Sobrescritos/reemplazados: ${report.overwritten.length}`);
  console.log(`Creados: ${report.created.length}`);
  console.log(`Ya iguales: ${report.alreadySame.length}`);
  console.log(`Configs parcheados (carro.png→svg): ${report.configPatches.length}`);
  console.log(`Sin destino en PA: ${report.missingTargets.length}`);
  if (mismatches.length) {
    console.log(`\nFALLÓ verificación hash (${mismatches.length}):`);
    mismatches.forEach((m) => console.log("  !", m));
    process.exit(2);
  }

  if (report.missingTargets.length) {
    console.log("\nSin destino:");
    report.missingTargets.forEach((m) =>
      console.log(`  - ${m.key}: ${m.reason}`)
    );
  }

  // Muestra compacta
  console.log("\n--- overwritten (muestra) ---");
  report.overwritten.slice(0, 40).forEach((x) => console.log(" ", x));
  if (report.overwritten.length > 40) {
    console.log(`  ... +${report.overwritten.length - 40}`);
  }
  console.log("\n--- created ---");
  report.created.forEach((x) => console.log(" ", x));
  console.log("\n--- configs ---");
  report.configPatches.forEach((x) => console.log(" ", x));

  // Resumen por clave: ¿todos los lives coinciden?
  console.log("\n=== CHECK POR CLAVE ===");
  for (const [key, src] of [...provi.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const lives = findLiveMatches(targetBasenames(key));
    if (!lives.length) {
      console.log(`${key}: sin lives`);
      continue;
    }
    let ok = 0;
    let bad = 0;
    for (const live of lives) {
      const h = DRY ? "?" : md5(fs.readFileSync(live));
      if (!DRY && h === src.hash) ok++;
      else if (!DRY) bad++;
    }
    console.log(
      `${key}: lives=${lives.length} ok=${ok} bad=${bad} src=${path.basename(src.abs)}`
    );
  }
}

main();
