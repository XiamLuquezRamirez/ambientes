/**
 * EncuentraElColor + MemoriaVisual: solo 3-4 y 5-6.
 * Borra paquetes de "4 años"; renombra "3 años" → "3-4 años".
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const MANIFEST = path.resolve(__dirname, "manifest-partir-multisensorial.json");
const SQL = path.resolve(__dirname, "../database/ambientes.sql");
const MIG = path.resolve(
  __dirname,
  "../database/migrations/2026_10_29_000010_limpiar_edades_multisensorial.php"
);

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

function edadDe(entry) {
  const cfgPath = path.join(ROOT, entry.padre, entry.carpeta, "config.json");
  if (!fs.existsSync(cfgPath)) return null;
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  return (cfg.niveles && cfg.niveles[0] && cfg.niveles[0].edad) || null;
}

function rmRecursivo(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copiarRecursivo(from, to) {
  if (fs.statSync(from).isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach((f) =>
      copiarRecursivo(path.join(from, f), path.join(to, f))
    );
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

const eliminar = [];
const conservar = [];

manifest.forEach((e) => {
  if (e.padre !== "EncuentraElColor" && e.padre !== "MemoriaVisual") {
    conservar.push(e);
    return;
  }
  const edad = edadDe(e);
  if (edad === "4 años") eliminar.push(e);
  else conservar.push(Object.assign({}, e, { _edad: edad }));
});

console.log("Eliminar (4 años):", eliminar.length);
eliminar.forEach((e) => {
  rmRecursivo(path.join(ROOT, e.padre, e.carpeta));
  console.log("  -", e.padre + "/" + e.carpeta);
});

const renombresSlug = []; // { from, to, nombre, ruta, carpetaFrom, carpetaTo, padre }
const nuevoManifest = [];

conservar.forEach((e) => {
  if (e.padre !== "EncuentraElColor" && e.padre !== "MemoriaVisual") {
    nuevoManifest.push({
      slug: e.slug,
      nombre: e.nombre,
      carpeta: e.carpeta,
      padre: e.padre,
      slugAntiguo: e.slugAntiguo,
      tematicaId: e.tematicaId,
      color: e.color,
      ruta: e.ruta,
    });
    return;
  }

  const dir = path.join(ROOT, e.padre, e.carpeta);
  const cfgPath = path.join(dir, "config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const nivel = cfg.niveles[0];
  let carpeta = e.carpeta;
  let slug = e.slug;
  let nombre = e.nombre;
  let moved = false;

  if (nivel.edad === "3 años") {
    nivel.edad = "3-4 años";
    if (String(nivel.id) === "3") {
      // id se mantiene "3"; PedniaEdad resuelve por rango en la etiqueta
    }
    nombre = nombre.replace(/\(3 Años\)/gi, "(3-4 Años)").replace(/\b3 Años\b/gi, "3-4 Años");
    if (/3-anos$/.test(slug) || /3anos/i.test(carpeta)) {
      const nuevaCarpeta = carpeta.replace(/3Anos/g, "34Anos");
      const nuevoSlug = slug.replace(/-3-anos$/, "-3-4-anos");
      if (nuevaCarpeta !== carpeta) {
        const dest = path.join(ROOT, e.padre, nuevaCarpeta);
        if (fs.existsSync(dest)) rmRecursivo(dest);
        copiarRecursivo(dir, dest);
        rmRecursivo(dir);
        carpeta = nuevaCarpeta;
        moved = true;
      }
      slug = nuevoSlug;
      renombresSlug.push({
        from: e.slug,
        to: slug,
        nombre,
        ruta: "catalogo_juegos/Multisensorial/" + e.padre + "/" + carpeta,
        padre: e.padre,
        carpetaFrom: e.carpeta,
        carpetaTo: carpeta,
      });
    } else {
      // MemoriaVisual: solo cambia edad en config
      renombresSlug.push({
        from: e.slug,
        to: e.slug,
        nombre,
        ruta: e.ruta,
        padre: e.padre,
        carpetaFrom: e.carpeta,
        carpetaTo: e.carpeta,
        soloConfig: true,
      });
    }
    cfg.nombre = nombre;
    cfg.niveles = [nivel];
    const outDir = path.join(ROOT, e.padre, carpeta);
    fs.writeFileSync(path.join(outDir, "config.json"), JSON.stringify(cfg, null, 2) + "\n", "utf8");
    const htmlPath = path.join(outDir, "index.html");
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, "utf8");
      html = html.replace(/<title>.*?<\/title>/, "<title>" + nombre.replace(/</g, "") + "</title>");
      fs.writeFileSync(htmlPath, html, "utf8");
    }
  }

  nuevoManifest.push({
    slug,
    nombre,
    carpeta,
    padre: e.padre,
    slugAntiguo: e.slugAntiguo,
    tematicaId: e.tematicaId,
    color: e.color,
    ruta: "catalogo_juegos/Multisensorial/" + e.padre + "/" + carpeta,
  });
  if (moved) console.log("  rename", e.carpeta, "→", carpeta);
  else if (nivel.edad === "3-4 años") console.log("  edad→3-4", e.padre + "/" + carpeta);
});

fs.writeFileSync(MANIFEST, JSON.stringify(nuevoManifest, null, 2) + "\n", "utf8");

// SQL: quitar líneas de slugs eliminados; actualizar renombres
let sql = fs.readFileSync(SQL, "utf8");
eliminar.forEach((e) => {
  const re = new RegExp("^\\('" + e.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "',.*\\),\\r?\\n", "m");
  if (re.test(sql)) {
    sql = sql.replace(re, "");
    console.log("SQL -", e.slug);
  } else console.log("SQL miss del", e.slug);
});
renombresSlug.forEach((r) => {
  if (r.soloConfig || r.from === r.to) return;
  const needle = "('" + r.from + "',";
  const idx = sql.indexOf(needle);
  if (idx === -1) {
    console.log("SQL miss rename", r.from);
    return;
  }
  const end = sql.indexOf("\n", idx);
  const lineStart = sql.lastIndexOf("\n", idx) + 1;
  const oldLine = sql.slice(lineStart, end);
  // Reconstruir conservando ejes/tematica del original si posible
  const m = oldLine.match(
    /^\('([^']+)',(\d+),(\d+),(\d+),(\d+),'([^']*)','([^']*)',(NULL|'[^']*'),(NULL|'[^']*'),'([^']*)',(\d+),(\d+),'([^']*)','([^']*)'\),?/
  );
  if (!m) {
    console.log("SQL parse fail", r.from, oldLine.slice(0, 80));
    return;
  }
  const nombreSql = r.nombre.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const nueva =
    "('" +
    r.to +
    "'," +
    m[2] +
    "," +
    m[3] +
    "," +
    m[4] +
    "," +
    m[5] +
    ",'" +
    r.ruta +
    "','" +
    nombreSql +
    "'," +
    m[8] +
    "," +
    m[9] +
    ",'" +
    m[10] +
    "'," +
    m[11] +
    "," +
    m[12] +
    ",'" +
    m[13] +
    "','" +
    m[14] +
    "'),";
  sql = sql.slice(0, lineStart) + nueva + sql.slice(end);
  console.log("SQL ~", r.from, "→", r.to);
});
fs.writeFileSync(SQL, sql, "utf8");

// Migración BD
const slugsDel = eliminar.map((e) => e.slug);
const updates = renombresSlug.filter((r) => !r.soloConfig && r.from !== r.to);
const soloEdad = renombresSlug.filter((r) => r.soloConfig || r.from === r.to);

const phpUpdates = updates
  .map(
    (r) =>
      "        ['from' => " +
      JSON.stringify(r.from) +
      ", 'to' => " +
      JSON.stringify(r.to) +
      ", 'nombre' => " +
      JSON.stringify(r.nombre) +
      ", 'ruta' => " +
      JSON.stringify(r.ruta) +
      "],"
  )
  .join("\n");

const php = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

/**
 * Multisensorial: quitar banda "4 años"; "3 años" pasa a "3-4 años".
 * Afecta EncuentraElColor y MemoriaVisual.
 */
