/**
 * Pruebas de Encuentra las diferencias.
 * Uso: node scripts/probar-encuentra-las-diferencias.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/EncuentraLasDiferencias");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.EncuentraLasDiferenciasLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.EncuentraLasDiferenciasSfx;
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
assert(n34.tema === "galeria" && n56.tema === "museo", "temas galeria y museo");
assert(n34.retos.map((r) => r.tipo).join() === "faltante,color,extra,multi", "tipos 3-4");
assert(n56.retos.map((r) => r.tipo).join() === "intruso,memoria,espejo,anacronismo", "tipos 5-6");

console.log("=== Textos ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => ["consigna", "acierto"].forEach((k) => {
        L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k));
    }));
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
});

console.log("=== Logica ===");
const osito = n34.retos[0];
assert(L.evaluarToque(osito, {}, 66, 70).estado === "completo", "osito pincel");
assert(L.evaluarToque(osito, {}, 20, 20).estado === "mal", "osito mal");
assert(osito.toqueEn === "travieso" || osito.toqueEn === "B", "osito solo cuadro travieso");
assert(n34.retos.every((r) => r.toqueEn !== "ambos"), "3-4 no acepta toque en original");
const gato = n34.retos[1];
assert(L.evaluarToque(gato, {}, 50, 25).estado === "completo", "gato sombrero");
const jardin = n34.retos[2];
assert(L.evaluarToque(jardin, {}, 50, 40).estado === "completo", "jardin flor");
const paisaje = n34.retos[3];
const p1 = L.evaluarToque(paisaje, {}, 79, 22);
assert(p1.estado === "bien", "paisaje gafas");
assert(L.evaluarToque(paisaje, p1.encontrados, 29, 29).estado === "completo", "paisaje nube");
const bodegon = n56.retos[0];
assert(L.evaluarToque(bodegon, {}, 83, 56).estado === "completo", "bodegon reloj");
assert(L.evaluarToque(bodegon, {}, 30, 60).estado === "distractores", "bodegon manzana");
assert(bodegon.cuadroResuelto === "bodegon_sin_reloj", "bodegon resuelve sin reloj");
const campo = n56.retos[1];
assert(L.evaluarToque(campo, {}, 82, 34).estado === "completo", "campo abeja");
assert(campo.observarMs === 5000 && campo.parpadeoMs === 2000, "campo tiempos memoria");
const castillo = n56.retos[2];
const c1 = L.evaluarToque(castillo, {}, 44, 56);
assert(c1.estado === "bien", "castillo ventana");
assert(L.evaluarToque(castillo, c1.encontrados, 24, 22).estado === "completo", "castillo bandera");
assert(castillo.progresoB.ventana === "castillo_ventana_ok", "castillo progreso ventana");
assert(castillo.selloAutentica === true, "castillo sello autentica");
const caballero = n56.retos[3];
assert(L.evaluarToque(caballero, {}, 63, 53).estado === "completo", "caballero telefono");
assert(caballero.cuadroResuelto === "caballero_sin_tel", "caballero sin telefono");
assert(n56.cierreSoloTexto === true, "5-6 cierre solo texto");
assert(L.usaDosCuadros("faltante") && L.usaUnCuadro("intruso"), "helpers cuadros");

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
assert(js.includes("retoPareja") && js.includes("retoMemoria") && js.includes("retoUnCuadro"), "script retos");
assert(js.includes("mostrarCierre") && js.includes("granCierre") && js.includes("pednia:perfil"), "script cierre");
assert(js.includes("aplicarProgresoB") && js.includes("selloAutentica") && js.includes("cierreSoloTexto"), "script doc");
assert(js.includes("Cuadro Original") && js.includes("Cuadro Travieso"), "etiquetas doc");
assert(css.includes(".tema-galeria") && css.includes(".tema-museo") && css.includes(".marco-cuadro"), "css temas");
assert(css.includes("object-fit: fill") && css.includes(".sello-autentica"), "css alineacion");
assert(!/\.destello\b/.test(css), "css sin .destello");
assert(!css.includes(".gota") && !css.includes(".zona-arbol") && !css.includes(".zona-manzana"), "css sin restos de ElMundo");
assert(!css.includes("estudio.svg") && !css.includes("laboratorio.svg"), "css sin escenas ajenas");
assert(css.includes("personajes-3d"), "css personajes-3d");
assert(html.includes("fa-magnifying-glass") || html.includes("fa-eye"), "inicio detective");
assert(!html.includes("fa-droplet"), "inicio sin gota de pintura");
assert(enDoc(n34.insignia.nombre), "medalla 3-4 en doc");
assert(enDoc(n56.insignia.nombre), "medalla 5-6 en doc");
assert(Sfx && Sfx.EFECTOS.indexOf("destello") !== -1 && Sfx.EFECTOS.indexOf("alarma") !== -1 && Sfx.EFECTOS.indexOf("teleport") !== -1, "sfx efectos");

console.log("\nOK " + oks + " FAIL " + fails);
process.exit(fails ? 1 : 0);
