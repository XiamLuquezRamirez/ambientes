/**
 * Genera las piezas SVG de Zeus y Zoe para "El Espejo de las Posiciones y Lateralidad".
 * Salida: public/catalogo_juegos/Polimotor/EspejoDeLasPosiciones/img/{zeus,zoe}/
 *         {cabeza,tronco,brazo_izq,brazo_der,pierna_izq,pierna_der}.svg
 * Uso: node scripts/generar-svg-espejo-posiciones.js
 *
 * Formato que lee muneco.js:
 *   - Pivote en (0,0): cuello (cabeza), pecho (tronco), hombro (brazos) o cadera (piernas).
 *   - Formas de color con class="m-…" dentro de g.base: el juego las repite engrosadas como
 *     contorno (style.css), así codo y rodilla giran sin cortes. Zeus usa m-piel, m-camiseta,
 *     m-short, m-pelo, m-media y m-zapato; Zoe cambia ropa por m-blusa, m-vestido, m-calceta y
 *     m-zapato-zoe.
 *   - Detalles (ribetes, pulsera de lado, cara…) dentro de g.detalle.
 *   - Extremidades: g#arriba[data-largo] (brazo/muslo) y g#abajo (antebrazo+mano / pierna+zapato).
 *     g#abajo trae translate(0,largo) solo para que el archivo se vea armado al abrirlo.
 *   - El tronco trae path.silueta: la sombra punteada donde se arma el muñeco.
 *   - El viewBox de cada archivo es el encuadre de su ficha en la bandeja.
 * Medidas ligadas a postura.js (ESQUELETO): brazo 50 + 48, pierna 56 + 50,
 * hombros del tronco en (±42,-46), caderas en (±18,64), cuello en (0,-64). NO cambiarlas:
 * de ellas dependen el encaje, el giro y la validación de cada pieza.
 */
const fs = require("fs");
const path = require("path");

const raizImg = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "EspejoDeLasPosiciones", "img");

const COMUN = {
    piel: "#f2c6b9",
    pielSombra: "#e5a796",
    pielLinea: "#c98a7a",
    oreja: "#ed887c",
    mejilla: "#f2b09f",
    peca: "#d98a74",
    nariz: "#eaa694",
    pelo: "#7f3f1a",
    peloSombra: "#5b2c11",
    ceja: "#974b2b",
    iris: "#2c211c",
    boca: "#a74c3a",
    lengua: "#d26f69",
    // Pulsera y tobillera de lado: la ayuda de lateralidad del juego (amarillo izq, verde der).
    lado: {
        izq: { color: "#ffd43b", borde: "#d9a400" },
        der: { color: "#51cf66", borde: "#2b9a44" }
    }
};

const ROPA = {
    zeus: {
        nombre: "Zeus",
        camiseta: "#2b896f",
        camisetaSombra: "#24735a",
        ribete: "#8cc97c",
        ribeteRaya: "#6db85f",
        short: "#004f6d",
        shortSombra: "#06405a",
        media: "#fffdfc",
        mediaRaya: "#d5dbe3",
        zapato: "#2b896f",
        zapatoSombra: "#24735a",
        suela: "#f7f7f7"
    },
    zoe: {
        nombre: "Zoe",
        pelo: "#984c2c",
        ceja: "#974e34",
        blusa: "#95d3f0",
        blusaRaya: "#86c3e8",
        cuello: "#02a1dd",
        vestido: "#e1709c",
        vestidoSombra: "#c85a86",
        costura: "#f3a6c4",
        corazon: "#f0e387",
        corazonBorde: "#d9c55a",
        calceta: "#e892b5",
        calcetaSombra: "#d6779f",
        zapato: "#a4daf4",
        zapatoSombra: "#69c2e4",
        mono: "#a0d7f1",
        monoRaya: "#5fb0e0",
        gancho: "#eee885",
        ganchoBorde: "#d8c14a"
    }
};

// Cabeza algo más grande que el diseño base, como la proporción del personaje oficial.
const ESCALA_CABEZA = 1.08;
// Brazos y piernas algo más gruesos, como los del personaje oficial (solo a lo ancho).
const GROSOR_BRAZO = 1.08;
const GROSOR_PIERNA = 1.28;

const r = (n) => Math.round(n * 100) / 100;
/** Punto "x,y" con x espejada por el signo s. */
const px = (s, x, y) => r(s * x) + "," + r(y);

function svgPieza(viewBox, ancho, alto, titulo, cuerpo) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${ancho}" height="${alto}">
  <title>${titulo}</title>
  <!-- Pieza de El Espejo de las Posiciones. Generado por scripts/generar-svg-espejo-posiciones.js -->
