# Ensamblajes sencillos (`public/catalogo_juegos/Polimotor/EnsamblajesSencillos/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- **Laboratorio de robots** en `laboratorio.js/.css` (`window.Laboratorio`), con dos capas:
  `#lab-fondo` (SVG de fondo) y `#lab-capa` (efectos sobre el juego).
  - **Fondo SVG**: pantalla con código que corre y mensaje "¡BIEN!"/"¡UPS!", tablero de luces, engranajes,
    franja de luces en el piso y techo con compuerta (debajo hay un cielo con estrellas).
  - `progreso(n, total)`: **batería** horizontal sobre la cabeza del robot, una celda por pieza.
  - `arrastre(activo, id, resaltar)`: la sala se atenúa y aparece el **escáner láser**. Cubre el robot entero salvo
    que esté activa la opción "Resaltar destino", que viene apagada por defecto; así no delata la respuesta.
  - `acierto(id)`: destello verde y el **brazo robótico** baja y suelda la pieza con chispas.
  - `error()`: destello rojo.
  - `final(opts)`, en orden:
    1. Palanca "¡Enciende tu robot!", que se toca o se baja sola a los 6 s.
    2. Carga de la batería.
    3. El robot pasa de gris a encendido.
    4. Saludo con burbuja.
    5. Se abre el techo y se prenden las llamas bajo los pies; temblor, humo y despegue.
    6. Fuegos artificiales.
  - Después, `script.js` hace sonar `victoria` y llama a `mostrarVictoria`.
- Textos en `config.json → textos.palanca` y `textos.saludoRobot`.
- **Medir el robot real**: las piezas (`#figura-svg .svg-parte`) se salen de `#lienzo` y la caja de cada
  `<svg>` interno es enorme. `rectRobot()` y `rectDe(el)` unen solo las formas pintadas (`path`, `circle`, `rect`…).
  Se usan para la batería, el escáner, la burbuja y las llamas.
- **Saludo**: `saludarConBrazo()` gira `brazo_N` y `mano_N` **juntos** alrededor del mismo hombro.
  - Cada `.svg-parte` tiene su `translate(x%, y%)` en línea, así que el pivote se convierte a las coordenadas de
    cada parte (`hombro - translate`).
  - El giro se hace con `transform-box: view-box` y un keyframe
    `translate(var(--tx), var(--ty)) rotate(calc(var(--giro) * …))`.
  - El nivel de 3 años trae "brazos" en una sola pieza: ahí el robot solo rebota.
