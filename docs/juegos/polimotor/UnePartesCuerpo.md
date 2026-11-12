# Une las Partes del Cuerpo (`public/catalogo_juegos/Polimotor/UnePartesCuerpo/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Transición 5-6 años, temática 29 "Reconocimiento de partes del cuerpo".
Zeus de frente y de cuerpo entero en el centro, sobre una tarima en una sala azul clara. A cada lado, cinco
tarjetas ilustradas (nombre en mayúsculas + dibujo + conector de color). El niño toca el conector (o la tarjeta),
arrastra una línea y la suelta sobre un punto de Zeus. **Toda línea soltada en un punto libre queda pegada**, sin decir
si está bien. **No hay botón de enviar**: al unir las 10, Zoe califica una por una (columna izquierda de arriba a abajo,
luego la derecha). Verde con ✓ = bien (queda fija); rojo con ✗ = mal. Las rojas vuelven a su tarjeta para corregirlas
y al completar otra vez se califican solo esas. Todas en verde → celebración.
Zoe (3D, `nina.glb`) dice todo; Zeus solo agradece al final en su nube. En la presentación Zoe **entra caminando**
desde la izquierda (clip `Caminar`, o `Caminar_y_hablar` si habla, mirando de perfil con `Guia3D.mirar`) y queda
**grande** entre las tarjetas de la izquierda y Zeus (`zoeEntra()` pone la caja `.guia-pj` en `position: fixed` con
medidas de `ubicarZoeGrande()`; en tableta vertical se para delante de la columna izquierda). Al terminar la demo
**se va caminando** (`zoeSale()`) y queda pequeña en la barra de abajo mientras se juega. En el final vuelve a entrar.
Mientras está grande, lo que dice sale en una nube sobre su cabeza (`#zoe-nube`, dentro de su caja: camina con ella);
en la barra usa la nube de siempre. El paseo se hace con `setTimeout`, no con transición CSS: con el panel del
navegador oculto las transiciones se congelan y Zoe aparecía de golpe.

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasUne` | Puro (también `module.exports`): `esCorrecta` por **identidad** tarjeta ↔ punto, `puntoCercano`, `evaluar` (correcta, error, nada, repetida, ocupado), `calificar` (orden de revisión, verdes y rojas; `yaBien` salta las ya verdes), `progreso`, `siguientePendiente`. |
| `personaje.js` | `Personaje` | Copia del Zeus de "¿Dónde se pone?" con la cabeza más arriba (`cabeza.y` -602, `escalaCabeza` 0.96) para que se vea el cuello, y los brazos más abiertos (`brazoReposo` 0.42). |
| `iconos.js` | `IconosCuerpo` | Un SVG de 120 × 120 por tarjeta, con la piel, el pelo y la ropa de Zeus. |
| `escenario-phaser.js` | `EscenarioUne` | Zeus por partes, anclas de los puntos, tarjetas (Phaser), líneas y puntos redibujados en cada cuadro, destellos y diseño. |
| `conexiones.js` | `Conexiones` | Arrastre con el input de Phaser (ratón y dedo). Solo sigue al primer puntero. `pointerupoutside`, `blur` y `touchcancel` devuelven la línea. |
| `animaciones.js` | `ZeusAnim` | Reposo (balanceo de brazos muy leve: hay puntos en el brazo y la mano), aparecer, saludo, contento, sorpresa, alegría, celebrar. |
| `demo.js` | `UneDemo` | Mano de PedniaTutorial: toma el conector de NARIZ, arrastra la línea violeta hasta la nariz, destello, "¡Muy bien!". Luego `limpiarConexiones()`. |
| `guia-3d.js` | `Guia3D` | Copia de la Zoe 3D de "¿Dónde se pone?"; el host sigue siendo `#guia .guia-pj`. |
| `script.js` | — | Intro, presentación, demo, callbacks, ayudas, progreso, calificación verde/rojo, final y victoria. |

- **Puntos que siguen a Zeus**: cada tarjeta de `config.json` trae `destino` `{ contenedor, x, y }` en las coordenadas
  de una parte (`zeus`, `cabeza`, `brazoDer`, `manoIzq`, `pieIzq`…). Ahí se crea una `Zone` invisible y en cada cuadro
  se lee su posición del mundo. No hay posiciones fijas en pantalla: los puntos y los hilos acompañan la respiración, los
  saltos y los cambios de tamaño. Para las partes dobles el punto va en el lado de su columna de tarjetas
  (ojos, orejas, brazo y pierna en el lado izquierdo de la pantalla; mano y pie en el derecho).
