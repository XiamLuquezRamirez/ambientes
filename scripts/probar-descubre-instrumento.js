/**
 * Pruebas de Descubre el instrumento (Expresión Artística): config alineada al documento + reglas de los retos.
 * Uso: node scripts/probar-descubre-instrumento.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/DescubreElInstrumento");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.DescubreInstrumentoLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.DescubreInstrumentoSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");

let oks = 0;
let fails = 0;
function assert(cond, msg) {
  if (cond) oks += 1;
  else {
    fails += 1;
    console.error("  FAIL " + msg);
  }
}

/** Compara sin tildes, signos ni mayúsculas (el documento usa comillas sueltas y "BRAVO"). */
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc);
const enDoc = (texto) => docNorm.includes(norm(texto));

const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const reto = (n, tipo) => n.retos.find((r) => r.tipo === tipo);
const voces = (x) => L.lineas(x).map((l) => l.voz).join("+");
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.id + ":" + n.edad).join("|") === "3:3-4 años|5:5-6 años", "dos grupos: 3-4 (id 3) y 5-6 (id 5)");
assert(!config.stub, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(n34.tema === "tienda" && n56.tema === "teatro", "tienda de música (3-4) y teatro de ópera (5-6)");
assert(n34.retos.map((r) => r.tipo).join() === "caja,cuerdas,flauta,estuches", "3-4: caja, cuerdas, flauta y estuches en orden");
assert(n56.retos.map((r) => r.tipo).join() === "familias,duelo,director", "5-6: familias, duelo y director en orden");

console.log("=== Textos literales del documento ===");
const CLAVES = ["consigna", "revelar", "afinada", "secuenciaConsigna", "pregunta", "acierto", "error"];
config.niveles.forEach((n) => {
  n.retos.forEach((r) => {
    CLAVES.forEach((k) => L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k + " en el documento: " + l.texto)));
  });
  L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre en el documento: " + l.texto));
  assert(enDoc(n.insignia.nombre), n.edad + " medalla del documento: " + n.insignia.nombre);
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");

console.log("=== Voces según el documento ===");
const caja = reto(n34, "caja");
const cuerdas = reto(n34, "cuerdas");
const flauta = reto(n34, "flauta");
const estuches = reto(n34, "estuches");
assert([voces(caja.consigna), voces(caja.revelar), voces(caja.acierto)].join() === "zoe,zeus,zoe", "caja: Zoe presenta, Zeus revela, Zoe felicita");
assert([voces(cuerdas.consigna), voces(cuerdas.afinada), voces(cuerdas.acierto)].join() === "zeus,zoe,zeus", "cuerdas: Zeus, Zoe, Zeus");
assert([voces(flauta.consigna), voces(flauta.secuenciaConsigna), voces(flauta.acierto)].join() === "zoe,zeus,zoe+zeus", "flauta: Zoe, Zeus y al final Zoe y Zeus");
assert([voces(estuches.consigna), voces(estuches.acierto)].join() === "zeus,zoe+zeus", "estuches: Zeus y al final Zoe y Zeus");
const familias = reto(n56, "familias");
const duelo = reto(n56, "duelo");
const director = reto(n56, "director");
assert([voces(familias.consigna), voces(familias.acierto), voces(familias.error)].join() === "zoe,zoe,zeus", "familias: Zoe; el error lo dice Zeus");
assert([voces(duelo.consigna), voces(duelo.pregunta), voces(duelo.acierto), voces(duelo.error)].join() === "zeus,zeus,zeus,zoe", "duelo: Zeus pregunta y felicita, Zoe explica el error");
assert([voces(director.consigna), voces(director.acierto)].join() === "zoe,zoe+zeus", "director: Zoe y al final Zoe y Zeus");
config.niveles.forEach((n) => assert(voces(n.cierre) === "zoe+zeus", n.edad + ": cierre de Zoe y luego Zeus"));

console.log("=== 3-4 años ===");
assert(caja.instrumento === "tambor" && caja.golpes === 3, "caja sorpresa: aparece el tambor y se toca 3 veces");
assert(cuerdas.instrumento === "guitarra" && cuerdas.cuerdas.length >= 2 && cuerdas.rasgueos >= 1, "guitarra: cuerdas de colores y rasgueo");
assert(flauta.escena === "bosque", "flauta en el bosque soleado");
assert(flauta.tubos.map((t) => t.color).join() === "rojo,azul,amarillo,verde", "tubos rojo, azul, amarillo y verde");
assert(flauta.dormido === "rojo" && flauta.secuencia.join() === "azul,amarillo", "el rojo está dormido; luego azul y amarillo");
assert(flauta.tubos.slice(0, 3).map((t) => t.nota).join() === "do5,re5,mi5", "rojo suena Do, azul Re y amarillo Mi");
assert(estuches.instrumentos.join() === "tambor,guitarra,flautaTubos", "se guardan el tambor, la guitarra y la flauta");
assert(estuches.estuches.guitarra === "alargado" && estuches.estuches.tambor === "redondo" && estuches.estuches.flautaTubos === "tubos", "estuche alargado, caja redonda y estuche de tubos");
assert(n34.concierto.instrumentos.join() === "tambor,guitarra,flautaTubos", "la orquesta de la tienda: tambor, guitarra y flauta");
assert(n34.insignia.img.includes("explorador"), "medalla Pequeño Músico Explorador");

console.log("=== 5-6 años ===");
const inst = config.instrumentos;
assert(familias.zonas.join() === "cuerda,viento,percusion", "zonas de cuerda, viento y percusión");
const porFamilia = (f) => familias.instrumentos.filter((id) => L.familiaDe(inst, id) === f).sort().join();
assert(porFamilia("cuerda") === "guitarra,violin", "cuerdas: violín y guitarra");
assert(porFamilia("viento") === "flauta,trompeta", "viento: trompeta y flauta");
assert(porFamilia("percusion") === "platillos,tambor", "percusión: tambor y platillos");
assert(duelo.opciones.join() === "contrabajo,violin" && duelo.correcto === "contrabajo", "duelo: contrabajo (grave) contra violín (agudo)");
assert(director.secuencia.join() === "tambor,trompeta,violin", "director: tambor, trompeta y violín en orden");
assert(n56.concierto.instrumentos.length >= 6, "el gran concierto con toda la orquesta");
assert(n56.insignia.img.includes("director") && n56.insignia.sonido === "aplausos", "medalla de oro Director de Orquesta Maestro con aplausos");

console.log("=== Lógica ===");
assert(L.progresoDestape(0, 300, 1.6) === 0 && L.progresoDestape(240, 300, 1.6) === 0.5 && L.progresoDestape(999, 300, 1.6) === 1, "progresoDestape");
assert(L.largoTrazo([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }]) === 11, "largoTrazo");
assert(L.cuerdasCruzadas(0, 100, [20, 50, 80]).join() === "0,1,2" && L.cuerdasCruzadas(100, 0, [20, 50, 80]).join() === "2,1,0", "cuerdasCruzadas en los dos sentidos");
assert(L.cuerdasCruzadas(30, 60, [20, 50, 80]).join() === "1", "cuerdasCruzadas solo las atravesadas");
assert(L.esRasgueo([0, 1]) && !L.esRasgueo([1, 1]) && !L.esRasgueo([]), "esRasgueo exige dos cuerdas distintas");
assert(L.evaluarSecuencia(["a", "b"], 0, "a").estado === "bien" && L.evaluarSecuencia(["a", "b"], 1, "b").estado === "completa", "evaluarSecuencia en orden");
const fuera = L.evaluarSecuencia(["a", "b"], 0, "b");
assert(fuera.estado === "fuera" && fuera.esperado === "a", "evaluarSecuencia fuera de orden");
const rect = (l, t) => ({ left: l, top: t, right: l + 100, bottom: t + 100 });
assert(L.imanMasCercano({ x: 160, y: 50 }, [{ id: "a", rect: rect(0, 0) }, { id: "b", rect: rect(300, 0) }], 120) === "a", "imán: el más cercano dentro del radio");
assert(L.imanMasCercano({ x: 200, y: 50 }, [{ id: "a", rect: rect(0, 0) }], 90) === null, "imán: fuera del radio no atrae");
assert(L.dentro({ x: 110, y: 50 }, rect(0, 0), 16) && !L.dentro({ x: 130, y: 50 }, rect(0, 0), 16), "dentro con margen");
const cancion = { melodia: [["do5", 1], ["re5", 1], ["mi5", 2]], acordes: ["C", "G"], tiemposAcorde: 2 };
const arr = L.arreglo(["violin", "guitarra", "tambor", "contrabajo"], inst, cancion, { bpm: 120 });
const de = (id) => arr.eventos.filter((e) => e.id === id);
assert(arr.pulsoMs === 500 && arr.duracionMs === 2000, "arreglo: 4 tiempos a 120 bpm");
assert(de("violin").map((e) => e.notas[0] + "@" + e.t).join() === "do5@0,re5@500,mi5@1000", "arreglo: la melodía en su tiempo");
assert(de("guitarra").map((e) => e.tipo + "@" + e.t).join() === "acorde@0,acorde@1000", "arreglo: la guitarra rasguea el acorde");
assert(de("tambor").length === 4 && de("tambor")[0].fuerte && !de("tambor")[1].fuerte, "arreglo: el tambor marca cada tiempo, fuerte el primero");
assert(de("contrabajo").map((e) => e.notas[0]).join() === "do2,sol2", "arreglo: el contrabajo toca el bajo del acorde");
assert(L.lineas([{ voz: "zoe", texto: "a" }, { voz: "max", texto: "b" }]).length === 1 && L.lineas({ voz: "zeus", texto: "c" }).length === 1, "lineas acepta una o varias");