return new class extends Migration
{
    private const ELIMINAR = ${JSON.stringify(slugsDel, null, 8).replace(/\n/g, "\n    ")};

    private const RENOMBRAR = [
${phpUpdates}
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        DB::table('juegos')->whereIn('slug', self::ELIMINAR)->delete();

        \$ahora = now();
        foreach (self::RENOMBRAR as \$r) {
            if (! DB::table('juegos')->where('slug', \$r['from'])->exists()) {
                continue;
            }
            // slug es PK: insertar nuevo y borrar viejo
            \$row = (array) DB::table('juegos')->where('slug', \$r['from'])->first();
            unset(\$row['slug']);
            \$row['nombre'] = \$r['nombre'];
            \$row['ruta'] = \$r['ruta'];
            \$row['updated_at'] = \$ahora;
            if (DB::table('juegos')->where('slug', \$r['to'])->exists()) {
                DB::table('juegos')->where('slug', \$r['to'])->update(\$row);
            } else {
                DB::table('juegos')->insert(array_merge(\$row, [
                    'slug' => \$r['to'],
                    'created_at' => \$row['created_at'] ?? \$ahora,
                ]));
            }
            DB::table('juegos')->where('slug', \$r['from'])->delete();
        }
    }

    public function down(): void
    {
        // Irreversible de forma segura.
    }
};
`;

fs.writeFileSync(MIG, php, "utf8");
console.log("\nManifest:", nuevoManifest.length, "(antes", manifest.length + ")");
console.log("Migración:", MIG);
console.log("solo-config 3→3-4 (sin rename slug):", soloEdad.length);
