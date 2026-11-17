# Multisensorial / ¿Qué sonido escuchas? (rediseño con motor propio)

Fecha: 2026-11-17. Antes: los 10 eran el mismo cuestionario (oreja + 3 tarjetas + «¡Muy bien!»). Ahora cada uno tiene un verbo físico que
no se repite en ninguna otra temática (Asocia, Encuentra el sonido, Memoria auditiva, Repite la secuencia). Base: `MemoriaKit` (tipos
`elegir` y `desaparecio`), 4 niveles, fondo vivo, presentador 3D, escena final e insignia.

| Juego | Edad | Mecánica | Archivo |
|---|---|---|---|
| SonidosDeAnimales | 3-4 | Cortar la cuerda de la caja deslizando el dedo | `cuerda.js` |
| OtrosSonidosDeAnimales | 3-4 | Excavar: rascar la tierra hasta destapar al animal | `excavar.js` |
| SonidosDeObjetos | 3-4 | Tirachinas: estirar la liga y soltar (guía de puntos) | `tirachinas.js` |
| QueSonidoEscuchas | 3-4 | Canicas: girar palancas de bifurcaciones y soltar la canica | `canicas.js` |
| OtrosSonidosDeLaNaturaleza | 3-4 | Cometa pilotada con el dedo hasta la nube (elige al quedarse) | `cometa.js` |
| SonidosSimilares | 5-6 | Atrapar al vuelo con una canasta que se desliza | `atrapar.js` |
| QueSonidoEs | 5-6 | Piñatas: golpes repetidos hasta romperla | `pinatas.js` |
| QueSonidoFalta | 5-6 | Caja de música: girar la manivela (gesto circular) hasta dejar el sonido bajo la flecha | `manivela.js` |
| EscuchaYRecuerda | 5-6 | Vasos que se mezclan: seguir y tocar el correcto | `vasos.js` |
| LaMisionFinal | 5-6 | Corredor de carriles: cruzar la puerta del sonido | `carriles.js` |

## Cambios comunes
- `config.json`: `elementos` (copia de `sonidos`), `tipo` (`elegir`/`desaparecio`), `reproducciones`, `demo`, `textos.demostracion`; `dificultad` solo en naturaleza (3 opciones) y misión final.
- `script.js`: `iniciarMotor`/`ctxMotor` con `elemento: sonido` (en estos juegos las imágenes viven en `config.sonidos`). `sfx.js` y `logica.js` son los originales (`QueSonidoSfx`).
- Kit: `planNiveles` ya no excluye el ejemplo de la demo cuando el pool queda en menos de 5, y `r.dificultad` vale para cualquier tipo.
- Cada mundo expone en `estado().extra` lo que un bot necesita (posiciones, carriles, palancas…).

## Cómo probar (solo horizontal)
`PedniaTutorial.mostrarIntroActiva = () => false` antes de `confirmarNivel('3'|'5')`; con el panel oculto empujar el bucle:
`setInterval(() => game.loop.step(performance.now()), 16)`. Final solo: sustituir `PedniaJuego.jugar` por una función que fije `escena().reunidos`.
