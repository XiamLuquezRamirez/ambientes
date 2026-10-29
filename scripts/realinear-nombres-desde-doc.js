/**
 * Realinea nombre/slug/carpeta con títulos narrativos del doc (empareje por tokens, no por índice).
 * Uso:
 *   node scripts/realinear-nombres-desde-doc.js --dry
 *   node scripts/realinear-nombres-desde-doc.js
 */
const fs = require("fs");
const path = require("path");

const DRY = process.argv.includes("--dry");
const ROOT = process.cwd();
const PUB = path.join(ROOT, "public");
const OUT = path.join(ROOT, "scripts", "renombres-desde-doc.json");

const STOP = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "y", "o", "en", "con",
  "por", "para", "que", "se", "su", "sus", "vs", "the", "of", "reto", "final", "anos", "años", "edad",
]);

function sinTildes(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

function aPascal(nombre) {
  const limpio = sinTildes(nombre)
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  return limpio || "Juego";
}

function aSlug(nombre) {
  return (
    sinTildes(nombre)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "juego"
  );
}

function tokens(s) {
  return sinTildes(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

function esMetadata(s) {
  const t = String(s).trim();
  if (!t) return true;
  if (/^(?:\d+\s+)?(elementos?|opciones?|sentidos?)\b/i.test(t)) return true;
  if (/^(?:\d+\s+)?sentidos?\s*\+/i.test(t)) return true;
  if (/selecci[oó]n simple/i.test(t)) return true;
  if (/complejidad m[aá]xima/i.test(t)) return true;
  if (/an[aá]lisis de matices/i.test(t)) return true;
  if (/prueba de (frecuencia|mol[eé]culas)/i.test(t)) return true;
  if (/filtro de luz/i.test(t)) return true;
  if (/identificaci[oó]n de flavor/i.test(t)) return true;
  if (/vista \+|olfato \+|gusto \+/i.test(t)) return true;
  if (/fen[oó]meno [oó]ptico/i.test(t)) return true;
  if (/^foco$/i.test(t)) return true;
  if (/identificaci[oó]n b[aá]sica/i.test(t)) return true;
  if (/conexi[oó]n con el entorno/i.test(t)) return true;
  if (/objetos de la casa/i.test(t)) return true;
  return false;
}

function pareceProsa(s) {
  const t = String(s).trim();
  if (t.length > 70) return true;
  if (/,/.test(t) && t.length > 45) return true;
  if (/\ben las ramas\b|\baparece\b|\bcuelga\b|\bhecha de\b/i.test(t)) return true;
  return false;
}

function titleCaseSuave(nombre) {
  let s = String(nombre).replace(/\s+/g, " ").trim();
  const letters = s.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/g, "");
  if (letters.length > 4 && letters === letters.toUpperCase()) {
    s = s.toLowerCase();
  }
  const small = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "en", "a", "al", "un", "una", "vs", "se"]);
  const parts = s.split(/(\s+|¿|¡|-)/);
  let firstWord = true;
  return parts
    .map((p) => {
      if (p === "¿" || p === "¡") {
        firstWord = true;
        return p;
      }
      if (/^\s+$/.test(p) || p === "-") return p;
      const low = p.toLowerCase();
      const core = low.replace(/[^a-záéíóúñü]/gi, "");
      if (!firstWord && small.has(core)) {
        return low;
      }
      firstWord = false;
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join("");
}

function limpiarTitulo(raw) {
  let line = String(raw || "").replace(/\s+/g, " ").trim();
  if (!line) return "";
  line = line.replace(/^\*+|\*+$/g, "").trim();

  const partesPipe = line.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (partesPipe.length >= 2) {
    const derecha = partesPipe[partesPipe.length - 1].replace(/\.+$/, "");
    const izquierda = partesPipe.slice(0, -1).join(" | ");
    if (!esMetadata(derecha) && !pareceProsa(derecha) && derecha.length >= 3 && derecha.length <= 70) {
      line = derecha;
    } else {
      line = izquierda;
    }
  }

  line = line.replace(
    /:\s*(Asociación|Reconocimiento|Discriminación|Foco|Memoria|Cambio|Deducción|Estímulo|Rítmicos).*$/iu,
    ""
  );

  // Quitar coletillas pedagógicas entre paréntesis
  line = line.replace(/\s*\((?:ausencia|cambio|detecci[oó]n|memoria|foco|trampa)[^)]*\)\s*$/iu, "").trim();

  const segs = line.split(/\s*:\s*/).map((s) => s.trim()).filter(Boolean);
  if (segs.length >= 2) {
    const primero = segs[0];
    const resto = segs.slice(1).join(": ");
    if (!esMetadata(primero) && !pareceProsa(primero) && (esMetadata(resto) || pareceProsa(resto) || resto.length > 35)) {
      line = primero;
    }
  }

  line = line.replace(/^["“«]+|["”»]+$/g, "").trim().replace(/\.+$/, "").trim();
  // Quitar ":" final tipo "Atrapa las notas musicales:"
  line = line.replace(/:\s*$/, "").trim();

  if (esMetadata(line) || pareceProsa(line) || /^reto\s+\d+$/i.test(line) || line.length < 3) return "";
  if (line.length > 100) line = line.slice(0, 97).trim() + "…";
  return titleCaseSuave(line);
}

function extraerTitulosDoc(text) {
  const patterns = [
    /^#{1,4}\s*Reto\s+(?:\d+|FINAL)\s*[:\-–—]?\s*(.*)$/gim,
    /^Reto\s+(?:\d+|FINAL)\s*[:\-–—]\s*(.+)$/gim,
    /^RETO\s+(?:\d+|FINAL)\s*[–\-—:]\s*(.+)$/gim,
  ];
  for (const re of patterns) {
    const matches = [...text.matchAll(re)].map((m) => limpiarTitulo(m[1])).filter(Boolean);
    if (matches.length) return matches;
  }
  return [];
}

function unique(base, used, joiner) {
  let s = base;
  let n = 2;
  while (used.has(s)) {
    s = base + joiner + n;
    n += 1;
  }
  used.add(s);
  return s;
}

function scorePair(hijo, titulo) {
  const tksTitle = new Set(tokens(titulo));
  const tksName = tokens(hijo.nombreDb || "");
  const tksFolder = tokens(
    hijo.carpeta.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(\d+)/g, " $1 ")
  );
  const tksAll = new Set([...tksName, ...tksFolder]);

  let overlap = 0;
  for (const t of tksAll) if (tksTitle.has(t)) overlap += 1;

  // carpeta corta tipo Mochila / Hoja / Globos: bonus si el token está en el título
  const folderKey = sinTildes(hijo.carpeta).toLowerCase().replace(/[^a-z0-9]/g, "");
  let folderHit = 0;
  if (folderKey.length >= 4) {
    const titleFlat = sinTildes(titulo).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (titleFlat.includes(folderKey) || folderKey.includes(titleFlat.slice(0, 12))) folderHit = 3;
    // token overlap with folder words
    for (const t of tksFolder) if (tksTitle.has(t)) folderHit += 2;
  }

  let sim = 0;
  const a = sinTildes(hijo.nombreDb || "").toLowerCase();
  const b = sinTildes(titulo).toLowerCase();
  if (a && b) {
    if (a === b) sim = 5;
    else if (a.includes(b) || b.includes(a)) sim = 3;
    else {
      // rough
      const ta = new Set(tokens(a));
      const tb = new Set(tokens(b));
      let inter = 0;
      for (const x of ta) if (tb.has(x)) inter++;
      sim = inter;
    }
  }

  // Penalizar si el nombre actual ya es largo y no comparte tokens (evitar reasignaciones locas)
  const nameLong = (hijo.nombreDb || "").length >= 18;
  if (nameLong && overlap === 0 && folderHit === 0) return -1;

  return overlap * 2 + folderHit + sim;
}

