# ¡La Hora de Comer!

`public/catalogo_juegos/Polimotor/HoraDeComerOsito/` · slug `hora-de-comer-osito` · **3-4 años** · Eje 17 «Coordinación y orientación», temática 34 «Coordinación visual».

Picnic en el bosque: un osito sentado en la manta se mueve de lado a lado y abre la boca en ciclos. El niño espera a que la abra, toma una fruta del plato y la arrastra hasta su boca.

## Pedido (2026-11-19)

- Diseño visual nuevo (no reutilizar diseños de Polimotor); Phaser con JavaScript vanilla; sin rama nueva ni SQL aparte.
- Introducción y demostración automáticas; 3 rondas de 4 frutas con dificultad creciente; escena final independiente con "¡12 FRUTAS ENTREGADAS!", "Jugar nuevamente" y "Volver al menú".
- Controles: inicio y reiniciar arriba a la derecha; accesibilidad y volumen abajo a la derecha; ronda abajo a la izquierda; contador de frutas arriba al centro. Sin pastilla de edad en pantalla (un solo nivel; la edad la resuelve PedniaEdad). Título solo en la introducción.
- Solo escritorio y tableta horizontal.
- 2026-11-19 (cambio): **misma gráfica que "La Ardilla y la Bellota Gigante"** (mismo tipo de dibujo) y **los mismos botones e íconos de los demás juegos**: reiniciar `btn btn-warning btn-round` + `onclick="location.reload()"` (fa-rotate), salir `btn btn-danger btn-round` + `onclick="history.back()"` (fa-arrow-left), `#btn-menu-acc`/`#btn-menu-vol` con `menu-acc-fab`; sus imágenes (repetir, volver, accesibilidad, altavoz) las pone `../comun/interfaz.css`. "¡Comenzar a jugar!" con `btn-comenzar` como en los demás. Nunca cambiar esos íconos.

## Escena

- `dibujos.js` copia el estilo de `ArdillaBellotaGigante/iconos.js`: SVG con contorno oscuro redondeado, degradados radiales con luz arriba a la izquierda, pelaje con borde de mechones (`peludo`), follaje natural por racimos (`follaje`/`racimo`, paletas roja, naranja, amarilla y verde), tronco, cerca de madera, matas con bayas, hongos, hierba, flores blancas, hoja que cae, cesta y pasto en mosaico con manchas y briznas. `DibujosComer.preparar()` rasteriza los SVG antes de crear el juego (`EscenarioComer.montar` lo espera).
- Bosque (`crearBosque` en `escena-picnic.js`, compartido por las dos escenas): fila de árboles detrás de una cerca, árboles grandes a los lados, manchas de sol y rayos cálidos (mezcla ADD) y hojas de colores que caen, como en la Ardilla. Manta de cuadros en perspectiva con borde oscuro, osito, plato, frutas, cesta y letrero PEDNIA con contorno.
- Mundo de diseño 1600 × 900 con `Scale.ENVELOP`: llena la pantalla; lo importante está entre x 220 y 1380 (cabe en 4:3).
- El osito (`oso.js`) está armado por piezas: cuerpo, pies, piernas (solo de pie), brazos, cabeza; ojos y boca son `Graphics` que se redibujan (normal, alegre, feliz, parpadeo; boca cerrada sonriente o abierta con lengua). Halo amarillo alrededor de la boca abierta (más fuerte si la fruta arrastrada está cerca).
- Osito pardo más real (2026-11-19, pedido del usuario): pelaje con textura de mechones (`pelaje()`: luz arriba a la izquierda, sombra abajo a la derecha), borde de pelo, orejas con mechones, cuencas de los ojos y cejas, hocico tostado con volumen y puntitos de bigote, nariz grande y brillante con orificios, ojos con iris café, pupila y dos brillos (`oso.js`), almohadillas oscuras y garritas en manos y pies. De pie, las piernas nacen bajo el torso.
- Escena final `Fiesta` "Amigos del bosque" (elegida por el usuario entre 4 propuestas, 2026-11-19): el osito termina de comer y se frota la barriga; llegan saltando la ardilla (el mismo dibujo de `ArdillaBellotaGigante/iconos.js`) y un conejo, y volando dos pajaritos (azul y rojo, alas que aletean); empieza una lluvia de hojas de otoño y pétalos; el osito se levanta; todos bailan 4 tiempos (saltos, corazones) y en los tiempos 2 y 4 cada amigo levanta su fruta (manzana, fresa, uvas, naranja) con destellos; al final todos saludan. Banderines, cesta, plato, flores y árboles se mueven con la fiesta; luego Zoe 3D entra y el panel "¡12 FRUTAS ENTREGADAS!". Sonidos nuevos: `pio` (pajaritos) y `brinco`.

## Flujo

inicio → intro 3D (Zeus y Zoe, `textos.conversacion`) → PedniaEdad → presentación (frutas caen al plato, el osito se mueve y abre la boca, Zoe entra: `introZoe`; sin el título «¡La Hora de Comer!» sobre el picnic) → demo automática (Zeus `demoZeus`; el osito va de izquierda a derecha, abre la boca, la mano toma la manzana, la lleva a la boca, come y celebra) → Zoe sale → "¡Comenzar a jugar!" → 3 rondas → fiesta → panel de resultado.

