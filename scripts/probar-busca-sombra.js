/**
 * Pruebas de Busca la sombra: config + reglas de gesto, pista y recorridos.
 * Uso: node scripts/probar-busca-sombra.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/BuscaLaSombra");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.BuscaSombraLogica;
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
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
Object.values(config.objetos).forEach((o) => {
  assert(fs.existsSync(path.join(dir, o.img)), "imagen existe: " + o.img);
  assert(fs.existsSync(path.join(dir, o.sombra)), "sombra existe: " + o.sombra);
});
const [n34, n56] = config.niveles;
assert(n34.retos.every((r) => r.sombras.length === 3), "3-4: tres sombras por reto");
assert(n56.retos.map((r) => r.sombras.length).join(",") === "5,5,4", "5-6: 5, 5 y 4 sombras (avión sin águila)");
assert(!n56.retos[2].sombras.includes("aguila"), "avión sin águila");
assert(n34.linterna && !n34.lupa && n56.lupa && !n56.linterna, "linterna en 3-4, lupa en 5-6");
assert(n34.pista.inactividadMs === 6000 && n34.pista.errores === 2, "pista 3-4: 6 s o 2 errores");
assert(n56.pista.errores === 2 && !n56.pista.inactividadMs, "pista 5-6: solo 2 errores");
assert(n56.retos[1].acierto.recompensa.tipo === "riel", "conejo: recorrido en riel tras el acierto");
assert(n56.retos[2].acierto.recompensa.tipo === "libre", "avión: vuelo libre tras el acierto");
assert(n34.retos[2].acierto.recompensa.tipo === "vuelo", "mariposa 3-4 vuela por el teatro");
assert(n34.retos[1].acierto.efecto === "faros", "carro enciende faros");
assert(Object.keys(n34.retos[1].animacionSombras).length === 3, "reto 2 de 3-4: las tres sombras se animan");

console.log("=== Gesto ===");
const g = (o) => L.clasificarGesto(o);
assert(g({ inicio: "pez", fin: "pez", duracionMs: 120, conLupa: false }) === "responder", "toque sobre la misma sombra responde");
assert(g({ inicio: "pez", fin: "carro", duracionMs: 120, conLupa: false }) === "nada", "deslizar a otra sombra no responde");
assert(g({ inicio: null, fin: "pez", duracionMs: 120, conLupa: false }) === "nada", "empezar fuera y soltar en sombra no responde");
assert(g({ inicio: "pez", fin: "pez", duracionMs: 2000, conLupa: false }) === "responder", "3-4: presión larga también responde");
assert(g({ inicio: "pez", fin: "pez", duracionMs: 300, conLupa: true }) === "responder", "5-6: toque corto responde");
assert(g({ inicio: "pez", fin: "pez", duracionMs: 700, conLupa: true }) === "nada", "5-6: presión larga (lupa) no responde");
assert(g({ inicio: "pez", fin: "pez", duracionMs: 300, conLupa: true, lupaMostrada: true }) === "nada", "5-6: si la lupa se abrió no responde");

console.log("=== Pista ===");
const reglas34 = n34.pista;
const reglas56 = n56.pista;
assert(!L.debeMostrarPista({ errores: 1, inactivoMs: 0 }, reglas34), "1 error: sin pista");
assert(L.debeMostrarPista({ errores: 2, inactivoMs: 0 }, reglas34), "2 errores: pista");
assert(L.debeMostrarPista({ errores: 0, inactivoMs: 6000 }, reglas34), "6 s inactivo: pista (3-4)");
assert(!L.debeMostrarPista({ errores: 0, inactivoMs: 60000 }, reglas56), "5-6: la inactividad no da pista");
assert(!L.debeMostrarPista({ errores: 3, pistaActiva: true }, reglas34), "pista no se repite");

console.log("=== Textos de error ===");
const te = L.textoError(n34.retos[0], "carro", config.textos);
assert(/ruedas/.test(te.texto) && te.voz === "zoe", "manzana vs carro: habla de ruedas");
const te2 = L.textoError(n34.retos[0], "inexistente", config.textos);
assert(te2.texto === config.textos.errorGenerico, "respaldo genérico");
assert(L.textoError(n56.retos[2], "helicoptero", config.textos).zona, "helicóptero trae zona de holograma");

console.log("=== Recorridos ===");
const ruta = [[0, 0], [100, 0], [100, 100]];
assert(cerca(L.proyectarEnRuta(ruta, [50, 30]), 0.25), "proyección en primer tramo");
assert(cerca(L.proyectarEnRuta(ruta, [130, 50]), 0.75), "proyección en segundo tramo");
assert(cerca(L.proyectarEnRuta(ruta, [-50, -50]), 0), "antes del inicio se queda en 0");
assert(cerca(L.proyectarEnRuta(ruta, [100, 400]), 1), "más allá del final se queda en 1");
const p = L.puntoEnRuta(ruta, 0.5);
assert(cerca(p.x, 100) && cerca(p.y, 0), "punto medio de la ruta");
assert(L.dentroDeCirculo([3, 4], [0, 0], 5) && !L.dentroDeCirculo([4, 4], [0, 0], 5), "colisión circular");

console.log("=== Validación detecta errores ===");
const roto = JSON.parse(JSON.stringify(config));
roto.niveles[0].retos[0].sombras = ["carro", "estrella"];
delete roto.niveles[1].retos[0].errores.mosca;
roto.niveles[1].retos[1].pista.zona = null;
roto.niveles[0].demo.objeto = "manzana";
roto.niveles[0].demo.sombras = ["manzana", "pera"];
const er = L.validarConfig(roto);
assert(er.some((e) => /falta la sombra correcta/.test(e)), "detecta reto sin sombra correcta");
assert(er.some((e) => /falta texto de error para mosca/.test(e)), "detecta distractor sin texto");
assert(er.some((e) => /pista de detalle necesita zona/.test(e)), "detecta pista de detalle sin zona");
assert(er.some((e) => /demo usa un objeto que aparece en los retos/.test(e)), "detecta demo que regala un reto");

console.log("=== Textos sin restos del diseño viejo ===");
const raw = fs.readFileSync(path.join(dir, "config.json"), "utf8");
assert(!/consignaPlantilla|mostrarFeedBack|aguila/.test(raw), "config sin consigna genérica, sin Swal y sin águila");
const script = fs.readFileSync(path.join(dir, "script.js"), "utf8");
assert(!/correcto\.gif|incorrecto\.gif/.test(script), "script sin gifs de feedback en ventana");

console.log("\nOK=" + oks + " FAIL=" + fails);
process.exit(fails ? 1 : 0);
