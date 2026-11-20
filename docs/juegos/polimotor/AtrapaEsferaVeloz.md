# ¡Atrapa la Esfera Veloz! (`Polimotor/AtrapaEsferaVeloz/`)

Polimotor · **5-6 años** · eje 17, temática 34 «Coordinación visual» · slug `atrapa-esfera-veloz` · orden 33 ·
color `#20c997` · icono `atrapa-esfera.png`. Creado el 2026-11-19 (juego 2 de coordinación visual 5-6).

## Qué se ve

Escena **three.js** propia (nada de Phaser en la partida), hecha desde cero, sin modelos ni imágenes:

- **Túnel de una central de energía**: cilindro de placas metálicas visto desde dentro, costillas con aros de luz
  (se encienden en ola al capturar, al terminar una ronda y en el final), pasarela de rejilla con bordes de luz,
  4 conductos con energía que fluye, 4 pantallas holográficas «PEDNIA» (canvas redibujado), 3 luces colgantes,
  motas de energía flotando, niebla y **reactor** al fondo (núcleo, halo y 3 aros que giran).
- **2 tuberías de acero, una por lado** (`config.tubos`, pedido 2026-11-19 según la referencia): corren pegadas a la
  pared desde el fondo, codo de 90° y tramo recto hacia el anillo. Acero cepillado (textura de vetas + mapa de
  rugosidad, `metalness` 0,95) que refleja un entorno con tiras de luz blanca; bridas con pernos (InstancedMesh),
  abrazaderas, manómetro con aguja que sube con la energía (en z −5,6, más al fondo que el marco del espejo:
  antes chocaba con él; `EscenarioEsfera.choquesDecorado()` debe dar `[]`), brida grande en la boca con labio, interior oscuro y luz
  de energía; anillos de vidrio con luz que se encienden hacia la boca al lanzar.
- **2 espejos laterales** (`config.espejos`; la costilla del túnel que los cruzaba —z = 1— se omite con
  `costillaChocaEspejo`, `EscenarioEsfera.costillasZ()` lo muestra): marco de acero con tornillos, superficie metálica pulida, brillo
  diagonal que se desliza, tiras de luz; al rebotar destellan con el color de la esfera, onda sobre el vidrio,
  chispas y un «ting» de cristal.
- **Anillo de captura** en el centro: marco metálico, 8 abrazaderas con led, aro de energía, trazos que giran, disco
  translúcido de zona, halo, 54 partículas en órbita, soportes al techo y a la pasarela y luz propia.
  Estados: espera (turquesa, pulso lento) → preparación (más brillo y color hacia lima, pulso que se acelera) →
  captura (verde brillante, «respira» grande, disco iluminado y sonido de aviso) → error (pulso azul corto).
- **Esferas**: núcleo, energía interna (icosaedro de alambre), cáscara física translúcida, banda que gira, halo,
  luz propia y estela de partículas. Colores azul, turquesa, violeta, amarillo y rosa.
- Entorno para reflejos generado con `PMREMGenerator.fromScene` (sin archivos HDR).

## Mecánica

- Se toca **en cualquier parte** de la escena (o espacio / Enter). La dificultad está en el momento, no en apuntar.
- Trayectoria (`ReglasEsfera.trayectoria`): tramos de Bézier cúbicos. Sale de la boca, **rebota en los espejos**
  de `esfera.rebotes` (en orden; ley de reflexión: se invierte la componente X de la dirección) y cruza el centro del
  anillo en línea recta desde el último espejo; luego sigue recta hasta salir de la pantalla. Sin rebotes, va de la
  tubería al anillo con una curva suave.
- Para cambiar de lado del túnel antes del tramo final pasa **por encima del aro** (punto de paso `juego.arco`
  [4,3, −1]): la esfera solo se ve dentro del anillo cuando de verdad se puede atrapar.
- Antes del último rebote va `velocidadAntes` (×2) más rápido; el último espejo la frena a la velocidad de la ronda,
  constante en el tramo final (el que define la ventana).
- El cruce ocurre en `z = zCruce` (2,0, un poco delante del marco): **ninguna esfera pasa detrás del marco**. La prueba
  proyecta con la cámara y comprueba esto, que no se sale del cuadro y que no choca con las tuberías.
