/**
 * Genera las piezas SVG de Zeus y Zoe en ropa deportiva para "Puzle de Siluetas en Acción".
 * Salida: public/catalogo_juegos/Polimotor/PuzleDeSiluetasEnAccion/img/{zeus,zoe}/
 *         {cabeza,tronco,brazo_extendido,brazo_flexionado,pierna_recta,pierna_doblada,tenis_izq,tenis_der}.svg
 * Uso: node scripts/generar-svg-puzle-siluetas.js
 *
 * Son los personajes oficiales (img/zeus_normal.gif, img/zoe_normal.gif) vistos de perfil, mirando
 * a la derecha (+x), con ropa de atleta en sus mismos colores:
 *   Zeus  pelo castaño con remolino, camiseta verde con cuello verde claro, pantaloneta azul con
 *         franja blanca, medias blancas y dorsal con rayo.
 *   Zoe   pelo cobrizo con coletas y gancho amarillo, camiseta azul clara acanalada con cuello azul,
 *         falda-short rosada, calcetas rosadas y dorsal con el corazón amarillo.
 * Los tenis llevan el color de lado del juego (izquierdo amarillo, derecho verde).
 *
 * Formato que lee personajes.js:
 *   - Pivote en (0,0): cuello (cabeza), cadera (tronco), hombro (brazos), cadera (piernas), tobillo (tenis).
 *   - g.base: formas que dan la silueta, con class="pz-forma" (el juego las reutiliza para la sombra,
 *     el contorno neón y la silueta oscura cambiando el relleno por CSS).
 *   - g.detalle: cara, costuras, dorsal, cordones… (solo en la pieza a color).
 *   - El viewBox es solo el encuadre del archivo; el juego dibuja en coordenadas de la pieza.
 * Medidas ligadas a posturas.js (ESQUELETO, CENTROS, RADIOS): cuello del tronco (0,-92), hombro (4,-78),
 * cadera (0,-8); brazo estirado hasta la mano en y≈105, codo del flexionado en (0,54) y puño en (50,54);
 * tobillo de la pierna recta en (0,124) y de la doblada en (-64,64). NO cambiarlas: de ellas dependen
 * el encaje, el giro y la validación de cada pieza.
 */
const fs = require("fs");
const path = require("path");

const raizImg = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "PuzleDeSiluetasEnAccion", "img");

const C = {
    piel: "#f2c6b9",
    pielSombra: "#e5a796",
    pielLinea: "#c98a7a",
    oreja: "#ed887c",
    mejilla: "#f2b09f",
    peca: "#d98a74",
    nariz: "#eaa694",
    iris: "#2c211c",
    parpado: "#5a3226",
    boca: "#a74c3a",
    lengua: "#d26f69",
    pin: "#b8c2cc"
};

const ROPA = {
    zeus: {
        nombre: "Zeus",
        pelo: "#7f3f1a",
        peloSombra: "#5b2c11",
        ceja: "#974b2b",
        camiseta: "#2b896f",
        camisetaSombra: "#24735a",
        ribete: "#8cc97c",
        ribeteRaya: "#6db85f",
        short: "#004f6d",
        shortSombra: "#06405a",
        franja: "#ffffff",
        media: "#fffdfc",
        mediaRaya: "#d5dbe3",
        munequera: "#ffffff",
        munequeraRaya: "#8cc97c",
        icono: "#ffd43b",
        iconoBorde: "#e0a800"
    },
    zoe: {
        nombre: "Zoe",
        pelo: "#984c2c",
        peloSombra: "#6e3218",
        ceja: "#974e34",
        camiseta: "#95d3f0",
        camisetaSombra: "#6fbfe6",
        camisetaRaya: "#86c3e8",
        ribete: "#02a1dd",
        ribeteRaya: "#5cc3ee",
        short: "#e1709c",
        shortSombra: "#c85a86",
        shortClaro: "#f093b8",
        franja: "#ffffff",
        media: "#e892b5",
        mediaRaya: "#d6779f",
        munequera: "#e892b5",
        munequeraRaya: "#d6779f",
        icono: "#f0e387",
        iconoBorde: "#d9c55a",
        mono: "#a0d7f1",
        monoRaya: "#5fb0e0",
        gancho: "#eee885",
        ganchoBorde: "#d8c14a"
    }
};

