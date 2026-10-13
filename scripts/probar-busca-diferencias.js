/**
 * Pruebas de Busca las diferencias: config alineada al documento + reglas de toque y escena.
 * Uso: node scripts/probar-busca-diferencias.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/BuscaLasDiferencias");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.BuscaDiferenciasLogica;
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
const centroDe = (escena, id) => L.centro(escena.elementos[id]);

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");

const imagenes = new Set();
Object.values(config.escenas).forEach((e) => {
  imagenes.add(e.fondo);
  Object.values(e.elementos).forEach((el) => imagenes.add(el.img));
});
config.niveles.forEach((n) => n.retos.forEach((r) => Object.values(r.cambiosB).forEach((img) => img && imagenes.add(img))));
imagenes.forEach((img) => assert(fs.existsSync(path.join(dir, img)), "existe " + img));

console.log("=== Textos del documento (3-4) ===");
const n34 = nivel("3-4 años");
assert(n34.titulo === "El Detective de Diferencias", "misión 3-4");
assert(n34.lupa.nombre === "Lupa Dúo" && n34.lupa.alTocar === true, "Lupa Dúo aparece al tocar");
assert(!n34.contador, "3-4 sin contador de hallazgos");
assert(n34.retos.map((r) => r.id).join("|") === "sol|flor|pelota", "orden de retos 3-4");
assert(reto(n34, "sol").presentacion.voz === "zoe" && reto(n34, "sol").presentacion.texto.startsWith("¡Alerta de detective! Mira el cielo en ambos lados."), "presentación sol");
assert(reto(n34, "sol").acierto.texto === "¡Excelente vista! En la imagen derecha no estaba el sol.", "acierto sol");
assert(reto(n34, "sol").descubrimiento === true, "el sol hace guiños al pasar la lupa");
assert(reto(n34, "flor").presentacion.voz === "zeus" && reto(n34, "flor").acierto.voz === "zeus", "Zeus presenta y celebra la flor");
assert(reto(n34, "flor").error.voz === "zoe", "Zoe corrige la flor");
assert(!!reto(n34, "flor").autoLupa, "la lupa se desliza sola en la flor");
assert(reto(n34, "pelota").objetivos[0].previo === "circuloVerificacion" && reto(n34, "pelota").objetivos[0].reaccion === "trompo", "pelota: círculo mágico y trompo");
assert(n34.premio.titulo === "Placa Mágica" && n34.premio.nombre === "Súper Detective de Diferencias", "placa 3-4");

console.log("=== Textos del documento (5-6) ===");
const n56 = nivel("5-6 años");
assert(n56.contador === 4, "contador con 4 ranuras");
assert(n56.retos.map((r) => r.id).join("|") === "sol|balon|flores|rama", "orden de retos 5-6");
assert(reto(n56, "sol").objetivos[0].previo === "target" && reto(n56, "sol").objetivos[0].reaccion === "rayo", "sol: target y rayo");
assert(reto(n56, "balon").objetivos[0].previo === "analisis", "balón: análisis espectral");
assert(reto(n56, "flores").objetivos.length === 2, "dos flores diferentes");
assert(reto(n56, "rama").objetivos.map((o) => o.reaccion).join("|") === "hojaViento|frutaCambia", "rama: hoja y fruta");
assert(reto(n56, "rama").acierto.texto === "¡Impresionante! Encontraste la hoja que faltaba en la rama y descubriste la fruta diferente.", "acierto rama");
assert(n56.premio.nombre === "Super Detective Máster de Análisis Visual", "insignia 5-6");

console.log("=== Contenido de las escenas ===");
const parque = config.escenas.parque;
const paisaje = config.escenas.paisaje;
const flores34 = Object.keys(parque.elementos).filter((k) => k.startsWith("flor_"));
assert(flores34.length === 3, "3 flores en A (3-4)");
const b34flor = L.elementosLado(parque, reto(n34, "flor"), "B", {});
assert(flores34.filter((k) => b34flor[k]).length === 2, "2 flores en B (3-4)");
const xs = flores34.map((k) => centroDe(parque, k).x).sort((a, b) => a - b);
assert(centroDe(parque, "flor_morada").x === xs[1], "falta la flor central");
const hojas = Object.keys(paisaje.elementos).filter((k) => k.startsWith("hoja_"));
const frutas = Object.keys(paisaje.elementos).filter((k) => k.startsWith("fruta_"));
assert(hojas.length === 5 && frutas.length === 3, "rama A: 5 hojas y 3 frutas");
const bRama = L.elementosLado(paisaje, reto(n56, "rama"), "B", {});
assert(hojas.filter((k) => bRama[k]).length === 4, "rama B: 4 hojas");
assert(frutas.filter((k) => bRama[k] !== paisaje.elementos[k].img).length === 1, "rama B: 1 fruta diferente");
const bFlores = L.elementosLado(paisaje, reto(n56, "flores"), "B", {});
assert(Object.keys(paisaje.elementos).filter((k) => k.startsWith("flor_")).length === 4, "arriate con 4 flores");
assert(Object.keys(bFlores).filter((k) => k.startsWith("flor_") && bFlores[k] !== paisaje.elementos[k].img).length === 2, "2 flores distintas en B");

console.log("=== Solo una diferencia por reto ===");
config.niveles.forEach((n) => {
  const escena = config.escenas[n.escena];
  n.retos.forEach((r) => {
    const a = L.elementosLado(escena, r, "A", {});
    const b = L.elementosLado(escena, r, "B", {});
    const distintos = Object.keys(a).filter((k) => a[k] !== b[k]);
    assert(distintos.length === r.objetivos.length, n.id + "/" + r.id + ": B solo difiere en sus objetivos");
    const todos = {};
    r.objetivos.forEach((o) => { todos[o.id] = true; });
    const bFinal = L.elementosLado(escena, r, "B", todos);
    assert(Object.keys(a).every((k) => a[k] === bFinal[k]), n.id + "/" + r.id + ": al resolver, A y B quedan idénticas");
  });
});

console.log("=== Toques ===");
const sol34 = reto(n34, "sol");
assert(L.objetivoEn(centroDe(parque, "sol"), parque, sol34, {}, n34.minimo) === "sol", "tocar el sol (A) o el cielo vacío (B) acierta");
assert(L.objetivoEn({ x: 60, y: 120 }, parque, sol34, {}, n34.minimo) === null, "tocar el árbol no acierta");
assert(L.objetivoEn(centroDe(parque, "sol"), parque, sol34, { sol: true }, n34.minimo) === null, "un objetivo encontrado no se repite");
const flor34 = reto(n34, "flor");
assert(L.objetivoEn(centroDe(parque, "flor_morada"), parque, flor34, {}, n34.minimo) === "flor", "tocar el hueco central acierta");
assert(L.objetivoEn(centroDe(parque, "flor_rosa"), parque, flor34, {}, n34.minimo) === null, "tocar la flor rosa no acierta");
assert(L.objetivoEn(centroDe(parque, "flor_roja"), parque, flor34, {}, n34.minimo) === null, "tocar la flor roja no acierta");
const flores56 = reto(n56, "flores");
["flor_1", "flor_3"].forEach((id) => assert(L.objetivoEn(centroDe(paisaje, id), paisaje, flores56, {}, n56.minimo) === null, id + " igual no acierta"));
["flor_2", "flor_4"].forEach((id) => assert(L.objetivoEn(centroDe(paisaje, id), paisaje, flores56, {}, n56.minimo) === id, id + " distinta acierta"));
const rama = reto(n56, "rama");
assert(L.objetivoEn(centroDe(paisaje, "hoja_2"), paisaje, rama, {}, n56.minimo) === "hoja", "hueco de la hoja acierta");
assert(L.objetivoEn(centroDe(paisaje, "fruta_3"), paisaje, rama, {}, n56.minimo) === "fruta", "fruta diferente acierta");
["hoja_4", "fruta_1", "fruta_2"].forEach((id) => assert(L.objetivoEn(centroDe(paisaje, id), paisaje, rama, {}, n56.minimo) === null, id + " igual no acierta"));
assert(!L.retoCompleto(rama, { hoja: true }) && L.retoCompleto(rama, { hoja: true, fruta: true }), "la rama exige hoja y fruta");

console.log("=== Gestos, coordenadas y lupa ===");
assert(L.clasificarGesto(5, 6) === "toque" && L.clasificarGesto(20, 0) === "arrastre", "toque vs arrastre");
const rect = { left: 100, top: 50, width: 800, height: 600 };
const p = L.puntoEscena(500, 350, rect);
assert(p.x === 200 && p.y === 150, "pantalla a escena");
const fuera = L.puntoEscena(0, 9999, rect);
assert(fuera.x === 0 && fuera.y === 300, "punto acotado a la escena");
assert(L.zoomLupa(centroDe(paisaje, "hoja_2"), n56, rama) === 3, "el visor amplifica en la rama");
assert(L.zoomLupa({ x: 100, y: 240 }, n56, rama) === n56.lupa.zoom, "zoom normal fuera de la rama");
const z = L.zonaTactil({ x: 10, y: 10, w: 20, h: 20 }, 40);
assert(z.x === 0 && z.w === 40 && z.y === 0, "zona táctil mínima centrada");

console.log("=== Demostración ===");
const demo = config.demo;
const escenaDemo = config.escenas[demo.escena];
assert(!!escenaDemo && config.niveles.every((n) => n.escena !== demo.escena), "la demo usa una escena propia");
assert(["demostracion", "demostracionAcierto", "demostracionFin"].every((k) => !!config.textos[k]), "textos de la demo");
const objDemo = demo.reto.objetivos[0];
const imgDemo = escenaDemo.elementos[objDemo.elemento].img;
const imgsRetos = new Set();
config.niveles.forEach((n) => {
  Object.values(config.escenas[n.escena].elementos).forEach((el) => imgsRetos.add(el.img));
  n.retos.forEach((r) => Object.values(r.cambiosB).forEach((img) => img && imgsRetos.add(img)));
});
assert(!imgsRetos.has(imgDemo), "el objeto de la demo no aparece en ningún reto");
const bDemo = L.elementosLado(escenaDemo, demo.reto, "B", {});
assert(!bDemo[objDemo.elemento], "en la demo B no tiene el objeto");
assert(L.objetivoEn(L.centro(escenaDemo.elementos[objDemo.elemento]), escenaDemo, demo.reto, {}, n34.minimo) === objDemo.id, "tocar donde falta acierta en la demo");
const rotoDemo = JSON.parse(JSON.stringify(config));
rotoDemo.escenas[rotoDemo.demo.escena].elementos.mariposa.img = config.escenas.parque.elementos.sol.img;
assert(L.validarConfig(rotoDemo).some((e) => e.includes("aparece en un reto")), "detecta una demo que revela un reto");
const rotoDemo2 = JSON.parse(JSON.stringify(config));
rotoDemo2.demo.escena = "parque";
assert(L.validarConfig(rotoDemo2).length > 0, "detecta una demo con la escena de un nivel");

const roto = JSON.parse(JSON.stringify(config));
roto.niveles[0].retos[0].cambiosB.flor_rosa = null;
assert(L.validarConfig(roto).some((e) => e.includes("no se puede tocar")), "detecta diferencia sin objetivo");
const roto2 = JSON.parse(JSON.stringify(config));
roto2.niveles[1].retos.pop();
assert(L.validarConfig(roto2).length > 0, "detecta retos faltantes en 5-6");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
