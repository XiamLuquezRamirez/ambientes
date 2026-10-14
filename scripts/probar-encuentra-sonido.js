/**
 * Pruebas de Encuentra el sonido: config alineada al documento + reglas de los retos.
 * Uso: node scripts/probar-encuentra-sonido.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/EncuentraElSonido");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.EncuentraSonidoLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.EncuentraSonidoSfx;
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

/** Compara sin tildes, signos ni mayúsculas (el documento escribe "MUY BIEN", "tu puedes"). */
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const docNorm = norm(doc);
const enDoc = (texto) => docNorm.includes(norm(texto));

const copia = () => JSON.parse(JSON.stringify(config));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");
const els = (r) => r.elementos.join();

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(!config.stub, "config sin stub (el catálogo no borra la carpeta)");
assert(config.accesibilidad.mostrarIntro === true, "demostración activa");
assert(enDoc(n34.titulo) && enDoc(n56.titulo), "nombre del juego de cada edad tomado del documento");

console.log("=== Textos literales del documento ===");
config.niveles.forEach((n) => {
  n.bienvenida.forEach((l) => assert(enDoc(l.texto), n.edad + " bienvenida en el documento: " + l.texto));
  assert(enDoc(n.cierre.texto), n.edad + " cierre en el documento: " + n.cierre.texto);
  n.retos.forEach((r) => {
    if (r.acierto.texto) assert(enDoc(r.acierto.texto), n.edad + " " + r.id + " acierto en el documento: " + r.acierto.texto);
    if (r.error) assert(enDoc(r.error.texto), n.edad + " " + r.id + " error en el documento: " + r.error.texto);
  });
});
assert(JSON.stringify(config.textos.conversacion) === JSON.stringify(n34.bienvenida), "saludo por defecto = el de 3-4");
config.niveles.forEach((n) => assert(n.bienvenida[0].personaje === 1 && n.bienvenida[1].personaje === 0, n.edad + ": saluda Zoe y sigue Zeus"));

console.log("=== 3-4 años ===");
const [a1, a2, a3, a4, a5] = n34.retos;
assert(n34.retos.every((r) => r.tipo === "buscar" && r.elementos.length === 3), "5 retos con 3 elementos en el escenario");
assert(els(a1) === "perro,carro,pajaro" && a1.correcto === "perro", "reto 1: perro, carro, pájaro; suena el ladrido");
assert(a1.acierto.repetir === "breve" && a1.acierto.sonido === "celebracion", "reto 1: ladrido corto y celebración");
assert(a1.error.anima === true && a1.error.voz === "zeus", "reto 1: animación de intento y Zeus 'Escucha otra vez'");
assert(els(a2) === "trompeta,pelota,gato" && a2.correcto === "trompeta", "reto 2: trompeta, pelota, gato; se busca la trompeta");
assert(config.elementos.trompeta.sonido === "trompeta", "reto 2: suena la trompeta (el documento dice campana por error)");
assert(a2.acierto.efecto === "pulso" && a2.acierto.repetir === "completo", "reto 2: la trompeta crece/decrece mientras suena");
assert(els(a3) === "pajaro,perro,bicicleta" && a3.correcto === "pajaro" && a3.acierto.repetir === "breve", "reto 3: pájaro, perro, bicicleta; canto breve");
assert(els(a4) === "paraguas,pelota,arbol" && a4.correcto === "paraguas", "reto 4: paraguas, pelota, árbol; se toca el paraguas");
assert(config.elementos.paraguas.sonido === "lluvia" && a4.acierto.voz === "zeus", "reto 4: suena la lluvia y felicita Zeus");
assert(els(a5) === "gato,carro,trompeta" && a5.correcto === "azar" && !a5.acierto.texto, "reto 5: gato, carro, trompeta; suena uno; celebran sin frase");
assert(n34.retos.every((r) => r.error && r.error.voz === "zeus"), "3-4: todos los errores los dice Zeus (sin señal negativa)");

console.log("=== 5-6 años ===");
const [b1, b2, b3, b4, b5] = n56.retos;
assert(n56.retos.map((r) => r.elementos.length).join() === "4,4,4,4,5", "4 elementos por reto y 5 en la misión final");
assert(els(b1) === "perro,gato,bicicleta,pandereta" && b1.correcto === "pandereta", "reto 1: perro, gato, bicicleta, pandereta; suena la pandereta");
assert(b2.tipo === "zonas" && b2.correcto === "campana", "reto 2: escenario por zonas, suena la campana");
assert(els(b3) === "campana,triangulo,maracas,pandereta" && b3.correcto === "maracas", "reto 3: campana, triángulo, maracas, pandereta; suenan las maracas");
assert(b4.tipo === "viajero" && b4.error.voz === "zoe", "reto 4: el sonido viajero; si falla, Zoe y se repite");
assert(b5.correcto === "azar" && b5.acierto.efecto === "final" && !b5.error, "reto 5: misión final sin frase de error");
assert(!b2.error && !b3.error, "retos 2 y 3: el documento no da frase de error");
assert(n56.insignia.nombre === "Explorador de sonidos", "insignia Explorador de sonidos");

console.log("=== Lógica: ubicación ===");
let repite = 0;
let fueraZona = 0;
let solapa = 0;
for (let k = 0; k < 400; k++) {
  config.niveles.forEach((n) => {
    let prev = null;
    n.retos.forEach((r) => {
      const obj = L.elegirCorrecto(r);
      const mapa = L.ubicar(r, obj, null, prev);
      if (prev && mapa[obj].region === prev) repite += 1;
      prev = mapa[obj].region;
      const ids = Object.keys(mapa);
      if (r.tipo === "zonas" && new Set(ids.map((id) => mapa[id].id)).size !== 4) fueraZona += 1;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          if (mapa[ids[i]].id === mapa[ids[j]].id) solapa += 1;
        }
      }
    });
  });
}
assert(repite === 0, "la respuesta nunca repite la zona del reto anterior (" + repite + ")");
assert(fueraZona === 0, "reto por zonas: un elemento en cada zona");
assert(solapa === 0, "dos elementos nunca comparten lugar");

