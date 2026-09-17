/**
 * Valida laberintos-fijos.json (ortogonal, cruces, anclas, extremos, callejones).
 * Uso: node scripts/validar-laberintos-fijos.js
 */
const fs = require("fs");
const path = require("path");

const archivo = path.join(
  __dirname,
  "../public/catalogo_juegos/Polimotor/LaberintosDeCoordinacion/laberintos-fijos.json"
);

const reglas = {
  "3": { cantidad: 10, pick: 3, girosMin: 3, distractoresMin: 3, margen: 10, startMax: 16, endMin: 84 },
  "4": { cantidad: 10, pick: 4, girosMin: 5, distractoresMin: 4, margen: 8, startMax: 14, endMin: 86 },
  "5": { cantidad: 10, pick: 5, girosMin: 7, distractoresMin: 5, margen: 7, startMax: 14, endMin: 86 },
};

let fallos = 0;
let oks = 0;

function ok(msg) {
  oks++;
  console.log("[OK]  " + msg);
}
function fail(msg) {
  fallos++;
  console.log("[FAIL] " + msg);
}

function mismo(a, b, tol) {
  const t = tol == null ? 0.01 : tol;
  return Math.abs(a[0] - b[0]) < t && Math.abs(a[1] - b[1]) < t;
}

function ortogonal(a, b) {
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  return (dx < 0.01 && dy >= 8) || (dy < 0.01 && dx >= 8);
}

function contarGiros(path) {
  if (!path || path.length < 3) return 0;
  let g = 0;
  for (let i = 1; i < path.length - 1; i++) {
    const ax = path[i][0] - path[i - 1][0];
    const ay = path[i][1] - path[i - 1][1];
    const bx = path[i + 1][0] - path[i][0];
    const by = path[i + 1][1] - path[i][1];
    if (Math.abs(ax * by - ay * bx) > 0.01) g++;
  }
  return g;
}

function segmentoCruza(a1, a2, b1, b2) {
  const aH = a1[1] === a2[1];
  const bH = b1[1] === b2[1];
  if (aH === bH) {
    if (aH) {
      if (a1[1] !== b1[1]) return false;
      const a0 = Math.min(a1[0], a2[0]);
      const a1x = Math.max(a1[0], a2[0]);
      const b0 = Math.min(b1[0], b2[0]);
      const b1x = Math.max(b1[0], b2[0]);
      return Math.min(a1x, b1x) - Math.max(a0, b0) > 1;
    }
    if (a1[0] !== b1[0]) return false;
    const a0 = Math.min(a1[1], a2[1]);
    const a1y = Math.max(a1[1], a2[1]);
    const b0 = Math.min(b1[1], b2[1]);
    const b1y = Math.max(b1[1], b2[1]);
    return Math.min(a1y, b1y) - Math.max(a0, b0) > 1;
  }
  const h = aH ? [a1, a2] : [b1, b2];
  const v = aH ? [b1, b2] : [a1, a2];
  const y = h[0][1];
  const x = v[0][0];
  const h0 = Math.min(h[0][0], h[1][0]);
  const h1 = Math.max(h[0][0], h[1][0]);
  const v0 = Math.min(v[0][1], v[1][1]);
  const v1 = Math.max(v[0][1], v[1][1]);
  if (x <= h0 + 0.5 || x >= h1 - 0.5) return false;
  if (y <= v0 + 0.5 || y >= v1 - 0.5) return false;
  return true;
}

function pathSeCruza(path) {
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = i + 2; j < path.length - 1; j++) {
      if (i === 0 && j === path.length - 2) continue;
      if (segmentoCruza(path[i], path[i + 1], path[j], path[j + 1])) return true;
    }
  }
  return false;
}

function enVertices(path, p) {
  return path.some((q) => mismo(q, p));
}

function enCamino(path, p) {
  if (enVertices(path, p)) return true;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (a[0] === b[0] && Math.abs(p[0] - a[0]) < 0.01) {
      const lo = Math.min(a[1], b[1]);
      const hi = Math.max(a[1], b[1]);
      if (p[1] >= lo - 0.01 && p[1] <= hi + 0.01) return true;
    }
    if (a[1] === b[1] && Math.abs(p[1] - a[1]) < 0.01) {
      const lo = Math.min(a[0], b[0]);
      const hi = Math.max(a[0], b[0]);
      if (p[0] >= lo - 0.01 && p[0] <= hi + 0.01) return true;
    }
  }
  return false;
}

