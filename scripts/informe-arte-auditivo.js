/**
 * Informe de arte (imágenes) del eje auditivo Multisensorial.
 * Fuentes de diseño listo: QueSuena, QueObjetoSuena, EscuchaYAsocia.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
/** Carpetas de temáticas del eje Percepción Auditiva (Multisensorial). */
const EJES = [
  "AsociaSonidoEImagen",
  "MemoriaAuditiva",
  "EncuentraElSonido",
  "QueSonidoEscuchas",
  "RepiteLaSecuencia",
];
const FUENTES = {
  QueSuena: path.join(ROOT, "AsociaSonidoEImagen", "QueSuena", "img"),
  QueObjetoSuena: path.join(ROOT, "AsociaSonidoEImagen", "QueObjetoSuena", "img"),
  EscuchaYAsocia: path.join(ROOT, "AsociaSonidoEImagen", "EscuchaYAsocia", "img"),
};
const PROBI_DIR = path.join(ROOT, "probi");
const PROBI_ALIAS = { moto: "motocicleta" };

function normalizeProbiStem(filename) {
  let stem = path.basename(filename, path.extname(filename));
  stem = stem.replace(/^\d+_/, "").replace(/\s+/g, "").toLowerCase();
  return PROBI_ALIAS[stem] || stem;
}

const UI_STEMS = new Set([
  "escuchar", "estrella", "carrito", "topo", "cofre", "fondo", "fondo_frente",
  "fondo_sin_movil", "movil", "sol", "nube1", "nube2", "nube3", "nube4", "nube5", "nube6",
  "mariposa1", "mariposa2", "mariposa3", "mariposa4", "mariposa5",
  "insignia_experto", "insignia_maestro",
]);

/** IDs de config que no son objetos visuales (marcadores de lógica). */
const META_IDS = new Set(["azar", "aleatorio", "random"]);

function hashFile(p) {
  return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
}

function listImgs(dir, acc = [], prefix = "") {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + "/" + ent.name : ent.name;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) listImgs(abs, acc, rel);
    else if (/\.(svg|png|jpe?g|gif|webp)$/i.test(ent.name)) {
      acc.push({
        rel,
        name: ent.name,
        stem: path.basename(ent.name, path.extname(ent.name)).replace(/_b$|_abierta$/, ""),
        stemFull: path.basename(ent.name, path.extname(ent.name)),
        ext: path.extname(ent.name).toLowerCase(),
        bytes: fs.statSync(abs).size,
        abs,
        hash: hashFile(abs),
      });
    }
  }
  return acc;
}

function gamesIn(eje) {
  const base = path.join(ROOT, eje);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !["comun", "docs", "img"].includes(d.name))
    .map((d) => d.name)
    .sort();
}

