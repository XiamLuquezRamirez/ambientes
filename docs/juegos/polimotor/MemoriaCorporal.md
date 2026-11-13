# Memoria corporal (`public/catalogo_juegos/Polimotor/MemoriaCorporal/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- **Teatro + cartas**: `#teatro` (cenefa, foco, piso, dos `.telon`) envuelve `#secuencia`.
  `htmlCarta(id, {mini, abajo})` crea cartas con frente y dorso; `.boca-abajo` las voltea.
- Funciones: `moverTelon/abrirTelon/cerrarTelon`, `volar`, `presentarMemoria` (cada pose en grande bajo el foco
  vuela a su carta), `esconderCartas` (voltear y bajar el telón), `revelarPista(ids, hueco)` y
  `revelarSecuenciaAcierto(btn)`, donde la opción vuela al hueco y la fila salta en ola.
- **Fondo vivo** `fondo-vivo.js/.css` (`window.FondoVivo`). Es una sala de teatro en azul noche y dorado:
  guirnalda de bombillas, dos reflectores, palcos, público en siluetas y destellos.
  - `fase('memoria')`: la sala se oscurece y los reflectores enfocan el escenario.
  - `fase('opciones')`: vuelven las luces.
  - `apuntar(el)`: los reflectores siguen a la opción señalada (`pointerover`/`focusin`) y la opción recibe `.fv-iluminada`.
  - `acierto(el)`: haces dorados, público saltando y confeti SVG.
  - `error(el)`: haces y halo rojos, y el público hace "oh".
  - `celebrar()`: al terminar el juego.
  - Para apuntar se usa `svg.getScreenCTM().inverse()`, que pasa de pantalla a coordenadas SVG.

## Pendiente

- A 600 px de alto, 4 opciones en dos filas no caben (pasaba también antes de los cambios).
