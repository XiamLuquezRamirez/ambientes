# ¡La Pista de Ritmo y Pasos Mágicos!

Polimotor · Prejardín (3-4 años) · Juegos de memoria corporal · **juego 3**
Carpeta: `public/catalogo_juegos/Polimotor/PistaRitmoPasosMagicos/`
Slug: `pista-ritmo-pasos-magicos`

Memoria auditiva, visual y secuencial: la pista musical enciende una secuencia de baldosas con su sonido y el
niño la repite tocándolas **en el mismo orden**.

## Las seis baldosas

Grid 3 × 2. Cada una tiene color, dibujo propio (`iconos.js`), sonido sintetizado (`sonidos.js`) y nota:

| id | nombre | color | efecto | sonido | nota |
|----|--------|-------|--------|--------|------|
| `pie` | ¡PIE! | azul `#228be6` | ¡BUM! | tambor grave | 196.00 |
| `mano` | ¡MANO! | rojo `#e03131` | ¡TING! | campana | 659.25 |
| `carita` | ¡CARITA! | amarillo `#fab005` | ¡PLIM! | agudo divertido | 1046.50 |
| `rodilla` | ¡RODILLA! | verde `#2f9e44` | ¡TOC! | bloque de madera | 392.00 |
| `hombro` | ¡HOMBRO! | morado `#7048e8` | ¡CHIS! | maraca | 523.25 |
| `barriga` | ¡BARRIGA! | naranja `#f76707` | ¡POP! | burbuja | 293.66 |

Las tres primeras son las del enunciado original; las otras tres se añadieron a pedido del usuario
(2026-11-13) para ampliar las combinaciones de 9 a 36.

## Rondas

Dos rondas de cuatro ítems — **8 actividades**. A diferencia del enunciado original (que pedía siempre dos
baldosas), el usuario pidió que la secuencia creciera por ronda:

| ronda | baldosas | msBaldosa | pausaMs | apoyo | nombra |
|-------|----------|-----------|---------|-------|--------|
| 1 Aprendiendo el ritmo | 2 | 1150 | 850 | alto | sí |
| 2 Maestro del ritmo | 3 | 950 | 600 | medio | sí |

La ronda de cuatro baldosas existió al principio y el usuario pidió quitarla (2026-11-13): el juego se queda
en las rondas de 2 y 3 toques.

La dificultad sube además por velocidad, pausas y apoyo visual (`alto` deja el dibujo en la ranura, `medio`
solo mientras suena, `bajo` solo enciende el número).

## Generador de secuencias (`reglas.js`)

- Cada ítem tiene exactamente las baldosas de su ronda, en orden.
- Nunca dos secuencias seguidas idénticas; el primer ítem nunca repite la demo (`pie → mano`).
- Con 3 baldosas: no se repite la misma dos veces seguidas y usa al menos 3 distintas.
- Las seis baldosas participan en las ocho actividades y ninguna acapara (reparto por `menosUsada`).
- Las secuencias se generan al crear la partida y **no cambian durante los reintentos**.

## Flujo

Inicio → intro 3D compartida → `PedniaEdad` → **introducción** (Zoe explica y presenta las seis baldosas una
a una con su sonido) → botón *¡Encender la pista!* → **demo automática** (`pie → mano`, la mano de
`PedniaTutorial` toca las baldosas; sin interacción del niño) → *¡AHORA ES TU TURNO!* → **2 rondas** →
**victoria** *¡ERES EL MAESTRO DEL RITMO!*.

Cada ítem: ESCUCHAR Y OBSERVAR → REPETIR EL RITMO → COMPROBAR (orden estricto).
El error no resta ni quita progreso: la baldosa vibra, suena algo suave y la pista vuelve a tocar la **misma**
secuencia. Tras dos errores en el mismo ítem se fuerza el apoyo alto.

## Disposición de la pantalla

Reorganizada el 2026-11-13 a pedido del usuario, porque la marquesina lateral se montaba sobre el título:

- **Barra superior**: solo las píldoras `RONDA n DE 2` e `ÍTEM n DE 4`. Los grupos de puntos y la barra
  `0/12` siguen en el HTML con `hidden` (script.js los actualiza, pero no se ven).
- **Centro** (`.centro`): columna con la **marquesina horizontal** (fase + ranuras en fila) justo **encima**
  de la pista de baldosas. Ya no hay panel lateral derecho.
- **Nubes**: solo la de Zoe, abajo a la izquierda junto a ella, para no tapar marquesina ni baldosas. Todo lo que se dice durante la partida (demo, microtutorial, aciertos, errores y final) lo dice Zoe; Zeus solo habla en la intro 3D y aparece en la pantalla de victoria.

## Archivos

| archivo | qué hace |
|---------|----------|
| `reglas.js` | lógica pura: secuencias, máquina de estados, comparación (también `module.exports` para node) |
| `iconos.js` | dibujos SVG de las seis baldosas (viewBox 200 × 200) |
| `sonidos.js` | Web Audio: los seis sonidos + selección, nota, error, fanfarria, cuenta atrás, fiesta |
| `escenario-phaser.js` | Phaser 4: onda de baldosa, estrellitas, golpe de suelo, chispitas, notas, serpentinas, confeti |
| `demo.js` | demostración automática (siempre `pie → mano`) |
| `script.js` | control del juego, UI, progreso, feedback, victoria |
| `zoe-3d.js` | Zoe junto a la pista (modelo `intro3d/models/nina.glb`) |
| `config.json` | baldosas, rondas, tiempos, textos |

Estados: `INTRO · DEMO · SHOWING_SEQUENCE · WAITING_INPUT · CHECKING_ANSWER · CORRECT_FEEDBACK ·
INCORRECT_FEEDBACK · ROUND_TRANSITION · VICTORY`. Solo `WAITING_INPUT` acepta toques, y como mucho tantos
como baldosas tenga la secuencia. Cada partida lleva `partidaId` para que nada de una partida vieja toque la
nueva tras un reinicio.

## Pruebas

```bash
node scripts/probar-pista-ritmo-pasos-magicos.js
```

24 pruebas: config, reparto de las seis baldosas sobre 200-300 semillas, orden estricto, reintentos sin
perder progreso, sin avances dobles, partida completa, dibujos y registro en `ambientes.sql`.

Probado también en el navegador (escritorio 800 × 600, tableta 768 × 1024 y 1024 × 768): demo automática,
error con orden invertido, partida completa 12/12, victoria y reinicio con secuencias nuevas. Los únicos 404
en consola son del endpoint TTS `/juegos/tts` de Laravel, que no existe sirviendo `public/` como estático.

## Registro

Una fila en `database/ambientes.sql`, junto a los demás juegos de memoria corporal
(`ambiente_id 7, eje_id 11, tematica_id 31, modulo_id 9`), con imagen `pista-ritmo.png`, color `#7048e8` y
orden 19.

**Importante:** editar `ambientes.sql` NO actualiza la base de datos que usa la aplicación — ese archivo es
solo el volcado. Hay que insertar también la fila en la tabla `juegos` de la BD, o el juego no aparece en el
catálogo. La edad (3-4 años) no sale de la BD: `JuegoCatalogoService::edadesDesdeConfigPaquete()` la lee de
`config.json` → `niveles[].edad`.
