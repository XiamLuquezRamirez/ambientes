/**
 * Pruebas de Suave o áspero: config alineada al documento + reglas de exploración, grietas y fricción.
 * Uso: node scripts/probar-suave-aspero.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/SuaveOAspero");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.SuaveAsperoLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.SuaveAsperoSfx;

let oks = 0;
let fails = 0;
function assert(cond, msg) {
  if (cond) oks += 1;
  else {
    fails += 1;
    console.error("  FAIL " + msg);
  }
}

const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const reto = (n, id) => n.retos.find((r) => r.id === id);
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
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  assert(js.includes(ref) || JSON.stringify(config).includes(ref), ref + " se usa (sin imágenes huérfanas)");
});

const sonidos = new Set();
config.niveles.forEach((n) => {
  n.retos.forEach((r) => sonidos.add(r.exploracion.sonido));
  n.destinos.forEach((d) => { if (d.sonido) sonidos.add(d.sonido); });
});
sonidos.add(config.demo.exploracion.sonido);
sonidos.forEach((s) => assert(Sfx.existe(s), "efecto " + s + " existe en sfx.js"));
(js.match(/efecto\("([a-z]+)"\)/g) || []).forEach((m) => {
  const nombre = m.slice(8, -2);
  assert(Sfx.existe(nombre), "efecto(\"" + nombre + "\") del script existe en sfx.js");
});

console.log("=== Documento 3-4 ===");
assert(n34.titulo === "El Clasificador Mágico: ¿Suave o Áspero?", "título 3-4");
assert(n34.destinos.map((d) => d.nombre).join("|") === "El Tobogán de la Suavidad|La Trampilla Áspera", "dos contenedores del documento");
assert(n34.retos.map((r) => r.material + ":" + r.correcta).join(",") === "peluche:suave,lija:aspero,algodon:suave", "3-4: peluche suave, lija áspera, algodón suave");
assert(reto(n34, "peluche").presentacion.texto === "¡Llegó un nuevo objeto! Antes de clasificarlo, pásale el dedo para probar su textura. ¿Se siente suave o áspero?", "presentación R1 literal");
assert(reto(n34, "peluche").acierto.texto === "¡Muy bien! El peluche tiene una textura suave y esponjosa.", "acierto R1 literal");
assert(reto(n34, "peluche").error.voz === "zeus" && reto(n34, "peluche").error.texto === "¡Uy! Este peluche no raspa para nada, ¡se siente tan blandito como una almohada!", "error R1: Zeus literal");
assert(reto(n34, "lija").presentacion.voz === "zeus" && reto(n34, "lija").presentacion.texto === "¡Cuidado con este material! Acarícialo con tu dedo... ¿Cómo se siente?", "presentación R2 Zeus literal");
assert(reto(n34, "lija").acierto.texto === "¡Genial! La lija es muy áspera y rasposa.", "acierto R2 literal");
assert(reto(n34, "lija").error.texto === "Parece ser que este material no es áspero y rasposo, intenta con otro", "error R2 literal");
assert(reto(n34, "lija").exploracion.gesto.voz === "zeus" && reto(n34, "lija").exploracion.gesto.gesto === "rascar", "Zeus se rasca con la lija");
assert(reto(n34, "algodon").presentacion.texto === "¡Mira este objeto blanco! Tócalo para probar su textura.", "presentación R3 literal");
assert(reto(n34, "algodon").acierto.texto === "¡Excelente! El algodón es súper suave.", "acierto R3 literal");
assert(reto(n34, "algodon").error === null && reto(n34, "algodon").rechazo === "expulsar", "R3: el documento no trae texto de error, solo expulsar flotando");
assert(reto(n34, "algodon").flota === true && reto(n34, "algodon").exploracion.tacto === "hundir", "R3: flota y se presiona");
assert(reto(n34, "peluche").rechazo === "rebote" && reto(n34, "lija").rechazo === "rebote", "R1 y R2 rebotan");
assert(n34.retos.map((r) => r.respuesta).join(",") === "camita,pulir,almohada", "respuestas 3-4: camita, pulir, almohada");
assert(n34.cierreEscena.tipo === "tubo" && n34.cierreEscena.titulo === "La Gran Prueba del Tubo Clasificador", "cierre: tubo clasificador");
assert(n34.premio.nombre === "Especialista en Texturas Suaves y Ásperas" && n34.premio.titulo === "Insignia", "insignia 3-4");

console.log("=== Documento 5-6 ===");
assert(n56.titulo === "Laboratorio de Análisis y Discriminación Táctil", "título 5-6");
assert(n56.retos.map((r) => r.material + ":" + r.correcta).join(",") === "peluche:suave,lija:aspero,algodon:suave,corteza:aspero", "5-6: 4 retos del documento");
assert(n56.destinos.map((d) => d.nombre).join("|") === "Suave|Áspero|Liso|Rugoso|Esponjoso", "las 5 opciones que nombra el audio del reto 1");
assert(reto(n56, "peluche").presentacion.texto.includes("entre las 5 opciones"), "el audio pide elegir entre 5 opciones");
assert(reto(n56, "peluche").acierto.texto === "¡Excelente análisis! El peluche tiene una textura suave.", "acierto R1 literal");
assert(reto(n56, "peluche").error.texto === "No parece ser suave esta textura, intenta con otro elemento", "error R1 literal");
assert(reto(n56, "lija").presentacion.texto === "¡Atención a la fricción de este material! Desliza tu dedo y analiza cómo reacciona la superficie.", "presentación R2 literal");
assert(reto(n56, "lija").exploracion.resistencia === true, "R2: resistencia de movimiento");
assert(reto(n56, "lija").error.texto === "Este material no parece ser áspero, intenta con otro", "error R2 literal");
assert(reto(n56, "algodon").acierto.texto === "¡Muy bien! El algodón tiene una textura suave.", "acierto R3 literal");
assert(reto(n56, "algodon").error.texto === "Este material no parece ser muy suave, intenta con otro", "error R3 literal");
assert(reto(n56, "corteza").presentacion.texto === "¡Examina la superficie del tronco! Toca sus bordes y grietas.", "presentación R4 literal");
assert(reto(n56, "corteza").exploracion.tacto === "grietas", "R4: recorrer las grietas");
assert(reto(n56, "corteza").acierto.texto === "¡Correcto! La corteza de árbol tiene una textura áspera.", "acierto R4 literal");
assert(n56.retos.every((r) => r.rechazo === "calibrar"), "5-6: onda de calibración amarilla al fallar");
assert(n56.retos.map((r) => r.presentacion.voz).join(",") === "zoe,zeus,zoe,zeus", "voces 5-6: Zoe, Zeus, Zoe, Zeus");
assert(n56.cierreEscena.tipo === "matriz" && n56.cierreEscena.titulo === "Matriz de Clasificación Completa", "Gran Cierre: matriz");
assert(n56.premio.nombre === "Científico Máster en Análisis de Texturas", "medalla 5-6");

console.log("=== Reglas ===");
assert(L.clasificarGesto(5, 5) === "toque", "toque corto");
assert(L.clasificarGesto(20, 0) === "arrastre", "deslizar");
assert(L.esCorrecta(reto(n34, "lija"), "aspero") && !L.esCorrecta(reto(n34, "lija"), "suave"), "lija → áspero");
assert(L.lineaError(reto(n34, "peluche"), "aspero") === reto(n34, "peluche").error, "error del reto al fallar");
assert(L.lineaError(reto(n34, "peluche"), "suave") === null, "la correcta no tiene error");
assert(L.lineaError(reto(n34, "algodon"), "aspero") === null, "algodón 3-4 falla sin texto");

const peinar = reto(n34, "peluche").exploracion;
assert(L.progresoExploracion(peinar, { recorrido: 0, ancho: 200 }) === 0, "sin frotar no se puede clasificar");
assert(L.progresoExploracion(peinar, { recorrido: 120, ancho: 200 }) < 1, "un roce corto no basta");
assert(L.progresoExploracion(peinar, { recorrido: 240, ancho: 200 }) === 1, "frotar 1.2 anchos habilita los contenedores");
assert(L.progresoExploracion(peinar, { recorrido: 0, ancho: 200, toques: 4 }) < 1, "cuatro toques no bastan para frotar");
assert(L.progresoExploracion(peinar, { recorrido: 0, ancho: 200, toques: 5 }) === 1, "tocar varias veces también explora");
assert(L.progresoExploracion(reto(n34, "algodon").exploracion, { toques: 1 }) === 1, "presionar el algodón una vez basta");
assert(L.progresoExploracion(reto(n34, "algodon").exploracion, { recorrido: 9999, ancho: 200 }) === 0, "frotar el algodón no cuenta: hay que presionarlo");

const puntos = L.muestrearGrietas(0.03);
const vis = {};
assert(L.marcarGrietas(vis, puntos, { x: 0.1, y: 0.1 }, 0.07) === 0, "tocar fuera de la grieta no marca");
L.GRIETAS[0].forEach((p) => L.marcarGrietas(vis, puntos, p, 0.07));
const parcial = L.fraccion(vis, puntos.length);
assert(parcial > 0.3 && parcial < 0.75, "recorrer una grieta marca una parte (" + parcial.toFixed(2) + ")");
const corteza = reto(n56, "corteza").exploracion;
assert(L.progresoExploracion(corteza, { grietas: parcial }) >= 0.6, "una grieta casi completa el recorrido");
L.GRIETAS[1].forEach((p) => L.marcarGrietas(vis, puntos, p, 0.07));
assert(L.progresoExploracion(corteza, { grietas: L.fraccion(vis, puntos.length) }) === 1, "recorrer las grietas habilita los módulos");

const suave = L.curvaFriccion("suave", 90, 0);
const aspero = L.curvaFriccion("aspero", 90, 0);
assert(suave.length === 90 && suave.every((v) => v >= -1 && v <= 1), "curva suave en rango");
assert(L.rugosidad(aspero) > L.rugosidad(suave) * 3, "la curva áspera es mucho más rasposa que la suave");
assert(L.rugosidad(L.curvaFriccion("calibracion", 90, 0)) < L.rugosidad(aspero), "la onda de calibración es suave");

const zonas = { suave: { left: 0, top: 500, width: 300, height: 200 }, aspero: { left: 340, top: 500, width: 300, height: 200 } };
assert(L.soltarEn({ x: 100, y: 600 }, zonas) === "suave", "soltar en el tobogán");
assert(L.soltarEn({ x: 500, y: 600 }, zonas) === "aspero", "soltar en la trampilla");
assert(L.soltarEn({ x: 320, y: 600 }, zonas) === null, "soltar entre contenedores no hace nada");

const roto = JSON.parse(JSON.stringify(config));
roto.niveles[0].retos[0].material = config.demo.material;
assert(L.validarConfig(roto).length > 0, "la demo no puede usar un material de reto real");
const roto2 = JSON.parse(JSON.stringify(config));
roto2.niveles[0].destinos.push({ id: "liso", nombre: "Liso" });
assert(L.validarConfig(roto2).length > 0, "el clasificador 3-4 solo tiene 2 contenedores");
const roto3 = JSON.parse(JSON.stringify(config));
roto3.niveles[1].retos[3].correcta = "rugoso";
assert(L.validarConfig(roto3).length > 0, "la correcta debe coincidir con la clase del material");
const cuatro = JSON.parse(JSON.stringify(config));
cuatro.niveles[1].destinos = cuatro.niveles[1].destinos.filter((d) => d.id !== "esponjoso");
assert(L.validarConfig(cuatro).length === 0, "también admite el panel de 4 módulos si se decide así");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
