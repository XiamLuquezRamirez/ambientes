/**
 * Pruebas de Observa y recuerda: config alineada al documento + mecánicas.
 * Uso: node scripts/probar-observa-y-recuerda.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/ObservaYRecuerda");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ObservaRecuerdaLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ObservaRecuerdaSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");

let oks = 0;
let fails = 0;
function assert(cond, msg) {
  if (cond) oks += 1;
  else {
    fails += 1;
    console.error("  FAIL " + msg);
  }
}

const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc);
const enDoc = (texto) => docNorm.includes(norm(texto));
const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(!config.stub && !config.creado_en, "config sin stub");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(enDoc(n56.titulo), "título 5-6 del documento");

console.log("=== Textos del documento ===");
config.niveles.forEach((n) => {
  n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre: " + l.texto));
  n.retos.forEach((r) => {
    assert(enDoc(r.presentacion.texto), n.edad + " " + r.id + " presentación");
    assert(enDoc(r.pregunta.texto), n.edad + " " + r.id + " pregunta");
    assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto");
    assert(enDoc(r.errorOtro.texto), n.edad + " " + r.id + " error");
  });
});
assert(norm(n34.insignia.nombre) === "superobservador sensorial" && enDoc(n34.insignia.nombre), "3-4: Superobservador Sensorial");
assert(norm(n56.insignia.nombre) === "conservador master del museo" && enDoc(n56.insignia.nombre), "5-6: Conservador Máster del Museo");

console.log("=== Retos del documento ===");
assert(n34.retos.length === 2 && n56.retos.length === 3, "2 retos en 3-4 y 3 en 5-6");
assert(n34.retos[0].mecanica === "intruso" && n34.retos[0].intruso === "sol", "3-4 R1: intruso sol");
assert(n34.retos[0].mostrar.join(",") === "manzana,campana,flor", "3-4 R1: mostrar");
assert(n34.retos[0].conservarOrden === true && n34.retos[0].indiceIntruso === 3, "3-4 R1: orden original + sol al final");
assert(n34.retos[0].observacionMs >= 6000 && n34.retos[0].observacionMs <= 7000, "3-4 R1: 6-7s");
{
  const ctx = L.prepararCtx(n34.retos[0], Math.random);
  assert(ctx.desafio.join(",") === "manzana,campana,flor,sol", "3-4 R1: desafío sin reordenar originales");
}
assert(n34.retos[1].mecanica === "faltante" && n34.retos[1].faltante === "flor", "3-4 R2: faltante flor");
assert(n34.retos[1].mostrar.join(",") === "manzana,campana,flor,pelota", "3-4 R2: mostrar");
assert(n34.retos[1].opciones.join(",") === "flor,helado,lija", "3-4 R2: opciones");
assert(n34.retos[1].observacionMs === 8000, "3-4 R2: 8s");

assert(n56.retos[0].intruso === "tambor" && n56.retos[0].mostrar.length === 5, "5-6 R1: tambor");
assert(n56.retos[0].observacionMs === 4000, "5-6 R1: 4s (audio Zoe)");
assert(n56.retos[1].faltante === "flor" && n56.retos[1].indiceFaltante === 2, "5-6 R2: flor pedestal 3");
assert(n56.retos[1].opciones.join(",") === "flor,sol,vidrio,lija", "5-6 R2: opciones");
assert(n56.retos[2].mecanica === "intercambio", "5-6 R3: intercambio");
assert(n56.retos[2].intercambiar.join(",") === "campana,pelota", "5-6 R3: campana↔pelota");
assert(n56.retos[2].mostrar.join(",") === "manzana,campana,flor,pelota,helado", "5-6 R3: orden");

console.log("=== Evaluación ===");
{
  const r = n34.retos[0];
  const ctx = L.prepararCtx(r, () => 0.3);
  assert(L.evaluar(r, ctx, "sol") === "correcto", "intruso sol correcto");
  assert(L.evaluar(r, ctx, "manzana") === "incorrecto", "intruso manzana incorrecto");
  assert(L.errorPara(r, "manzana").voz === "zeus", "error intruso: Zeus");
}
{
  const r = n34.retos[1];
  const ctx = L.prepararCtx(r, () => 0.2);
  assert(ctx.desafio[ctx.indice] === null && ctx.correctos[0] === "flor", "faltante deja hueco");
  assert(L.evaluar(r, ctx, "flor") === "correcto", "faltante flor correcta");
  assert(L.evaluar(r, ctx, "helado") === "incorrecto", "faltante helado incorrecto");
}
{
  const r = n56.retos[2];
  const ctx = L.prepararCtx(r, Math.random);
  assert(ctx.desafio[1] === "pelota" && ctx.desafio[3] === "campana", "posiciones intercambiadas");
  assert(L.evaluar(r, ctx, ["campana"]) === "parcial", "intercambio parcial");
  assert(L.evaluar(r, ctx, ["campana", "pelota"]) === "correcto", "intercambio correcto");
  assert(L.evaluar(r, ctx, ["manzana", "flor"]) === "incorrecto", "intercambio incorrecto");
}

console.log("=== Demo y assets ===");
assert(config.demo.mecanica === "intruso" && config.demo.intruso === "lija", "demo con lija (no es intruso de retos)");
assert(n34.retos.every((r) => (r.mostrar || []).indexOf("lija") === -1) && n56.retos[0].intruso !== "lija", "lija no es intruso de retos oficiales");
Object.entries(config.elementos).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), id + ": " + e.img);
});
config.niveles.forEach((n) => {
  assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": insignia");
  n.retos.forEach((r) => {
    if (r.acierto.efecto) assert(Sfx.EFECTOS.includes(r.acierto.efecto), r.id + ": efecto " + r.acierto.efecto);
    if (r.errorOtro.efecto) assert(Sfx.EFECTOS.includes(r.errorOtro.efecto), r.id + ": efecto error");
  });
});
const utf8 = new TextDecoder("utf-8", { fatal: true });
fs.readdirSync(path.join(dir, "img")).filter((f) => f.endsWith(".svg")).forEach((f) => {
  let okUtf = true;
  try { utf8.decode(fs.readFileSync(path.join(dir, "img", f))); } catch (e) { okUtf = false; }
  assert(okUtf, "img/" + f + " UTF-8");
});

console.log("=== Shell ===");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
assert(html.includes("btn-empecemos") && html.includes('id="tablero"') && html.includes('id="cubierta"'), "HTML tablero/cubierta");
assert(html.includes("logica.js") && html.includes("sfx.js") && html.includes("edad-nivel.js"), "scripts shell");
assert(js.includes("pista.gen") && js.includes("prepararCtx") && js.includes("granCierre"), "script flujo");
assert(!html.includes("stub-wrap"), "sin stub");

console.log("=== Validador (negativos) ===");
[
  ["reto de menos", (c) => { c.niveles[0].retos.pop(); }],
  ["intruso en mostrar", (c) => { c.niveles[0].retos[0].mostrar.push("sol"); }],
  ["5-6 sin intercambio", (c) => { c.niveles[1].retos[2].mecanica = "intruso"; }],
  ["sin voz de error", (c) => { delete c.niveles[0].retos[0].errorOtro; }],
  ["stub", (c) => { c.stub = true; }]
].forEach(([nombre, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "detecta: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
