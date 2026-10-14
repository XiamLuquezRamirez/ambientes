/**
 * Pruebas de Relaciona iguales: config alineada al documento + reglas de emparejamiento.
 * Uso: node scripts/probar-relaciona-iguales.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/RelacionaIguales");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.RelacionaIgualesLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.RelacionaIgualesSfx;

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
const nombres = (r) => r.opciones.map((m) => L.nombreEn(r, m, config.materiales)).join(", ");
const linea = (l, voz, texto) => !!l && l.voz === voz && l.texto === texto;
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
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  assert(js.includes(ref) || cfgTxt.includes(ref), ref + " se usa (sin imágenes huérfanas)");
});

const sonidos = new Set();
Object.values(config.materiales).forEach((m) => sonidos.add(m.sonido));
config.niveles.forEach((n) => n.retos.forEach((r) => {
  sonidos.add(r.unir.sonido);
  (r.errores || []).forEach((e) => { if (e.sonido) sonidos.add(e.sonido); });
}));
sonidos.add("devolver");
sonidos.forEach((s) => assert(Sfx.existe(s), "efecto " + s + " existe en sfx.js"));
(js.match(/efecto\("([a-z]+)"\)/g) || []).forEach((m) => {
  const nombre = m.slice(8, -2);
  assert(Sfx.existe(nombre), "efecto(\"" + nombre + "\") del script existe en sfx.js");
});

console.log("=== Documento 3-4 ===");
assert(n34.titulo === "El Espejo Mágico de Texturas Parecidas" && n34.escenario === "espejo", "título y escenario 3-4");
assert(n34.retos.map((r) => r.opciones.length).join(",") === "3,3,4,4", "R1-R2 con 3 opciones, R3-R4 con 4");

const a1 = reto(n34, "algodon");
assert(a1.titulo === "¡Buscando la Pareja Suave del Algodón!", "R1 título");
assert(a1.modelo === "algodon" && nombres(a1) === "Peluche, Piedra, Lija" && a1.correcto === "peluche", "R1: algodón → Peluche entre Piedra y Lija");
assert(linea(a1.presentacion, "zoe", "¡Bienvenido al Espejo Mágico! Mira el algodón... ¿Cuál de estos objetos se siente suave y mullidito como él?"), "R1 presentación Zoe literal");
assert(a1.unir.efecto === "estrellitas", "R1: el portal brilla con estrellitas");
assert(linea(a1.acierto, "zoe", "¡Muy bien! Algodón y Peluche tienen texturas semejantes."), "R1 acierto literal");
["piedra", "lija"].forEach((m) => {
  const e = L.errorPara(a1, m);
  assert(e.voz === "zeus" && e.texto === "¡Uy, esa piedra es muy dura! Escucha u observa nuevamente. ¡Inténtalo otra vez!", "R1 error Zeus literal para " + m);
  assert(e.efecto === "timbreDesafinado" && e.sonido === "boingclack", "R1: timbre desafinado ¡Boing-clack! con " + m);
});

const a2 = reto(n34, "lija");
assert(a2.titulo === "¡Buscando la Pareja Rasposa de la Lija!", "R2 título");
assert(L.nombreEn(a2, "lija", config.materiales) === "Hoja de lija", "R2 modelo: Hoja de Lija");
assert(nombres(a2) === "Pluma de ave, Corteza de árbol, Esponja" && a2.correcto === "corteza", "R2: lija → Corteza entre Pluma y Esponja");
assert(linea(a2.presentacion, "zeus", "¡Ojo con este material rasposo! Encuentra el objeto que tiene una textura parecida a la lija."), "R2 presentación Zeus literal");
assert(a2.unir.efecto === "polvillo", "R2: salta polvillo brillante");
assert(linea(a2.acierto, "zeus", "¡Muy bien! Lija y Corteza tienen texturas semejantes."), "R2 acierto literal");
assert(linea(L.errorPara(a2, "pluma"), "zoe", "¡Esa pluma es suavecita! La lija necesita algo que raspe. ¡Inténtalo otra vez!"), "R2 error de la pluma literal");

const a3 = reto(n34, "seda");
assert(a3.titulo === "¡Buscando la Pareja Delicada de la Seda!", "R3 título");
assert(L.nombreEn(a3, "seda", config.materiales) === "Manta de seda", "R3 modelo: Manta de Seda");
assert(nombres(a3) === "Piedra rugosa, Corteza de árbol, Tela suave, Lija" && a3.correcto === "tela", "R3: seda → Tela suave entre 4");
assert(linea(a3.presentacion, "zoe", "¡Subimos de nivel! Mira qué lisa y delicada es la seda. Encuentra el objeto que tiene una textura parecida a la seda."), "R3 presentación literal");
assert(a3.unir.efecto === "entrelazar", "R3: las telas se entrelazan");
assert(linea(a3.acierto, "zoe", "¡Muy bien! Seda y Tela suave tienen texturas semejantes."), "R3 acierto literal");
["piedra_rugosa", "lija"].forEach((m) => {
  const e = L.errorPara(a3, m);
  assert(e.voz === "zeus" && e.texto === "¡Ese objeto raspa o es muy duro! Busca otra tela que se sienta suave." && e.efecto === "vibraDetiene", "R3: el espejo vibra y detiene " + m);
});

const a4 = reto(n34, "vidrio");
assert(a4.titulo === "¡Buscando la Pareja Pulida del Vidrio!", "R4 título");
assert(L.nombreEn(a4, "vidrio", config.materiales) === "Bloque de vidrio transparente", "R4 modelo: Bloque de Vidrio Transparente");
assert(nombres(a4) === "Peluche, Piedra lisa, Copo de algodón, Lija" && a4.correcto === "piedra_lisa", "R4: vidrio → Piedra lisa entre 4");
assert(linea(a4.presentacion, "zeus", "¡Último reto de las parejas! El vidrio es duro, frío y muy liso. Encuentra el objeto que tiene una textura parecida al vidrio."), "R4 presentación literal");
assert(a4.unir.efecto === "brillan", "R4: ambos brillan");
assert(linea(a4.acierto, "zeus", "¡Muy bien! Vidrio y Piedra lisa tienen texturas semejantes."), "R4 acierto literal");
["peluche", "algodon"].forEach((m) => {
  const e = L.errorPara(a4, m);
  assert(e.voz === "zoe" && e.texto === "¡Ese objeto se hunde! El vidrio es duro y súper liso. ¡Inténtalo otra vez!" && e.efecto === "rebotaSinDeslizar", "R4: " + m + " rebota sin deslizar");
});

assert(n34.cierreEscena.tipo === "mural" && n34.cierreEscena.titulo === "El Gran Mural de las Parejas", "cierre: Gran Mural de las Parejas");
assert(L.parejas(n34).map((p) => p.modelo + "-" + p.pareja).join(",") === "algodon-peluche,lija-corteza,seda-tela,vidrio-piedra_lisa", "4 cuadrantes del mural");
assert(n34.cierre.texto === "¡Excelente! Relacionaste objetos con texturas semejantes.", "mensaje final 3-4 literal");
assert(n34.premio.nombre === "Maestro de las Semejanzas Sensoriales" && n34.premio.tipo === "medalla", "medalla Maestro de las Semejanzas Sensoriales");

console.log("=== Documento 5-6 ===");
assert(n56.titulo === "El Laboratorio de Texturas" && n56.escenario === "laboratorio", "título y escenario 5-6");
assert(n56.retos.every((r) => r.opciones.length === 5), "5 opciones en todos los retos");

const b1 = reto(n56, "algodon");
assert(b1.titulo === "Identificación de la Textura Muelle (Algodón)", "R1 5-6 título");
assert(nombres(b1) === "Peluche, Bola de nieve, Piedra blanca, Lija, Malla metálica" && b1.correcto === "peluche", "R1 5-6 opciones");
assert(linea(b1.presentacion, "zoe", "¡Hola, Científico Sensorial! Escaneamos el algodón: es suave y esponjoso. ¿Cuál de estos 5 objetos se siente con una textura semejante?"), "R1 5-6 presentación literal");
assert(b1.unir.efecto === "ondasSuaves", "R1 5-6: luz verde + ondas suaves");
assert(linea(b1.acierto, "zoe", "¡Muy bien! Algodón y Peluche tienen texturas semejantes."), "R1 5-6 acierto literal");
["bola_nieve", "piedra_blanca"].forEach((m) => {
  const e = L.errorPara(b1, m);
  assert(e.voz === "zeus" && e.texto === "¡Atención! Se parecen en el color, pero su textura táctil es distinta. Observa nuevamente. ¡Inténtalo otra vez!" && e.efecto === "luzAmarilla", "R1 5-6: luz amarilla con " + m);
});

const b2 = reto(n56, "lija");
assert(b2.titulo === "Identificación de la Textura Abrasiva (Lija)", "R2 5-6 título");
assert(nombres(b2) === "Hoja de papel bond, Corteza de árbol, Almohadilla de seda, Plástico de burbujas, Manzana" && b2.correcto === "corteza", "R2 5-6 opciones");
assert(linea(b2.presentacion, "zeus", "La lija tiene una superficie llena de diminutos granos que rascan. Encuentra el objeto que tiene una textura rugosa parecida a lija."), "R2 5-6 presentación literal");
assert(b2.unir.efecto === "crestas" && b2.unir.sonido === "crackzizz", "R2 5-6: crestas ¡Crack-zizz!");
assert(linea(b2.acierto, "zeus", "¡Muy bien! Lija y Corteza tienen texturas semejantes."), "R2 5-6 acierto literal");
assert(linea(L.errorPara(b2, "manzana"), "zoe", "¡Inténtalo otra vez!"), "R2 5-6 al elegir otro: Zoe");

const b3 = reto(n56, "seda");
assert(b3.titulo === "Identificación de la Textura Sedosa (Seda)", "R3 5-6 título");
assert(nombres(b3) === "Saco de yute, Tela suave, Papel de periódico, Corteza de árbol, Esponja de alambre" && b3.correcto === "tela", "R3 5-6 opciones");
assert(linea(b3.presentacion, "zoe", "La seda se desliza suavemente sin raspar. Encuentra el objeto que tiene una textura parecida a seda."), "R3 5-6 presentación literal");
assert(b3.unir.efecto === "deslizarTelas", "R3 5-6: las telas se deslizan");
assert(linea(b3.acierto, "zoe", "¡Muy bien! Seda y Tela suave tienen texturas semejantes."), "R3 5-6 acierto literal");
assert(linea(L.errorPara(b3, "saco_yute"), "zeus", "¡Inténtalo otra vez!"), "R3 5-6 al elegir otro: Zeus");

const b4 = reto(n56, "vidrio");
assert(b4.titulo === "Identificación de la Textura Pulida y Lisa (Vidrio)", "R4 5-6 título");
assert(L.nombreEn(b4, "vidrio", config.materiales) === "Panel de vidrio", "R4 5-6 modelo: Panel de Vidrio");
assert(nombres(b4) === "Cubito de hielo, Piedra lisa de río, Copo de algodón, Hoja seca, Lija" && b4.correcto === "piedra_lisa", "R4 5-6 opciones");
assert(linea(b4.presentacion, "zeus", "El vidrio es totalmente plano, firme y deslumbrante. Encuentra el objeto que tiene una textura parecida a vidrio."), "R4 5-6 presentación literal");
assert(b4.unir.efecto === "prisma" && b4.unir.sonido === "chimeglimmer", "R4 5-6: prisma ¡Chime-glimmer!");
assert(linea(b4.acierto, "zeus", "¡Muy bien! Vidrio y Piedra lisa tienen texturas semejantes."), "R4 5-6 acierto literal");
assert(linea(L.errorPara(b4, "hielo"), "zoe", "Buscamos algo firme y pulido como el vidrio. ¡Inténtalo otra vez!"), "R4 5-6 al elegir otro literal");

const b5 = reto(n56, "esponja");
assert(b5.titulo === "Identificación de la Textura Porosa y Flexible (Esponja)", "R5 5-6 título");
assert(L.nombreEn(b5, "esponja", config.materiales) === "Esponja de baño", "R5 5-6 modelo: Esponja de Baño");
assert(nombres(b5) === "Bloque de madera, Bloque de espuma, Piedra pómez, Vidrio, Pluma" && b5.correcto === "espuma", "R5 5-6 opciones");
assert(linea(b5.presentacion, "zoe", "Llegamos al último análisis. La esponja es blanda, llena de diminutos orificios y recupera su forma. Encuentra el objeto que tiene una textura parecida a esponja."), "R5 5-6 presentación literal");
assert(b5.unir.efecto === "compresion" && b5.unir.sonido === "squeezebounce", "R5 5-6: compresión ¡Squeeze-bounce!");
assert(linea(b5.acierto, "zoe", "¡Muy bien! Esponja y Espuma tienen texturas semejantes."), "R5 5-6 acierto literal");
assert(linea(L.errorPara(b5, "madera"), "zeus", "La esponja se puede apretar y es blanda. Observa nuevamente. ¡Inténtalo otra vez!"), "R5 5-6 al elegir otro");

assert(n56.cierreEscena.tipo === "tabla" && n56.cierreEscena.titulo === "La Tabla Periódica de Texturas", "cierre: Tabla Periódica de Texturas");
assert(L.parejas(n56).map((p) => p.categoria + ":" + p.modelo + "-" + p.pareja).join(",") ===
  "Muelle/Esponjoso:algodon-peluche,Rugoso/Áspero:lija-corteza,Sedoso/Suave:seda-tela,Pulido/Liso:vidrio-piedra_lisa,Poroso/Flexible:esponja-espuma", "categorías de la tabla periódica");
assert(n56.cierre.texto === "¡Excelente! Relacionaste objetos con texturas semejantes.", "mensaje final 5-6 literal");
assert(n56.premio.nombre === "Especialista en Análisis de Materiales" && n56.premio.tipo === "diploma", "diploma Especialista en Análisis de Materiales");
assert(n56.microscopio === true, "microscopio virtual");

console.log("=== Reglas ===");
assert(L.esCorrecto(a1, "peluche") && !L.esCorrecto(a1, "piedra"), "esCorrecto por reto");
assert(L.errorPara(a1, "peluche") === null, "la pareja correcta no tiene error");
const otro = L.errorPara(a2, "esponja");
assert(otro.texto === "¡Inténtalo otra vez!" && otro.efecto === "devolver" && otro.sonido === "devolver", "distractor no descrito: respuesta general y devolver");
assert(L.dentro({ x: 105, y: 50 }, { left: 0, top: 0, width: 100, height: 100 }, 10), "soltar con margen");
assert(!L.dentro({ x: 120, y: 50 }, { left: 0, top: 0, width: 100, height: 100 }, 10), "fuera del margen");
assert(L.clasificarGesto(5, 5) === "toque" && L.clasificarGesto(20, 0) === "arrastre", "toque vs arrastre");
const orden = L.mezclar(["a", "b", "c", "d"], () => 0);
assert(orden.slice().sort().join("") === "abcd" && orden.length === 4, "mezclar conserva los objetos");
L.mezclar(a1.opciones);
assert(a1.opciones.join() === "peluche,piedra,lija", "mezclar no altera la config");

console.log("=== Validador (casos negativos) ===");
let c = copia();
c.niveles[0].retos[0].opciones.push("pluma");
assert(L.validarConfig(c).some((e) => e.indexOf("3 opciones") !== -1), "R1 3-4 exige 3 opciones");
c = copia();
c.niveles[1].retos[0].correcto = "algodon";
assert(L.validarConfig(c).some((e) => e.indexOf("no está en pantalla") !== -1), "la pareja debe estar en pantalla");
c = copia();
c.niveles[1].retos[0].opciones[0] = "algodon";
c.niveles[1].retos[0].correcto = "algodon";
assert(L.validarConfig(c).some((e) => e.indexOf("sí mismo") !== -1), "el modelo no puede ser opción");
c = copia();
delete c.niveles[0].retos[1].errorOtro;
assert(L.validarConfig(c).some((e) => e.indexOf("esponja no tiene respuesta de error") !== -1), "todo distractor tiene respuesta");
c = copia();
c.niveles[0].retos[0].errores[0].efecto = "luzAmarilla";
assert(L.validarConfig(c).some((e) => e.indexOf("rechazo inválido") !== -1), "rechazo del laboratorio no vale en el espejo");
c = copia();
c.niveles[0].retos[0].errores[0].objetos.push("peluche");
assert(L.validarConfig(c).some((e) => e.indexOf("pareja correcta") !== -1), "no hay error para la pareja correcta");
c = copia();
c.niveles[1].retos[2].categoria = "";
assert(L.validarConfig(c).some((e) => e.indexOf("tabla periódica") !== -1), "el laboratorio exige categoría");
c = copia();
c.niveles[1].microscopio = false;
assert(L.validarConfig(c).some((e) => e.indexOf("microscopio") !== -1), "5-6 exige microscopio");
c = copia();
c.niveles[0].cierreEscena.tipo = "tabla";
assert(L.validarConfig(c).some((e) => e.indexOf("mural") !== -1), "3-4 exige el mural");
c = copia();
c.demo.modelo = "algodon";
assert(L.validarConfig(c).some((e) => e.indexOf("demostración") !== -1), "la demo no puede repetir un reto real");
c = copia();
c.materiales.vidrio.tacto = "brillante";
assert(L.validarConfig(c).some((e) => e.indexOf("tacto inválido") !== -1), "tacto fuera de catálogo");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
