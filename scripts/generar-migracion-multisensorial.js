/**
 * Genera migration + parche SQL desde manifest-partir-multisensorial.json
 */
const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "manifest-partir-multisensorial.json"), "utf8")
);

const migPath = path.resolve(
  __dirname,
  "../database/migrations/2026_10_29_000009_partir_multisensorial.php"
);

const rows = manifest
  .map((m) => {
    return (
      "        ['slug' => " +
      JSON.stringify(m.slug) +
      ", 'nombre' => " +
      JSON.stringify(m.nombre) +
      ", 'carpeta' => " +
      JSON.stringify(m.padre + "/" + m.carpeta) +
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
 * Parte los juegos Multisensorial implementados (1 reto = 1 juego).
 * Generado desde scripts/manifest-partir-multisensorial.json
 */
return new class extends Migration
{
    private const AMBIENTE_ID = 9;

    private const EJE_ID = 12;

    private const MODULO_ID = 10;

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
                'ruta' => 'catalogo_juegos/Multisensorial/'.\$juego['carpeta'],
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

const sqlPath = path.resolve(__dirname, "../database/ambientes.sql");
let sql = fs.readFileSync(sqlPath, "utf8");
const ahora = "2026-10-29 15:30:00";
const porPadre = {};
manifest.forEach((m) => {
  (porPadre[m.slugAntiguo] = porPadre[m.slugAntiguo] || []).push(m);
});

const ejeByTem = {
  9: 12, 10: 12, 11: 12, 12: 12, 13: 12,
  14: 13, 15: 13, 16: 13, 17: 13, 18: 13,
  19: 14, 20: 14, 21: 14, 22: 14, 23: 14,
  24: 15, 25: 15, 26: 15, 27: 15, 28: 15,
};

let orden = 400;
let done = 0;

for (const [slugAntiguo, group] of Object.entries(porPadre)) {
  const needle = "('" + slugAntiguo + "',";
  // Prefer Multisensorial ambient line (ambiente_id 9)
  let idx = sql.indexOf(needle + "9,");
  if (idx === -1) idx = sql.indexOf(needle);
  if (idx === -1) {
    console.log("SQL MISS " + slugAntiguo);
    continue;
  }
  const lineStart = sql.lastIndexOf("\n", idx) + 1;
  const end = sql.indexOf("\n", idx);
  const block = group
    .map((m) => {
      const eje = ejeByTem[m.tematicaId] || 12;
      const nombreSql = m.nombre.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const o = orden++;
      return (
        "('" +
        m.slug +
        "',9," +
        eje +
        "," +
        m.tematicaId +
        ",10,'" +
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
