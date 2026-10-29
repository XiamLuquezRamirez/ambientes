/**
 * Pruebas: Sigue el ritmo partido en 6 juegos.
 * Uso: node scripts/probar-sigue-el-ritmo.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/SigueElRitmo");

const JUEGOS = [
  { carpeta: "ElLatidoDelTambor", nombre: "El Latido del Tambor", edad: "3-4 años", retoId: "pulso", tipo: "pulso" },
  { carpeta: "AplausosAlCompas", nombre: "Aplausos al Compás", edad: "3-4 años", retoId: "aplausos", tipo: "pulso" },
  { carpeta: "DosGolpesYUnaPausa", nombre: "Dos Golpes y una Pausa", edad: "3-4 años", retoId: "pasos", tipo: "patron" },
  { carpeta: "PalmadaYTambor", nombre: "Palmada y Tambor", edad: "5-6 años", retoId: "buho", tipo: "secuencia" },
  { carpeta: "LosGrandesInstrumentos", nombre: "Los Grandes Instrumentos", edad: "5-6 años", retoId: "instrumentos", tipo: "memoria" },
  { carpeta: "MemoriaYCoordinacion", nombre: "Memoria y Coordinación", edad: "5-6 años", retoId: "bateria", tipo: "secuencia" },
];

let oks = 0;
let fails = 0;
function assert(cond, msg) {
  if (cond) oks += 1;
  else {
    fails += 1;
    console.error("  FAIL " + msg);
  }
}

const norm = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function cargar(dir) {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
  return {
    L: sandbox.SigueElRitmoLogica,
    config: JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8")),
    doc: fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8"),
    html: fs.readFileSync(path.join(dir, "index.html"), "utf8"),
  };
}

assert(fs.existsSync(ROOT), "existe SigueElRitmo/");
assert(!fs.existsSync(path.join(ROOT, "config.json")), "sin paquete plano");

JUEGOS.forEach((meta) => {
  const dir = path.join(ROOT, meta.carpeta);
  console.log("\n=== " + meta.nombre + " ===");
  assert(fs.existsSync(dir), "carpeta " + meta.carpeta);
  const { L, config, doc, html } = cargar(dir);
  const enDoc = (t) => norm(doc).includes(norm(t));
  const errores = L.validarConfig(config);
  errores.forEach((e) => console.error("  " + e));
  assert(errores.length === 0, "validarConfig");
  assert(config.nombre === meta.nombre, "nombre");
  assert(config.niveles.length === 1, "1 nivel");
  const n = config.niveles[0];
  assert(n.edad === meta.edad, "edad");
  assert(n.retos.length === 1 && n.retos[0].id === meta.retoId && n.retos[0].tipo === meta.tipo, "reto");
  assert(n.cierre.length >= 2 && n.insignia, "cierre/insignia");
  L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), "cierre en doc"));
  assert(html.includes("<title>" + meta.nombre + "</title>"), "title");
  assert(fs.existsSync(path.join(dir, n.insignia.img)), "medalla");
  const vacio = JSON.parse(JSON.stringify(config));
  vacio.niveles[0].retos = [];
  assert(L.validarConfig(vacio).length > 0, "rechaza sin retos");
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
