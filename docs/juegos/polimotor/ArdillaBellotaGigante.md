# La Ardilla y la Bellota Gigante

Polimotor · Prejardín (3-4 años) · Eje 2 *Coordinación y orientación* (Juego 3) · Temática 32 *Laberintos de coordinación*
Carpeta: `public/catalogo_juegos/Polimotor/ArdillaBellotaGigante/`
Slug: `ardilla-bellota-gigante` (ambiente 7, eje 17, temática 32, módulo 9, orden 25, imagen `ardilla-bellota.png`, color `#e8590c`)

El niño arrastra una bellota gigante desde la ardilla hasta la cesta por un bosque de otoño. Cada uno de los cuatro
niveles tiene **dos caminos de tierra iguales** que salen del mismo punto y llegan a la misma cesta: uno despejado y
otro con obstáculos (tronco, piedras, ramas, tronquitos, hongos) que se rodean. No hay callejones ni trampas.

## Pedidos del usuario (2026-11-17/18)

- Sin rama nueva y **sin otro archivo SQL**: solo la fila en `database/ambientes.sql`. La fila de la BD local ya
  existía (creada el 2026-11-17, orden 25) y no se tocó; se copió igual al volcado.
- Edad visible **3-4 años** (arriba a la izquierda) y `niveles[].edad = "3-4 años"`. Indicador "NIVEL n DE 4".
- Interfaz: **sin título en la cabecera** (pedido 2026-11-18; el hueco queda para no mover los botones); Inicio y reiniciar arriba a la derecha; nivel abajo a la izquierda; accesibilidad y
  volumen abajo a la derecha.
- Los dos caminos se dibujan igual (ni color ni textura distinguen el despejado). Los adornos (árboles, arbustos,
  flores, hierba, hojas) nunca pisan los caminos; los hongos y troncos son solo obstáculos, no adorno.
- Pruebas **solo en PC y tableta horizontal** (el usuario lo pidió explícitamente; no probar tableta vertical ni
  teléfono).
