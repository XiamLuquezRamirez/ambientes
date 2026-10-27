/**
 * Pruebas de Rompecabezas artistico: config alineada al documento y reglas de encaje.
 * Uso: node scripts/probar-rompecabezas-artistico.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/RompecabezasArtistico");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.RompecabezasArtisticoLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.RompecabezasArtisticoSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");

let oks = 0;
let fails = 0;
function assert(cond, msg) {
    if (cond) oks += 1;
    else { fails += 1; console.error("  FAIL " + msg); }
}
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const enDoc = (texto) => norm(doc).includes(norm(texto));
const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const voces = (x) => L.lineas(x).map((l) => l.voz).join("+");
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");
const reto = (n, id) => n.retos.find((r) => r.id === id);

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub, "config sin stub");
assert(n34.tema === "caballete" && n56.tema === "taller", "caballete (3-4) y taller (5-6)");
assert(n34.retos.map((r) => r.tipo).join() === "encaje,encaje,color,encaje", "3-4: encaje, encaje, color y encaje");
assert(n56.retos.map((r) => r.tipo).join() === "giro,encaje,encaje,encaje", "5-6: giro y tres encajes");
assert(n34.retos.map((r) => r.piezas.length).join() === "1,3,3,3", "3-4: 1, 3, 3 y 3 piezas");
assert(n56.retos.map((r) => r.piezas.length).join() === "4,5,4,4", "5-6: 4, 5, 4 y 4 piezas");

console.log("=== Textos del documento ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => ["consigna", "turno", "acierto", "error"].forEach((k) => {
        L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k + ": " + l.texto));
    }));
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre: " + l.texto));
    assert(enDoc(n.insignia.nombre), n.edad + " medalla: " + n.insignia.nombre);
});

console.log("=== Cuadros ===");
const sol = reto(n34, "sol");
const gato = reto(n34, "gato");
const frutas = reto(n34, "frutas");
const arco = reto(n34, "arcoiris");
assert(sol.fijos[0].id === "sol_izq" && sol.piezas[0].id === "sol_der", "el sol tiene una mitad fija y otra para arrastrar");
assert(gato.orden.join() === "cabeza,cuerpo,cola" && gato.piezas.map((p) => p.nota).join() === "do4,re4,mi4", "gatito: cabeza, cuerpo y cola en Do Re Mi");
assert(frutas.piezas.map((p) => p.resultado).join() === "manzana,banano,uvas", "manzana, banano y uvas");
assert(frutas.piezas.every((p) => p.sonido === "mordisco" && p.silueta), "cada fruta tiene silueta gris y mordisco");
assert(arco.piezas.map((p) => p.id).join() === "franja_roja,franja_amarilla,franja_azul", "arcoiris rojo, amarillo y azul");
const geo = reto(n56, "geometrico");
const arbol = reto(n56, "arbol");
const globo = reto(n56, "globo");
const casita = reto(n56, "casita");
assert(geo.piezas.filter((p) => p.giro).length === 2, "dos piezas geometricas empiezan giradas");
assert(arbol.piezas.map((p) => p.id).sort().join() === "copa_der,copa_izq,luna,suelo,tronco", "arbol: luna, copas, tronco y suelo");
assert(globo.guiaColor && globo.piezas.map((p) => p.id).join() === "franja_roja,franja_amarilla,franja_verde,franja_azul", "globo con guia de color");
assert(casita.piezas.map((p) => p.id).join() === "techo,casa,puerta,ventana" && casita.piezas[0].sonido === "acorde", "casita: techo, cuerpo, puerta y ventana; el techo suena acorde");
assert(n56.retos.every((r) => r.revolver), "en 5-6 la bandeja va revuelta");
assert(voces(n34.cierre) === "zoe+zeus" && voces(n56.cierre) === "zoe+zeus", "los dos cierres son Zoe y luego Zeus");

console.log("=== Logica ===");
let enc = L.evaluarEncaje(gato, [], "cuerpo", "centro", 0);
assert(enc.estado === "espera" && enc.esperado === "cabeza", "el cuerpo no entra antes que la cabeza");
enc = L.evaluarEncaje(gato, [], "cabeza", "arriba", 0);
assert(enc.estado === "bien", "la cabeza encaja arriba");
assert(L.evaluarEncaje(geo, [], "geo_1", "c1", 90).estado === "girada", "una pieza girada no cierra el iman");
assert(L.evaluarEncaje(geo, [], "geo_1", "c1", 0).estado === "bien", "enderezada si encaja");
assert(L.girar(270) === 0 && L.enderezada(0), "cuatro toques vuelven a cero");
const mezcla = L.mezclar([1, 2, 3, 4], function () { return 0; });
assert(mezcla.join() === "2,3,4,1" && L.mezclar(["a", "b"]).sort().join() === "a,b", "mezclar conserva las piezas y cambia el orden");
assert(L.huecoMasCercano({ x: 10, y: 10 }, [{ id: "a", x: 0, y: 0 }, { id: "b", x: 400, y: 0 }], 110) === "a", "el iman elige el hueco cercano");
assert(L.huecoMasCercano({ x: 500, y: 0 }, [{ id: "a", x: 0, y: 0 }], 110) === null, "lejos del hueco no encaja");

console.log("=== Imagenes ===");
Object.entries(config.elementos).forEach(([id, e]) => assert(fs.existsSync(path.join(dir, e.img)), "imagen " + id));
const cfgTxt = JSON.stringify(config);
(function recorrer(rel) {
    fs.readdirSync(path.join(dir, rel)).forEach((f) => {
        const r = rel + "/" + f;
        if (fs.statSync(path.join(dir, r)).isDirectory()) recorrer(r);
        else {
            assert(js.includes(r) || cfgTxt.includes(r) || html.includes(r) || css.includes(r), r + " se usa");
            if (!r.endsWith(".svg")) return;
            let utf = true;
            try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, r))); } catch (e) { utf = false; }
            assert(utf && /width="\d+"/.test(fs.readFileSync(path.join(dir, r), "utf8").slice(0, 220)), r + " es UTF-8 con tamano");
        }
    });
})("img");
["iman", "resorte", "chasquido", "mordisco", "maullido", "arpa", "viento", "acorde", "fanfarria", "recompensa", "celebracion", "chispas"].forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e));
assert(js.includes("mezclar") && js.includes("guia-color") && css.includes(".lienzo.sonrie") && css.includes(".lienzo.eleva"), "guia, bandeja revuelta y festejos visibles");
assert(!/\.destello\b/.test(css), "sin .destello");

console.log("=== Validador ===");
[
    ["orden de retos", (c) => { c.niveles[0].retos.reverse(); }],
    ["giro sin piezas cruzadas", (c) => { c.niveles[1].retos[0].piezas.forEach((p) => { p.giro = 0; }); }],
    ["bandeja ordenada en 5-6", (c) => { delete c.niveles[1].retos[2].revolver; }],
    ["silueta inexistente", (c) => { c.niveles[0].retos[2].piezas[0].silueta = "pera"; }],
    ["sin medalla", (c) => { delete c.niveles[0].insignia; }],
    ["demo dentro de un reto", (c) => { c.demo.elemento = "cabeza"; }],
].forEach(([nombre, mutar]) => {
    const c = copia();
    mutar(c);
    assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
