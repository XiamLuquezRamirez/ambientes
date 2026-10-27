/**
 * Pruebas de El mundo de los colores.
 * Uso: node scripts/probar-el-mundo-de-los-colores.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/ElMundoDeLosColores");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ElMundoDeLosColoresLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ElMundoDeLosColoresSfx;
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
assert(n34.tema === "estudio" && n56.tema === "laboratorio", "temas estudio y laboratorio");
assert(n34.retos.map((r) => r.tipo).join() === "mezcla,huellas,clasifica,salpicadura", "tipos 3-4");
assert(n56.retos.map((r) => r.tipo).join() === "laboratorio,temperatura,volumen,abstracto", "tipos 5-6");

console.log("=== Textos ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => ["consigna", "acierto"].forEach((k) => {
        L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k));
    }));
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    assert(enDoc(n.insignia.nombre), n.edad + " medalla");
});

console.log("=== Logica ===");
assert(L.resultadoMezcla("azul", "amarillo") === "verde", "azul+amarillo=verde");
assert(L.resultadoMezcla("rojo", "amarillo") === "naranja", "rojo+amarillo=naranja");
assert(L.resultadoMezcla("rojo", "azul") === "morado", "rojo+azul=morado");
assert(L.resultadoMezcla("rojo", "verde") === "marron", "rojo+verde=marron");
assert(L.evaluarClasifica(n34.retos[2], [], "mancha_roja", "rojo").estado === "bien", "clasifica rojo");
assert(L.evaluarClasifica(n34.retos[2], [], "mancha_roja", "azul").estado === "mal", "clasifica mal");
assert(L.evaluarTemperatura(n56.retos[1], [], "bote_naranja", "calido").estado === "bien", "naranja calido");
assert(L.evaluarVolumen(n56.retos[2], ["oscuro"], "claro").estado === "completo", "volumen completo");

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
assert(html.includes("ElMundoDeLosColores") === false && html.includes("logica.js") && html.includes("sfx.js"), "html carga logica/sfx");
assert(js.includes("retoMezcla") && js.includes("retoHuellas") && js.includes("retoLaboratorio"), "script retos");
assert(css.includes("tema-estudio") && css.includes("tema-laboratorio"), "css temas");
assert(!/\.destello\b/.test(css), "sin .destello");
["mezcla", "huella", "bocina", "salpicadura", "burbujas", "fanfarria"].forEach((e) => assert(Sfx.EFECTOS.includes(e), "sfx " + e));

console.log("\n" + oks + " ok, " + fails + " fail");
process.exit(fails ? 1 : 0);