/* Escenario 1280×720: ~868×534 px. Los centros deben separarse más que el tamaño del elemento + el desplazamiento. */
const escena = { w: 868, h: 534 };
[[3, 178, 6, 4], [4, 152, 6, 4], [5, 140, 6, 4]].forEach(([n, tam, jx, jy]) => {
  const cs = L.celdas(n);
  let minDx = Infinity;
  let minDy = Infinity;
  cs.forEach((a) => cs.forEach((b) => {
    if (a === b) return;
    if (a.y === b.y) minDx = Math.min(minDx, Math.abs(a.x - b.x) / 100 * escena.w);
    if (a.x === b.x) minDy = Math.min(minDy, Math.abs(a.y - b.y) / 100 * escena.h);
  }));
  assert(minDx - jx / 100 * escena.w >= tam, n + " elementos: no se tocan en horizontal (" + Math.round(minDx) + "px)");
  assert(minDy - jy / 100 * escena.h >= tam, n + " elementos: no se tocan en vertical (" + Math.round(minDy) + "px)");
  const abajo = Math.max(...cs.map((c) => c.y)) / 100 * escena.h + tam / 2 + jy / 200 * escena.h;
  assert(abajo <= escena.h - 60, n + " elementos: la fila de abajo no tapa el botón de escuchar");
});

let paradaMala = 0;
for (let k = 0; k < 300; k++) {
  const ocupadas = ["13-30", "62-70", "87-30"];
  const p = L.siguienteParada(4, ocupadas, "38-30");
  if (!p || ocupadas.includes(p.id) || p.id === "38-30") paradaMala += 1;
}
assert(paradaMala === 0, "el viajero solo va a lugares libres y distintos del actual");
assert(L.elegirCorrecto({ correcto: "azar", elementos: ["a", "b", "c"] }, () => 0.99) === "c", "azar elige entre los elementos");
assert(L.region({ x: 50, y: 70 }) === "abajo-centro" && L.region({ x: 13, y: 30 }) === "arriba-izq", "regiones del escenario");

console.log("=== Imágenes y sonidos ===");
Object.entries(config.elementos).forEach(([id, e]) => {
  [e.img, e.imgAlas, e.imgAbierto].filter(Boolean).forEach((img) => assert(fs.existsSync(path.join(dir, img)), id + ": imagen " + img + " existe"));
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
const usados = new Set();
config.niveles.forEach((n) => n.retos.forEach((r) => r.elementos.forEach((id) => usados.add(id))));
usados.add(config.demo.elemento);
Object.keys(config.elementos).forEach((id) => assert(usados.has(id), "elemento " + id + " se usa en algún reto"));
const efectos = new Set(["pop", "suave", "recompensa", "chispas"]);
config.niveles.forEach((n) => n.retos.forEach((r) => { if (r.acierto.sonido) efectos.add(r.acierto.sonido); }));
efectos.forEach((e) => assert(Sfx.EFECTOS.includes(e), "efecto " + e + " existe en sfx"));
assert(/id="btn-empecemos"[^>]*aria-label="Empezar"/.test(html) && /btn-empecemos[\s\S]*?fa-ear-listen/.test(html), "inicio: botón grande de escucha solo con icono");
assert((html.match(/class="inicio-el /g) || []).length === 3, "inicio: 3 elementos grandes en el escenario");
assert(html.includes("inicio-zoe") && html.includes("inicio-zeus"), "inicio: Zoe y Zeus");

console.log("=== Validador (casos negativos) ===");
const casos = [
  ["3-4 con 4 elementos", (c) => { c.niveles[0].retos[0].elementos.push("gato"); }],
  ["5-6 misión con 4", (c) => { c.niveles[1].retos[4].elementos.pop(); }],
  ["elemento inexistente", (c) => { c.niveles[0].retos[0].elementos[2] = "dragon"; }],
  ["correcto fuera del escenario", (c) => { c.niveles[0].retos[1].correcto = "perro"; }],
  ["3-4 sin voz de error", (c) => { delete c.niveles[0].retos[2].error; }],
  ["5-6 reto 2 con frase inventada", (c) => { c.niveles[1].retos[1].error = { voz: "zeus", texto: "No" }; }],
  ["viajero con error de Zeus", (c) => { c.niveles[1].retos[3].error.voz = "zeus"; }],
  ["demo dentro de un reto", (c) => { c.demo.elemento = "perro"; }],
  ["pájaro sin alas", (c) => { delete c.elementos.pajaro.imgAlas; }],
  ["paraguas sin abrir", (c) => { delete c.elementos.paraguas.imgAbierto; }],
  ["tipo cambiado", (c) => { c.niveles[1].retos[1].tipo = "buscar"; }],
  ["sin insignia", (c) => { delete c.niveles[1].insignia; }],
  ["voz inválida", (c) => { c.niveles[0].retos[0].acierto.voz = "max"; }],
];
casos.forEach(([nombre, mutar]) => {
  const c = copia();
  mutar(c);
  assert(L.validarConfig(c).length > 0, "validador rechaza: " + nombre);
});

console.log("\n" + oks + " OK, " + fails + " FAIL");
process.exit(fails ? 1 : 0);
