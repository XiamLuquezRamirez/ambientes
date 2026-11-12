const fs = require("fs");
const path = require("path");
const BASE = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/AsociaSonidoEImagen");
let bad = 0;
for (const g of fs.readdirSync(BASE)) {
  const html = path.join(BASE, g, "index.html");
  if (!fs.existsSync(html)) continue;
  const t = fs.readFileSync(html, "utf8");
  for (const m of t.matchAll(/src="(img\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(BASE, g, m[1]))) {
      console.log("BROKEN", g, m[1]);
      bad += 1;
    }
  }
}
console.log(bad ? bad + " broken" : "HTML img src ok");
process.exit(bad ? 1 : 0);
