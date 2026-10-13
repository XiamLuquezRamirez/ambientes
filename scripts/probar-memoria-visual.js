/**
 * Pruebas de Memoria visual: config + 5 mecánicas + plantillas de texto.
 * Uso: node scripts/probar-memoria-visual.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/MemoriaVisual");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "retos.js"), "utf8"), sandbox);
const R = sandbox.MemoriaVisualRetos;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let oks = 0;
let fails = 0;
function assert(cond, msg) {
  if (cond) oks += 1;
  else {
    fails += 1;
    console.error("  FAIL " + msg);
  }
}
function igualesComoConjunto(a, b) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

console.log("=== Config ===");
const errores = R.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
Object.values(config.objetos).forEach((o) => {
  assert(fs.existsSync(path.join(dir, o.img)), "imagen existe: " + o.img);
});
assert(!Object.prototype.hasOwnProperty.call(config, "edad"), "sin clave raíz edad");
assert(config.niveles.map((n) => n.edad).join("|") === "3 años|4 años|5-6 años", "niveles 3 / 4 / 5-6");

console.log("=== Plantillas ===");
const t = (s, d) => R.plantilla(s, d);
assert(R.listaHablada(config, ["manzana", "pelota", "carro"]) === "la manzana... la pelota... ¡y el carro!", "lista hablada");
const errMochila = config.retos.mochila.textos.error.texto;
const ctxM = { mostrar: ["manzana", "pelota", "carro"], correcto: ["oso"] };
assert(t(errMochila, R.datosToque(config, ctxM, "pelota")) === "Mmm, la pelota sí la guardamos. ¡Busca el objeto nuevo!", "error femenino");
assert(t(errMochila, R.datosToque(config, ctxM, "carro")) === "Mmm, el carro sí lo guardamos. ¡Busca el objeto nuevo!", "error masculino");
assert(t(config.retos.mochila.textos.acierto.texto, R.datosReto(config, ctxM)) === "¡Fantástico! El oso no estaba en la mochila.", "acierto mochila (documento)");
assert(t(config.retos.mochila.textos.nombrarPrimero.texto, R.datosObjeto(config, "manzana")) === "Guardamos la manzana...", "nombrar primero");
assert(t(config.retos.mochila.textos.nombrarUltimo.texto, R.datosObjeto(config, "carro")) === "¡y el carro!", "nombrar último");
assert(!config.retos.mochila.textos.ocultamiento, "mochila sin frase de ocultamiento (el documento usa sonidos)");
const ctxH = { mostrar: ["pato", "dinosaurio", "tambor"], correcto: ["dinosaurio"] };
assert(t(config.retos.hoja.textos.acierto.texto, R.datosReto(config, ctxH)) === "¡Lo encontraste! Era el dinosaurio.", "acierto hoja (documento)");
assert(t(config.retos.desaparecido.textos.error.texto, {}) === "Ese objeto no estaba antes en la vitrina. ¡Piensa qué tesoro nos falta!", "error desaparecido (documento)");
assert(t(config.retos.desaparecido.textos.acierto.texto, R.datosReto(config, { mostrar: ["carro"], correcto: ["carro"] })) === "¡Rescataste el carro! ¡Eres un detective experto!", "acierto desaparecido");
assert(/^Mira qué piedras|qué piedras se encienden/.test(config.retos.caminito.textos.intro.texto) && !/flor|estrella/i.test(config.retos.caminito.textos.pregunta.texto), "caminito no nombra la secuencia");
assert(config.niveles.every((n) => n.premio && n.premio.img && fs.existsSync(path.join(dir, n.premio.img))), "cada nivel tiene premio con imagen");
// Un SVG con bytes Latin-1 (p. ej. «á» = 0xE1) sale como imagen rota en el navegador.
const utf8Estricto = new TextDecoder("utf-8", { fatal: true });
fs.readdirSync(path.join(dir, "img")).filter((f) => f.endsWith(".svg")).forEach((f) => {
  let valido = true;
  try { utf8Estricto.decode(fs.readFileSync(path.join(dir, "img", f))); } catch (e) { valido = false; }
  assert(valido, "SVG en UTF-8 válido: " + f);
});
assert(config.niveles.find((n) => n.id === "5").pista === "lupa", "5-6 años usa lupa de pista");
assert(["3", "4"].every((id) => config.niveles.find((n) => n.id === id).pista === "ninguna"), "3-4 años sin pista (documento)");
const ctxG = { mostrar: ["globo_rojo", "globo_amarillo", "globo_azul"], correcto: ["globo_verde"], original: "globo_amarillo" };
assert(t(config.retos.globos.textos.observacion.texto, R.datosReto(config, ctxG)) === "¡Mira los globos de Zeus! Rojo, amarillo y azul.", "observación globos");
assert(t(config.retos.globos.textos.acierto.texto, R.datosReto(config, ctxG)) === "¡Sí! Ese globo era amarillo y cambió a verde.", "acierto globos");
assert(t(config.retos.globos.textos.error.texto, R.datosToque(config, ctxG, "globo_rojo")) === "Ese globo no cambió, sigue siendo rojo. ¡Busca el color nuevo!", "error globos (documento)");
const ctxP = { mostrar: ["manzana", "pelota"], correcto: ["manzana", "pelota"] };
assert(t(config.retos.posiciones.textos.error.texto, R.datosToque(config, ctxP, "estrella")) === "La estrella sigue en su lugar. ¡Busca los dos que intercambiaron posiciones!", "error posiciones");

console.log("=== Contenido del documento ===");
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const TESOROS = ["manzana", "pelota", "carro", "oso", "estrella"];
const SEMILLAS = 2000;
for (const nivel of config.niveles) {
  const defs = R.resolverRetos(config, nivel);
  assert(defs.every((d) => d.fijo), "nivel " + nivel.id + ": todos los retos con contenido fijo");
  let intrusoAlFinal = 0;
  let pedestalAlFinal = 0;
  for (let s = 1; s <= SEMILLAS; s++) {
    const rng = R.crearRng(s * 104729 + Number(nivel.id));
    const sesion = R.crearSesion();
    const c = defs.map((def) => R.prepararReto(config, nivel, def, sesion, rng));
    const tag = "nivel " + nivel.id + " semilla " + s;
    const fallo = (cond, msg) => { if (!cond) assert(false, tag + ": " + msg); };
    if (nivel.id === "3" || nivel.id === "4") {
      const [mochila, hoja, globos, caminito] = c;
      fallo(igual(mochila.mostrar, ["manzana", "pelota", "carro"]) && igual(mochila.correcto, ["oso"]) &&
        igualesComoConjunto(mochila.desafio, ["manzana", "pelota", "carro", "oso"]), "mochila: manzana, pelota, carro + oso");
      if (mochila.desafio[mochila.desafio.length - 1] === "oso") intrusoAlFinal += 1;
      fallo(igual(hoja.mostrar, ["pato", "dinosaurio", "tambor"]) && igual(hoja.desafio, ["pato", null, "tambor"]) &&
        igual(hoja.correcto, ["dinosaurio"]) && igualesComoConjunto(hoja.opciones, ["dinosaurio", "carro", "oso"]), "hoja: tapa al dino; opciones dino, carro, oso");
      fallo(igual(globos.mostrar, ["globo_rojo", "globo_amarillo", "globo_azul"]) &&
        igual(globos.desafio, ["globo_rojo", "globo_verde", "globo_azul"]) && globos.original === "globo_amarillo", "globos: amarillo → verde");
      fallo(igual(caminito.mostrar, ["flor", "estrella", "manzana"]) && igual(caminito.orden, ["flor", "estrella"]), "caminito: flor y luego estrella");
    } else {
      const [vitrina, desaparecido, posiciones] = c;
      fallo(igual(vitrina.mostrar, TESOROS) && igual(vitrina.correcto, ["pez"]) &&
        igual(vitrina.desafio.filter((id) => id !== "pez"), TESOROS) && vitrina.desafio.length === 6, "vitrina: 5 tesoros en su pedestal + pez");
      if (vitrina.desafio[5] === "pez") pedestalAlFinal += 1;
      fallo(igual(desaparecido.mostrar, TESOROS) && igual(desaparecido.desafio, ["manzana", "pelota", null, "oso", "estrella"]) &&
        igualesComoConjunto(desaparecido.opciones, ["carro", "pez", "flor", "sol"]), "desaparecido: falta el carro; opciones carro, pez, flor, sol");
      fallo(igual(posiciones.desafio, ["manzana", "pelota", "oso", "carro", "estrella"]) &&
        igualesComoConjunto(posiciones.correcto, ["carro", "oso"]), "posiciones: carro y oso intercambiados");
    }
  }
  if (nivel.id !== "5") {
    assert(intrusoAlFinal / SEMILLAS < 0.01, "nivel " + nivel.id + ": el oso casi nunca queda al final (" + intrusoAlFinal + "/" + SEMILLAS + ")");
  } else {
    const frac = pedestalAlFinal / SEMILLAS;
    assert(Math.abs(frac - 1 / 6) < 0.04, "nivel 5: pedestal del pez uniforme (" + Math.round(frac * 100) + "% al final)");
  }
}
const contenido = (id) => JSON.stringify(R.resolverRetos(config, config.niveles.find((n) => n.id === id))
  .map((d) => [d.ref, d.fijo, d.opciones || null, d.largo || null, d.observacionMs]));
assert(contenido("3") === contenido("4"), "niveles 3 y 4 con el mismo contenido (documento 3-4 años)");

// Modo azar: hoy no lo usa ningún nivel; se prueba quitando `fijo` para que la mecánica no se rompa.
const configAzar = JSON.parse(JSON.stringify(config));
Object.values(configAzar.retos).forEach((r) => { delete r.fijo; });

console.log("=== Modo azar (sin contenido fijo) ===");
const PARTIDAS = 3000;
for (const nivel of configAzar.niveles) {
  const config = configAzar;
  const defs = R.resolverRetos(config, nivel);
  let intrusoAlFinal = 0;
  let intrusoTotal = 0;
  let conservaAlFinal = 0;
  let conservaTotal = 0;
  let distractorRepetido = 0;
  let distractorTotal = 0;
  let errorAzar = null;
  for (let s = 1; s <= PARTIDAS; s++) {
    const rng = R.crearRng(s * 7919 + Number(nivel.id));
    const sesion = R.crearSesion();
    const ctxs = [];
    try {
      for (const def of defs) {
        const antes = Object.assign({}, sesion.usados);
        const c = R.prepararReto(config, nivel, def, sesion, rng);
        c.usadosAntes = antes;
        c.def = def;
        ctxs.push(c);
      }
    } catch (e) {
      errorAzar = e.message;
      break;
    }
    for (const c of ctxs) {
      const tag = "nivel " + nivel.id + " " + c.def.ref + " semilla " + s;
      const n = c.def.cantidad || ((nivel.conjuntos || {})[c.def.conjunto] || {}).cantidad;
      if (s === 1) assert(c.mostrar.length === n, tag + ": muestra " + n);
      if (c.mecanica === "intruso") {
        const x = c.correcto[0];
        if (c.def.conservarOrden) {
          // Vitrina: los tesoros no cambian de pedestal; el intruso cae en cualquier posición.
          const sinIntruso = c.desafio.filter((id) => id !== x);
          if (sinIntruso.join("|") !== c.mostrar.join("|")) assert(false, tag + ": la vitrina debe conservar el orden");
          conservaTotal += 1;
          if (c.desafio[c.desafio.length - 1] === x) conservaAlFinal += 1;
        } else {
          intrusoTotal += 1;
          if (c.desafio[c.desafio.length - 1] === x) intrusoAlFinal += 1;
        }
        if (c.mostrar.includes(x) || !igualesComoConjunto(c.desafio, c.mostrar.concat([x]))) {
          assert(false, tag + ": intruso inválido");
        }
      } else if (c.mecanica === "oculto") {
        const x = c.correcto[0];
        const dist = c.opciones.filter((id) => id !== x);
        const ok = c.mostrar.includes(x) && c.desafio[c.indice] === null &&
          c.opciones.filter((id) => id === x).length === 1 &&
          dist.every((id) => !c.mostrar.includes(id)) &&
          c.opciones.length === (c.def.opciones || 3);
        if (!ok) assert(false, tag + ": oculto inválido");
        dist.forEach((id) => {
          distractorTotal += 1;
          if (c.usadosAntes[id]) distractorRepetido += 1;
        });
      } else if (c.mecanica === "transformacion") {
        const dif = c.desafio.map((id, i) => (id !== c.mostrar[i] ? i : -1)).filter((i) => i >= 0);
        if (dif.length !== 1 || c.mostrar.includes(c.correcto[0]) || c.original !== c.mostrar[dif[0]]) {
          assert(false, tag + ": transformación inválida");
        }
      } else if (c.mecanica === "secuencia") {
        const ok = c.orden.length === c.def.largo && new Set(c.orden).size === c.orden.length &&
          c.orden.every((id) => c.mostrar.includes(id));
        if (!ok) assert(false, tag + ": secuencia inválida");
      } else if (c.mecanica === "intercambio") {
        const dif = c.desafio.map((id, i) => (id !== c.mostrar[i] ? i : -1)).filter((i) => i >= 0);
        const ok = dif.length === 2 && c.desafio[dif[0]] === c.mostrar[dif[1]] && c.desafio[dif[1]] === c.mostrar[dif[0]] &&
          igualesComoConjunto(c.correcto, [c.mostrar[dif[0]], c.mostrar[dif[1]]]);
        if (!ok) assert(false, tag + ": intercambio inválido");
      }
    }
    if (nivel.id === "5") {
      const [a, b, c] = ctxs;
      if (!(igualesComoConjunto(a.mostrar, b.mostrar) && igualesComoConjunto(b.mostrar, c.mostrar))) {
        assert(false, "nivel 5 semilla " + s + ": los 5 tesoros deben ser los mismos en las 3 misiones");
      }
    }
  }
  assert(errorAzar === null, "nivel " + nivel.id + ": sin pools insuficientes (" + errorAzar + ")");
  if (intrusoTotal > 0) {
    assert(intrusoAlFinal / intrusoTotal < 0.01, "nivel " + nivel.id + ": intruso casi nunca al final (" + intrusoAlFinal + "/" + intrusoTotal + ")");
  }
  if (conservaTotal > 0) {
    const frac = conservaAlFinal / conservaTotal;
    const esperado = 1 / (((nivel.conjuntos || {}).tesoros || {}).cantidad + 1);
    assert(Math.abs(frac - esperado) < 0.04, "nivel " + nivel.id + ": pedestal del intruso uniforme (" + Math.round(frac * 100) + "% al final)");
  }
  assert(intrusoTotal + conservaTotal > 0, "nivel " + nivel.id + ": tiene reto de intruso");
  const pct = distractorTotal ? Math.round((100 * distractorRepetido) / distractorTotal) : 0;
  console.log("  nivel " + nivel.id + ": " + PARTIDAS + " partidas; distractores ya vistos en la sesión: " + pct + "%");
}

console.log("\nOK=" + oks + " FAIL=" + fails);
process.exit(fails ? 1 : 0);
