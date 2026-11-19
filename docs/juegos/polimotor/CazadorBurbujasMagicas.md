# El Cazador de Burbujas Mágicas

`public/catalogo_juegos/Polimotor/CazadorBurbujasMagicas/` · slug `cazador-burbujas-magicas` · 3-4 años.
Eje 17 «Coordinación y orientación», temática 34 «Coordinación visual» (seguimiento visomotor y toque de precisión).

## Qué se ve

Parque colorido (2026-11-18, el usuario cambió el mundo realista por uno como su segunda referencia).
El cielo azul intenso, el sol y las nubes son CSS; el parque se pinta en un canvas 2D por tamaño de escena
(`pintarParque`): colinas verdes brillantes, fila de árboles redondos rosados, lilas, verdes y durazno con
contorno, cerca blanca con puntas de colores, letrero de madera «PEDNIA» con cinta lila, banca, faroles,
arbustos con flores, pasto con franjas de podado, camino de baldosas en perspectiva, canteros de tulipanes,
un árbol rosado grande a la izquierda y uno lila a la derecha, y sombras de la canasta y de Zoe. Un segundo
canvas (`pintarFrente`) pone pasto con florecitas delante de la canasta y de la base de las burbujas, y flotan
motas de luz.

Árboles (2026-11-18, pedido del usuario: «como los de la Ardilla, sin contorno, mundo más animado»): son
imágenes Phaser hechas con el mismo generador de follaje y el mismo tronco de `ArdillaBellotaGigante/iconos.js`
(copiados a `IconosBurbujas.ARBOL`, paletas rosa, lila, verde y durazno). Una fila de 12 árboles queda entre las
colinas (`pintarLejos`, profundidad 0) y la cerca (`pintarParque`, profundidad 2); un árbol rosado grande a la
izquierda y uno lila a la derecha (profundidad 3). Las copas se mecen con el viento, de los árboles grandes caen
pétalos girando y tres mariposas de colores revolotean sobre el pasto (`animarParque`). Distribución (2026-11-18, «no hay montañas al fondo ni nada»): `pintarLejos` pinta dos cordilleras (lila con
nieve atrás, azul adelante, con ladera en sombra y bruma al pie) y dos filas de colinas onduladas con borde de
luz. Árboles por profundidad (`ARBOLES`): 8 arbolitos lejanos en las colinas (prof 0.5), 5 medianos en grupos a
los lados del camino (prof 1, detrás de las cercas) y los dos grandes que enmarcan (prof 3). El camino de
baldosas hace una S suave hacia las montañas; cercas por tramos, letrero PEDNIA a la entrada del camino, banca,
farol, laguna con nenúfares y piedritas a la derecha, arbustos y un cantero. El cambio de mundo no se probó en el juego (pedido del usuario); solo se revisó el pintado
aparte con Edge headless. Zoe 3D de pie a la izquierda durante **toda** la partida, con su canasta de mimbre al lado en el pasto
(como en la imagen de referencia). Zeus no se dibuja: solo su voz.

Los juguetes son los que ya existían en Polimotor, copiados a `img/` (2026-11-18, pedido del usuario): SVG de
Arrastrar y Soltar Objetos (pelota, carro, cubo, avión, cometa, tambor) y PNG reducidos a 256 px del pato
(Arrastrar y Soltar), el oso (Lateralidad) y el balón (Coordinación Visual). Solo la estrella es propia
(`iconos.js`), porque la nombra Zeus.

Las burbujas suben desde abajo con un vaivén suave, «respiran» (se estiran un poco a lo ancho y a lo alto),
tienen anillo iridiscente, contorno azul fino (se distinguen del cielo claro), brillo móvil y un juguete grande
adentro. Al tocarla: se estira, se infla y estalla con destello, onda expansiva, trozos de película iridiscente que
vuelan girando, gotitas con gravedad, neblina, chispas y «¡Pop!»; el juguete da un saltito y
vuela en curva hasta la canasta, que rebota. Si llega arriba sin tocarla, se desvanece con un soplo de brisa,
sin castigo.

Arriba: pastilla de edad «3-4 años» a la izquierda, «Ronda n de 3» con 4 estrellas al centro (pequeño) y
reiniciar/volver a la derecha. Accesibilidad y volumen abajo a la derecha. **Sin título en la partida**: el
nombre solo sale en la presentación y se va hacia arriba.

## Flujo

inicio → intro 3D (Zoe dice la línea de introducción y Zeus la de instrucción, literales del enunciado) →
PedniaEdad → presentación (título, burbujas decorativas y tres con juguetes, Zoe entra caminando) → demo
automática (Zeus: «¡Síguela con la vista…!», la mano sigue la burbuja de la estrella y la toca, la estrella
cae en la canasta, «¡Así se hace!»; luego la estrella se saca de la canasta: la demo no cuenta) →
«¡Comenzar a jugar!» (sale también con la demo apagada) → 3 rondas → final (parque iluminado, burbujas
flotando, lluvia de estrellas, confeti, canasta llena que salta, cartel «¡SÚPER VISTA!» y voz de cierre) →
victoria compartida (Sí recarga, No vuelve).

## Burbuja fuerte (rondas 2 y 3)

