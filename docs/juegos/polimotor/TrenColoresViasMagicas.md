# El Tren de Colores y las Vías Mágicas

`public/catalogo_juegos/Polimotor/TrenColoresViasMagicas/` · slug `tren-colores-vias-magicas` · **3-4 años** · Eje 18, temática 36 «Ensamblajes sencillos» · orden 40 · imagen `tren-colores.png` · color `#3d8bff`.

Trazado de vías en un valle de juguete **3D real (three.js)** armado con los modelos low-poly de las experiencias. El niño toca el punto INICIO junto al tren, mantiene el dedo y lo desliza por los puntos de luz hasta la estación siguiente. La vía azul (balasto, traviesas y dos rieles) se construye exactamente hasta donde llegó el dedo. Al terminar cada hueco, el tren pita y viaja de verdad por la vía hasta esa estación.

## Pedidos del usuario (2026-11-23)

- Prompt «JUEGO 1: El Tren de Colores y las Vías Mágicas» con imagen de referencia (guía, no copia).
- **Sin el título del juego** en la partida (solo en la portada).
- **4 niveles** y **cinemática final**.
- Botones estándar de Polimotor sin cambios (`comun/interfaz.css`).
- El prompt mezclaba «3 a 4 años» (título) y «5 a 6» (cuerpo): se usó **3-4 años**, el del título.

## Cambios pedidos el mismo día (segunda vuelta)

- Rutas más largas, con estaciones a distancias al azar en cada partida:
  - nivel 2: 3 estaciones (2 huecos);
  - nivel 3: 4 estaciones;
  - nivel 4: igual que el 3, pero con curvas.
- Resolución de dibujo baja.
- Sin el castillo.
- Materiales y modelos de las experiencias (kit low-poly) y personajes low-poly más livianos, para tabletas de 4 GB de RAM.
- Cámara más alejada.

## Tercera vuelta (2026-11-23)

- El nivel 3 pasa a ser el de curvas (el que antes era el 4). El de cuatro estaciones rectas con desnivel ya no existe.
- El nivel 4 tiene curvas más pronunciadas: `vias[3].curva` = [2,6; 3,2] y `margenCurva` 1,9. Las curvas se apartan en promedio 2,4 de la recta (en el nivel 3, 1,7), y la vía llega como mucho a z ≈ ±3,5.

## Niveles (`config.json → vias`, ruta al azar con `ReglasTren.generarRuta`)

| Nivel | Tren | Estaciones | Huecos | Largo de cada hueco (al azar) | Forma | Carril |
|---|---|---|---|---|---|---|
| 1 | rojo | 2 | 1 | 24 a 28 | recta | 1,9 |
| 2 | azul | 3 | 2 | 20 a 27 | recta | 1,85 |
| 3 | verde | 4 | 3 | 18 a 24 | curvas | 1,85 |
| 4 | amarillo | 4 | 3 | 18 a 22 | curvas más altas | 1,9 |

- Cada hueco ocupa toda la pantalla y la ruta sigue fuera de ella: la primera estación está en x = −10,5 y la última llega hasta x ≈ 65. El valle (árboles, vallas, flores, animales, nubes y montañas) se extiende hasta x ≈ 100.
- Con desnivel, cada estación queda a otra altura (z entre −1,5 y 1,7).
- Curvas: joroba (1 − cos)/2 de 1,6 a 2,6 de alto (nivel 3) o de 2,6 a 3,2 (nivel 4, `curva` y `margenCurva` del nivel), alternando hacia el fondo y hacia el frente. El radio nunca baja de `radioMin` 2,6.
- El niño construye un hueco cada vez. Al terminarlo:
  1. el tren viaja a la estación siguiente;
  2. la cámara se desliza (2,2 s) hasta encuadrar el hueco nuevo;
  3. Zoe o Zeus lo celebran;
  4. la estrella guía recorre el hueco nuevo.
- Hitos: 3 en el nivel 1; a un tercio y a dos tercios de cada hueco en los demás.