function extractArray(src, name) {
  const m = src.match(new RegExp("var\\s+" + name + "\\s*=\\s*\\[([^\\]]*)\\]"));
  if (!m) return [];
  return [...m[1].matchAll(/['"]([a-z0-9_]+)['"]/g)].map((x) => x[1]);
}

function neededIds(gameDir) {
  const ids = new Set();
  const cfgPath = path.join(gameDir, "config.json");
  if (!fs.existsSync(cfgPath)) return { ids, demo: [], retos: [], extra: [], pieles: [], hasConfig: false };
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const retos = [];
  const demo = [];
  for (const n of cfg.niveles || []) {
    for (const r of n.retos || []) {
      for (const id of r.opciones || []) {
        ids.add(id);
        retos.push(id);
      }
      if (r.correcto) {
        ids.add(r.correcto);
        retos.push(r.correcto);
      }
    }
  }
  if (cfg.demo) {
    for (const id of cfg.demo.opciones || []) {
      ids.add(id);
      demo.push(id);
    }
    if (cfg.demo.correcto) {
      ids.add(cfg.demo.correcto);
      demo.push(cfg.demo.correcto);
    }
  }
  // también claves de elementos que el config declara (por si el motor usa más)
  // NO: solo necesitados por juego
  const motors = fs.readdirSync(gameDir)
    .filter((f) => f.endsWith(".js") && !["script.js", "logica.js", "sfx.js"].includes(f))
    .map((f) => fs.readFileSync(path.join(gameDir, f), "utf8"))
    .join("\n");
  const extra = extractArray(motors, "EXTRA");
  const pieles = extractArray(motors, "PIELES");
  extra.forEach((id) => ids.add(id));
  pieles.forEach((id) => ids.add(id));
  for (const id of [...ids]) if (META_IDS.has(id)) ids.delete(id);
  return { ids, demo: [...new Set(demo)].filter((id) => !META_IDS.has(id)), retos: [...new Set(retos)].filter((id) => !META_IDS.has(id)), extra, pieles, hasConfig: true, cfg };
}

function elementImgPath(cfg, id) {
  const e = cfg && cfg.elementos && cfg.elementos[id];
  if (!e) return null;
  return e.img || null;
}

function isDesignedArt(file) {
  // heurística: SVG "diseño" suelen ser > 8KB; los planos legacy ~1KB
  if (file.ext === ".png") return true;
  if (file.ext === ".svg" && file.bytes >= 8000) return true;
  // UI/insignias pequeñas cuentan si están en fuentes
  return UI_STEMS.has(file.stemFull) || /^mariposa\d$/.test(file.stemFull) || /^nube\d$/.test(file.stemFull);
}

// Catálogo de diseño listo (fuentes Asocia + probi), indexado por id canónico
const catalogo = new Map(); // id -> { sources: [], file, hashes }
for (const [srcName, dir] of Object.entries(FUENTES)) {
  for (const f of listImgs(dir)) {
    const key = f.stemFull;
    if (!catalogo.has(key)) catalogo.set(key, { stem: key, sources: [], file: f, hashes: new Set() });
    const e = catalogo.get(key);
    e.sources.push(srcName);
    e.hashes.add(f.hash);
    if (f.bytes > e.file.bytes) e.file = f;
  }
}
// Banco probi: nombres con prefijo "N_ " / espacios / alias (Moto→motocicleta)
if (fs.existsSync(PROBI_DIR)) {
  for (const f of listImgs(PROBI_DIR)) {
    const key = normalizeProbiStem(f.name);
    if (!key || UI_STEMS.has(key)) continue;
    if (!catalogo.has(key)) catalogo.set(key, { stem: key, sources: [], file: f, hashes: new Set() });
    const e = catalogo.get(key);
    if (!e.sources.includes("probi")) e.sources.push("probi");
    e.hashes.add(f.hash);
    if (f.bytes > e.file.bytes) e.file = f;
  }
}

const OBJECT_FROM_CATALOG = [...catalogo.keys()].filter((k) => !UI_STEMS.has(k) && !/^nube\d$/.test(k) && !/^mariposa\d$/.test(k));

const report = {
  generado: new Date().toISOString(),
  fuentes: {},
  catalogoObjetos: OBJECT_FROM_CATALOG.sort(),
  catalogoUi: [...catalogo.keys()].filter((k) => !OBJECT_FROM_CATALOG.includes(k)).sort(),
  porEje: {},
  resumenGlobal: {
    idsNecesarios: new Set(),
    yaEnJuegoConArte: new Set(), // juego tiene copia designed-looking OR id in catalog and local matches?
    replicables: new Set(),
    faltanDisenar: new Set(),
  },
};

for (const [name, dir] of Object.entries(FUENTES)) {
  const imgs = listImgs(dir);
  report.fuentes[name] = {
    total: imgs.length,
    objetos: imgs.filter((f) => OBJECT_FROM_CATALOG.includes(f.stemFull)).map((f) => f.name).sort(),
    uiEscena: imgs.filter((f) => !OBJECT_FROM_CATALOG.includes(f.stemFull)).map((f) => f.name).sort(),
  };
}
if (fs.existsSync(PROBI_DIR)) {
  const imgs = listImgs(PROBI_DIR);
  report.fuentes.probi = {
    total: imgs.length,
    objetos: imgs.map((f) => normalizeProbiStem(f.name) + " ← " + f.rel).sort(),
    uiEscena: [],
  };
}

function classifyId(id, gameDir, cfg) {
  const localPath = elementImgPath(cfg, id);
  const candidates = [];
  // paths posibles
  const tryPaths = [];
  if (localPath) tryPaths.push(path.join(gameDir, localPath));
  tryPaths.push(path.join(gameDir, "img", id + ".svg"));
  tryPaths.push(path.join(gameDir, "img", id + ".png"));
  let local = null;
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      local = {
        path: path.relative(gameDir, p).replace(/\\/g, "/"),
        bytes: fs.statSync(p).size,
        hash: hashFile(p),
        ext: path.extname(p).toLowerCase(),
      };
      break;
    }
  }

  const inCatalog = catalogo.has(id);
  const cat = inCatalog ? catalogo.get(id) : null;

  if (local && cat && local.hash && cat.hashes.has(local.hash)) {
    return { id, estado: "ya_tiene_diseno", detalle: "copia idéntica a fuente", local: local.path, fuentes: cat.sources };
  }
  // Umbral 6KB: instrumentos de probi (trompeta/campana/…) quedan ~7KB y son diseño real
  if (local && local.ext === ".svg" && local.bytes >= 6000) {
    return { id, estado: "ya_tiene_diseno", detalle: "SVG de diseño local", local: local.path, fuentes: cat ? cat.sources : [] };
  }
  if (local && local.ext === ".png") {
    return { id, estado: "ya_tiene_diseno", detalle: "PNG local", local: local.path, fuentes: cat ? cat.sources : [] };
  }
  if (inCatalog) {
    return {
      id,
      estado: "replicar",
      detalle: local
        ? "tiene SVG plano/legacy; se puede sustituir por arte de " + cat.sources.join("/")
        : "sin archivo local; copiar desde " + cat.sources.join("/"),
      local: local ? local.path : null,
      fuentes: cat.sources,
      sugerido: path.relative(ROOT, cat.file.abs).replace(/\\/g, "/"),
    };
  }
  return {
    id,
    estado: "falta_disenar",
    detalle: local ? "solo arte plano/legacy o PedniaArte procedural" : "sin imagen local ni en catálogo de diseño",
    local: local ? local.path : null,
    fuentes: [],
  };
}

for (const eje of EJES) {
  report.porEje[eje] = [];
  for (const game of gamesIn(eje)) {
    const gameDir = path.join(ROOT, eje, game);
    const need = neededIds(gameDir);
    const rows = [];
    if (!need.hasConfig) {
      report.porEje[eje].push({ juego: game, sinConfig: true, ids: [] });
      continue;
    }
    const sorted = [...need.ids].sort();
    for (const id of sorted) {
      const row = classifyId(id, gameDir, need.cfg);
      rows.push(row);
      report.resumenGlobal.idsNecesarios.add(id);
      if (row.estado === "ya_tiene_diseno") report.resumenGlobal.yaEnJuegoConArte.add(eje + "/" + game + ":" + id);
      if (row.estado === "replicar") report.resumenGlobal.replicables.add(id);
      if (row.estado === "falta_disenar") report.resumenGlobal.faltanDisenar.add(id);
    }
    // assets UI en motor (escuchar, estrella…) — solo Asocia con DISENO
    const motors = fs.readdirSync(gameDir)
      .filter((f) => f.endsWith(".js") && !["script.js", "logica.js", "sfx.js"].includes(f))
      .map((f) => fs.readFileSync(path.join(gameDir, f), "utf8"))
      .join("\n");
    const uiNeeded = [];
    if (/\bDISENO\b/.test(motors)) {
      for (const m of motors.matchAll(/['"]([A-Za-z0-9_.-]+\.(?:svg|png))['"]/g)) {
        const stem = path.basename(m[1], path.extname(m[1]));
        if (UI_STEMS.has(stem) || /^mariposa\d$/.test(stem) || /^nube\d$/.test(stem)) uiNeeded.push(stem);
      }
      if (/['"]mariposa['"]\s*\+\s*i/.test(motors)) for (let i = 1; i <= 5; i++) uiNeeded.push("mariposa" + i);
      for (const m of motors.matchAll(/id:\s*['"](nube\d+|sol)['"]/g)) uiNeeded.push(m[1]);
    }

    report.porEje[eje].push({
      juego: game,
      ruta: eje + "/" + game,
      idsNecesarios: sorted,
      extra: need.extra,
      clasificacion: rows,
      conteo: {
        ya: rows.filter((r) => r.estado === "ya_tiene_diseno").length,
        replicar: rows.filter((r) => r.estado === "replicar").length,
        falta: rows.filter((r) => r.estado === "falta_disenar").length,
      },
      uiMotor: [...new Set(uiNeeded)].sort(),
    });
  }
}

// Agregados útiles
const faltaGlobal = [...report.resumenGlobal.faltanDisenar].sort();
const replicarGlobal = [...report.resumenGlobal.replicables].sort();

const out = {
  ...report,
  resumenGlobal: {
    objetosEnCatalogoFuente: OBJECT_FROM_CATALOG.length,
    uiEnCatalogoFuente: report.catalogoUi.length,
    idsUnicosNecesariosEnEje: report.resumenGlobal.idsNecesarios.size,
    idsReplicablesDesdeFuentes: replicarGlobal,
    idsFaltaDisenar: faltaGlobal,
    slotsYaConArte: report.resumenGlobal.yaEnJuegoConArte.size,
  },
  matrizReplicacion: {},
};

// por cada id replicable: qué juegos lo necesitan
for (const id of replicarGlobal) {
  const juegos = [];
  for (const eje of EJES) {
    for (const g of out.porEje[eje]) {
      if (g.clasificacion && g.clasificacion.some((r) => r.id === id && r.estado === "replicar")) {
        juegos.push(g.ruta);
      }
    }
  }
  out.matrizReplicacion[id] = {
    fuentes: catalogo.get(id).sources,
    archivo: path.relative(ROOT, catalogo.get(id).file.abs).replace(/\\/g, "/"),
    juegosDestino: juegos,
  };
}

const faltaDetalle = {};
for (const id of faltaGlobal) {
  const juegos = [];
  for (const eje of EJES) {
    for (const g of out.porEje[eje]) {
      if (g.clasificacion && g.clasificacion.some((r) => r.id === id && r.estado === "falta_disenar")) {
        juegos.push(g.ruta);
      }
    }
  }
  faltaDetalle[id] = juegos;
}
out.faltaDisenarDetalle = faltaDetalle;

const outPath = path.resolve(__dirname, "../docs/informe-arte-percepcion-auditiva.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

// Markdown
let md = `# Informe de arte — Percepción auditiva (Multisensorial)\n\n`;
md += `Generado: ${out.generado}\n\n`;
md += `Ámbito (temáticas de Percepción Auditiva): \`AsociaSonidoEImagen\`, \`MemoriaAuditiva\`, \`EncuentraElSonido\`, \`QueSonidoEscuchas\`, \`RepiteLaSecuencia\`.\n\n`;
md += `Fuentes de diseño listo: **QueSuena**, **QueObjetoSuena**, **EscuchaYAsocia** (y SVG ≥6KB ya repartidos en cada juego).\n\n`;

md += `## 1. Catálogo ya diseñado (fuentes)\n\n`;
for (const [name, info] of Object.entries(out.fuentes)) {
  md += `### ${name} (${info.total} archivos)\n\n`;
  md += `- **Objetos:** ${info.objetos.join(", ") || "—"}\n`;
  md += `- **UI / escena:** ${info.uiEscena.join(", ") || "—"}\n\n`;
}
md += `**Objetos únicos en catálogo:** ${out.catalogoObjetos.join(", ")}\n\n`;

md += `## 2. Resumen ejecutivo\n\n`;
md += `| Métrica | Valor |\n|---|---:|\n`;
md += `| Objetos con arte en fuentes | ${out.resumenGlobal.objetosEnCatalogoFuente} |\n`;
md += `| IDs únicos pedidos por configs/motores del eje | ${out.resumenGlobal.idsUnicosNecesariosEnEje} |\n`;
md += `| IDs que se pueden **replicar** desde fuentes | ${out.resumenGlobal.idsReplicablesDesdeFuentes.length} |\n`;
md += `| IDs que **faltan por diseñar** | ${out.resumenGlobal.idsFaltaDisenar.length} |\n\n`;

md += `## 3. Por juego (Asocia sonido e imagen)\n\n`;
md += `| Juego | Ya con arte | Replicable | Falta diseñar | IDs |\n|---|---:|---:|---:|---|\n`;
for (const g of out.porEje.AsociaSonidoEImagen) {
  if (!g.conteo) continue;
  const falta = g.clasificacion.filter((r) => r.estado === "falta_disenar").map((r) => r.id).join(", ") || "—";
  const rep = g.clasificacion.filter((r) => r.estado === "replicar").map((r) => r.id).join(", ") || "—";
  md += `| ${g.juego} | ${g.conteo.ya} | ${g.conteo.replicar} | ${g.conteo.falta} | falta: ${falta} / replicar: ${rep} |\n`;
}

md += `\n## 4. Replicables desde QueSuena / QueObjetoSuena / EscuchaYAsocia\n\n`;
md += `| ID | Fuentes | Copiar a |\n|---|---|---|\n`;
for (const id of out.resumenGlobal.idsReplicablesDesdeFuentes) {
  const m = out.matrizReplicacion[id];
  md += `| ${id} | ${m.fuentes.join(", ")} | ${m.juegosDestino.join(", ")} |\n`;
}

md += `\n## 5. Faltan por diseñar\n\n`;
md += `| ID | Lo piden |\n|---|---|\n`;
for (const id of out.resumenGlobal.idsFaltaDisenar) {
  md += `| ${id} | ${out.faltaDisenarDetalle[id].join(", ")} |\n`;
}

md += `\n## 6. Memoria / Encuentra / Qué sonido / Repite la secuencia\n\n`;
for (const eje of ["MemoriaAuditiva", "EncuentraElSonido", "QueSonidoEscuchas", "RepiteLaSecuencia"]) {
  md += `### ${eje}\n\n`;
  md += `| Juego | Ya | Replicar | Falta | Detalle falta / replicar |\n|---|---:|---:|---:|---|\n`;
  for (const g of out.porEje[eje]) {
    if (!g.conteo) {
      md += `| ${g.juego} | — | — | — | sin config.json |\n`;
      continue;
    }
    const falta = g.clasificacion.filter((r) => r.estado === "falta_disenar").map((r) => r.id).join(", ") || "—";
    const rep = g.clasificacion.filter((r) => r.estado === "replicar").map((r) => r.id).join(", ") || "—";
    md += `| ${g.juego} | ${g.conteo.ya} | ${g.conteo.replicar} | ${g.conteo.falta} | F: ${falta} / R: ${rep} |\n`;
  }
  md += `\n`;
}

md += `\n## 7. Notas / puntos ciegos\n\n`;
md += `- "Replicable" = el ID existe como arte en las fuentes, pero el juego destino aún usa SVG plano, no tiene archivo, o no coincide el hash.\n`;
md += `- Acciones (\`aplaudiendo\`, \`corriendo\`, …) en Asocia suelen ir a fotos 3D en portada; igual cuentan como falta de ilustración 2D de diseño si no hay SVG grande.\n`;
md += `- UI de escena (fondos, carrito, topo, mariposas) es específica de cada motor; no se lista como objeto de reto salvo que el juego la precargue.\n`;
md += `- Se excluyen IDs meta de config (\`azar\` = respuesta aleatoria, no es un dibujo).\n`;
md += `- JSON crudo: \`docs/informe-arte-percepcion-auditiva.json\`.\n`;
md += `- Regenerar: \`node scripts/informe-arte-auditivo.js\`.\n`;

const mdPath = path.resolve(__dirname, "../docs/informe-arte-percepcion-auditiva.md");
fs.writeFileSync(mdPath, md, "utf8");
console.log("JSON:", outPath);
console.log("MD:", mdPath);
console.log("Catalogo objetos:", out.catalogoObjetos.join(", "));
console.log("Replicables:", out.resumenGlobal.idsReplicablesDesdeFuentes.join(", "));
console.log("Faltan:", out.resumenGlobal.idsFaltaDisenar.join(", "));
