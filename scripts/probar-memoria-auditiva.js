/**
 * Pruebas de Memoria auditiva: config alineada al documento + respuestas derivadas de cada tipo de reto.
 * Uso: node scripts/probar-memoria-auditiva.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/MemoriaAuditiva");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.MemoriaAuditivaLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.MemoriaAuditivaSfx;
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

const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");
const pasos = (r) => L.pasosDe(r).map((p) => p.modo + ":" + p.correctas.join("+")).join(" | ");

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
    assert(enDoc(r.titulo), n.edad + " " + r.id + ": título en el documento");
    (r.preguntas || []).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " pregunta en el documento: " + l.texto));
    if (r.acierto.texto) assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto en el documento: " + r.acierto.texto);
    if (r.error) assert(enDoc(r.error.texto), n.edad + " " + r.id + " error en el documento: " + r.error.texto);
  });
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");
config.niveles.forEach((n) => assert(n.bienvenida[0].personaje === 1 && n.bienvenida[1].personaje === 0, n.edad + ": saluda Zoe y sigue Zeus"));
assert(n56.cierre.length === 2 && n56.cierre[0].voz === "zoe" && n56.cierre[1].voz === "zeus", "5-6: audio final de Zoe y luego Zeus");
assert(n34.cierre.length === 1, "3-4: un solo audio final");
assert(norm(n56.insignia.nombre) === "guardian de la memoria auditiva" && enDoc(n56.insignia.nombre), "5-6: insignia Guardián de la memoria auditiva");
const vocesDoc = [
  [n34.retos[0].acierto, "zoe"], [n34.retos[0].error, "zeus"], [n34.retos[1].preguntas[0], "zoe"],
  [n34.retos[2].acierto, "zeus"], [n34.retos[3].acierto, "zoe"],
  [n56.retos[0].acierto, "zoe"], [n56.retos[1].acierto, "zeus"], [n56.retos[2].acierto, "zoe"],
  [n56.retos[3].acierto, "zeus"], [n56.retos[4].preguntas[0], "zoe"], [n56.retos[4].preguntas[1], "zeus"]
];
vocesDoc.forEach(([l, voz]) => assert(l.voz === voz, "lo dice " + voz + ": " + l.texto));

console.log("=== Elementos del documento ===");
const alias = { botella: "botellas con semillas", pasos: "pasos de pies", reloj: "agujas de reloj" };
const fueraDelDoc = ["gallo", "maracas", "gato"];
Object.entries(config.elementos).forEach(([id, e]) => {
  if (fueraDelDoc.includes(id)) return;
  assert(enDoc(alias[id] || e.nombre), id + " aparece en el documento");
});
assert(!enDoc("gato"), "gato solo es el distractor del gran desafío (el documento no fija las opciones)");

console.log("=== Respuestas derivadas de lo que sonó ===");
const esperado = {
  "3-4 años": [
    "uno:manos",
    "varios:botella+pollito",
    "uno:pollito",
    "uno:caballo",
    "uno:vaca"
  ],
  "5-6 años": [
    "varios:pato+leon+rana",
    "uno:caballo",
    "uno:campana+gaita",
    "uno:pajaro",
    "varios:pajaro+tambor+campana+perro+pelota | uno:pajaro | uno:pelota"
  ]
};
config.niveles.forEach((n) => n.retos.forEach((r, i) => {
  assert(pasos(r) === esperado[n.edad][i], n.edad + " " + r.id + ": " + pasos(r));
}));
assert(n34.retos[0].mostrarAntes === true && n34.retos.slice(1).every((r) => !r.mostrarAntes), "3-4: solo el reto 1 muestra las imágenes antes del sonido");
assert(n34.retos[3].reproducciones.length === 2 && n56.retos[2].reproducciones.length === 2 && n56.retos[3].reproducciones.length === 2, "desapareció y cambio: dos reproducciones");
assert(n56.retos[0].opciones.length === 5 && n56.retos[1].opciones.length === 4, "5-6: cinco opciones en el reto 1 y cuatro en el 2");
const cb = L.cambioDe(n56.retos[2]);
assert(cb.antes === "campana" && cb.despues === "gaita", "cambio: campana antes, gaita después");
assert(n56.retos[2].acierto.efecto === "cambio", "cambio: se muestran relacionados antes/después");
assert(n34.retos[2].acierto.veces >= 3 && n56.retos[1].acierto.veces === 2, "repetido: varias veces en 3-4, dos veces en 5-6");
assert(n34.retos[0].error && n34.retos.slice(1).every((r) => !r.error), "3-4: voz de error solo donde el documento la da (reto 1)");
assert(n56.retos.every((r) => !r.error), "5-6: el documento no da voz de error");
assert(n34.retos[4].acierto.efecto === "especial" && n56.retos[4].acierto.efecto === "final", "reto 5: Zoe y Zeus celebran");
assert(config.elementos.manos.imgAccion && fs.existsSync(path.join(dir, config.elementos.manos.imgAccion)), "manos: segunda imagen para simular el aplauso");

console.log("=== Validación de toques ===");
const uno = { modo: "uno", correctas: ["campana", "gaita"] };
assert(L.evaluar(uno, [], "campana") === "completo" && L.evaluar(uno, [], "gaita") === "completo", "cambio: vale el de antes o el de después");
assert(L.evaluar(uno, [], "tambor") === "error", "cambio: un sonido que no cambió es error");
const varios = { modo: "varios", correctas: ["pato", "leon", "rana"] };
assert(L.evaluar(varios, [], "leon") === "correcto", "varios: sin orden, el segundo sonido primero vale");
assert(L.evaluar(varios, ["leon"], "rana") === "correcto", "varios: sigue marcando");
assert(L.evaluar(varios, ["leon", "rana"], "pato") === "completo", "varios: el último completa");
assert(L.evaluar(varios, ["leon"], "carro") === "error", "varios: el distractor es error");
assert(L.evaluar(varios, ["leon"], "leon") === "repetido", "varios: un doble toque no cuenta como error");
const desafio = L.pasosDe(n56.retos[4]);
assert(L.evaluar(desafio[1], [], "tambor") === "error" && L.evaluar(desafio[1], [], "pajaro") === "completo", "desafío: primero = pájaro");
assert(L.evaluar(desafio[2], [], "perro") === "error" && L.evaluar(desafio[2], [], "pelota") === "completo", "desafío: al final = pelota");

console.log("=== Las opciones no delatan el orden ===");
let semilla = 7;
const rnd = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
config.niveles.forEach((n) => n.retos.forEach((r) => {
  const s = r.reproducciones[0];
  let bien = true;
  for (let k = 0; k < 300; k++) {
    const orden = L.ordenarOpciones(r.opciones, s, rnd);
    if (orden.length !== r.opciones.length || r.opciones.some((o) => orden.indexOf(o) === -1)) bien = false;
    if (L.delataOrden(orden, s)) bien = false;
  }
  assert(bien, n.edad + " " + r.id + ": 300 órdenes sin leerse en pantalla en el orden en que sonaron");
}));

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), id + ": imagen " + e.img + " existe");
  assert(Sfx.ESTIMULOS.includes(e.sonido), "sonido sintetizado de " + id + " (" + e.sonido + ")");
});
const sonidos = Object.values(config.elementos).map((e) => e.sonido);
assert(new Set(sonidos).size === sonidos.length, "cada elemento tiene un sonido distinto");
config.niveles.forEach((n) => {
  assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de insignia existe");
  n.retos.forEach((r) => { if (r.acierto.sonido) assert(Sfx.EFECTOS.includes(r.acierto.sonido), r.id + ": efecto " + r.acierto.sonido + " existe"); });
});
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
const usados = new Set(config.demo.opciones);
config.niveles.forEach((n) => n.retos.forEach((r) => r.opciones.forEach((o) => usados.add(o))));
Object.keys(config.elementos).forEach((id) => assert(usados.has(id), id + " se usa en algún reto o en la demo"));

console.log("=== Pantalla de inicio ===");
assert((html.match(/class="inicio-el /g) || []).length === 3, "inicio: tres elementos sonoros grandes");
assert(/id="btn-empecemos"[^>]*aria-label="Empezar"/.test(html) && html.includes("fa-play btn-empecemos-icono"), "inicio: botón central de reproducción");
assert(html.includes("inicio-secuencia"), "inicio: espacio central del desafío");
assert(html.includes("inicio-zoe") && html.includes("inicio-zeus"), "inicio: Zoe y Zeus");
const inicio = html.slice(html.indexOf('id="pantalla-inicio"'), html.indexOf('id="intro3d-root"'));
assert(!/>[^<\s][^<]*</.test(inicio.replace(/<i [^>]*><\/i>/g, "")), "inicio sin palabras escritas");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["reproducción distinta al documento", (c) => { c.niveles[0].retos[2].reproducciones = [["campana", "pollito", "campana"]]; }],
  ["tipo distinto al documento", (c) => { c.niveles[1].retos[1].tipo = "elegir"; }],
  ["sonido que no está entre las opciones", (c) => { c.niveles[1].retos[1].opciones = ["leon", "campana", "perro", "carro"]; }],
  ["opciones distintas a las del documento", (c) => { c.niveles[1].retos[0].opciones = ["perro", "rana", "pato", "leon", "gato"]; }],
  ["cantidad de opciones distinta", (c) => { c.niveles[1].retos[1].opciones = ["caballo", "leon", "campana"]; }],
  ["opciones repetidas", (c) => { c.niveles[1].retos[3].opciones = ["perro", "campana", "pajaro", "pajaro"]; }],
  ["desafío sin distractor", (c) => { c.niveles[1].retos[4].opciones = ["pajaro", "tambor", "campana", "perro", "pelota"]; }],
  ["falta una pregunta del desafío", (c) => { c.niveles[1].retos[4].preguntas.pop(); }],
  ["falta la pregunta de 3-4 reto 2", (c) => { delete c.niveles[0].retos[1].preguntas; }],
  ["falta la voz de error en 3-4 reto 1", (c) => { delete c.niveles[0].retos[0].error; }],
  ["voz de error inventada", (c) => { c.niveles[0].retos[2].error = { voz: "zeus", texto: "¡Escucha otra vez!" }; }],
  ["efecto distinto", (c) => { c.niveles[0].retos[3].acierto.efecto = "especial"; }],
  ["doble sin veces", (c) => { delete c.niveles[1].retos[1].acierto.veces; }],
  ["mostrar antes donde el documento no lo dice", (c) => { c.niveles[0].retos[1].mostrarAntes = true; }],
  ["demo con un elemento de los retos", (c) => { c.demo.opciones = ["gallo", "perro"]; }],
  ["demo cuyo sonido no está en sus opciones", (c) => { c.demo.sonido = "vaca"; }],
  ["cierre sin líneas", (c) => { c.niveles[1].cierre = []; }],
  ["elemento sin imagen", (c) => { delete c.elementos.gato.img; }],
  ["reto de menos", (c) => { c.niveles[0].retos.pop(); }]
];
casos.forEach(([nombreCaso, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "detecta: " + nombreCaso);
});

const malo = (tipoReto, reps) => {
  const c = copia();
  const r = c.niveles[1].retos.find((x) => x.tipo === tipoReto);
  r.reproducciones = reps;
  return L.validarConfig(c).some((e) => !e.includes("debe sonar"));
};
assert(malo("repetido", [["caballo", "leon", "campana"]]), "repetido sin sonido repetido se detecta");
assert(malo("desaparecio", [["perro", "campana", "pajaro", "tambor"], ["perro", "tambor"]]), "desapareció con dos faltantes se detecta");
assert(malo("cambio", [["tambor", "campana", "pajaro"], ["gaita", "tambor", "pajaro"]]), "cambio que también reordena se detecta");

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
