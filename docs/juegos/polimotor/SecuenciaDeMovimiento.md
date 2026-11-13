# Secuencia de movimiento (`public/catalogo_juegos/Polimotor/SecuenciaDeMovimiento/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- **Tren de tarjetas**: una locomotora de vapor y un vagón por pose; el último vagón trae el "?".
- Funciones en `script.js`: `montarTren`, `llegarTren`, `cargarTren`, `mostrarPregunta`, `repasarTren`, `partirTren`
  y `presentarSecuencia`. Reemplazaron a `reproducirSecuencia` y `renderRielEstatico`.
- Ritmo: cada paso tiene `bote`, rebote del vagón y un número grande `.tren-conteo`.
- Al acertar: repaso rápido, aplausos y el tren sale acelerando hacia la izquierda. Al fallar, el tren se queda y repasa.
- El hueco conserva la clase `.slot-pose.hueco` porque `moverTarjetaAlHueco` lo mide para el vuelo de la tarjeta.
