# ¡La Red de Tuberías! (La Red de Tuberías de Luz)

`public/catalogo_juegos/Polimotor/RedTuberiasLuz/` · slug `red-tuberias` · **5-6 años** · Eje 18 «Habilidad y precisión», temática 35 «Arrastrar y soltar objetos» (arrastrar y conducir sin soltar) · orden 38 · imagen `red-tuberias.png` · color `#d946ef`.

Laboratorio de conducción eléctrica. El niño presiona la **gema de energía** en la boca del **generador de luz** (izquierda) y, sin levantar el dedo, la conduce por dentro de una **tubería** con curvas, codos y zigzags hasta el **reactor** (derecha). Gesto: presionar → mantener → conducir → seguir las curvas → llegar → liberar. Nada se mueve solo.

## Pedidos del usuario (2026-11-23)

- Prompt «JUEGO 2 — La Red de Tuberías de Luz» con una imagen de referencia (guía, no copia).
- **4 niveles**.
- **Sin el título del juego** en la partida (solo en la portada).
- El mensaje al superar cada nivel **con los colores del juego**: cartel azul noche con borde magenta (la gema) y cian (la tubería), etiqueta magenta y chispas amarillas.
- Botones estándar de Polimotor sin cambios (`comun/interfaz.css`): reiniciar y salir arriba a la derecha, accesibilidad y volumen abajo a la derecha. Sin cartel de edad.

## Niveles (`config.json → redes`): tuberías al azar

Pedido del usuario (2026-11-23): «las pistas se generan aleatoriamente, no siempre deben ser las mismas». Cada vez que se entra a un nivel (también al jugar otra vez) `ReglasTuberia.generar(def, cfg)` arma una tubería nueva con los rangos de `redes[i].aleatoria`; `script.js → redAlAzar(i)`.

| Nivel | Carril | Picos (crestas y valles) | Codos verticales | Checkpoints | Largo (200 redes) |
|---|---|---|---|---|---|
| 1 Conducto de práctica | 104 | 2 | no | 3 | ~970–1560 |
| 2 Red de los zigzags | 96 | 3 | no | 4 | ~1190–1930 |
| 3 Red de los codos | 90 | 4 | 15 % | 4 | ~1470–2300 |
| 4 Gran red del reactor | 84 | 4–5 | 35 % | 5 | ~1850–2640 |

Cómo se arma: tramo recto desde el generador (`entrada`), luego crestas y valles alternados (alto dentro de la `banda` cerca del borde de arriba o de abajo), unidos por bajadas o subidas diagonales (`diagonal`, avance en x) o verticales (`verticales`), con un tramo recto en cada pico (`meseta`); al final baja o sube a la franja central (y 330–590) y entra recto al reactor (`salida`). Se escala en x para llenar x 350–1215 y se valida con las reglas del juego (`validar`: cabe en 4:3, los tramos no se tocan; `simular("centro")`: se puede recorrer). Hasta 120 intentos (en la práctica 2–8 ms); si ninguna sirve queda la red fija de `redes[i].puntos` (respaldo; en 800 pruebas no hizo falta). Los checkpoints se reparten a lo largo (`aleatoria.checkpoints`).

## Mecánica (`reglas.js`, `ReglasTuberia`, puro y probado en Node)

- El tubo es una polilínea con codos redondeados (Bézier) remuestreada cada 4 unidades. El avance es la distancia `s` sobre el eje, nunca la posición suelta en pantalla.
- **Un solo puntero**: el que tomó la gema (`ptrId`). Otros dedos se ignoran. `pointerup`, `pointerupoutside`, `pointercancel`, `touchcancel`, `blur` y pestaña oculta cuentan como soltar.
- Cada cuadro se busca el punto del eje más cercano al dedo **solo cerca de la gema** (ventana `1,8 × ancho + paso máximo`): en un zigzag el dedo sobre el tramo vecino es «fuera», la gema no atraviesa la pared.
- **Sin teletransporte**: la gema avanza como mucho `velocidadMax` (1100/s) sobre el eje, con sub-pasos si el cuadro es largo.
- **Tolerancia**: el dedo puede estar hasta `ancho/2 + margen·ancho` del eje (margen 0,5). La gema se corre a los lados solo hasta la holgura (`ancho/2 − 0,55·radio`), siempre se ve dentro del tubo.
- **Fuera del carril**: la gema se detiene y titila en ámbar, un hilo de puntos ámbar une la gema con el dedo, sonido suave y Zoe «¡Vuelve a la tubería!…» (cada `vozFueraMs`). Si el dedo vuelve, sigue. Si tarda más de `fueraMaxMs` (1,8 s), la gema vuelve al último checkpoint y hay que tomarla otra vez.
- **Levantar el dedo** antes del reactor: la gema se detiene, parpadea y se desliza por el tubo hasta el **último checkpoint** (o el generador si no pasó ninguno); la estela retrocede con ella. Los checkpoints ya pasados se conservan. Zoe recuerda «¡No despegues tu dedo…!» (cada `vozSoltarMs`).
- **Checkpoints**: collar ámbar con luz que late = pendiente; al pasarlo se pone verde con onda, chispas y sonido. Son reales: guardan dónde se retoma.
- **Meta**: solo si la gema llega recorriendo el tubo (`s ≥ largo − 0,6·radio`) con todos los checkpoints. Tocar el reactor no hace nada.

## Escena (`escena-tuberia.js`, `EscenarioTuberia`, Phaser 4)