${cuerpo}</svg>
`;
}

function grupoSimple(base, detalle, extra, escala) {
    const abre = escala ? `<g transform="scale(${escala})">` : "";
    const cierra = escala ? "</g>" : "";
    return `  <g class="base">${abre}
    ${base.join("\n    ")}
  ${cierra}</g>
  <g class="detalle">${abre}
    ${detalle.join("\n    ")}
  ${cierra}</g>
${extra || ""}`;
}

/**
 * escalaX ensancha la pieza sin cambiar su largo: el pivote (x=0) y el largo de cada segmento
 * quedan iguales, así que el encaje y el giro no cambian.
 */
function grupoExtremidad(largo, arribaBase, arribaDetalle, abajoBase, abajoDetalle, escalaX) {
    const abre = escalaX ? `<g transform="scale(${escalaX},1)">` : "";
    const cierra = escalaX ? "</g>" : "";
    return `  <g id="arriba" data-largo="${largo}">
    <g class="base">${abre}
      ${arribaBase.join("\n      ")}
    ${cierra}</g>
    <g class="detalle">${abre}
      ${arribaDetalle.join("\n      ")}
    ${cierra}</g>
  </g>
  <g id="abajo" transform="translate(0,${largo})">
    <g class="base">${abre}
      ${abajoBase.join("\n      ")}
    ${cierra}</g>
    <g class="detalle">${abre}
      ${abajoDetalle.join("\n      ")}
    ${cierra}</g>
  </g>
`;
}

// ------------------------------------------------------------------ cara (igual en los dos)

function cara(ceja) {
    const C = COMUN;
    const pecas = [[-24, -29], [-20.5, -26.5], [-26, -25.5], [-18, -30], [24, -29], [20.5, -26.5], [26, -25.5], [18, -30], [-5.5, -31.5], [5.5, -31.5]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.95" fill="${C.peca}" opacity=".8"/>`);
    return [
        // Orejas: interior rosado.
        `<path fill="none" stroke="${C.oreja}" stroke-width="2.6" stroke-linecap="round" d="M-34,-42 Q-39.5,-38 -36.5,-32 M34,-42 Q39.5,-38 36.5,-32"/>`,
        // Sombra suave bajo el pelo y en el mentón.
        `<path fill="${C.pielSombra}" opacity=".45" d="M-24,-8.5 Q0,4 24,-8.5 Q12,-2.5 0,-2.5 Q-12,-2.5 -24,-8.5 Z"/>`,
        // Cejas gruesas, un poco levantadas.
        `<path fill="none" stroke="${ceja || C.ceja}" stroke-width="3.6" stroke-linecap="round" d="M-22,-52 Q-14.5,-58.5 -6,-53.5 M6,-53.5 Q14.5,-58.5 22,-52"/>`,
        // Ojos grandes; el iris mira un poco hacia abajo, como en el personaje oficial.
        `<g class="m-ojos">
      <ellipse cx="-13.5" cy="-38.5" rx="9" ry="8.4" fill="#fff"/>
      <ellipse cx="13.5" cy="-38.5" rx="9" ry="8.4" fill="#fff"/>
      <ellipse cx="-12.6" cy="-34.4" rx="5.2" ry="4.9" fill="${C.iris}"/>
      <ellipse cx="12.6" cy="-34.4" rx="5.2" ry="4.9" fill="${C.iris}"/>
      <circle cx="-10.8" cy="-36" r="1.3" fill="#fff"/>
      <circle cx="14.4" cy="-36" r="1.3" fill="#fff"/>
      <path fill="none" stroke="#5a3226" stroke-width="1.05" stroke-linecap="round" d="M-22,-39.5 Q-14,-49 -5,-40.5 M5,-40.5 Q14,-49 22,-39.5"/>
    </g>`,
        `<ellipse cx="-22" cy="-25" rx="7.2" ry="4.6" fill="${C.mejilla}" opacity=".42"/>`,
        `<ellipse cx="22" cy="-25" rx="7.2" ry="4.6" fill="${C.mejilla}" opacity=".42"/>`,
        ...pecas,
        // Nariz redonda.
        `<ellipse cx="0" cy="-28.5" rx="4.4" ry="3.4" fill="${C.nariz}"/>`,
        `<ellipse cx="-1.2" cy="-29.6" rx="1.4" ry="0.9" fill="#fff" opacity=".55"/>`,
        // Boca abierta: dientes arriba y lengua abajo.
        `<path fill="${C.boca}" d="M-10.8,-19.5 Q0,-18 10.8,-19.5 Q9.6,-7 0,-7 Q-9.6,-7 -10.8,-19.5 Z"/>`,
        `<path fill="#fff" d="M-8.4,-18.9 Q0,-17.6 8.4,-18.9 L8,-16.2 Q0,-15 -8,-16.2 Z"/>`,
        `<path fill="${C.lengua}" d="M-6.8,-10 Q0,-14 6.8,-10 Q3.8,-7.1 0,-7.1 Q-3.8,-7.1 -6.8,-10 Z"/>`
    ];
}

