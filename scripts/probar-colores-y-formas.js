/**
 * Pruebas de Colores y formas.
 * Uso: node scripts/probar-colores-y-formas.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/ColoresYFormas");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ColoresYFormasLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ColoresYFormasSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");

let oks = 0, fails = 0;
function assert(cond, msg) { if (cond) oks += 1; else { fails += 1; console.error("  FAIL " + msg); } }
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const enDoc = (texto) => norm(doc).includes(norm(texto));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub, "config sin stub");
assert(n34.tema === "fabrica" && n56.tema === "atelier", "temas fabrica y atelier");
assert(n34.retos.map((r) => r.tipo).join() === "semaforo,casita,tren,cohete", "tipos 3-4");
assert(n56.retos.map((r) => r.tipo).join() === "mosaico,torre,mondrian,ciudad", "tipos 5-6");

console.log("=== Textos ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => ["consigna", "acierto"].forEach((k) => {
        L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k));
    }));
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    assert(enDoc(n.insignia.nombre) || /arquitecto|diseñador|prodigioso/i.test(n.insignia.nombre), n.edad + " medalla");
});

console.log("=== Logica ===");
assert(L.evaluarEncaje(n34.retos[0], [], "circulo_rojo", "arriba").estado === "bien", "semaforo rojo");
assert(L.evaluarEncaje(n34.retos[0], [], "circulo_rojo", "abajo").estado === "mal", "semaforo mal");
assert(L.evaluarEncaje(n34.retos[0], ["circulo_rojo"], "circulo_amarillo", "arriba").estado === "ocupado", "semaforo ocupado");
const m1 = L.evaluarMosaico(n56.retos[0], [], "tri_a", "t3");
assert(m1.estado === "bien", "mosaico amarillo en t3");
assert(L.evaluarMosaico(n56.retos[0], [], "tri_r1", "t3").estado === "mal", "mosaico rojo mal en t3");
assert(L.evaluarMondrian(n56.retos[2], [], "c1", "rojo").estado === "bien", "mondrian rojo");
assert(L.evaluarMondrian(n56.retos[2], [], "c1", "azul").estado === "mal", "mondrian mal");
const ciudad = L.evaluarCiudad(n56.retos[3], ["cubo_azul", "piramide_amarilla", "cilindro_verde", "cono_naranja", "cubo_rojo"], "cubo_amarillo");
assert(ciudad.estado === "completo", "ciudad completa");

console.log("=== Assets ===");
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
            assert(utf && /width="\d+"/.test(fs.readFileSync(path.join(dir, r), "utf8").slice(0, 220)), r + " UTF-8");
        }
    });
})("img");

console.log("=== Shell ===");
assert(html.includes("logica.js") && html.includes("sfx.js"), "html carga logica/sfx");
assert(js.includes("retoEncaje") && js.includes("retoMosaico") && js.includes("retoMondrian") && js.includes("retoCiudad"), "script retos");
assert(css.includes("tema-fabrica") && css.includes("tema-atelier") && css.includes("est-geo"), "css temas");
assert(!/\.destello\b/.test(css), "sin .destello");
["campana", "madera", "silbato", "cristal", "fanfarria"].forEach((e) => assert(Sfx.EFECTOS.includes(e), "sfx " + e));

console.log("\n" + oks + " ok, " + fails + " fail");
process.exit(fails ? 1 : 0);
