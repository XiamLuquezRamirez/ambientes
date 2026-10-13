/**
 * Pruebas de Encuentra la textura: config alineada al documento + reglas de tacto, frotado y relleno.
 * Uso: node scripts/probar-encuentra-textura.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/EncuentraLaTextura");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.EncuentraTexturaLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

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

Object.entries(config.materiales).forEach(([id, m]) => {
  assert(fs.existsSync(path.join(dir, m.img)), "imagen de " + id + " existe");
});
["coco", "coco_mitad", "pieza_madera", "pieza_madera_pulida", "nube_feliz", "caja_cuerpo", "caja_tapa", "sillon", "cojin", "mesa", "mapa_tesoro", "pintura_vieja", "corteza_crayon"].forEach((f) => {
  assert(fs.existsSync(path.join(dir, "img", f + ".svg")), "escena img/" + f + ".svg existe");
});
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  const usado = js.includes(ref) || JSON.stringify(config).includes(ref);
  assert(usado, ref + " se usa (sin imágenes huérfanas)");
});

console.log("=== Documento 3-4 ===");
assert(n34.titulo === "El Mundo Sensorial de las Texturas", "título 3-4");
assert(n34.retos.map((r) => r.correcta).join(",") === "algodon,lija,piedra_lisa", "3-4: algodón, lija, piedra lisa");
assert(reto(n34, "suave").muestras.slice().sort().join(",") === "algodon,lija,piedra", "R1: algodón, piedra, lija");
assert(reto(n34, "aspera").muestras.slice().sort().join(",") === "algodon,lija,peluche", "R2: lija, peluche, algodón");
assert(reto(n34, "lisa").muestras.slice().sort().join(",") === "esponja,lija,piedra_lisa", "R3: piedra lisa, lija, esponja");
assert(L.lineas(reto(n34, "suave").presentacion)[0].texto === "¡Hola, explorador! Vamos a usar la vista y las manos mágicas. ¿Cuál de estos objetos es suave, esponjoso y blando como un copo de algodón?", "presentación R1 literal");
assert(reto(n34, "suave").acierto.texto === "¡Muy bien! Tocaste el algodón. ¡Es súper suave y esponjoso!", "acierto R1 literal");
assert(reto(n34, "suave").errores.piedra.texto === "¡Uy! Esa piedra es muy dura y fría. ¡Busca el que es suave como una nube!", "error piedra literal");
assert(reto(n34, "aspera").errores.peluche.texto === "¡Ese peluche es muy blandito! Queremos algo áspero que rasque un poquito.", "error peluche literal");
assert(reto(n34, "lisa").errores.esponja.texto === "¡La esponja se hunde cuando la pisas! Queremos algo duro y lisito como la piedra del río.", "error esponja literal");
assert(L.lineas(reto(n34, "suave").presentacion)[0].voz === "zoe" && L.lineas(reto(n34, "aspera").presentacion)[0].voz === "zeus" && L.lineas(reto(n34, "lisa").presentacion)[0].voz === "zoe", "3-4: Zoe, Zeus, Zoe presentan");
assert(reto(n34, "lisa").zoeSostiene === "coco", "Zoe sostiene el coco");
assert(n34.premio.nombre === "Maestro Explorador de Texturas", "medalla 3-4");
assert(n34.cierreEscena.tipo === "caja", "cierre con la Caja Sensorial");

console.log("=== Documento 5-6 ===");
assert(n56.titulo === "El Taller de Restauración y Texturas", "título 5-6");
assert(n56.bloqueEnsayo === true, "panel de prueba táctil");
assert(n56.retos.map((r) => r.uso).join(",") === "rellenar,lijar,estampar", "5-6: rellenar, lijar, estampar");
assert(n56.retos.every((r) => r.muestras.length === 5), "cinta de 5 materiales");
["algodon", "lija", "piedra", "madera"].forEach((m) => assert(reto(n56, "sillon").muestras.includes(m), "sillón incluye " + m + " del documento"));
assert(reto(n56, "mesa").muestras.slice().sort().join(",") === "algodon,lija,madera_rugosa,seda,vidrio", "mesa: 5 opciones del documento");
assert(reto(n56, "corteza").muestras.slice().sort().join(",") === "algodon,corteza,madera_lisa,seda,vidrio", "corteza: 5 opciones del documento");
assert(reto(n56, "sillon").error.texto.startsWith("Elige algo suave y esponjoso"), "error sillón literal");
assert(reto(n56, "mesa").error.texto.startsWith("No creo que esa herramienta me ayude"), "error mesa literal");
assert(reto(n56, "corteza").error.texto.startsWith("Intenta con otra textura"), "error corteza literal");
assert(reto(n56, "sillon").acierto.voz === "zoe" && reto(n56, "mesa").acierto.voz === "zeus" && reto(n56, "corteza").acierto.voz === "zeus", "voces de acierto 5-6");
assert(n56.premio.nombre === "Master en Ciencias de los Materiales y Texturas", "medalla 5-6");
assert(n56.cierreEscena.titulo === "El Álbum de Restaurador", "Gran Cierre: El Álbum de Restaurador");

console.log("=== Reglas ===");
assert(L.clasificarGesto(5, 5) === "toque", "toque corto elige");
assert(L.clasificarGesto(20, 0) === "arrastre", "deslizar explora");
assert(L.lineaError(reto(n34, "suave"), "lija").texto.includes("lija"), "error específico de la lija");
assert(L.lineaError(reto(n34, "suave"), "algodon") === null, "la correcta no tiene error");
assert(L.lineaError(reto(n56, "mesa"), "seda") === reto(n56, "mesa").error, "5-6 usa el error del reto");
assert(L.gestoDe(config, "algodon", "zoe") === "acariciar", "suave → acariciar");
assert(L.gestoDe(config, "lija", "zoe") === "arrugar", "rasposo → arrugar la cara");
assert(L.gestoDe(config, "lija", "zeus") === "rascar", "Zeus se rasca con la lija");
assert(L.gestoDe(config, "piedra", "zeus") === "golpear", "duro → golpear suave");

const fijo = (() => { let s = 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
const mezcla = L.mezclar(["a", "b", "c", "d", "e"], fijo);
assert(mezcla.slice().sort().join("") === "abcde", "mezclar conserva las muestras");

const zonas = { objeto: { left: 100, top: 0, width: 400, height: 300 }, bloque: { left: 520, top: 0, width: 150, height: 300 } };
assert(L.soltarEn({ x: 200, y: 100 }, zonas) === "objeto", "soltar sobre el objeto");
assert(L.soltarEn({ x: 600, y: 100 }, zonas) === "bloque", "soltar sobre el bloque de ensayo");
assert(L.soltarEn({ x: 50, y: 100 }, zonas) === null, "soltar fuera no hace nada");

const celdas = {};
L.marcarTrazo(celdas, { x: 0, y: 50 }, { x: 400, y: 50 }, 30, 400, 200, 14, 7);
const parcial = L.cobertura(celdas, 14, 7);
assert(parcial > 0.1 && parcial < 0.5, "una pasada no basta para pulir (" + parcial.toFixed(2) + ")");
[100, 150, 190].forEach((y) => L.marcarTrazo(celdas, { x: 0, y: y }, { x: 400, y: y }, 30, 400, 200, 14, 7));
assert(L.cobertura(celdas, 14, 7) >= reto(n56, "mesa").usoMeta, "varias pasadas de lado a lado pulen la mesa");

assert(L.rellenoEscala(0, 6) === 0.3, "cojín empieza desinflado");
assert(L.rellenoEscala(3, 6) > 0.3 && L.rellenoEscala(3, 6) < 1, "cojín a medio inflar");
assert(L.rellenoEscala(6, 6) === 1, "cojín inflado completamente");

const coco = reto(n34, "lisa");
assert(L.debeAyudar(4, coco) === true, "a los 4 años el niño ayuda a partir el coco");
assert(L.debeAyudar(3, coco) === false, "a los 3 años Zoe parte el coco");
assert(L.debeAyudar(null, coco) === true, "vista previa (sin edad): se puede ayudar");

const roto = JSON.parse(JSON.stringify(config));
roto.niveles[0].retos[0].muestras.push(config.demo.muestra);
assert(L.validarConfig(roto).length > 0, "la demo no puede usar una muestra de reto real");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
