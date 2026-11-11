/**
 * Copia el arte diseñado (QueSuena / QueObjetoSuena / EscuchaYAsocia)
 * a los juegos del eje que aún tienen SVG plano o distinto.
 * Luego actualiza config.img y CON_DISENO de portada.
 *
 * Uso: node scripts/replicar-arte-auditivo.js [--dry]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial");
const REPORT = path.resolve(__dirname, "../docs/informe-arte-percepcion-auditiva.json");

function ensureReport() {
  execFileSync(process.execPath, [path.resolve(__dirname, "informe-arte-auditivo.js")], {
    stdio: "inherit",
  });
}

ensureReport();
const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));

let copied = 0;
let skipped = 0;
let configTouches = 0;
const byGame = {};

for (const [id, meta] of Object.entries(report.matrizReplicacion || {})) {
  const srcAbs = path.join(ROOT, meta.archivo);
  if (!fs.existsSync(srcAbs)) {
    console.warn("SKIP fuente inexistente", meta.archivo);
    continue;
  }
  const buf = fs.readFileSync(srcAbs);
  for (const dest of meta.juegosDestino) {
    const gameDir = path.join(ROOT, dest);
    const imgDir = path.join(gameDir, "img");
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
    const destRel = "img/" + id + ".svg";
    const destAbs = path.join(gameDir, destRel);
    const same = fs.existsSync(destAbs) && fs.readFileSync(destAbs).equals(buf);
    if (same) {
      skipped += 1;
    } else {
      if (!DRY) fs.writeFileSync(destAbs, buf);
      copied += 1;
      byGame[dest] = byGame[dest] || { copied: [], ids: [] };
      byGame[dest].copied.push(id);
    }
    byGame[dest] = byGame[dest] || { copied: [], ids: [] };
    if (!byGame[dest].ids.includes(id)) byGame[dest].ids.push(id);

    // config.elementos[id].img → img/<id>.svg
    const cfgPath = path.join(gameDir, "config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (cfg.elementos && cfg.elementos[id]) {
        const before = cfg.elementos[id].img;
        if (before !== destRel) {
          cfg.elementos[id].img = destRel;
          // El arte de diseño es un solo fotograma: quitar fotogramas legacy si apuntan a planos
          if (Array.isArray(cfg.elementos[id].fotogramas)) {
            const keep = cfg.elementos[id].fotogramas.filter((f) => {
              const abs = path.join(gameDir, f);
              return fs.existsSync(abs) && fs.statSync(abs).size >= 8000;
            });
            if (keep.length) cfg.elementos[id].fotogramas = keep;
            else delete cfg.elementos[id].fotogramas;
          }
          if (!DRY) fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
          configTouches += 1;
          console.log((DRY ? "[dry] " : "") + dest + ": " + id + " img " + before + " → " + destRel);
        }
      }
    }
    if (!same) console.log((DRY ? "[dry] " : "") + "copy " + id + " → " + dest + "/" + destRel);
  }
}

// Ampliar CON_DISENO en portada para juegos Asocia que ya tienen esos SVG de diseño
const PORTADA_ITEMS = {
  QueEscuchaste: ["tren", "telefono", "reloj"],
  UnSonidoDeViaje: ["avion", "tren", "ambulancia"],
  SonidoYObjeto: ["puerta", "ventana", "cajon", "telefono"],
  SonidoDeUnaMaquina: ["aspiradora", "secador", "licuadora", "ventilador"],
  SonidoDeTransporte: ["ambulancia", "camion", "tren", "motocicleta"],
  SonidoDeUnaAccion: ["aplaudiendo", "corriendo", "saltando", "durmiendo"],
  SonidoDelAgua: ["pluma", "ducha", "fuente", "regadera"],
  LaGranAsociacion: ["reloj", "bicicleta", "puerta"],
  QueSuena: ["bicicleta", "telefono", "reloj", "avion", "tren", "vaca", "gallo"],
  QueObjetoSuena: ["bicicleta", "telefono", "reloj", "avion", "tren", "vaca", "gallo", "aspiradora"],
  EscuchaYAsocia: ["bicicleta", "telefono", "reloj", "avion", "tren", "vaca", "gallo", "ambulancia"],
};

const CATALOG = new Set(report.catalogoObjetos || []);
const portadaPath = path.join(ROOT, "AsociaSonidoEImagen", "comun", "portada.js");
let portada = fs.readFileSync(portadaPath, "utf8");
const conDiseno = {};
for (const [juego, items] of Object.entries(PORTADA_ITEMS)) {
  const designed = items.filter((id) => {
    if (!CATALOG.has(id)) return false;
    const p = path.join(ROOT, "AsociaSonidoEImagen", juego, "img", id + ".svg");
    // tras copiar (o dry: asumimos que existirá)
    return DRY ? true : fs.existsSync(p) && fs.statSync(p).size >= 8000;
  });
  // también incluir todos los del catálogo que el juego tenga en img/ grandes
  const imgDir = path.join(ROOT, "AsociaSonidoEImagen", juego, "img");
  if (fs.existsSync(imgDir)) {
    for (const id of CATALOG) {
      const p = path.join(imgDir, id + ".svg");
      if (fs.existsSync(p) && fs.statSync(p).size >= 8000 && !designed.includes(id)) designed.push(id);
    }
  }
  if (designed.length) conDiseno[juego] = designed.sort();
}

const block =
  "    var CON_DISENO = {\n" +
  Object.keys(conDiseno)
    .sort()
    .map((j) => "        " + j + ": [" + conDiseno[j].map((id) => "'" + id + "'").join(", ") + "]")
    .join(",\n") +
  "\n    };";

portada = portada.replace(/var CON_DISENO = \{[\s\S]*?\n    \};/, block);
if (!DRY) fs.writeFileSync(portadaPath, portada, "utf8");
console.log((DRY ? "[dry] " : "") + "portada CON_DISENO actualizado:", Object.keys(conDiseno).join(", "));

console.log("\nResumen:", DRY ? "DRY" : "APPLY");
console.log("  archivos copiados:", copied);
console.log("  ya iguales (skip):", skipped);
console.log("  configs tocados:", configTouches);
console.log("  juegos:", Object.keys(byGame).length);

if (!DRY) {
  execFileSync(process.execPath, [path.resolve(__dirname, "arreglar-portadas-asocia.js")], { stdio: "inherit" });
  execFileSync(process.execPath, [path.resolve(__dirname, "informe-arte-auditivo.js")], { stdio: "inherit" });
  const after = JSON.parse(fs.readFileSync(REPORT, "utf8"));
  console.log("\nInforme actualizado:");
  console.log("  replicables restantes:", after.resumenGlobal.idsReplicablesDesdeFuentes.length, after.resumenGlobal.idsReplicablesDesdeFuentes.join(", ") || "—");
  console.log("  faltan diseñar:", after.resumenGlobal.idsFaltaDisenar.length);
}
