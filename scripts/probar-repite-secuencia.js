/**
 * Pruebas de Repite la secuencia: config alineada al documento + reglas de validación del orden.
 * Uso: node scripts/probar-repite-secuencia.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/RepiteLaSecuencia");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.RepiteSecuenciaLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.RepiteSecuenciaSfx;
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

/** Compara sin tildes, signos ni mayúsculas (el documento escribe "FELICITACIONES", "Que bien"). */
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc);
const enDoc = (texto) => docNorm.includes(norm(texto));

const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");
const nombre = (id) => norm(config.elementos[id].nombre);

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(!config.stub && !config.creado_en, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(enDoc(n34.titulo) && enDoc(n56.titulo), "nombre del juego de cada edad tomado del documento");

console.log("=== Textos del documento ===");
config.niveles.forEach((n) => {
  n.bienvenida.forEach((l) => assert(enDoc(l.texto), n.edad + " bienvenida en el documento: " + l.texto));
  n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre en el documento: " + l.texto));
  n.retos.forEach((r) => {
    if (r.acierto.texto) assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto en el documento: " + r.acierto.texto);
    if (r.error) assert(enDoc(r.error.texto), n.edad + " " + r.id + " error en el documento: " + r.error.texto);
  });
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");
config.niveles.forEach((n) => assert(n.bienvenida[0].personaje === 1 && n.bienvenida[1].personaje === 0, n.edad + ": saluda Zoe y sigue Zeus"));
assert(n56.cierre.length === 2 && n56.cierre[0].voz === "zoe" && n56.cierre[1].voz === "zeus", "5-6: audio final de Zoe y luego Zeus");
assert(n34.cierre.length === 1, "3-4: un solo audio final");
assert(enDoc(n56.insignia.nombre), "5-6: insignia ¡Maestro de las secuencias!");

console.log("=== Secuencias del documento ===");
config.niveles.forEach((n) => {
  n.retos.forEach((r) => {
    r.secuencias.forEach((s) => {
      const frase = s.map(nombre).join(" ");
      assert(docNorm.includes(frase), n.edad + " " + r.id + ": la secuencia " + frase + " está en el documento");
    });
  });
});
const largos = (n) => n.retos.map((r) => r.secuencias.map((s) => s.length).join("+")).join(",");
assert(largos(n34) === "2,2,3,2,3", "3-4: dos, dos, tres, dos (con distractor) y tres sonidos");
assert(largos(n56) === "3,3,4,3+3,5", "5-6: 3, 3, 4, dos secuencias con cambio y 5 sonidos");
const cambio = n56.retos[3].secuencias;
assert(cambio[0].join() !== cambio[1].join() && cambio[0].slice().sort().join() === cambio[1].slice().sort().join(), "reto con cambio: mismos sonidos en otro orden");
assert(n34.retos[3].opciones.length === 3 && n34.retos[3].secuencias[0].length === 2, "3-4 reto 4: tres opciones para dos sonidos (distractor)");
assert(n56.retos[0].opciones.length === 4, "5-6 reto 1: cuatro opciones");
assert(n34.retos[0].error.voz === "zeus" && enDoc(n34.retos[0].error.texto), "3-4 error: Zeus ¡Escuchemos otra vez!");
assert(n56.retos.every((r) => !r.error), "5-6: el documento no da voz de error");
assert(n56.retos[2].acierto.voz === "zeus", "5-6 reto 3: lo dice Zeus");
assert(n34.retos[4].acierto.efecto === "final" && n56.retos[4].acierto.efecto === "final", "gran secuencia final: Zoe y Zeus celebran");

console.log("=== Validación del orden ===");
const seq = ["pelota", "gato"];
assert(L.evaluar(seq, [], "pelota") === "correcto", "primer sonido en su lugar");
assert(L.evaluar(seq, ["pelota"], "gato") === "completo", "segundo sonido completa");
assert(L.evaluar(seq, [], "gato") === "error", "gato - pelota es incorrecto aunque ambos sonaron (el orden es parte del desafío)");
assert(L.evaluar(seq, [], "perro") === "error", "el distractor es incorrecto");
assert(L.evaluar(seq, ["pelota"], "pelota") === "repetido", "un doble toque no cuenta como error");
const cinco = n56.retos[4].secuencias[0];
let prog = [];
cinco.forEach((id, i) => {
  const r = L.evaluar(cinco, prog, id);
  assert(r === (i === 4 ? "completo" : "correcto"), "5 sonidos: posición " + (i + 1) + " validada");
  prog.push(id);
});

console.log("=== Las opciones no delatan el orden ===");
let semilla = 7;
const rnd = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
config.niveles.forEach((n) => n.retos.forEach((r) => r.secuencias.forEach((s) => {
  let bien = true;
  for (let k = 0; k < 300; k++) {
    const orden = L.ordenarOpciones(r.opciones, s, rnd);
    if (orden.length !== r.opciones.length || r.opciones.some((o) => orden.indexOf(o) === -1)) bien = false;
    if (L.delataOrden(orden, s)) bien = false;
  }
  assert(bien, n.edad + " " + r.id + " (" + s.join("-") + "): 300 órdenes sin leerse en pantalla en ningún sentido");
})));
assert(L.revelaOrden(["a", "x", "b"], ["a", "b"]) && !L.revelaOrden(["b", "a"], ["a", "b"]), "revelaOrden detecta el orden en pantalla");
assert(L.delataOrden(["c", "b", "a"], ["a", "b", "c"]) && !L.delataOrden(["b", "a"], ["a", "b"]), "desde 3 sonidos tampoco vale el orden inverso");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), id + ": imagen " + e.img + " existe");
  assert(Sfx.ESTIMULOS.includes(e.sonido), "sonido sintetizado de " + id + " (" + e.sonido + ")");
});
config.niveles.forEach((n) => assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de insignia existe"));
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  if (f.endsWith(".svg")) {
    let valido = true;
    try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, "img", f))); } catch (e) { valido = false; }
    assert(valido, ref + " es UTF-8 válido (si no, el navegador no lo dibuja)");
  }
  assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref), ref + " se usa (sin imágenes huérfanas)");
});
const usados = new Set(config.demo.secuencia);
config.niveles.forEach((n) => n.retos.forEach((r) => r.opciones.forEach((o) => usados.add(o))));
Object.keys(config.elementos).forEach((id) => assert(usados.has(id), id + " se usa en algún reto o en la demo"));

