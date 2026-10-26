/**
 * Pruebas de ¿Qué sonido escuchas? (Expresión Artística): config alineada al documento + reglas de los retos.
 * Uso: node scripts/probar-que-sonido-arte.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.QueSonidoArteLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.QueSonidoArteSfx;
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

/** Compara sin tildes, signos ni mayúsculas (el documento usa comillas tipográficas y "..."). */
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc);
const enDoc = (texto) => docNorm.includes(norm(texto));

const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const reto = (n, id) => n.retos.find((r) => r.id === id);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(config.niveles.map((n) => n.id).join("|") === "3|5", "ids de nivel 3 y 5");
assert(!config.stub, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(n34.tema === "bosque" && n56.tema === "estudio", "bosque mágico (3-4) y estudio de grabación (5-6)");
assert(n34.arrastre === true && n56.arrastre === false, "arrastre hasta la bocina solo en 3-4");

console.log("=== Textos literales del documento ===");
config.niveles.forEach((n) => {
  n.retos.forEach((r) => {
    ["consigna", "pregunta", "acierto", "error"].forEach((k) => {
      if (r[k] && r[k].texto) assert(enDoc(r[k].texto), n.edad + " " + r.id + " " + k + " en el documento: " + r[k].texto);
    });
  });
  n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre en el documento: " + l.texto));
  assert(enDoc(n.insignia.nombre), n.edad + " medalla del documento: " + n.insignia.nombre);
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");

console.log("=== Voces según el documento ===");
const voces = (n) => n.retos.map((r) => [r.consigna.voz, r.acierto.voz, r.error.voz].join("/")).join(" | ");
assert(voces(n34) === "zoe/zoe/zeus | zeus/zoe/zeus | zoe/zoe/zeus", "3-4: Zoe y Zeus en el orden del documento");
assert(voces(n56) === "zoe/zoe/zeus | zeus/zeus/zoe | zoe/zoe/zeus", "5-6: Zoe y Zeus en el orden del documento");
assert(reto(n34, "establo").pregunta.voz === "zeus", "3-4 reto 1: Zeus pregunta qué animal hace ese sonido");
config.niveles.forEach((n) => assert(n.cierre.map((l) => l.voz).join() === "zoe,zeus", n.edad + ": cierre de Zoe y luego Zeus"));

console.log("=== 3-4 años ===");
assert(n34.retos.length === 3, "3 retos");
assert(n34.retos.every((r) => r.opciones.length === 2), "2 tarjetas grandes por reto");
assert(reto(n34, "establo").opciones.join() === "vaca,perro" && reto(n34, "establo").correcto === "vaca", "reto 1: vaca / perro; suena el mugido");
assert(reto(n34, "establo").esperaToque === true, "reto 1: el niño toca la bocina para oír el sonido secreto");
assert(reto(n34, "establo").escena === "granja", "reto 1: cerca de madera de la granja");
assert(reto(n34, "cocina").opciones.join() === "llave,despertador" && reto(n34, "cocina").correcto === "llave", "reto 2: llave de agua / despertador");
assert(config.elementos.llave.sonido === "grifo" && config.elementos.llave.fotogramas.length === 1, "reto 2: agua corriendo y la llave se abre");
assert(reto(n34, "calle").opciones.join() === "ambulancia,tractor" && reto(n34, "calle").correcto === "ambulancia", "reto 3: ambulancia / tractor");
assert(config.elementos.ambulancia.sonido === "sirena" && config.elementos.ambulancia.fotogramas.length === 1, "reto 3: sirena y luz de emergencia");
assert(n34.concierto.tipo === "bosque", "cierre: concierto del bosque");
assert(L.elementosConcierto(n34).join() === "vaca,llave,ambulancia", "el concierto une la vaca, la llave y la ambulancia");
assert(n34.insignia.img.includes("superoyente"), "medalla Superoyente Musical");

console.log("=== 5-6 años ===");
assert(n56.retos.length === 3, "3 retos");
assert(n56.retos.every((r) => r.opciones.length >= 3 && r.opciones.length <= 4), "3 a 4 tarjetas por reto");
const ciudad = reto(n56, "gran-ciudad");
assert(ciudad.opciones.join() === "tren,bomberos,policia" && ciudad.correcto === "tren", "reto 1: tren / bomberos / policía");
assert(L.capasDe(ciudad, config.elementos).map((c) => c.sonido).join() === "tren,campanaCruce", "reto 1: rieles + campana de cruce (audición por capas)");
const noche = reto(n56, "bosque-nocturno");
assert(noche.opciones.join() === "buho,lobo,rana" && noche.correcto === "buho" && noche.escena === "noche", "reto 2: búho / lobo / rana en modo nocturno");
assert(config.elementos.buho.fotogramas.length === 1, "reto 2: los ojos del búho se iluminan");
const tormenta = reto(n56, "tormenta");
const capasTormenta = L.capasDe(tormenta, config.elementos);
assert(tormenta.opciones.join() === "trueno,lluvia,mar" && tormenta.correcto === "trueno", "reto 3: trueno / lluvia / mar");
assert(capasTormenta.map((c) => c.sonido).join() === "viento,trueno", "reto 3: viento + trueno mezclados");
assert(capasTormenta[1].principal && capasTormenta[1].retrasoMs > 0, "reto 3: el trueno retumba al final");
assert(n56.concierto.tipo === "mezcla", "cierre: consola maestra que arma el niño");
assert(L.elementosConcierto(n56).join() === "tren,buho,trueno", "la mezcla final usa el tren, el búho y el trueno");
assert(n56.insignia.img.includes("maestro") && n56.insignia.sonido === "aplausos", "medalla de oro Maestro del Audio");

console.log("=== Lógica ===");
assert(L.capasDe({ correcto: "vaca" }, config.elementos).map((c) => c.sonido).join() === "mugido", "sin capas: suena el elemento correcto");
assert(L.normalizarActivas([{}, {}], [false, false]).join() === "true,true", "todas las pistas apagadas: se encienden al escuchar");
assert(L.normalizarActivas([{}, {}], [true, false]).join() === "true,false", "se respeta la pista pausada");
assert(L.objetivoAudible(capasTormenta, [true, false]) === false && L.objetivoAudible(capasTormenta, [false, true]) === true, "objetivoAudible mira la capa principal");
const rect = { left: 100, right: 200, top: 100, bottom: 200 };
assert(L.soltoSobre({ x: 150, y: 150 }, rect) && L.soltoSobre({ x: 230, y: 150 }, rect, 40) && !L.soltoSobre({ x: 260, y: 150 }, rect, 40), "soltoSobre con margen");
const prog = L.programaConcierto(["a", "b", "c"], { bpm: 120, compases: 2 });
assert(prog.pulsoMs === 500 && prog.tiempos === 4 && prog.golpes.length === 8 && prog.duracionMs === 4000, "programaConcierto: 2 compases de 4 tiempos");
assert(prog.golpes.map((g) => g.id || "*").join("") === "abc*abc*", "un elemento por tiempo y el último de todos");
assert(L.mezclar([1, 2, 3], () => 0).sort().join() === "1,2,3", "mezclar conserva los elementos");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), "imagen de " + id + " existe");
  (e.fotogramas || []).forEach((f) => assert(fs.existsSync(path.join(dir, f)), "fotograma de " + id + " existe: " + f));
  if (e.sonido) assert(Sfx.ESTIMULOS.includes(e.sonido), "sonido sintetizado de " + id + " (" + e.sonido + ")");
});
Object.entries(config.escenas).forEach(([id, src]) => assert(fs.existsSync(path.join(dir, src)), "escena " + id + " existe"));
config.niveles.forEach((n) => {
  assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de la medalla existe");
  n.retos.forEach((r) => L.capasDe(r, config.elementos).forEach((c) => assert(Sfx.ESTIMULOS.includes(c.sonido), r.id + ": capa " + c.sonido + " sintetizada")));
});
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
const cfgTxt = JSON.stringify(config);
const imagenes = [];
(function recorrer(rel) {
  fs.readdirSync(path.join(dir, rel)).forEach((f) => {
    const r = rel + "/" + f;
    if (fs.statSync(path.join(dir, r)).isDirectory()) recorrer(r);
    else imagenes.push(r);
  });
})("img");
imagenes.forEach((ref) => {
  assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref) || css.includes(ref), ref + " se usa (sin imágenes huérfanas)");
  if (ref.endsWith(".svg")) {
    let valido = true;
    try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, ref))); } catch (e) { valido = false; }
    assert(valido, ref + " es UTF-8 válido (si no, el navegador no lo dibuja)");
  }
});
["pop", "recompensa", "celebracion", "chispas", "zumbido", "gota", "silbato", "rayo", "bombo", "caja", "platillo"].concat(config.niveles.map((n) => n.insignia.sonido))
  .forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e + " existe en sfx"));
