# Reconocimiento del cuerpo (`public/catalogo_juegos/Polimotor/ReconocimientoDelCuerpo/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- La figura es **una sola imagen PNG** (`#img-completo`) con zonas rectangulares (`.zona-toque`, en % del lienzo).
  No hay partes sueltas que animar: los efectos van sobre la zona y la figura entera rebota. Así no hay cortes.
- **"Consultorio vivo"** en `consultorio.js/.css` (`window.Consultorio`), con dos capas:
  `#con-fondo` (SVG + tapete) y `#con-capa` (escáner, diploma y confeti).
  - **Fondo SVG**: vitrina con frascos que burbujean, monitor de latidos (línea de electro que corre y "♥ 80"),
    negatoscopio y escritorio con lámpara.
  - `listo()`: limpia las curitas y ubica el tapete bajo los pies.
  - `reacomodar()`: se llama en `img.onload` y en el `ResizeObserver` del lienzo.
  - `acierto(id, objetivos, nombre)`:
    - El monitor pasa a ♥ 120 y late rápido.
    - El negatoscopio muestra el hueso de esa parte (`RAYOS`: cráneo, mano, pie, brazo, pierna, hombro, rodilla,
      codo, tobillo o barriga; la radiografía de pecho es la de reposo).
    - Las placas son dibujos anatómicos simplificados hechos con helpers en `consultorio.js`:
      `hueso(x1,y1,x2,y2,ancho,cabeza)` (diáfisis más delgada al centro, epífisis y médula),
      `blando()` (silueta difusa de tejido), `vertebra()`, `costilla()`, `falanges()` y `espejo()`.
      Coordenadas locales de la placa: unos 200 × 240. Estilo en `consultorio.css` (`.rx-*`) con
      degradado `#con-hueso`, brillo `#con-rx` y desenfoque `#con-blur` definidos en el `<defs>` del fondo.
    - Para revisarlas: copiar el `innerHTML` de `.con-rayos` tras cada `Consultorio.acierto(id, [], '')`
      a una cuadrícula de SVG ampliados (hoja de contactos).
    - Un escáner de luz pasa por todas las zonas correctas.
    - Queda una **curita** pegada en la zona tocada, dentro de `#lienzo` y en %, así sigue a la figura al redimensionar.
    - La figura da un saltito.
  - `error()`: el monitor muestra "BIP" en rojo y la figura tiembla.
  - `final(opts)`: **diploma "Doctor del cuerpo"** con una curita y el nombre de cada parte reconocida
    (`nombreDePregunta`: "Toca las manos." → "Manos"), la figura festeja y cae confeti. Después,
    `mostrarVictoria()`. Textos en `config.json → textos.diploma` y `textos.diplomaSub`.
- Error corregido en `reconocimiento-anim.js → destelloFigura`: mataba **todas** las animaciones de la imagen,
  incluido el fundido de entrada, y la figura podía quedar en opacidad 0 si se tocaba antes de 0,6 s.
  Ahora solo detiene el `filter`.
- Para probar: el centro de algunas zonas (por ejemplo, las manos) cae en un píxel transparente y el juego ignora
  el toque (`pixelFiguraOpaco`). En las pruebas automáticas hay que buscar un punto pintado dentro de la zona.
