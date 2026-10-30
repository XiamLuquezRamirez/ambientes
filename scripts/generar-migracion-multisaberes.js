/**
 * Genera migration + parche SQL desde manifest-partir-multisaberes.json
 */
const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "manifest-partir-multisaberes.json"), "utf8")
);

const migPath = path.resolve(
  __dirname,
  "../database/migrations/2026_10_29_000008_partir_multisaberes.php"
);

const rows = manifest
  .map((m) => {
    const nombre = JSON.stringify(m.nombre);
    const carpeta = m.padre + "/" + m.carpeta;
    return (
      "        ['slug' => " +
      JSON.stringify(m.slug) +
      ", 'nombre' => " +
      nombre +
      ", 'carpeta' => " +
      JSON.stringify(carpeta) +
      ", 'tematica_id' => " +
      m.tematicaId +
      ", 'color' => " +
      JSON.stringify(m.color) +
      ", 'slug_antiguo' => " +
      JSON.stringify(m.slugAntiguo) +
      "],"
    );
  })
  .join("\n");

const php = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

/**
 * Parte los juegos Multisaberes implementados (1 reto = 1 juego).
 * Generado desde scripts/manifest-partir-multisaberes.json
 */
return new class extends Migration
{
    private const AMBIENTE_ID = 8;

    private const EJE_ID = 19;

    private const MODULO_ID = 3;

    /** @var list<array{slug: string, nombre: string, carpeta: string, tematica_id: int, color: string, slug_antiguo: string}> */
    private const JUEGOS = [
${rows}
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        \$ahora = now();
        \$antiguos = array_values(array_unique(array_column(self::JUEGOS, 'slug_antiguo')));
        DB::table('juegos')->whereIn('slug', \$antiguos)->delete();

        \$ordenBase = ((int) DB::table('juegos')->max('orden')) + 1;

        foreach (self::JUEGOS as \$i => \$juego) {
            \$ejeId = (int) (DB::table('tematicas')->where('id', \$juego['tematica_id'])->value('eje_id') ?: self::EJE_ID);
            \$payload = [
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => \$ejeId,
                'tematica_id' => \$juego['tematica_id'],
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/Multisaberes/'.\$juego['carpeta'],
                'nombre' => \$juego['nombre'],
                'descripcion' => null,
                'imagen' => null,
                'color' => \$juego['color'],
                'orden' => \$ordenBase + \$i,
                'activo' => 1,
                'updated_at' => \$ahora,
            ];

            if (DB::table('juegos')->where('slug', \$juego['slug'])->exists()) {
                DB::table('juegos')->where('slug', \$juego['slug'])->update(\$payload);
            } else {
                DB::table('juegos')->insert(array_merge(\$payload, [
                    'slug' => \$juego['slug'],
                    'created_at' => \$ahora,
                ]));
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }
        DB::table('juegos')->whereIn('slug', array_column(self::JUEGOS, 'slug'))->delete();
    }
};
`;

fs.writeFileSync(migPath, php, "utf8");
console.log("Migración: " + migPath);

// Parche SQL dump
const sqlPath = path.resolve(__dirname, "../database/ambientes.sql");
let sql = fs.readFileSync(sqlPath, "utf8");
const ahora = "2026-10-29 15:00:00";
const porPadre = {};
manifest.forEach((m) => {
  (porPadre[m.slugAntiguo] = porPadre[m.slugAntiguo] || []).push(m);
});

const ejeByTem = { 38: 19, 39: 19, 40: 19, 41: 19, 42: 19, 43: 20 };
let orden = 300;
let done = 0;

for (const [slugAntiguo, group] of Object.entries(porPadre)) {
  const needle = "('" + slugAntiguo + "',";
  const idx = sql.indexOf(needle);
  if (idx === -1) {
    console.log("SQL MISS " + slugAntiguo);
    continue;
  }
  // solo líneas de juegos (ambiente 8)
  const lineStart = sql.lastIndexOf("\n", idx) + 1;
  const end = sql.indexOf("\n", idx);
  const block = group
    .map((m) => {
      const eje = ejeByTem[m.tematicaId] || 19;
      const nombreSql = m.nombre.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const o = orden++;
      return (
        "('" +
        m.slug +
        "',8," +
        eje +
        "," +
        m.tematicaId +
        ",3,'" +
        m.ruta +
        "','" +
        nombreSql +
        "',NULL,NULL,'" +
        m.color +
        "'," +
        o +
        ",1,'" +
        ahora +
        "','" +
        ahora +
        "'),"
      );
    })
    .join("\n");
  sql = sql.slice(0, lineStart) + block + sql.slice(end);
  done += 1;
  console.log("SQL OK " + slugAntiguo + " → " + group.length);
}

fs.writeFileSync(sqlPath, sql, "utf8");
console.log("SQL groups patched: " + done);