/** Color de lado de los tenis (pista de lateralidad del juego). */
const LADOS = {
    izq: { tenis: "#ffd43b", sombra: "#e0a800", nombre: "izquierdo" },
    der: { tenis: "#51cf66", sombra: "#2b9a44", nombre: "derecho" }
};

/** Forma de silueta (va en g.base). */
const forma = (color, d) => `<path class="pz-forma" fill="${color}" d="${d}"/>`;
const formaEl = (tag, color, attrs) => `<${tag} class="pz-forma" fill="${color}" ${attrs}/>`;
const trazo = (color, ancho, d, extra) => `<path fill="none" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round"${extra ? " " + extra : ""} d="${d}"/>`;

function svgPieza(viewBox, titulo, base, detalle) {
    const [, , w, h] = viewBox.split(" ").map(Number);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w * 2}" height="${h * 2}">
  <title>${titulo}</title>
  <!-- Pieza de Puzle de Siluetas en Acción. Generado por scripts/generar-svg-puzle-siluetas.js -->
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

/** Cara de perfil de tres cuartos mirando a la derecha: ojos grandes, pecas y boca abierta (oficial). */
function cara(R, pestanas) {
    const pecas = [[17, -34], [20.5, -31.5], [15, -30.5], [24.5, -34.5], [28, -32], [33.5, -35]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.95" fill="${C.peca}" opacity=".8"/>`);
    const det = [
        // Oreja: borde suave e interior rosado.
        `<ellipse cx="-7.5" cy="-46" rx="6.6" ry="8.6" fill="none" stroke="${C.pielSombra}" stroke-width="1.5"/>`,
        trazo(C.oreja, 2.6, "M-5.5,-51 Q-11,-47 -8.5,-40.5"),
        // Sombra bajo la mandíbula.
        `<path fill="${C.pielSombra}" opacity=".45" d="M-12,-16 Q4,-8 20,-12.5 Q6,-6.5 -6,-10 Z"/>`,
        // Cejas gruesas.
        trazo(R.ceja, 3.4, "M8,-58.5 Q14.5,-63 21.5,-58.5 M26.5,-59 Q30.5,-62 34.5,-57.5"),
        // Ojos: el cercano grande, el lejano más angosto; el iris mira un poco hacia abajo.
        `<g class="pz-ojos">
      <ellipse cx="15" cy="-46.5" rx="7.4" ry="7.8" fill="#fff"/>
      <ellipse cx="30" cy="-46.5" rx="5" ry="7.4" fill="#fff"/>
      <ellipse cx="16.6" cy="-43.6" rx="4.6" ry="4.6" fill="${C.iris}"/>
      <ellipse cx="31.2" cy="-43.8" rx="3.3" ry="4.3" fill="${C.iris}"/>
      <circle cx="18.2" cy="-45.2" r="1.3" fill="#fff"/>
      <circle cx="32.3" cy="-45.4" r="1" fill="#fff"/>
      <path fill="none" stroke="${C.parpado}" stroke-width="1.05" stroke-linecap="round" d="M7.6,-47.5 Q14.5,-56.5 22.4,-48 M25,-48 Q30,-55.5 35,-48.5"/>
    </g>`
    ];
    if (pestanas) {
        det.push(trazo(C.iris, 1.5, "M22.2,-49.6 L25.2,-51.4 M22.7,-47.6 L25.8,-48.4 M34.9,-50.2 L37.1,-51.8"));
    }
    det.push(
        `<ellipse cx="23" cy="-31" rx="7" ry="4.4" fill="${C.mejilla}" opacity=".45"/>`,
        ...pecas,
        // Nariz redonda en el borde de la cara.
        `<ellipse cx="36.4" cy="-38" rx="4.6" ry="3.7" fill="${C.nariz}"/>`,
        `<ellipse cx="35.4" cy="-39.2" rx="1.4" ry="0.9" fill="#fff" opacity=".55"/>`,
        // Boca abierta: dientes arriba y lengua abajo.
        `<path fill="${C.boca}" d="M16.5,-28 Q24.5,-26.2 32.4,-29 Q31,-18.2 24.6,-18 Q18.4,-17.9 16.5,-28 Z"/>`,
        `<path fill="#fff" d="M18,-27.3 Q24.5,-25.6 30.9,-28.1 L30.5,-25.6 Q24.5,-23.6 18.6,-25.1 Z"/>`,
        `<path fill="${C.lengua}" d="M19.6,-21.2 Q24.6,-24.4 29.4,-21.6 Q27.4,-18.4 24.6,-18.4 Q21.4,-18.4 19.6,-21.2 Z"/>`
    );
    return det;
}

const CUELLO_PIEL = formaEl("rect", C.piel, 'x="-7.5" y="-22" width="15" height="26" rx="6"');
// Cabeza redonda con el mentón un poco adelante y la nariz que sobresale.
const CRANEO = forma(C.piel, "M2,-82 C22,-82 35,-67 35,-50 C35,-43 37,-38 36,-32 C35,-21 28,-11 13,-10.5 C-1,-10 -15,-15 -22,-23 C-29,-31 -31,-41 -31,-51 C-31,-68 -17,-82 2,-82 Z");
const NARIZ = formaEl("ellipse", C.piel, 'cx="36.4" cy="-38" rx="4.8" ry="3.9"');
const OREJA = formaEl("ellipse", C.piel, 'cx="-7.5" cy="-46" rx="6.6" ry="8.6"');

function cabezaZeus() {
    const R = ROPA.zeus;
    const base = [
        CUELLO_PIEL,
        CRANEO,
        NARIZ,
        // Pelo: casco que cubre la nuca y flequillo barrido hacia la frente en puntas.
        forma(R.pelo, "M-30,-30 C-36,-46 -34,-72 -16,-84 C-2,-92 22,-90 34,-76 C39,-70 40,-63 38,-57 L33.5,-61 L31.5,-55 L26,-61 L22,-54.5 L16.5,-60.5 C11,-62.5 4,-62 -1,-58 C-6,-61.5 -12,-60 -15,-54 C-17,-46 -18.5,-38 -22.5,-31 Z"),
        // Remolino: mechones parados arriba.
        forma(R.pelo, "M-15,-83 Q-20.5,-91 -15.5,-96 Q-14.5,-90 -9,-86 Z"),
        forma(R.pelo, "M-6.5,-86.5 Q-6.5,-94 -0.5,-97.5 Q-2.5,-91.5 2,-88 Z"),
        OREJA
    ];
    const detalle = [
        ...cara(R, false),
        // Vetas del pelo siguiendo el peinado (de la coronilla hacia la frente).
        trazo(R.peloSombra, 1.5, "M-10,-82 Q12,-84 30,-68 M-6,-74 Q10,-76 24,-64 M-22,-74 Q-28,-60 -27,-42 M-14,-66 Q-20,-56 -20,-42 M2,-87 Q22,-86 35,-72", 'opacity=".55"'),
        trazo(R.peloSombra, 0.8, "M-16,-78 Q4,-82 22,-70 M-2,-80 Q16,-80 30,-64 M-26,-66 Q-31,-54 -29,-38 M8,-70 Q18,-68 26,-62", 'opacity=".4"'),
        trazo(R.peloSombra, 1.2, "M-14.5,-86 Q-17,-90.5 -15,-94 M-4.5,-89 Q-4.5,-93.5 -1,-96", 'opacity=".45"'),
        // Sombra del cuello bajo la mandíbula.
        `<path fill="${C.pielSombra}" d="M-7.5,-14 Q0,-9 7.5,-12 L7.5,-8 Q0,-5 -7.5,-10 Z"/>`
    ];
    return svgPieza("-46 -106 92 112", "Cabeza de Zeus", base, detalle);
}

function cabezaZoe() {
    const R = ROPA.zoe;
    const base = [
        // Coleta detrás de la cabeza (sale de la nuca, como las del personaje oficial).
        forma(R.pelo, "M-25,-37 Q-43,-41 -50,-25 Q-55,-12 -49,-1 L-47,-8.5 L-43,-0.5 L-41.5,-9 L-37,-2 Q-38,-15 -27,-24 Z"),
        CUELLO_PIEL,
        CRANEO,
        NARIZ,
        // Pelo con raya al medio: cae liso hacia la nuca y el flequillo en mechas sobre la frente.
        forma(R.pelo, "M-29,-27 C-37,-46 -33,-74 -12,-85 C4,-92 24,-88 35,-75 C39,-69 40,-62 38.5,-56 L34,-60.5 L32,-54 L27,-60.5 L23.5,-53.5 L18.5,-60 C12,-62.5 5,-62 -0.5,-58 C-6,-61 -12,-59.5 -15,-54 C-17,-46 -18,-36 -21.5,-28 Z"),
        OREJA
    ];
    const detalle = [
        ...cara(R, true),
        // Raya al medio y mechas.
        trazo(R.peloSombra, 1.8, "M-2,-88 Q2,-80 4,-72", 'opacity=".55"'),
        trazo(R.peloSombra, 1.4, "M4,-84 Q20,-82 31,-68 M6,-76 Q18,-74 26,-64 M-6,-84 Q-22,-76 -27,-56 M-8,-76 Q-18,-66 -21,-46 M-28,-50 Q-30,-40 -27,-30", 'opacity=".5"'),
        trazo(R.peloSombra, 1.2, "M-42,-30 Q-48,-20 -46,-8 M-36,-28 Q-41,-18 -40,-8", 'opacity=".5"'),
        // Moño azul de la coleta.
        `<g transform="translate(-26.5,-31) rotate(-35)">
      <ellipse rx="5.2" ry="7.2" fill="${R.mono}" stroke="${R.monoRaya}" stroke-width="1.1"/>
      <path fill="none" stroke="${R.monoRaya}" stroke-width="1" d="M-3.6,-3.4 L3.6,-3.4 M-4.2,0 L4.2,0 M-3.6,3.4 L3.6,3.4"/>
    </g>`,
        // Gancho amarillo en el flequillo.
        `<g transform="translate(12,-74) rotate(-62)">
      <path fill="${R.gancho}" stroke="${R.ganchoBorde}" stroke-width="1.2" d="M0,-8 C4.6,-4.5 5.4,3.5 0,8.2 C-5.4,3.5 -4.6,-4.5 0,-8 Z"/>
      <path fill="${R.pelo}" d="M0,-2.6 C1.6,-1 1.8,1.8 0,3.6 C-1.8,1.8 -1.6,-1 0,-2.6 Z"/>
    </g>`,
        `<path fill="${C.pielSombra}" d="M-7.5,-14 Q0,-9 7.5,-12 L7.5,-8 Q0,-5 -7.5,-10 Z"/>`
    ];
    return svgPieza("-56 -100 100 106", "Cabeza de Zoe", base, detalle);
}

// ------------------------------------------------------------------ tronco

/** Dorsal de atleta en el pecho con el ícono del personaje. */
function dorsal(R, icono) {
    return [
        `<rect x="3" y="-68" width="22" height="22" rx="4" fill="#ffffff" stroke="${R.camisetaSombra}" stroke-width="1.4"/>`,
        `<circle cx="6.6" cy="-64.4" r="1.2" fill="${C.pin}"/>`,
        `<circle cx="21.4" cy="-64.4" r="1.2" fill="${C.pin}"/>`,
        icono
    ];
}

function troncoZeus() {
    const R = ROPA.zeus;
    const base = [
        // Pantaloneta deportiva (la camiseta va por fuera).
        forma(R.short, "M-23,-28 L27,-28 L28.5,4 Q2,10 -24.5,4 Z"),
        // Camiseta: espalda a la izquierda, pecho a la derecha.
        forma(R.camiseta, "M-20.5,-14 L-22.5,-70 Q-22,-90 -3,-92 L8,-92 Q27,-90 28,-70 L27,-14 Q3,-9 -20.5,-14 Z")
    ];
    const detalle = [
        // Sombra de la espalda y del dobladillo.
        `<path fill="${R.camisetaSombra}" opacity=".55" d="M-20.5,-14 L-22.5,-70 Q-22,-84 -14,-88 Q-16,-60 -12,-15 Z"/>`,
        `<path fill="${R.camisetaSombra}" opacity=".5" d="M-20.5,-18 Q3,-13 27,-18 L27,-14 Q3,-9 -20.5,-14 Z"/>`,
        // Cuello redondo acanalado en verde claro.
        trazo(R.ribete, 5.5, "M-5,-91 Q4,-83 14,-91"),
        trazo(R.ribeteRaya, 1, "M-4,-89 Q4,-82 13,-89", 'stroke-dasharray="1.4 1.6"'),
        ...dorsal(R, `<path fill="${R.icono}" stroke="${R.iconoBorde}" stroke-width="1.3" stroke-linejoin="round" d="M17.5,-64.5 L9,-55 L14,-55 L10.5,-48.5 L19.5,-58 L14.5,-58 L18,-64.5 Z"/>`),
        // Pretina, franja blanca lateral y dobladillo de la pantaloneta.
        `<path fill="${R.shortSombra}" d="M-24.5,-1 Q2,5 28.3,-1 L28.5,4 Q2,10 -24.5,4 Z" opacity=".8"/>`,
        trazo(R.franja, 3.6, "M2.5,-10 L3.5,4.5"),
        trazo(R.shortSombra, 1.4, "M8,-12 Q14,-8 20,-12", 'opacity=".8"')
    ];
    return svgPieza("-30 -98 64 112", "Tronco de Zeus", base, detalle);
}

function troncoZoe() {
    const R = ROPA.zoe;
    // Cuello de la camiseta: banda azul con el borde de abajo en ondas (como la blusa oficial).
    const ondas = [];
    for (let i = 0; i < 5; i++) {
        const x = -4 + i * 3.8;
        ondas.push(`<circle cx="${x.toFixed(1)}" cy="${(-87.8 + Math.sin((i / 4) * Math.PI) * 4.8).toFixed(1)}" r="2.1" fill="${R.ribete}"/>`);
    }
    const base = [
        // Falda deportiva de tablas, en A (debajo lleva licra rosada: ver la pierna).
        forma(R.short, "M-23.5,-30 L27.5,-30 L35,7 Q3,13.5 -31,7 Z"),
        // Camiseta.
        forma(R.camiseta, "M-20.5,-20 L-22.5,-70 Q-22,-90 -3,-92 L8,-92 Q27,-90 28,-70 L27,-20 Q3,-15 -20.5,-20 Z")
    ];
    const detalle = [
        // Camiseta acanalada (rayas verticales como la blusa oficial).
        trazo(R.camisetaRaya, 1.3, "M-16,-84 L-15,-20 M-10,-88 L-9.5,-19 M-4,-89 L-3.5,-18 M2,-83 L2,-17 M26,-74 L25.5,-20"),
        `<path fill="${R.camisetaSombra}" opacity=".45" d="M-20.5,-20 L-22.5,-70 Q-22,-84 -14,-88 Q-16,-60 -12,-21 Z"/>`,
        // Cuello azul con ondas.
        trazo(R.ribete, 4.2, "M-5,-91 Q4,-84 14,-91"),
        ...ondas,
        trazo(R.ribeteRaya, 0.9, "M-4.4,-91.4 Q4,-85 13.4,-91.4", 'opacity=".8"'),
        ...dorsal(R, `<path fill="${R.icono}" stroke="${R.iconoBorde}" stroke-width="1.2" d="M14,-49.5 C7.5,-54 4.6,-57.6 6.4,-61.4 C8.2,-64.6 12,-64 14,-60.8 C16,-64 19.8,-64.6 21.6,-61.4 C23.4,-57.6 20.5,-54 14,-49.5 Z"/>`),
        // Sombra de la espalda y bajo la camiseta, tablas y ribete blanco en el ruedo
        // (la pretina queda tapada por la camiseta).
        `<path fill="${R.shortSombra}" opacity=".35" d="M-23,-20 L-31,7 Q-25.5,8.6 -19.5,9.6 L-16.5,-19 Z"/>`,
        `<path fill="${R.shortSombra}" opacity=".5" d="M-20.5,-20 Q3,-15 27,-20 L27.2,-17.5 Q3,-12.5 -20.8,-17.5 Z"/>`,
        trazo(R.shortSombra, 1.5, "M-12,-16.5 L-17,9.6 M-1,-15.5 L-3,11.5 M10,-15.5 L12.5,11.8 M20.5,-17 L26,10", 'opacity=".7"'),
        trazo(R.shortClaro, 1.2, "M-9.5,-16 L-14,10.4 M1.6,-15.3 L0,11.9 M12.6,-15.6 L15.5,11.6", 'opacity=".8"'),
        trazo(R.franja, 2.2, "M-29.4,4.4 Q3,10.8 33.4,4.4")
    ];
    return svgPieza("-34 -98 72 114", "Tronco de Zoe", base, detalle);
}

// ------------------------------------------------------------------ brazos

/** Puño de perfil con el pulgar adelante. cx,cy = centro; dir = 1 si el antebrazo baja, 0 si va al frente. */
function puno(cx, cy, alFrente) {
    const base = [formaEl("circle", C.piel, `cx="${cx}" cy="${cy}" r="10"`)];
    const det = [];
    if (alFrente) {
        base.push(formaEl("ellipse", C.piel, `cx="${cx - 2}" cy="${cy - 8}" rx="5" ry="3.6"`));
        det.push(trazo(C.pielLinea, 1.1, `M${cx + 3},${cy - 6} Q${cx + 8},${cy - 3} ${cx + 8},${cy + 2} M${cx + 2},${cy - 1} Q${cx + 6},${cy + 1} ${cx + 6},${cy + 5} M${cx},${cy + 4} Q${cx + 3},${cy + 6} ${cx + 3},${cy + 8.5}`, 'opacity=".6"'));
    } else {
        base.push(formaEl("ellipse", C.piel, `cx="${cx + 7.5}" cy="${cy - 3}" rx="3.6" ry="5"`));
        det.push(trazo(C.pielLinea, 1.1, `M${cx - 6},${cy + 3} Q${cx - 2},${cy + 8} ${cx + 3},${cy + 7} M${cx - 6},${cy - 1} Q${cx - 2},${cy + 4} ${cx + 3},${cy + 3}`, 'opacity=".6"'));
    }
    return { base, det };
}

function manga(R, pj) {
    const base = [
        formaEl("circle", R.camiseta, 'cx="0" cy="0" r="11.5"'),
        formaEl("rect", R.camiseta, 'x="-11.5" y="0" width="23" height="21" rx="4"')
    ];
    const det = [
        // Ribete de la manga (verde claro en Zeus, azul en Zoe).
        `<path fill="${R.ribete}" d="M-11.5,16 Q0,19 11.5,16 L11.5,21 Q0,24.5 -11.5,21 Z"/>`,
        trazo(R.camisetaSombra, 1.6, "M-6,-6 Q-9,4 -10,14", 'opacity=".45"')
    ];
    if (pj === "zoe") det.unshift(trazo(R.camisetaRaya, 1.2, "M-6,-9 L-6.5,15 M-1,-11 L-1,16 M4,-10 L4.5,15", ""));
    return { base, det };
}

function brazo(pj, flexionado) {
    const R = ROPA[pj];
    const m = manga(R, pj);
    const base = [];
    const det = [];
    if (flexionado) {
        base.push(
            formaEl("rect", C.piel, 'x="-7.6" y="14" width="15.2" height="47" rx="7.6"'),
            formaEl("rect", C.piel, 'x="-6" y="46.5" width="46" height="15" rx="7.5"')
        );
        const p = puno(50, 54, true);
        base.push(...p.base);
        det.push(
            trazo(C.pielSombra, 2, "M-3,52 Q1,57 5,55"),
            // Muñequera deportiva.
            `<rect x="33" y="45.8" width="7.4" height="16.4" rx="2.5" fill="${R.munequera}"/>`,
            trazo(R.munequeraRaya, 1.6, "M36.7,47.5 L36.7,60.5"),
            ...p.det
        );
    } else {
        base.push(formaEl("rect", C.piel, 'x="-7.6" y="14" width="15.2" height="88" rx="7.6"'));
        const p = puno(0, 105, false);
        base.push(...p.base);
        det.push(
            trazo(C.pielSombra, 2, "M-3,56 Q0,59 3,56"),
            `<rect x="-8.2" y="84" width="16.4" height="7.4" rx="2.5" fill="${R.munequera}"/>`,
            trazo(R.munequeraRaya, 1.6, "M-7,87.7 L7,87.7"),
            ...p.det
        );
    }
    const titulo = (flexionado ? "Brazo doblado de " : "Brazo estirado de ") + R.nombre;
    const vb = flexionado ? "-16 -16 80 84" : "-18 -16 36 136";
    return svgPieza(vb, titulo, [...m.base, ...base], [...m.det, ...det]);
}

// ------------------------------------------------------------------ piernas

function pierna(pj, doblada) {
    const R = ROPA[pj];
    const esZoe = pj === "zoe";
    // El muslo empieza dentro de la licra o de la bota, que se dibujan encima (sin bordes sueltos).
    const muslo = 4;
    const base = esZoe
        // Licra corta bajo la falda, ajustada al muslo (la falda del tronco la tapa).
        ? [
            formaEl("circle", R.short, 'cx="0" cy="0" r="11"'),
            formaEl("rect", R.short, 'x="-10.6" y="0" width="21.2" height="13" rx="4"')
        ]
        // Bota de la pantaloneta con tapa redonda en la cadera.
        : [
            formaEl("circle", R.short, 'cx="0" cy="0" r="13.5"'),
            formaEl("rect", R.short, 'x="-13.5" y="0" width="27" height="25" rx="4"')
        ];
    const det = esZoe
        ? [`<path fill="${R.shortSombra}" opacity=".8" d="M-10.6,9.6 Q0,11.2 10.6,9.6 L10.6,13 Q0,14.6 -10.6,13 Z"/>`]
        : [
            `<path fill="${R.shortSombra}" opacity=".75" d="M-13.5,20.5 Q0,23 13.5,20.5 L13.5,25 Q0,27.5 -13.5,25 Z"/>`,
            trazo(R.franja, 3.4, "M1.5,-6 L1.5,20")
        ];
    // Borde superior de la media: liso con rayas (Zeus) o en ondas (Zoe, como la calceta oficial).
    const bordeMedia = (x0, y0, ancho, alto, vertical) => {
        if (!esZoe) {
            return vertical
                ? trazo(R.mediaRaya, 1.4, `M${x0 + 3},${y0 + 4} L${x0 + ancho - 3},${y0 + 4} M${x0 + 3},${y0 + 8} L${x0 + ancho - 3},${y0 + 8}`)
                : trazo(R.mediaRaya, 1.4, `M${x0 + ancho - 4},${y0 + 3} L${x0 + ancho - 4},${y0 + alto - 3} M${x0 + ancho - 8},${y0 + 3} L${x0 + ancho - 8},${y0 + alto - 3}`);
        }
        if (vertical) {
            const n = 4;
            const paso = ancho / n;
            let d = `M${x0},${y0}`;
            for (let i = 0; i < n; i++) d += ` Q${x0 + paso * (i + 0.5)},${y0 + 4} ${x0 + paso * (i + 1)},${y0}`;
            d += ` L${x0 + ancho},${y0 + 2.6}`;
            for (let i = n; i > 0; i--) d += ` Q${x0 + paso * (i - 0.5)},${y0 + 6.6} ${x0 + paso * (i - 1)},${y0 + 2.6}`;
            return `<path fill="${R.mediaRaya}" d="${d} Z"/>`;
        }
        const n = 4;
        const paso = alto / n;
        const xb = x0 + ancho;
        let d = `M${xb},${y0}`;
        for (let i = 0; i < n; i++) d += ` Q${xb - 4},${y0 + paso * (i + 0.5)} ${xb},${y0 + paso * (i + 1)}`;
        d += ` L${xb - 2.6},${y0 + alto}`;
        for (let i = n; i > 0; i--) d += ` Q${xb - 6.6},${y0 + paso * (i - 0.5)} ${xb - 2.6},${y0 + paso * (i - 1)}`;
        return `<path fill="${R.mediaRaya}" d="${d} Z"/>`;
    };
    if (doblada) {
        base.push(
            formaEl("rect", C.piel, `x="-9.6" y="${muslo}" width="19.2" height="${72 - muslo}" rx="9.6"`),
            formaEl("rect", C.piel, 'x="-50" y="54.4" width="58" height="19.2" rx="9.6"'),
            formaEl("rect", R.media, 'x="-66" y="53.6" width="22" height="20.8" rx="6"')
        );
        det.push(
            trazo(C.pielSombra, 2.2, "M3,58 Q8,64 3,70"),
            trazo(C.pielSombra, 2, "M-30,58 Q-26,64 -30,70", 'opacity=".6"'),
            bordeMedia(-66, 53.6, 22, 20.8, false)
        );
    } else {
        base.push(
            formaEl("rect", C.piel, `x="-9.6" y="${muslo}" width="19.2" height="${110 - muslo}" rx="9.6"`),
            formaEl("rect", R.media, 'x="-10.4" y="102" width="20.8" height="24" rx="6"')
        );
        det.push(
            trazo(C.pielSombra, 2.2, "M3,60 Q7,64 3,69"),
            bordeMedia(-10.4, 102, 20.8, 24, true)
        );
    }
    // La licra o la bota van encima del muslo.
    const ropa = base.splice(0, 2);
    base.splice(1, 0, ...ropa);
    const titulo = (doblada ? "Pierna doblada de " : "Pierna estirada de ") + R.nombre;
    const vb = doblada ? "-70 -18 88 96" : "-18 -18 36 148";
    return svgPieza(vb, titulo, base, det);
}

// ------------------------------------------------------------------ tenis

/** Tenis redondeado como los zapatos oficiales: suela blanca gruesa y dos tiras de velcro. */
function tenis(pj, lado) {
    const R = ROPA[pj];
    const L = LADOS[lado];
    const base = [
        forma(L.tenis, "M-12,-9.5 Q-17.5,0 -15,13 L40,13 Q48.5,12 47,3.5 Q45,-4.5 32,-5.5 Q22,-6.5 15.5,-12.5 Q2,-17.5 -12,-9.5 Z"),
        formaEl("rect", "#ffffff", 'x="-17" y="10.5" width="66" height="8.5" rx="4.2"')
    ];
    const det = [
        `<rect x="-17" y="10.5" width="66" height="8.5" rx="4.2" fill="none" stroke="${L.sombra}" stroke-width="1.5"/>`,
        // Talón y puntera más oscuros.
        `<path fill="${L.sombra}" d="M-12,-9.5 Q-17.5,0 -15,13 L-9.5,13 Q-11.5,2 -7.5,-8 Z"/>`,
        `<path fill="${L.sombra}" opacity=".55" d="M36,13 L40,13 Q48.5,12 47,3.5 Q46,0 42.5,-2 Q45,6 36,13 Z"/>`,
        // Dos tiras de velcro blancas sobre el empeine.
        trazo("#ffffff", 3.4, "M8,-11 Q15,-3 13,7.5 M18,-7.5 Q25,-1 23.5,8.5"),
        // Boca del tenis (donde entra la media).
        `<path fill="${R.media}" stroke="${L.sombra}" stroke-width="1.2" d="M-9.5,-10.5 Q0,-15 9.5,-12 Q3,-8.5 -9.5,-10.5 Z"/>`
    ];
    const titulo = "Tenis " + L.nombre + " de " + R.nombre;
    return svgPieza("-20 -20 72 42", titulo, base, det);
}

// ------------------------------------------------------------------ salida

const CABEZAS = { zeus: cabezaZeus, zoe: cabezaZoe };
const TRONCOS = { zeus: troncoZeus, zoe: troncoZoe };

Object.keys(ROPA).forEach((pj) => {
    const dir = path.join(raizImg, pj);
    fs.mkdirSync(dir, { recursive: true });
    const archivos = {
        "cabeza.svg": CABEZAS[pj](),
        "tronco.svg": TRONCOS[pj](),
        "brazo_extendido.svg": brazo(pj, false),
        "brazo_flexionado.svg": brazo(pj, true),
        "pierna_recta.svg": pierna(pj, false),
        "pierna_doblada.svg": pierna(pj, true),
        "tenis_izq.svg": tenis(pj, "izq"),
        "tenis_der.svg": tenis(pj, "der")
    };
    Object.keys(archivos).forEach((n) => {
        fs.writeFileSync(path.join(dir, n), archivos[n], "utf8");
        console.log("escrito img/" + pj + "/" + n);
    });
});
