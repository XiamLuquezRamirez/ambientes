/**
 * Pruebas de Completa la figura: config alineada al documento + reglas de encaje, regla, lluvia y lodo.
 * Uso: node scripts/probar-completa-figura.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/CompletaLaFigura");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.CompletaFiguraLogica;
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

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(config.niveles.map((n) => n.edad).join("|") === "3-4 años|5-6 años", "solo dos grupos: 3-4 y 5-6");
assert(config.niveles.map((n) => n.titulo).join("|") === "El Taller de Juguetes Mágicos|El Taller de Ingeniería y Calibración Mágica", "misiones del documento");

const imagenes = new Set();
Object.values(config.piezas).forEach((p) => imagenes.add(p.img));
const sumarReto = (r) => {
  r.capas.forEach((c) => imagenes.add(c.img));
  if (r.hueco.img) imagenes.add(r.hueco.img);
  if (r.fantasma) imagenes.add(r.fantasma);
};
sumarReto(config.demo);
config.niveles.forEach((n) => n.retos.forEach(sumarReto));
imagenes.forEach((img) => assert(fs.existsSync(path.join(dir, img)), "imagen existe: " + img));

const [n34, n56] = config.niveles;
assert(n34.retos.map((r) => r.figura).join(",") === "mariposa,carro,casa", "3-4: mariposa, carro, casa");
assert(n56.retos.map((r) => r.figura).join(",") === "mariposa,carro,casa", "5-6: mariposa, carro, casa");
assert(n34.retos.every((r) => r.opciones.length === 3), "3-4: tres piezas por reto");
assert(n56.retos.every((r) => r.opciones.length === 5), "5-6: cinco piezas por reto");
assert(n34.retos.map((r) => r.mecanica).join(",") === "encaje,lodo,encaje", "3-4: encaje, lodo, encaje");
assert(n56.retos.map((r) => r.mecanica).join(",") === "simetria,calibrador,clima", "5-6: simetría, calibrador, clima");
assert(n56.retos[0].mesa === "cinta" && n56.retos[1].mesa === "banco" && n56.retos[2].mesa === "cinta", "cinta, banco, cinta industrial");
assert(!n56.retos[0].arrastre, "simetría: se toca la pieza (no arrastre)");
assert(n56.retos[1].arrastre, "calibrador: arrastra o toca");
assert(n34.retos.every((r) => r.arrastre), "3-4: toca o arrastra");
assert(n34.retos[1].iman, "carro 3-4: la rueda actúa como imán");
assert(n56.reglas.reglaTrasErrores === 2, "regla tras 2 errores consecutivos");
assert(n34.premio.tipo === "trofeo" && n56.premio.tipo === "carnet", "trofeo 3-4 y carnet 5-6");
assert(n34.premio.nombre === "Gran Constructor del Taller", "trofeo del Gran Constructor del Taller");
assert(n56.premio.nombre === "Carnet de Ingeniero de Control de Calidad", "Carnet de Ingeniero de Control de Calidad");

console.log("=== Voces del documento ===");
const voz = (l) => l && l.voz;
assert(voz(n34.retos[0].presentacion) === "zoe" && voz(n34.retos[1].presentacion) === "zeus" && voz(n34.retos[2].presentacion) === "zoe", "3-4: Zoe, Zeus, Zoe presentan");
assert(voz(n34.retos[1].descubierta) === "zoe", "rueda descubierta: Zoe");
assert(voz(n56.retos[1].presentacion) === "zeus" && voz(n56.retos[1].acierto) === "zeus", "carro 5-6: Zeus presenta y celebra");
assert(n34.retos[0].acierto.texto === "¡Wooow! ¡Completaste la mariposa y ya puede volar!", "acierto mariposa literal");
assert(n56.retos[0].errores.ala_mec_pequena.texto === "¡Alerta de Desequilibrio! El ala es demasiado pequeña.", "alerta ala pequeña literal");
assert(Object.values(n56.retos[0].errores).every((e) => e.alerta), "simetría: todo error muestra alerta amarilla");
assert(!n34.retos[1].acierto.texto, "carro 3-4: el documento no tiene voz de acierto");

console.log("=== Respuestas derivadas del documento ===");
const err = (reto, id) => reto.errores[id];
const c34 = n34.retos[1];
const [m56, c56, h56] = n56.retos;
assert(err(c34, "estrella").texto === "Mmm, ¡esa es una estrella! Busca la rueda." && err(c34, "estrella").reaccion === "rebote", "estrella: plantilla y rebote del reto 1");
assert(err(c34, "flor").texto === "Mmm, ¡esa es una flor! Busca la rueda." && err(c34, "flor").reaccion === "rebote", "flor: plantilla y rebote del reto 1");
assert(err(m56, "hoja_ala").texto === "¡Alerta de Desequilibrio! La forma no coincide.", "hoja verde: la forma no coincide");
assert(err(m56, "ala_abeja").texto === "¡Alerta de Desequilibrio! El patrón de manchas no coincide.", "ala de abeja: el patrón de manchas no coincide");
["pelota", "circulo_plano"].forEach((id) => {
  assert(err(c56, id).texto === "¡Cuidado! La forma no coincide." && err(c56, id).reaccion === "rebote", id + ": rebota y la forma no coincide");
});
assert(err(h56, "techo_agudo").reaccion === "viento" && err(h56, "techo_agudo").texto === "¡Hay una falla! La forma no coincide.", "triángulo agudo: viento");
assert(err(h56, "techo_trapecio").reaccion === "filtra" && err(h56, "techo_trapecio").texto === "¡Hay una falla! La forma no coincide.", "trapecio: el agua se filtra");

console.log("=== Tamaños a escala ===");
config.niveles.forEach((n) => n.retos.forEach((r) => {
  const ok = config.piezas[r.correcta];
  assert(L.encajaExacto(r.hueco, ok), n.edad + " " + r.figura + ": la correcta mide lo mismo que el hueco");
  Object.entries(r.errores).forEach(([id, e]) => {
    if (e.tipo === "tamano") assert(!L.encajaExacto(r.hueco, config.piezas[id]), id + " es de otro tamaño");
  });
}));
assert(config.piezas.rueda_60.w > 44 && config.piezas.rueda_32.w < 44, "rueda grande y pequeña");
assert(config.piezas.techo_mod_ancho.w > 170 && config.piezas.techo_mod_pequeno.w < 170, "techo ancho y pequeño");
assert(config.piezas.ala_mec_pequena.h < 139, "ala pequeña");

console.log("=== Colocación ===");
const h = { x: 100, y: 50, w: 40, h: 60 };
const exacta = L.rectColocacion(h, { w: 40, h: 60 }, "hueco");
assert(exacta.x === 100 && exacta.y === 50, "pieza exacta ocupa el hueco");
const centro = L.rectColocacion(h, { w: 20, h: 20 }, "centro");
assert(centro.x === 110 && centro.y === 70, "centrada en el hueco");
const base = L.rectColocacion(h, { w: 20, h: 80 }, "base");
assert(base.y === 30 && base.x === 110, "apoyada en la base");
const izq = L.rectColocacion(h, { w: 30, h: 40 }, "izquierda");
assert(izq.x === 100 && izq.y === 60, "pegada al borde izquierdo (ala junto al cuerpo)");
const noExacta = L.rectColocacion(h, { w: 30, h: 60 }, "hueco");
assert(noExacta.x === 105, "ancla hueco con otra medida cae al centro");

console.log("=== Regla holográfica ===");
assert(L.medidaCm({ w: 170, h: 64 }, "ancho") === 43, "techo correcto 43 cm");
assert(L.medidaCm({ w: 230, h: 64 }, "ancho") === 58, "techo ancho 58 cm");
assert(L.medidaCm({ w: 80, h: 139 }, "alto") === 35, "ala 35 cm");
assert(L.medidaCm({ w: 60, h: 104 }, "alto") === 26, "ala pequeña 26 cm");
assert(!L.debeMostrarRegla({ consecutivos: 1 }, { reglaTrasErrores: 2 }), "1 error: sin regla");
assert(L.debeMostrarRegla({ consecutivos: 2 }, { reglaTrasErrores: 2 }), "2 errores consecutivos: regla");
assert(!L.debeMostrarRegla({ consecutivos: 5 }, undefined), "3-4: nunca hay regla");

console.log("=== Rampa ===");
assert(L.inclinacionRueda(44, 44) === 0, "rueda correcta no inclina");
assert(L.inclinacionRueda(44, 60) < 0, "rueda grande levanta el frente");
assert(L.inclinacionRueda(44, 32) > 0, "rueda pequeña baja el frente");
assert(Math.abs(L.inclinacionRueda(44, 500)) <= 14, "inclinación con tope");

console.log("=== Prueba de lluvia ===");
const r56 = n56.retos[2];
const paredes = r56.paredes;
const techoEn = (id) => {
  const p = config.piezas[id];
  const r = L.rectColocacion(r56.hueco, p, "base");
  return { x: r.x, y: r.y, w: r.w, h: r.h, forma: p.forma || "triangulo" };
};
const destinos = (id, filtra) => {
  const t = techoEn(id);
  const out = { resbala: 0, gotera: 0, afuera: 0, filtra: 0 };
  for (let x = 40; x <= 260; x += 2) out[L.destinoGota(x, t, paredes, filtra)] += 1;
  return out;
};
const dTrap = destinos("techo_trapecio", true);
assert(dTrap.filtra > 0 && dTrap.gotera === 0, "trapecio: el agua atraviesa la parte plana");
assert(destinos("techo_trapecio", false).filtra === 0, "sin reacción filtra no hay filtración");
assert(destinos("techo_mod", true).filtra === 0, "techo de dos aguas nunca filtra");
const dOk = destinos("techo_mod");
assert(dOk.gotera === 0 && dOk.resbala > 0, "techo correcto: no gotea dentro");
const dPeq = destinos("techo_mod_pequeno");
assert(dPeq.gotera > 0, "techo pequeño: entra agua por las esquinas");
const dAncho = destinos("techo_mod_ancho");
assert(dAncho.gotera === 0, "techo ancho no gotea (falla por viento)");
const trap = techoEn("techo_trapecio");
assert(L.yTecho(150, trap) === trap.y, "trapecio plano arriba");
const tri = techoEn("techo_mod");
assert(L.yTecho(150, tri) === tri.y && L.yTecho(tri.x, tri) === tri.y + tri.h, "triángulo: vértice arriba, aleros abajo");

console.log("=== Lodo y gestos ===");
assert(L.fraccionLimpia([0, 0, 255, 255], 40) === 0.5, "mitad limpia");
assert(L.fraccionLimpia([], 40) === 0, "sin datos: nada limpio");
assert(n34.retos[1].lodo.limpiezaMinima === 0.6, "se descubre al 60 %");
assert(L.clasificarGesto(3, 4) === "toque", "movimiento corto es toque");
assert(L.clasificarGesto(30, 0) === "arrastre", "movimiento largo es arrastre");
assert(L.cercaDe({ x: 0, y: 0 }, { x: 3, y: 4 }, 5) && !L.cercaDe({ x: 0, y: 0 }, { x: 6, y: 0 }, 5), "imán por radio");
const b = L.barajar([1, 2, 3, 4, 5], () => 0.5);
assert(b.length === 5 && [1, 2, 3, 4, 5].every((x) => b.includes(x)), "barajar conserva las piezas");

console.log("=== Validación detecta errores ===");
const roto = JSON.parse(JSON.stringify(config));
roto.niveles[0].retos[0].correcta = "sol";
assert(L.validarConfig(roto).some((e) => /correcta/.test(e)), "detecta correcta fuera de opciones");
const roto2 = JSON.parse(JSON.stringify(config));
delete roto2.niveles[1].retos[1].errores.rueda_60;
assert(L.validarConfig(roto2).some((e) => /rueda_60/.test(e)), "detecta distractor sin texto");
const roto3 = JSON.parse(JSON.stringify(config));
roto3.demo.figura = "mariposa";
assert(L.validarConfig(roto3).some((e) => /demostración/.test(e)), "detecta demo que regala la respuesta");
const roto4 = JSON.parse(JSON.stringify(config));
roto4.piezas.rueda_44.w = 46;
roto4.piezas.rueda_44.h = 46;
assert(L.validarConfig(roto4).some((e) => /no mide lo mismo/.test(e)), "detecta pieza correcta de otro tamaño");

console.log("\nOK=" + oks + " FAIL=" + fails);
process.exit(fails ? 1 : 0);
