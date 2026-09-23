/**
 * Pruebas por edades: PedniaEdad.resolverNivel contra los 14 configs.
 * Uso: node scripts/probar-edades-juegos.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const helperPath = path.join(root, "public/catalogo_juegos/shared/edad-nivel.js");

const juegos = [
  "Multisensorial/EncuentraElColor",
  "Multisensorial/BuscaLaSombra",
  "Multisensorial/CompletaLaFigura",
  "Multisensorial/BuscaLasDiferencias",
  "Polimotor/Lateralidad",
  "Polimotor/ArrastrarYSoltarObjetos",
  "Polimotor/JuegosDePrecision",
  "Polimotor/LaberintosDeCoordinacion",
  "Polimotor/SecuenciaDeMovimiento",
  "Polimotor/Reconocimiento",
  "Polimotor/Rompecabezas",
  "Polimotor/CoordinacionVisual",
  "Polimotor/MemoriaCorporal",
  "Polimotor/EnsamblajesSencillos",
];

const casosEdad = [
  { edad: 2, etiqueta: "3" },
  { edad: 3, etiqueta: "3" },
  { edad: 4, etiqueta: "4" },
  { edad: 5, etiqueta: "5" },
  { edad: 6, etiqueta: "5" },
  { edad: 8, etiqueta: "5" },
  { edad: null, etiqueta: "3" },
];

let fails = 0;
let oks = 0;

function ok(msg) {
  oks += 1;
  console.log("  OK  " + msg);
}

function fail(msg) {
  fails += 1;
  console.error("  FAIL " + msg);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function etiquetaBucket(edadLabel) {
  const e = String(edadLabel || "").toLowerCase();
  if (e.indexOf("3") === 0) return "3";
  if (e.indexOf("4") === 0) return "4";
  if (e.indexOf("5") === 0 || e.indexOf("6") !== -1) return "5";
  return "?";
}

// Cargar PedniaEdad en sandbox
const sandbox = { console, window: {} };
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.this = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(helperPath, "utf8"), sandbox);
const PedniaEdad = sandbox.PedniaEdad || sandbox.window.PedniaEdad;
assert(!!PedniaEdad, "PedniaEdad expuesto");

console.log("\n=== PedniaEdad: preview vs kiosco ===");
{
  let manual = 0;
  let elegido = null;
  sandbox.__PEDNIA_PERFIL__ = { fuente: "preview_superadmin", edad: 4 };
  PedniaEdad.iniciarNivel({
    niveles: [{ id: "3", edad: "3 años" }, { id: "4", edad: "4 años" }],
    elegirManual: function () { manual += 1; },
    onElegido: function (n) { elegido = n; },
  });
  assert(manual === 1 && elegido === null, "preview_superadmin llama elegirManual (no auto)");

  manual = 0;
  elegido = null;
  sandbox.__PEDNIA_PERFIL__ = { activo: true, estudiante_id: 1, edad: 4, fuente: "kiosco" };
  PedniaEdad.iniciarNivel({
    niveles: [
      { id: "a", edad: "3 años" },
      { id: "b", edad: "4 años" },
      { id: "c", edad: "5-6 años" },
    ],
    elegirManual: function () { manual += 1; },
    onElegido: function (n) { elegido = n; },
  });
  assert(manual === 0 && elegido && elegido.id === "b", "kiosco edad 4 → nivel 4 años sin Swal");

  elegido = null;
  sandbox.__PEDNIA_PERFIL__ = { activo: true, estudiante_id: 1, edad: null };
  PedniaEdad.iniciarNivel({
    niveles: [
      { id: "a", edad: "3 años" },
      { id: "b", edad: "4 años" },
    ],
    elegirManual: function () { manual += 1; },
    onElegido: function (n) { elegido = n; },
  });
  assert(elegido && elegido.id === "a", "kiosco sin edad → fallback 3 años");

  elegido = null;
  sandbox.__PEDNIA_PERFIL__ = null;
  sandbox.location = { search: "?edad=5" };
  PedniaEdad.iniciarNivel({
    niveles: [
      { id: "a", edad: "3 años" },
      { id: "b", edad: "4 años" },
      { id: "c", edad: "5-6 años" },
    ],
    elegirManual: function () { manual += 1; },
    onElegido: function (n) { elegido = n; },
  });
  assert(elegido && elegido.id === "c", "sin perfil pero ?edad=5 → nivel 5-6");
}

console.log("\n=== Configs: sin edad raíz + resolución por edad ===");
for (const rel of juegos) {
  const cfgPath = path.join(root, "public/catalogo_juegos", rel, "config.json");
  const htmlPath = path.join(root, "public/catalogo_juegos", rel, "index.html");
  console.log("\n[" + rel + "]");

  if (!fs.existsSync(cfgPath)) {
    fail("config.json ausente");
    continue;
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  assert(!Object.prototype.hasOwnProperty.call(cfg, "edad"), "sin clave raíz edad");
  assert(Array.isArray(cfg.niveles) && cfg.niveles.length >= 3, "tiene ≥3 niveles");

  const buckets = new Set(cfg.niveles.map(function (n) { return etiquetaBucket(n.edad); }));
  assert(buckets.has("3") && buckets.has("4") && buckets.has("5"), "cubre etiquetas 3/4/5-6");

  for (const c of casosEdad) {
    const nivel = PedniaEdad.resolverNivel(cfg.niveles, c.edad == null ? 3 : c.edad);
    const got = nivel ? etiquetaBucket(nivel.edad) : "null";
    assert(got === c.etiqueta, "edad " + c.edad + " → bucket " + c.etiqueta + " (got " + got + ", id=" + (nivel && nivel.id) + ")");
  }

  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    assert(html.indexOf("shared/edad-nivel.js") !== -1, "index incluye edad-nivel.js");
  } else {
    fail("index.html ausente");
  }
}

console.log("\n=== Resumen ===");
console.log("OK=" + oks + " FAIL=" + fails);
process.exit(fails ? 1 : 0);