## Mecánica (`reglas.js`, `ReglasTren`, puro y probado en Node)

- El dedo se proyecta con un **rayo de la cámara al plano de la vía** (`Raycaster.ray.intersectPlane`, y = 0,2). Las reglas reciben `{x, z}` del mundo, así que no dependen de la resolución.
- Cada hueco es una polilínea (`construir`, con `puntos` o `desde/hasta`). El avance `s` es la distancia construida sobre ella; `proyectar` busca el punto más cercano de la polilínea y `direccion` da la tangente suavizada.
- Solo se engancha cerca de la punta (al principio, el INICIO; radio `toqueInicio` 1,5). Tocar la estación siguiente o fuera del carril no hace nada y avisa con suavidad.
- Avanza solo si el dedo está dentro del carril (`ancho/2 + margen·ancho`) y como mucho `ventana` (2,2) por delante de la punta. Saltar al final pone el estado en «fuera: adelante» sin construir nada.
- La velocidad máxima es de 9 unidades por segundo, con `dt` recortado a 0,1 s: no hay teletransporte.
- **Desvío**: la vía se detiene, el carril titila en ámbar, las flechas brillan, un hilo ámbar une la punta con el dedo y Zoe avisa. Al volver, sigue. No se pierde lo construido.
- **Soltar antes de llegar**: la vía construida se queda y la estrellita de la punta salta; se retoma tocándola. Zeus recuerda «¡Sigue los puntos de luz…!» (cada `vozSoltarMs`).
- `generarRuta(nivel, cfg.ruta, azar)` arma las estaciones, los huecos y el camino completo del tren (vía fija antes, huecos, vía fija después). Las pruebas le pasan `azarConSemilla`.

## Escena (`escena-tren.js`, módulo, `window.EscenarioTren`)

- **Kit de las experiencias** (`public/assets/modelos`, el mismo de `assets/js/mapa-mundo.js`):
  - cordillera, cerros y colinas al fondo;
  - ceiba, mango, cañaguate, palma de coco y platanera;
  - arbustos, rocas, tronco caído, flores, girasoles, vallas y nubes que viajan;
  - dos ovejas, un pato y un conejo con sus clips (reposo y pastar). La vaca y la gallina no se usan: son 37 y 25 piezas animadas.
- Cada GLB se carga una vez y sus piezas se funden por material. Los repetidos se dibujan con `InstancedMesh`: una llamada por material, no por árbol. Los materiales pasan a Lambert facetado con su mismo color. Los `.glb` no se tocan.
- El castillo se quitó.
- **Vías**: cintas que siguen el hueco (recto o curvo), recortadas con `setDrawRange` hasta el avance: balasto, dos rieles azules y estela. También traviesas, puntos de luz y flechas orientadas con la tangente.
- **Estaciones**:
  - de salida (edificio detrás del tren);
  - intermedia («parada»: compacta, centrada y un poco más atrás para que las curvas no pisen el andén);
  - final (torre con bandera a cuadros).
- El tren y las estaciones usan geometrías propias con material Lambert y pocas caras. Sus piezas quietas se funden por material (`fundirGrupo`): una estación pasa de ~90 piezas a ~30 y el total de la partida de ~590 a ~400 llamadas.
- Cada coche del tren se apoya por su cuenta en el camino (`ponerTren`), así que en las curvas los vagones siguen la vía.
- **Cámara**: elevación de 28°, mira un poco por encima de la vía. Encuadra solo el hueco actual (`zonaTramo` → `encuadre`, alejada 4 %) y se desliza a la estación siguiente al llegar (`panear`).
- **Resolución moderada** (se subió un poco a pedido del usuario):

  | Nivel de calidad | Resolución | Sombras |
  |---|---|---|
  | 0 (PC) | hasta 1,5 | sí |
  | 1 (tableta) | hasta 1,25 | no |
  | 2 | hasta 1 | no |

  La tableta arranca sin antialias, en el nivel 1, y la calidad baja sola por debajo de 42 fps. El mapa de sombras es de 1024.
