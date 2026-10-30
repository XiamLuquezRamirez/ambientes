/**
 * Parte juegos Multisensorial implementados (1 reto = 1 juego).
 * EncuentraElColor: sin array retos → 1 color por paquete.
 * Uso: node scripts/partir-multisensorial.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const MANIFEST = path.resolve(__dirname, "manifest-partir-multisensorial.json");

const COLORES = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
];

const JUEGOS = [
  { carpeta: "EncuentraElColor", slug: "encuentra-el-color", tematicaId: 9 },
  { carpeta: "BuscaLaSombra", slug: "busca-la-sombra", tematicaId: 10 },
  { carpeta: "CompletaLaFigura", slug: "completa-la-figura", tematicaId: 11 },
  { carpeta: "BuscaLasDiferencias", slug: "busca-las-diferencias", tematicaId: 12 },
  { carpeta: "MemoriaVisual", slug: "memoria-visual", tematicaId: 13 },
  { carpeta: "QueSonidoEscuchas", slug: "que-sonido-escuchas", tematicaId: 14 },
  { carpeta: "EncuentraElSonido", slug: "encuentra-el-sonido", tematicaId: 15 },
  { carpeta: "RepiteLaSecuencia", slug: "repite-la-secuencia", tematicaId: 16 },
  { carpeta: "MemoriaAuditiva", slug: "memoria-auditiva", tematicaId: 17 },
  { carpeta: "AsociaSonidoEImagen", slug: "asocia-sonido-e-imagen", tematicaId: 18 },
  { carpeta: "EncuentraLaTextura", slug: "encuentra-la-textura", tematicaId: 19 },
  { carpeta: "SuaveOAspero", slug: "suave-o-aspero", tematicaId: 20 },
  { carpeta: "ClasificaPorTextura", slug: "clasifica-por-textura", tematicaId: 21 },
  { carpeta: "RelacionaIguales", slug: "relaciona-iguales", tematicaId: 22 },
  { carpeta: "DescubreElObjeto", slug: "descubre-el-objeto", tematicaId: 23 },
  { carpeta: "EncuentraLaPareja", slug: "encuentra-la-pareja", tematicaId: 24 },
  { carpeta: "ObservaYRecuerda", slug: "observa-y-recuerda", tematicaId: 25 },
  { carpeta: "ClasificaPorLosSentidos", slug: "clasifica-por-los-sentidos", tematicaId: 26 },
  { carpeta: "QueCambio", slug: "que-cambio", tematicaId: 27 },
  { carpeta: "ExploraYDescubre", slug: "explora-y-descubre", tematicaId: 28 },
];

const COMUNES = [
  "index.html", "style.css", "script.js", "logica.js", "retos.js", "sfx.js", "docs/requerimientos.md",
];

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

function patchLogica(src) {
  let s = src;

  // Exactitud de cantidad de retos → 1..N
  s = s.replace(
    /if \(retos\.length !== reglas\.retos\) errores\.push\(tag \+ ": cantidad de retos"\);/g,
    'if (!retos.length || retos.length > reglas.retos) errores.push(tag + ": cantidad de retos");'
  );
  s = s.replace(
    /if \(retos\.length !== reglas\.retos\) errores\.push\(tag \+ ": debe tener " \+ reglas\.retos \+ " retos"\);/g,
    'if (!retos.length || retos.length > reglas.retos) errores.push(tag + ": debe tener entre 1 y " + reglas.retos + " retos");'
  );
  s = s.replace(
    /if \(retos\.length !== regla\.tipos\.length\) errores\.push\(tag \+ ": debe tener " \+ regla\.tipos\.length \+ " retos"\);/g,
    'if (!retos.length || retos.length > regla.tipos.length) errores.push(tag + ": debe tener entre 1 y " + regla.tipos.length + " retos");'
  );
  s = s.replace(
    /if \(retos\.length !== regla\.secuencias\.length\) errores\.push\(tag \+ ": debe tener " \+ regla\.secuencias\.length \+ " retos"\);/g,
    'if (!retos.length || retos.length > regla.secuencias.length) errores.push(tag + ": debe tener entre 1 y " + regla.secuencias.length + " retos");'
  );
  s = s.replace(
    /if \(retos\.length !== reglas\.opciones\.length\) err\(tag \+ ": debe tener " \+ reglas\.opciones\.length \+ " retos"\);/g,
    'if (!retos.length || retos.length > reglas.opciones.length) err(tag + ": debe tener entre 1 y " + reglas.opciones.length + " retos");'
  );
  s = s.replace(
    /if \(!Array\.isArray\(n\.retos\) \|\| n\.retos\.length !== reglas\.retos\) err\(tag \+ ": debe tener " \+ reglas\.retos \+ " retos"\);/g,
    'if (!Array.isArray(n.retos) || !n.retos.length || n.retos.length > reglas.retos) err(tag + ": debe tener entre 1 y " + reglas.retos + " retos");'
  );
  s = s.replace(
    /if \(!Array\.isArray\(n\.retos\) \|\| n\.retos\.length !== 3\) err\(tag \+ ": debe tener 3 retos"\);/g,
    'if (!Array.isArray(n.retos) || !n.retos.length || n.retos.length > 3) err(tag + ": debe tener entre 1 y 3 retos");'
  );
  s = s.replace(
    /if \(!Array\.isArray\(nivel\.retos\) \|\| nivel\.retos\.length !== 3\) errores\.push\("nivel " \+ nivel\.id \+ ": debe tener 3 retos"\);/g,
    'if (!Array.isArray(nivel.retos) || !nivel.retos.length || nivel.retos.length > 3) errores.push("nivel " + nivel.id + ": debe tener entre 1 y 3 retos");'
  );
  s = s.replace(
    /if \(!Array\.isArray\(n\.retos\) \|\| n\.retos\.length !== esperados\) \{\s*err\(tag \+ ": debe tener " \+ esperados \+ " retos"\);\s*\}/g,
    'if (!Array.isArray(n.retos) || !n.retos.length || n.retos.length > esperados) {\n                err(tag + ": debe tener entre 1 y " + esperados + " retos");\n            }'
  );

  // Ambos niveles obligatorios → cualquier subconjunto válido
  s = s.replace(
    /if \(edades\.join\("\|"\) !== Object\.keys\((ESCENARIOS|RETOS_POR_EDAD|MUESTRAS_POR_EDAD)\)\.sort\(\)\.join\("\|"\)\) \{\s*err\("los niveles deben ser exactamente 3-4 años y 5-6 años"\);\s*\}/g,
    'if (!edades.length || edades.some(function (e) { return Object.keys($1).indexOf(e) === -1; })) {\n            err("edad de nivel desconocida");\n        }'
  );

  // Contador de diferencias alineado al paquete partido
  s = s.replace(
    /if \(n\.contador && n\.contador !== \(n\.retos \|\| \[\]\)\.length\) err\(tag \+ ": el contador debe tener una ranura por reto"\);/g,
    'if (n.contador && n.contador < (n.retos || []).length) err(tag + ": el contador debe tener una ranura por reto");'
  );

  if (!/\biLargo\b/.test(s)) {
    s = s.replace(
      /retos\.forEach\(function\s*\(\s*r\s*,\s*i\s*\)\s*\{/g,
      'retos.forEach(function (r, i) {\n                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);'
    );
  }

  s = s.replace(/regla\.tipos\[i\]/g, "regla.tipos[iLargo]");
  s = s.replace(/regla\.cantidad\[i\]/g, "regla.cantidad[iLargo]");
  s = s.replace(/regla\.opciones\[i\]/g, "regla.opciones[iLargo]");
  s = s.replace(/regla\.secuencias\[i\]/g, "regla.secuencias[iLargo]");
  s = s.replace(/reglas\.tipos\[i\]/g, "reglas.tipos[iLargo]");
  s = s.replace(/reglas\.opciones\[i\]/g, "reglas.opciones[iLargo]");

  return s;
}

function nombresDesdeDoc(docPath, cuantos) {
  if (!fs.existsSync(docPath)) return [];
  const text = fs.readFileSync(docPath, "utf8");
  const matches = [...text.matchAll(/RETO\s+(?:\d+|FINAL)\s*(?:[–\-—:]|\s)\s*(.+)/gi)]
    .map((m) => m[1].trim().replace(/\s+/g, " "));
  if (matches.length !== cuantos) return [];
  return matches.map((line) => titleCase(line.split("(")[0].trim().slice(0, 80)) || "Reto");
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

function listarRetosPlanos(base, carpeta) {
  const planos = [];
  if (carpeta === "EncuentraElColor") {
    (base.niveles || []).forEach((nivel) => {
      (nivel.colores || []).forEach((color, iOrigen) => {
        planos.push({
          tipo: "color",
          nivel,
          color,
          iOrigen,
          nombreFallback: "Encuentra El " + titleCase(color) + " (" + (nivel.edad || nivel.id) + ")",
        });
      });
    });
    return planos;
  }
  (base.niveles || []).forEach((nivel) => {
    (nivel.retos || []).forEach((reto, iOrigen) => {
      planos.push({
        tipo: "reto",
        nivel,
        reto,
        iOrigen,
        nombreFallback: reto.titulo || reto.id || reto.ref || "Reto " + (iOrigen + 1),
      });
    });
  });
  return planos;
}

function construirNivel(item) {
  const nivel = JSON.parse(JSON.stringify(item.nivel));
  if (item.tipo === "color") {
    nivel.colores = [item.color];
    nivel.titulo = "Encuentra el " + item.color;
    return nivel;
  }
  const reto = JSON.parse(JSON.stringify(item.reto));
  reto.iOrigen = item.iOrigen;
  nivel.retos = [reto];
  if (typeof nivel.contador === "number") nivel.contador = 1;
  return nivel;
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

  const logicaFiles = ["logica.js", "retos.js"].filter((f) => fs.existsSync(path.join(legacy, f)));
  const logicaPatched = {};
  logicaFiles.forEach((f) => {
    logicaPatched[f] = patchLogica(fs.readFileSync(path.join(legacy, f), "utf8"));
  });

  const retosPlanos = listarRetosPlanos(base, juego.carpeta);
  if (!retosPlanos.length) {
    console.error("SKIP (sin retos): " + juego.carpeta);
    copiarRecursivo(legacy, src);
    fs.rmSync(legacy, { recursive: true, force: true });
    return;
  }

  const nombresDoc = nombresDesdeDoc(path.join(legacy, "docs/requerimientos.md"), retosPlanos.length);
  const usedCarpetas = new Set();

  retosPlanos.forEach((item, idx) => {
    const nombreBruto =
      (nombresDoc[idx] && nombresDoc[idx].length > 2 ? nombresDoc[idx] : null) ||
      item.nombreFallback ||
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
      if (rel === "logica.js" || rel === "retos.js") {
        fs.writeFileSync(path.join(dest, rel), logicaPatched[rel], "utf8");
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

    const nivel = construirNivel(item);
    const audios = JSON.parse(JSON.stringify(base.audios || {}));
    ["cierre", "fondo", "acierto", "error"].forEach((k) => {
      if (audios[k]) audios[k] = profundizarRutas(audios[k]);
    });
    if (audios.efectos && typeof audios.efectos === "object") {
      Object.keys(audios.efectos).forEach((k) => {
        if (typeof audios.efectos[k] === "string") audios.efectos[k] = profundizarRutas(audios.efectos[k]);
      });
    }
    if (audios.sonidos && typeof audios.sonidos === "object") {
      Object.keys(audios.sonidos).forEach((k) => {
        if (typeof audios.sonidos[k] === "string") audios.sonidos[k] = profundizarRutas(audios.sonidos[k]);
      });
    }

    const feedback = base.feedback ? JSON.parse(JSON.stringify(base.feedback)) : undefined;
    if (feedback && feedback.acierto && feedback.acierto.gif) {
      feedback.acierto.gif = profundizarRutas(feedback.acierto.gif);
    }
    if (feedback && feedback.error && feedback.error.gif) {
      feedback.error.gif = profundizarRutas(feedback.error.gif);
    }

    const config = Object.assign({}, base, {
      nombre: nombre,
      textos: Object.assign({}, base.textos, nivel.bienvenida ? { conversacion: nivel.bienvenida } : {}),
      audios: audios,
      niveles: [nivel],
    });
    if (feedback) config.feedback = feedback;

    fs.writeFileSync(path.join(dest, "config.json"), JSON.stringify(config, null, 2) + "\n", "utf8");

    let html = fs.readFileSync(path.join(dest, "index.html"), "utf8");
    html = html.replace(/<title>.*?<\/title>/, "<title>" + nombre.replace(/</g, "") + "</title>");
    fs.writeFileSync(path.join(dest, "index.html"), profundizarRutas(html), "utf8");

    ["script.js", "style.css", "sfx.js"].forEach((f) => {
      if (fs.existsSync(path.join(dest, f))) profundizarArchivo(path.join(dest, f));
    });

    manifest.push({
      slug,
      nombre,
      carpeta,
      padre: juego.carpeta,
      slugAntiguo: juego.slug,
      tematicaId: juego.tematicaId,
      color,
      ruta: "catalogo_juegos/Multisensorial/" + juego.carpeta + "/" + carpeta,
    });
    console.log(juego.carpeta + "/" + carpeta + " ← " + nombre);
  });

  fs.rmSync(legacy, { recursive: true, force: true });
});

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("\nTotal paquetes: " + manifest.length);
console.log("Manifest: " + MANIFEST);
