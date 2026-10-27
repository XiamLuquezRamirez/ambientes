/**
 * Pruebas de Completa el dibujo: config alineada al documento y reglas de juego.
 * Uso: node scripts/probar-completa-el-dibujo.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/CompletaElDibujo");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.CompletaElDibujoLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.CompletaElDibujoSfx;
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
assert(n34.tema === "estudio" && n56.tema === "diseno", "estudio (3-4) y diseno (5-6)");
assert(n34.retos.map((r) => r.tipo).join() === "encaje,encaje,encaje,encaje", "3-4: cuatro encajes");
assert(n56.retos.map((r) => r.tipo).join() === "simetria,puntos,elegir,encaje", "5-6: simetria, puntos, elegir y encaje");
assert(n34.retos.map((r) => (r.piezas || []).length).join() === "1,2,1,1", "3-4: 1, 2, 1 y 1 piezas");
assert(reto(n56, "cohete").puntos.length === 5, "cohete: 5 puntos");
assert(reto(n56, "robot").opciones.length === 3, "robot: 3 opciones");

console.log("=== Textos del documento ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => ["consigna", "acierto", "error"].forEach((k) => {
        L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k + ": " + l.texto));
    }));
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre: " + l.texto));
    assert(enDoc(n.insignia.nombre), n.edad + " medalla: " + n.insignia.nombre);
});

console.log("=== Retos ===");
const mari = reto(n34, "mariquita");
const carro = reto(n34, "carro");
const flor = reto(n34, "flor");
const casita = reto(n34, "casita");
assert(mari.fijos[0].id === "mariquita_base" && mari.piezas[0].id === "manchas", "mariquita: base fija y manchas");
assert(carro.piezas.length === 2 && carro.piezas.every((p) => L.elementoDePieza(p) === "rueda"), "carro: dos ruedas");
assert(flor.piezas[0].id === "petalos", "flor: petalos");
assert(casita.piezas[0].id === "puerta" && voces(casita.consigna) === "zoe+zeus", "casita: puerta con Zoe y Zeus");
const mari5 = reto(n56, "mariposa");
const cohete = reto(n56, "cohete");
const robot = reto(n56, "robot");
const castillo = reto(n56, "castillo");
assert(mari5.tipo === "simetria" && mari5.revela.id === "mariposa_der", "mariposa: simetria revela ala derecha");
assert(cohete.puntos.map((p) => p.n).join() === "1,2,3,4,5", "cohete puntos 1..5");
assert(robot.correcta === "brazo_ok" && robot.opciones.indexOf("brazo_ok") !== -1, "robot: brazo_ok es la correcta");
assert(castillo.piezas.length === 2, "castillo: dos almenas");
assert(voces(n34.cierre) === "zoe+zeus" && voces(n56.cierre) === "zoe+zeus", "los dos cierres son Zoe y luego Zeus");

console.log("=== Logica ===");
let enc = L.evaluarEncaje(mari, [], "manchas", "caparazon");
assert(enc.estado === "completo", "manchas en caparazon completa");
enc = L.evaluarEncaje(carro, [], "rueda", "eje_der");
assert(enc.estado === "mal", "rueda en eje equivocado falla");
enc = L.evaluarEncaje(carro, [], "rueda", "eje_izq");
assert(enc.estado === "bien", "primera rueda bien");
enc = L.evaluarEncaje(carro, enc.colocadas, "rueda2", "eje_der");
assert(enc.estado === "completo", "segunda rueda completa");
let pt = L.evaluarPunto(cohete, [], 2);
assert(pt.estado === "mal", "punto 2 antes de 1 falla");
pt = L.evaluarPunto(cohete, [], 1);
assert(pt.estado === "bien", "punto 1 bien");
pt = L.evaluarPunto(cohete, [1, 2, 3, 4], 5);
assert(pt.estado === "completo", "punto 5 completa");
assert(L.evaluarEleccion(robot, "brazo_corto").estado === "mal", "brazo corto falla");
assert(L.evaluarEleccion(robot, "brazo_ok").estado === "completo", "brazo ok completa");
assert(L.mezclar([1, 2, 3], function () { return 0; }).length === 3, "mezclar conserva largo");

console.log("=== Assets ===");
const imgs = Object.keys(config.elementos).map((id) => config.elementos[id].img)
    .concat(Object.values(config.escenas))
    .concat([n34.insignia.img, n56.insignia.img]);
imgs.forEach((rel) => assert(fs.existsSync(path.join(dir, rel)), "existe " + rel));
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

console.log("=== Shell ===");
assert(html.indexOf("logica.js") !== -1 && html.indexOf("sfx.js") !== -1, "html carga logica y sfx");
assert(html.indexOf("intro3d") !== -1 && html.indexOf("final.js") !== -1, "html tiene intro3d y final");
assert(js.indexOf("CompletaElDibujoLogica") !== -1 && js.indexOf("retoSimetria") !== -1, "script usa logica y simetria");
assert(js.indexOf("retoPuntos") !== -1 && js.indexOf("retoElegir") !== -1, "script tiene puntos y elegir");
assert(css.indexOf("tema-estudio") !== -1 && css.indexOf("tema-diseno") !== -1, "css tiene ambos temas");
assert(Sfx.EFECTOS.indexOf("pegado") !== -1 && Sfx.EFECTOS.indexOf("arpa") !== -1, "sfx tiene pegado y arpa");
assert(!/\.destello\b/.test(css), "sin .destello");
["pegado", "tuerca", "arpa", "laser", "despegue", "robot", "bisagra", "fanfarria", "celebracion", "chispas", "error"].forEach((e) => {
    assert(Sfx.EFECTOS.includes(e), "efecto " + e);
});

console.log("=== Validador ===");
const copia = () => JSON.parse(JSON.stringify(config));
[
    ["orden de retos", (c) => { c.niveles[0].retos.reverse(); }],
    ["puntos desordenados", (c) => { c.niveles[1].retos[1].puntos[0].n = 9; }],
    ["correcta fuera de opciones", (c) => { c.niveles[1].retos[2].correcta = "manchas"; }],
    ["sin medalla", (c) => { delete c.niveles[0].insignia; }],
    ["demo dentro de un reto", (c) => { c.demo.elemento = "manchas"; }],
    ["simetria sin revela", (c) => { delete c.niveles[1].retos[0].revela; }],
].forEach(([nombre, mutar]) => {
    const c = copia();
    mutar(c);
    assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " ok, " + fails + " fail");
process.exit(fails ? 1 : 0);