const CARA_BASE = [
    `<circle class="m-piel" fill="${COMUN.piel}" cx="-35.5" cy="-37" r="8.6"/>`,
    `<circle class="m-piel" fill="${COMUN.piel}" cx="35.5" cy="-37" r="8.6"/>`,
    `<path class="m-piel" fill="${COMUN.piel}" d="M0,-79 C21,-79 36,-63 36,-43 C36,-20 21,-4 0,-4 C-21,-4 -36,-20 -36,-43 C-36,-63 -21,-79 0,-79 Z"/>`
];

// ------------------------------------------------------------------ cabezas

function cabezaZeus() {
    const C = COMUN;
    const base = [
        ...CARA_BASE,
        // Pelo: casco con el flequillo barrido hacia la derecha del niño (izquierda de la pantalla)
        // y la punta cayendo sobre la sien derecha de la pantalla.
        `<path class="m-pelo" fill="${C.pelo}" transform="scale(1.11,1)" d="M-38,-38 C-44,-62 -33,-82 -12,-87.5 C7,-92.5 29,-88 38,-72 C43.5,-62 42.5,-48 38.5,-35 C36,-42 33.5,-48 30.5,-52 C29,-47.5 27.5,-44.5 25,-42 C22.5,-51 15,-57.5 5,-62 C-6,-66.5 -18,-66.5 -27,-61 C-31.5,-57 -33.5,-49 -34.5,-40 Z"/>`,
        // Mechones parados arriba a la izquierda.
        `<path class="m-pelo" fill="${C.pelo}" transform="scale(1.11,1)" d="M-25,-80 Q-33,-86 -40,-84.5 Q-32,-83 -28,-77.5 Z"/>`,
        `<path class="m-pelo" fill="${C.pelo}" transform="scale(1.11,1)" d="M-19,-85 Q-25,-93.5 -32,-94 Q-25,-91 -22.5,-83 Z"/>`
    ];
    const detalle = [
        ...cara(),
        // Vetas del pelo siguiendo el peinado.
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="1.5" stroke-linecap="round" opacity=".55" transform="scale(1.11,1)" d="M-8,-86 Q14,-81 31,-62 M-3,-78 Q13,-72 26,-55 M-16,-82 Q-27,-75 -32,-58 M-22,-72 Q-28,-64 -30,-52 M8,-87 Q25,-84 35,-68"/>`,
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="0.8" stroke-linecap="round" opacity=".4" transform="scale(1.11,1)" d="M-12,-84 Q8,-80 24,-64 M-6,-82 Q12,-77 28,-60 M2,-74 Q16,-68 23,-54 M4,-86 Q22,-82 33,-66 M-20,-79 Q-29,-70 -33,-55 M-26,-74 Q-31,-66 -32,-52 M14,-88 Q30,-83 38,-62"/>`,
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="1.2" stroke-linecap="round" opacity=".45" transform="scale(1.11,1)" d="M-28,-81 Q-33,-84 -37,-84.5 M-22,-86 Q-26,-90.5 -29.5,-92"/>`
    ];
    return svgPieza("-54 -112 108 112", 216, 224, "Cabeza de Zeus", grupoSimple(base, detalle, "", ESCALA_CABEZA));
}

function cabezaZoe() {
    const C = COMUN;
    const Z = ROPA.zoe;
    const coleta = (s) => `<path class="m-pelo-zoe" fill="${Z.pelo}" d="M${px(s, 35, -19)} Q${px(s, 45, -20)} ${px(s, 50.5, -11)} L${px(s, 54, -3)} L${px(s, 49.5, -3.5)} L${px(s, 51.5, 4.5)} L${px(s, 46, 0.5)} L${px(s, 46.5, 8.5)} L${px(s, 42, 2.5)} L${px(s, 40.5, 9)} Q${px(s, 38, 0)} ${px(s, 34.5, -7)} Z"/>`;
    const base = [
        // Detrás de la cara: coletas y el pelo que cae a los lados hasta la mandíbula.
        coleta(-1),
        coleta(1),
        `<path class="m-pelo-zoe" fill="${Z.pelo}" d="M-38,-60 C-41,-50 -41,-40 -38.5,-33 L38.5,-33 C41,-40 41,-50 38,-60 Z"/>`,
        ...CARA_BASE,
        // Arriba: raya al medio y flequillo en mechas.
        `<path class="m-pelo-zoe" fill="${Z.pelo}" d="M-38,-47 C-42,-71 -24,-87.5 0,-88 C24,-87.5 42,-71 38,-47 C35.5,-52 33,-56 30.5,-58.5 L28,-53 C25,-57.5 21,-60.5 16,-62 L13.5,-54 C10.5,-59 6,-63 1,-65 C-4,-63 -8.5,-59 -11.5,-54 L-14,-62 C-19,-60.5 -25,-57.5 -28,-53 L-30.5,-58.5 C-33,-56 -35.5,-52 -38,-47 Z"/>`
    ];
    const mono = (s) => `<g transform="translate(${r(s * 37.5)},-15) rotate(${s * -62})">
      <ellipse rx="4.8" ry="6.6" fill="${Z.mono}" stroke="${Z.monoRaya}" stroke-width="1.1"/>
      <path fill="none" stroke="${Z.monoRaya}" stroke-width="1" d="M-3.4,-3.2 L3.4,-3.2 M-4,0 L4,0 M-3.4,3.2 L3.4,3.2"/>
    </g>`;
    const detalle = [
        ...cara(Z.ceja),
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="1.8" stroke-linecap="round" opacity=".6" d="M0,-87 L0.6,-70"/>`,
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="1.4" stroke-linecap="round" opacity=".5" d="M-4,-84 Q-22,-80 -32,-62 M-6,-76 Q-18,-71 -25,-58 M4,-84 Q22,-80 32,-62 M6,-76 Q18,-71 25,-58"/>`,
        `<path fill="none" stroke="${C.peloSombra}" stroke-width="1.2" stroke-linecap="round" opacity=".5" d="M-41,-13 Q-47,-9 -50,-3 M41,-13 Q47,-9 50,-3"/>`,
        mono(-1),
        mono(1),
        // Gancho amarillo al lado izquierdo de Zoe (derecha de la pantalla).
        `<g transform="translate(24,-71) rotate(28)">
      <path fill="${Z.gancho}" stroke="${Z.ganchoBorde}" stroke-width="1.2" d="M0,-8 C4.6,-4.5 5.4,3.5 0,8.2 C-5.4,3.5 -4.6,-4.5 0,-8 Z"/>
      <path fill="${Z.pelo}" d="M0,-2.6 C1.6,-1 1.8,1.8 0,3.6 C-1.8,1.8 -1.6,-1 0,-2.6 Z"/>
    </g>`
    ];
    return svgPieza("-62 -112 124 132", 248, 264, "Cabeza de Zoe", grupoSimple(base, detalle, "", ESCALA_CABEZA));
}

// ------------------------------------------------------------------ troncos

const CUELLO = `<path class="m-piel" fill="${COMUN.piel}" d="M-8.6,-72 L-8.6,-52 L8.6,-52 L8.6,-72 Z"/>`;
// Sombra del cuello justo encima del escote de cada personaje (y = centro del escote).
const sombraCuello = (y) => `<path fill="${COMUN.pielSombra}" d="M-8.6,${y - 8} Q0,${y - 3} 8.6,${y - 8} L8.6,${y - 4} Q0,${y} -8.6,${y - 4} Z"/>`;

function troncoZeus() {
    const R = ROPA.zeus;
    const base = [
        CUELLO,
        // Short (las caderas quedan en (±18,64), tapadas por la bota de cada pierna).
        `<path class="m-short" fill="${R.short}" d="M-42.5,20 L42.5,20 L45.5,66 Q33,72.5 20,70.5 L6,56 Q0,53 -6,56 L-20,70.5 Q-33,72.5 -45.5,66 Z"/>`,
        // Camiseta: hombros redondeados que terminan dentro de la tapa de la manga (±42,-46).
        `<path class="m-camiseta" fill="${R.camiseta}" d="M-16,-70 Q0,-50 16,-70 L31,-66 Q43,-61 45,-46 L44.5,28 Q0,37.5 -44.5,28 L-45,-46 Q-43,-61 -31,-66 Z"/>`
    ];
    const detalle = [
        sombraCuello(-60),
        // Cuello redondo acanalado en verde claro.
        `<path fill="none" stroke="${R.ribete}" stroke-width="6.5" stroke-linecap="round" d="M-17,-69 Q0,-49 17,-69"/>`,
        `<path fill="none" stroke="${R.ribeteRaya}" stroke-width="1" stroke-dasharray="1.4 1.6" d="M-16,-66.6 Q0,-48 16,-66.6"/>`,
        `<path fill="${R.camisetaSombra}" opacity=".5" d="M32,-26 Q41,-4 39,25 Q44,8 44.5,-8 Z"/>`,
        `<path fill="${R.camisetaSombra}" opacity=".32" d="M-32,-26 Q-41,-4 -39,25 Q-44,8 -44.5,-8 Z"/>`,
        `<path fill="none" stroke="${R.camisetaSombra}" stroke-width="1.4" stroke-linecap="round" opacity=".5" d="M30,-60 Q33,-44 31,-28 M-30,-60 Q-33,-44 -31,-28"/>`,
        `<path fill="${R.camisetaSombra}" opacity=".7" d="M-44.5,24 Q0,33 44.5,24 L44.5,28 Q0,37.5 -44.5,28 Z"/>`,
        // Pretina, bragueta y bolsillos del short.
        `<path fill="none" stroke="${R.shortSombra}" stroke-width="3" d="M-43,30.5 L43,30.5"/>`,
        `<path fill="none" stroke="${R.shortSombra}" stroke-width="2" stroke-linecap="round" d="M-2,40 L-2,53"/>`,
        `<path fill="none" stroke="${R.shortSombra}" stroke-width="2" stroke-linecap="round" d="M-36,34 Q-30,43 -19,44 M36,34 Q30,43 19,44"/>`
    ];
    const silueta = `  <path class="silueta" d="M-16,-70 Q0,-50 16,-70 L31,-66 Q43,-61 45,-46 L44.5,28 L45.5,66 Q33,72.5 20,70.5 L6,56 Q0,53 -6,56 L-20,70.5 Q-33,72.5 -45.5,66 L-44.5,28 L-45,-46 Q-43,-61 -31,-66 Z" fill="none"/>
`;
    return svgPieza("-58 -78 116 156", 232, 312, "Tronco de Zeus", grupoSimple(base, detalle, silueta));
}

function troncoZoe() {
    const Z = ROPA.zoe;
    // Cuello de la blusa: una banda que sigue el escote, con el borde de abajo en ondas
    // (como el personaje oficial; antes eran círculos sueltos que parecían un collar).
    const escote = (t) => ({ x: -16 + 32 * t, y: (1 - t) * (1 - t) * -67 + 2 * (1 - t) * t * -57 + t * t * -67 });
    const ONDAS = 9;
    const ANCHO_CUELLO = 2.6;
    const bajo = (i) => {
        const p = escote(i / ONDAS);
        return { x: p.x, y: p.y + ANCHO_CUELLO };
    };
    let cuello = `M-16.6,-68 Q0,-58 16.6,-68 L${r(bajo(ONDAS).x)},${r(bajo(ONDAS).y)}`;
    for (let i = ONDAS; i > 0; i--) {
        const a = bajo(i);
        const b = bajo(i - 1);
        const radio = Math.hypot(a.x - b.x, a.y - b.y) / 2;
        cuello += ` A${r(radio)},${r(radio)} 0 0 1 ${r(b.x)},${r(b.y)}`;
    }
    cuello += " Z";
    const ondas = [
        `<path fill="${Z.cuello}" d="${cuello}"/>`,
        // Brillo fino sobre la banda.
        `<path fill="none" stroke="#5cc3ee" stroke-width="0.9" stroke-linecap="round" opacity=".8" d="M-15.4,-66.4 Q0,-56.6 15.4,-66.4"/>`
    ];
    const base = [
        CUELLO,
        // Blusa (se ve en los hombros y alrededor de los tirantes).
        `<path class="m-blusa" fill="${Z.blusa}" d="M-16,-67 Q0,-58 16,-67 L31,-64 Q43,-60 45,-46 L44.5,-20 L-44.5,-20 L-45,-46 Q-43,-60 -31,-64 Z"/>`,
        // Jardinera: peto, cuerpo y falda en A que tapa las caderas (±18,64).
        `<path class="m-vestido" fill="${Z.vestido}" d="M-26,-44 L26,-44 L26,-39 L39,-39 Q44.5,-37 44.5,-28 L43.5,2 L56,81 Q0,91 -56,81 L-43.5,2 L-44.5,-28 Q-44.5,-37 -39,-39 L-26,-39 Z"/>`,
        // Tirantes hasta los hombros.
        `<path class="m-vestido" fill="${Z.vestido}" d="M-35,-63.5 L-21.5,-67 L-15,-41 L-27,-41 Z"/>`,
        `<path class="m-vestido" fill="${Z.vestido}" d="M35,-63.5 L21.5,-67 L15,-41 L27,-41 Z"/>`
    ];
    const detalle = [
        sombraCuello(-62),
        `<path fill="none" stroke="${Z.blusaRaya}" stroke-width="1.3" stroke-linecap="round" d="M-38,-52 L-37,-41 M-33,-56 L-32.5,-41 M33,-56 L32.5,-41 M38,-52 L37,-41 M-10,-55 L-10,-44 M-5,-53 L-5,-44 M0,-52 L0,-44 M5,-53 L5,-44 M10,-55 L10,-44"/>`,
        ...ondas,
        // Costuras punteadas del peto y los tirantes.
        `<path fill="none" stroke="${Z.costura}" stroke-width="1.2" stroke-dasharray="2.2 2" stroke-linecap="round" d="M-22,-40.5 L22,-40.5 L22.5,-1 M-22,-40.5 L-22.5,-1 M-30.5,-62 L-23,-43 M30.5,-62 L23,-43"/>`,
        // Corazón con costura.
        `<path fill="${Z.corazon}" stroke="${Z.corazonBorde}" stroke-width="1.2" d="M0,-12 C-9,-18 -13.5,-23 -11,-28.5 C-8.5,-33 -3,-32 0,-27.5 C3,-32 8.5,-33 11,-28.5 C13.5,-23 9,-18 0,-12 Z"/>`,
        `<path fill="none" stroke="${Z.vestidoSombra}" stroke-width="0.9" stroke-dasharray="1.6 1.6" d="M0,-9.2 C-11,-16 -16.5,-23 -13.4,-29.6 C-10.4,-35.4 -3.6,-34.6 0,-30.6 C3.6,-34.6 10.4,-35.4 13.4,-29.6 C16.5,-23 11,-16 0,-9.2 Z"/>`,
        // Costura de la cintura y pliegues de la falda.
        `<path fill="none" stroke="${Z.vestidoSombra}" stroke-width="1.4" stroke-linecap="round" d="M-43.5,3 Q0,9 43.5,3"/>`,
        `<path fill="${Z.vestidoSombra}" opacity=".28" d="M44.5,-28 L43.5,2 L56,81 Q50,83 44,84 Q46,42 39,6 Z"/>`
    ];
    const silueta = `  <path class="silueta" d="M-16,-67 Q0,-58 16,-67 L31,-64 Q43,-60 45,-46 L44.5,-28 L43.5,2 L56,81 Q0,91 -56,81 L-43.5,2 L-44.5,-28 L-45,-46 Q-43,-60 -31,-64 Z" fill="none"/>
`;
    return svgPieza("-60 -80 120 174", 240, 348, "Tronco de Zoe", grupoSimple(base, detalle, silueta));
}

// ------------------------------------------------------------------ brazos

/** Mano abierta con dedos: palma, cuatro dedos y pulgar hacia el centro del cuerpo (+x si s=1). */
function mano(s) {
    const piel = COMUN.piel;
    const dedos = [[-6.6, -11], [-2.3, -4], [2, 3], [6.2, 10]].map(([x, giro], i) =>
        `<rect class="m-piel" fill="${piel}" x="${r(s * x - 2.15)}" y="50" width="4.3" height="${i === 0 || i === 3 ? 9 : 11}" rx="2.15" transform="rotate(${r(s * giro)},${r(s * x)},51)"/>`);
    return [
        `<path class="m-piel" fill="${piel}" d="M-8.8,36 C-10.8,42 -10.6,48.5 -8.6,53.5 Q0,57 8.6,53.5 C10.6,48.5 10.8,42 8.8,36 Z"/>`,
        ...dedos,
        `<rect class="m-piel" fill="${piel}" x="${r(s * 8 - 2.2)}" y="40" width="4.4" height="13" rx="2.2" transform="rotate(${r(-s * 46)},${r(s * 8)},42)"/>`
    ];
}

function brazo(pj, lado) {
    const s = lado === "der" ? 1 : -1; // pulgar hacia el centro del cuerpo (+x en el derecho)
    const L = COMUN.lado[lado];
    const piel = COMUN.piel;
    const esZoe = pj === "zoe";
    const R = ROPA[pj];
    const manga = esZoe
        // Manga abullonada de la blusa.
        ? `<path class="m-blusa" fill="${R.blusa}" d="M-12,0 A12,12 0 0 1 12,0 C12,10 11.6,22 10.8,30 Q0,34.5 -10.8,30 C-11.6,22 -12,10 -12,0 Z"/>`
        : `<path class="m-camiseta" fill="${R.camiseta}" d="M-12.2,0 A12.2,12.2 0 0 1 12.2,0 L12.6,23 Q0,27.5 -12.6,23 Z"/>`;
    const arribaBase = [
        `<path class="m-piel" fill="${piel}" d="M-9.8,8 C-10,22 -9.4,38 -8.6,50 A8.6,8.6 0 0 0 8.6,50 C9.4,38 10,22 9.8,8 Z"/>`,
        manga
    ];
    const arribaDetalle = esZoe
        ? [
            `<path fill="none" stroke="${R.blusaRaya}" stroke-width="1.3" stroke-linecap="round" d="M-7,-10 L-7.6,26 M-2.5,-12 L-2.8,29 M2.5,-12 L2.8,29 M7,-10 L7.6,26"/>`,
            `<path fill="${R.cuello}" d="M-11,26.4 Q0,31 11,26.4 L10.8,30 Q0,34.5 -10.8,30 Z"/>`,
            `<path fill="none" stroke="${COMUN.pielSombra}" stroke-width="2" stroke-linecap="round" d="M${r(-s * 6)},34 Q${r(-s * 7)},42 ${r(-s * 5)},48"/>`
        ]
        : [
            `<path fill="${R.ribete}" d="M-12.4,18.6 Q0,23 12.4,18.6 L12.6,23 Q0,27.5 -12.6,23 Z"/>`,
            `<path fill="none" stroke="${R.camisetaSombra}" stroke-width="1.6" stroke-linecap="round" opacity=".45" d="M${r(-s * 6)},-4 Q${r(-s * 9)},8 ${r(-s * 11)},17"/>`,
            `<path fill="none" stroke="${COMUN.pielSombra}" stroke-width="2" stroke-linecap="round" d="M${r(-s * 6)},34 Q${r(-s * 7)},42 ${r(-s * 5)},48"/>`
        ];
    const abajoBase = [
        `<circle class="m-piel" fill="${piel}" cx="0" cy="0" r="8.6"/>`,
        `<path class="m-piel" fill="${piel}" d="M-8.6,0 C-8.4,14 -8,28 -7.6,38 L7.6,38 C8,28 8.4,14 8.6,0 Z"/>`,
        ...mano(s)
    ];
    const abajoDetalle = [
        // Pulsera de lado.
        `<rect x="-8.9" y="29.5" width="17.8" height="7.2" rx="3" fill="${L.color}" stroke="${L.borde}" stroke-width="1.4"/>`,
        `<path fill="none" stroke="${COMUN.pielLinea}" stroke-width="1.1" stroke-linecap="round" opacity=".55" d="M${px(s, -5, 47.5)} Q0,50 ${px(s, 4, 46.5)} M${px(s, -4.4, 58)} L${px(s, -4.6, 55.5)} M${px(s, 0, 59.5)} L${px(s, -0.1, 56.5)} M${px(s, 4.4, 58.5)} L${px(s, 4.2, 56)}"/>`,
        `<path fill="none" stroke="${COMUN.pielSombra}" stroke-width="2" stroke-linecap="round" d="M-5,3.5 Q0,6 5,3.5"/>`
    ];
    const titulo = (lado === "der" ? "Brazo derecho de " : "Brazo izquierdo de ") + R.nombre;
    return svgPieza("-28 -18 56 134", 112, 268, titulo, grupoExtremidad(50, arribaBase, arribaDetalle, abajoBase, abajoDetalle, GROSOR_BRAZO));
}

// ------------------------------------------------------------------ piernas

function pierna(pj, lado) {
    const o = lado === "der" ? -1 : 1; // la punta del zapato mira hacia afuera
    const L = COMUN.lado[lado];
    const piel = COMUN.piel;
    const esZoe = pj === "zoe";
    const R = ROPA[pj];
    const arribaBase = esZoe
        // Muslo de piel con tapa redonda: la falda del tronco tapa la cadera.
        ? [
            `<circle class="m-piel" fill="${piel}" cx="0" cy="0" r="11.6"/>`,
            `<path class="m-piel" fill="${piel}" d="M-11.6,0 C-11.8,20 -11,42 -10.4,56 A10.4,10.4 0 0 0 10.4,56 C11,42 11.8,20 11.6,0 Z"/>`
        ]
        : [
            `<path class="m-piel" fill="${piel}" d="M-11.4,12 C-11.6,28 -11,44 -10.4,56 A10.4,10.4 0 0 0 10.4,56 C11,44 11.6,28 11.4,12 Z"/>`,
            // Bota del short con tapa redonda en la cadera (el short del tronco la cubre).
            `<path class="m-short" fill="${R.short}" d="M-16.6,0 A16.6,16.6 0 0 1 16.6,0 L17.4,18.5 Q0,23 -17.4,18.5 Z"/>`
        ];
    const arribaDetalle = esZoe
        ? [`<path fill="none" stroke="${COMUN.pielSombra}" stroke-width="2" stroke-linecap="round" d="M${r(o * 7)},22 Q${r(o * 8.5)},40 ${r(o * 6.5)},52"/>`]
        : [
            `<path fill="${R.shortSombra}" d="M-17.2,14.5 Q0,19 17.2,14.5 L17.4,18.5 Q0,23 -17.4,18.5 Z"/>`,
            `<path fill="none" stroke="${COMUN.pielSombra}" stroke-width="2" stroke-linecap="round" d="M${r(o * 7)},27 Q${r(o * 8.5)},40 ${r(o * 6.5)},52"/>`
        ];
    // Zapato con la punta hacia afuera; suela gruesa.
    const zapato = `M${px(o, -11.5, 29)} L${px(o, 9.5, 29)} Q${px(o, 13.5, 30.5)} ${px(o, 15, 40)} Q${px(o, 21.5, 47)} ${px(o, 21.5, 56)} Q${px(o, 21.5, 62.5)} ${px(o, 15.5, 62.5)} L${px(o, -11, 62.5)} Q${px(o, -14, 62)} ${px(o, -13.5, 50)} Z`;
    const suela = `M${px(o, -13.6, 57)} Q${px(o, -13, 62.5)} ${px(o, -11, 62.5)} L${px(o, 15.5, 62.5)} Q${px(o, 21.4, 62.5)} ${px(o, 21.5, 57)} L${px(o, 21.5, 61)} Q${px(o, 21.5, 67.5)} ${px(o, 15.5, 67.5)} L${px(o, -11, 67.5)} Q${px(o, -14, 67)} ${px(o, -13.6, 57)} Z`;
    const abajoBase = [
        `<circle class="m-piel" fill="${piel}" cx="0" cy="0" r="10.4"/>`,
        `<path class="m-piel" fill="${piel}" d="M-10.4,0 C-10.4,12 -9.8,24 -9.4,34 L9.4,34 C9.8,24 10.4,12 10.4,0 Z"/>`,
        esZoe
            ? `<path class="m-calceta" fill="${R.calceta}" d="M-10,14 L-10,36 L10,36 L10,14 Z"/>`
            : `<path class="m-media" fill="${R.media}" d="M-10,14 L-10,36 L10,36 L10,14 Z"/>`,
        `<path class="${esZoe ? "m-zapato-zoe" : "m-zapato"}" fill="${R.zapato}" d="${zapato}"/>`
    ];
    const abajoDetalle = [
        `<path fill="none" stroke="${COMUN.pielSombra}" stroke-width="2" stroke-linecap="round" d="M-5.5,4 Q0,7.5 5.5,4"/>`
    ];
    if (esZoe) {
        abajoDetalle.push(
            // Borde de la calceta en ondas.
            `<path fill="${R.calcetaSombra}" d="M-10,14 Q-7.5,17.4 -5,14 Q-2.5,17.4 0,14 Q2.5,17.4 5,14 Q7.5,17.4 10,14 L10,16.4 Q7.5,19.6 5,16.4 Q2.5,19.6 0,16.4 Q-2.5,19.6 -5,16.4 Q-7.5,19.6 -10,16.4 Z"/>`
        );
    } else {
        abajoDetalle.push(`<path fill="none" stroke="${R.mediaRaya}" stroke-width="1.2" d="M-4,20 L-4,29 M0,20 L0,29 M4,20 L4,29"/>`);
    }
    abajoDetalle.push(
        // Tobillera de lado.
        `<rect x="-10" y="14" width="20" height="5.6" rx="2" fill="${L.color}" stroke="${L.borde}" stroke-width="1.2"/>`,
        `<path fill="${esZoe ? R.zapatoSombra : R.suela}" d="${suela}"/>`,
        `<path fill="none" stroke="${R.zapatoSombra}" stroke-width="1.4" stroke-linecap="round" opacity=".7" d="M${px(o, -13, 56.5)} L${px(o, 21, 56.5)}"/>`,
        // Dos tiras de velcro (Zeus) o la tira de la balerina (Zoe).
        `<path fill="none" stroke="${esZoe ? R.zapatoSombra : "#ffffff"}" stroke-width="1.9" stroke-linecap="round" d="M${px(o, -3, 38)} Q${px(o, 4, 35.5)} ${px(o, 11, 38.5)} M${px(o, -2, 44)} Q${px(o, 5.5, 41.5)} ${px(o, 13, 44.5)}"/>`
    );
    const titulo = (lado === "der" ? "Pierna derecha de " : "Pierna izquierda de ") + R.nombre;
    return svgPieza("-36 -20 72 150", 144, 300, titulo, grupoExtremidad(56, arribaBase, arribaDetalle, abajoBase, abajoDetalle, GROSOR_PIERNA));
}

// ------------------------------------------------------------------ salida

const PERSONAJES = {
    zeus: { cabeza: cabezaZeus, tronco: troncoZeus },
    zoe: { cabeza: cabezaZoe, tronco: troncoZoe }
};

Object.keys(PERSONAJES).forEach((pj) => {
    const dir = path.join(raizImg, pj);
    fs.mkdirSync(dir, { recursive: true });
    const archivos = {
        "cabeza.svg": PERSONAJES[pj].cabeza(),
        "tronco.svg": PERSONAJES[pj].tronco(),
        "brazo_izq.svg": brazo(pj, "izq"),
        "brazo_der.svg": brazo(pj, "der"),
        "pierna_izq.svg": pierna(pj, "izq"),
        "pierna_der.svg": pierna(pj, "der")
    };
    Object.keys(archivos).forEach((n) => {
        fs.writeFileSync(path.join(dir, n), archivos[n], "utf8");
        console.log("escrito img/" + pj + "/" + n);
    });
});