function ramaCruzaPath(rama, path) {
  const ancla = rama[0];
  for (let i = 1; i < rama.length; i++) {
    for (let j = 0; j < path.length - 1; j++) {
      const c = path[j];
      const d = path[j + 1];
      if (i === 1 && (mismo(c, ancla) || mismo(d, ancla) || enCamino([c, d], ancla))) continue;
      if (segmentoCruza(rama[i - 1], rama[i], c, d)) return true;
    }
  }
  return false;
}

function validarPoly(nombre, poly, margen) {
  if (!Array.isArray(poly) || poly.length < 2) {
    fail(nombre + ": polilínea corta");
    return false;
  }
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      fail(nombre + ": punto inválido #" + i);
      return false;
    }
    if (p[0] < margen - 2 || p[0] > 100 - margen + 2 || p[1] < margen - 2 || p[1] > 100 - margen + 2) {
      fail(nombre + ": punto fuera de margen " + JSON.stringify(p));
      return false;
    }
  }
  for (let i = 0; i < poly.length - 1; i++) {
    if (!ortogonal(poly[i], poly[i + 1])) {
      fail(nombre + ": segmento no ortogonal/corto " + JSON.stringify(poly[i]) + "→" + JSON.stringify(poly[i + 1]));
      return false;
    }
  }
  return true;
}

function validarLab(edad, lab, reg) {
  const id = lab.id || "?";
  const tag = "edad" + edad + "/" + id;
  if (!validarPoly(tag + ".path", lab.path, reg.margen)) return;
  if (lab.path[0][0] > reg.startMax) {
    fail(tag + ": inicio muy a la derecha x=" + lab.path[0][0]);
    return;
  }
  if (lab.path[lab.path.length - 1][0] < reg.endMin) {
    fail(tag + ": meta muy a la izquierda x=" + lab.path[lab.path.length - 1][0]);
    return;
  }
  if (pathSeCruza(lab.path)) {
    fail(tag + ": camino principal se cruza");
    return;
  }
  const giros = contarGiros(lab.path);
  if (giros < reg.girosMin) {
    fail(tag + ": giros=" + giros + " < " + reg.girosMin);
    return;
  }
  const dists = lab.distractores || [];
  if (dists.length < reg.distractoresMin) {
    fail(tag + ": distractores=" + dists.length + " < " + reg.distractoresMin);
    return;
  }
  for (let d = 0; d < dists.length; d++) {
    const rama = dists[d];
    const rtag = tag + ".d" + (d + 1);
    if (!validarPoly(rtag, rama, reg.margen)) return;
    if (!enCamino(lab.path, rama[0])) {
      fail(rtag + ": ancla no está sobre el camino " + JSON.stringify(rama[0]));
      return;
    }
    const punta = rama[rama.length - 1];
    if (enVertices(lab.path, punta)) {
      fail(rtag + ": punta cae en vértice del camino");
      return;
    }
    if (ramaCruzaPath(rama, lab.path)) {
      fail(rtag + ": cruza el camino principal");
      return;
    }
    for (let e = 0; e < d; e++) {
      const otra = dists[e];
      for (let i = 1; i < rama.length; i++) {
        for (let j = 1; j < otra.length; j++) {
          if (segmentoCruza(rama[i - 1], rama[i], otra[j - 1], otra[j])) {
            // permitir solo si comparten ancla en T distinta — rechazar solapes fuertes
            if (!(mismo(rama[0], otra[0]) && i === 1 && j === 1)) {
              fail(rtag + ": cruza distractor d" + (e + 1));
              return;
            }
          }
        }
      }
    }
  }
  ok(tag + " giros=" + giros + " ramas=" + dists.length);
}

if (!fs.existsSync(archivo)) {
  console.error("No existe " + archivo);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(archivo, "utf8"));
for (const edad of ["3", "4", "5"]) {
  const reg = reglas[edad];
  const lista = data[edad];
  if (!Array.isArray(lista) || lista.length !== reg.cantidad) {
    fail("edad " + edad + ": se esperaban " + reg.cantidad + " laberintos, hay " + (lista && lista.length));
    continue;
  }
  const ids = new Set();
  for (const lab of lista) {
    if (!lab.id || ids.has(lab.id)) fail("edad " + edad + ": id duplicado/faltante " + (lab && lab.id));
    ids.add(lab.id);
    validarLab(edad, lab, reg);
  }
  ok("edad " + edad + ": pool=" + lista.length + " (partida toma " + reg.pick + ")");
}

console.log("\n========== RESUMEN ==========");
console.log("OK: " + oks);
console.log("FAIL: " + fallos);
process.exit(fallos ? 1 : 0);
