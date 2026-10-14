// Cruza las frases entre comillas de docs/requerimientos.md con el código de cada juego Multisensorial.
const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..", "public", "catalogo_juegos", "Multisensorial");
const normalizar = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[¡!¿?.,;:"“”…()]/g, " ").replace(/\s+/g, " ").trim();

for (const juego of fs.readdirSync(base)) {
    const md = path.join(base, juego, "docs", "requerimientos.md");
    if (!fs.existsSync(md)) continue;
    const codigo = ["config.json", "script.js", "logica.js", "index.html"]
        .map((f) => path.join(base, juego, f))
        .filter(fs.existsSync)
        .map((f) => fs.readFileSync(f, "utf8"))
        .join("\n");
    const codigoN = normalizar(codigo.replace(/\\"/g, '"'));
    const frases = [...fs.readFileSync(md, "utf8").matchAll(/"([^"\n]{25,})"/g)].map((m) => m[1]);
    const faltan = frases.filter((f) => !codigoN.includes(normalizar(f)));
    console.log(`\n== ${juego}: ${frases.length - faltan.length}/${frases.length} frases presentes`);
    faltan.forEach((f) => console.log("   FALTA: " + f));
}
