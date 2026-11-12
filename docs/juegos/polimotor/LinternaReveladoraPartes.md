# La Linterna Reveladora de Partes (`public/catalogo_juegos/Polimotor/LinternaReveladoraPartes/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Prejardín 3-4 años, temática 29 "Reconocimiento de partes del cuerpo".
Campamento nocturno de PedNia: el niño mueve una linterna y, cuando la parte ya está dentro del haz, la toca.
Tres rondas de tres partes, en este orden: barriga, manos, pies; rodillas, hombros, orejas; ojos, boca, cabello.
No entra la nariz: queda entre los ojos y la boca. El orden no se baraja (la demo enseña la barriga);
lo que cambia en cada partida es la esquina donde aparece la linterna. El campamento ocupa toda la pantalla.
Zeus queda en la esquina y es el único que habla, en tercera persona. Zoe es el modelo 3D
(`intro3d/models/nina.glb`), centrada, con los pies sobre el pasto.
La oscuridad no es negra: alfa 0.58 (0.36 en alto contraste) para que el campamento se siga leyendo.
El haz se capa en 74 px; el aro dorado es un anillo fino, no un disco.

| Archivo | Global | Qué hace |
|---|---|---|
| `retos.js` | `Retos` | Reglas puras: `evaluar` (acierto, oscura, error, cuerpo), `centroCubierto`, `tocar`, `armarPartida`. |
| `personaje.js` | `Personaje` | Zoe en SVG. Solo se usa si el modelo 3D no carga. |
| `campamento.js` | `Campamento` | Fondo en espejo: pinos y dos tiendas del mismo tamaño, suelo a la altura de los pies de Zoe, letrero a su derecha. `pulsoLuz`, `celebrar` y `ronda` no agregan objetos. |
| `zoe-3d.js` | `Zoe3D` | Carga `nina.glb`, la encuadra de cuerpo entero y copia el WebGL a un canvas 2D. Las zonas salen de ese cuerpo opaco, no de los huesos. |
| `linterna-phaser.js` | `LinternaPhaser` | Zoe, linterna, máscara y el toque. |
| `animaciones.js` | `ZoeAnim` | Reposo y las reacciones. En 3D usa clips del modelo (reír, saltar, aplaudir, celebrar). |
| `demo.js` | `LinternaDemo` | La mano desliza la linterna hasta la barriga y después la toca. No suma aciertos. |
| `guia-3d.js` | `Guia3D` | Copia del Zeus 3D del Toque Mágico (`nino.glb`). |
| `script.js` | — | Intro, demo, tres rondas, puente entre rondas, pistas, cartel y victoria compartida. |

- **Luz**: Phaser 4 no trae `BitmapMask`. La oscuridad es un canvas a mitad de resolución: relleno azul y un círculo
  `destination-out`. Se sube con `texture.source[0].update()` solo cuando el haz se mueve. El borde dorado es un sprite
  ADD fijo. Las chispas salen de un pool de 22, no se crean al mover.
- **Dos gestos**: al apoyar el dedo se guarda si la zona ya estaba iluminada. Un toque corto (≤ 32 px) confirma ese
  estado. Un arrastre solo mueve la luz. Tocar la parte correcta todavía a oscuras no cuenta: la luz va hacia el dedo
  y Zeus pide tocarla otra vez.
- **Cuerpo de la linterna**: cuelga 70 px bajo el centro del haz para no tapar la barriga ni la oreja. `agarre()` da
  el punto de la mano de la demo. Al ganar, la linterna baja a la esquina y el campamento queda a color.
- **Zoe 3D**: Phaser no puede hacer `addCanvas` de un canvas WebGL (`getImageData` es null). Se dibuja el WebGL
  (`preserveDrawingBuffer`) en un canvas 2D y ese es el que se publica. Las zonas se recalculan sobre el cuerpo
  opaco: los pivotes del esqueleto no caen en la malla (los ojos quedaban en el vestido y los pies fuera de la pantalla).
- **Quién habla**: Zeus dice la bienvenida, cada parte, la ayuda, el acierto y el cierre. Las frases son sobre Zoe,
  no en primera persona. No hay muestra de tambor: la barriga usa el evento `bote`.
- **Ayuda** a los 7 s: estrellas hacia la zona, huellas y un pulso. Si la parte ya está iluminada, la frase es la de
  confirmar el toque. También tras 2 toques equivocados. Error = `tic` y "¡Sigue buscando! ¡Tú puedes!".
- Sonidos: se rotan `bote`, `acierto` y `aparece`. Cierre de ronda `correcto`, victoria `victoria`.
- Probar: `node scripts/probar-linterna-reveladora.js`. En el navegador, `mousedown` / `mousemove` / `mouseup` en el
  canvas. `LinternaPhaser.puntoDe("barriga")` devuelve coordenadas de pantalla.
- Registro: fila en `database/ambientes.sql` (ambiente 7, eje 11, temática 29, módulo 9, orden 13, imagen `linterna.png`).