- **Personajes**: Zoe y Zeus usan los low-poly del mapa de las experiencias (`assets/modelos/nina.glb` y `nino.glb`). Tienen ~37 000 y ~31 000 triángulos, frente a ~240 000 de los de la intro, y los mismos clips. Su lienzo va a resolución ≤ 1 y sin antialias en tableta.
- La estrella guía (3 s) recorre el hueco actual al empezarlo.
- El indicador de arriba a la izquierda muestra los 4 trenes y la barra de avance de todo el nivel (`kNivel`).

## Flujo (`script.js`)

1. Portada.
2. Intro 3D.
3. PedniaEdad.
4. El tren pita.
5. Zoe entra con «¡El trenecito quiere viajar!…» mientras la estrella recorre el carril.
6. Zeus hace la demo (`demo.js`): la mano traza el 55 % y se levanta; la vía se recoge.
7. «¡Comenzar a jugar!».
8. Zeus: «¡Sigue los puntos de luz con tu dedo sin soltar el camino!».
9. Nivel 1: un hueco largo, de la estación de salida a la final.
10. Al completar un hueco: barrido de luz, anticipación, vapor, pitido, el tren viaja y llega, y hay confeti en esa estación. Si quedan huecos, Zoe o Zeus lo celebran, la estrella guía recorre el siguiente y se sigue construyendo.
11. Al completar el último hueco del nivel: cartel con los colores del juego (azul, turquesa, amarillo y naranja).
12. Fundido y siguiente nivel, con una ruta nueva al azar (estrella guía de 3 s más la instrucción por voz).
13. Niveles 3 y 4, con curvas (más altas en el 4).
14. Cinemática final.
15. Zoe «¡EXCELENTE MAQUINISTA!…» y Zeus.
16. Victoria compartida.

## Cinemática final «El gran viaje de colores» (≈18 s)

Franjas de cine y botones ocultos (`body.cinematica`).

1. Empieza donde terminó el nivel 4: en su última estación y con el mismo tren (amarillo con su vagón). La cámara parte de donde estaba la del juego, sin salto.
2. Los vagones de los otros 3 trenes (rojo, azul y verde, en el orden de los niveles) caen uno a uno y se enganchan detrás. Salen de `config.vias[].color`.
3. Pitido y vapor.
4. El tren sigue por la vía del nivel: una curva suave lo endereza y entra al mundo del gran viaje. La cámara lo sigue de lado.
5. Cruza el puente de arcos sobre el río (toma baja).
6. Entra al túnel de la montaña (toma alta).
7. Llega a la gran estación con globos y estrella.
8. Fuegos artificiales y confeti.

El mundo del gran viaje (`CINE.grupo`: río, puente, túnel, árboles y gran estación) se coloca al empezar, justo después de la última estación (`prepararCaminoCine`). Su vía (`CINE.via`) se arma sobre un camino que sigue la ruta del nivel hasta el tren. Los árboles del valle no pasan de x = 76 ni pisan ese pasillo.

## Audio

`sonidos.js` (`SonidosTren`, Web Audio, sin archivos):

- zumbido mágico mientras se construye y toc de madera por cada traviesa (el «ta-ca»);
- inicio, retoma, hito, fuera (suave), vuelve y pausa;
- estrella, activación de la vía, pitido de dos silbatos, vapor, chu-chu, arranque y llegada;
- acople, puente, túnel, fuegos y victoria;
- de fondo, solo pajaritos de vez en cuando (el acorde continuo que sonaba todo el juego se quitó por molesto) y música alegre en la cinemática.

Expone `volumenFondo` y `volumenEfectos` para `comun/volumen.js`. Las voces van con `TextoVoz`.

## Pruebas

