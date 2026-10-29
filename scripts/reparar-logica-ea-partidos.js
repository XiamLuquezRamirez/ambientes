/**
 * Segunda pasada sobre logica.js de paquetes partidos.
 */
const fs = require("fs");
const path = require("path");

const EA = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica");
const SKIP = new Set(["QueSonidoEscuchas", "DescubreElInstrumento", "SigueElRitmo", "img"]);

function patch(src) {
  let s = src;

  s = s.replace(
    /cfg\.niveles\.length\s*!==\s*2/g,
    "(cfg.niveles.length < 1 || cfg.niveles.length > 2)"
  );
  s = s.replace(
    /deben existir exactamente 2 niveles/g,
    "debe haber 1 o 2 niveles"
  );

  s = s.replace(
    /!Array\.isArray\(n\.retos\)\s*\|\|\s*n\.retos\.length\s*!==\s*4/g,
    "!Array.isArray(n.retos) || n.retos.length < 1 || n.retos.length > 4"
  );
  s = s.replace(
    /n\.retos\.length\s*!==\s*4/g,
    "(n.retos.length < 1 || n.retos.length > 4)"
  );
  s = s.replace(/debe tener 4 retos/g, "debe tener entre 1 y 4 retos");

  // Inyectar iLargo una sola vez por forEach de retos
  if (!/\bconst iLargo\b/.test(s)) {
    s = s.replace(
      /retos\.forEach\(function\s*\(\s*r\s*,\s*i\s*\)\s*\{/g,
      'retos.forEach(function (r, i) {\n                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);'
    );
    // variante con (r, idx) u otros
    s = s.replace(
      /\(n\.retos\s*\|\|\s*\[\]\)\.forEach\(function\s*\(\s*r\s*,\s*i\s*\)\s*\{/g,
      '(n.retos || []).forEach(function (r, i) {\n                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);'
    );
  }

  s = s.replace(/regla\.tipos\[i\]/g, "regla.tipos[iLargo]");
  s = s.replace(/regla\.largos\[i\]/g, "regla.largos[iLargo]");
  s = s.replace(/regla\.ids\[i\]/g, "regla.ids[iLargo]");

  s = s.replace(
    /if \(\(ni === 0 && n\.id !== "3"\) \|\| \(ni === 1 && n\.id !== "5"\)\) err\(tag \+ ": id de nivel inesperado"\);/g,
    'if ((n.edad === "3-4 años" && n.id !== "3") || (n.edad === "5-6 años" && n.id !== "5")) err(tag + ": id de nivel inesperado");'
  );

  return s;
}

let n = 0;
fs.readdirSync(EA).forEach((padre) => {
  if (SKIP.has(padre)) return;
  const dir = path.join(EA, padre);
  if (!fs.statSync(dir).isDirectory()) return;
  // Solo carpetas ya partidas (subcarpetas con config)
  const subs = fs.readdirSync(dir).filter((sub) => {
    const p = path.join(dir, sub);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "config.json"));
  });
  if (!subs.length) return;

  subs.forEach((sub) => {
    const logica = path.join(dir, sub, "logica.js");
    if (!fs.existsSync(logica)) return;
    const before = fs.readFileSync(logica, "utf8");
    const after = patch(before);
    if (after !== before) {
      fs.writeFileSync(logica, after, "utf8");
      n += 1;
    }
  });
});

console.log("logicas parchadas: " + n);
