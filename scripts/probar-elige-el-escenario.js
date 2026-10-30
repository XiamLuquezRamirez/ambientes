/**
 * Pruebas de Elige el escenario.
 * Uso: node scripts/probar-elige-el-escenario.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/EligeElEscenario");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.EligeElEscenarioLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.EligeElEscenarioSfx;
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
assert(n34.tema === "teatro" && n56.tema === "control", "temas teatro y control");
assert(n34.retos.map((r) => r.tipo).join() === "arrastreTelon,arrastreTelon,arrastreUtileria,secuencia", "tipos 3-4");
assert(n56.retos.map((r) => r.tipo).join() === "luces,capas,anacronismo,arrastreUtileria", "tipos 5-6");

console.log("=== Textos ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => {
        ["consigna", "acierto"].forEach((k) => {
            L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k));
        });
        if (r.despuesQuitar) L.lineas(r.despuesQuitar).forEach((l) => assert(/antorchas|televisor|muros/i.test(l.texto), n.edad + " " + r.id + " despuesQuitar"));
        if (r.error) L.lineas(r.error).forEach((l) => assert(enDoc(l.texto) || /prueba|intenta/i.test(norm(l.texto)), n.edad + " " + r.id + " error"));
    });
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    assert(enDoc(n.insignia.nombre) || /escenografo|director/i.test(n.insignia.nombre), n.edad + " medalla");
});

console.log("=== Logica ===");
assert(L.evaluarPieza(n34.retos[0], "telon_mar").estado === "bien", "pececito ok");
assert(L.evaluarPieza(n34.retos[0], "telon_desierto").estado === "mal", "pececito mal");
assert(L.evaluarArrastre(n34.retos[0], "telon_mar", 50, 42).estado === "completo", "pececito arrastre");
assert(L.evaluarArrastre(n34.retos[0], "telon_mar", 10, 10).estado === "fuera", "pececito fuera");
assert(n34.retos[1].permitirToque === true, "castillo permite toque");
assert(L.evaluarPieza(n34.retos[2], "tractor").estado === "bien", "granja tractor");
assert(n34.retos[3].pasos.length === 2, "espacio 2 pasos");
assert(L.evaluarArrastre(n34.retos[3].pasos[1], "luna", 50, 28).estado === "completo", "luna destino");
assert(n34.retos[3].pasos[1].opciones.join() === "luna,cohete", "luna distractor cohete");
assert(config.elementos.telon_espacio.nombre === "Telón Oscuro de Estrellas", "nombre telón estrellas");
assert(js.includes("arrastreTelon") && js.includes("rielBajoEvento"), "hit rieles por DOM");
assert(js.includes("arrastreUtileria") && /tipo === \"arrastreTelon\"/.test(js), "utileria no pisa fondo");
assert(L.evaluarLuces(n56.retos[0], "foco_noche", 1).estado === "completo", "luces ok");
assert(L.evaluarLuces(n56.retos[0], "foco_noche", 3).estado === "casi", "luces casi");
assert(L.evaluarLuces(n56.retos[0], "foco_dia", 1).estado === "mal", "luces foco mal");
assert(L.evaluarCapa(n56.retos[1], "mar_fondo", "fondo", {}).estado === "progreso", "capa mar");
assert(L.evaluarCapa(n56.retos[1], "mar_fondo", "centro", {}).estado === "mal", "capa mar mal riel");
let col = {};
["mar_fondo", "barco", "cofre"].forEach((id, i) => {
    const riel = ["fondo", "centro", "frente"][i];
    const res = L.evaluarCapa(n56.retos[1], id, riel, col);
    col = res.halladas;
    if (i < 2) assert(res.estado === "progreso", "pirata " + id);
    else assert(res.estado === "completo", "pirata completo");
});
assert(L.evaluarQuitar(n56.retos[2], "televisor").estado === "bien", "quitar tv");
assert(L.evaluarQuitar(n56.retos[2], "trono").estado === "mal", "trono no quitar");
assert(L.evaluarPieza(n56.retos[3], "carpa").estado === "bien", "circo carpa");
assert(n34.galeria.join() === "mini_mar,mini_castillo,mini_granja,mini_espacio", "galeria 3-4 desfile");
assert(n56.galeria.join() === "telon_bosque,mar_fondo,telon_medieval,telon_circo", "galeria 5-6 temas del nivel");
assert(!!config.elementos.vaquita, "vaquita en granja");

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
assert(html.includes("logica.js") && html.includes("sfx.js"), "html scripts");
assert(js.includes("retoArrastre") && js.includes("retoLuces") && js.includes("retoCapas") && js.includes("retoAnacronismo") && js.includes("retoSecuencia"), "script retos");
assert(js.includes("mostrarCierre") && js.includes("granCierre") && js.includes("pednia:perfil"), "script cierre");
assert(css.includes(".tema-teatro") && css.includes(".tema-control") && css.includes(".tarima"), "css temas");
assert(css.includes(".consola-luces") && css.includes(".riel") && css.includes(".pieza"), "css mecánicas");
assert(!/\.destello\b/.test(css), "css sin .destello");
assert(js.includes("desfile") && css.includes("desfileCarrusel"), "cierre 3-4 desfile de escenarios");
assert(js.includes("telon-cae") && js.includes("reverencia") && js.includes("fuego-vivo"), "feedbacks kinestésicos doc");
assert(js.includes("luces-on") && js.includes("ilumina") && js.includes("pixeles"), "utilería y anacronismo feedback");
assert(Sfx && Sfx.EFECTOS.indexOf("burbujas") !== -1 && Sfx.EFECTOS.indexOf("trompeta") !== -1, "sfx efectos");
assert(Sfx.EFECTOS.indexOf("aplausos") !== -1 && Sfx.EFECTOS.indexOf("motor") !== -1, "sfx aplausos/motor");

console.log("\nOK " + oks + " FAIL " + fails);
process.exit(fails ? 1 : 0);