- `node tests/js/run-tests.js`: suite «El Tren de Colores y las Vías Mágicas (reglas)», 12 casos. Cada uno recorre los 4 niveles con 5 semillas, es decir, todos sus huecos:
  - config: estaciones 2/3/4/4, curvas en los niveles 3 y 4 y textos pedidos;
  - rutas de izquierda a derecha, sin huecos menores que `huecoMin`;
  - distancias distintas con otra semilla;
  - rectas en los niveles 1 y 2, y curvas que salen derechas en el 3 y el 4 (en el 4 se apartan al menos 1,6);
  - llegada con hitos;
  - zigzag tolerado (también en las curvas);
  - salto imposible;
  - solo empieza en el INICIO;
  - velocidad máxima;
  - desvío y vuelta;
  - soltar y retomar;
  - nada tras la meta.
- Navegador: servidor `juegos-tren` (8048), `…/TrenColoresViasMagicas/index.html?edad=3`. Con `PointerEvent` sintéticos sobre el canvas en `EscenarioTren.puntoPantalla(s)` se probaron:
  - la demo y el botón;
  - el nivel 1 completo y el paso al nivel 2 (3 estaciones);
  - el nivel 2 completo y el paso al 3 (4 estaciones con desnivel);
  - el nivel 4 (3 huecos curvos), el viaje entre estaciones, la cinemática y el cierre con Zoe y Zeus low-poly.
- Resoluciones simuladas: 1366 × 768 y 1024 × 768. Costo de un cuadro forzando la GPU (`readPixels`):
  - partida en PC (resolución 1 y sombras): ~8,7 ms;
  - cinemática a 0,62: ~5,7 ms;
  - unos 120 000 triángulos.
- Los fps que mide el juego no sirven aquí: el panel del navegador estaba oculto y frenaba los cuadros, por eso la calidad bajó sola al nivel 2.

## Pendientes

- El táctil real (dedo en tableta) y el rendimiento en una tableta física no se probaron: solo en simulación de escritorio.
- Las voces dan 404 con el servidor estático; para oírlas hay que probar con Laravel.

## Correcciones (2026-11-23, tercera vuelta)

- Se quitó el acorde continuo de fondo (`sonidos.js → ambiente`): sonaba todo el juego como un zumbido.
- La cabina del tren subía y se quedaba flotando al llegar a una estación (y al final de la cinemática). El saltito se sumaba en cada cuadro mientras el tren no estaba en espera; ahora se descuenta el del cuadro anterior (`dySalto`).
- La resolución subió un poco: hasta 1,25 en PC, 1 en tableta y 0,8 en el nivel más bajo.
- Tras la demostración quedaba sonando un pitido constante: el zumbido de «construir vía» se encendía con la mano de la demo y nadie lo apagaba al levantarla. Ahora la demo lo apaga al soltar y al recoger la vía, y el zumbido se apaga solo si pasan 0,3 s sin avance.
- Cámara por hueco (pedido del usuario): cada hueco, de una estación a la siguiente, ocupa la pantalla. El tren esperando, el hueco y la estación siguiente se ven (`zonaTramo`, ancho mínimo 17) y el resto del valle queda fuera. Al llegar a la estación, la cámara se desliza 1,7 s (`panear`) hasta encuadrar el hueco siguiente; el viaje espera a que termine antes de la estrella guía.
- Rutas más largas (pedido del usuario): el encuadre por hueco solo acercaba la cámara. Ahora cada hueco mide 18 a 28 de verdad (`vias[].hueco`). El valle se alargó hacia la derecha y el sol (con su caja de sombras) sigue a la cámara.
- Sonido que no se apagaba al moverse la demo: el trémolo del zumbido de «construir» iba sumado al volumen final, así que con el volumen en cero seguía sonando un tono ondulante. Ahora el trémolo va antes del volumen y los osciladores se detienen al parar. Comprobado: tras la demo no queda ningún oscilador activo.
- Desde el nivel 2 desaparecía la madera (traviesas) de las vías al deslizarse la cámara a la segunda estación. Nacen escondidas en el origen y three.js calculaba con eso su esfera de recorte. Ahora las traviesas de los huecos y las nubes que se mueven no se recortan (`frustumCulled = false`).
- La resolución subió otra vez: hasta 1,5 en PC, 1,25 en tableta y 1 en el nivel más bajo.
