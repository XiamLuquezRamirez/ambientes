/**
 * Genera las piezas SVG de Zeus para "El Espejo de las Posiciones y Lateralidad".
 * Salida: public/catalogo_juegos/Polimotor/EspejoDeLasPosiciones/img/{cabeza,tronco,brazo_izq,brazo_der,pierna_izq,pierna_der}.svg
 * Uso: node scripts/generar-svg-espejo-posiciones.js
 *
 * Formato que lee muneco.js:
 *   - Pivote en (0,0): cuello (cabeza), pecho (tronco), hombro (brazos) o cadera (piernas).
 *   - Formas de color con class="m-piel|m-camiseta|m-short|m-pelo|m-media|m-zapato" dentro de g.base
 *     (el juego las repite engrosadas como contorno, así codo y rodilla giran sin cortes).
 *   - Detalles (ribetes, pulsera, cara…) dentro de g.detalle.
 *   - Extremidades: g#arriba[data-largo] (brazo/muslo) y g#abajo (antebrazo+mano / pierna+zapato).
 *     g#abajo trae translate(0,largo) solo para que el archivo se vea armado al abrirlo.
 * Medidas ligadas a postura.js (ESQUELETO): brazo 50 + 48, pierna 56 + 50,
 * hombros del tronco en (±42,-46), caderas en (±18,64), cuello en (0,-64).
 */
const fs = require("fs");
const path = require("path");

const salida = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "EspejoDeLasPosiciones", "img");
fs.mkdirSync(salida, { recursive: true });

const C = {
    piel: "#f3c6b6",
    pielSombra: "#e5a796",
    pielLinea: "#c98a7a",
    camiseta: "#2f8f70",
    camisetaSombra: "#24735a",
    ribete: "#8fd07f",
    short: "#0a5677",
    shortSombra: "#06405a",
    pelo: "#7d3f1b",
    peloSombra: "#5b2c11",
    media: "#ffffff",
    mediaRaya: "#d5dbe3",
    zapato: "#2f8f70",
    zapatoSombra: "#24735a",
    suela: "#ffffff",
    mejilla: "#f29a8e",
    boca: "#a9443a",
    lado: {
        izq: { color: "#ffd43b", borde: "#d9a400" },
        der: { color: "#51cf66", borde: "#2b9a44" }
    }
};

const SEP6 = "\n      ";
const r = (n) => Math.round(n * 100) / 100;
/** Espeja en x una lista de puntos "x,y" con el signo dado. */
const px = (s, x, y) => r(s * x) + "," + r(y);

// ------------------------------------------------------------------ brazo

