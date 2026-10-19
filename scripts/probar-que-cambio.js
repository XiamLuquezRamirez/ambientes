/**
 * Pruebas de ¿Qué cambió?
 * Uso: node scripts/probar-que-cambio.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/QueCambio");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.QueCambioLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.QueCambioSfx;
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
const nivel = (id) => config.niveles.find((n) => String(n.id) === String(id));
const n34 = nivel("3");
const n56 = nivel("5");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub && !config.creado_en, "sin stub");
assert(config.accesibilidad.mostrarIntro === true, "demo activa");
assert(config.textos.demostracion && config.textos.demostracionFin, "textos de demostración");

console.log("=== Textos ===");
[n34, n56].forEach((n) => {
    n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    n.retos.forEach((r) => {
        assert(enDoc(r.presentacion.texto), n.edad + " " + r.id + " presentación");
        assert(enDoc(r.pregunta.texto), n.edad + " " + r.id + " pregunta");
        assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto");
        assert(enDoc(r.errorOtro.texto), n.edad + " " + r.id + " error");
    });
    assert(enDoc(n.insignia.nombre), "insignia " + n.edad);
    assert(enDoc(n.titulo), "título " + n.edad);
});

console.log("=== Retos ===");
assert(n34.retos.map((r) => r.mecanica).join(",") === "color,falta,aparece", "3-4 orden de mecánicas");
assert(n56.retos.map((r) => r.mecanica).join(",") === "color,falta,aparece", "5-6 orden de mecánicas");
assert(n34.retos[0].observacionMs === 7000 && n34.retos[0].ocultamientoMs === 3000, "3-4 R1 tiempos");
assert(n34.retos[2].observacionMs === 5000, "3-4 R3 son 5 segundos");
assert(n56.retos.every((r) => r.observacionMs === 7000 && r.ocultamiento === "apagon"), "5-6 apagón de 7 s");
assert(n34.retos[1].aceptaHueco === true, "3-4 el signo ? también acierta");
assert(!n56.retos[1].aceptaHueco, "5-6 el signo ? no sustituye la opción");
assert(n34.retos[0].cambio.a === "amarilla" && n56.retos[0].cambio.a === "roja", "pelota amarilla en 3-4 y roja en 5-6");
assert(n34.retos[0].acierto.texto.indexOf("cambió") !== -1, "3-4 acierto en pasado");
assert(n56.retos[0].acierto.texto.indexOf("cambia") !== -1, "5-6 acierto en presente");

console.log("=== Evaluación ===");
{
    const r = n34.retos[0];
    const ctx = L.preparar(r, Math.random);
    assert(ctx.correcto === "pelota", "el cambio es la pelota");
    assert(ctx.aspecto.pelota === "azul" && ctx.aspectoNuevo.pelota === "amarilla", "azul pasa a amarilla");
    assert(ctx.aspectoNuevo.manzana == null && ctx.aspectoNuevo.flor == null, "manzana y flor no cambian");
    assert(L.evaluar(r, ctx, "pelota") === "correcto", "pelota correcta");
    assert(L.evaluar(r, ctx, "manzana") === "incorrecto", "manzana no cambió");
    assert(L.errorPara(r, "flor").voz === "zeus", "error de color lo dice Zeus");
}
{
    const r = n34.retos[1];
    let k = 0;
    const seq = [0.99, 0.1, 0.6, 0.2, 0.8, 0.4, 0.15];
    const ctx = L.preparar(r, () => seq[k++ % seq.length]);
    assert(ctx.desafio[0] === null && ctx.desafio[1] === "carro" && ctx.desafio[2] === "sol", "el hueco queda donde estaba la campana");
    assert(ctx.opciones.join(",") !== "campana,flor" || ctx.opciones[0] !== "campana", "la campana no queda siempre primera");
    assert(ctx.opciones.includes("campana") && ctx.opciones.includes("flor"), "opciones campana y flor");
    assert(L.evaluar(r, ctx, "campana") === "correcto", "campana correcta");
    assert(L.evaluar(r, ctx, "flor") === "incorrecto", "flor incorrecta");
}
{
    const r = n34.retos[2];
    const ctx = L.preparar(r, Math.random);
    assert(ctx.desafio.join(",") === "oso,estrella,flor,helado", "la estrella queda entre los tres");
    assert(L.evaluar(r, ctx, "estrella") === "correcto", "estrella correcta");
    assert(L.evaluar(r, ctx, "oso") === "incorrecto", "el oso ya estaba");
    assert(L.errorPara(r, "helado").voz === "zoe", "error de aparición lo dice Zoe");
}
{
    const r = n56.retos[0];
    const ctx = L.preparar(r, Math.random);
    assert(ctx.mostrar.length === 4 && ctx.aspectoNuevo.pelota === "roja", "5-6 pelota roja entre 4");
    assert(L.evaluar(r, ctx, "campana") === "incorrecto", "la campana de 5-6 no cambió");
}
{
    const r = n56.retos[1];
    const ctx = L.preparar(r, Math.random);
    assert(ctx.desafio.filter(Boolean).length === 3 && ctx.opciones.length === 3, "falta uno y hay 3 opciones");
    assert(ctx.opciones.includes("campana"), "la campana está entre las opciones");
}
{
    const r = n56.retos[2];
    const ctx = L.preparar(r, Math.random);
    assert(ctx.desafio[2] === "estrella" && ctx.desafio.length === 5, "la estrella queda en medio de la repisa");
}

console.log("=== Assets ===");
const efectos = new Set();
config.niveles.forEach((n) => n.retos.forEach((r) => {
    if (r.ocultamientoEfecto) efectos.add(r.ocultamientoEfecto);
    if (r.acierto && r.acierto.efecto) efectos.add(r.acierto.efecto);
    if (r.errorOtro && r.errorOtro.efecto) efectos.add(r.errorOtro.efecto);
}));
efectos.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e));
Object.entries(config.elementos).forEach(([id, e]) => {
    assert(fs.existsSync(path.join(dir, e.img)), id);
    Object.values(e.variantes || {}).forEach((v) => assert(fs.existsSync(path.join(dir, v)), id + " " + v));
});
config.niveles.forEach((n) => assert(fs.existsSync(path.join(dir, n.insignia.img)), "insignia " + n.edad));

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
assert(html.includes("btn-empecemos") && html.includes('id="marco"') && html.includes('id="linterna"'), "HTML");
assert(js.includes("pista.gen") && js.includes("iniciarDemo") && js.includes("mostrarCierre"), "script flujo");
assert(js.includes("aceptaHueco"), "el hueco solo cuenta si el reto lo permite");
assert(!html.includes("stub-wrap"), "sin stub");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
