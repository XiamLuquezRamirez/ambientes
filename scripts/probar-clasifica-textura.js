/**
 * Pruebas de Clasifica por textura: config alineada al documento + reglas de agrupación, desfile y pinza.
 * Uso: node scripts/probar-clasifica-textura.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/ClasificaPorTextura");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ClasificaTexturaLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ClasificaTexturaSfx;

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
const nombres = (lista) => lista.map((m) => config.materiales[m].nombre).join(", ");
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(!config.stub, "config sin stub");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(config.textos.conversacion.every((l) => l.personaje === 0 || l.personaje === 1), "conversación con personaje 0/1");

Object.entries(config.materiales).forEach(([id, m]) => {
  assert(fs.existsSync(path.join(dir, m.img)), "imagen de " + id + " existe");
});
n34.grupos.forEach((g) => assert(fs.existsSync(path.join(dir, g.img)), "imagen de la " + g.nombre + " existe"));
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  assert(js.includes(ref) || cfgTxt.includes(ref), ref + " se usa (sin imágenes huérfanas)");
});

const sonidos = new Set();
Object.values(config.materiales).forEach((m) => sonidos.add(m.sonido));
config.niveles.forEach((n) => {
  n.grupos.forEach((g) => { if (g.reaccion) sonidos.add(g.reaccion); });
  n.retos.forEach((r) => { sonidos.add(r.colocar.sonido); sonidos.add(r.rechazo.sonido); });
});
sonidos.forEach((s) => assert(Sfx.existe(s), "efecto " + s + " existe en sfx.js"));
(js.match(/efecto\("([a-z]+)"\)/g) || []).forEach((m) => {
  const nombre = m.slice(8, -2);
  assert(Sfx.existe(nombre), "efecto(\"" + nombre + "\") del script existe en sfx.js");
});

console.log("=== Documento 3-4 ===");
assert(n34.titulo === "Las Cestas Sensoriales: Clasifica por Textura", "título 3-4");
assert(n34.grupos.map((g) => g.nombre).join("|") === "Cesta Nube Suave|Cesta Roca Áspera", "cestas del documento");
assert(n34.grupos.find((g) => g.id === "nube").reaccion === "swooshfluff", "Cesta Nube suena ¡Swoosh-fluff!");
assert(n34.grupos.find((g) => g.id === "roca").reaccion === "clackcroc", "Cesta Roca suena ¡Clack-croc!");
assert(n34.retos.map((r) => r.grupo).join(",") === "nube,roca,nube", "R1 y R3 Cesta Nube, R2 Cesta Roca");
assert(n34.retos.map((r) => r.titulo).join("|") === "¡El Festín de la Cesta Nube!|¡La Colección de la Cesta Roca!|¡El Gran Granero de Texturas!", "títulos de los retos 3-4");

const r1 = reto(n34, "festin");
assert(nombres(r1.objetos) === "Algodón, Peluche, Seda, Lija", "R1 muestra Algodón, Peluche, Seda y Lija");
assert(nombres(r1.correctos) === "Algodón, Peluche, Seda", "R1: 3 suaves entre 4");
assert(r1.presentacion.voz === "zoe" && r1.presentacion.texto === "¡Hola! Vamos a llenar la Cesta Nube. Selecciona y lleva a la cesta todos los objetos que sean suaves. ¡Muy suaves!", "R1 presentación Zoe literal");
assert(r1.colocar.sonido === "dingfluff" && r1.colocar.efecto === "brillaSalta", "R1: brilla, salta dentro, ¡Ding-fluff!");
assert(r1.completo.voz === "zoe" && r1.completo.texto === "¡Muy bien! Clasificaste los objetos suaves.", "R1 completo literal");
assert(r1.rechazo.efecto === "rebote" && r1.rechazo.sonido === "boingrasc", "R1: rebota la lija ¡Boing-rasc!");
assert(r1.error.voz === "zeus" && r1.error.texto === "¡Uy! La lija raspa mucho, no encaja en la Cesta Nube. ¡Inténtalo otra vez!", "R1 error Zeus literal");

const r2 = reto(n34, "coleccion");
assert(nombres(r2.objetos) === "Lija, Corteza de árbol, Piedra rugosa, Algodón", "R2 muestra Lija, Corteza, Piedra rugosa y Algodón");
assert(nombres(r2.correctos) === "Lija, Corteza de árbol, Piedra rugosa", "R2: 3 ásperos entre 4");
assert(r2.presentacion.voz === "zeus" && r2.presentacion.texto === "¡Ahora necesitamos construir una colección rústica! Selecciona todos los objetos ásperos y rugosos.", "R2 presentación Zeus literal");
assert(r2.colocar.sonido === "clackcroc" && r2.colocar.efecto === "destellosVerdes", "R2: ¡Clack-croc! y destellos verdes");
assert(r2.completo.voz === "zeus" && r2.completo.texto === "¡Muy bien! Clasificaste los objetos ásperos.", "R2 completo literal");
assert(r2.rechazo.efecto === "flotar", "R2: el algodón sale flotando");
assert(r2.error.voz === "zoe" && r2.error.texto === "¡Ese algodón es demasiado blando y suave para esta cesta! Observa nuevamente. ¡Inténtalo otra vez!", "R2 error Zoe literal");

const r3 = reto(n34, "granero");
assert(nombres(r3.objetos) === "Esponja, Tela de algodón, Peluche, Corteza de árbol", "R3 muestra Esponja, Tela, Peluche y Corteza");
assert(nombres(r3.correctos) === "Esponja, Tela de algodón, Peluche", "R3: 3 suaves con distractor");
assert(r3.presentacion.voz === "zoe" && r3.presentacion.texto === "¡Último desafío! Selecciona y lleva al grupo de objetos suaves los que correspondan.", "R3 presentación literal");
assert(r3.colocar.sonido === "puffyay" && r3.colocar.efecto === "estrellasMulticolor", "R3: estrellitas multicolores ¡Puff-yay!");
assert(r3.completo.texto === "¡Muy bien! Clasificaste los objetos suaves.", "R3 completo literal");
assert(r3.rechazo.efecto === "vibraExpulsa", "R3: la cesta vibra y expulsa la corteza");
assert(r3.error.voz === "zeus" && r3.error.texto === "¡Esa corteza es áspera y rugosa! Prueba con otro objeto.", "R3 error Zeus literal");

assert(n34.cierreEscena.tipo === "desfile" && n34.cierreEscena.titulo === "Desfile Sensorial de Cestas", "cierre: desfile sensorial de cestas");
assert(n34.cierre.texto === "¡Excelente! Clasificaste los objetos según su textura.", "mensaje final 3-4 literal");
assert(n34.premio.nombre === "Gran Clasificador Sensorial" && n34.premio.tipo === "medalla", "medalla Gran Clasificador Sensorial");
assert(n34.celebracion === "baile", "Zoe y Zeus bailan");

console.log("=== Documento 5-6 ===");
assert(n56.titulo === "La Estación de Clasificación de Materiales", "título 5-6");
assert(n56.grupos.map((g) => g.nombre).join("|") === "Módulo Suave|Módulo Áspero|Módulo Liso|Módulo Rugoso", "4 módulos del documento");
assert(n56.grupos.map((g) => g.detalle).join("|") === "Cojín de aire flotante|Tolva abrasiva|Rampa de cristal|Trituradora de relieves", "detalle de cada módulo");
assert(n56.retos.map((r) => r.grupo).join(",") === "suave,aspero,liso,rugoso", "un reto por módulo, en orden");

const s1 = reto(n56, "suave");
assert(nombres(s1.objetos) === "Algodón, Peluche, Seda, Esponja, Lija", "R1 5-6: 5 objetos");
assert(s1.correctos.length === 4 && nombres(s1.correctos) === "Algodón, Peluche, Seda, Esponja", "R1 5-6: 4 entre 5");
assert(s1.presentacion.voz === "zoe" && s1.presentacion.texto.indexOf("¡Bienvenido a la Estación de Materiales!") === 0, "R1 5-6 presentación Zoe");
assert(s1.colocar.efecto === "absorber" && s1.colocar.sonido === "swooshding", "R1 5-6: absorbe, LED verde ¡Swoosh-ding!");
assert(s1.rechazo.efecto === "barreraRoja" && s1.rechazo.sonido === "rascboing", "R1 5-6: barrera roja ¡Rasc-boing!");
assert(s1.error.voz === "zeus" && s1.error.texto === "¡Cuidado! La lija es muy áspera para esta tolva. Escucha u observa nuevamente. ¡Inténtalo otra vez!", "R1 5-6 error Zeus literal");
assert(s1.completo.texto === "¡Muy bien! Clasificaste los objetos suaves.", "R1 5-6 completo literal");

const s2 = reto(n56, "aspero");
assert(nombres(s2.objetos) === "Lija, Corteza de árbol, Piedra rugosa, Cartón, Seda", "R2 5-6: 5 objetos");
assert(nombres(s2.correctos) === "Lija, Corteza de árbol, Piedra rugosa", "R2 5-6: 3 entre 5");
assert(s2.presentacion.voz === "zeus" && s2.presentacion.texto === "¡Hora de separar elementos de alta fricción! Selecciona y lleva al grupo de objetos ásperos todos los objetos ásperos.", "R2 5-6 presentación literal");
assert(s2.colocar.efecto === "triturar" && s2.colocar.sonido === "crocclack", "R2 5-6: tritura ¡Croc-clack!");
assert(s2.rechazo.efecto === "deslizarFuera", "R2 5-6: expulsa deslizando");
assert(s2.error.voz === "zoe" && s2.error.texto === "¡Ese material no raspa! El cartón es plano y la seda es suave. ¡Inténtalo otra vez!", "R2 5-6 error literal");
assert(s2.completo.texto === "¡Muy bien! Clasificaste los objetos ásperos.", "R2 5-6 completo literal");

const s3 = reto(n56, "liso");
assert(nombres(s3.objetos) === "Vidrio, Piedra lisa, Seda, Corteza de árbol, Lija", "R3 5-6: 5 objetos");
assert(nombres(s3.correctos) === "Vidrio, Piedra lisa, Seda", "R3 5-6: 3 entre 5");
assert(s3.deslizamiento === true, "R3 5-6: comprobación de deslizamiento");
assert(s3.presentacion.texto === "¡Atención! Buscamos objetos sin poros ni bultos. Selecciona y lleva al grupo de objetos lisos todos los objetos lisos.", "R3 5-6 presentación literal");
assert(s3.colocar.efecto === "rampa" && s3.colocar.sonido === "fiuuding", "R3 5-6: rampa ¡Fiiiiuuu-ding!");
assert(s3.rechazo.efecto === "frenoSeco" && s3.rechazo.sonido === "scratch", "R3 5-6: frena en seco ¡Scratch!");
assert(s3.error.voz === "zeus" && s3.error.texto === "¡Ese objeto tiene grumos o hendiduras! No se desliza de forma lisa. ¡Inténtalo otra vez!", "R3 5-6 error literal");
assert(s3.completo.texto === "¡Muy bien! Clasificaste los objetos lisos.", "R3 5-6 completo literal");

const s4 = reto(n56, "rugoso");
assert(nombres(s4.objetos) === "Corteza de árbol, Lija, Piedra rugosa, Vidrio, Seda", "R4 5-6: 5 objetos");
assert(nombres(s4.correctos) === "Corteza de árbol, Piedra rugosa, Lija", "R4 5-6: Corteza, Piedra rugosa y Lija");
assert(s4.presentacion.voz === "zeus" && s4.presentacion.texto === "¡Desafío final de precisión! Buscamos objetos con grietas y bordes desiguales. Selecciona y lleva al grupo de objetos rugosos todos los objetos rugosos.", "R4 5-6 presentación literal");
assert(s4.colocar.efecto === "escanear3d" && s4.colocar.sonido === "clackcrocding", "R4 5-6: escaneo 3D ¡Clack-croc-ding!");
assert(s4.rechazo.efecto === "reboteSuave", "R4 5-6: rebota suavemente");
assert(s4.error.voz === "zoe" && s4.error.texto === "¡Esa superficie es uniforme y plana! Observa nuevamente. ¡Inténtalo otra vez!", "R4 5-6 error literal");
assert(s4.completo.texto === "¡Muy bien! Clasificaste los objetos rugosos.", "R4 5-6 completo literal");

assert(!n56.cierreEscena, "5-6 sin desfile (el documento no lo pide)");
assert(n56.cierre.texto === "¡Excelente! Clasificaste los objetos según su textura.", "mensaje final 5-6 literal");
assert(n56.premio.nombre === "Ingeniero Junior de Discriminación Táctil" && n56.premio.tipo === "diploma", "diploma Ingeniero Junior");
assert(n56.celebracion === "confetiTexturas", "lluvia de confeti con texturas");

console.log("=== Reglas ===");
assert(L.esCorrecto(r1, "seda") && !L.esCorrecto(r1, "lija"), "esCorrecto por reto");
assert(L.lineaError(r1, "lija") === r1.error && L.lineaError(r1, "algodon") === null, "lineaError solo para el distractor");
assert(L.pendientes(r1, ["algodon"]).join(",") === "peluche,seda", "pendientes");
assert(!L.completo(r1, ["algodon", "peluche"]) && L.completo(r1, ["seda", "peluche", "algodon"]), "completo con los 3 en cualquier orden");
assert(L.completo(s1, ["algodon", "peluche", "seda", "esponja"]) && !L.completo(s1, ["algodon", "peluche", "seda"]), "R1 5-6 exige 4");
assert(L.soltarEn({ x: 105, y: 50 }, { a: { left: 0, top: 0, width: 100, height: 100 } }, 10) === "a", "soltar con margen");
assert(L.soltarEn({ x: 120, y: 50 }, { a: { left: 0, top: 0, width: 100, height: 100 } }, 10) === null, "fuera del margen");
assert(L.clasificarGesto(5, 5) === "toque" && L.clasificarGesto(20, 0) === "arrastre", "toque vs arrastre");

const orden = L.mezclar(["a", "b", "c", "d"], () => 0);
assert(orden.slice().sort().join("") === "abcd" && orden.length === 4, "mezclar conserva los objetos");
assert(L.mezclar(["a", "b"]) !== undefined && r1.objetos.join() === "algodon,peluche,seda,lija", "mezclar no altera la config");

const desfile = L.contenidoDesfile(n34);
assert(desfile.nube.join(",") === "algodon,peluche,seda,esponja,tela", "desfile Nube sin peluche repetido");
assert(desfile.roca.join(",") === "lija,corteza,piedra_rugosa", "desfile Roca");

const fr = (id) => L.friccionDe(config.materiales[id]);
assert(L.pulsoVibracion(fr("vidrio")) === 0, "vidrio no vibra");
assert(L.pulsoVibracion(fr("lija")) > L.pulsoVibracion(fr("peluche")) && L.pulsoVibracion(fr("peluche")) > 0, "la lija vibra más que el peluche");
assert(L.amplitudVibracion(fr("lija")) > L.amplitudVibracion(fr("seda")), "amplitud visual según fricción");
s3.correctos.forEach((m) => assert(L.tramoTropiezo(fr(m)) === 0, m + " patina uniforme en la rampa"));
s3.objetos.filter((m) => s3.correctos.indexOf(m) === -1).forEach((m) => assert(L.tramoTropiezo(fr(m)) > 0, m + " tropieza (no se desliza liso)"));

console.log("=== Validador (casos negativos) ===");
let c = copia();
c.niveles[0].retos[0].correctos.push("lija");
assert(L.validarConfig(c).some((e) => e.indexOf("lija no es suave") !== -1), "rechaza un distractor marcado como correcto");
c = copia();
c.niveles[1].retos[1].correctos = ["lija", "corteza"];
assert(L.validarConfig(c).some((e) => e.indexOf("también es aspero") !== -1), "rechaza olvidar un correcto");
c = copia();
c.niveles[0].retos[0].objetos.pop();
assert(L.validarConfig(c).some((e) => e.indexOf("4 objetos") !== -1), "3-4 exige 4 objetos");
c = copia();
c.niveles[1].retos[0].objetos.push("pluma");
assert(L.validarConfig(c).some((e) => e.indexOf("demostración") !== -1), "la pluma de la demo no puede ser reto");
c = copia();
c.niveles[1].grupos.pop();
assert(L.validarConfig(c).some((e) => e.indexOf("grupos deben ser") !== -1), "5-6 exige los 4 módulos");
c = copia();
c.niveles[0].retos[1].error = null;
assert(L.validarConfig(c).some((e) => e.indexOf("error incompleto") !== -1), "todos los retos traen error");
c = copia();
c.niveles[0].cierreEscena = null;
assert(L.validarConfig(c).some((e) => e.indexOf("desfile") !== -1), "3-4 exige el desfile");
c = copia();
c.niveles[1].retos[2].rechazo.efecto = "rebote";
assert(L.validarConfig(c).some((e) => e.indexOf("rechazo inválido") !== -1), "rechazo de 3-4 no vale en la estación");
c = copia();
c.materiales.vidrio.friccion = 2;
assert(L.validarConfig(c).some((e) => e.indexOf("fricción") !== -1), "fricción fuera de rango");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
