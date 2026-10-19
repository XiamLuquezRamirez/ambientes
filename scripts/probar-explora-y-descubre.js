/**
 * Pruebas de Explora y descubre.
 * Uso: node scripts/probar-explora-y-descubre.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/ExploraYDescubre");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ExploraDescubreLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ExploraDescubreSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");

let oks = 0;
let fails = 0;
function assert(cond, msg) {
    if (cond) oks += 1;
    else { fails += 1; console.error("  FAIL " + msg); }
}
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc).replace(/munchos/g, "muchos");
const enDoc = (texto) => docNorm.includes(norm(texto));
const nivel = (id) => config.niveles.find((n) => String(n.id) === String(id));
const n34 = nivel("3");
const n56 = nivel("5");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub && !config.creado_en, "sin stub");
assert(config.accesibilidad.mostrarIntro === true, "demo activa");
assert(config.textos.demostracion && config.textos.demostracionFin && config.textos.demostracionAcierto, "textos de demostración");

console.log("=== Textos ===");
[n34, n56].forEach((n) => {
    n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    n.retos.forEach((r) => {
        assert(enDoc(r.presentacion.texto), n.edad + " " + r.id + " presentación");
        assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto");
        if (r.errorOtro) assert(enDoc(r.errorOtro.texto), n.edad + " " + r.id + " error");
        (r.errores || []).forEach((e) => assert(enDoc(e.texto), n.edad + " " + r.id + " error específico"));
        (r.pistas || []).forEach((p) => assert(enDoc(p.texto), n.edad + " " + r.id + " pista"));
    });
    assert(enDoc(n.insignia.nombre), "insignia " + n.edad);
    assert(enDoc(n.titulo), "título " + n.edad);
});
assert(n34.retos[0].errorOtro.texto.indexOf("MUNCHOS") === -1, "el error de 3-4 no repite el error de escritura");

console.log("=== Retos ===");
assert(n34.retos.map((r) => r.correcto).join(",") === "arcoiris,tambor,perfume,helado", "3-4 orden");
assert(n56.retos.map((r) => r.correcto).join(",") === "arcoiris,tambor,perfume,helado", "5-6 orden");
assert(n34.retos.every((r) => r.opciones.length === 4 && r.mecanica === "lupa"), "3-4 cuatro tarjetas y lupa");
assert(n56.retos.every((r) => r.opciones.length === 5 && r.mecanica === "radar" && r.pistas.length === 2), "5-6 cinco tarjetas y dos pistas");
assert(n56.retos[0].opciones.indexOf("bombillo") !== -1, "bombillo en el espectro");
assert(n56.retos[1].opciones.indexOf("trompeta") !== -1, "trompeta en percusión");
assert(n56.retos[2].opciones.indexOf("jabon") !== -1, "jabón en olfato");
assert(n56.retos[3].opciones.indexOf("hielo") !== -1, "hielo en gusto");

console.log("=== Evaluación ===");
{
    const r = n34.retos[0];
    let k = 0;
    const seq = [0.99, 0.1, 0.6, 0.2, 0.8, 0.4, 0.15];
    const ctx = L.preparar(r, () => seq[k++ % seq.length]);
    assert(ctx.opciones.length === 4 && ctx.opciones.includes("arcoiris") && ctx.opciones[0] !== "arcoiris", "baraja y no deja el correcto primero");
    assert(L.evaluar(r, "arcoiris") === "correcto", "arcoíris");
    assert(L.evaluar(r, "sol") === "incorrecto", "sol no");
    assert(L.errorPara(r, "flor").voz === "zeus", "error visual lo dice Zeus");
}
{
    const r = n34.retos[1];
    assert(L.errorPara(r, "pelota").voz === "zoe", "error sonoro lo dice Zoe");
    assert(L.errorPara(r, "pelota").texto.indexOf("Escucha u observa") === 0, "3-4 R2 no inventa una explicación que el documento no trae");
}
{
    const r = n56.retos[1];
    assert(L.errorPara(r, "trompeta").voz === "zoe" && L.errorPara(r, "trompeta").texto.indexOf("soplar") !== -1, "trompeta se sopla");
    assert(L.errorPara(r, "pelota").texto.indexOf("Revisa las pistas") !== -1, "el resto vuelve a las pistas");
}
{
    const r = n56.retos[2];
    assert(L.errorPara(r, "jabon").texto.indexOf("jabón") !== -1, "el jabón no es el perfume");
}
{
    const r = n56.retos[3];
    assert(L.errorPara(r, "hielo").texto.indexOf("barquilla") !== -1, "el hielo no es el postre");
}

console.log("=== Assets ===");
const efectos = new Set();
config.niveles.forEach((n) => n.retos.forEach((r) => {
    if (r.efectoPista) efectos.add(r.efectoPista);
    if (r.acierto && r.acierto.efecto) efectos.add(r.acierto.efecto);
    if (r.errorOtro && r.errorOtro.efecto) efectos.add(r.errorOtro.efecto);
}));
efectos.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e));
Object.entries(config.elementos).forEach(([id, e]) => assert(fs.existsSync(path.join(dir, e.img)), id));
config.niveles.forEach((n) => {
    assert(fs.existsSync(path.join(dir, n.insignia.img)), "insignia " + n.edad);
    n.retos.forEach((r) => (r.pistas || []).forEach((p) => assert(fs.existsSync(path.join(dir, p.icono)), p.icono)));
});
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
assert(html.includes('id="final-acciones"') && html.includes('id="menu-vol"') && html.includes('id="lupa"') && html.includes('id="radar"'), "HTML de cascarón");
assert(js.includes("pista.gen") && js.includes("iniciarDemo") && js.includes("mostrarCierre") && js.includes("usaLupa"), "script flujo");
assert(!html.includes("stub-wrap"), "sin stub");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