`rondas[].multitoque`: ronda 2 `prob` 0,25 de 2 toques; ronda 3 `prob` 0,3 de 2-3 toques. Nunca la primera
burbuja de la ronda ni dos fuertes a la vez (`ReglasBurbujas.elegirToques`). Es un 12 % más grande, un 30 % más
lenta, sale siempre desde abajo, tiene doble pared dorada y puntitos debajo con los toques que faltan. Cada
toque que aguanta: sacudida de gelatina, onda, gotitas, se encoge un 7 %, «boing» (`SonidosBurbujas.toque`). El
último toque la revienta (con más gotitas y estrellas) y cuenta como **un** juguete. La primera de la partida
la anuncia Zeus («¡Mira, una burbuja fuerte! ¡Tócala varias veces!»).

## Rondas (`config.rondas`)

| Ronda | Nombre | Subida (s) | Radio (× rBase) | Máx. a la vez | Intervalo (ms) | Vaivén (× ancho) | Alturas de salida | Objetos |
|---|---|---|---|---|---|---|---|---|
| 1 | Descubrimiento | 11-12,5 | 0,118 | 2 | 2600-3200 | 0,010-0,016 | abajo | 4 (la primera, estrella) |
| 2 | Exploración | 9,4-10,6 | 0,106-0,114 | 2 | 2200-2800 | 0,020-0,032 | abajo y a 0,82 | 6 + burbuja fuerte |
| 3 | Cazador mágico | 8-9,4 | 0,094-0,112 | 3 | 1800-2400 | 0,030-0,045 | abajo, 0,86 y 0,74 | 10 + burbuja fuerte |

`rBase = min(alto de la escena, 0,6 × ancho)`; radio mínimo 54 px. Cada ronda pide 4 burbujas. Al tocar la
cuarta no salen más y las que quedan se van flotando. Si no hay ninguna burbuja en pantalla, la siguiente sale
en 0,7 s. Las burbujas nuevas quedan separadas al menos 1,15 × (r1 + r2) de las cercanas
(`ReglasBurbujas.elegirCarril`). El área táctil es 1,2 × el radio dibujado y gana la burbuja más cercana.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasBurbujas` | Puro: rondas normalizadas, objeto siguiente, carril libre, `puedeSalir`, progreso, `revisarJuego`. |
| `iconos.js` | `IconosBurbujas` | Solo la estrella (SVG 120×120). |
| `img/` | — | Juguetes importados de otros juegos de Polimotor (6 SVG y 3 PNG de 256 px). |
| `sonidos.js` | `SonidosBurbujas` | Web Audio (mismos generadores que `SonidosPez`): pop, toque, cascabel, canasta, brisa, aparece, éxito, fanfarria, fiesta. |
| `escenario-phaser.js` | `EscenarioBurbujas` | Parque pintado, canasta de mimbre con degradados (atrás/frente), burbujas (normal y fuerte), toque, `golpe`, estallido, vuelo a la canasta, ayuda dorada, decoración, motas. |
| `aparicion.js` | `AparicionBurbujas` | Suelta las burbujas de la ronda con `setInterval` (no con el reloj de Phaser). |
| `demo.js` | `BurbujasDemo` | Demo con la mano de `PedniaTutorial`; la mano se mueve sin transición CSS (no se queda atrás con el panel oculto). |
| `guia-3d.js` | `Guia3D` | Copia de Golpea a los Topos. |
| `script.js` | — | Flujo, voces, HUD, ayuda, fin de ronda, final. Base: `GolpeaTopos/script.js`. |
| `cazador-burbujas.png` | — | Ícono 256×256 (burbuja con estrella sobre el parque), rasterizado con Edge headless desde un SVG propio. |

## Voces y sonido

- Una sola voz a la vez: `decirRapido` respeta `juego.vozPausaMs`; la frase de escape suena como mucho cada
  `vozEscapeCadaMs`; la de acierto, cada `vozAciertoCada` aciertos.
- La nube de Zoe solo se ve en la presentación, la demo y el final. Durante las rondas no hay textos en
  pantalla. Cuando habla Zeus la nube se apaga.
- Ayuda: sin atrapar nada durante `ayudaMs`, Zoe anima a mirar y la burbuja más fácil (la más baja ya visible)
  lleva un aro dorado que late.

## Probar

- `node scripts/probar-cazador-burbujas-magicas.js` (reglas, config, dibujos, textos literales, título fuera de
  `#principal`).
- Navegador: `preview_start juegos-burbujas` (puerto 8037) → `/catalogo_juegos/Polimotor/CazadorBurbujasMagicas/index.html`.
  Con el panel oculto Phaser no avanza: `setInterval(() => __escenarioBurbujas.loop.step(performance.now()), 16)`.
  Tocar una burbuja: `mousedown`/`mouseup` en el canvas sobre `EscenarioBurbujas.puntoDe(id)`.
- Probado el 2026-11-18 a 1366×768 y 1024×768: intro omitida, presentación, demo con la mano, 3 rondas
  (12 juguetes en la canasta, burbujas que se escapan sin castigo, ayuda dorada), final y victoria, sin errores
  de JavaScript (solo los 404 de `/juegos/tts`).

## Base de datos

Fila insertada en la BD local (`php artisan tinker` con un script, idempotente) y copiada a
`database/ambientes.sql` en orden alfabético. Sin archivo SQL aparte (pedido del usuario). `orden` 29,
imagen `cazador-burbujas.png`, color `#4dabf7`. Se lista con
`app(App\Services\JuegoCatalogoService::class)->listarActivosPorAmbiente(7, 3)`.

- 2026-11-18 (segunda pasada): escena realista, juguetes importados, estallido nuevo y burbuja fuerte probados a
  1366×768 y 1024×768; rondas 2 y 3 con 3 burbujas fuertes, conteo correcto, sin errores.

## Pendientes

- Probar el toque real en una tableta (el panel solo simula ratón).
- Sin commit.
