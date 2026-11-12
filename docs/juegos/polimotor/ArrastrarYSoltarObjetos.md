# Arrastrar y soltar objetos (`public/catalogo_juegos/Polimotor/ArrastrarYSoltarObjetos/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- **La fábrica en Phaser** (`phaser-juego.js`). Se mantuvo el contrato con `script.js`:
  `montar`, `cargarRonda(objetos, destinos, {segundosCinta})`, `setInteractivo`, `cancelarDrag`, `demoLlevar`,
  `rectPantalla`, `cerrarPedido(final)` y `destruir`.
- La escena tiene una máquina que fabrica los objetos, una cinta transportadora (tileSprite + rodillos),
  la tolva de reciclaje, engranajes y el piso con franja de seguridad.
- Los objetos avanzan con `s` (distancia recorrida): `s < 0` significa que están dentro de la máquina;
  al pasar el final de la cinta caen a la tolva y vuelven a salir.
- La cinta se detiene mientras el niño arrastra y mientras se resuelve un drop.
- `config.json → niveles[].segundosCinta`: 3 años = 11, 4 años = 9, 5-6 años = 7.
- La cinta queda bajo la nube del enunciado: `bordeEnunciado()` mide `.enunciado-wrap`, y un `ResizeObserver`
  reacomoda la escena si el texto cambia de alto.
- **Cierre**: `cerrarPedido(false)` cierra las cajas (solapas y cinta adhesiva) y las saca por abajo entre rondas.
  `cerrarPedido(true)` hace llegar un camión, las cajas saltan a la carga y el camión se va antes de la victoria.
- Objetos: 38 SVG en `img/objetos/`, con contorno `#1e3a5f` y `viewBox` 0 0 200 200.
  El generador está en el scratchpad de la sesión (`svgs_fabrica.py`); los SVG ya están en el repo.
- Se quitó la regla de `style.css` `@media (max-width:900px) .escena-wrap { padding-top:22vh }`:
  empujaba el lienzo y dejaba una franja vacía arriba.

## Pendiente

- En pantallas altas queda piso vacío bajo las cajas; se ofreció agrandarlas o bajarlas.