- **Unir**: al soltar se elige el punto más cercano de **todos** dentro de `radioCaptura` (≥ 34 px), también los
  ocupados. Si ya tiene línea → "ocupado" (la línea vuelve). Si está libre, la línea se pega (`fijarLinea`, tarjeta en
  estado `unida`: tinte de su color, sin marca) aunque sea la parte equivocada. Soltar lejos de todo → vuelve sin error.
  Una tarjeta unida no se puede volver a tomar hasta la revisión.
- **Calificar** (`calificarTodo` en `script.js`, `calificarLinea` en la escena): "¡Uniste todas! Ahora vamos a
  revisar…", luego cada línea se pinta de verde (aro y estrellas verdes, ✓, sonido `acierto`) o de rojo (aro rojo,
  la tarjeta tiembla, ✗, sonido `regreso`) cada ~0,8 s. Con rojas: Zeus `sorpresa`, Zoe "¡Tienes N en verde! Las rojas
  no van ahí…" y las rojas regresan a su tarjeta (`soltarLinea`). Las verdes quedan fijas (`enVerde`) y el puntito del
  progreso se pone verde.
- **Colores de tarjeta**: ninguno es verde ni rojo (lo comprueba la prueba de node), para no confundirse con la
  calificación. Antes MANO era verde azulado y parecía "bien" sin estarlo.
- Un unir **no bloquea** el arrastre: antes se perdía el siguiente toque si llegaba en los 130 ms del pegado.
- **Ayudas**: a los `ayudaMs` (11 s) sin tocar nada, una tarjeta pendiente se menea y Zoe pregunta por esa parte
  (rotan). No se ilumina el punto. Si una tarjeta sale en rojo `erroresParaBrillo` (3) veces, su punto brilla en dorado
  hasta que el niño la vuelva a tomar.
- **Demo**: la mano une la NARIZ y la línea se califica en verde ("¡Muy bien!"); luego se borra.
- **Final**: hilos brillando (`celebrar(true)`), estrellas en cada punto, `ZeusAnim.celebrar`, confeti
  (`PedniaFx.celebracion`), Zoe entra caminando y dice la felicitación larga en voz; su nube muestra solo
  "¡EXCELENTE TRABAJO! ¡Conectaste todas las partes del cuerpo!" (4.º parámetro de `hablar`) y se cierra al terminar.
  **Sin cartel**: el usuario pidió menos texto en pantalla (tapaba a Zeus). Luego la nube de Zeus y la victoria.
- **Diseño**: tarjetas en modo `fila` (dibujo afuera, nombre al medio, conector hacia Zeus) o `columna` (dibujo arriba,
  nombre abajo) cuando el ancho de tarjeta es < 186 px (tableta vertical). Barra de abajo: Zoe + nube, progreso
  ("PARTES CONECTADAS: n / 10" + un puntito por color; verde al calificarse bien). En pantallas ≤ 1100 px los tres botones redondos
  (pantalla completa, accesibilidad, volumen) suben arriba a la derecha; en vertical la barra pasa a dos filas.
  Sin diseño para teléfonos (pedido explícito).
- Sonidos: `agarrar`, `encaje` al unir, `acierto` (verde) y `regreso` (rojo) al calificar, `tic` (repetida/ocupado),
  `aparece` (tarjetas y pistas), final `correcto` y `victoria`. Si una tarjeta trae `audio.instruccion` en
  `config.json`, la pista usa ese archivo en lugar de la voz.
- Probar: `node scripts/probar-une-partes-cuerpo.js`. En el navegador, `mousedown`/`mousemove`/`mouseup` en el canvas;
  `EscenarioUne.puntoDe("nariz")` (conector de la tarjeta) y `puntoDe("p-nariz")` (punto en Zeus) dan coordenadas de
  pantalla. El táctil solo se puede probar con emulación táctil (ancho < 768 en el panel): Phaser decide al arrancar si
  activa el `TouchManager`.
- Registro: fila en `database/ambientes.sql` (ambiente 7, eje 11, temática 29, módulo 9, orden 14, imagen `une.png`).
