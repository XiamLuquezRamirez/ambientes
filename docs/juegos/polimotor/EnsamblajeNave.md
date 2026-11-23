# ¡El Ensamblaje de la Nave!

`public/catalogo_juegos/Polimotor/EnsamblajeNave/` · slug `ensamblaje-nave` · **5-6 años** · Eje 18 «Habilidad y precisión», temática 35 «Arrastrar y soltar objetos» (decisión del usuario, 2026-11-23).

Taller espacial. El niño toma cada pieza mecánica de la **bandeja** (izquierda), la arrastra con pulso firme hasta su **contorno** en el **plano holográfico** (centro) y la suelta con precisión para encajarla. Flujo del gesto: presionar → mantener → arrastrar → alinear → soltar → encajar. Nada se coloca solo.

## Niveles (pedido del usuario: «3 niveles con 3 naves diferentes, que vayan aumentando las piezas»)

Se encadenan en una sola partida (`config.nivelesJuego`; `config.niveles` es solo la edad del catálogo):

| Nivel | Nave | Piezas | Escala |
|---|---|---|---|
| 1 | Exploradora Chispa (fuselaje de huevo) | cabina, panel solar izquierdo y derecho (con brazo al fuselaje), propulsor | 1 |
| 2 | Nave Cometa (fuselaje fino) | punta estelar, cabina, aleta izquierda y derecha (el ala delta completa), propulsor | 0.95 |
| 3 | Gran Exploradora (fuselaje ancho con alas) | punta estelar, cabina, antena (sobre el lomo), turbina izquierda y derecha (sobre las alas), propulsor | 0.88 |

### Las piezas tienen sentido (pedido del usuario, 2026-11-23)

El usuario objetó la primera versión: «la antena no puede ir en la aleta» y «la aleta del segundo nivel debe ocupar toda la aleta, que sea real». Desde entonces:

- Cada pieza va donde iría en una nave real: cabina al frente, punta estelar en la nariz, antena sobre el lomo (centro del fuselaje), propulsor en la cola, paneles y turbinas a los lados.
- Si la pieza es una parte del casco (las aletas de la Cometa, los paneles de la Chispa), el casco ya **no** la dibuja: el contorno es la parte completa. Chispa y Cometa no tienen `alas` en `CASCOS`.
- Lo que va a los dos lados es un par izquierda/derecha. La derecha es el reflejo exacto de la izquierda (`espejoDe`, `transformar(d, -1, …)`); el brazo del panel, la raíz de la aleta y el estabilizador de la turbina hacen que cada una solo calce en su lado. Poner la izquierda en el lado derecho es «otraPieza».

- Ninguna nave repite pieza (los pares son reflejos, ids distintos). Los destinos (`x`, `y` relativos al centro de la nave, `rot` en grados) están en `nivelesJuego[].piezas` y se multiplican por `escala` (`ReglasNave.piezasNivel`).
- Solo el nivel 1 tiene demostración y botón «¡Comenzar a jugar!». Los niveles 2 y 3 entran con Zoe presentando la nave (`nivelesJuego[].zoe`) y arrancan solos.
- Al terminar los niveles 1 y 2 la nave se enciende y flota (`celebrar(true)`), cartel `listo`, Zoe y Zeus felicitan, fundido y siguiente nave. Al terminar el 3: despegue y victoria compartida.

## Composición (imagen de referencia del usuario como guía, no copia)

Mundo 1600 × 900 con `Scale.ENVELOP`. Lo jugable cabe en 4:3 (x 212–1360).

- Sin título en la partida (el usuario lo pidió quitar); el título solo está en la portada.
- Izquierda: bandeja metálica con 4, 5 o 6 huecos (`HUECOS`); cada pieza se achica para caber en ~140 × 118 (`escBandeja(f)`), cada una sobre una plataforma con su etiqueta, inclinada un poco (desorden controlado, `INCLINACION`). El reparto cambia en cada partida.
- Centro: plano con rejilla cian, marco de neón, la nave en holograma (`holo-<nave>`) y los contornos de cada pieza (misma silueta que la pieza, rayado y borde punteado). Barrido de escáner y motas de luz.
- Abajo al centro: **consola de progreso** del taller con «n / N» y la silueta de cada pieza, que se enciende con su color al encajarla. No hay barra genérica.
- Fondo: pared de paneles, tuberías, dos ojos de buey con el espacio, herramientas, estante, consolas con pantallas y LEDs que parpadean, suelo con franjas de seguridad. Más oscuro que la nave y las piezas.
- Botones estándar sin cambios (`comun/interfaz.css`): reiniciar y salir arriba a la derecha; accesibilidad y volumen abajo a la derecha. Sin cartel de edad.

