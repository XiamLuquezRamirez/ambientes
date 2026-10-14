/**
 * Pruebas de Asocia sonido e imagen: config alineada al documento, orden de opciones y validador.
 * Uso: node scripts/probar-asocia-sonido.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/AsociaSonidoEImagen");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.AsociaSonidoLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.AsociaSonidoSfx;
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

console.log("=== Config ===");
const errores = L.validarConfig(config, Sfx.ESTIMULOS);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(!config.stub && !config.creado_en, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(enDoc(n34.titulo) && enDoc(n56.titulo), "nombre del juego de cada edad tomado del documento");

console.log("=== Textos del documento ===");
/* Erratas del documento corregidas en la voz (se reportan): "Muy buen, lo reconociste" y "Muy Bien". */
const erratas = { "¡Muy bien, lo reconociste!": "Muy buen, lo reconociste" };
config.niveles.forEach((n) => {
  n.bienvenida.forEach((l) => assert(enDoc(l.texto), n.edad + " bienvenida en el documento: " + l.texto));
  n.cierre.forEach((l) => assert(enDoc(l.texto), n.edad + " cierre en el documento: " + l.texto));
  n.retos.forEach((r) => {
    assert(enDoc(r.titulo), n.edad + " " + r.id + ": título en el documento");
    if (r.acierto.texto) assert(enDoc(erratas[r.acierto.texto] || r.acierto.texto), n.edad + " " + r.id + " acierto en el documento: " + r.acierto.texto);
    if (r.error) assert(enDoc(r.error.texto), n.edad + " " + r.id + " error en el documento: " + r.error.texto);
  });
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");
config.niveles.forEach((n) => assert(n.bienvenida[0].personaje === 1 && n.bienvenida[1].personaje === 0, n.edad + ": saluda Zoe y sigue Zeus"));
assert(n56.cierre.length === 2 && n56.cierre[0].voz === "zoe" && n56.cierre[1].voz === "zeus", "5-6: audio final de Zoe y luego Zeus");
assert(n34.cierre.length === 1, "3-4: un solo audio final");
assert(norm(n34.insignia.nombre) === "experto en asociar sonidos" && enDoc(n34.insignia.nombre), "3-4: insignia Experto en asociar sonidos");
assert(norm(n56.insignia.nombre) === "maestro de las asociaciones sonoras" && enDoc(n56.insignia.nombre), "5-6: insignia Maestro de las asociaciones sonoras");
const voces34 = ["zoe", "zoe", "zeus", "zoe", "zeus"];
n34.retos.forEach((r, i) => assert(r.acierto.voz === voces34[i], "3-4 reto " + (i + 1) + ": lo dice " + voces34[i]));
const voces56 = ["zoe", "zeus", "zoe", "zeus", "zoe"];
n56.retos.slice(0, 5).forEach((r, i) => assert(r.acierto.voz === voces56[i], "5-6 reto " + (i + 1) + ": lo dice " + voces56[i]));
assert(!n56.retos[5].acierto.texto, "5-6 reto final: el documento no da frase (Zoe y Zeus celebran)");
assert(n34.retos[0].error && n34.retos[0].error.voz === "zeus", "3-4 reto 1: Zeus dice ¡Escucha otra vez!");
assert(n34.retos.slice(1).every((r) => !r.error) && n56.retos.every((r) => !r.error), "voz de error solo donde el documento la da");

console.log("=== Retos del documento ===");
const esperado = {
  "3-4 años": [
    ["timbre", "bicicleta", "bicicleta,telefono,reloj", "salta", "completo"],
    ["telefono", "telefono", "telefono,avion,aspiradora", "vibra", "completo"],
    ["despertador", "reloj", "reloj,bicicleta,tren", "fotogramas", "breve"],
    ["avion", "avion", "avion,tren,ambulancia", "despega", "breve"],
    ["tren", "tren", "tren,telefono,reloj", "avanza", "completo"]
  ],
  "5-6 años": [
    ["puerta", "puerta", "puerta,ventana,cajon,telefono", "fotogramas", "completo"],
    ["aspiradora", "aspiradora", "aspiradora,secador,licuadora,ventilador", "limpia", undefined],
    ["sirena", "ambulancia", "ambulancia,camion,avion,tren,motocicleta", "fotogramas", "breve"],
    ["aplausos", "aplaudiendo", "aplaudiendo,corriendo,saltando,durmiendo", "fotogramas", "breve"],
    ["grifo", "pluma", "pluma,ducha,fuente,lavadora,regadera", "fotogramas", "completo"],
    ["vibracion", "telefono", "telefono,reloj,bicicleta,aspiradora,puerta", "vibra", "completo"]
  ]
};
config.niveles.forEach((n) => n.retos.forEach((r, i) => {
  const [sonido, correcto, opciones, animacion, repetir] = esperado[n.edad][i];
  const tag = n.edad + " " + r.id;
  assert(r.sonido === sonido, tag + ": suena " + sonido);
  assert(r.correcto === correcto, tag + ": la correcta es " + correcto);
  assert(r.opciones.join(",") === opciones, tag + ": opciones del documento");
  assert(r.acierto.animacion === animacion, tag + ": animación " + animacion);
  assert(r.acierto.repetir === repetir, tag + ": repetir " + repetir);
}));
assert(n34.retos.every((r) => r.opciones.length === 3), "3-4: tres imágenes");
assert(n56.retos.every((r) => r.opciones.length >= 4 && r.opciones.length <= 5), "5-6: entre 4 y 5 imágenes");
assert(L.esperaAntesDeOpciones("5", n56.retos[5]) === 2000, "5-6 reto final: ~2 s antes de mostrar las imágenes");
assert(n56.retos.slice(0, 5).every((r) => L.esperaAntesDeOpciones("5", r) === 0) && n34.retos.every((r) => L.esperaAntesDeOpciones("3", r) === 0), "los demás retos no esperan");
assert(n56.retos[5].acierto.celebran === true, "5-6 reto final: Zoe y Zeus celebran");
assert(n56.retos[4].acierto.especial === true, "5-6 reto 5: animación especial");
assert(config.elementos.puerta.quedaAbierta && config.elementos.pluma.quedaAbierta, "puerta y pluma se abren y se quedan abiertas");
["reloj", "ambulancia", "aplaudiendo"].forEach((id) => assert(!config.elementos[id].quedaAbierta && config.elementos[id].fotogramas.length, id + ": fotogramas alternados (manecillas, luz, aplausos)"));

console.log("=== Validación de toques ===");
assert(L.evaluar(n34.retos[0], "bicicleta") === "correcto", "la bicicleta es correcta en el reto 1");
assert(L.evaluar(n34.retos[0], "telefono") === "incorrecto", "el teléfono es incorrecto en el reto 1");
assert(L.evaluar(n56.retos[5], "telefono") === "correcto" && L.evaluar(n56.retos[5], "reloj") === "incorrecto", "reto final: teléfono");

console.log("=== Las opciones no delatan la respuesta ===");
let semilla = 7;
const rnd = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
config.niveles.forEach((n) => {
  let anterior = -1;
  n.retos.forEach((r) => {
    let bien = true;
    const posiciones = new Set();
    for (let k = 0; k < 300; k++) {
      const orden = L.ordenarOpciones(r.opciones, r.correcto, anterior, rnd);
      if (orden.length !== r.opciones.length || r.opciones.some((o) => orden.indexOf(o) === -1)) bien = false;
      const pos = orden.indexOf(r.correcto);
      if (pos === 0 || pos === anterior) bien = false;
      posiciones.add(pos);
    }
    assert(bien, n.edad + " " + r.id + ": 300 órdenes sin la correcta primero ni repitiendo posición");
    assert(posiciones.size >= 2 || r.opciones.length === 3, n.edad + " " + r.id + ": la correcta cambia de lugar");
    anterior = L.ordenarOpciones(r.opciones, r.correcto, anterior, rnd).indexOf(r.correcto);
  });
});
assert(L.ordenarOpciones(["a", "b"], "a", -1, rnd).join() === "b,a", "dos opciones: la correcta va segunda");
const forzado = L.ordenarOpciones(["a", "b", "c"], "a", 1, () => 0);
assert(forzado.indexOf("a") === 2, "si el azar no ayuda, se coloca en una posición válida");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
  assert(fs.existsSync(path.join(dir, e.img)), id + ": imagen " + e.img + " existe");
  (e.fotogramas || []).forEach((f) => assert(fs.existsSync(path.join(dir, f)), id + ": fotograma " + f + " existe"));
});
const todos = config.niveles.flatMap((n) => n.retos);
todos.forEach((r) => {
  assert(Sfx.ESTIMULOS.includes(r.sonido), r.id + ": sonido sintetizado " + r.sonido);
  if (r.acierto.efecto) assert(Sfx.EFECTOS.includes(r.acierto.efecto), r.id + ": efecto " + r.acierto.efecto + " existe");
});
const sonidosRetos = todos.map((r) => r.sonido);
assert(new Set(sonidosRetos).size === sonidosRetos.length, "cada reto suena algo distinto (el teléfono suena en 3-4 y vibra en 5-6)");
assert(Sfx.ESTIMULOS.includes(config.demo.sonido), "demo: sonido sintetizado");
config.niveles.forEach((n) => assert(fs.existsSync(path.join(dir, n.insignia.img)), n.edad + ": imagen de insignia existe"));
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const cfgTxt = JSON.stringify(config);
fs.readdirSync(path.join(dir, "img")).forEach((f) => {
  const ref = "img/" + f;
  if (f.endsWith(".svg")) {
    const buf = fs.readFileSync(path.join(dir, "img", f));
    let valido = true;
    try { new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { valido = false; }
    assert(valido, ref + " es UTF-8 válido (si no, el navegador no lo dibuja)");
    assert(!/[^\x00-\x7f]/.test(buf.toString("latin1")), ref + " solo ASCII (acentos como entidades)");
  }
  assert(js.includes(ref) || cfgTxt.includes(ref) || html.includes(ref), ref + " se usa (sin imágenes huérfanas)");
});
const usados = new Set(config.demo.opciones);
todos.forEach((r) => r.opciones.forEach((o) => usados.add(o)));
Object.keys(config.elementos).forEach((id) => assert(usados.has(id), id + " se usa en algún reto o en la demo"));

console.log("=== Pantalla de inicio ===");
assert((html.match(/class="inicio-el ie[123]"/g) || []).length === 3, "inicio 3-4: tres imágenes grandes");
assert((html.match(/data-laboratorio=/g) || []).length === 3 && html.includes("inicio-el ie4"), "inicio 5-6: varias imágenes del laboratorio");
assert(/id="btn-empecemos"[^>]*aria-label="Empezar"/.test(html) && html.includes("fa-play btn-empecemos-icono"), "inicio: botón de reproducción solo con icono");
assert(html.includes("inicio-zoe") && html.includes("inicio-zeus"), "inicio: Zoe y Zeus");
assert(html.includes('id="area-seleccion"'), "juego: espacio central / área de selección");
const inicio = html.slice(html.indexOf('id="pantalla-inicio"'), html.indexOf('id="intro3d-root"'));
assert(!/>[^<\s][^<]*</.test(inicio.replace(/<i [^>]*><\/i>/g, "")), "inicio sin palabras escritas");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["reto de menos en 3-4", (c) => { c.niveles[0].retos.pop(); }],
  ["reto de menos en 5-6", (c) => { c.niveles[1].retos.pop(); }],
  ["3-4 con cuatro opciones", (c) => { c.niveles[0].retos[1].opciones.push("tren"); }],
  ["5-6 con tres opciones", (c) => { c.niveles[1].retos[0].opciones = ["puerta", "ventana", "cajon"]; }],
  ["5-6 con seis opciones", (c) => { c.niveles[1].retos[2].opciones.push("bicicleta"); }],
  ["correcta fuera de las opciones", (c) => { c.niveles[0].retos[2].correcto = "avion"; }],
  ["opción repetida", (c) => { c.niveles[0].retos[0].opciones = ["bicicleta", "reloj", "reloj"]; }],
  ["elemento inexistente", (c) => { c.niveles[0].retos[0].opciones = ["bicicleta", "reloj", "nube"]; }],
  ["sonido inexistente", (c) => { c.niveles[0].retos[0].sonido = "campanita"; }],
  ["animación desconocida", (c) => { c.niveles[0].retos[0].acierto.animacion = "gira"; }],
  ["fotogramas sin cuadros", (c) => { delete c.elementos.reloj.fotogramas; }],
  ["falta la voz de error en 3-4 reto 1", (c) => { delete c.niveles[0].retos[0].error; }],
  ["voz de error inventada", (c) => { c.niveles[1].retos[0].error = { voz: "zeus", texto: "¡Escucha otra vez!" }; }],
  ["demo con un elemento de los retos", (c) => { c.demo.opciones = ["vaca", "tren"]; }],
  ["demo cuya correcta no está en sus opciones", (c) => { c.demo.correcto = "pato"; }],
  ["cierre sin líneas", (c) => { c.niveles[1].cierre = []; }],
  ["sin insignia", (c) => { delete c.niveles[0].insignia; }],
  ["elemento sin imagen", (c) => { delete c.elementos.ventana.img; }],
  ["id de reto repetido", (c) => { c.niveles[0].retos[1].id = c.niveles[0].retos[0].id; }]
];
casos.forEach(([nombreCaso, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c, Sfx.ESTIMULOS).length > 0, "detecta: " + nombreCaso);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
