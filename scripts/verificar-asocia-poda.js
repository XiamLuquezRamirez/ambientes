const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BASE = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/AsociaSonidoEImagen");
const games = fs.readdirSync(BASE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !["comun", "docs"].includes(d.name))
  .map((d) => d.name);

let fails = 0;
for (const g of games) {
  const dir = path.join(BASE, g);
  const s = { window: null };
  s.window = s;
  vm.createContext(s);
  vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), s);
  let estimulos = null;
  try {
    vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), s);
    estimulos = s.AsociaSonidoSfx && s.AsociaSonidoSfx.ESTIMULOS;
  } catch (e) { /* sin sfx local */ }
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
  const err = s.AsociaSonidoLogica.validarConfig(cfg, estimulos);
  const missing = [];
  for (const id of Object.keys(cfg.elementos)) {
    const e = cfg.elementos[id];
    if (e.img && !fs.existsSync(path.join(dir, e.img))) missing.push(e.img);
    for (const f of e.fotogramas || []) {
      if (!fs.existsSync(path.join(dir, f))) missing.push(f);
    }
  }
  for (const n of cfg.niveles || []) {
    if (n.insignia && n.insignia.img && !fs.existsSync(path.join(dir, n.insignia.img))) {
      missing.push(n.insignia.img);
    }
  }
  // diseno assets still needed by motors
  const motors = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !["script.js", "logica.js", "sfx.js"].includes(f));
  const motorSrc = motors.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  const disenoMissing = [];
  if (/\bDISENO\b/.test(motorSrc)) {
    const names = new Set();
    for (const m of motorSrc.matchAll(/['"]([A-Za-z0-9_.-]+\.(?:svg|png))['"]/g)) names.add(m[1]);
    if (/['"]mariposa['"]\s*\+\s*i/.test(motorSrc)) for (let i = 1; i <= 5; i++) names.add("mariposa" + i + ".svg");
    for (const m of motorSrc.matchAll(/id:\s*['"](nube\d+|sol)['"]/g)) names.add(m[1] + ".png");
    for (const n of names) {
      const p = path.join(dir, "img", n);
      if (!fs.existsSync(p)) disenoMissing.push("img/" + n);
    }
  }
  const ok = err.length === 0 && missing.length === 0 && disenoMissing.length === 0;
  if (!ok) fails += 1;
  console.log(
    g +
      ": elems=" +
      Object.keys(cfg.elementos).length +
      " validar=" +
      (err.length ? err.length + "err" : "ok") +
      " missing=" +
      missing.length +
      " disenoMissing=" +
      disenoMissing.length
  );
  err.slice(0, 5).forEach((e) => console.log("  CFG", e));
  missing.forEach((m) => console.log("  FILE", m));
  disenoMissing.forEach((m) => console.log("  DISENO", m));
}
process.exit(fails ? 1 : 0);