assert(!/<span[^>]*btn-empecemos-texto/.test(html), "botón de inicio solo con icono (sin texto)");
assert(html.includes('id="btn-escaner"') && html.includes('id="consola"') && html.includes('id="pistas"'), "bocina y consola de mezclas en el HTML");
assert(!/\.destello\b/.test(css.replace(/destello-pantalla/g, "")), "sin la clase .destello (choca con final.css)");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["3-4 con 4 tarjetas", (c) => { c.niveles[0].retos[0].opciones.push("tractor", "lobo"); }],
  ["5-6 con 2 tarjetas", (c) => { c.niveles[1].retos[0].opciones = ["tren", "bomberos"]; }],
  ["opción inexistente", (c) => { c.niveles[0].retos[0].opciones[1] = "dragon"; }],
  ["correcto fuera de opciones", (c) => { c.niveles[0].retos[1].correcto = "vaca"; }],
  ["sin voz de error", (c) => { delete c.niveles[0].retos[2].error; }],
  ["capa principal ajena al correcto", (c) => { c.niveles[1].retos[0].capas[0].sonido = "trueno"; }],
  ["dos capas principales", (c) => { c.niveles[1].retos[2].capas[0].principal = true; }],
  ["escena inexistente", (c) => { c.niveles[0].retos[1].escena = "playa"; }],
  ["demo usa un elemento de un reto", (c) => { c.demo.elemento = "vaca"; }],
  ["sin medalla", (c) => { delete c.niveles[1].insignia; }],
  ["efecto cambiado", (c) => { c.niveles[1].retos[1].acierto.efecto = "rayo"; }],
  ["voz inválida", (c) => { c.niveles[0].retos[0].acierto.voz = "max"; }],
  ["un reto de más", (c) => { c.niveles[0].retos.push(JSON.parse(JSON.stringify(c.niveles[0].retos[0]))); }],
  ["concierto sin ritmo", (c) => { delete c.niveles[0].concierto.bpm; }],
  ["elemento del concierto sin sonido", (c) => { delete c.elementos.ambulancia.sonido; }],
];
casos.forEach(([nombre, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
