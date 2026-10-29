const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "manifest-partir-ea-restantes.json"), "utf8")
);
const porPadre = {};
manifest.forEach((m) => {
  (porPadre[m.slugAntiguo] = porPadre[m.slugAntiguo] || []).push(m);
});

const ejeByTem = {
  51: 21, 52: 21, 53: 22, 54: 22, 55: 22, 56: 22, 57: 22,
  58: 23, 59: 23, 60: 23, 61: 23,
};

const sqlPath = path.resolve(__dirname, "../database/ambientes.sql");
let sql = fs.readFileSync(sqlPath, "utf8");
const ahora = "2026-10-29 14:30:00";
let orden = 200;
let done = 0;

for (const [slugAntiguo, group] of Object.entries(porPadre)) {
  // Buscar línea completa del insert del slug antiguo (eje variable)
  const needle = "('" + slugAntiguo + "',";
  const idx = sql.indexOf(needle);
  if (idx === -1) {
    console.log("MISS " + slugAntiguo);
    continue;
  }
  const end = sql.indexOf("\n", idx);
  const line = sql.slice(idx, end);
  const block = group
    .map((m) => {
      const eje = ejeByTem[m.tematicaId] || 21;
      const ruta = "catalogo_juegos/ExpresionArtistica/" + m.padre + "/" + m.carpeta;
      const nombreSql = m.nombre.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const o = orden++;
      return (
        "('" +
        m.slug +
        "',6," +
        eje +
        "," +
        m.tematicaId +
        ",11,'" +
        ruta +
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
  sql = sql.slice(0, idx) + block + sql.slice(end);
  done += 1;
  console.log("OK " + slugAntiguo + " → " + group.length + " (era: " + line.slice(0, 60) + "...)");
}

fs.writeFileSync(sqlPath, sql, "utf8");
console.log("patched groups: " + done);
