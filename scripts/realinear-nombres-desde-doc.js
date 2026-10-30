/**
 * Realinea nombre/slug/carpeta con el TÍTULO NARRATIVO del RETO (no la categoría ni el meta).
 *
 * Formato típico del doc:
 *   Reto 1: ¿Quién hace 'Muuu'? (El Animal del Establo): Sonidos de la Naturaleza | Identificación Básica.
 *           ^---- nombre real del reto ----^              ^---- categoría / meta (IGNORAR) ----^
 *
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

const PEDAGOGICO =
  /Asociaci[oó]n|Reconocimiento|Discriminaci[oó]n|Clasificaci[oó]n|Desaf[ií]o|Deducci[oó]n|Est[ií]mulo|Identificaci[oó]n|Contraste|Aislamiento|Conexi[oó]n|Selecci[oó]n|An[aá]lisis|Complejidad|Ensamblaje|Movimiento|R[ií]tmico|Sonidos de |Sonidos Urbanos|Objetos de |Naturaleza Salvaje|Efectos Especiales|Foco:|Memoria de |Cambio de |Cambio por|Prueba de |Filtro de|4 elementos|5 Sentidos|Distractores|Opci[oó]n/i;

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

function titleCaseSuave(nombre) {
  let s = String(nombre).replace(/\s+/g, " ").trim();
  // Corrección OCR frecuente
  s = s.replace(/\bBocal\b/gi, "Vocal");
  const letters = s.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/g, "");
  if (letters.length > 4 && letters === letters.toUpperCase()) s = s.toLowerCase();
  const small = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "en", "a", "al", "un", "una", "vs", "se", "por"]);
  const parts = s.split(/(\s+|¿|¡|-|\(|\))/);
  let firstWord = true;
  return parts
    .map((p) => {
      if (p === "¿" || p === "¡" || p === "(") {
        firstWord = true;
        return p;
      }
      if (p === ")") return p;
      if (/^\s+$/.test(p) || p === "-") return p;
      const low = p.toLowerCase();
      const core = low.replace(/[^a-záéíóúñü]/gi, "");
      if (!firstWord && small.has(core)) return low;
      firstWord = false;
      const m = low.match(/^(['"“”«»]*)(.*)$/);
      const pref = m ? m[1] : "";
      const rest = m ? m[2] : low;
      if (!rest) return pref;
      return pref + rest.charAt(0).toUpperCase() + rest.slice(1);
    })
    .join("");
}

function esBasura(s) {
  const t = String(s).trim();
  if (!t || t.length < 3) return true;
  if (/^(?:\d+\s+)?(elementos?|opciones?|sentidos?)\b/i.test(t)) return true;
  if (/^foco$/i.test(t)) return true;
  if (PEDAGOGICO.test(t) && t.length < 40 && !/[¿¡]/.test(t) && !/\(.*\)/.test(t)) {
    // "Identificación Básica", "Objetos de la Casa" sin narrativa
    if (!/^(canasta|el |la |los |las |¿|¡)/i.test(t)) return true;
  }
  if (/\ben las ramas\b|\bcuelga\b/i.test(t) && t.length > 60) return true;
  return false;
}

/**
 * Extrae el título NARRATIVO del reto a partir del texto tras "Reto N:".
 */
