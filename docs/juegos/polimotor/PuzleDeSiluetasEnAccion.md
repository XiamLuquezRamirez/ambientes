# El Puzle de Siluetas en Acción (`public/catalogo_juegos/Polimotor/PuzleDeSiluetasEnAccion/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Transición 5-6 años, independiente del Espejo. En el **Estadio de Atletismo
Mágico** se ve la silueta oscura de Zoe o Zeus en una pose deportiva (zona central) y las piezas desordenadas y
giradas en la bandeja (zona lateral). El niño elige una pieza, la gira con flechas curvas y la arrastra a la sombra.
Mismo patrón modular que el Espejo:

| Archivo | Global | Qué hace |
|---|---|---|
| `posturas.js` | `Posturas` | Reglas puras (también `module.exports`): esqueleto de perfil, cinemática directa, pasos, identidad de piezas, `evaluarSoltado`, `orientada`. |
| `personajes.js` | `Personajes` | Dibujo SVG de cada pieza de Zoe y Zeus de perfil (`base` con `.pz-forma` + `detalle`). |
| `piezas.js` | `Piezas` | Capas de una pieza (`.pz-neon`, `.pz-color`, `.pz-sombra`), silueta en dos pasadas y pista punteada. |
| `tablero.js` | `Tablero` | Un solo `<svg id="escenario-svg">` con silueta y bandeja; viewBox según la forma de la pantalla; piezas sueltas, encaje, `posar(poseMap)`. |
| `rotacion.js` | `Rotacion` | Aro y dos botones con flechas curvas (≥ 68 px, dejar apretado sigue girando). |
| `arrastre.js` | `Arrastre` | Pointer Events: toque corto elige, más de 8 px arrastra. |
| `animaciones.js` | `SiluetaAnim` | Tweens con respaldo `setTimeout`, `transformar` (la silueta cobra vida) y `actuar` (salto, carrera, equilibrio, giro). |
| `estadio.js/.css` | `Estadio` | Fondo SVG (pista, gradas con público, pantalla LED, torres de luz, neón con energía) y reacciones. |
| `estadio-phaser.js` | `EstadioPhaser` | Phaser 4: chispas que suben, anillos de energía, destellos, confeti y fuegos. |
| `demo.js` | `SiluetasDemo` | Demo con `PedniaTutorial.correr` y la mano (los 12 pasos del guion). |
| `script.js` | — | Flujo, selección, validación, ayuda, transformación, final y victoria. |

- **Esqueleto de perfil** (mira a +x): cadera del tronco en (0,0); ángulos en grados con el sentido de `rotate()`.
  Brazo 0 = colgando, −90 = al frente, 180 = arriba; pierna 0 = vertical, −90 = muslo al frente; tronco + = inclinado
  adelante; tenis 0 = suela plana (por defecto sigue la canilla). El lado derecho queda adelante y el izquierdo atrás.
- **Posturas en `config.json → etapas[].posturas[]`** solo con ángulos y formas: `cuerpo {tronco, cabeza}`,
  `brazos[] {lado, forma: extendido|flexionado, angulo, doble}` y `piernas[] {lado, forma: recta|doblada, angulo, tenis}`.
  `Posturas.normalizarPostura` calcula pivotes y centros (las piezas quedan unidas). `orden` opcional, `audio`, `pista`,
  `animacion` (salto, carrera, equilibrio, giro). `doble: true` = los dos brazos juntos (se ven superpuestos de perfil):
  así el nivel 1 tiene 7 piezas.
- **Partida = 3 rondas**: una silueta al azar de cada nivel, en orden (`armarRondas` en `script.js`; regla fija, no
  depende de config). Cada ronda abre con el rótulo "Ronda N de 3 · Nivel N" y el panel muestra "Ronda N de 3".
- **Identidad**: tipo + forma (+ doble) (+ lado solo en los tenis). Dos piezas iguales son intercambiables.
  Tenis izquierdo amarillo y derecho verde; la silueta marca cada tobillo con su color.
- **Validación** (`evaluarSoltado`, por el centro visual): `encaje`, `orientacion`, `vecino` (el tenis antes de su
  pierna), `forma` (Zeus: "¡Observa la rodilla!…"), `lado`, `lugar`, `nada` (vuelve a la bandeja sin aviso).
  Tolerancia 20° (nivel 1: 22°, nivel 3: 18°), paso de giro 15°, radio 55 (90 si ya está orientada).
  Los desfases iniciales (`giroInicial`) deben ser múltiplos del paso.
- **Pieza encajada** = sombra con borde neón (rosa Zoe, cian Zeus). Al completar: el neón se intensifica, la silueta
  se va, los segmentos recuperan el color en el orden de colocación con chispas en cada articulación, aparecen los
  detalles y el atleta hace su movimiento con `SiluetaAnim.actuar` + `Tablero.posar`.
- Los menús de accesibilidad van abajo a la **izquierda** (a la derecha está la bandeja).
- Probar: `node scripts/probar-puzle-siluetas.js`. En el navegador, los arrastres se simulan con `PointerEvent`
  (`pointerdown` en `.pz-toque` de la pieza, `pointermove`/`pointerup` en `window`); `Tablero.aPantalla` y
  `Tablero.figuraAEscenario(hueco.centro)` dan los puntos.
- Registro: fila en `database/ambientes.sql`
  (ambiente 7, eje 11, temática 30 "Juegos de lateralidad", módulo 9, orden 10, imagen `siluetas.png`).
