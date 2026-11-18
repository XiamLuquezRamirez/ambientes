# El Mapa Estelar y las Llaves Mágicas

Polimotor · Transición (5-6 años) · Eje *Coordinación y orientación* (Juego 2) · Temática 32 *Laberintos de coordinación*
Carpeta: `public/catalogo_juegos/Polimotor/MapaEstelarLlavesMagicas/`
Slug: `mapa-estelar-llaves-magicas` (ambiente 7, eje 17, temática 32, módulo 9, orden 27, imagen `mapa-estelar.png`, color `#7c3aed`)

El niño arrastra la nave de Zeus por un laberinto espacial en perspectiva isométrica (una plataforma de roca flotante
con muros, caminos de neón, planetas y nebulosas). Recoge en orden la llave roja, la verde y la azul, que entran en
órbita alrededor de la nave, y llega al portal galáctico: las llaves vuelan a sus candados, el portal se abre y la nave
lo cruza hasta una base espacial en un planeta nuevo. Habilidades: navegación espacial, planificación de rutas,
reconocimiento de bifurcaciones y resolución de problemas.

## Pedidos del usuario (2026-11-18)

- Sin rama nueva y sin otro archivo SQL: una sola fila en `database/ambientes.sql` (orden alfabético) y la misma en la
  BD local.
- Guía de estructura: `docs/juegos/polimotor/estructura.md` + el hermano de laberintos más reciente
  (`CircuitoLaserCentral`); no leer todos los juegos de Polimotor.
- Pruebas solo en escritorio y tableta horizontal.
- Interfaz: Inicio, reiniciar y sonido arriba a la derecha; edad 5-6 años arriba a la izquierda; misión y llaves abajo
  a la izquierda; accesibilidad y volumen abajo a la derecha.
- Segunda vuelta (mismo día): mejorar el arrastre, agregar un nivel y quitar el título de letras de la cabecera (el mapa
  sube y ocupa ese espacio).
- Tercera vuelta: quitar el título del juego en todas partes. Tampoco va en la portada (el kicker lo recrea
  `comun/inicio-fondo.js` desde `<title>` o `?nombre=`, así que `style.css` lo oculta con `html body #pantalla-inicio
  .inicio-kicker`) ni como cartel al empezar la presentación. El nombre queda solo en `<title>`, en el `alt` del icono y
  en la etiqueta accesible de la cabecera.
- Cuarta vuelta: los avisos de la partida (misión nueva, llave conseguida, ¡AL PORTAL!, ¡Así se hace! de la demo) son
  una píldora de una línea arriba al centro, del color de la llave (`mostrarCartel(…, mini)` + `.escenario-cartel.mini`),
  y duran 1,6-2,2 s. El cartel grande solo queda para el paso de nivel y el final.
