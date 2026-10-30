/**
 * Segunda/tercera pasada sobre logica.js|retos.js de paquetes Multisensorial partidos.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const SKIP = new Set(["img"]);

function patch(src) {
  let s = src;

  if (!/\biLargo\b/.test(s)) {
    s = s.replace(
      /retos\.forEach\(function\s*\(\s*r\s*,\s*i\s*\)\s*\{/g,
      'retos.forEach(function (r, i) {\n                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);'
    );
  }

  s = s.replace(/\b(regla|reglas)\.([a-zA-Z_][a-zA-Z0-9_]*)\[i\]/g, "$1.$2[iLargo]");

  s = s.replace(
    /reglas\.grupos\.forEach\(function \(g\) \{ if \(!usados\[g\]\) err\(tag \+ ": el módulo " \+ g \+ " no tiene reto"\); \}\);/g,
    "/* partido: no exigir todos los módulos */"
  );

  return s;
}

let n = 0;
fs.readdirSync(ROOT).forEach((padre) => {
  if (SKIP.has(padre)) return;
  const dir = path.join(ROOT, padre);
  if (!fs.statSync(dir).isDirectory()) return;
  fs.readdirSync(dir).forEach((sub) => {
    const p = path.join(dir, sub);
    if (!fs.statSync(p).isDirectory() || !fs.existsSync(path.join(p, "config.json"))) return;
    ["logica.js", "retos.js"].forEach((fname) => {
      const f = path.join(p, fname);
      if (!fs.existsSync(f)) return;
      const before = fs.readFileSync(f, "utf8");
      const after = patch(before);
      if (after !== before) {
        fs.writeFileSync(f, after, "utf8");
        n += 1;
      }
    });
  });
});

console.log("archivos parchados: " + n);
