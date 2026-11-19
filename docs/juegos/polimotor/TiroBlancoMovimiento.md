# El Tiro al Blanco en Movimiento (`Polimotor/TiroBlancoMovimiento/`)

Polimotor · **5-6 años** · eje 17, temática 34 «Coordinación visual» · slug `tiro-al-blanco-movimiento` · orden 32 ·
color `#7048e8` · icono `tiro-al-blanco.png`. Creado el 2026-11-19.

## Qué se ve

Arena de puntería espacial original, pintada con canvas 2D y montada en Phaser 4 con perspectiva (mundo 1600 × 900,
`Scale.ENVELOP`): fondo con nebulosas y estrellas que titilan, planetas que derivan, conos de luz, dos torres
holográficas, pantalla «PEDNIA» apoyada sobre la plataforma flotante derecha (flota con ella), plataformas flotantes, piso metálico en perspectiva con baldosas que se encienden
(ondas desde el lanzador al disparar y al acertar) y partículas flotantes que se apartan al paso del disco.

- **Diana holográfica**: tres anillos (10 / 20 / 50) con números pequeños, aro punteado que gira, halo, destellos en
  órbita, pulso, reflejo en el piso y haz de luz. Reacciona al golpe: retrocede en la dirección del disco, vibra y
  (en el centro) gira rápido con explosión dorada, ondas y destello de pantalla.
- **Sombra fantasma**: contorno punteado verde menta en la posición futura aproximada (`anticipoS`), con flecha de
  puntos desde la diana. Se desvanece sola.
- **Lanzador estelar de Zeus** (rediseñado 2026-11-19 según la referencia del usuario): plato metálico con ranura de luz cian, cilindro de vidrio con energía cian y burbujas, collar metálico con luces; el disco rosa espera **acostado** sobre el collar (`disco-plano`), se eleva y tiembla al cargar; la energía del vidrio sube; discos de repuesto delante del plato (uno cian, dos rosados apilados, decorado). La cúpula y los anillos flotantes anteriores se quitaron por confusos.
  anillos que giran, disco esperando dentro, retroceso al disparar.
- **Disco de luz**: rayos que giran, halo, estela y chispas; se achica al alejarse (profundidad).

## Mecánica

- **Esfera de energía** (pedido 2026-11-19): esfera translúcida que gira alrededor del disco (`radioMira` 140).
  Solo se apunta si el toque empieza dentro de ella; tocar fuera no hace nada salvo que la esfera parpadea, el
  lanzador brilla y sale la pista «Toca el disco y arrastra dentro de la esfera».
- **La esfera es un joystick** (pedido 2026-11-19): la dirección del dedo da hacia dónde y lo lejos del centro da
  hasta dónde. Centro → mira a `alcanceMin` (150) del lanzador; borde de la esfera → mira en el tope: borde superior
  o lateral **de lo que se ve** (`rectVisible`, en tableta 4:3 los lados recortados), con `margenMira` 24. Si el
  dedo sale de la esfera, la mira queda en el tope. `ReglasTiro.puntoMira` / `dedoPara` (inverso, para la demo).
- La línea punteada va **completa** desde el disco hasta la mira (cruz amarilla). El disco sale siempre a la misma
  velocidad (`velDisco` 1300, gravedad 300) con la curva corregida para pasar por la mira (`tiroHacia`), y
  «llega» cuando está a la distancia de la mira: si la diana está ahí, se puntúa según qué tan cerca del centro
  pasa (descontando `radioDisco` 12): ≤ 0,34 R → 50, ≤ 0,67 R → 20, ≤ R → 10; si no, sigue de largo por detrás.
  Un toque sin mover `arrastreMin` (30) no lanza. Si el dedo vuelve al centro, vale la última mira válida.
- Historia de la puntuación (2026-11-19): primer roce → casi siempre 10; paso más cercano → casi siempre 50;
  velocidad según el arrastre → boleas, ronda 3 imposible; alcance según la distancia del dedo en toda la pantalla
  → se iba lejísimo; solo dirección → el usuario pidió poder apuntar más alto con la esfera. Modelo actual: joystick.
- Medido en navegador (bot que espera 1,5 s, 3 rondas): anticipando o con error, 2-52 px del centro; la demo a 2 px.
- Fallo: el disco sigue, se apaga en el espacio; Zoe: «¡Casi! Lánzalo un instante antes…». Sin puntos negativos.
  Tras 2 fallos seguidos vuelve la sombra (también mientras apunta) y una pista de voz.
- No se puede lanzar con un disco en el aire (`volando`, entrada apagada hasta el resultado).

## Rondas (config.json)

