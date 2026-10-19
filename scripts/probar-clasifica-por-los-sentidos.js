/**
 * Pruebas de Clasifica por los sentidos.
 * Uso: node scripts/probar-clasifica-por-los-sentidos.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/ClasificaPorLosSentidos");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ClasificaSentidosLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ClasificaSentidosSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");

let oks = 0;
let fails = 0;
function assert(cond, msg) {
    if (cond) oks += 1;
    else {
        fails += 1;
        console.error("  FAIL " + msg);
    }
}

const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc);
const enDoc = (texto) => docNorm.includes(norm(texto));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub && !config.creado_en, "sin stub");
assert(config.accesibilidad.mostrarIntro === true, "demo activa");

console.log("=== Textos ===");
[n34, n56].forEach((n) => {
    n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    n.retos.forEach((r) => {
        assert(enDoc(r.presentacion.texto), n.edad + " " + r.id + " presentación");
        if (r.pregunta) assert(enDoc(r.pregunta.texto), n.edad + " " + r.id + " pregunta");
        assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto");
        if (r.errorOtro) assert(enDoc(r.errorOtro.texto), n.edad + " " + r.id + " error");
        (r.errores || []).forEach((e) => assert(enDoc(e.texto), n.edad + " " + r.id + " error específico"));
    });
});
assert(enDoc(n34.insignia.nombre), "insignia 3-4");
assert(enDoc(n56.insignia.nombre), "insignia 5-6");

console.log("=== Retos ===");
assert(n34.retos[0].correcto === "arcoiris" && n34.retos[0].opciones.join(",") === "arcoiris,tambor,chocolate", "3-4 vista");
assert(n34.retos[1].correcto === "campana", "3-4 oído");
assert(n34.retos[2].correcto === "perfume", "3-4 olfato");
assert(n56.retos[0].piezas.map((p) => p.id + ":" + p.tubo).join("|") === "sol:vista|campana:oido|arcoiris:vista|tambor:oido", "5-6 R1");
assert(n56.retos[1].piezas.map((p) => p.tubo).filter((t) => t === "olfato").length === 2, "5-6 R2 olfato");
assert(n56.retos[1].piezas.filter((p) => p.tubo === "gusto").map((p) => p.id).join(",") === "helado,limon", "5-6 R2 gusto");
assert(n56.retos[2].piezas.filter((p) => p.tubo === "tacto").map((p) => p.id).join(",") === "lija,almohada", "5-6 R3 tacto");

console.log("=== Evaluación ===");
{
    const r = n34.retos[0];
    assert(L.evaluar(r, "arcoiris", "vista") === "correcto", "arcoíris a vista");
    assert(L.evaluar(r, "tambor", "vista") === "incorrecto", "tambor no es vista");
    assert(L.errorPara(r, "tambor").voz === "zeus", "error tambor Zeus");
    assert(L.errorPara(r, "chocolate").voz === "zoe", "error chocolate Zoe");
    let k = 0;
    const seq = [0.99, 0.1, 0.6, 0.2, 0.8, 0.4, 0.15];
    const prep = L.preparar(r, () => seq[k++ % seq.length]);
    assert(prep.orden.length === 3 && prep.orden.includes("arcoiris") && prep.orden[0] !== "arcoiris", "baraja y no deja el correcto primero");
}
{
    const r = n56.retos[2];
    assert(L.evaluar(r, "sirena", "oido") === "correcto", "sirena oído");
    assert(L.evaluar(r, "flor", "tacto") === "incorrecto", "flor no es tacto");
    assert(L.completo(r, { lija: "tacto", almohada: "tacto", flor: "olfato", sirena: "oido" }), "completo con las 4");
    assert(!L.completo(r, { lija: "tacto" }), "incompleto");
    assert(L.errorPara(r, "lija").texto.indexOf("piedra") !== -1, "error de textura menciona la piedra");
}

console.log("=== Assets ===");
Object.entries(config.elementos).forEach(([id, e]) => assert(fs.existsSync(path.join(dir, e.img)), id));
Object.entries(config.sentidos).forEach(([id, s]) => {
    assert(fs.existsSync(path.join(dir, s.icono)), "sentido " + id);
    assert(Sfx.EFECTOS.includes(s.efecto), "efecto " + s.efecto);
});
config.niveles.forEach((n) => assert(fs.existsSync(path.join(dir, n.insignia.img)), "insignia " + n.edad));

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
assert(html.includes("btn-empecemos") && html.includes('id="cinta"') && html.includes('id="zona-tubos"'), "HTML");
assert(js.includes("pista.gen") && js.includes("iniciarDemo") && js.includes("mostrarCierre"), "script flujo");
assert(!html.includes("stub-wrap"), "sin stub");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
