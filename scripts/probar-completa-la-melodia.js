/**
 * Pruebas de Completa la melodía (Expresión Artística): config alineada al documento y cierre de frases.
 * Uso: node scripts/probar-completa-la-melodia.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/CompletaLaMelodia");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.CompletaMelodiaLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.CompletaMelodiaSfx;
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
const notas = (lista) => (lista || []).map((e) => e.nota || e.golpe).join();

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub, "config sin stub");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(config.niveles.map((n) => n.id + ":" + n.edad).join("|") === "3:3-4 años|5:5-6 años", "dos grupos: 3-4 (id 3) y 5-6 (id 5)");
assert(n34.tema === "estacion" && n56.tema === "estudio", "estación (3-4) y estudio (5-6)");
assert(n34.retos.map((r) => r.tipo).join() === "toque,toque,toque,arrastre", "3-4: tres toques y un arrastre");
assert(n56.retos.map((r) => r.tipo).join() === "arrastre,opcion,arrastre,toque", "5-6: arrastre, opción, arrastre y toque");

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
const timbre = reto(n34, "timbre");
const xilofono = reto(n34, "xilofono");
const pajaro = reto(n34, "pajaro");
const tren = reto(n34, "tren");
assert([voces(timbre.consigna), voces(timbre.turno), voces(timbre.acierto)].join() === "zoe,zeus,zoe", "timbre: Zoe, Zeus y Zoe");
assert([voces(xilofono.consigna), voces(xilofono.acierto)].join() === "zeus,zoe", "xilófono: Zeus presenta y Zoe cierra");
assert([voces(pajaro.consigna), voces(pajaro.acierto)].join() === "zoe,zeus", "pajarito: Zoe pide el final y Zeus felicita");
assert([voces(tren.consigna), voces(tren.acierto)].join() === "zoe+zeus,zoe+zeus", "tren: Zoe y Zeus piden el vagón y celebran");
const escala = reto(n56, "escala");
const himno = reto(n56, "himno");
const violin = reto(n56, "violin");
const concierto = reto(n56, "concierto");
assert([voces(escala.consigna), voces(escala.acierto)].join() === "zoe,zoe", "escala: Zoe");
assert([voces(himno.consigna), voces(himno.acierto), voces(himno.error)].join() === "zeus,zeus,zeus", "himno: Zeus");
assert([voces(violin.consigna), voces(violin.acierto)].join() === "zoe,zoe", "violín: Zoe");
assert([voces(concierto.consigna), voces(concierto.acierto)].join() === "zoe+zeus,zoe+zeus", "concierto: Zoe y Zeus");
config.niveles.forEach((n) => assert(voces(n.cierre) === "zoe+zeus", n.edad + ": cierre de Zoe y luego Zeus"));

console.log("=== Frases del documento ===");
assert(timbre.boton === "timbre" && timbre.intro.map((e) => e.golpe).join() === "ding,dong,ding" && timbre.cierre.golpe === "dong", "timbre: Ding-Dong y se queda en Ding; el toque pone el Dong");
assert(timbre.adorno === "puerta" && timbre.extra === "perro" && timbre.extraOculto === true, "hay puerta y el perrito sale al completar");
assert(notas(xilofono.intro) === "do4,re4,mi4,do4,re4" && xilofono.cierre.nota === "mi4" && xilofono.boton === "nota_mi", "xilófono: Do-Re-Mi, Do-Re, y falta Mi");
assert(notas(xilofono.completa) === "do4,re4,mi4", "al acertar suena Do-Re-Mi");
assert(pajaro.boton === "nota_final" && pajaro.cierre.golpe === "acorde" && pajaro.adorno === "nido", "el pajarito cierra con un acorde desde el nido");
assert(tren.piezas.join() === "vagon" && tren.solucion.join() === "vagon" && tren.cierre.golpe === "silbato", "se arrastra el vagón y suena el silbato");
assert(notas(escala.intro) === "do4,re4,mi4,fa4" && escala.solucion.join() === "nota_sol", "escala Do-Re-Mi-Fa y falta Sol");
assert(notas(escala.completa) === "do4,re4,mi4,fa4,sol4", "la escala suena completa al colocar Sol");
assert(himno.opciones.filter((o) => o.correcto).map((o) => o.id).join() === "boton_acorde", "el cierre correcto es el acorde conclusivo");
assert(himno.opciones.some((o) => o.id === "boton_suspenso" && !o.correcto), "la otra opción es el sonido en suspenso");
assert(violin.solucion.join() === "nota_re,nota_mi" && violin.fijas.filter((x) => !x).length === 2, "al violín le faltan Re y Mi en el medio");
assert(violin.timbre === "violin" && notas(violin.completa) === "do4,re4,mi4,fa4,sol4", "el violín toca la melodía reparada");
assert(concierto.boton === "gran_acorde" && concierto.cierre.golpe === "gran", "el botón maestro dispara el gran acorde");
assert(n34.insignia.nombre === "Superestrellita Musical", "medalla de 3-4");
assert(n56.insignia.nombre === "Compositor de Conciertos Oficial", "medalla de 5-6");
const usados = new Set();
config.niveles.forEach((n) => n.retos.forEach((r) => {
    [r.boton, r.adorno, r.extra].concat(r.piezas || [], r.solucion || [], (r.opciones || []).map((o) => o.id)).forEach((id) => { if (id) usados.add(id); });
}));
assert(!usados.has(config.demo.elemento), "la demostración no es una pieza de los retos");

console.log("=== Lógica ===");
assert(L.evaluarToque("timbre", "timbre").estado === "completo" && L.evaluarToque("timbre", "otro").estado === "mal", "evaluarToque");
const mala = L.evaluarOpcion(himno.opciones, "boton_suspenso");
const buena = L.evaluarOpcion(himno.opciones, "boton_acorde");
assert(mala.estado === "mal" && mala.esperado === "boton_acorde" && buena.estado === "completo", "evaluarOpcion distingue el acorde del suspenso");
let enc = L.evaluarEncaje(["nota_re", "nota_mi"], [null, null], "nota_mi", 0);
assert(enc.estado === "mal" && enc.esperado === "nota_re", "el Mi no entra en el hueco del Re");
enc = L.evaluarEncaje(["nota_re", "nota_mi"], [null, null], "nota_re", 0);
assert(enc.estado === "bien" && enc.llenos[0] === "nota_re", "Re encaja en el primer hueco");
enc = L.evaluarEncaje(["nota_re", "nota_mi"], enc.llenos, "nota_mi", 1);
assert(enc.estado === "completo", "Mi cierra la partitura");
const ocupado = L.evaluarEncaje(["vagon"], ["vagon"], "vagon", 0);
assert(ocupado.estado === "ocupado", "un hueco lleno no acepta otra pieza");
assert(L.lineas([{ voz: "zoe", texto: "a" }, { voz: "max", texto: "b" }]).length === 1, "lineas descarta voces desconocidas");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => assert(fs.existsSync(path.join(dir, e.img)), "imagen de " + id));
Object.entries(config.escenas).forEach(([id, src]) => assert(fs.existsSync(path.join(dir, src)), "escena " + id));
config.niveles.forEach((n) => {
    assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": medalla");
    assert(Sfx.EFECTOS.includes(n.insignia.sonido), n.edad + ": sonido de medalla");
    n.retos.forEach((r) => {
        [r.intro, r.completa, r.cierre ? [r.cierre] : [], (r.opciones || []).map((o) => o.preview)].forEach((lista) => {
            (lista || []).forEach((ev) => {
                if (!ev) return;
                if (ev.nota) assert(Sfx.NOTAS.includes(ev.nota), r.id + " nota " + ev.nota);
                if (ev.golpe) assert(Sfx.GOLPES.includes(ev.golpe), r.id + " golpe " + ev.golpe);
            });
        });
    });
});
const efectosUsados = new Set();
js.replace(/efecto\("([a-zA-Z]+)"\)/g, (_, e) => efectosUsados.add(e));
config.niveles.forEach((n) => efectosUsados.add(n.insignia.sonido));
efectosUsados.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e));
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
    if (!ref.endsWith(".svg")) return;
    let valido = true;
    try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, ref))); } catch (e) { valido = false; }
    assert(valido, ref + " es UTF-8");
    const cabeza = fs.readFileSync(path.join(dir, ref), "utf8").slice(0, 240);
    assert(/<svg\b/.test(cabeza) && /width="\d+"/.test(cabeza) && /height="\d+"/.test(cabeza), ref + " tiene ancho y alto");
});
assert(!html.includes("Paquete en construcción") && !js.includes("Stub de catálogo"), "sin stub");
assert(html.includes('id="estacion"') && html.includes('id="concierto"'), "estación y concierto");
assert(!/\.destello\b/.test(css), "sin .destello");
assert(js.includes("evaluarToque") && js.includes("evaluarOpcion") && js.includes("evaluarEncaje"), "el motor usa las tres mecánicas");
assert(js.includes("VOLUMEN_FONDO_ESCUCHA = 0"), "el fondo se calla mientras suena la frase");

console.log("=== Validador (casos negativos) ===");
[
    ["retos en otro orden", (c) => { c.niveles[0].retos.reverse(); }],
    ["toque sin botón", (c) => { delete c.niveles[0].retos[0].boton; }],
    ["toque sin cierre", (c) => { delete c.niveles[0].retos[0].cierre; }],
    ["dos opciones correctas", (c) => { c.niveles[1].retos[1].opciones[1].correcto = true; }],
    ["opción sin voz de error", (c) => { delete c.niveles[1].retos[1].error; }],
    ["pieza que no se puede arrastrar", (c) => { c.niveles[1].retos[2].piezas = ["nota_re"]; }],
    ["frase cortada vacía", (c) => { c.niveles[0].retos[2].intro = []; }],
    ["voz inválida", (c) => { c.niveles[0].retos[0].consigna.voz = "max"; }],
    ["sin medalla", (c) => { delete c.niveles[1].insignia; }],
    ["tema cruzado", (c) => { c.niveles[0].tema = "estudio"; }],
    ["demo inexistente", (c) => { c.demo.elemento = "arpa"; }],
    ["escena inexistente", (c) => { c.niveles[1].escena = "playa"; }],
].forEach(([nombre, mutar]) => {
    const c = copia();
    mutar(c);
    assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
