const fs = require("fs");
const path = require("path");

const BASE = path.resolve(__dirname, "../public/catalogo_juegos/Multisensorial/AsociaSonidoEImagen");
const PORTADA = {
  QueSuena: ["bicicleta", "telefono", "reloj"],
  QueObjetoSuena: ["telefono", "avion", "aspiradora"],
  EscuchaYAsocia: ["reloj", "bicicleta", "tren"],
  UnSonidoDeViaje: ["avion", "tren", "ambulancia"],
  QueEscuchaste: ["tren", "telefono", "reloj"],
  SonidoYObjeto: ["puerta", "ventana", "cajon", "telefono"],
  SonidoDeUnaMaquina: ["aspiradora", "secador", "licuadora", "ventilador"],
  SonidoDeTransporte: ["ambulancia", "camion", "tren", "motocicleta"],
  SonidoDeUnaAccion: ["aplaudiendo", "corriendo", "saltando", "durmiendo"],
  SonidoDelAgua: ["pluma", "ducha", "fuente", "regadera"],
  LaGranAsociacion: ["reloj", "bicicleta", "puerta"],
};

for (const g of Object.keys(PORTADA)) {
  const dir = path.join(BASE, g);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
  const htmlPath = path.join(dir, "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  const items = PORTADA[g];
  const spans = items.map((id, i) => {
    let src = "";
    if (cfg.elementos[id] && cfg.elementos[id].img) src = cfg.elementos[id].img;
    else if (fs.existsSync(path.join(dir, "img", id + ".svg"))) src = "img/" + id + ".svg";
    const img = src
      ? '<img src="' + src + '" alt="" draggable="false">'
      : '<img alt="" draggable="false">';
    return "\t\t\t\t<span class=\"inicio-el ie" + (i + 1) + "\">" + img + "</span>";
  }).join("\n");
  const re = /<div class="inicio-elementos area-seleccion"[^>]*>[\s\S]*?<\/div>/;
  if (!re.test(html)) {
    console.log("NO BLOCK", g);
    continue;
  }
  html = html.replace(
    re,
    '<div class="inicio-elementos area-seleccion" aria-hidden="true">\n' + spans + "\n\t\t\t</div>"
  );
  fs.writeFileSync(htmlPath, html);
  console.log(g, "->", items.join(", "));
}