- Ventana: `radioCaptura / velocidad + tolerancia (+ ayuda)` alrededor del cruce = la esfera dentro del anillo.
  R1 ±0,77 s, R2 ±0,60 s, R3 ±0,50 s.
- Temprano: pulso azul, «¡Espera a que llegue…!», la esfera sigue; pausa de 0,45 s antes de aceptar otro temprano.
  Tarde: pulso azul, «¡Casi!…», un aviso por esfera. Si pasa sin capturar sale **otra** esfera (la ronda pide 4
  capturas); tras cada esfera perdida la siguiente va 12 % más lenta y con +0,08 s de ventana (tope 3).
  Si pasó sin ningún toque, el anillo brilla más (ayuda automática) y Zoe da una pista.

## Rondas (config.json)

| Ronda | Aro | Velocidad | Radio esfera | Tolerancia | Ventana | Tuberías / trayectorias |
|---|---|---|---|---|---|---|
| 1 Aprende a capturar | 2,05 | 2,3 | 0,56 | 0,14 | ±0,77 s | 2 directas + 2 con 1 rebote, pausas 1,6-1,8 s |
| 2 Reflejos en acción | 1,80 | 3,0 | 0,50 | 0,13 | ±0,55 s | 4 con 1 rebote, distintos puntos del espejo, pausas 1,0-1,5 s |
| 3 Maestro de la energía | 1,60 | 3,7 | 0,46 | 0,15 | ±0,46 s | 2 con 2 rebotes + 2 con 1, alturas alternadas ±0,45, pausas 0,9-1,3 s |

El **aro se achica en cada ronda** (`rondas[].radioAnillo`; la zona de captura se achica en la misma proporción).
Al empezar la ronda se cierra con una animación de 1,2 s, onda dorada, chispas y sonido (`EscenarioEsfera.tamanoAnillo`);
los soportes del techo y la pasarela se estiran para seguir tocándolo. «Jugar nuevamente» lo devuelve a 2,05.

## Flujo

**Guía al azar** (2026-11-19): en cada carga sale Zoe o Zeus en 3D (`window.GUIA_PERSONAJE`, que `guia-3d.js` lee para
cargar `nina.glb` o `nino.glb`). La guía dice la instrucción de la presentación y la primera frase del final; el otro
personaje habla sin verse (la demo y la segunda frase del final).

inicio común → intro 3D → edad → presentación (cartel con el título **solo aquí**; las tuberías se encienden una a
una, el anillo brilla, una esfera cruza despacio y se captura sola) → Zoe 3D entra y dice la instrucción → demo
automática (voz de Zeus; la mano espera bajo el anillo y toca cuando la esfera está en el centro; «¡Así se
atrapa!») → Zoe sale → «¡Comenzar a jugar!» → 3 rondas (voz de inicio de cada ronda; cartel «¡RONDA n LISTA!» con ola
de luces y estrellas) → la última captura lleva directo a la **cinemática «Viaje al reactor»** (≈10 s, franjas de cine, botones ocultos):
destello verde → la cámara cruza el aro y viaja por el túnel (costillas que se encienden a su paso, motas aceleradas)
→ el reactor despierta (sus 3 aros se alinean como una diana y lanza una columna de energía) → una onda de colores
recorre el túnel de vuelta → la cámara regresa en curva hasta el aro → fiesta (confeti, estrellas, aros, música) → panel «¡REFLEJOS DE SÚPER
HÉROE!» con estrellas, esferas atrapadas, mejor racha y rondas; «Jugar nuevamente» / «Volver al menú». Zoe vuelve y
celebra. En pantallas 4:3 el panel va a la derecha para no tapar a Zoe.

## Pedidos del usuario (2026-11-19)

- Three.js real (no 2D disfrazado), escenario y efectos creados desde cero; no tomar la estética de otros juegos de
  Polimotor (solo la organización de los botones). Sin rama ni archivo SQL nuevo.
- Botones comunes (reiniciar, volver, accesibilidad, volumen) como siempre ([[botones-iconos-comunes]]).
- Probar solo escritorio y tableta horizontal.
- Tercera pasada: dos tuberías (una por lado), esferas que rebotan en espejos laterales, tuberías que parezcan de
  metal. El título de la presentación se oculta antes de lanzar la esfera y los mensajes van abajo al centro (arriba
  pasa el arco de la esfera).
