# Golpea a los Topos (`public/catalogo_juegos/Polimotor/GolpeaTopos/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Transición 5-6 años, temática 29. Colina desértica mágica de PedNia: cielo y sol
en CSS (`.topos-cielo`); montañas (mesas), arena, la colina, siete agujeros en dos filas (3 atrás, 4 adelante),
cactus y la carpa "PEDNIA" del campamento en Phaser. Los topos salen con un **globo ilustrado**: el niño toca solo
los que muestran una parte del cuerpo. Cada toque hace aparecer un **mazo de juguete** (rojo con franjas amarillas)
que cae sobre la cabeza del topo; la reacción empieza en el impacto (~0,2 s). Acierto: el topo queda mareado (ojos
en espiral, tres estrellitas que dan vueltas sobre su cabeza), el globo estalla, "+1", letrero "¡Correcto!" y se
hunde (sin pirueta: al usuario no le gustó). Objeto: se tapa los ojos, **la pantalla se sacude** (cámara de Phaser)
y se esconde (sonido `bote`, sin castigo). El topo es **de cuerpo entero** (cabeza, barriga, brazos y patas;
dibujo 200 × 300 con los pies en y = 292) y sale hasta quedar parado en el borde del agujero.
Un topo que se va sin tocar tampoco castiga. Objetivo: 12 partes en 100 s (`config.juego`).

Intro y demo siguen el modelo de "Une": intro 3D → `PedniaEdad` → presentación (título de madera que cae y sube al
letrero, Zoe 3D entra caminando, salen tres topos: OJOS con aro verde ✓ y PELOTA tachada en rojo, Zoe explica el
reto) → la demo arranca sola, con la mano de PedniaTutorial (nariz sí, cepillo tachado "¡ESE NO!", mano
sí) → "¡Comenzar a jugar!". Zoe sale caminando y **no queda pequeña abajo** (distraía): durante la partida no
hay Zoe ni nube abajo, solo se escuchan las voces. Su nube grande nunca sube por encima de la barra de arriba. **Zeus no sale en la escena** (pedido del usuario, 2026-11-12: Zeus
y Zoe solo como personajes de la intro; Zoe 3D sigue en presentación, demo y final). Mientras se juega, la voz de
Zeus va en la nube de la barra con la etiqueta "Zeus". **Sin botones de pausa ni de pantalla completa** (pedido del
usuario): solo accesibilidad y sonido, **arriba a la derecha** junto al reloj, para que la colina use toda la altura.
El **letrero tiene alto fijo** (hasta dos líneas): antes "¡Correcto!" con letra grande lo hacía crecer, la escena se
reacomodaba y la pantalla "saltaba" en cada golpe.

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasTopos` | Puro (también `module.exports`): `evaluarGolpe` por **categoría** de config (`parte_cuerpo`/`distractor`, nunca por el nombre del dibujo), `etapa` (dificultad por aciertos, valores que se acercan suave a la etapa siguiente), `elegirImagen` (no repite, máx. 2 objetos seguidos, nunca solo objetos en pantalla), `elegirAgujero`, `progreso`, `plantilla`, `formatoTiempo`, `revisarConfig`. |
| `topos.js` | `Topos` | Caras del topo (SVG 200 × 240, borde del agujero en y = 216) y estados: oculto → apareciendo → visible → golpeado → celebrando → escondiéndose. Anima números del registro del agujero (`sube`, `salto`, `giro`, `kx`, `ky`, `globoK`). |
| `escenario-phaser.js` | `EscenarioTopos` | Fondo, agujeros (labio de adelante que tapa el corte), dibuja cada cuadro topo + globo con `setCrop`, zona táctil por agujero (topo **y** globo), `mazo(hoyo)` (Promise que se resuelve en el impacto: con el mango horizontal la cabeza queda vertical y su punta toca la coronilla), efectos (`estallido`, `lluvia`, `iluminar`, `flotante`). |
| `aparicion.js` | `Aparicion` | Saca topos con el reloj de la escena (`update`): intervalo, simultáneos, tiempo afuera; `golpe(hoyo)`. |
| `temporizador.js` | `Temporizador` | Cuenta regresiva con el `update` de la escena. |
| `iconos.js` | `IconosTopos` | Partes de "Une" + corazón, cerebro, pulmones + cepillo, peine, pelota, manzana, banano, osito, carro, cuchara, taza. |
| `demo.js` | `ToposDemo` | Micro-tutorial (no suma, no corre el reloj). |
| `guia-3d.js` | `Guia3D` | Copia de "Une" (Zoe 3D). |
| `script.js` | — | Flujo, HUD (letrero de madera, reloj, barra de progreso), voces, ayuda, fin por tiempo y victoria. |

- **Agregar una imagen**: dibujo en `iconos.js` + entrada en `config.imagenes` con su `categoria` + agregarla a las
  etapas de `config.dificultad` que la usen. No hay que tocar la lógica.
- **Zona útil**: la escena llega hasta abajo y la barra de Zoe flota sobre la arena; los agujeros usan `lay.Hu`
  (alto del lienzo menos la barra), medido en `reacomodar()`.
- Topos, apariciones y reloj corren con el tiempo de Phaser (no con `setTimeout`): si la pestaña se oculta, se
  detienen solos.
- **Voces en la partida**: `decirRapido` salta una frase si la anterior empezó hace menos de `vozPausaMs` (2,6 s).
  Ayuda: a los 9 s sin tocar, Zoe recuerda mirar los globitos y el globo de una parte del cuerpo brilla en dorado;
  luego cada 16 s.
- **Final**: objetivo cumplido → topos celebran, lluvia de estrellas, luz cálida, Zoe entra,
  cartel "¡SÚPER VELOZ!" (sí lleva cartel: lo pidió el enunciado) → victoria compartida. Tiempo agotado → tarjeta
  "¡Buen trabajo!" con el número de partes y 0-3 estrellas, "¡Jugar otra vez!" (reinicia sin intro) y "Salir".
- Probar: `node scripts/probar-golpea-a-los-topos.js`. En el navegador, `mousedown` en el canvas sobre
  `EscenarioTopos.puntoTopo(hoyo)` o `puntoGlobo(hoyo)`. **Con el panel oculto Phaser no avanza** (ni topos ni
  reloj): para probar así, mover el bucle a mano con
  `setInterval(() => __escenarioTopos.loop.step(performance.now()), 16)`.
- Registro: fila en `database/ambientes.sql` (orden 15, imagen `topos.png`, color `#e8590c`).
