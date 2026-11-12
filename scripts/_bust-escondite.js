const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/EncuentraElSonido");
function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (e.name === "index.html") a.push(p);
  }
  return a;
}
let n = 0;
for (const f of walk(ROOT)) {
  let c = fs.readFileSync(f, "utf8");
  let x = c.replace(/escondite\.js\?v=[^"']+/g, "escondite.js?v=20261111piel");
  if (x !== c) {
    fs.writeFileSync(f, x);
    n++;
    console.log(path.relative(ROOT, f));
  }
}
console.log("n", n);