## Mecánica (reglas.js)

- `cicloBoca`: cerrada → abriendo (`abreMs`) → abierta → cerrando (`cierraMs`). Entrega válida si la apertura ≥ `umbralApertura` (0,6) y la fruta se suelta a menos de `radioBoca` (92 px de diseño) del centro de la boca; crece 12 por fallo seguido hasta 140.
- Rondas (`config.rondas`): R1 velocidad 0,55, rango 110, boca abierta 3,4 s, se detiene al abrir; R2 0,8 / 210 / 2,6 s, frena a la mitad; R3 1,0 / 290 / 2,0 s, no frena y varía la velocidad.
- Objetos que no se comen (pedido 2026-11-19: "que tengan que ver con el juego"): `config.objetos` cuchara, tenedor, cuchillo, salero y taza; cada ronda los nombra en `rondas[].objetos` (R1 cuchara; R2 tenedor y salero; R3 cuchillo y taza). `ReglasComer.piezasRonda` mezcla frutas y objetos (ids `rN-k-fruta` y `rN-oK-objeto`); el plato muestra 4 piezas en una fila o 5-6 en dos filas (plato 1,2×, piezas de 102 px). Dibujos en `dibujos.js` (`OBJETOS`, al estilo Ardilla: metal con brillo, mangos de colores). Si un objeto llega a la boca (radio × 1,4, con la boca abierta o cerrada) el motivo es `noComida`: el osito cierra la boca y niega con la cabeza (`OsoComer.negar`), el objeto vuelve al plato y Zoe dice `textos.noSeCome` ("¡Eso no se come! Dale una fruta al osito."). No cuenta como fallo ni agranda la zona de la boca. La ronda termina con las 4 frutas; la ayuda y la demo solo usan frutas.
- Error (boca cerrada o lejos): la fruta rebota y vuelve al plato; Zoe "¡Espera a que abra su boquita!" o "¡Inténtalo otra vez!". Sin vidas ni penalizaciones.
- Acierto: la fruta vuela a la boca, ojos alegres, mastica 3 veces, se frota la barriga, corazones y estrellas. Mientras come no se puede arrastrar (bloqueo) y la fruta ya entregada no se puede volver a entregar.
- Ayuda: a los `ayudaMs` sin entregar, halo bajo una fruta y caminito de puntos hasta la boca (se apaga con "Ayuda visual") y Zoe da una pista.

## Voces

Una a la vez: `decir` espera la voz que suena; `decirRapido` se omite si hay otra sonando. Frases literales en `config.textos` (la prueba de node las comprueba). Final partido en `finalZoe` + `finalZeus`.

## Sonidos (sonidos.js, Web Audio, sin archivos)

Ambiente del bosque (brisa, hojas, pajaritos), selección, arrastre, apertura de boca, fruta en la boca, masticar, "mmm" de satisfacción, acierto, intento suave, rebote, aparición, fin de ronda y música propia de fiesta. Volumen con deslizador y botón "Silenciar" (apaga sonidos y voces).

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | portada, intro 3D, escena, contador, ronda, controles, panel final |
| `style.css` | contador, ronda, carteles y panel final; botones comunes con `../comun/interfaz.css` |
| `config.json` | rondas, frutas, textos, nivel 3-4 años |
| `reglas.js` | `ReglasComer` (puro, también para node) |
| `dibujos.js` | `DibujosComer`: dibujos SVG al estilo de la Ardilla, rasterizados a canvas |
| `oso.js` | `OsoComer`: osito por piezas, animado con delta time |
| `escena-picnic.js` | `EscenarioComer`: escenas `Picnic` y `Fiesta`, arrastre, partículas, `Animador` con respaldo por tiempo |
| `sonidos.js` | `SonidosComer` |
| `demo.js` | `ComerDemo` |
| `guia-3d.js` | Zoe 3D (copia de Cazador de Burbujas) |
| `script.js` | flujo, voces, ayudas, rondas, final, reinicio en el sitio |
| `hora-de-comer.png` | ícono 256 × 256 (dibujos propios rasterizados con Edge headless) |

## Probar

- `node scripts/probar-hora-de-comer.js` (12 pruebas).
- `preview_start juegos-comer` (puerto 8039) → `/catalogo_juegos/Polimotor/HoraDeComerOsito/index.html`.
- Con el panel oculto: `setInterval(() => __escenarioComer.loop.step(performance.now()), 16)`.
- Arrastrar: `mousedown`/`mousemove`/`mouseup` **sobre el canvas** (`__escenarioComer.canvas`) desde `EscenarioComer.puntoDe(id)` hasta `EscenarioComer.puntoBoca()`; esperar `EscenarioComer.oso().estadoBoca === "abierta"`.

## Registro en BD

Fila en la BD local (tinker, idempotente) y en `database/ambientes.sql` tras `haz-vibrar-las-cuerdas-de-la-guitarra`. Orden 31, imagen `hora-de-comer.png`, color `#f08c00`. Aparece en `listarActivosPorAmbiente(7, 3)` y `(7, 4)`, y no en `(7, 5)`. El nivel declara `edad` `3-4 años` e `id` `3`.

## Pendientes

- Toque real en tableta física; voces del servidor (`/juegos/tts`) con Laravel; sin commit.
