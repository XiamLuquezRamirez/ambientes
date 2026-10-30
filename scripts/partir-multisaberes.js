/**
 * Parte juegos Multisaberes implementados (1 reto = 1 juego).
 * Omite stubs. Uso: node scripts/partir-multisaberes.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisaberes");
const MANIFEST = path.resolve(__dirname, "manifest-partir-multisaberes.json");

const COLORES = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
];

const JUEGOS = [
  { carpeta: "DescubreLasVocales", slug: "descubre-las-vocales", tematicaId: 38 },
  { carpeta: "ConQueVocalComienza", slug: "con-que-vocal-comienza", tematicaId: 39 },
  { carpeta: "ConstruyeLaVocal", slug: "construye-la-vocal", tematicaId: 40 },
  { carpeta: "EncuentraLaPareja", slug: "encuentra-la-pareja-2", tematicaId: 41 },
  { carpeta: "ElRetoDeLasVocales", slug: "el-reto-de-las-vocales", tematicaId: 42 },
  { carpeta: "CuentaLosObjetos", slug: "cuenta-los-objetos", tematicaId: 43 },
];

const COMUNES = ["index.html", "style.css", "script.js", "logica.js", "sfx.js", "docs/requerimientos.md"];

function mkdirp(d) {
  fs.mkdirSync(d, { recursive: true });
}

function copiarArchivo(from, to) {
  mkdirp(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copiarRecursivo(from, to) {
  if (!fs.existsSync(from)) return;
  if (fs.statSync(from).isDirectory()) {
    mkdirp(to);
    fs.readdirSync(from).forEach((f) => copiarRecursivo(path.join(from, f), path.join(to, f)));
  } else copiarArchivo(from, to);
}

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
  return sinTildes(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "juego";
}

function titleCase(nombre) {
  return String(nombre)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s¿¡\-])([a-záéíóúñ])/g, (m, p, c) => p + c.toUpperCase());
}

function profundizarRutas(texto) {
  let s = String(texto);
  s = s.split("../../../assets/").join("____ASSETS____");
  s = s.split("../../").join("../../../");
  s = s.split("____ASSETS____").join("../../../../assets/");
  return s;
}

function profundizarArchivo(file) {
  if (!fs.existsSync(file)) return;
  if (![".html", ".js", ".css", ".json"].includes(path.extname(file))) return;
  const before = fs.readFileSync(file, "utf8");
  const after = profundizarRutas(before);
  if (after !== before) fs.writeFileSync(file, after, "utf8");
}

/** Relaja validaciones indexadas / de cantidad exacta; usa iOrigen. */
function patchLogica(src) {
  let s = src;

  s = s.replace(
    /if \(retos\.length !== regla\.length\) errores\.push\(tag \+ ": deben ser " \+ regla\.length \+ " retos"\);/g,
    'if (!retos.length || retos.length > regla.length) errores.push(tag + ": deben ser entre 1 y " + regla.length + " retos");'
  );
  s = s.replace(
    /if \(retos\.length !== esperados\.length\) errores\.push\(tag \+ ": deben ser " \+ esperados\.length \+ " retos"\);/g,
    'if (!retos.length || retos.length > esperados.length) errores.push(tag + ": deben ser entre 1 y " + esperados.length + " retos");'
  );

  s = s.replace(
    /if \(n3 && \(n3\.retos \|\| \[\]\)\.length !== 3\) errores\.push\("Nivel 3: deben ser 3 retos"\);/g,
    'if (n3 && (!(n3.retos || []).length || (n3.retos || []).length > 3)) errores.push("Nivel 3: deben ser entre 1 y 3 retos");'
  );
  s = s.replace(
    /if \(n5 && \(n5\.retos \|\| \[\]\)\.length !== 4\) errores\.push\("Nivel 5: deben ser 4 retos"\);/g,
    'if (n5 && (!(n5.retos || []).length || (n5.retos || []).length > 4)) errores.push("Nivel 5: deben ser entre 1 y 4 retos");'
  );
  s = s.replace(
    /if \(n3 && n3\.retos\) \{/g,
    "if (n3 && (n3.retos || []).length === 3) {"
  );
  s = s.replace(
    /if \(n5 && n5\.retos\) \{/g,
    "if (n5 && (n5.retos || []).length === 4) {"
  );

  if (!/\bvar iLargo\b|\bconst iLargo\b/.test(s)) {
    s = s.replace(
      /retos\.forEach\(function\s*\(\s*r\s*,\s*i\s*\)\s*\{/g,
      'retos.forEach(function (r, i) {\n                var iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);'
    );
  }
  s = s.replace(/var esp = regla\[i\];/g, "var esp = regla[iLargo];");
  s = s.replace(/r\.tipo !== esperados\[i\]/g, "r.tipo !== esperados[iLargo]");
  s = s.replace(
    /errores\.push\(tag \+ " reto " \+ \(i \+ 1\) \+ ": tipo " \+ esperados\[i\]\);/g,
    'errores.push(tag + " reto " + (i + 1) + ": tipo " + esperados[iLargo]);'
  );

  return s;
}

function nombresDesdeDoc(docPath, cuantos) {
  if (!fs.existsSync(docPath)) return [];
  const text = fs.readFileSync(docPath, "utf8");
  const matches = [...text.matchAll(/RETO\s+(?:\d+|FINAL)\s*(?:[–\-—:]|\s)\s*(.+)/gi)]
    .map((m) => m[1].trim().replace(/\s+/g, " "));
  // Evitar docs pegados de otro juego (p.ej. CuentaLosObjetos)
  if (matches.length !== cuantos) return [];
  return matches.map((line) => {
    const sinParen = line.split("(")[0].trim();
    return titleCase(sinParen.slice(0, 80)) || "Reto";
  });
}

function uniqueSlug(base, used) {
  let s = base;
  let n = 2;
  while (used.has(s)) {
    s = base + "-" + n;
    n += 1;
  }
  used.add(s);
  return s;
}

function uniqueCarpeta(base, used) {
  let s = base;
  let n = 2;
  while (used.has(s)) {
    s = base + n;
    n += 1;
  }
  used.add(s);
  return s;
}

const usedSlugs = new Set();
const manifest = [];
let colorIdx = 0;

JUEGOS.forEach((juego) => {
  const src = path.join(ROOT, juego.carpeta);
  const cfgPath = path.join(src, "config.json");
  if (!fs.existsSync(cfgPath)) {
    console.error("SKIP (sin config): " + juego.carpeta);
    return;
  }
  const rawCfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  if (rawCfg.stub) {
    console.error("SKIP stub: " + juego.carpeta);
    return;
  }

  const legacy = path.join(ROOT, "_" + juego.carpeta + "_legacy_tmp");
  if (fs.existsSync(legacy)) fs.rmSync(legacy, { recursive: true, force: true });
  copiarRecursivo(src, legacy);

  fs.readdirSync(src).forEach((f) => fs.rmSync(path.join(src, f), { recursive: true, force: true }));
  mkdirp(src);

  const base = JSON.parse(fs.readFileSync(path.join(legacy, "config.json"), "utf8"));
  let logicaSrc = fs.readFileSync(path.join(legacy, "logica.js"), "utf8");
  logicaSrc = patchLogica(logicaSrc);

  const retosPlanos = [];
  (base.niveles || []).forEach((nivel) => {
    (nivel.retos || []).forEach((reto, iOrigen) => {
      retosPlanos.push({ nivel, reto, iOrigen });
    });
  });

  const nombresDoc = nombresDesdeDoc(path.join(legacy, "docs/requerimientos.md"), retosPlanos.length);
  const usedCarpetas = new Set();

  retosPlanos.forEach((item, idx) => {
    const nombreBruto =
      (nombresDoc[idx] && nombresDoc[idx].length > 2 ? nombresDoc[idx] : null) ||
      item.reto.titulo ||
      item.reto.id ||
      "Reto " + (idx + 1);
    const nombre = titleCase(nombreBruto);

    const carpeta = uniqueCarpeta(aPascal(nombre), usedCarpetas);
    const slug = uniqueSlug(aSlug(nombre), usedSlugs);
    const color = COLORES[colorIdx % COLORES.length];
    colorIdx += 1;

    const dest = path.join(src, carpeta);
    mkdirp(dest);
    COMUNES.forEach((rel) => {
      const from = path.join(legacy, rel);
      if (!fs.existsSync(from)) return;
      if (rel === "logica.js") {
        fs.writeFileSync(path.join(dest, rel), logicaSrc, "utf8");
      } else {
        copiarArchivo(from, path.join(dest, rel));
      }
    });
    fs.readdirSync(legacy).forEach((f) => {
      if (COMUNES.includes(f) || f === "config.json" || f === "index.html") return;
      const from = path.join(legacy, f);
      const to = path.join(dest, f);
      if (fs.statSync(from).isDirectory()) copiarRecursivo(from, to);
      else if (!fs.existsSync(to)) copiarArchivo(from, to);
    });

    const nivel = JSON.parse(JSON.stringify(item.nivel));
    const reto = JSON.parse(JSON.stringify(item.reto));
    reto.iOrigen = item.iOrigen;
    nivel.retos = [reto];

    const audios = JSON.parse(JSON.stringify(base.audios || {}));
    ["cierre", "fondo", "acierto"].forEach((k) => {
      if (audios[k]) audios[k] = profundizarRutas(audios[k]);
    });
    if (audios.efectos && typeof audios.efectos === "object") {
      Object.keys(audios.efectos).forEach((k) => {
        if (typeof audios.efectos[k] === "string") {
          audios.efectos[k] = profundizarRutas(audios.efectos[k]);
        }
      });
    }

    const config = Object.assign({}, base, {
      nombre: nombre,
      textos: Object.assign({}, base.textos, { conversacion: nivel.bienvenida }),
      audios: audios,
      niveles: [nivel],
    });

    fs.writeFileSync(path.join(dest, "config.json"), JSON.stringify(config, null, 2) + "\n", "utf8");

    let html = fs.readFileSync(path.join(dest, "index.html"), "utf8");
    html = html.replace(/<title>.*?<\/title>/, "<title>" + nombre.replace(/</g, "") + "</title>");
    fs.writeFileSync(path.join(dest, "index.html"), profundizarRutas(html), "utf8");

    if (fs.existsSync(path.join(dest, "script.js"))) profundizarArchivo(path.join(dest, "script.js"));
    if (fs.existsSync(path.join(dest, "style.css"))) profundizarArchivo(path.join(dest, "style.css"));
    if (fs.existsSync(path.join(dest, "sfx.js"))) profundizarArchivo(path.join(dest, "sfx.js"));

    manifest.push({
      slug: slug,
      nombre: nombre,
      carpeta: carpeta,
      padre: juego.carpeta,
      slugAntiguo: juego.slug,
      tematicaId: juego.tematicaId,
      color: color,
      ruta: "catalogo_juegos/Multisaberes/" + juego.carpeta + "/" + carpeta,
    });
    console.log(juego.carpeta + "/" + carpeta + " ← " + nombre);
  });

  fs.rmSync(legacy, { recursive: true, force: true });
});

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("\nTotal paquetes: " + manifest.length);
console.log("Manifest: " + MANIFEST);
