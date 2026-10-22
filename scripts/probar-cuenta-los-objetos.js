/**
 * Pruebas de Cuenta los objetos (reto 1).
 * Uso: node scripts/probar-cuenta-los-objetos.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisaberes/CuentaLosObjetos");
const sandbox = { console: console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.CuentaLosObjetosLogica;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

let oks = 0;
let fails = 0;
function assert(cond, msg) {
    if (cond) oks += 1;
    else {
        fails += 1;
        console.error("  FAIL " + msg);
    }
}

console.log("=== Config y HTML ===");
const informe = L.validarConfig(config);
informe.errores.forEach((e) => console.error("  " + e));
informe.avisos.forEach((e) => console.warn("  aviso " + e));
assert(informe.errores.length === 0, "validarConfig sin errores");
assert(!config.stub, "ya no es stub");
assert(config.niveles[0].retos.length === 1, "este corte solo trae el reto 1 en JSON");
assert(config.niveles[0].retos[0].id === "recolecta-2", "reto 1 es recolecta-2");
assert(html.includes('id="reto-1"') && html.includes('id="reto-2"') && html.includes('id="reto-3"'), "tres divs de reto");
assert(/id="reto-1"[^>]*data-listo="1"/.test(html), "solo el reto 1 está listo");
assert(!/id="reto-2"[^>]*data-listo/.test(html) && !/id="reto-3"[^>]*data-listo/.test(html), "retos 2 y 3 sin activar");
["img/manzana.png", "img/canasta.png", "img/arbol.png", "img/insignia_recolector.svg"].forEach((rel) => {
    assert(fs.existsSync(path.join(dir, rel)), rel + " existe");
});

console.log("=== Cantidades 2 a 5 ===");
[2, 3, 4, 5].forEach((n) => {
    const reto = { cantidadObjetos: n, opciones: [n - 1, n, n + 1], correcto: n, mecanica: "contar" };
    const manzanas = L.crearManzanas(L.respuestaDe(reto));
    assert(manzanas.length === n && L.respuestaDe(reto) === n, n + " manzanas y respuesta " + n);
    manzanas.forEach((m) => L.tocar(manzanas, m.id));
    assert(L.contadas(manzanas) === n, "se pueden contar las " + n);
});

console.log("=== Conteo y piezas visibles ===");
const cinco = L.crearManzanas(5);
assert(L.tocar(cinco, "manzana-1").numero === 1, "primera es uno");
assert(!L.tocar(cinco, "manzana-1").ok && L.contadas(cinco) === 1, "doble toque no cuenta dos veces");
const pag0 = L.pagina(cinco, 2, 0);
const pag1 = L.pagina(cinco, 2, 1);
assert(pag0.items.length === 2 && pag0.items[0].contada, "página 0 conserva la contada");
L.tocar(cinco, pag1.items[0].id);
assert(L.pagina(cinco, 2, 0).items[0].contada && L.contadas(cinco) === 2, "cambiar de página no borra el progreso");
assert(L.piezasVisiblesEfectivas({ piezasVisibles: 5, cantidadObjetos: 5 }, 2) === 2, "el tope global recorta lo visible");
assert(L.piezasVisiblesEfectivas({ piezasVisibles: 2 }, 4) === 2, "el reto puede pedir menos que el global");
assert(L.piezasVisiblesEfectivas({}, 3) === 3, "sin valor de reto se usa el global");
assert(L.piezasVisiblesEfectivas({}, null) === 2, "sin global ni reto, defecto 2");
assert(L.respuestaDe({ cantidadObjetos: 4, correcto: 2 }) === 4, "cantidadObjetos manda sobre correcto");

console.log("=== Opciones, error y pistas ===");
const ops = L.opcionesDe({ cantidadObjetos: 4, opciones: [2, 2, 3, 4, 9], correcto: 1 }, 3, () => 0.2);
assert(ops.indexOf(4) !== -1 && ops.length <= 3, "la correcta entra y no se pasa del máximo");
assert(new Set(ops).size === ops.length, "sin opciones duplicadas");
const medio = Math.floor((ops.length - 1) / 2);
assert(ops[medio] !== 4, "la correcta no queda fija en el centro");
const antes = L.contadas(cinco);
assert(L.evaluar(5, 3) === "incorrecto" && L.contadas(cinco) === antes, "un error no reinicia el conteo");
const u = { automaticas: true, erroresAntesDePista: 1, fallosPista1: 2, fallosPista2: 3 };
assert(L.nivelPista(1, u) === 1 && L.nivelPista(2, u) === 2 && L.nivelPista(3, u) === 3 && L.nivelPista(4, u) === 4, "pistas en escalera");
assert(L.nivelPista(9, { automaticas: false }) === 0, "sin pistas automáticas no hay nivel");
assert(L.atenuarOpciones(2, 2) === true && L.atenuarOpciones(1, 2) === false, "atenuar al umbral");
assert(L.revelarRespuesta(3, 3) === true && L.revelarRespuesta(2, 3) === false, "revelar al llegar a intentos_max");

console.log(oks + " ok, " + fails + " fail");
if (fails) process.exit(1);
