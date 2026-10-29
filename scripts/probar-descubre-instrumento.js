/**
 * Pruebas: Descubre el instrumento partido en 7 juegos (1 reto = 1 juego).
 * Uso: node scripts/probar-descubre-instrumento.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/DescubreElInstrumento");

const JUEGOS = [
  { carpeta: "ElTambor", nombre: "El Tambor", edad: "3-4 años", retoId: "caja-sorpresa", tipo: "caja" },
  { carpeta: "LaGuitarra", nombre: "La Guitarra", edad: "3-4 años", retoId: "cuerdas", tipo: "cuerdas" },
  { carpeta: "LaFlautaMagica", nombre: "La Flauta Mágica", edad: "3-4 años", retoId: "flauta-magica", tipo: "flauta" },
  { carpeta: "GuardarLosInstrumentos", nombre: "Guardar los Instrumentos", edad: "3-4 años", retoId: "estuches", tipo: "estuches" },
  { carpeta: "CuerdaVientoYPercusion", nombre: "Cuerda, Viento y Percusión", edad: "5-6 años", retoId: "orquesta", tipo: "familias" },
  { carpeta: "AgudoVsGrave", nombre: "Agudo vs. Grave", edad: "5-6 años", retoId: "duelo", tipo: "duelo" },
  { carpeta: "DirectorDeOrquesta", nombre: "Director de Orquesta", edad: "5-6 años", retoId: "director", tipo: "director" },
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
  vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
  return {
    L: sandbox.DescubreInstrumentoLogica,
    Sfx: sandbox.DescubreInstrumentoSfx,
    config: JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8")),
    doc: fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8"),
    html: fs.readFileSync(path.join(dir, "index.html"), "utf8"),
    css: fs.readFileSync(path.join(dir, "style.css"), "utf8"),
    js: fs.readFileSync(path.join(dir, "script.js"), "utf8"),
  };
}

assert(fs.existsSync(ROOT), "existe DescubreElInstrumento/");
assert(!fs.existsSync(path.join(ROOT, "config.json")), "sin paquete plano en la raíz");

JUEGOS.forEach((meta) => {
  const dir = path.join(ROOT, meta.carpeta);
  console.log("\n=== " + meta.nombre + " ===");
  assert(fs.existsSync(dir), "carpeta " + meta.carpeta);

  const { L, Sfx, config, doc, html, css, js } = cargar(dir);
  const enDoc = (t) => norm(doc).includes(norm(t));
  const errores = L.validarConfig(config);
  errores.forEach((e) => console.error("  " + e));
  assert(errores.length === 0, "validarConfig sin errores");
  assert(config.nombre === meta.nombre, "nombre");
  assert(config.niveles.length === 1, "un nivel");
  const n = config.niveles[0];
  assert(n.edad === meta.edad, "edad");
  assert(n.retos.length === 1 && n.retos[0].id === meta.retoId && n.retos[0].tipo === meta.tipo, "reto");
  assert(n.cierre.length >= 2 && n.insignia && n.concierto, "cierre/insignia/concierto");
  L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), "cierre en doc"));
  assert(enDoc(n.insignia.nombre), "medalla en doc");
  L.lineas(n.retos[0].consigna).forEach((l) => assert(enDoc(l.texto), "consigna en doc"));
  assert(html.includes("<title>" + meta.nombre + "</title>"), "title HTML");
  assert(html.includes('id="estacion"'), "estación en HTML");
  assert(!/\.destello\b/.test(css), "sin .destello");
  assert(fs.existsSync(path.join(dir, n.insignia.img)), "medalla en disco");
  Object.values(config.instrumentos).forEach((e) => {
    assert(fs.existsSync(path.join(dir, e.img)), "img " + e.img);
    assert(Sfx.INSTRUMENTOS.includes(e.sonido), "sfx " + e.sonido);
  });
  void js;

  const c = JSON.parse(JSON.stringify(config));
  c.niveles[0].retos = [];
  assert(L.validarConfig(c).length > 0, "rechaza sin retos");
  const c2 = JSON.parse(JSON.stringify(config));
  c2.demo.instrumento = c2.niveles[0].retos[0].instrumento || c2.niveles[0].retos[0].correcto || (c2.niveles[0].retos[0].instrumentos || [])[0] || (c2.niveles[0].retos[0].secuencia || [])[0];
  if (c2.demo.instrumento) assert(L.validarConfig(c2).length > 0, "rechaza demo en reto");
});

console.log("\n=== Lógica compartida ===");
{
  const { L } = cargar(path.join(ROOT, "ElTambor"));
  assert(L.progresoDestape(240, 300, 1.6) === 0.5, "progresoDestape");
  assert(L.esRasgueo([0, 1]) && !L.esRasgueo([1, 1]), "esRasgueo");
}

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
