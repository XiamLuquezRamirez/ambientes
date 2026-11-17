# ¡El Viaje del Pez por el Laberinto de Burbujas!

Polimotor · Prejardín (3-4 años) · Eje 2 *Coordinación y orientación* (Juego 2) · Temática 32 *Laberintos de coordinación*
Carpeta: `public/catalogo_juegos/Polimotor/ViajePezLaberintoBurbujas/`
Slug: `viaje-pez-laberinto-burbujas` (ambiente 7, eje 17, temática 32, módulo 9, orden 24, imagen `viaje-pez.png`, color `#15aabf`)

El niño toma al pez payaso con el dedo (o el ratón) y lo lleva por un camino de agua bordeado de burbujas hasta su
casa de coral. Cuatro recorridos **generados al azar en cada partida**, con dificultad progresiva, callejones cortos
y **lazos** (desvíos que rodean una isla de burbujas y vuelven a unirse al camino), y un final en el gran arrecife.

## Pedidos del usuario (2026-11-17)

- Sin rama nueva en git. **No crear otro archivo SQL**: solo la fila en `database/ambientes.sql` (y en la BD local).
- Edad: el enunciado decía 5-6 años, pero el usuario corrigió a **3-4 años** (distintivo visible arriba a la
  izquierda y `niveles[].edad = "3-4 años"`).
- Los distractores son parte del mismo camino y se ven igual (mismo color, textura y burbujas).
- El pez se mueve en todas las direcciones; puede salirse un poco: la pista se pone roja, borde rojo en la pantalla,
  sonido suave de alerta y una corriente que lo invita a volver; más allá de la holgura queda en el borde y, si el
  dedo sigue lejos, vuelve nadando solo al último punto válido. Al volver: color normal, sonido positivo, sigue igual.
- Cola, aleta y cuerpo siempre en movimiento; burbujas al nadar (más al acelerar); flota quieto; se inclina en las
  curvas; partículas al pasar junto a las algas.
- Fondo que reacciona: algas que se doblan, burbujas y peces que se apartan, adornos que se corren un poco, la luz
  del agua sube con el avance, el coral brilla al acercarse y todo celebra al llegar.
- Voces literales: intro de Zoe, demo de Zeus y cierre de Zoe ("¡EXCELENTE NAVEGADOR! …").
- Interfaz: título centrado; Inicio y reiniciar arriba a la derecha; edad arriba a la izquierda; recorrido abajo a
  la izquierda ("RECORRIDO n DE 4"); accesibilidad y volumen abajo a la derecha. Solo tableta y computador.
- Zeus no se dibuja (solo su voz), igual que en el Camino del Cohete; Zoe 3D en la presentación, demo y final.

Segunda ronda (2026-11-17): **fondo marino más decorado con algas y peces**:

- Bosque de algas sobre la arena en dos planos: 26 lejanas (oscuras, detrás de los rayos) y 34 cercanas de colores
  en manojos; algas altas en los bordes izquierdo y derecho. Se mecen con el agua y las cercanas se doblan (y
  sueltan partículas) cuando el pez pasa al lado.
- Rocas, estrellas de mar y caracoles en la arena.
- 12 peces de adorno en dos planos (antes 5) y 3 cardúmenes (7-9 pececitos) que nadan juntos y se abren al pasar el
  pez. Su altura se calcula con el alto del mundo (llenan también la tableta vertical).
- Todo va detrás del camino: el camino sigue legible (probado a 1366 × 768 y 768 × 1024, sin errores).

