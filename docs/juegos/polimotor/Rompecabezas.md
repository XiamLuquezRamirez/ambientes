# Rompecabezas del cuerpo (`public/catalogo_juegos/Polimotor/Rompecabezas/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- Usa la bandeja **HTML** (modo SVG), no `phaser-juego.js`. Tiene la misma base que Ensamblajes:
  `#figura-svg .svg-parte` con capa gris y capa de color, y `translate(%)` en línea.
- Cada pieza tiene **tarjeta** (borde punteado, relleno de 10 px y fondo blanco) y **se conserva**.
- `margenTarjeta(el)` en `script.js` suma relleno + borde (leídos del estilo calculado), y `aplicarTamanoHueco`
  agranda la tarjeta en esa cantidad. Así el **dibujo** mide exactamente lo mismo que su hueco en la silueta.
- **"El cuerpo cobra vida"** en `habitacion.js/.css` (`window.Habitacion`), con dos capas:
  `#hab-fondo` (SVG del cuarto + tapete) y `#hab-capa` (bola de espejos, galería final y confeti).
  - **Fondo SVG**: lámparas que se balancean (sus haces iluminan la figura), repisa con cubos y una pelota,
    un solo cuadro **decorativo** (flor) a la izquierda y un piso. `preserveAspectRatio="xMidYMax slice"`.
    Nada de cuadros a la derecha ni con partes del cuerpo: el usuario dijo que se confundían con las fichas.
  - Nombres de las partes: `nombreBonito(id, nombre)` quita guiones bajos, pone der/izq en palabras y mayúscula
    inicial. `nombrePieza` en `script.js` ya incluye `pie_izq` y `pie_der`.
  - **Tapete con luces** (div en la capa de fondo): `ubicarTapete()` lo centra bajo los pies medidos de la figura.
  - `listo()`: al armar el tablero.
  - `arrastre(on)`: atenúa el cuarto y hace brillar la silueta. Las pistas del hueco siguen siendo las del juego
    ("Resaltar destino").
  - `acierto(id, nombre, hablar)`: destello y tapete verdes, Zoe dice el nombre y la parte hace un gesto **en su
    lugar**:
    - Cabeza: asiente.
    - Brazos y manos: un latido (escala).
    - Piernas y pies: un pasito.
    - Tronco: respira.
  - `error()`: destello y tapete rojos.
  - `final(opts)`, en orden:
    1. Las luces se vuelven de colores y baja la bola de espejos.
    2. La bandeja desaparece y en su lugar entra una **galería** con todas las partes y sus nombres.
    3. La figura baila **entera** (`#lienzo.hab-baila`: rebote y balanceo) mientras Zoe repasa las partes.
    4. Confeti y despedida (`textos.despedida`).
  - Después, `script.js` llama a `mostrarVictoria()`.
- Gestos: `animarPartes(partes, pivote, clase, vars, ms)` pasa el pivote (en pantalla) a las coordenadas de cada
  parte y anima con `translate(var(--tx), var(--ty)) …`. Los saltos (`--salto`) se convierten de px de pantalla a
  unidades del SVG.
- **No levantar ni girar brazos o manos** (ni al colocarlos ni en el final). Al girar una parte se ve el corte con
  su vecina, y en el nivel de 10 piezas la mano se queda en su sitio si todavía no está puesta. El usuario lo
  rechazó: los gestos van en el lugar de cada parte y el baile mueve la figura completa.
- `#lienzo` tenía `overflow: hidden` y recortaba los brazos levantados; con `body.modo-svg` queda `overflow: visible`.
- El baile se aplica a `#lienzo`, no a `#figura-svg`: el SVG trae `transform: scale(escala)` en línea y la
  animación lo pisaría.
- Para probar un nivel sin pelear con el selector de edad: `index.html?edad=6` (10 piezas), `?edad=4` (7) o `?edad=3` (5).

## Pendiente

- Hecho "El cuerpo cobra vida". Se probó con la niña en 5 y 10 piezas; falta probar el niño y el nivel de 7 piezas.