function brazo(lado) {
    const s = lado === "der" ? 1 : -1; // pulgar hacia el centro del cuerpo (+x en el derecho)
    const L = C.lado[lado];
    const arribaBase = [
        // Piel del brazo, se afina hacia el codo y termina redonda.
        `<path class="m-piel" fill="${C.piel}" d="M-9.8,8 C-10,22 -9.4,38 -8.6,50 A8.6,8.6 0 0 0 8.6,50 C9.4,38 10,22 9.8,8 Z"/>`,
        // Manga: tapa redonda en el hombro (cubre la unión con el tronco en cualquier giro).
        `<path class="m-camiseta" fill="${C.camiseta}" d="M-14.6,0 A14.6,14.6 0 0 1 14.6,0 C14.4,8 13.6,15 12.6,21 Q0,25.5 -12.6,21 C-13.6,15 -14.4,8 -14.6,0 Z"/>`
    ];
    const arribaDetalle = [
        `<path fill="${C.ribete}" d="M-12.9,17 Q0,21.5 12.9,17 L12.6,21 Q0,25.5 -12.6,21 Z"/>`,
        `<path fill="none" stroke="${C.camisetaSombra}" stroke-width="2.4" stroke-linecap="round" opacity=".55" d="M${r(-s * 7)},-6 Q${r(-s * 10)},6 ${r(-s * 9)},15"/>`,
        `<path fill="none" stroke="${C.pielSombra}" stroke-width="2" stroke-linecap="round" d="M${r(-s * 6)},34 Q${r(-s * 7)},42 ${r(-s * 5)},48"/>`
    ];
    // Antebrazo + mano en forma de mitón con el pulgar hacia el centro.
    const abajoBase = [
        `<circle class="m-piel" fill="${C.piel}" cx="0" cy="0" r="8.6"/>`,
        `<path class="m-piel" fill="${C.piel}" d="M-8.6,0 C-8.4,14 -8,28 -7.6,38 L7.6,38 C8,28 8.4,14 8.6,0 Z"/>`,
        `<path class="m-piel" fill="${C.piel}" d="M${px(s, 5.5, 38)} Q${px(s, 14.5, 39)} ${px(s, 13.5, 47)} Q${px(s, 12.5, 52.5)} ${px(s, 7, 50)} Z"/>`,
        `<path class="m-piel" fill="${C.piel}" d="M-8.4,37 C-10.6,44 -10.4,52 -7.6,56.5 Q-3.6,61.5 0,61.5 Q3.6,61.5 7.6,56.5 C10.4,52 10.6,44 8.4,37 Z"/>`
    ];
    const abajoDetalle = [
        `<rect x="-8.9" y="29.5" width="17.8" height="7.2" rx="3" fill="${L.color}" stroke="${L.borde}" stroke-width="1.4"/>`,
        `<path fill="none" stroke="${C.pielLinea}" stroke-width="1.4" stroke-linecap="round" opacity=".75" d="M-3.6,53.5 L-3.6,59 M0.4,54 L0.4,60 M4.2,53.5 L4.2,58.5"/>`,
        `<path fill="none" stroke="${C.pielLinea}" stroke-width="1.4" stroke-linecap="round" opacity=".7" d="M${px(s, 7, 44.5)} Q${px(s, 10, 46)} ${px(s, 10.5, 49)}"/>`,
        `<path fill="none" stroke="${C.pielSombra}" stroke-width="2" stroke-linecap="round" d="M-5,3.5 Q0,6 5,3.5"/>`
    ];
    const titulo = lado === "der" ? "Brazo derecho de Zeus" : "Brazo izquierdo de Zeus";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-26 -18 52 132" width="104" height="264">
  <title>${titulo}</title>
  <!-- Pieza de El Espejo de las Posiciones. Generado por scripts/generar-svg-espejo-posiciones.js -->
  <g id="arriba" data-largo="50">
    <g class="base">
      ${arribaBase.join(SEP6)}
    </g>
    <g class="detalle">
      ${arribaDetalle.join(SEP6)}
    </g>
  </g>
  <g id="abajo" transform="translate(0,50)">
    <g class="base">
      ${abajoBase.join(SEP6)}
    </g>
    <g class="detalle">
      ${abajoDetalle.join(SEP6)}
    </g>
  </g>
</svg>
`;
}

// ------------------------------------------------------------------ pierna

function pierna(lado) {
    const o = lado === "der" ? -1 : 1; // la punta del zapato mira hacia afuera
    const L = C.lado[lado];
    const arribaBase = [
        `<path class="m-piel" fill="${C.piel}" d="M-11.4,20 C-11.6,34 -11,46 -10.4,56 A10.4,10.4 0 0 0 10.4,56 C11,46 11.6,34 11.4,20 Z"/>`,
        // Bota del short con tapa redonda en la cadera (el short del tronco la cubre).
        `<path class="m-short" fill="${C.short}" d="M-16.6,0 A16.6,16.6 0 0 1 16.6,0 L17.4,26.5 Q0,31 -17.4,26.5 Z"/>`
    ];
    const arribaDetalle = [
        `<path fill="${C.shortSombra}" d="M-17.2,22.5 Q0,27 17.2,22.5 L17.4,26.5 Q0,31 -17.4,26.5 Z"/>`,
        `<path fill="none" stroke="${C.pielSombra}" stroke-width="2" stroke-linecap="round" d="M${r(o * 7)},33 Q${r(o * 8.5)},44 ${r(o * 6.5)},52"/>`
    ];
    const zapato = `M${px(o, -11.5, 46)} L${px(o, 10, 46)} Q${px(o, 13.5, 47)} ${px(o, 16, 50.5)} Q${px(o, 23.5, 53)} ${px(o, 23.5, 58.5)} Q${px(o, 23.5, 62.5)} ${px(o, 18, 62.5)} L${px(o, -10.5, 62.5)} Q${px(o, -14, 62)} ${px(o, -13.5, 56)} Z`;
    const abajoBase = [
        `<circle class="m-piel" fill="${C.piel}" cx="0" cy="0" r="10.4"/>`,
        `<path class="m-piel" fill="${C.piel}" d="M-10.4,0 C-10.4,12 -9.8,24 -9.4,34 L9.4,34 C9.8,24 10.4,12 10.4,0 Z"/>`,
        `<path class="m-media" fill="${C.media}" d="M-10,29.5 L-10,49 L10,49 L10,29.5 Z"/>`,
        `<path class="m-zapato" fill="${C.zapato}" d="${zapato}"/>`
    ];
    const abajoDetalle = [
        `<path fill="none" stroke="${C.pielSombra}" stroke-width="2" stroke-linecap="round" d="M-5.5,4 Q0,7.5 5.5,4"/>`,
        `<path fill="none" stroke="${C.mediaRaya}" stroke-width="1.2" d="M-4,37 L-4,48 M0,37 L0,48 M4,37 L4,48"/>`,
        `<rect x="-10" y="29.5" width="20" height="5.6" rx="2" fill="${L.color}" stroke="${L.borde}" stroke-width="1.2"/>`,
        `<path fill="${C.suela}" d="M${px(o, -13.4, 58.5)} Q${px(o, -12.5, 62.5)} ${px(o, -10.5, 62.5)} L${px(o, 18, 62.5)} Q${px(o, 23.4, 62.5)} ${px(o, 23.5, 58.5)} L${px(o, 23.5, 60)} Q${px(o, 23.5, 65)} ${px(o, 18, 65)} L${px(o, -10.5, 65)} Q${px(o, -13.8, 64.5)} ${px(o, -13.4, 58.5)} Z"/>`,
        `<path fill="none" stroke="${C.zapatoSombra}" stroke-width="1.6" stroke-linecap="round" d="M${px(o, -12.8, 57.5)} L${px(o, 23, 57.5)}"/>`,
        `<path fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" d="M${px(o, -4, 50.5)} Q${px(o, 2, 48.5)} ${px(o, 8, 50.5)} M${px(o, -3, 54)} Q${px(o, 3.5, 52)} ${px(o, 10, 54)}"/>`
    ];
    const titulo = lado === "der" ? "Pierna derecha de Zeus" : "Pierna izquierda de Zeus";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -20 60 144" width="120" height="288">
  <title>${titulo}</title>
  <!-- Pieza de El Espejo de las Posiciones. Generado por scripts/generar-svg-espejo-posiciones.js -->
  <g id="arriba" data-largo="56">
    <g class="base">
      ${arribaBase.join("\n      ")}
    </g>
    <g class="detalle">
      ${arribaDetalle.join("\n      ")}
    </g>
  </g>
  <g id="abajo" transform="translate(0,56)">
    <g class="base">
      ${abajoBase.join("\n      ")}
    </g>
    <g class="detalle">
      ${abajoDetalle.join("\n      ")}
    </g>
  </g>