console.log("=== Imágenes y sonidos ===");
Object.entries(inst).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), "imagen de " + id + " existe");
  assert(Sfx.INSTRUMENTOS.includes(e.sonido), "sonido sintetizado de " + id + " (" + e.sonido + ")");
});
Object.entries(config.escenas).forEach(([id, src]) => assert(fs.existsSync(path.join(dir, src)), "escena " + id + " existe"));
config.niveles.forEach((n) => {
  assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de la medalla existe");
  const a = L.arreglo(n.concierto.instrumentos, inst, n.concierto.cancion, { bpm: n.concierto.bpm });
  a.eventos.forEach((e) => e.notas.forEach((nota) => assert(Sfx.NOTAS.includes(nota), n.edad + ": nota " + nota + " existe")));
  a.eventos.filter((e) => e.tipo !== "golpe").forEach((e) => assert(Sfx.VOCES.includes(inst[e.id].sonido), n.edad + ": " + e.id + " tiene voz para tocar notas"));
});
flauta.tubos.concat(flauta.melodia.map((n) => ({ nota: n }))).forEach((t) => assert(Sfx.NOTAS.includes(t.nota), "nota de la flauta " + t.nota + " existe"));
const efectosUsados = new Set();
js.replace(/efecto\("([a-zA-Z]+)"/g, (_, e) => efectosUsados.add(e));
js.replace(/efecto\(teatro \? "([a-zA-Z]+)" : "([a-zA-Z]+)"\)/g, (_, a, b) => { efectosUsados.add(a); efectosUsados.add(b); });
config.niveles.forEach((n) => efectosUsados.add(n.insignia.sonido));
assert(efectosUsados.size > 10, "se encontraron los efectos del script");
efectosUsados.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e + " existe en sfx"));
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
assert(!/<span[^>]*btn-empecemos-texto/.test(html), "botón de inicio solo con icono (sin texto)");
assert(html.includes('id="estacion"') && html.includes('id="concierto"'), "estación de prueba y concierto en el HTML");
assert(!/\.destello\b/.test(css), "sin la clase .destello (choca con final.css)");
assert(!/Font Awesome 6/.test(css), "sin depender del nombre de la fuente de Font Awesome en el CSS");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["reto cambiado de orden", (c) => { c.niveles[0].retos.reverse(); }],
  ["caja sin golpes", (c) => { delete c.niveles[0].retos[0].golpes; }],
  ["guitarra con una cuerda", (c) => { c.niveles[0].retos[1].cuerdas = ["#f00"]; }],
  ["flauta con 3 tubos", (c) => { c.niveles[0].retos[2].tubos.pop(); }],
  ["secuencia con el tubo dormido", (c) => { c.niveles[0].retos[2].secuencia = ["rojo", "azul"]; }],
  ["estuche con forma desconocida", (c) => { c.niveles[0].retos[3].estuches.tambor = "cuadrado"; }],
  ["zona sin instrumentos", (c) => { c.niveles[1].retos[0].instrumentos = c.niveles[1].retos[0].instrumentos.filter((id) => id !== "tambor" && id !== "platillos"); }],
  ["familias sin voz de error", (c) => { delete c.niveles[1].retos[0].error; }],
  ["duelo con el correcto fuera", (c) => { c.niveles[1].retos[1].correcto = "tambor"; }],
  ["director con 2 instrumentos", (c) => { c.niveles[1].retos[2].secuencia.pop(); }],
  ["demo usa un instrumento de un reto", (c) => { c.demo.instrumento = "tambor"; }],
  ["sin medalla", (c) => { delete c.niveles[1].insignia; }],
  ["voz inválida", (c) => { c.niveles[0].retos[0].consigna.voz = "max"; }],
  ["concierto sin canción", (c) => { delete c.niveles[0].concierto.cancion; }],
  ["instrumento sin familia", (c) => { c.instrumentos.violin.familia = "metal"; }],
  ["escena inexistente", (c) => { c.niveles[0].retos[2].escena = "playa"; }],
];
casos.forEach(([nombre, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