- Zeus solo voz; Zoe 3D en presentación, demo y final (copia de `guia-3d.js` del Pez).

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasArdilla` | Puro (`module.exports`). Generador de recorridos, arrastre (`mover`), obstáculos-cápsula, simulación de rutas. |
| `iconos.js` | `IconosArdilla` | SVG originales. Copas de árbol con `follaje()` (2026-11-18, el usuario las veía muy caricatura): racimos de borde irregular con degradado de luz, ramas que asoman y hojitas de textura, sin contornos gruesos; tronco con corteza en degradado. También la copa y el tronco del árbol de la casa. Además: ardilla por piezas (cola, cuerpo, cabeza, párpados en un marco 240×240), bellota, cesta (atrás/frente), obstáculos, árboles (tronco + 3 copas), hoja, flor, hierba, arbusto, cerca y el árbol con la casa. |
| `sonidos.js` | `SonidosArdilla` | Web Audio: arrastre sobre hojas secas, hojas, hojita que se enciende, toque de madera (obstáculo, no negativo), alerta amable, regreso, saltito, cesta, éxito, fanfarria, fiesta; música con modos `intro`, `bosque` (pájaros) y `final`. |
| `escenario-phaser.js` | `EscenarioArdilla` | Bosque, caminos (normal y rojo), hojitas guía, obstáculos, ardilla, bellota, cesta, transiciones y final. |
| `arrastre.js` | `ArrastreBellota` | Ratón y dedo (primer puntero). Usa `mundoDeJuego` (no `getWorldPoint`). |
| `demo.js` | `ArdillaDemo` | La mano toma la bellota, va por la ruta del tronco, lo rodea y llega a la cesta. |
| `script.js` | — | Flujo, voces, ayudas, alerta, niveles, final y resumen. |
| `ardilla-bellota.png` | — | Icono 256×256 (compuesto con los mismos SVG en Edge sin interfaz). |

## Generador (`reglas.js`)

`inicio ── S ╭ ruta arriba ╮ J ── meta`. Tronco común corto (0,7-0,95 anchos), dos carriles por Catmull-Rom con
puntos de vaivén, una ruta al azar recibe los obstáculos apoyados hacia un lado (desplazados 0,12-0,2 anchos).

| Nivel | ancho | tramo | ondas | amplitud | obstáculos | tipos |
|---|---|---|---|---|---|---|
| 1 El camino del bosque | 132 | 1 | 0 | 0,05-0,15 | 1 | tronco |
| 2 Las hojas del otoño | 126 | 1 | 1 | 0,25-0,4 | 2 | piedra, rama |
| 3 Los troncos del bosque | 120 | 1 | 1-2 | 0,45-0,6 | 2-3 | tronquito, piedra |
| 4 La gran aventura | 114 | 1 | 2-3 | 0,5-0,7 | 3 | tronco, piedra, hongos, rama |

Validaciones: dentro del área, curvas suaves (`giroMaximo` ≤ 1,05 rad en 12 pasos), carriles separados ≥ 1,75
anchos, obstáculos lejos de la entrada, la cesta, la bifurcación y la otra ruta, separados entre sí, y
**`simularRuta`**: una bellota que sigue el centro de cada ruta con el mismo `mover` del juego debe llegar a la cesta
sin salir del camino ni trabarse. Si no, se descarta (respaldo: menos curvas y obstáculos). Largo medio en
1600×900: 848 → 992 → 1098 → 1151.

Pedido 2026-11-18: el camino ocupa **todo el ancho** en los cuatro niveles (`tramo` 1; márgenes laterales de
1,55 anchos para la ardilla y 1,2 para la cesta). La dificultad crece con las curvas y los obstáculos, no con el
largo horizontal.

Arrastre: zona `pista` hasta medio ancho + 0,1 (desviarse un poquito no cuenta), `fuera` hasta +0,5 (rojo
progresivo desde 0,45, flecha que señala el camino, alerta, voz cada 7 s), `limite` en el borde; si el dedo sigue
lejos 0,9 s, la bellota rueda sola al último punto válido. Nunca se pierde el avance. Tronco y rama son cápsulas
acostadas a lo largo del camino.

Pedido 2026-11-18 (rodear exige intención): la bellota **no rodea sola** los obstáculos. Si la línea entre la bellota
y el dedo atraviesa el obstáculo, la bellota se queda apoyada contra él (puede retroceder). Solo avanza cuando el
dedo va hacia un costado y la línea queda libre. Si se queda empujando más de 1,1 s, aparece una flecha dorada hacia
el lado libre y Zoe dice "¡Rodéalo por un ladito!". Los obstáculos van más al centro del camino (desplazados
0,02-0,07 anchos). Nunca hay bloqueo: `simularRuta` comprueba que rodeando por el lado libre (`desvioRodear`, el
mismo desvío que usa la demo) se llega a la cesta sin salir del camino. La prueba node verifica que ir derecho se
frena siempre y que rodear pasa siempre.

## Flujo

Inicio → intro 3D → `PedniaEdad` → presentación (cartel, Zoe entra, la ardilla llega saltando con la bellota y la
deja en "¡Inicia aquí!", Zoe: "¡Hola! …") → demo (voz de Zeus) → Zoe sale → "¡Comenzar a jugar!" → por nivel:
remolino de hojas, aparece el bosque nuevo, cartel, la ardilla trae la bellota, instrucción (nivel 1: Zoe y luego
Zeus "¡Mira! Puedes pasar…" si aún no movió) → la ardilla sigue a la bellota por su rastro y salta en cada cuarto
del camino → la bellota cae en la cesta, la ardilla salta, lluvia de hojas, "¡Muy bien! ¡Llevaste la bellota hasta
su cesta!" → … → final: la cámara viaja al árbol con la casa, las cuatro bellotas aparecen en la cesta, la ardilla
sube a su puerta y entra, la ventana se enciende; Zoe y Zeus felicitan; cartel "¡AVENTURA COMPLETADA! /
¡SUPEREXPLORADOR DEL BOSQUE!" → resumen con las miniaturas de los cuatro recorridos → "¡JUGAR OTRA VEZ!".

## Cómo probar

- `node scripts/probar-ardilla-bellota-gigante.js`: config, textos literales, index, dibujos, 160 partidas en
  tamaños horizontales y el arrastre. Resultado: 11 662/11 662.
- Navegador: `juegos-estatico-2` (8013). Arrastrar con `PointerEvent`/`MouseEvent` en el canvas usando
  `EscenarioArdilla.aPantalla(x, y)` sobre `ReglasArdilla.puntoEn(recorrido().rutas[k], s)`.
- Probado (2026-11-18) a 1366×768 y 1024×768: presentación, demo, los 4 niveles por la ruta con obstáculos
  (siguiendo el centro: la bellota los rodea sin salir del camino), salida y regreso con rojo y flecha, soltar fuera,
  final, resumen, jugar otra vez, accesibilidad y volumen. Sin errores de JavaScript.

## Trampas

- Con el panel del navegador oculto, los temporizadores se frenan: la bellota (velocidad limitada) se queda atrás
  del dedo simulado y parece que "no llega". No es un fallo del juego.
- El "Omitir" de la intro 3D no responde si se pulsa antes de que cargue; en pruebas, `empezarJuegoTrasIntro()`.

## Pendientes

- El táctil real solo se puede comprobar en una tableta física.
- Las voces dan 404 en `/juegos/tts` con el servidor estático (normal); probar con Laravel para oírlas.