console.log("=== Pantalla de inicio ===");
assert((html.match(/class="inicio-el /g) || []).length === 3, "inicio: tres elementos sonoros grandes");
assert(/id="btn-empecemos"[^>]*aria-label="Empezar"/.test(html) && html.includes("fa-play btn-empecemos-icono"), "inicio: botón central de reproducción con icono");
assert(html.includes("inicio-secuencia"), "inicio: espacio donde aparecerá la secuencia");
assert(html.includes("inicio-zoe") && html.includes("inicio-zeus"), "inicio: Zoe y Zeus");
const inicio = html.slice(html.indexOf('id="pantalla-inicio"'), html.indexOf('id="intro3d-root"'));
assert(!/>[^<\s][^<]*</.test(inicio.replace(/<i [^>]*><\/i>/g, "")), "inicio sin palabras escritas");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["secuencia distinta al documento", (c) => { c.niveles[0].retos[0].secuencias = [["gato", "perro"]]; }],
  ["sonido que no está entre las opciones", (c) => { c.niveles[1].retos[1].opciones = ["campana", "perro", "maracas"]; }],
  ["opciones distintas a las del documento", (c) => { c.niveles[0].retos[1].opciones = ["tambor", "campana", "gato"]; }],
  ["demasiadas opciones en 3-4", (c) => { c.niveles[0].retos[4].opciones = ["tambor", "pajaro", "campana", "gato"]; }],
  ["opciones repetidas", (c) => { c.niveles[1].retos[1].opciones = ["carro", "campana", "perro", "perro"]; }],
  ["sonido repetido en la secuencia", (c) => { c.niveles[1].retos[4].secuencias = [["tambor", "tambor", "campana", "perro", "pelota"]]; }],
  ["falta la segunda secuencia del cambio", (c) => { c.niveles[1].retos[3].secuencias = [["perro", "campana", "pajaro"]]; }],
  ["falta la voz de error en 3-4", (c) => { delete c.niveles[0].retos[2].error; }],
  ["voz de error inventada en 5-6", (c) => { c.niveles[1].retos[0].error = { voz: "zeus", texto: "Otra vez" }; }],
  ["efecto distinto", (c) => { c.niveles[0].retos[4].acierto.efecto = "celebra"; }],
  ["demo con un sonido de los retos", (c) => { c.demo.secuencia = ["vaca", "perro"]; }],
  ["cierre sin líneas", (c) => { c.niveles[1].cierre = []; }],
  ["elemento sin imagen", (c) => { delete c.elementos.gato.img; }],
  ["reto de menos", (c) => { c.niveles[0].retos.pop(); }]
];
casos.forEach(([nombreCaso, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "detecta: " + nombreCaso);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