</svg>
`;
}

// ------------------------------------------------------------------ tronco

function tronco() {
    const base = [
        `<path class="m-piel" fill="${C.piel}" d="M-8.6,-72 L-8.6,-52 L8.6,-52 L8.6,-72 Z"/>`,
        // Short (las caderas quedan en (±18,64), tapadas por la bota de cada pierna).
        `<path class="m-short" fill="${C.short}" d="M-42.5,20 L42.5,20 L45.5,66 Q33,72.5 20,70.5 L6,56 Q0,53 -6,56 L-20,70.5 Q-33,72.5 -45.5,66 Z"/>`,
        // Camiseta: hombros redondeados que terminan dentro de la tapa de la manga (±42,-46).
        `<path class="m-camiseta" fill="${C.camiseta}" d="M-16,-61 Q0,-52 16,-61 L31,-59.5 Q43,-57 45.5,-45 L44.5,28 Q0,37.5 -44.5,28 L-45.5,-45 Q-43,-57 -31,-59.5 Z"/>`
    ];
    const detalle = [
        `<path fill="${C.pielSombra}" d="M-8.6,-60 Q0,-55 8.6,-60 L8.6,-55 Q0,-51 -8.6,-55 Z"/>`,
        `<path fill="none" stroke="${C.ribete}" stroke-width="6" stroke-linecap="round" d="M-17,-60.5 Q0,-47 17,-60.5"/>`,
        `<path fill="${C.camisetaSombra}" opacity=".55" d="M32,-26 Q41,-4 39,25 Q44,8 44.5,-8 Z"/>`,
        `<path fill="${C.camisetaSombra}" opacity=".35" d="M-32,-26 Q-41,-4 -39,25 Q-44,8 -44.5,-8 Z"/>`,
        `<path fill="${C.camisetaSombra}" opacity=".75" d="M-44.5,24 Q0,33 44.5,24 L44.5,28 Q0,37.5 -44.5,28 Z"/>`,
        `<path fill="#ffe08a" stroke="#f2b632" stroke-width="1.6" stroke-linejoin="round" d="M0,-30 L4.4,-21 L14.2,-19.6 L7.1,-12.7 L8.8,-3 L0,-7.6 L-8.8,-3 L-7.1,-12.7 L-14.2,-19.6 L-4.4,-21 Z"/>`,
        `<path fill="none" stroke="${C.shortSombra}" stroke-width="3" d="M-43,30.5 L43,30.5"/>`,
        `<path fill="none" stroke="${C.shortSombra}" stroke-width="2" stroke-linecap="round" d="M-2,40 L-2,53"/>`,
        `<path fill="none" stroke="${C.shortSombra}" stroke-width="2" stroke-linecap="round" d="M-33,44 Q-26,48.5 -19,44 M33,44 Q26,48.5 19,44"/>`
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-58 -78 116 156" width="232" height="312">
  <title>Tronco de Zeus</title>
  <!-- Pieza de El Espejo de las Posiciones. Generado por scripts/generar-svg-espejo-posiciones.js -->
  <g class="base">
    ${base.join("\n    ")}
  </g>
  <g class="detalle">
    ${detalle.join("\n    ")}
  </g>
</svg>
`;
}