Tercera ronda (2026-11-17): las letras del título "¡EL LABERINTO DE BURBUJAS!" pasan a **colores marinos**
(turquesa, aguamarina, azules de mar, verde espuma y coral), con el mismo contorno azul oscuro.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasPez` | Puro (`module.exports`). Generador (copia del del cohete + lazos) y geometría del nado. |
| `iconos.js` | `IconosPez` | SVG originales: pez (cuerpo), cola, aleta, coral con cueva + interior, concha, rocas, algas, estrella de mar, caracol, pececito (se tiñe), arrecife final, burbuja, estrella. |
| `sonidos.js` | `SonidosPez` | Web Audio: nado (rumor + burbujitas según la velocidad), plop de burbuja, brillo, alerta, positivo, callejón, regreso, corriente, coral, éxito, fanfarria, fiesta y música ambiental submarina. |
| `escenario-phaser.js` | `EscenarioPez` | Lienzo Phaser: mar, camino de burbujas, pez, transiciones y final. |
| `arrastre.js` | `ArrastrePez` | Ratón y dedo (solo el primer puntero). Convierte con `EscenarioPez.mundoDeJuego` (ver Trampas). |
| `demo.js` | `PezDemo` | La mano toma al pez, curva y giro, se desvía (rojo) y vuelve, llega al coral. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copia del cohete). |
| `script.js` | — | Flujo, voces, ayudas, alerta, callejones, transiciones, final y resumen con medallas. |
| `viaje-pez.png` | — | Icono 256 × 256 (dibujado con PIL). |

## Generador

Igual que `CaminoCoheteZeus` (celdas de 2,25 anchos, búsqueda al azar, Bézier por los centros) más **lazos**:
dos celdas libres pegadas a dos celdas seguidas del camino (`i`, `i+1`); el lazo sale junto a `i`, rodea la isla y
entra junto a `i+1`. Un ramal es `{ raiz, pts }` (callejón) o `{ raiz, union, lazo: true, pts }`. El nado entra y
sale del lazo por los dos extremos (`vecindad`, `localizar`); `enCallejon` ignora los lazos.

| Recorrido | ancho | callejones | lazos | bifurcaciones |
|---|---|---|---|---|
| 1 Primeras burbujas | 108 | 1 | 0 | 1 |
| 2 Entre las algas | 102 | 1 | 1 | 2 |
| 3 El arrecife escondido | 98 | 1-2 | 1 | 2-3 |
| 4 El gran viaje al coral | 94 | 2 | 1 | 3 (2 en pantallas chicas) |

Respaldo en pantallas con pocas celdas (en orden): camino más corto · sin lazo y un callejón más · un callejón
menos sin bajar de 2 bifurcaciones · camino aún más corto. Generar una partida tarda hasta ~1 s.

## Flujo

Inicio → intro 3D → `PedniaEdad` → presentación (título, Zoe entra, el pez llega nadando a la concha, Zoe dice la
invitación) → demo automática (voz de Zeus) → Zoe sale → "¡Comenzar a jugar!" → por recorrido: corriente de
burbujas, aparece el camino con sus burbujas-guía en ola, cartel con el nombre, el pez llega a la concha,
instrucción → al llegar: salto de alegría, el coral brilla, el pez entra en la cueva, cartel del logro → … → final:
el pez nada al gran arrecife (crece hasta verse protagonista), se acomoda en la anémona, los amigos lo rodean, la
luz sube, Zoe entra y dice el cierre → **resumen** con 4 medallas y la miniatura de cada camino →
"¡JUGAR OTRA VEZ!" (4 recorridos nuevos sin repetir presentación ni demo).

## Cómo probar

- `node scripts/probar-viaje-pez-laberinto-burbujas.js`: config, textos literales, 160 partidas en varios tamaños
  (bifurcaciones por recorrido, validez, largo progresivo, lazos), nado (seguir llega; atajar no; callejón sin
  salida; lazo que vuelve al camino y sigue hasta el coral; holgura con límite) y dibujos. Resultado: 1765/1765.
- Navegador: `juegos-estatico-2` (8013). Arrastrar con `MouseEvent` en el canvas usando `EscenarioPez.puntoPez()` y
  `EscenarioPez.aPantalla(x, y)` sobre `recorrido().principal` (o `falsos[k].pts` para el lazo).
- Probado (2026-11-17) a 1366 × 768, 1024 × 768 y 768 × 1024: demo con desvío en rojo, desvío y regreso sin perder
  avance, callejón, lazo, los 4 recorridos, final, resumen y segunda partida, sin errores de JavaScript.

## Trampas

- `setTintFill` no existe en Phaser 4 (rompe `create`): usar una textura blanca + `setTint`.
- Tras mover la cámara a mano (final), `camera.getWorldPoint` devolvía coordenadas viejas y en "¡JUGAR OTRA VEZ!" el
  pez no se podía tomar. `arrastre.js` usa `mundoDeJuego` (con `vista()`). El Camino del Cohete usa
  `getWorldPoint` y podría tener el mismo problema (no se tocó).

## Pendientes

- El táctil real solo se puede comprobar en una tableta física.
- Las voces dan 404 en `/juegos/tts` con el servidor estático (normal); probar con Laravel para oírlas.