function limpiarTitulo(raw) {
  let line = String(raw || "").replace(/\s+/g, " ").trim();
  if (!line) return "";

  // "Rediseñado: "Canasta..."" / prefijos
  line = line.replace(/^Rediseñado:\s*/i, "").trim();
  line = line.replace(/^["“«']+|["”»']+$/g, "").trim();

  // Caso principal: Narrativa: Categoría | Meta  → quedarse con Narrativa
  const colonIdx = line.indexOf(":");
  if (colonIdx > 0) {
    const before = line.slice(0, colonIdx).trim();
    const after = line.slice(colonIdx + 1).trim();
    if (
      before.length >= 3 &&
      !esBasura(before) &&
      (PEDAGOGICO.test(after) || after.includes("|") || /^(Sonidos|Objetos|Naturaleza|Efectos|Desafío)/i.test(after))
    ) {
      line = before;
    }
  }

  // Si aún tiene | y la derecha es basura/meta, quedarse con izquierda
  if (line.includes("|")) {
    const [izq, ...rest] = line.split("|").map((p) => p.trim());
    const der = rest.join(" | ");
    if (esBasura(der) || PEDAGOGICO.test(der) || /^(?:\d+\s+)?(elementos?|opciones?)/i.test(der)) {
      line = izq;
    } else if (!esBasura(der) && der.length <= 50 && der.length < izq.length) {
      // Quién usa qué a veces pone el nombre corto a la derecha; preferimos narrativa (izq ya limpia)
      // Si izquierda quedó pedagógica, usar derecha
      line = esBasura(izq) || PEDAGOGICO.test(izq) ? der : izq;
    }
  }

  line = line.replace(/:\s*$/, "").trim();
  line = line.replace(/\bBocal\b/gi, "Vocal");
  line = line.replace(/\s*\(\s*reto\s+final\s*\)\s*$/i, "").trim();
  // Quitar coletilla mecánica entre paréntesis al final del título narrativo
  line = line.replace(/\s*\(([^)]*)\)\s*$/u, (m, inner) => (PEDAGOGICO.test(inner) ? "" : m)).trim();

  // Prosa del doc sin título formal (ej. flauta en DescubreElInstrumento)
  if ((line.length > 70 || (line.includes(".") && line.length > 55)) && !PEDAGOGICO.test(line)) {
    if (/flauta/i.test(line)) return titleCaseSuave("La Flauta Mágica");
    if (/guitarra/i.test(line)) return titleCaseSuave("La Guitarra");
    if (/tambor/i.test(line)) return titleCaseSuave("El Tambor");
    return "";
  }

  if (esBasura(line) || /^reto\s+\d+/i.test(line)) return "";
  if (line.length > 100) line = line.slice(0, 97).trim() + "…";
  return titleCaseSuave(line);
}

function extraerTitulosDoc(text) {
  const patterns = [
    // Reto 1 Rediseñado: ...
    /^#{0,4}\s*Reto\s+(?:\d+|FINAL)(?:\s+Rediseñado)?\s*[:\-–—]\s*(.+)$/gim,
    /^RETO\s+(?:\d+|FINAL)\s*[–\-—:]\s*(.+)$/gim,
  ];
  for (const re of patterns) {
    const matches = [...text.matchAll(re)].map((m) => limpiarTitulo(m[1])).filter(Boolean);
    if (matches.length) return matches;
  }
  // Reto 3 sin título en la misma línea → mirar **Foco:** siguiente
  const focoFallback = [...text.matchAll(/^#{0,4}\s*Reto\s+(\d+|FINAL)\s*$/gim)];
  if (focoFallback.length) {
    // no mezclar con otros; solo si no hubo matches
  }
  // Retos sin título: usar texto de **Foco:** inmediatamente después
  const blocks = [...text.matchAll(/^#{0,4}\s*Reto\s+(?:\d+|FINAL)\s*\n+\s*\*\*Foco:\*\*\s*(.+)$/gim)];
  if (blocks.length) {
    return blocks.map((m) => titleCaseSuave(m[1].replace(/\.$/, "").trim())).filter((t) => t && !esBasura(t));
  }
  return [];
}

function tokens(s) {
  return sinTildes(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scorePair(hijo, titulo) {
  const tTitle = new Set(tokens(titulo));
  const tName = tokens(hijo.nombreDb || "");
  const tFolder = tokens(hijo.carpeta.replace(/([a-z])([A-Z])/g, "$1 $2"));
  let score = 0;
  for (const t of tName) if (tTitle.has(t)) score += 2;
  for (const t of tFolder) if (tTitle.has(t)) score += 3;
  const folderKey = sinTildes(hijo.carpeta).toLowerCase().replace(/[^a-z0-9]/g, "");
  const titleFlat = sinTildes(titulo).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (folderKey.length >= 5 && titleFlat.includes(folderKey)) score += 5;
  if (folderKey.length >= 5 && folderKey.includes(titleFlat.slice(0, Math.min(20, titleFlat.length)))) score += 3;
  return score;
}

function cargarDbPorRuta() {
  const sql = fs.readFileSync(path.join(ROOT, "database", "ambientes.sql"), "utf8");
  const map = new Map();
  const re =
    /\('((?:\\'|[^'])*)'\s*,\s*(?:\d+|NULL)\s*,\s*(?:\d+|NULL)\s*,\s*(?:\d+|NULL)\s*,\s*(?:\d+|NULL)\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,(?:NULL|'[^']*')\s*,(?:NULL|'[^']*')\s*,'[^']*'\s*,\s*(\d+)/g;
  let m;
  while ((m = re.exec(sql))) {
    map.set(m[2], { slug: m[1], nombre: m[3].replace(/\\'/g, "'"), ruta: m[2], orden: Number(m[4]) });
  }
  return map;
}

function listDeepGames() {
  const out = [];
  for (const amb of ["ExpresionArtistica", "Multisaberes", "Multisensorial"]) {
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

function moverCarpeta(from, to) {
  if (from === to) return;
  if (!fs.existsSync(from)) throw new Error("NO EXISTE " + from);
  if (fs.existsSync(to)) throw new Error("COLISION " + to);
  try {
    fs.renameSync(from, to);
  } catch (e) {
    if (e.code !== "EPERM" && e.code !== "EACCES" && e.code !== "EBUSY") throw e;
    fs.cpSync(from, to, { recursive: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}

const dbByRuta = cargarDbPorRuta();
const packs = listDeepGames();
const grupos = new Map();
for (const p of packs) {
  const key = `${p.ambiente}/${p.tematica}`;
  if (!grupos.has(key)) grupos.set(key, []);
  const db = dbByRuta.get(p.ruta);
  grupos.get(key).push({ ...p, slug: db?.slug, nombreDb: db?.nombre, orden: db?.orden ?? 0 });
}

const skip = new Set([
  "Multisensorial/EncuentraElColor",
  // Doc clonado de vocales (incorrecto); no tocar.
  "Multisaberes/CuentaLosObjetos",
]);
const renombres = [];
const usedSlugsGlobal = new Set([...dbByRuta.values()].map((x) => x.slug));
let ok = 0;
let sinMatch = 0;

for (const [key, hijos] of grupos) {
  if (skip.has(key)) continue;
  hijos.sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.carpeta.localeCompare(b.carpeta));
  const docPath = path.join(hijos[0].abs, "docs", "requerimientos.md");
  if (!fs.existsSync(docPath)) continue;
  const titulos = extraerTitulosDoc(fs.readFileSync(docPath, "utf8"));
  if (!titulos.length) continue;

  const assign = new Map();
  const usedH = new Set();
  const usedT = new Set();

  // 1) Si misma cantidad: alinear por índice (doc orden = retos)
  if (titulos.length === hijos.length) {
    hijos.forEach((_, i) => {
      assign.set(i, i);
      usedH.add(i);
      usedT.add(i);
    });
  } else {
    // 2) Empareje por score + residuales por orden
    const pairs = [];
    for (let i = 0; i < hijos.length; i++) {
      for (let j = 0; j < titulos.length; j++) {
        const sc = scorePair(hijos[i], titulos[j]);
        if (sc >= 2) pairs.push({ i, j, sc });
      }
    }
    pairs.sort((a, b) => b.sc - a.sc);
    for (const p of pairs) {
      if (usedH.has(p.i) || usedT.has(p.j)) continue;
      usedH.add(p.i);
      usedT.add(p.j);
      assign.set(p.i, p.j);
    }
    const libresT = [...titulos.keys()].filter((j) => !usedT.has(j));
    for (const i of [...hijos.keys()].sort((a, b) => (hijos[a].orden || 0) - (hijos[b].orden || 0))) {
      if (usedH.has(i)) continue;
      const j = libresT.shift();
      if (j === undefined) break;
      usedH.add(i);
      usedT.add(j);
      assign.set(i, j);
    }
  }

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

    const same =
      h.carpeta === newCarpeta &&
      h.slug === newSlug &&
      sinTildes(h.nombreDb || "").toLowerCase().replace(/[^a-z0-9]/g, "") ===
        sinTildes(newNombre).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (same) {
      ok += 1;
      return;
    }

    renombres.push({
      grupo: key,
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
console.log(`Ya OK: ${ok}`);
console.log(`Sin match: ${sinMatch}`);

// Muestra QueSonidoEscuchas + QuienUsaQue + Bocal
const muestra = renombres.filter((r) =>
  /QueSonidoEscuchas|QuienUsaQue|Bocal|Vocal|Muuu|Pincel|Flauta/i.test(
    r.grupo + r.oldNombre + r.newNombre + (r.oldSlug || "")
  )
);
console.log("\n=== Muestra clave ===");
for (const r of muestra.slice(0, 30)) {
  console.log(`${r.oldSlug}`);
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
  console.log(`\nDRY → ${OUT}`);
  process.exit(0);
}

const pending = renombres.filter((r) => r.oldCarpeta !== r.newCarpeta);
for (let pass = 0; pass < pending.length + 5; pass++) {
  let progressed = false;
  for (const r of pending) {
    if (r._done) continue;
    if (!fs.existsSync(r.absOld)) {
      if (fs.existsSync(r.absNew)) r._done = true;
      continue;
    }
    if (fs.existsSync(r.absNew)) continue;
    try {
      moverCarpeta(r.absOld, r.absNew);
      r._done = true;
      progressed = true;
    } catch (e) {
      console.error(e.message);
      r._done = true;
    }
  }
  if (!progressed) break;
}
// Forzar restantes vía robocopy-like cp
for (const r of pending.filter((x) => !x._done)) {
  try {
    if (fs.existsSync(r.absOld) && !fs.existsSync(r.absNew)) {
      fs.cpSync(r.absOld, r.absNew, { recursive: true });
      fs.rmSync(r.absOld, { recursive: true, force: true });
      r._done = true;
    }
  } catch (e) {
    console.error("cp fail", r.oldCarpeta, e.message);
  }
}

for (const r of renombres) {
  const abs = fs.existsSync(r.absNew) ? r.absNew : r.absOld;
  if (!fs.existsSync(abs)) continue;
  const cfgPath = path.join(abs, "config.json");
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      cfg.nombre = r.newNombre;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    } catch (_) {}
  }
  const idxPath = path.join(abs, "index.html");
  if (fs.existsSync(idxPath)) {
    let html = fs.readFileSync(idxPath, "utf8");
    if (/<title>.*?<\/title>/i.test(html)) {
      html = html.replace(/<title>.*?<\/title>/i, `<title>${r.newNombre.replace(/</g, "")}</title>`);
      fs.writeFileSync(idxPath, html, "utf8");
    }
  }
}

console.log(`Aplicado → ${OUT}`);
