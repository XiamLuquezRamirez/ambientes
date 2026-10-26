/**
 * Pruebas de Memoria musical (Expresión Artística): config alineada al documento + orden de las secuencias.
 * Uso: node scripts/probar-memoria-musical.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/MemoriaMusical");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.MemoriaMusicalLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.MemoriaMusicalSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");

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
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(config.niveles.map((n) => n.id + ":" + n.edad).join("|") === "3:3-4 años|5:5-6 años", "dos grupos: 3-4 (id 3) y 5-6 (id 5)");
assert(n34.tema === "bosque" && n56.tema === "estudio", "bosque (3-4) y estudio (5-6)");
assert(n34.retos.map((r) => r.tipo).join() === "secuencia,secuencia,secuencia,secuencia", "3-4: cuatro secuencias");
assert(n56.retos.map((r) => r.tipo).join() === "secuencia,secuencia,espejo,secuencia", "5-6: secuencia, secuencia, espejo y secuencia");
assert(n34.retos.map((r) => r.pasos.length).join() === "2,3,3,4", "3-4: largos 2, 3, 3 y 4");
assert(n56.retos.map((r) => r.pasos.length).join() === "4,5,3,5", "5-6: largos 4, 5, 3 y 5");

console.log("=== Textos literales del documento ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => {
        ["consigna", "turno", "acierto", "error"].forEach((k) => {
            L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k + " en el documento: " + l.texto));
        });
    });
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre en el documento: " + l.texto));
    assert(enDoc(n.insignia.nombre), n.edad + " medalla del documento: " + n.insignia.nombre);
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");

console.log("=== Voces según el documento ===");
const conejito = reto(n34, "conejito");
const trio = reto(n34, "trio");
const bateria = reto(n34, "bateria");
const campanas = reto(n34, "campanas");
assert([voces(conejito.consigna), voces(conejito.turno), voces(conejito.acierto), voces(conejito.error)].join() === "zoe,zeus,zoe,zeus", "conejito: Zoe, Zeus, Zoe y el error de Zeus");
assert([voces(trio.consigna), voces(trio.turno), voces(trio.acierto), voces(trio.error)].join() === "zeus,zoe,zoe+zeus,zeus", "trío: Zeus, Zoe, los dos y el error de Zeus");
assert([voces(bateria.consigna), voces(bateria.turno), voces(bateria.acierto), voces(bateria.error)].join() === "zoe,zeus,zeus,zeus", "batería: Zoe presenta y Zeus marca el turno, el acierto y el error");
assert([voces(campanas.consigna), voces(campanas.turno), voces(campanas.acierto)].join() === "zoe+zeus,zoe,zoe+zeus", "campanas: Zoe y Zeus presentan y cierran");
const orquesta = reto(n56, "orquesta");
const piano = reto(n56, "piano");
const espejo = reto(n56, "espejo");
const consola = reto(n56, "consola");
assert([voces(orquesta.consigna), voces(orquesta.turno), voces(orquesta.acierto), voces(orquesta.error)].join() === "zoe,zeus,zoe,zeus", "orquesta: Zoe, Zeus, Zoe y el error de Zeus");
assert([voces(piano.consigna), voces(piano.turno), voces(piano.acierto), voces(piano.error)].join() === "zeus,zoe,zeus,zoe", "piano: Zeus, Zoe, Zeus y el error de Zoe");
assert([voces(espejo.consigna), voces(espejo.turno), voces(espejo.acierto), voces(espejo.error)].join() === "zoe,zeus,zoe+zeus,zeus", "espejo: Zoe, Zeus, los dos y el error de Zeus");
assert([voces(consola.consigna), voces(consola.turno), voces(consola.acierto)].join() === "zoe+zeus,zoe,zoe+zeus", "consola: Zoe y Zeus presentan y cierran");
config.niveles.forEach((n) => assert(voces(n.cierre) === "zoe+zeus", n.edad + ": cierre de Zoe y luego Zeus"));

console.log("=== Secuencias del documento ===");
assert(conejito.pasos.join() === "nota_roja,nota_azul" && conejito.acompanante === "conejo", "conejito: roja y luego azul, con el conejo");
assert(config.elementos.nota_roja.nota === "do4" && config.elementos.nota_azul.nota === "sol4", "roja suena Do y azul suena Sol");
assert(trio.pasos.join() === "oso,conejo,pajaro", "trío: osito, conejo y pajarito");
assert(config.elementos.oso.sonido === "tambor" && config.elementos.pajaro.sonido === "flauta" && config.elementos.conejo.sonido === "madera", "oso grave, pajarito agudo y conejo de madera");
assert(bateria.pasos.join() === "pad_amarillo,pad_morado,pad_verde", "batería: amarillo, morado y verde");
assert(campanas.pasos.join() === "campana_rosa,campana_celeste,campana_naranja,campana_violeta" && campanas.festejo === "puente", "campanas rosa, celeste, naranja y violeta, y se abre el puente");
assert(orquesta.pasos.join() === "violin,trompeta,tambor,flauta" && orquesta.festejo === "acorde", "orquesta: violín, trompeta, tambor y flauta, y suenan juntos");
assert(piano.pasos.join() === "tecla_verde,tecla_amarilla,tecla_roja,tecla_azul,tecla_verde", "piano: verde, amarillo, rojo, azul y verde");
assert(espejo.pasos.join() === "platillo,caja,bombo" && L.respuestaDe(espejo).join() === "bombo,caja,platillo", "espejo: se oye platillo, caja y bombo; se toca al revés");
assert(consola.botones.length === 6 && consola.pasos.length === 5, "consola: 6 botones y una melodía de 5 notas");
assert(consola.pasos.every((id) => consola.botones.includes(id)), "cada nota de la consola está entre los 6 botones");
assert(n34.insignia.nombre === "Memoria de Oro Musical" && n56.insignia.nombre === "Ingeniero Maestro de la Memoria Acústica", "medallas del documento");
const usados = new Set(config.niveles.flatMap((n) => n.retos.flatMap((r) => r.pasos.concat(r.botones || []))));
assert(!usados.has(config.demo.elemento), "la demostración no revela una nota de los retos");

console.log("=== Lógica ===");
assert(L.evaluarOrden(["a", "b"], 0, "a").estado === "bien" && L.evaluarOrden(["a", "b"], 1, "b").estado === "completo", "evaluarOrden en orden");
const mal = L.evaluarOrden(["a", "b"], 0, "b");
assert(mal.estado === "mal" && mal.esperado === "a", "evaluarOrden fuera de orden");
assert(L.evaluarOrden(["a"], 1, "a").estado === "completo", "evaluarOrden ya terminado");
assert(L.respuestaDe({ tipo: "secuencia", pasos: ["a", "b"] }).join() === "a,b", "secuencia: se repite igual");
assert(L.respuestaDe({ tipo: "espejo", pasos: ["a", "b", "c"] }).join() === "c,b,a", "espejo: se invierte");
assert(L.respuestaDe(piano).join() === piano.pasos.join(), "el piano no se invierte aunque repita la verde");
assert(L.lineas([{ voz: "zoe", texto: "a" }, { voz: "max", texto: "b" }]).length === 1 && L.lineas({ voz: "zeus", texto: "c" }).length === 1, "lineas acepta una o varias");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
    assert(fs.existsSync(path.join(dir, e.img)), "imagen de " + id + " existe");
    assert(Sfx.SONIDOS.includes(e.sonido), "sonido sintetizado de " + id + " (" + e.sonido + ")");
    if (e.nota) assert(Sfx.NOTAS.includes(e.nota), "nota de " + id + " (" + e.nota + ")");
});
Object.entries(config.escenas).forEach(([id, src]) => assert(fs.existsSync(path.join(dir, src)), "escena " + id + " existe"));
config.niveles.forEach((n) => {
    assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de la medalla existe");
    assert(Sfx.EFECTOS.includes(n.insignia.sonido), n.edad + ": sonido de medalla " + n.insignia.sonido);
});
const efectosUsados = new Set();
js.replace(/efecto\("([a-zA-Z]+)"\)/g, (_, e) => efectosUsados.add(e));
config.niveles.forEach((n) => efectosUsados.add(n.insignia.sonido));
efectosUsados.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e + " existe en sfx"));
const cfgTxt = JSON.stringify(config);
const imagenes = [];
(function recorrer(rel) {
    fs.readdirSync(path.join(dir, rel)).forEach((f) => {
        const r = rel + "/" + f;
        if (fs.statSync(path.join(dir, r)).isDirectory()) recorrer(r);
        else imagenes.push(r);
    });
})("img");
imagenes.forEach((ref) => {
    assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref) || css.includes(ref), ref + " se usa");
    if (ref.endsWith(".svg")) {
        let valido = true;
        try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, ref))); } catch (e) { valido = false; }
        assert(valido, ref + " es UTF-8 válido");
        const cabeza = fs.readFileSync(path.join(dir, ref), "utf8").slice(0, 220);
        assert(/<svg\b/.test(cabeza) && /width="\d+"/.test(cabeza) && /height="\d+"/.test(cabeza), ref + " tiene ancho y alto (si no, el navegador no lo dibuja)");
    }
});
assert(!html.includes("Paquete en construcción") && !html.includes("stub-wrap"), "index.html sin stub");
assert(!js.includes("Stub de catálogo"), "script.js sin stub");
assert(!/<span[^>]*btn-empecemos-texto/.test(html), "botón de inicio solo con icono");
assert(html.includes('id="estacion"') && html.includes('id="concierto"'), "estación y concierto en el HTML");
assert(!/\.destello\b/.test(css), "sin la clase .destello (choca con final.css)");
assert(js.includes("respuestaDe") && js.includes("evaluarOrden") && js.includes("VOLUMEN_FONDO_ESCUCHA = 0"), "el motor repite el orden y calla el fondo al escuchar");

console.log("=== Validador (casos negativos) ===");
const casos = [
    ["reto cambiado de orden", (c) => { c.niveles[0].retos.reverse(); }],
    ["secuencia de 2 con 3 pasos", (c) => { c.niveles[0].retos[0].pasos.push("nota_roja"); }],
    ["espejo que no se invierte", (c) => { c.niveles[1].retos[2].tipo = "secuencia"; c.niveles[1].retos[2].pasos = ["platillo", "caja"]; }],
    ["paso de un elemento que no existe", (c) => { c.niveles[0].retos[1].pasos[0] = "lobo"; }],
    ["botón fuera de la consola", (c) => { c.niveles[1].retos[3].pasos[0] = "nota_roja"; }],
    ["sin voz de error", (c) => { delete c.niveles[0].retos[0].error; }],
    ["voz inválida", (c) => { c.niveles[0].retos[0].consigna.voz = "max"; }],
    ["sin medalla", (c) => { delete c.niveles[1].insignia; }],
    ["tema cruzado", (c) => { c.niveles[0].tema = "estudio"; }],
    ["demo sin elemento", (c) => { c.demo.elemento = "arpa"; }],
    ["escena inexistente", (c) => { c.niveles[0].escena = "playa"; }],
    ["espejo palíndromo", (c) => { c.niveles[1].retos[2].pasos = ["caja", "platillo", "caja"]; }],
];
casos.forEach(([nombre, mutar]) => {
    const c = copia();
    mutar(c);
    assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
