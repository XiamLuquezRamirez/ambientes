# ¿Dónde se pone? (`public/catalogo_juegos/Polimotor/DondeSePone/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Prejardín 3-4 años, temática 29 "Reconocimiento de partes del cuerpo".
En el **baúl mágico de disfraces**, Zeus (de frente, en una tarima, con camiseta, pantaloneta y medias) pide sus
accesorios y el niño los **arrastra** hasta la parte del cuerpo. El baúl tiene gafas, sombrero, gorra, gorra roja,
gorro, gorro de fiesta, sombrero de copa, visera, audífonos, orejeras, cascos, bufanda, collar, pañuelo, chaqueta, abrigo, chaleco, sudadera, pantalones,
pantalón azul, pantaloneta, bermuda, guantes, manoplas, reloj, manilla, pulsera, tenis, chanclas, botas, sandalias, zapatos café, pantuflas y botines. Cada ronda
saca 4 al azar y solo uno por parte (los tenis no salen con las botas). Guantes y reloj/manilla no comparten
ronda: la mano y la muñeca se pisan al soltar. Zoe es la guía lateral (3D). Toda la escena central es Phaser 4:

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `Reglas` | Puro (también `module.exports`): zona de cada accesorio (sale de `config.accesorios[].zona`), `esCorrecta`, `elegirZona` con tolerancia, `armarRondas`, `siguientePendiente`. |
| `personaje.js` | `Personaje` | Zeus de frente en SVG por partes y `GEOMETRIA` con las zonas (cabeza, ojos, orejas, cuello, torso, manos, muñecas, piernas, pies). Orejas, manos y muñecas son dos elipses. |
| `accesorios.js` | `Accesorios` | SVG de cada prenda. El par de bandeja (`tenis_par`, `chanclas_par`, `botas_par`, `sandalias_par`, `guantes_par`, `bufanda_icono`) no es el dibujo que se encaja. Pivote = punto de encaje, en unidades de Zeus. |
| `escenario-phaser.js` | `EscenarioPhaser` | Tarima, baúl (tapa que se abre), Zeus, zonas `Zone`, anillos de destino, halos, accesorios flotantes en burbujas, `encajar`, `quitarPuestos`, `llenarBandeja`. |
| `arrastre.js` | `Arrastre` | Arrastre con el input de Phaser (`setDraggable`): destaca, sube de capa, resalta la zona tocada; **encaja solo** al entrar en su zona; al soltar en otra zona → error. |
| `animaciones.js` | `ZeusAnim` | Reposo, aparecer, saludo, boca que habla, reacción por accesorio (`modelo`, `sombrero`, `baile`, `bufanda`), `sorpresa`, `alegria`, `desfile` (gira, manos en la cadera, pose, celebra). |
| `vestidor.js` | `Vestidor` | Copia del fondo del Toque Mágico + guirnalda de luces de colores (`.vf-luz`). |
| `guia-3d.js` | `Guia3D` | Copia del módulo del Toque Mágico con `nina.glb` (Zoe; mismos clips). GIF `zoe_normal.gif` de respaldo. |
| `demo.js` | `DondeDemo` | La mano de PedniaTutorial lleva los 4 accesorios (gafas primero) sin contar aciertos; luego Zeus celebra, se desviste y sale "¡A jugar!". |
| `script.js` | — | Flujo, rondas, microayuda, progreso (íconos de los accesorios), final y victoria. |

- **Quién habla**: Zoe (el modelo 3D del panel) dice instrucciones, aciertos, errores y el final, hablando de Zeus. Su boca se anima con `Guia3D.hablar`. Zeus se viste y no narra. La prueba de node lo verifica.
- **Rondas** (`juego.rondas` = 3, `porRonda` = 4): cada una elige 4 partes distintas y un solo accesorio de
  esa parte. `noJuntas` deja fuera guantes junto con reloj o manilla. No repite el conjunto de la ronda
  anterior ni empieza por el último accesorio de esa ronda. La demo sigue fija (gafas, sombrero, tenis,
  bufanda). Al terminar cada ronda Zeus desfila y todo vuelve al baúl.
- Un accesorio fuera de orden pero en su zona correcta **se acepta** (sin negativos); la instrucción pasa al
  siguiente pendiente. Soltar fuera de Zeus = vuelve flotando, sin error.
- **Microayuda** a los `ayudaMs` (8 s) sin interacción: brilla la parte pedida, el accesorio se menea, salen chispas
  del accesorio a la zona y Zoe repite la instrucción. Tras 2 errores también brilla la zona.
- **Diseño**: horizontal = accesorios en columnas a los lados (nunca tapan a Zeus), baúl abajo a la izquierda
  (a la derecha están los menús). Vertical (`W/H < 0.75`) = Zeus abajo y más grande, accesorios con
  `config.lugaresRetrato` y la nube de Zeus centrada arriba (`.zeus-globo.arriba`).
- **Final**: baúl abierto del todo + chispas, `Vestidor.fiesta` + `desfile` (pasarela, focos, flashes), confeti,
  `ZeusAnim.desfile`, cartel "¡QUÉ ESTILO!" y la victoria compartida.
- Sonidos: `agarrar`, `soltar`, `encaje`, por accesorio (`acierto`, `aparece`, `bote`), error `regreso`,
  fin de ronda `correcto`, victoria `victoria`.
- **Trampa**: los tweens con Promise fijan los valores finales si Phaser no avanzó (panel oculto); sin eso los
  accesorios quedaban dentro del baúl y la demo no los encontraba.
- Probar: `node scripts/probar-donde-se-pone.js`. En el navegador, arrastrar con `MouseEvent`: `mousedown`,
  `mousemove` y `mouseup` **en el canvas** (Phaser escucha `mousemove` en el canvas, no en `window`); con
  `TouchEvent`, el `Touch` sintético necesita `pageX/pageY`. Puntos: `EscenarioPhaser.puntoDe("gafas")` (accesorio)
  y `puntoDe("ojos")` (zona).
- Registro: fila en `database/ambientes.sql`
  (ambiente 7, eje 11, temática 29, módulo 9, orden 12, imagen `donde.png`).
