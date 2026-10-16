/**
 * Pruebas de Encuentra la pareja: config alineada al documento + órganos por edad.
 * Uso: node scripts/probar-encuentra-la-pareja.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/EncuentraLaPareja");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.EncuentraParejaLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.EncuentraParejaSfx;
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
assert(enDoc(n34.titulo) && enDoc(n56.titulo), "nombre del juego de cada edad tomado del documento");

console.log("=== Textos del documento ===");
config.niveles.forEach((n) => {
  n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre en el documento: " + l.texto));
  n.retos.forEach((r) => {
    assert(enDoc(r.titulo) || enDoc(r.titulo.replace("¿", "").replace("?", "")), n.edad + " " + r.id + ": título");
    assert(enDoc(r.presentacion.texto), n.edad + " " + r.id + " presentación");
    assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto");
    assert(enDoc(r.errorOtro.texto), n.edad + " " + r.id + " errorOtro");
    (r.errores || []).forEach((e, k) => {
      assert(enDoc(e.texto), n.edad + " " + r.id + " error[" + k + "]");
      assert((e.objetos || []).length > 0, n.edad + " " + r.id + " error[" + k + "] con objetos");
    });
  });
});
assert(L.errorPara(n34.retos[1], "lengua").texto.indexOf("no la comemos") !== -1, "3-4 flor: lengua usa error específico");
assert(L.errorPara(n34.retos[1], "ojo").texto === n34.retos[1].errorOtro.texto, "3-4 flor: ojo usa errorOtro");
assert(L.errorPara(n34.retos[2], "nariz").texto.indexOf("saborear") !== -1, "3-4 helado: nariz usa error específico");
assert(L.errorPara(n34.retos[3], "oido").texto.indexOf("luz para mirar") !== -1, "3-4 sol: oído usa error específico");
assert(norm(n56.insignia.nombre) === "ingeniero de conexiones sensoriales" && enDoc(n56.insignia.nombre), "5-6: Ingeniero de Conexiones Sensoriales");
assert(n34.cierre[0].texto === n56.cierre[0].texto, "3-4 reutiliza el único cierre del documento (no hay otro)");

console.log("=== Retos del documento ===");
const esperado = {
  "3-4 años": [
    ["campana", "oido", "oido,ojo,nariz,lengua", "vuelaOido", "zoe", "zeus"],
    ["flor", "nariz", "lengua,oido,nariz,ojo", "aspira", "zeus", "zoe"],
    ["helado", "lengua", "oido,nariz,lengua,ojo", "lenguetazo", "zoe", "zeus"],
    ["sol", "ojo", "oido,lengua,ojo,nariz", "gafas", "zeus", "zoe"]
  ],
  "5-6 años": [
    ["campana", "oido", "oido,ojo,nariz,lengua,mano", "vuelaOido", "zoe", "zeus"],
    ["flor", "nariz", "lengua,oido,nariz,ojo,mano", "aspira", "zeus", "zoe"],
    ["helado", "lengua", "oido,nariz,lengua,ojo,mano", "lenguetazo", "zoe", "zeus"],
    ["sol", "ojo", "oido,lengua,ojo,nariz,mano", "gafas", "zeus", "zoe"]
  ]
};
config.niveles.forEach((n) => n.retos.forEach((r, i) => {
  const [est, corr, ops, anim, vozA, vozE] = esperado[n.edad][i];
  const tag = n.edad + " " + r.id;
  assert(r.estimulo === est, tag + ": estímulo " + est);
  assert(r.correcto === corr, tag + ": correcto " + corr);
  assert(r.opciones.join(",") === ops, tag + ": opciones del documento");
  assert(r.acierto.animacion === anim, tag + ": animación " + anim);
  assert(r.presentacion.voz === vozA && r.acierto.voz === vozA, tag + ": presentación/acierto " + vozA);
  assert(r.errorOtro.voz === vozE, tag + ": error " + vozE);
}));
assert(n34.retos.every((r) => r.opciones.length === 4), "3-4: 4 órganos (sin mano)");
assert(n56.retos.every((r) => r.opciones.length === 5 && r.opciones.indexOf("mano") !== -1), "5-6: 5 órganos con mano");
assert(n56.cierreEscena === "tablero", "5-6: tablero de control humano al cierre");
assert(n56.retos[0].acierto.verificacion === "ecualizador", "5-6 R1: ecualizador de verificación");

console.log("=== Validación de toques ===");
assert(L.evaluar(n34.retos[0], "oido") === "correcto", "campana → oído");
assert(L.evaluar(n34.retos[0], "ojo") === "incorrecto", "campana no es ojo");
assert(L.errorPara(n34.retos[0], "nariz").voz === "zeus", "error de campana: Zeus");
assert(L.errorPara(n34.retos[1], "lengua").voz === "zoe", "error de flor: Zoe");
assert(L.clasificarGesto(2, 2) === "toque" && L.clasificarGesto(40, 0) === "arrastre", "gesto toque/arrastre");

console.log("=== Opciones no delatan ===");
let semilla = 11;
const rnd = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
config.niveles.forEach((n) => {
  let anterior = -1;
  n.retos.forEach((r) => {
    let bien = true;
    for (let k = 0; k < 200; k++) {
      const orden = L.ordenarOpciones(r.opciones, r.correcto, anterior, rnd);
      if (orden.indexOf(r.correcto) === 0 || orden.indexOf(r.correcto) === anterior) bien = false;
    }
    assert(bien, n.edad + " " + r.id + ": correcta no siempre primera ni fija");
    anterior = L.ordenarOpciones(r.opciones, r.correcto, anterior, rnd).indexOf(r.correcto);
  });
});

console.log("=== Imágenes y efectos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), id + ": " + e.img);
});
config.niveles.forEach((n) => {
  assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": insignia");
  n.retos.forEach((r) => {
    assert(Sfx.EFECTOS.includes(r.acierto.efecto), r.id + ": efecto " + r.acierto.efecto);
    if (r.errorOtro.efecto) assert(Sfx.EFECTOS.includes(r.errorOtro.efecto), r.id + ": efecto error");
  });
});
assert(config.demo.estimulo === "tambor" && !n34.retos.some((r) => r.estimulo === "tambor"), "demo con tambor fuera de los retos");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  if (f.endsWith(".svg")) {
    const buf = fs.readFileSync(path.join(dir, "img", f));
    let valido = true;
    try { new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { valido = false; }
    assert(valido, ref + " UTF-8 válido");
  }
  assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref), ref + " se usa");
});

console.log("=== Pantalla de inicio / shell ===");
assert(html.includes("btn-empecemos") && html.includes("fa-play"), "inicio: botón play");
assert(html.includes('id="estimulo"') && html.includes('id="opciones"'), "estímulo y órganos");
assert(html.includes("tablero-sensorial"), "tablero de cierre 5-6");
assert(js.includes("pista.gen") && js.includes("laboratorio-sensorial"), "pista.gen y laboratorio");
assert(!html.includes("stub-wrap"), "sin stub");

console.log("=== Validador (negativos) ===");
[
  ["reto de menos", (c) => { c.niveles[0].retos.pop(); }],
  ["3-4 con mano", (c) => { c.niveles[0].retos[0].opciones.push("mano"); }],
  ["5-6 sin mano", (c) => { c.niveles[1].retos[0].opciones = ["oido", "ojo", "nariz", "lengua"]; }],
  ["demo con estímulo de reto", (c) => { c.demo.estimulo = "campana"; }],
  ["sin voz de error", (c) => { delete c.niveles[0].retos[0].errorOtro; }],
  ["animación desconocida", (c) => { c.niveles[0].retos[0].acierto.animacion = "gira"; }],
  ["correcta fuera", (c) => { c.niveles[0].retos[0].correcto = "mano"; }]
].forEach(([nombre, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "detecta: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