| Ronda | Radio | Velocidad | Patrones | Sombra |
|---|---|---|---|---|
| 1 Aprende a apuntar | 120 | 115 px/s | horizontal → / ← | los 4 lanzamientos, 2,6 s y mientras apunta |
| 2 Anticipa el movimiento | 102 | 150 | horizontal y diagonal | 2 primeros, 1,5 s |
| 3 Desafío estelar | 96 | 180 | diagonal, vertical, ondulatorio, combinado (ocho) | 1.º lanzamiento, 1,2 s, y como ayuda |

Patrones (`ReglasTiro.posicion`): senos y cosenos dentro de la caja `zona` (x 360–1240, y 215–445), frenan suave en
los extremos; el patrón cambia cada lanzamiento sin repetir y la diana se desliza 0,7 s al inicio del nuevo.

## Flujo

inicio común → intro 3D → edad → presentación (cartel con el título **solo aquí**, diana moviéndose, Zoe 3D entra,
voz de Zeus) → demo automática (lanzador iluminado, mano toca y arrastra con la solución recalculada cada cuadro,
trayectoria, sombra fantasma, disco, impacto con «+50»; voz de Zoe; si fallara, repite una vez) → Zoe sale →
«¡Comenzar a jugar!» → 3 rondas → final propio: luces al máximo, la diana gira y se vuelve estrella, 8 discos en
órbita, fuegos artificiales, lanzador saltando, música; panel «¡QUÉ GRAN VISTA Y PRECISIÓN!» con estrellas (mínimo 1),
puntos que cuentan, lanzamientos, aciertos y centros; «Jugar nuevamente» / «Volver al menú». Zoe vuelve y celebra.

Voces con prioridad (`script.js`): 1 = ánimo (se omite si suena otra), 2 = aviso del tiro (corta una de prioridad 1),
3 = instrucción (`decir`, espera turno).

## Pedidos del usuario (2026-11-19)

- Sin cartel de «5-6 años» en la partida.
- Botones de reiniciar, volver, accesibilidad y volumen **iguales** a los demás de Polimotor (marcado común +
  `../comun/interfaz.css`, mismas posiciones).
- Diseño visual nuevo; de Polimotor solo la organización de los botones. Sin rama ni SQL nuevo.
- Segunda pasada: letrero PEDNIA sobre la plataforma; la puntuación siempre daba 50 (ahora por profundidad);
  la guía desaparecía al bajar el dedo por la esfera (ahora conserva la última mira).

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasTiro` | Puro: rondas, patrones, `lanzamiento`, `punto`, `apuntarHacia` (demo), zonas, resumen, estrellas, `revisarJuego`. |
| `dibujos.js` | `DibujosTiro` | Todas las texturas en canvas 2D y la geometría del piso (`celdaPiso`). |
| `escena-arena.js` | `EscenarioTiro` | Escena Phaser: arena viva, diana, sombra, lanzador, guía, vuelo, impactos, celebración, final. |
| `sonidos.js` | `SonidosTiro` | Web Audio: zumbido espacial, carga, mira, disparo, 10/20/50 (fanfarria), fallo, puntos, ronda, fuegos, música. |
| `demo.js` | `TiroDemo` | Demostración automática con la mano de `PedniaTutorial`. |
| `script.js` | — | Flujo, voces, HUD (puntos arriba; ronda + lanzamientos abajo a la izquierda), pista visual, final. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copia tal cual). |

## Cómo probar

- `node scripts/probar-tiro-al-blanco.js` (18 pruebas: esfera como joystick con tope en el borde, dedoPara inverso, el disco llega a la mira, anticipar ayuda, ronda 3 anticipable, config, patrones seguros, física/demo, toda la zona alcanzable, puntuación 50/20/10/0 según la puntería, zonas, textos literales,
  botones comunes, sin cartel de edad).
- Servidor `juegos-tiro` (puerto 8040): `http://localhost:8040/catalogo_juegos/Polimotor/TiroBlancoMovimiento/index.html`.
- Con el panel del navegador oculto, Phaser y las animaciones CSS se congelan: se probó con Edge headless por CDP
  (ratón y **toques reales** `Input.dispatchTouchEvent`), a 1366 × 768 y 1024 × 768. Para el táctil, Phaser va con
  `input.touch: true` (si la pantalla táctil no se detecta al arrancar, los toques no llegaban).
- En la página: `EscenarioTiro.estadoDiana()`, `EscenarioTiro.predecir(s)`, `EscenarioTiro.aPantalla(x, y)`;
  `historial`, `puntosTotal`, `rondaIdx`, `lanzIdx`, `jugando`, `volando` (let de `script.js`).

## Registro

Fila en `database/ambientes.sql` (antes de `tres-sonidos`) e insertada en la BD local con artisan (idempotente);
`JuegoCatalogoService::listarActivosPorAmbiente(7, 5)` la lista.

## Pendientes

- Probar el toque en una tableta física.
- En tableta 4:3 la plataforma derecha y el letrero quedan cortados por el borde (son decorado; la diana no llega ahí).