- Quinta vuelta: los dos mapas se generan al azar (`ReglasMapa.generar`). Ver «Mapas aleatorios».
- Sexta vuelta: música de fondo = ambiente espacial continuo (zumbido grave que respira, viento cósmico, destellos con
  eco y un sonar suave; `SonidosMapa.musica`). Nave más pequeña (`CELDAS_POR_UNIDAD` 0,4 en nave-3d.js y
  `radioNave` 0,22) y caminos de 1,3 celdas (`juego.anchoCamino`: el piso se ensancha 0,15 hacia la roca y los muros
  se adelgazan lo mismo; choque con margen 0,43).

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasMapa` | Puro (`module.exports`). Laberinto en cuadrícula: nodos con nombre y tramos rectos; `mover` (sub-pasos de 0,04 celdas, deslizamiento por el muro), `zona` (cruce, sin salida, llave, portal), llaves en orden (`decidirLlave`), `decidirPortal`, `ruta` (BFS) y `validar` (pasillos pegados sin pared, nodos inalcanzables…). |
| `escenario-phaser.js` | `EscenarioMapa` | Proyección isométrica `iso(x, y, z)`; espacio animado; plataforma con estalactitas y cristales; muros como bloques por diagonal; llaves que giran en 3D; burbuja de llave dormida; barreras de sin salida; portal con remolino, campo de fuerza y tres candados; nave, estela, llama y partículas; recorrido de cámara; final en la base espacial. |
| `nave-3d.js` | `NaveSprites` | Modelo three.js propio de la nave con Zeus (`nino.glb`, pose *Quieto*) en la cabina; se renderiza una vez en 32 rumbos con la misma inclinación del tablero y Phaser usa esas vistas como cuadros. Sin WebGL queda la nave 2D de respaldo. |
| `arrastre.js` | `ArrastreNave` | Ratón y dedo (primer puntero). Se toma la nave y se arrastra con desfase; soltar la deja flotando. |
| `demo.js` | `MapaDemo` | Mano que lleva la nave por `demoLaberinto.ruta`: cruce, sin salida y regreso, las tres llaves, portal. Usa el movimiento y las reacciones reales. |
| `guia-3d.js` | `Guia3D`, `Guia3DZeus` | Fábrica del módulo de Zoe 3D: Zoe a la izquierda (presentación, demo, final) y Zeus a la derecha (solo en el final). |
| `sonidos.js` | `SonidosMapa` | Web Audio: motor, propulsión, tres melodías de llave, alerta, barrera, cruce, llave dormida, remolino del portal, candados, apertura, teletransporte, aterrizaje, luces; música `intro` / `espacio` / `final`; `silenciar()` para el botón de sonido. |
| `script.js` | — | Flujo, voces, misiones, ayudas, portal, final y resumen. |
| `mapa-estelar.png` | — | Icono 256×256 (SVG propio rasterizado con Edge sin interfaz). |

## Mecánica

- Dos niveles en `config.mapas`, generados al azar en cada partida (ver «Mapas aleatorios»). En cada mapa se recogen otra vez las tres llaves; el portal del nivel 1 lleva al
  nivel 2 y el del nivel 2 al final. El indicador dice "NIVEL n DE 2 · MISIÓN m DE 3".
- Arrastre guiado (`ReglasMapa.guiar`): la nave va bajo el dedo, sin desfase, y lo sigue POR LOS CAMINOS. El dedo se
  lleva al punto transitable más cercano; si hay una esquina de por medio, la nave va al centro de la última celda que
  ve en línea recta y dobla sola. Si llegar al dedo exige un rodeo largo (el dedo cruzó una pared hacia otro pasillo),
  no lo sigue: así no resuelve el laberinto por el niño. Se toma con un área generosa (1,35 celdas) y va a 8 celdas/s.
- Nivel 1 (11×9, `config.mapas[0]`): 8 cruces (A, B, C, K2, M, Q, U, T), 4 caminos sin salida (D1-D4) y un ciclo
  (K2-M-T-U-Q). Roja en R (ramal lateral tras el primer cruce, con un sin salida al lado), verde en G (arriba a la
  izquierda), azul en BL (después de la tercera decisión en K2). Portal en P, en la esquina derecha.
- La nave puede ir en cualquier dirección que permita el camino; los muros solo la detienen. Si el dedo queda más de
  `distanciaAlerta` fuera del camino (o en otro pasillo al otro lado de la pared) y la nave no avanza: la cara del
  muro se enciende en rojo coral y suena el aviso. Sin voz ni mensaje (pedido del usuario). Nunca se reinicia ni se
  pierde una llave.
- Cruce: la nave se frena (`frenoCruce`), destellos hacia TODAS las salidas (no señala la correcta). Quieto
  `pistaCruceMs` en un cruce: Zoe "¡Observa los caminos! …" (una vez por llegada).
- Sin salida: aparece la barrera espacial (queda tenue después) y Zeus "¡Camino cerrado! …".
- Llave que no toca todavía: dormida en su burbuja; rebota y Zoe dice cuál buscar primero.
- Portal sin las tres llaves: el campo de fuerza vibra y los candados apagados tiemblan.
- Profundidad: el piso, las sombras y los pulsos se ordenan con los muros por diagonal; lo que flota por encima de los
  muros (nave, llaves, portal) se pinta siempre sobre ellos (`profAlto`): el rayo hacia la cámara sube y los muros son
  bajos, así que nunca los tapa.

## Mapas aleatorios

`config.mapas` ya no trae nodos: trae la dificultad de cada nivel y `config.llaves` los colores. `script.js` llama a
`generarMapas()` al empezar (la presentación muestra el mapa que se juega) y en VOLVER A JUGAR (mapas nuevos).

| Nivel | Cuadrícula | Cobertura | Ciclos | Cruces mín. | Sin salida mín. |
|---|---|---|---|---|---|
| 1 El cinturón de asteroides | 11×9 | 0,75 | 1 | 3 | 2 |
| 2 La nebulosa de cristal | 13×9 | 0,88 | 2 | 5 | 3 |

Cómo se arma (`intentoLaberinto`): los puntos de cruce posibles son las celdas pares; un pasillo une dos vecinos por la
celda impar del medio, así que entre pasillos siempre queda roca. Árbol al azar (Prim) desde la salida (abajo a la
izquierda) hasta la cobertura; el portal (arriba a la derecha) se cuelga como final de ramal; las llaves van en finales
de ramal, roja cerca, verde a media distancia y azul lejos, y el camino a cada una pasa por un cruce; luego se agregan
ciclos largos sin tocar llaves, portal ni salida. `generar` repite intentos hasta que el mapa valida, cumple los mínimos
y las llaves siguen en orden de distancia (un ciclo puede acortar caminos). Con 200 semillas por nivel nunca falla
(1-14 intentos) y salen ≥ 190 mapas distintos; promedio de cruces: unos 7 en el nivel 1 y 10 en el nivel 2.

## Flujo

Inicio → intro 3D → `PedniaEdad` → presentación (el mapa brota diagonal por diagonal, Zoe entra, la nave aparece en
"¡Inicia aquí!", la cámara recorre las tres llaves y el portal cerrado; Zeus "¡Viajero del espacio! …") → demo en el
laberinto pequeño → Zoe sale → «¡COMENZAR!» → misión 1, 2 y 3 (cartel, la llave despierta, Zeus da la instrucción; al
recogerla: gira, se eleva, vuela a la nave, entra en órbita, se enciende su candado; Zoe felicita) → "¡AL PORTAL!" →
apertura y cruce del portal → "¡NIVEL 1 SUPERADO!" y el nivel 2 en un mapa nuevo (Zoe lo presenta) → las tres
llaves otra vez → portal → final (planeta nuevo, la nave sale de un vórtice en el cielo, aterriza en la plataforma,
luces una a una, fuegos; Zoe dice el cierre y Zeus llega caminando y celebra) → resumen (3 misiones, portal
desbloqueado, dos mapas resueltos, misión completada con el tiempo; VOLVER A JUGAR e INICIO).

## Cómo probar

- `node scripts/probar-mapa-estelar-llaves-magicas.js`: config, textos literales, index, los dos laberintos, ruta de
  la demo, movimiento en las 4 direcciones, muro, sin atajos por la roca, esquinas, freno, zonas y orden de llaves.
  También los dos mapas y el arrastre guiado (dedo en diagonal por una esquina, borde, roca, pared hacia otro pasillo,
  rodeo corto). Ahora también el generador: 200 mapas por nivel, todos jugables (salida y portal en las esquinas, llaves al final de
  ramal y en orden, cruce en el camino, ciclos), distintos entre sí y el nivel 2 más difícil. El movimiento se prueba
  sobre un mapa fijo de prueba. Resultado: 104/104.
- Navegador: servidor `juegos-mapa` (8029) de `.claude/launch.json` (8010 y 8013 suelen estar ocupados por otros
  chats). Arrastre simulado con `PointerEvent` + `MouseEvent` en coordenadas de `EscenarioMapa.aPantallaCelda(x, y)`.
- Probado (2026-11-18, segunda vuelta) a 1366×768 y 1024×768: demo con el arrastre guiado, nivel 1 y nivel 2
  completos con el dedo cortando esquinas, paso de nivel, final, resumen de 6 filas sin barra, VOLVER A JUGAR (vuelve
  al nivel 1).
- Primera vuelta: presentación, demo completa, muro, cruces, sin salida D1, llave azul
  dormida, portal cerrado, las tres llaves, portal, final, resumen, VOLVER A JUGAR y sonido. Sin errores de JavaScript
  (solo los 404 de `/juegos/tts`, normales en el servidor estático).

## Trampas

- Con el panel del navegador oculto la intro 3D no avanza (no hay `requestAnimationFrame`): en pruebas automáticas
  llamar `empezarJuegoTrasIntro()`.
- `.guia-pj` es `position: fixed`: su `offsetParent` siempre es `null`; no usarlo para saber si se ve.
- Los botones redondos de la cabecera los pinta `comun/interfaz.css` con imágenes de `Polimotor/img`; el de sonido usa
  `altavoz.png` con la marca roja al silenciar.

## Pendientes

- El táctil real solo se puede comprobar en una tableta física.
- Las voces dan 404 con el servidor estático; probar con Laravel para oírlas.
