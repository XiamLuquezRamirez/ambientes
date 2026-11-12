# Lateralidad (`public/catalogo_juegos/Polimotor/Lateralidad/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- **Un escenario por reto**, en `img/escenas/`:
  - `general.svg` (intro y elegir edad)
  - `castillo.svg` (sendero)
  - `huerto.svg` (atrapa)
  - `parque.svg` (parejas)
  - `cuarto.svg` (estante)
- Capa `#escena-fondo` con una `.escena-capa[data-escena]` por escenario y fundido por `opacity`.
  `ponerEscena(tipo)` en `script.js` se llama en `iniciarRetoActual` y en `confirmarNivel` (con el escenario `general`).
- **Sendero = castillo con 3 torres**: cada `.sendero-ramal` dibuja su torre con `::before` (piedra) y su tejado con
  bandera del color del lado con `::after`. Las medidas se definen en las variables de `.sendero-ramales`:
  `--torre-sobre`, `--torre-techo` y `--torre-lado`. Los caminos son de tierra, de un solo color y más delgados
  (ancho 26–42 px en `sendero.js`).
- El césped empieza en la base de las torres: `medirSuelo()` en `sendero.js` escribe `--suelo-sendero` en `:root`,
  y la capa del castillo dibuja el pasto con un `linear-gradient` desde ese punto. Se vuelve a medir a los 700 ms
  porque la animación de entrada mueve la escena.
- Colores de lado: izquierda `#ffd43b`, centro `#4dabf7`, derecha `#51cf66` (`coloresZona` en `config.json`).
  Coinciden con los botones PNG y **no se cambian**.