## Mecánica y precisión

- Arrastre real de Phaser (`dragstart`/`drag`/`dragend`, mouse y touch, `activePointers: 2`, `touch-action: none`). Solo una pieza a la vez. Zona de toque: radio de la pieza + 16.
- Al tomarla: crece desde su escala de bandeja (máx. 0.72) a 1.06 × escala de la nave, sombra, aura de su color, chispas, sonido de servo. Sigue al dedo con suavizado exponencial (sin vibrar) y queda unos 36 px por encima del dedo para verse. Se endereza hacia la rotación de su destino. Limitada al área visible.
- Proximidad (`ReglasNave.cercano`, radio 200): solo su contorno brilla, late, suelta chispas y un aro se cierra sobre él.
- Imán sutil (`ReglasNave.iman`, radio 95, fuerza 0.3): dentro del radio la pieza se corre como mucho un 30 % hacia el centro. Nunca encaja sola.
- Al soltar, la escena manda las distancias a cada contorno y `ReglasNave.evaluar` decide:
  - **correcto** (su contorno a ≤ 58 px de diseño, o 45 % de la separación si es menor, y libre): se alinea, cuatro cerrojos magnéticos se cierran, destello, aro, chispas, tuercas, borde verde, destello del casco, la luz de la consola se enciende. La pieza queda fija y sin input.
  - **casi** (su contorno a ≤ 150 px): vuelve a la bandeja, el contorno parpadea en ámbar. «¡Muy cerca! Intenta colocarla justo en el contorno.» A los 2 «casi» con la misma pieza habla Zeus («¡Mantén tu dedo firme…!») y se dibuja el camino.
  - **otraPieza** (encima del contorno de otra pieza): ese contorno tiembla y la pieza vuelve. «Busca el lugar que tiene la misma forma.» Al segundo intento, la pista propia de la pieza (`piezas[].pista`) y el camino.
  - **fuera**: vuelve en silencio; a los 2 seguidos, «¡Lleva la pieza hasta el plano de la nave!».
- Sin vidas ni puntos negativos; los mensajes nunca dicen «mal» ni «fallaste» (hay prueba).
- Ayuda automática (12 s, luego cada 15 s): camino de puntos cian de la pieza a su contorno, el contorno brilla dos veces, la pieza salta; alternan Zeus (guía general) y Zoe (pista de la pieza).
- El casco ensamblado (`casco-<nave>`) se va volviendo sólido sobre el holograma a medida que se encajan piezas; las luces de las alas se encienden.

## Carteles y final (2026-11-23, pedido: «el mensaje de cada nivel no va con el juego; al final el mensaje es muy largo»)

- El cartel de nave lista es un panel holográfico del taller (fondo azul marino, borde cian con brillo, esquinas de plano, entra como un escaneo), arriba en la franja libre. Tiene tres partes que salen de `nivelesJuego[].cartel`: etiqueta amarilla («Nivel 1 completado»), nombre corto en una línea («¡Exploradora Chispa lista!») y lo que sigue («Sigue la Nave Cometa»). La voz sigue diciendo `listo`.
- La victoria compartida muestra solo «¡SÚPER INGENIERO!» y «¡La nave está lista!» (`finalTexto`). La frase larga del pedido queda en la voz (`finalVoz` + `finalVozZeus`).

## Celebración

`encender()`: una luz recorre las piezas de arriba abajo, el casco queda sólido, el holograma baja a 0.35. Después:

- Niveles 1 y 2: el propulsor se enciende y la nave flota 34 px y vuelve.
- Nivel 3: **cinemática final «Viaje al espacio»** (pedido 2026-11-23, ≈13 s, `EscenarioNave.cinematica()`), con franjas de cine y botones ocultos (`body.cinematica`, como en Atrapa la Esfera Veloz). Antes, el cartel «Nivel 3 completado» se ve 2,4 s.
  1. La nave se enciende y la cámara se acerca (zoom 1,5).
  2. Cuenta regresiva 3, 2, 1 y «¡DESPEGUE!» en `#cuenta-cine` (evento `cuenta`, pitidos `SonidosNave.cuenta`); el fuego crece y la nave vibra.
  3. Ignición: temblor de cámara y sonido de despegue.
  4. Despegue: la cámara sigue la nave por encima del taller (y < 0) hasta el espacio: degradado del techo al negro, 120 estrellas, tres nebulosas, un planeta violeta con anillo dorado y una luna (`crearEspacio()`, se crea una vez).
  5. Hiperespacio: las estrellas se estiran, `SonidosNave.hiperespacio` y destello blanco (rectángulo con `scrollFactor 0`).
  6. De vuelta en el taller: la cámara vuelve a 1 y la nave baja y se posa en el plano con fuegos y confeti.
  Con movimiento reducido la cámara no viaja. La animación vieja de despegue (`celebrar(false)`) queda sin usar.