function cargarDbPorRuta() {
  const sql = fs.readFileSync(path.join(ROOT, "database", "ambientes.sql"), "utf8");
  const map = new Map();
  const re =
    /\('((?:\\'|[^'])*)'\s*,\s*(?:\d+|NULL)\s*,\s*(?:\d+|NULL)\s*,\s*(?:\d+|NULL)\s*,\s*(?:\d+|NULL)\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,(?:NULL|'[^']*')\s*,(?:NULL|'[^']*')\s*,'[^']*'\s*,\s*(\d+)/g;
  let m;
  while ((m = re.exec(sql))) {
    map.set(m[2], {
      slug: m[1],
      nombre: m[3].replace(/\\'/g, "'"),
      ruta: m[2],
      orden: Number(m[4]),
    });
  }
  return map;
}

function listDeepGames() {
  const ambientes = ["ExpresionArtistica", "Multisaberes", "Multisensorial"];
  const out = [];
  for (const amb of ambientes) {
    const ambDir = path.join(PUB, "catalogo_juegos", amb);
    if (!fs.existsSync(ambDir)) continue;
    for (const tem of fs.readdirSync(ambDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const temDir = path.join(ambDir, tem.name);
      for (const h of fs.readdirSync(temDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
        const pack = path.join(temDir, h.name);
        if (!fs.existsSync(path.join(pack, "index.html"))) continue;
        out.push({
          ambiente: amb,
          tematica: tem.name,
          carpeta: h.name,
          abs: pack,
          ruta: `catalogo_juegos/${amb}/${tem.name}/${h.name}`,
        });
      }
    }
  }
  return out;
}

const dbByRuta = cargarDbPorRuta();
const packs = listDeepGames();
const grupos = new Map();
for (const p of packs) {
  const key = `${p.ambiente}/${p.tematica}`;
  if (!grupos.has(key)) grupos.set(key, []);
  const db = dbByRuta.get(p.ruta);
  grupos.get(key).push({
    ...p,
    slug: db?.slug,
    nombreDb: db?.nombre,
    orden: db?.orden ?? 0,
  });
}

const skip = new Set(["Multisensorial/EncuentraElColor"]);
const renombres = [];
const usedSlugsGlobal = new Set([...dbByRuta.values()].map((x) => x.slug));

let ok = 0;
let sinMatch = 0;

for (const [key, hijos] of grupos) {
  if (skip.has(key)) continue;
  const docPath = path.join(hijos[0].abs, "docs", "requerimientos.md");
  if (!fs.existsSync(docPath)) continue;
  const titulos = extraerTitulosDoc(fs.readFileSync(docPath, "utf8"));
  if (titulos.length < 1) continue;

  // Empareje greedy por score
  const pairs = [];
  for (let i = 0; i < hijos.length; i++) {
    for (let j = 0; j < titulos.length; j++) {
      const sc = scorePair(hijos[i], titulos[j]);
      if (sc >= 2) pairs.push({ i, j, sc });
    }
  }
  pairs.sort((a, b) => b.sc - a.sc);
  const usedH = new Set();
  const usedT = new Set();
  const assign = new Map(); // hijo idx -> titulo idx
  for (const p of pairs) {
    if (usedH.has(p.i) || usedT.has(p.j)) continue;
    usedH.add(p.i);
    usedT.add(p.j);
    assign.set(p.i, p.j);
  }

  // Residuales: hijos sin match (p.ej. Hoja/Globos) ← títulos sobrantes en orden del doc
  const hijosOrden = [...hijos.keys()].sort((a, b) => (hijos[a].orden || 0) - (hijos[b].orden || 0));
  const titulosLibres = [...titulos.keys()].filter((j) => !usedT.has(j));
  for (const i of hijosOrden) {
    if (usedH.has(i)) continue;
    const j = titulosLibres.shift();
    if (j === undefined) break;
    usedH.add(i);
    usedT.add(j);
    assign.set(i, j);
  }

  // Liberar slugs del grupo
  for (const h of hijos) if (h.slug) usedSlugsGlobal.delete(h.slug);
  const usedCarpetas = new Set();

  hijos.forEach((h, i) => {
    const j = assign.get(i);
    if (j === undefined) {
      sinMatch += 1;
      if (h.slug) usedSlugsGlobal.add(h.slug);
      usedCarpetas.add(h.carpeta);
      return;
    }
    const newNombre = titulos[j];
    const newCarpeta = unique(aPascal(newNombre), usedCarpetas, "");
    const newSlug = unique(aSlug(newNombre), usedSlugsGlobal, "-");
    const newRuta = `catalogo_juegos/${h.ambiente}/${h.tematica}/${newCarpeta}`;

    const sameCarpeta = h.carpeta === newCarpeta;
    const sameSlug = h.slug === newSlug;
    const sameNombre =
      sinTildes(h.nombreDb || "").toLowerCase().replace(/[^a-z0-9]/g, "") ===
      sinTildes(newNombre).toLowerCase().replace(/[^a-z0-9]/g, "");

    if (sameCarpeta && sameSlug && sameNombre) {
      ok += 1;
      return;
    }

    // Si solo cambia casing/puntuación del nombre y carpeta/slug iguales → igual actualizar nombre
    renombres.push({
      grupo: key,
      score: pairs.find((p) => p.i === i && p.j === j)?.sc ?? 0,
      oldSlug: h.slug,
      newSlug,
      oldNombre: h.nombreDb,
      newNombre,
      oldCarpeta: h.carpeta,
      newCarpeta,
      oldRuta: h.ruta,
      newRuta,
      absOld: h.abs,
      absNew: path.join(PUB, "catalogo_juegos", h.ambiente, h.tematica, newCarpeta),
    });
  });
}

console.log(`Renombres: ${renombres.length}`);
console.log(`Ya alineados: ${ok}`);
console.log(`Sin match: ${sinMatch}`);

const muestra = renombres
  .filter((r) => /MemoriaVisual|mochila|intruso/i.test(r.oldRuta + r.newNombre + (r.oldNombre || "")))
  .concat(renombres.filter((r) => r.oldCarpeta.length <= 12 && r.newNombre.length > r.oldNombre.length + 5))
  .slice(0, 25);

console.log("\n=== Muestra (MemoriaVisual / nombres cortos) ===");
for (const r of [...new Map(muestra.map((x) => [x.oldSlug, x])).values()].slice(0, 25)) {
  console.log(`${r.oldSlug} [${r.score}]`);
  console.log(`  ${r.oldNombre} → ${r.newNombre}`);
  console.log(`  ${r.oldCarpeta} → ${r.newCarpeta}`);
}

fs.writeFileSync(
  OUT,
  JSON.stringify(
    renombres.map(({ absOld, absNew, ...rest }) => rest),
    null,
    2
  ),
  "utf8"
);

if (DRY) {
  console.log(`\nDRY. Mapa: ${OUT}`);
  process.exit(0);
}

function moverCarpeta(from, to) {
  if (from === to) return;
  if (!fs.existsSync(from)) throw new Error("NO EXISTE " + from);
  if (fs.existsSync(to)) throw new Error("COLISION " + to);
  try {
    fs.renameSync(from, to);
    return;
  } catch (e) {
    // Windows: EPERM/EBUSY → copiar y borrar
    if (e.code !== "EPERM" && e.code !== "EACCES" && e.code !== "EBUSY") throw e;
  }
  fs.cpSync(from, to, { recursive: true });
  fs.rmSync(from, { recursive: true, force: true });
}

// Resolver colisiones en cadena: primero a destinos libres, luego los que liberan nombre
const pending = renombres.filter((r) => r.oldCarpeta !== r.newCarpeta);
const maxPasses = pending.length + 3;
for (let pass = 0; pass < maxPasses && pending.some((r) => !r._done); pass++) {
  for (const r of pending) {
    if (r._done) continue;
    if (!fs.existsSync(r.absOld)) {
      // quizá ya movido
      if (fs.existsSync(r.absNew)) {
        r._done = true;
        continue;
      }
      console.error("NO EXISTE", r.absOld);
      r._done = true;
      continue;
    }
    if (fs.existsSync(r.absNew)) continue; // esperar a que se libere
    try {
      moverCarpeta(r.absOld, r.absNew);
      r._done = true;
    } catch (e) {
      console.error(e.message);
      r._done = true;
    }
  }
}
const stuck = pending.filter((r) => !r._done);
if (stuck.length) {
  // Último recurso: destinos temporales únicos
  for (const r of stuck) {
    const tmp = r.absNew + ".__tmp_" + Date.now();
    try {
      moverCarpeta(r.absOld, tmp);
      r.absNewTmp = tmp;
    } catch (e) {
      console.error("tmp fail", r.oldCarpeta, e.message);
    }
  }
  for (const r of stuck) {
    if (!r.absNewTmp) continue;
    try {
      if (fs.existsSync(r.absNew)) fs.rmSync(r.absNew, { recursive: true, force: true });
      moverCarpeta(r.absNewTmp, r.absNew);
      r._done = true;
    } catch (e) {
      console.error("final fail", r.newCarpeta, e.message);
    }
  }
}

for (const r of renombres) {
  const abs = r.oldCarpeta === r.newCarpeta ? r.absOld : r.absNew;
  if (!fs.existsSync(abs)) continue;
  const cfgPath = path.join(abs, "config.json");
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      cfg.nombre = r.newNombre;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    } catch (e) {
      console.warn("config", cfgPath, e.message);
    }
  }
  const idxPath = path.join(abs, "index.html");
  if (fs.existsSync(idxPath)) {
    let html = fs.readFileSync(idxPath, "utf8");
    const safe = r.newNombre.replace(/</g, "");
    if (/<title>.*?<\/title>/i.test(html)) {
      html = html.replace(/<title>.*?<\/title>/i, `<title>${safe}</title>`);
      fs.writeFileSync(idxPath, html, "utf8");
    }
  }
}

console.log(`Aplicado. Mapa: ${OUT}`);