- Segunda pasada: el aro más pequeño en cada ronda; la guía 3D al azar (Zoe o Zeus); final con cinemática (eligió
  «Viaje al reactor» entre 4 propuestas: viaje al reactor, las 12 esferas regresan, hipervelocidad, mezcla).

## Tableta y rendimiento (2026-11-19)

El usuario vio el juego **grande y cortado** en la tableta y **lento**:

- Causa del tamaño: `renderer.setSize(w, h, false)` no fija el tamaño CSS; con densidad 2× el lienzo medía 2048×1536 CSS
  en una pantalla de 1024×768. Ahora `setSize(w, h, true)` y `.escenario canvas { width/height: 100% !important }`.
- Calidad adaptable (`NIVELES` en `escena-tunel.js`): nivel 0 computador (resolución ≤ 1,5×, sombras); nivel 1
  tableta (1×, sin sombras, 70 % de partículas); nivel 2 si dos ventanas de 2 s seguidas bajan de 45 fps (0,75×,
  40 % de partículas). 4 s de calentamiento antes de medir; nunca vuelve a subir. `EscenarioEsfera.calidad()`.
- Paso de tiempo con tope 0,1 s (antes 0,05): con pocos fps la esfera va a su velocidad real, no en cámara lenta.
- La guía 3D (Zoe/Zeus) ya no se anima ni se dibuja cuando no está en escena (durante la partida era un segundo
  renderizador a tiempo completo); su resolución en táctil es ≤ 1,5×.
- Costillas, aros de luz (color por instancia), abrazaderas de conductos y piezas del anillo son `InstancedMesh`
  (248 → 176 llamadas de dibujo), con **materiales propios**: compartir un material entre malla normal e instanciada
  hacía que three.js recalculara el programa en cada dibujo (~11 % de CPU). `EscenarioEsfera.materialesMixtos()` → `[]`.
- Medido con Edge headless emulando tableta 1024×768 a 2× (`deviceScaleFactor` 2, táctil): CPU normal 60 fps;
  CPU 4× más lenta ~56 fps en la partida (antes ~28 y en cámara lenta). Partida completa con toques reales sin errores.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasEsfera` | Puro: rondas, trayectorias, ventana, `evaluarToque`, `faseAnillo`, `anticipacion`, `ajuste`, resumen, estrellas, `revisarJuego`. |
| `escena-tunel.js` | `EscenarioEsfera` | Módulo three.js: túnel, tuberías, anillo, esfera, reservas de partículas (900 + 260) y ondas, presentación, celebración y final. |
| `sonidos.js` | `SonidosEsfera` | Web Audio: zumbido de la central, tubería, aparición, zumbido de vuelo que sube al acercarse, aviso de ventana, captura, temprano, pasa, rondas, final y música. |
| `demo.js` | `EsferaDemo` | Demostración con la mano de `PedniaTutorial`. |
| `script.js` | — | Flujo, voces con prioridad, indicador (ronda, 4 esferas, capturas), mensajes breves, final, reinicio. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copia). |

## Cómo probar

- `node scripts/probar-atrapa-esfera-veloz.js` (24 pruebas).
- Servidor `juegos-esfera` (puerto 8041): `http://localhost:8041/catalogo_juegos/Polimotor/AtrapaEsferaVeloz/index.html`.
- Con el panel del navegador oculto el render se congela: se probó con Edge headless por CDP **con GPU**
  (`--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`; con SwiftShader va a ~3 fps y los toques llegan tarde),
  toques reales `Input.dispatchTouchEvent`, a 1366 × 768 y 1024 × 768: partida completa (temprano, tardío, sin
  toque, 12 capturas), final y «Jugar nuevamente» sin errores. ~53 fps en la GPU integrada.
- En la página: `EscenarioEsfera.estadoVuelo()`, `EscenarioEsfera.puntoAnillo()`, `EscenarioEsfera.stats()`;
  `historial`, `capturasTotal`, `rondaIdx`, `jugando` (let de `script.js`).

## Registro

Fila en `database/ambientes.sql` (antes de `atrapa-las-notas-musicales`) e insertada en la BD local con artisan
(idempotente); `JuegoCatalogoService::listarActivosPorAmbiente(7, 5)` la lista.

## Pendientes

- Probar el toque y el rendimiento en una tableta física.
- Voces: con el servidor estático `/juegos/tts` da 404 (normal); escucharlas en Laravel.
