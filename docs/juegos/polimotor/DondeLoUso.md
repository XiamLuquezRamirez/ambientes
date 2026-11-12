# ¿Dónde lo uso? (`public/catalogo_juegos/Polimotor/DondeLoUso/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Transición 5-6 años, temática 29. Vestidor de PedNia (SVG en `index.html`: pared
cálida con papel de lunares, banderines que se mecen, armario con ropa colgada que se balancea, espejo, estante de
gorros y piso de madera). En el centro, un **tablero luminoso** (Phaser: marco azul con lucecitas que se encienden
por turnos, panel crema) con dos columnas: **objetos** a la izquierda (gafas de sol, nariz de payaso, calcetines,
guantes, gorro) y **partes del cuerpo** a la derecha (ojos, nariz, pies, manos, cabeza). Cada tarjeta: color propio,
dibujo grande en una burbuja blanca, nombre (sin partir palabras) y conector circular en el borde que mira al centro.
Todos los dibujos son nuevos (pedido del usuario: "crea nuevos objetos, no reutilices").

**Pedidos del usuario (2026-11-12) sobre la imagen de referencia:**
- **Durante la partida solo está el tablero**: sin Zeus y sin Zoe; los dos solo se oyen. Se probó un Zeus por
  partes en SVG y luego un Zeus 3D con accesorios: los dos se descartaron ("no crees nada de 3d").
- **Zoe 3D en la presentación, la demo y el final**: entra caminando por la izquierda, se va caminando antes de
  "¡Comenzar a jugar!" (`zoeSale`) y **vuelve en el final para celebrar** a la vista (gestos `celebra` y `final`)
  hasta la victoria. Durante la partida no está.
- **Tablero "más desordenado"**: ninguna parte queda en la fila de su objeto. En `config.json` ya vienen
  desordenadas (intro y demo) y al empezar cada ronda se desordenan otra vez (`ordenPartes`: sin líneas rectas y
  cambiando al menos 3 tarjetas).
- **Dos rondas y más objetos** (`config.rondas`): ronda 1 gafas de sol, nariz de payaso, calcetines, guantes,
  gorro → ojos, nariz, pies, manos, cabeza; ronda 2 bufanda, audífonos, cepillo de dientes, reloj, mochila →
  cuello, orejas, boca, muñeca, espalda. Cada ronda trae su `instruccion` y el objeto a `destacar`. Al terminar la
  ronda 1: el tablero celebra, "¡RONDA 1 LISTA!", las tarjetas salen volando (`ocultarTarjetas`), entran las de la
  ronda 2 (`cargarRonda`) con "¡RONDA 2!". Abajo, una cinta "RONDA n/2" junto al progreso (n/5 por ronda).
- **Sin botón "¡Continuar!"**: la demo arranca sola al terminar la presentación; el único botón es
  "¡Comenzar a jugar!".

Mecánica: se toca el conector o la tarjeta (de cualquier columna), se mantiene y se lleva la línea a la tarjeta de
la otra columna. **Se valida al soltar** (no hay calificación al final como en "Une"): correcta → hilo de luz dorado
con chispas que viajan, los dos conectores brillan, estrellas, estrella dorada en las dos tarjetas (ya usadas, no se
pueden volver a tomar), nota que sube de tono con cada pareja (`correcto` con `tasa`), barra de progreso y **el
dibujo del objeto viaja por el hilo hasta la tarjeta de su parte**, se posa con un rebote y se desvanece
(`volarDibujo`). Incorrecta → la línea llega, tiembla y parpadea ~0,7 s, se deshace en puntitos, sonido `regreso`,
voz de Zeus "¡Uy! Ese no es su lugar…" (sin vidas ni puntos). Tras 2 errores con el mismo objeto, el conector de su
parte brilla en dorado hasta encontrarla.

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasUso` | Puro (también `module.exports`): parejas por **identificador** en `config.parejas` (nunca por el texto), `normalizar` (la línea vale en los dos sentidos), `evaluar` (correcta, error, nada, mismoLado, repetida, ocupado), `progreso`, `siguientePendiente`, `ordenPartes` / `hayRectas`, `rondas` / `ronda(cfg, i)` (las demás funciones reciben la ronda), `revisarConfig` / `revisarJuego` (ids únicos entre rondas). |
| `iconos.js` | `IconosUso` | Los 20 dibujos de las tarjetas de las dos rondas (SVG 120 × 120). |
| `escenario-phaser.js` | `EscenarioUso` | Tablero, tarjetas, hilos (fijos debajo de las tarjetas; el que se arrastra, el que se rompe y el de muestra, encima), `volarDibujo`, `reordenarPartes({ parteId: fila })`, `filasPartes`, `cargarRonda`, `ocultarTarjetas`, `zonaZoe()`. |
| `conexiones.js` | `Conexiones` | Arrastre con el input de Phaser (ratón y dedo), cursor mano abierta/cerrada. |
| `demo.js` | `UsoDemo` | Mano de PedniaTutorial: calcetines → pies y nariz de payaso → nariz (`config.demo.pasos`), "¡Excelente! Cada objeto tiene un lugar especial…". Luego se borra todo. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copia de "Une"). |
| `script.js` | — | Flujo, voces, ayudas, progreso, final y victoria. |

- **Flujo** (modelo de "Une"): intro 3D → `PedniaEdad` → presentación (cartel "¡DÓNDE LO USO!" sobre el tablero
  vacío, Zoe entra caminando; se va el cartel, Zoe saluda, entran las tarjetas; la voz de Zeus explica, los
  conectores brillan, una línea de muestra une gafas y ojos) → demo automática → Zoe se va → "¡Comenzar a
  jugar!" → ronda 1 (voces: Zoe pregunta por los calcetines y Zeus explica la línea) → ronda 2 (Zoe pregunta por
  la bufanda) → final.
- **Final**: hilos de colores que cambian, conectores y tarjetas que laten, confeti, cartel "¡LO LOGRASTE!", Zoe entra y celebra, voces
  de Zoe ("¡SÚPER FANTÁSTICO!…") y Zeus → victoria compartida (jugar otra vez / salir).
- **Diseño**: tablero centrado con márgenes iguales (`zoeW`, 16 % del ancho en horizontal; en vertical casi sin
  margen). Tarjetas en modo `fila` (dibujo afuera) o `columna` (dibujo arriba) si el ancho de tarjeta es < 175 px.
  Nube de Zoe angosta (≤ 17,5 vw) para no tapar las tarjetas en la demo. Botones redondos arriba a la derecha;
  abajo solo el progreso ("PAREJAS ENCONTRADAS: n/5" + barra). Sin diseño para teléfonos.
- Probar: `node scripts/probar-donde-lo-uso.js`. En el navegador, `mousedown`/`mousemove`/`mouseup` en el canvas;
  `EscenarioUso.puntoDe(id)` da el conector en pantalla. Con voces apagadas, esperar a que `#comenzar-wrap` deje de
  estar oculto antes de pulsar el botón.
- Registro: fila en `database/ambientes.sql` (orden 16, imagen `donde-lo-uso.png`, color `#f76707`).
