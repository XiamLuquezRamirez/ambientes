/**
 * Pruebas de ¿Qué sonido escuchas? (EA) partido en 6 juegos (1 reto = 1 juego).
 * Uso: node scripts/probar-que-sonido-arte.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas");

const JUEGOS = [
  {
    carpeta: "SonidosDeLaNaturalezaYAnimales",
    nombre: "Sonidos de la Naturaleza y Animales",
    edad: "3-4 años",
    retoId: "establo",
    opciones: "vaca,perro",
    correcto: "vaca",
    escena: "granja",
    esperaToque: true,
    capas: "mugido",
    efecto: "vaca",
    concierto: "bosque",
    elementosConcierto: "vaca",
    insignia: "superoyente",
  },
  {
    carpeta: "SonidosDelEntornoCotidiano",
    nombre: "Sonidos del Entorno Cotidiano",
    edad: "3-4 años",
    retoId: "cocina",
    opciones: "llave,despertador",
    correcto: "llave",
    escena: "cocina",
    capas: "grifo",
    efecto: "grifo",
    concierto: "bosque",
    elementosConcierto: "llave",
    insignia: "superoyente",
  },
  {
    carpeta: "SonidosDeVehiculosYTransporte",
    nombre: "Sonidos de Vehículos y Transporte",
    edad: "3-4 años",
    retoId: "calle",
    opciones: "ambulancia,tractor",
    correcto: "ambulancia",
    escena: "calle",
    capas: "sirena",
    efecto: "ambulancia",
    concierto: "bosque",
    elementosConcierto: "ambulancia",
    insignia: "superoyente",
  },
  {
    carpeta: "SonidosUrbanosYDeTransito",
    nombre: "Sonidos Urbanos y de Tránsito",
    edad: "5-6 años",
    retoId: "gran-ciudad",
    opciones: "tren,bomberos,policia",
    correcto: "tren",
    escena: "ciudad",
    capas: "tren,campanaCruce",
    efecto: "tren",
    concierto: "mezcla",
    elementosConcierto: "tren",
    insignia: "maestro",
  },
  {
    carpeta: "NaturalezaSalvaje",
    nombre: "Naturaleza Salvaje",
    edad: "5-6 años",
    retoId: "bosque-nocturno",
    opciones: "buho,lobo,rana",
    correcto: "buho",
    escena: "noche",
    capas: "buho",
    efecto: "buho",
    concierto: "mezcla",
    elementosConcierto: "buho",
    insignia: "maestro",
  },
  {
    carpeta: "EfectosEspecialesYClima",
    nombre: "Efectos Especiales y Clima",
    edad: "5-6 años",
    retoId: "tormenta",
    opciones: "trueno,lluvia,mar",
    correcto: "trueno",
    escena: "tormenta",
    capas: "viento,trueno",
    efecto: "rayo",
    concierto: "mezcla",
    elementosConcierto: "trueno",
    insignia: "maestro",
    truenoAlFinal: true,
  },
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

function cargarPaquete(dir) {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
  return {
    L: sandbox.QueSonidoArteLogica,
    Sfx: sandbox.QueSonidoArteSfx,
    config: JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8")),
    doc: fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8"),
    js: fs.readFileSync(path.join(dir, "script.js"), "utf8"),
    html: fs.readFileSync(path.join(dir, "index.html"), "utf8"),
    css: fs.readFileSync(path.join(dir, "style.css"), "utf8"),
  };
}

assert(fs.existsSync(ROOT), "existe catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas");

JUEGOS.forEach((meta) => {
  const dir = path.join(ROOT, meta.carpeta);
  console.log("\n=== " + meta.nombre + " ===");
  assert(fs.existsSync(dir), "carpeta " + meta.carpeta);

  const { L, Sfx, config, doc, js, html, css } = cargarPaquete(dir);
  const docNorm = norm(doc);
  const enDoc = (texto) => docNorm.includes(norm(texto));
  const copia = () => JSON.parse(JSON.stringify(config));

  const errores = L.validarConfig(config);
  errores.forEach((e) => console.error("  " + e));
  assert(errores.length === 0, meta.carpeta + ": validarConfig sin errores");
  assert(config.nombre === meta.nombre, "nombre del juego");
  assert(config.niveles.length === 1, "un solo nivel de edad");
  assert(!config.stub, "sin stub");

  const n = config.niveles[0];
  assert(n.edad === meta.edad, "edad " + meta.edad);
  assert(n.retos.length === 1, "un solo reto");
  const r = n.retos[0];
  assert(r.id === meta.retoId, "reto id " + meta.retoId);
  assert(r.opciones.join() === meta.opciones && r.correcto === meta.correcto, "opciones/correcto");
  assert(r.escena === meta.escena, "escena del reto");
  if (meta.esperaToque) assert(r.esperaToque === true, "espera toque en bocina");
  assert(L.capasDe(r, config.elementos).map((c) => c.sonido).join() === meta.capas, "capas de audio");
  assert(r.acierto.efecto === meta.efecto, "efecto de acierto");
  assert(n.concierto.tipo === meta.concierto, "tipo de concierto (cierre actual)");
  assert(L.elementosConcierto(n).join() === meta.elementosConcierto, "elementos del concierto");
  assert(n.insignia.img.includes(meta.insignia), "insignia del cierre");
  assert(n.cierre.length >= 2, "cierre Zoe + Zeus");
  n.cierre.forEach((l) => assert(enDoc(l.texto), "cierre en documento: " + l.texto));
  ["consigna", "pregunta", "acierto", "error"].forEach((k) => {
    if (r[k] && r[k].texto) assert(enDoc(r[k].texto), k + " en documento");
  });

  if (meta.truenoAlFinal) {
    const capas = L.capasDe(r, config.elementos);
    assert(capas[1].principal && capas[1].retrasoMs > 0, "trueno retumba al final");
  }

  Object.entries(config.elementos).forEach(([id, e]) => {
    assert(fs.existsSync(path.join(dir, e.img)), "imagen " + id);
    (e.fotogramas || []).forEach((f) => assert(fs.existsSync(path.join(dir, f)), "fotograma " + f));
    if (e.sonido) assert(Sfx.ESTIMULOS.includes(e.sonido), "sfx " + e.sonido);
  });
  Object.entries(config.escenas).forEach(([id, src]) => assert(fs.existsSync(path.join(dir, src)), "escena " + id));
  assert(fs.existsSync(path.join(dir, n.insignia.img)), "medalla existe");
  assert(html.includes(meta.nombre) || html.includes("<title>" + meta.nombre + "</title>"), "title HTML");
  assert(html.includes('id="btn-escaner"') && html.includes('id="consola"'), "bocina y consola");
  assert(!/\.destello\b/.test(css.replace(/destello-pantalla/g, "")), "sin .destello");

  const casos = [
    ["opción inexistente", (c) => { c.niveles[0].retos[0].opciones[0] = "dragon"; }],
    ["correcto fuera", (c) => { c.niveles[0].retos[0].correcto = "pajaro"; }],
    ["sin voz de error", (c) => { delete c.niveles[0].retos[0].error; }],
    ["sin medalla", (c) => { delete c.niveles[0].insignia; }],
    ["efecto cambiado", (c) => { c.niveles[0].retos[0].acierto.efecto = "chispas"; }],
    ["cero retos", (c) => { c.niveles[0].retos = []; }],
    ["demo en opciones", (c) => { c.niveles[0].retos[0].opciones.push(c.demo.elemento); }],
  ];
  if (meta.edad === "3-4 años") {
    casos.push(["3-4 con 4 tarjetas", (c) => { c.niveles[0].retos[0].opciones.push("tractor", "lobo"); }]);
  } else {
    casos.push(["5-6 con 2 tarjetas", (c) => { c.niveles[0].retos[0].opciones = ["tren", "bomberos"]; }]);
  }
  casos.forEach(([nombre, mutar]) => {
    const c = copia();
    mutar(c);
    assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
  });

  void js;
});

console.log("\n=== Lógica compartida (primer paquete) ===");
{
  const { L } = cargarPaquete(path.join(ROOT, JUEGOS[0].carpeta));
  assert(L.normalizarActivas([{}, {}], [false, false]).join() === "true,true", "normalizarActivas");
  const rect = { left: 100, right: 200, top: 100, bottom: 200 };
  assert(L.soltoSobre({ x: 150, y: 150 }, rect), "soltoSobre");
  const prog = L.programaConcierto(["a", "b", "c"], { bpm: 120, compases: 2 });
  assert(prog.pulsoMs === 500 && prog.golpes.length === 8, "programaConcierto");
}

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