// ------------------------------------------------------------------ cabeza

function cabeza() {
    const base = [
        `<circle class="m-piel" fill="${C.piel}" cx="-35.5" cy="-37" r="8.6"/>`,
        `<circle class="m-piel" fill="${C.piel}" cx="35.5" cy="-37" r="8.6"/>`,
        `<path class="m-piel" fill="${C.piel}" d="M0,-79 C21,-79 36,-63 36,-43 C36,-20 21,-4 0,-4 C-21,-4 -36,-20 -36,-43 C-36,-63 -21,-79 0,-79 Z"/>`,
        `<path class="m-pelo" fill="${C.pelo}" d="M-37,-42 Q-43,-71 -22,-83 Q-4,-94 15,-88 Q38,-81 40,-56 Q41,-46 37,-40 Q33,-50 29,-57 Q25,-50 16,-55 Q17,-61 11,-64 Q4,-55 -9,-60 Q-14,-53 -24,-57 Q-31,-52 -34,-37 Z"/>`,
        `<path class="m-pelo" fill="${C.pelo}" d="M-5,-88 Q-3,-100 7,-95 Q2,-92 4,-87 Z"/>`
    ];
    const detalle = [
        `<circle cx="-35.5" cy="-37" r="4.2" fill="${C.mejilla}" opacity=".7"/>`,
        `<circle cx="35.5" cy="-37" r="4.2" fill="${C.mejilla}" opacity=".7"/>`,
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="2" stroke-linecap="round" opacity=".7" d="M-25,-71 Q-8,-81 12,-76 M-12,-80 Q6,-86 26,-73 M20,-68 Q30,-64 34,-52"/>`,
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="3.2" stroke-linecap="round" d="M-21,-50 Q-14,-55 -6,-50.5 M6,-50.5 Q14,-55 21,-50"/>`,
        `<g class="m-ojos">
      <ellipse cx="-13" cy="-38.5" rx="7.4" ry="8.4" fill="#fff"/>
      <ellipse cx="13" cy="-38.5" rx="7.4" ry="8.4" fill="#fff"/>
      <circle cx="-12.4" cy="-37.5" r="4.9" fill="#2a1712"/>
      <circle cx="12.4" cy="-37.5" r="4.9" fill="#2a1712"/>
      <circle cx="-10.8" cy="-39.6" r="1.7" fill="#fff"/>
      <circle cx="14" cy="-39.6" r="1.7" fill="#fff"/>
    </g>`,
        `<ellipse cx="-22" cy="-26" rx="6.4" ry="4.2" fill="${C.mejilla}" opacity=".45"/>`,
        `<ellipse cx="22" cy="-26" rx="6.4" ry="4.2" fill="${C.mejilla}" opacity=".45"/>`,
        `<ellipse cx="0" cy="-29.5" rx="3.6" ry="2.7" fill="${C.pielSombra}"/>`,
        `<path fill="${C.boca}" d="M-11,-20.5 Q0,-6 11,-20.5 Q0,-17 -11,-20.5 Z"/>`,
        `<path fill="#fff" d="M-7.6,-19.3 Q0,-17.3 7.6,-19.3 L7,-16.7 Q0,-15.3 -7,-16.7 Z"/>`,
        `<path fill="#e8838a" d="M-5,-12.6 Q0,-15 5,-12.6 Q0,-9.8 -5,-12.6 Z"/>`
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 -102 96 102" width="192" height="204">
  <title>Cabeza de Zeus</title>
  <!-- Pieza de El Espejo de las Posiciones. Generado por scripts/generar-svg-espejo-posiciones.js -->
  <g class="base">
    ${base.join("\n    ")}
  </g>
  <g class="detalle">
    ${detalle.join("\n    ")}
  </g>
</svg>
`;
}

const archivos = {
    "cabeza.svg": cabeza(),
    "tronco.svg": tronco(),
    "brazo_izq.svg": brazo("izq"),
    "brazo_der.svg": brazo("der"),
    "pierna_izq.svg": pierna("izq"),
    "pierna_der.svg": pierna("der")
};

Object.keys(archivos).forEach((n) => {
    fs.writeFileSync(path.join(salida, n), archivos[n], "utf8");
    console.log("escrito img/" + n);
});