- Mundo 1600 × 900 con `Scale.ENVELOP`. Fondo, generador, reactor, gema, collares y partículas son SVG propios (`dibujos.js`) rasterizados una vez. La tubería de cada nivel se dibuja con Canvas 2D (`DibujosTuberia.tubo`): sombra, cuerpo metálico, cristal cian, carril, reflejos, uniones cada 240 y la guía de puntos rosados.
- Estela de energía: `Graphics` con cuatro trazos aditivos (cian, violeta, magenta, blanco) de 0 a `maxS`, redibujada solo cuando cambia; pulsos de luz que viajan por el tramo encendido y cinco puntos que anticipan el tramo siguiente.
- Reactor: núcleo y anillo que se cargan con el avance, medidor de 8 barras; al llegar la gema entra al núcleo, rayos, onda y chispas. Generador: late más fuerte mientras se conduce. Engranajes y lucecitas del laboratorio animados.
- Consola de niveles abajo al centro (4 ranuras con la gema ganada); se oculta con «Mostrar progreso».
- Partículas en reserva fija (90). Cada animación que espera el flujo es una Promise con respaldo por tiempo (`Animador`).

## Flujo (`script.js`)

portada → intro 3D (`textos.conversacion`) → PedniaEdad → aparecen tubo, generador y reactor, una luz recorre la red y nace la gema → Zeus entra: «¡Alerta de conducción eléctrica!…» → demo (`demo.js`): la mano presiona la gema, la conduce hasta pasar el primer checkpoint y se levanta; la gema vuelve al checkpoint (Zeus explica) → la gema vuelve al generador → Zoe entra: «¡No despegues tu dedo de la pantalla mientras recorres la tubería!» → «¡Comenzar a jugar!» → red 1 → cartel del nivel (colores del juego) → fundido → red 2 (instrucción por voz, sin personajes) → … → red 4 → cinemática final «La energía vuelve a la red» → Zoe «¡DOMINIO TÁCTIL TOTAL!…» y Zeus → victoria compartida (`final.js`) con «¡DOMINIO TÁCTIL TOTAL!» / «¡El reactor está encendido!».

Ayuda (11 s sin conducir, luego cada 14 s): la gema destella, una luz dorada recorre el tramo siguiente y Zeus explica cómo tomarla (si nunca la tomó) o Zoe recuerda no soltar.

## Cinemática final «La energía vuelve a la red» (pedido 2026-11-23)

Tras la red 4, el cartel «Nivel 4 completado» se ve 2,4 s y empieza `EscenarioTuberia.cinematica()` (≈11 s), con franjas de cine y botones ocultos (`body.cinematica`, como en Atrapa la Esfera Veloz):

1. La cámara se acerca al reactor (zoom 1,8).
2. El reactor se carga: rayos, temblor, el núcleo crece (`SonidosTuberia.carga`).
3. Un pulso de luz sale del reactor y recorre de vuelta TODA la tubería; la cámara lo sigue (zoom 1,45) y los checkpoints destellan a su paso (`barrido`).
4. El generador se sobrecarga: ondas, chispas, destello (`conexion`).
5. La cámara se aleja y una ola de luz enciende el laboratorio de izquierda a derecha; los engranajes giran rápido (`ola`).
6. Fuegos de neón (`celebrarFinal`).

Después Zoe y Zeus dicen el cierre y aparece la victoria compartida. La cámara tiene límites (`setBounds`) para no mostrar fuera del mundo y vuelve a su sitio al terminar y al cargar una red. Con movimiento reducido la cámara no viaja.

## Audio

`sonidos.js` (`SonidosTuberia`, Web Audio, sin archivos): contacto, zumbido de flujo continuo que sube con la velocidad, checkpoint, fuera (suave), vuelve, pausa, regreso, aparece, barrido, conexión al reactor, victoria, fuegos; ambiente y música por el bus de fondo. Expone `volumenFondo`/`volumenEfectos` para `comun/volumen.js`. Voces con `TextoVoz` (`/juegos/tts`).

## Archivos

`index.html` (cascarón de El Ensamblaje de la Nave) · `config.json` · `style.css` · `script.js` · `reglas.js` · `dibujos.js` · `escena-tuberia.js` · `sonidos.js` · `demo.js` · `guia-3d.js` (copia) · `red-tuberias.png` (256 × 256, SVG propio rasterizado en el navegador).

## Cómo probar

- `node tests/js/run-tests.js` → suite «¡La Red de Tuberías! (reglas)», 15 casos (redes al azar válidas, distintas y cada vez más largas; misma semilla, misma red; config, validez de las 4 redes en 4:3, llegada por el eje con checkpoints en orden, tolerancia, sin teletransporte, velocidad máxima, zigzag sin atravesar paredes, soltar → checkpoint, fuera → perdida, tocar el reactor, mensajes amables).
- Navegador: servidor `juegos-tuberias` (8046), `…/RedTuberiasLuz/index.html?edad=5`. Con el panel oculto Phaser no recibe `requestAnimationFrame`: avanzar el bucle con `setInterval(() => __escenarioTuberia.step(t += 16, 16), 16)`. Arrastre con `MouseEvent` (`mousedown` en el canvas, `mousemove`/`mouseup` en `window` y canvas) en coordenadas `EscenarioTuberia.aPantalla(EscenarioTuberia.puntoEje(s))`.
- Probado (2026-11-23) a 1366 × 768 y 1024 × 768: presentación, demo, conducción con ratón, desvío lateral, salida y vuelta, soltar y regreso al checkpoint, tocar el reactor, los 4 niveles, carteles, celebración final y victoria. Sin errores de JavaScript (solo 404 de `/juegos/tts` en el servidor estático).

## Pendientes

- El táctil real (dedo en tableta) solo se puede comprobar en una tableta física; la entrada es la misma de Phaser (`pointer.id`).
- Las voces dan 404 con el servidor estático; probar con Laravel para oírlas.
