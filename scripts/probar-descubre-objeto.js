/**
 * Pruebas de Descubre el objeto: config alineada al documento + reglas de respuesta, radar y limpieza.
 * Uso: node scripts/probar-descubre-objeto.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/DescubreElObjeto");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.DescubreObjetoLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.DescubreObjetoSfx;

let oks = 0;
let fails = 0;
function assert(cond, msg) {
  if (cond) oks += 1;
  else {
    fails += 1;
    console.error("  FAIL " + msg);
  }
}

const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const reto = (n, id) => n.retos.find((r) => r.id === id);
const nombres = (lista) => lista.map((o) => config.objetos[o].nombre).join(", ");
const error = (r, obj) => L.respuestaError(r, obj);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(!config.stub, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(config.textos.conversacion.every((l) => l.personaje === 0 || l.personaje === 1), "conversación con personaje 0/1");

Object.entries(config.objetos).forEach(([id, o]) => {
  assert(fs.existsSync(path.join(dir, o.img)), "imagen de " + id + " existe");
});
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref), ref + " se usa (sin imágenes huérfanas)");
});

const sonidos = new Set();
Object.values(config.objetos).forEach((o) => sonidos.add(o.sonido));
config.niveles.forEach((n) => n.retos.forEach((r) => {
  sonidos.add(r.acierto.sonido);
  (r.errores || []).forEach((e) => { if (e.sonido) sonidos.add(e.sonido); });
  if (r.limpiar) { sonidos.add(r.limpiar.sonido); sonidos.add(r.limpiar.revelado); }
}));
sonidos.forEach((s) => assert(Sfx.existe(s), "efecto " + s + " existe en sfx.js"));
(js.match(/efecto\("([a-z]+)"\)/g) || []).forEach((m) => {
  const nombre = m.slice(8, -2);
  assert(Sfx.existe(nombre), "efecto(\"" + nombre + "\") del script existe en sfx.js");
});

console.log("=== Documento 3-4 ===");
assert(n34.titulo === "La Caja Misteriosa de Texturas", "título 3-4");
assert(n34.escenario === "cofre", "3-4: cofre mágico");
assert(n34.retos.every((r) => r.titulo === "¡Descubre el objeto escondido!"), "títulos de los retos 3-4");
assert(n34.retos.every((r) => r.opciones.length === 4), "3-4: 4 tarjetas por reto");

const r1 = reto(n34, "oso");
assert(nombres(r1.opciones) === "Oso de peluche, Gato, Piedra, Lija", "R1 opciones del documento");
assert(r1.correcto === "oso", "R1: el oso de peluche es la respuesta");
assert(r1.ambiente === "tiembla", "R1: el cofre tiembla ligeramente");
assert(r1.pista.voz === "zoe" && L.textoPista(r1.pista) === "¡Escucha con atención! Es suave, tiene pelusitas y es un juguete. ¿Qué objeto es?", "R1 pista Zoe literal");
assert(r1.acierto.efecto === "salto" && r1.acierto.sonido === "tadaading", "R1: sale el osito de un salto ¡Tadaa-ding!");
assert(r1.acierto.voz === "zoe" && r1.acierto.texto === "¡Excelente! Descubriste el oso de peluche.", "R1 acierto literal");
assert(error(r1, "gato").efecto === "maulla" && error(r1, "gato").sonido === "miau", "R1: el gato maúlla ¡Miau!");
assert(error(r1, "gato").voz === "zeus" && error(r1, "gato").texto === "El gatito tiene pelo y es suave, ¡pero es un animalito vivo, no un juguete! Escucha u observa nuevamente. ¡Inténtalo otra vez!", "R1 error gato literal");
["piedra", "lija"].forEach((o) => {
  assert(error(r1, o).sonido === "toctoc", "R1: " + o + " → el cofre suena cerrado ¡Toc-toc!");
  assert(error(r1, o).voz === "zeus" && error(r1, o).texto === "Ese objeto no es suave... Observa nuevamente. ¡Inténtalo otra vez!", "R1 error " + o + " literal");
});

const r2 = reto(n34, "corteza");
assert(nombres(r2.opciones) === "Corteza, Seda, Vidrio, Algodón", "R2 opciones del documento");
assert(r2.ambiente === "hojas", "R2: nuevo cofre con hojas flotando");
assert(r2.pista.voz === "zeus" && L.textoPista(r2.pista) === "¡Abre bien las orejitas! Es áspera y proviene del tronco de un árbol. ¿Qué objeto es?", "R2 pista Zeus literal");
assert(r2.acierto.efecto === "hojitas" && r2.acierto.sonido === "crocyay", "R2: brotan hojitas ¡Croc-yay!");
assert(r2.acierto.voz === "zeus" && r2.acierto.texto === "¡Excelente! Descubriste la corteza.", "R2 acierto literal");
["seda", "algodon"].forEach((o) => {
  assert(error(r2, o).sonido === "grave", "R2: " + o + " → tono grave suave");
  assert(error(r2, o).voz === "zoe" && error(r2, o).texto === "¡Eso es muy suavecito! La pista dice que es áspera. ¡Inténtalo otra vez!", "R2 error " + o + " literal");
});
assert(error(r2, "vidrio").voz === "zoe" && error(r2, "vidrio").texto === "El vidrio es liso, no áspero. Escucha u observa nuevamente. ¡Inténtalo otra vez!", "R2 error vidrio literal");
assert(!error(r2, "vidrio").sonido, "R2 vidrio: el documento no pide sonido del cofre");

const r3 = reto(n34, "vidrio");
assert(nombres(r3.opciones) === "Vidrio, Lija, Peluche, Esponja", "R3 opciones del documento");
assert(r3.ambiente === "reflejos", "R3: el cofre brilla con reflejos");
assert(r3.pista.voz === "zoe" && L.textoPista(r3.pista) === "¡Última pista del cofre! Es liso, transparente y duro. ¿Qué objeto es?", "R3 pista literal");
assert(r3.acierto.efecto === "cristal" && r3.acierto.sonido === "chimeglimmer", "R3: destello cristalino ¡Chime-glimmer!");
assert(r3.acierto.texto === "¡Excelente! Descubriste el vidrio.", "R3 acierto literal");
assert(error(r3, "lija").sonido === "raspa" && error(r3, "lija").voz === "zeus", "R3: el cofre raspa con la lija");
assert(error(r3, "lija").texto === "La lija es áspera y no se puede ver a través de ella. ¡Inténtalo otra vez!", "R3 error lija literal");
["peluche", "esponja"].forEach((o) => {
  assert(error(r3, o).voz === "zeus" && error(r3, o).texto === "Buscamos algo duro y liso como el cristal. Escucha u observa nuevamente. ¡Inténtalo otra vez!", "R3 error " + o + " literal");
});

assert(n34.cierreEscena.tipo === "galeria", "cierre: galería de hallazgos");
assert(L.hallazgos(n34).join(",") === "oso,corteza,vidrio", "la repisa muestra oso, corteza y vidrio");
assert(n34.cierre.texto === "¡Excelente! Usaste las pistas de textura para descubrir los objetos.", "mensaje final literal");
assert(n34.premio.tipo === "medalla" && n34.premio.nombre === "Gran Detective de las Texturas", "medalla Gran Detective de las Texturas");

console.log("=== Documento 5-6 ===");
assert(n56.titulo === "El Radar del Detective Sensorial", "título 5-6");
assert(n56.luces.map((l) => l.nombre).join("|") === "Textura|Propiedad/origen|Uso/función", "3 luces del radar");

const s1 = reto(n56, "oso");
assert(s1.titulo === "Descifrando la pista del oso de peluche", "R1 5-6 título");
assert(nombres(s1.opciones) === "Oso de peluche, Copo de algodón, Piedra, Lija", "R1 5-6: 4 opciones");
assert(s1.pista.voz === "zoe" && L.textoPista(s1.pista) === "¡Atención, Detective! Primera pista: es suave, esponjoso y sirve para abrazar. ¿Qué objeto es?", "R1 5-6 pista sin las marcas de luz");
assert(L.partesPista(s1.pista).filter((p) => p.luz).map((p) => p.valor).join("|") === "Suave|Esponjoso|Sirve para abrazar", "R1 5-6: cada luz con su parte de la pista");
assert(s1.acierto.efecto === "abrazo" && s1.acierto.sonido === "triunfal", "R1 5-6: el oso abraza la pantalla con tono triunfal");
assert(s1.acierto.texto === "¡Excelente! Descubriste el oso de peluche.", "R1 5-6 acierto literal");
assert(error(s1, "copo_algodon").radar.join(",") === "ok,ok,casi", "algodón: 2 luces verdes y 1 amarilla");
assert(error(s1, "copo_algodon").voz === "zeus" && error(s1, "copo_algodon").texto === "¡Cerca! Es suave y esponjoso, pero recuerda la última pista: ¡sirve para abrazar como un juguete! Escucha u observa nuevamente. ¡Inténtalo otra vez!", "R1 5-6 error algodón literal");
["piedra", "lija"].forEach((o) => assert(error(s1, o).texto === "Este no parece ser suave y esponjoso, sigue buscando.", "R1 5-6 otro (" + o + ") literal"));

const s2 = reto(n56, "corteza");
assert(s2.titulo === "Descifrando la pista de la corteza", "R2 5-6 título");
assert(nombres(s2.opciones) === "Corteza, Madera lisa, Cartón, Seda, Vidrio", "R2 5-6: 5 opciones");
assert(s2.pista.voz === "zeus" && L.textoPista(s2.pista) === "Segunda pista del radar: es áspera, natural y cubre el tronco del árbol. ¿Qué objeto es?", "R2 5-6 pista literal");
assert(s2.acierto.efecto === "hojasMagicas" && s2.acierto.sonido === "crocleaf", "R2 5-6: hojas mágicas ¡Croc-leaf!");
assert(s2.acierto.voz === "zeus" && s2.acierto.texto === "¡Excelente! Descubriste la corteza.", "R2 5-6 acierto literal");
["madera_lisa", "carton"].forEach((o) => assert(error(s2, o).voz === "zoe" && error(s2, o).texto === "Tienen relación con los árboles, pero busca la capa áspera que está por FUERA del tronco. ¡Inténtalo otra vez!", "R2 5-6 error " + o + " literal"));
["seda", "vidrio"].forEach((o) => assert(error(s2, o).texto === "Sigue intentando, este no parece que sea el objeto que estamos buscando.", "R2 5-6 otro (" + o + ") literal"));

const s3 = reto(n56, "ventana");
assert(s3.tipo === "limpieza" && s3.titulo === "Laboratorio de limpieza y revelado táctil", "R3 5-6: laboratorio de limpieza");
assert(s3.consigna.voz === "zoe" && s3.consigna.texto === "Este objeto es liso y duro. Limpia el panel opaco frotando con tu dedo para descubrir qué hay detrás y comprobar si es transparente.", "R3 5-6 consigna literal");
assert(s3.limpiar.sonido === "schwik" && s3.limpiar.revelado === "glimmer", "R3 5-6: ¡Schwik-schwik-glimmer! al frotar");
assert(s3.pregunta.voz === "zeus" && s3.pregunta.texto === "¡Mira! Al limpiar la superficie lisa y dura, descubrimos que se puede ver la montaña del fondo... ¡Es transparente! ¿De qué material transparente está hecha esta ventana?", "R3 5-6 pregunta Zeus literal");
assert(nombres(s3.opciones) === "Piedra, Madera, Vidrio" && s3.correcto === "vidrio", "R3 5-6: 3 fichas Piedra, Madera, Vidrio");
assert(s3.acierto.efecto === "encaja", "R3 5-6: la ficha encaja en el marco");
["piedra", "madera"].forEach((o) => assert(error(s3, o).texto === "¡Ese material no deja pasar la luz! Recuerda que debe ser transparente como el que acabas de limpiar. ¡Inténtalo otra vez!", "R3 5-6 error " + o + " literal"));
assert(!n56.premio, "5-6 sin premio inventado (el documento no lo define)");

console.log("=== Reglas ===");
assert(L.esCorrecto(r1, "oso") && !L.esCorrecto(r1, "gato"), "esCorrecto");
assert(error(r1, "oso") === null, "la respuesta correcta no tiene error");
assert(L.clasificarGesto(5, 5) === "toque" && L.clasificarGesto(20, 0) === "arrastre", "toque vs arrastre");
assert(L.dentro({ x: 105, y: 50 }, { left: 0, top: 0, width: 100, height: 100 }, 10), "soltar con margen");
assert(!L.dentro({ x: 120, y: 50 }, { left: 0, top: 0, width: 100, height: 100 }, 10), "fuera del margen");
const orden = L.mezclar(["a", "b", "c", "d"], () => 0);
assert(orden.slice().sort().join("") === "abcd", "mezclar conserva las opciones");
assert(r1.opciones.join() === "oso,gato,piedra,lija", "mezclar no altera la config");
assert(L.fraccionLimpia([0, 0, 255, 255]) === 0.5, "fracción limpia del panel");
assert(L.fraccionLimpia([30, 255]) === 0.5 && L.fraccionLimpia([]) === 0, "polvo casi transparente cuenta como limpio");

console.log("=== Validador (casos negativos) ===");
let c = copia();
c.niveles[0].retos[0].opciones.pop();
assert(L.validarConfig(c).some((e) => e.indexOf("4 opciones") !== -1), "3-4 exige 4 opciones");
c = copia();
c.niveles[1].retos[1].opciones.pop();
assert(L.validarConfig(c).some((e) => e.indexOf("5 opciones") !== -1), "R2 5-6 exige 5 opciones");
c = copia();
c.niveles[0].retos[0].errores.pop();
assert(L.validarConfig(c).some((e) => e.indexOf("no tiene respuesta de error") !== -1), "cada distractor tiene respuesta");
c = copia();
c.niveles[0].retos[0].opciones[3] = "pluma";
assert(L.validarConfig(c).some((e) => e.indexOf("demostración") !== -1), "la pluma de la demo no puede ser reto");
c = copia();
c.niveles[1].retos[0].pista.partes[1].luz = "uso";
assert(L.validarConfig(c).some((e) => e.indexOf("3 luces") !== -1), "la pista enciende las 3 luces en orden");
c = copia();
c.niveles[1].retos[0].errores[0].radar = ["ok", "rojo", "casi"];
assert(L.validarConfig(c).some((e) => e.indexOf("radar inválido") !== -1), "estado del radar inválido");
c = copia();
c.niveles[1].premio = { titulo: "Diploma", nombre: "X", tipo: "diploma" };
assert(L.validarConfig(c).some((e) => e.indexOf("no define premio") !== -1), "no se inventa premio en 5-6");
c = copia();
c.niveles[0].cierreEscena = null;
assert(L.validarConfig(c).some((e) => e.indexOf("galería") !== -1), "3-4 exige la galería");
c = copia();
c.niveles[1].retos[2].pregunta = null;
assert(L.validarConfig(c).some((e) => e.indexOf("pregunta") !== -1), "el laboratorio exige la pregunta de Zeus");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
