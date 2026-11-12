/**
 * Mueve img/diseno/* → img/ en los juegos de Asocia y reescribe referencias.
 */
const fs = require("fs");
const path = require("path");

const BASE = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/AsociaSonidoEImagen");

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function rewriteText(file, replacer) {
  const before = fs.readFileSync(file, "utf8");
  const after = replacer(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    return true;
  }
  return false;
}

const games = fs.readdirSync(BASE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(BASE, d.name, "img", "diseno")))
  .map((d) => d.name);

for (const g of games) {
  const imgDir = path.join(BASE, g, "img");
  const disenoDir = path.join(imgDir, "diseno");
  const files = fs.readdirSync(disenoDir);
  let moved = 0;
  for (const name of files) {
    const from = path.join(disenoDir, name);
    const to = path.join(imgDir, name);
    if (fs.existsSync(to)) {
      // mismo nombre en raíz: el de diseno gana (arte nuevo)
      fs.unlinkSync(to);
    }
    fs.renameSync(from, to);
    moved += 1;
  }
  fs.rmdirSync(disenoDir);
  console.log(g + ": movidos " + moved + " → img/");

  // reescribir referencias locales
  const textFiles = walkFiles(path.join(BASE, g)).filter((f) =>
    /\.(js|json|html|css|md)$/i.test(f)
  );
  for (const f of textFiles) {
    rewriteText(f, (t) =>
      t
        .replace(/img\/diseno\//g, "img/")
        .replace(/var DISENO = 'img\/diseno\/';/g, "var DISENO = 'img/';")
        .replace(/var DISENO = \"img\/diseno\/\";/g, 'var DISENO = "img/";')
    );
  }
}

// portada compartida
const portada = path.join(BASE, "comun", "portada.js");
if (fs.existsSync(portada)) {
  rewriteText(portada, (t) =>
    t
      .replace(/img\/diseno\/<id>\.svg/g, "img/<id>.svg")
      .replace(/img\.src = 'img\/diseno\/' \+ id \+ '\.svg';/g, "img.src = 'img/' + id + '.svg';")
      .replace(/img\/diseno\//g, "img/")
  );
  console.log("comun/portada.js actualizado");
}

// scripts auxiliares del repo
for (const rel of [
  "scripts/podar-asocia-imagenes.js",
  "scripts/arreglar-portadas-asocia.js",
  "scripts/verificar-asocia-poda.js",
]) {
  const f = path.resolve(__dirname, "..", rel);
  if (!fs.existsSync(f)) continue;
  const changed = rewriteText(f, (t) =>
    t
      .replace(/img\/diseno\//g, "img/")
      .replace(/img\\\\diseno\\\\/g, "img\\\\")
      .replace(/"diseno"/g, (m, offset, s) => {
        // no tocar nombres de carpeta en lógica de walk si ya aplanamos —
        // sustituir paths de join('img','diseno')
        return m;
      })
      .replace(/path\.join\(dir,\s*["']img["'],\s*["']diseno["']/g, 'path.join(dir, "img"')
      .replace(/Join-Path \$\{?_\.FullName\}? ['\"]img\/diseno['\"]/g, "")
  );
  // arreglos específicos en podar/verificar
  let t = fs.readFileSync(f, "utf8");
  const before = t;
  t = t.replace(/img\/diseno\//g, "img/");
  t = t.replace(/path\.join\(dir, ["']img["'], ["']diseno["'], /g, 'path.join(dir, "img", ');
  t = t.replace(/path\.join\(dir, "img", "diseno", /g, 'path.join(dir, "img", ');
  t = t.replace(/rel\.startsWith\(["']img\/diseno\//g, 'rel.startsWith("img/__diseno_gone__/');
  // En podar: la rama diseno ya no aplica; simplificar a solo assetPaths
  if (f.endsWith("podar-asocia-imagenes.js")) {
    // extractDisenoFiles sigue siendo válido (archivos en img/)
    t = t.replace(
      /if \(rel\.startsWith\(["']img\/__diseno_gone__\/["']\)\) \{[\s\S]*?continue;\s*\}/,
      ""
    );
  }
  if (t !== before) {
    fs.writeFileSync(f, t, "utf8");
    console.log("script " + rel);
  } else if (changed) {
    console.log("script " + rel);
  }
}

console.log("Listo.");