- Luego Zoe y Zeus dicen el cierre (`finalVoz` + `finalVozZeus`) y aparece la victoria compartida con «¡SÚPER INGENIERO!» y el bloque estándar «¿Quieres jugar nuevamente? Sí / No».

## Flujo

portada → intro 3D (`textos.conversacion`) → PedniaEdad → Zoe dice la instrucción (`introZoe`) → demo: Zeus (`demoZeus`) y la mano de `PedniaTutorial` llevan la cabina a su contorno; se deshace → Zeus: `guiaZeus` → «¡Comenzar a jugar!» → nivel 1 → nivel 2 → nivel 3 → cinemática «Viaje al espacio» → victoria.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | cascarón estándar (portada, intro 3D, escena, botones, victoria compartida); sin progreso HTML |
| `config.json` | 10 piezas (4 sueltas y 3 pares izquierda/derecha), 3 naves en `nivelesJuego`, radios e imán en `juego`, textos, edad 5-6 años |
| `reglas.js` | `ReglasNave` puro (también en Node): piezasNivel, radios, evaluar, cercano, iman, repartir, frase, completo, validar |
| `dibujos.js` | `DibujosNave`: SVG propios (taller, bandeja, plataforma, plano, consola, 3 cascos en holograma y sólidos, 10 piezas (los pares derechos se reflejan de los izquierdos), contornos, brillos, bordes, cerrojo, llama, partículas). Pieza y contorno comparten `PIEZAS[id].partes`; el contorno usa una máscara para dibujar solo el borde exterior de la unión |
| `escena-nave.js` | `EscenarioNave`: escena Phaser 1600×900 `ENVELOP`, arrastre, imán, efectos, consola, celebración, `Animador` con respaldo por tiempo |
| `sonidos.js` | `SonidosNave` (Web Audio, sin archivos; buses fondo/efectos para `comun/volumen.js`): servo, escaneo, seguro magnético, encendido, despegue |
| `demo.js` | `NaveDemo` (copia de la del Árbol) |
| `guia-3d.js` | Zoe y Zeus 3D (copia sin cambios) |
| `script.js` | flujo, voces, ayuda, cierre |
| `style.css` | HUD, globos en cian, pista arriba (en `vh`), botón de arranque, cartel |
| `nave-ensamblaje.png` | ícono 256×256: la Nave Cometa armada (captura de la propia escena con `renderer.snapshotArea`) |

## Probar

- `node tests/js/run-tests.js` (23 pruebas en `tests/js/ensamblaje-nave/reglas.test.js`; 85 en total).
- `preview_start juegos-nave` (puerto 8045) → `/catalogo_juegos/Polimotor/EnsamblajeNave/index.html?edad=5`.
- Arrastre por JS: `mousedown`/`mousemove` en varios pasos sobre `__escenarioNave.canvas` (un solo movimiento no lo ve Phaser). Touch: viewport < 768 de ancho (emula táctil) y `Touch` con `pageX/pageY`. La pieza queda 36 px de diseño por encima del dedo: para centrarla, soltar con el dedo 36 px por debajo del contorno.
- `EscenarioNave.estado()` da piezas, contornos, radios y energía.
- Con el panel del navegador oculto los cuadros se frenan y las animaciones terminan por el respaldo: para medir el despegue, llamar `scene.update(0, 16)` a mano.

Probado en el navegador (2026-11-23): 1366×768, 1024×768 y 1920×1080; flujo completo con mouse (portada → intro → demo → botón → 3 niveles → despegue → victoria compartida), los cuatro casos de soltado, nivel 1 completo con touch emulado, demo medida paso a paso y trayectoria del despegue.

## Registro en BD

Fila en la BD local (tinker, `updateOrInsert`) y en `database/ambientes.sql` tras `arbol-formas-magicas`. Orden 37, imagen `nave-ensamblaje.png`, color `#3bc9db`. Aparece en `listarActivosPorAmbiente(7, 5)`, no en `(7, 3)`.

## Pendientes

- Tableta física real y voces del servidor (`/juegos/tts` requiere Laravel; con el servidor estático dan 404 y el juego sigue por tiempo). Sin commit.
