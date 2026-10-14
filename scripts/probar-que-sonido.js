/**
 * Pruebas de ¿Qué sonido escuchas?: config alineada al documento + reglas de los retos.
 * Uso: node scripts/probar-que-sonido.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/QueSonidoEscuchas");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.QueSonidoLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.QueSonidoSfx;
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

/** Compara sin tildes, signos ni mayúsculas (el documento escribe "¡Si, ...", "MUY BIEN"). */
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
assert(!config.stub, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(n34.titulo === "Los detectives de los sonidos" && n56.titulo === n34.titulo, "nombre del juego del documento en ambos niveles");

console.log("=== Textos literales del documento ===");
config.niveles.forEach((n) => {
  n.bienvenida.forEach((l) => assert(enDoc(l.texto), n.edad + " bienvenida en el documento: " + l.texto));
  assert(enDoc(n.cierre.texto), n.edad + " cierre en el documento: " + n.cierre.texto);
  n.retos.forEach((r) => {
    if (r.acierto.texto) assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto en el documento: " + r.acierto.texto);
    if (r.error && r.id !== "que-sonido") assert(enDoc(r.error.texto), n.edad + " " + r.id + " error en el documento: " + r.error.texto);
  });
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");
assert(n34.bienvenida[0].personaje === 1 && n34.bienvenida[1].personaje === 0, "3-4: saluda Zoe y sigue Zeus");
assert(n56.bienvenida[0].personaje === 1 && n56.bienvenida[1].personaje === 0, "5-6: saluda Zoe y sigue Zeus");

console.log("=== 3-4 años ===");
assert(reto(n34, "animales").opciones.join() === "perro,gato,pajaro" && reto(n34, "animales").correcto === "perro", "reto 1: perro, gato, pájaro; suena el ladrido");
assert(reto(n34, "animales").acierto.repetir === "breve", "reto 1: repite brevemente el sonido al acertar");
assert(reto(n34, "animales").error.voz === "zeus", "reto 1: Zeus dice 'Escucha otra vez'");
assert(reto(n34, "animales2").opciones.join() === "vaca,gato,gallo" && reto(n34, "animales2").correcto === "gato", "reto 2: vaca, gato, gallo; suena el maullido");
assert(reto(n34, "naturaleza").opciones.join() === "lluvia,mar,viento" && reto(n34, "naturaleza").correcto === "lluvia", "reto 3: lluvia, mar, viento; suena la lluvia");
assert(reto(n34, "objetos").opciones.join() === "campana,pelota,carro" && reto(n34, "objetos").correcto === "campana", "reto 4: campana, pelota, carro; suena la campana");
assert(reto(n34, "objetos").acierto.repetir === "lento" && reto(n34, "objetos").acierto.voz === "zeus", "reto 4: la campana suena lento y habla Zeus");
assert(reto(n34, "que-sonido").opciones.join() === "pajaro,carro,perro" && reto(n34, "que-sonido").correcto === "azar", "reto 5: pájaro, carro, perro; suena uno de los tres");
assert(!reto(n34, "que-sonido").acierto.texto, "reto 5: Zoe y Zeus celebran sin frase (el documento no da texto)");
assert(n34.retos.every((r) => r.error && r.error.voz === "zeus"), "3-4: todos los errores los dice Zeus (sin señal negativa)");
assert(n34.insignia.img.includes("detective"), "3-4: insignia de detective");

console.log("=== 5-6 años ===");
assert(n56.retos.map((r) => r.tipo).join() === "escuchar,escuchar,diferido,secuencia,diferido", "5 niveles de dificultad en orden");
assert(reto(n56, "que-sonido-es").correcto === "azar", "reto 1: suena uno de los tres");
assert(reto(n56, "similares").opciones.join() === "campana,triangulo,tambor", "reto 2: campana, triángulo, tambor");
assert(reto(n56, "escucha-recuerda").pausaMs === 2000 && reto(n56, "escucha-recuerda").recordar === true, "reto 3: pausa de ~2 s y hay que recordar");
const falta = reto(n56, "que-falta");
assert(falta.secuencia.join() === "perro,campana,pajaro" && falta.falta === 1, "reto 4: PERRO – CAMPANA – PÁJARO, falta la campana");
assert(falta.opciones.join() === "campana,gato,carro", "reto 4: opciones campana, gato, carro");
assert(L.secuenciaIncompleta(falta).join() === "perro,,pajaro", "reto 4: segunda escucha PERRO – PAUSA – PÁJARO");
const mision = reto(n56, "mision-final");
assert(mision.opciones.join() === "lluvia,mar,viento" && mision.correcto === "lluvia" && !mision.recordar, "reto 5: lluvia/mar/viento, suena la lluvia y se puede repetir");
assert(n56.retos.every((r) => !r.error), "5-6: el documento no da frases de error");
assert(n56.insignia.img.includes("experto") && n56.insignia.sonido === "aplausos", "5-6: insignia de experto con aplausos");

console.log("=== Lógica ===");
const r3 = { correcto: "azar", opciones: ["a", "b", "c"] };
assert(L.elegirCorrecto(r3, () => 0) === "a" && L.elegirCorrecto(r3, () => 0.99) === "c", "azar elige entre las opciones");
assert(L.elegirCorrecto({ correcto: "b", opciones: ["a", "b"] }, () => 0) === "b", "correcto fijo se respeta");
assert(L.puedeEscuchar({ recordar: true }, 0) === false && L.puedeEscuchar({ recordar: true }, 1) === true, "recordar: escuchar solo tras un error");
assert(L.puedeEscuchar({}, 0) === true, "sin recordar: escuchar siempre");
assert(L.mezclar([1, 2, 3], () => 0).sort().join() === "1,2,3", "mezclar conserva los elementos");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.sonidos).forEach(([id, s]) => {
  assert(fs.existsSync(path.join(dir, s.img)), "imagen de " + id + " existe");
  assert(Sfx.ESTIMULOS.includes(s.sonido), "sonido sintetizado de " + id + " (" + s.sonido + ")");
});
config.niveles.forEach((n) => assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de insignia existe"));
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref), ref + " se usa (sin imágenes huérfanas)");
  if (f.endsWith(".svg")) {
    let valido = true;
    try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, "img", f))); } catch (e) { valido = false; }
    assert(valido, ref + " es UTF-8 válido (si no, el navegador no lo dibuja)");
  }
});
const efectos = new Set(["pop", "suave", "recompensa", "chispas"]);
config.niveles.forEach((n) => {
  efectos.add(n.insignia.sonido);
  n.retos.forEach((r) => { if (r.acierto.sonido) efectos.add(r.acierto.sonido); });
});
efectos.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e + " existe en sfx"));
assert(!/<span[^>]*btn-empecemos-texto/.test(html), "botón de inicio solo con icono (sin texto)");
assert(html.includes("fa-ear-listen"), "elemento central de escucha en el inicio y el botón");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["4 imágenes", (c) => { c.niveles[0].retos[0].opciones.push("vaca"); }],
  ["opción inexistente", (c) => { c.niveles[0].retos[0].opciones[2] = "dragon"; }],
  ["correcto fuera de opciones", (c) => { c.niveles[0].retos[1].correcto = "perro"; }],
  ["3-4 sin voz de error", (c) => { delete c.niveles[0].retos[2].error; }],
  ["secuencia: falta no es el correcto", (c) => { c.niveles[1].retos[3].falta = 0; }],
  ["diferido sin pausa", (c) => { delete c.niveles[1].retos[2].pausaMs; }],
  ["demo usa un sonido de respuesta", (c) => { c.demo.sonido = "perro"; }],
  ["sin insignia", (c) => { delete c.niveles[1].insignia; }],
  ["tipo cambiado", (c) => { c.niveles[1].retos[3].tipo = "escuchar"; }],
  ["voz inválida", (c) => { c.niveles[0].retos[0].acierto.voz = "max"; }],
];
casos.forEach(([nombre, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
