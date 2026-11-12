# El Toque Mágico de las Cosquillas (`public/catalogo_juegos/Polimotor/ToqueMagicoCosquillas/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Prejardín 3-4 años, temática 29 "Reconocimiento de partes del cuerpo".
En un **vestidor mágico**, Zoe aparece dentro de un espejo con bombillas y el niño toca directamente la parte
que le piden: ojos, nariz, boca, manos, orejas, cabello (arriba o en las coletas), barriga, rodillas o pies. Zeus es la guía lateral (gif + globo de texto). Toda la escena del espejo es Phaser 4:

| Archivo | Global | Qué hace |
|---|---|---|
| `retos.js` | `Retos` | Reglas puras (también `module.exports`): zona → parte, `esCorrecta`, `elegirZona` (gana la más cercana), `armarPartida`. |
| `personaje.js` | `Personaje` | Zoe de frente en SVG por partes (cuerpo con rodillas, zapato, brazo, mano, pelo, coleta, oreja, cara, ojo, ceja, nariz, 3 bocas) y `GEOMETRIA` (pivotes y zonas). Lo que se anima solo va en pieza propia; el lado derecho es el izquierdo con escala −x. |
| `phaser-juego.js` | `EspejoPhaser` | Marco, vidrio, bombillas y Zoe en contenedores; zonas `Phaser.GameObjects.Zone` elípticas dentro del contenedor de cada parte. |
| `animaciones.js` | `ZoeAnim` | Reposo (respira, balancea, parpadea), reacción por parte, negar, cosquilla, saludo, alegría y boca que habla. |
| `vestidor.js` | `Vestidor` | Fondo SVG: estantería con ropa, perchero que se mece, banderines, lámparas de estrella y estrellitas (CSS `.vf-*` en `style.css`). |
| `guia-3d.js` | `Guia3D` | Módulo ES: Zeus 3D (`intro3d/models/nino.glb`, cargador y luces compartidos) en el panel guía; mira al espejo y hace gestos con los clips del GLB (Hablar, Saludar, Senalar, Celebrar/Aplaudir/Saltar, Pensar, Bailar). Sin WebGL o si el modelo falla, queda el GIF. |
| `demo.js` | `CosquillasDemo` | Demo narrada por Zeus 3D (no usa `PedniaTutorial.correr` ni `tutorial-3d.js`: en este juego solo aparece Zeus); de PedniaTutorial solo usa la mano. Toca ojos, nariz, boca y manos sin contar aciertos. |
| `script.js` | — | Flujo, rondas, ayuda progresiva, progreso, final y victoria. |

- Unidades de diseño de Zoe: pies en (0,0), cabeza hasta y ≈ -880. "izq/der" son lados **de Zoe** (su mano izquierda
  queda a la derecha de la pantalla). Las texturas se dibujan del SVG a un canvas a 2× (`RES`).
- **Zonas**: `ojo_*`, `nariz`, `boca`, `mano_*`, `oreja_*`, `cabello` + `coleta_*`, `barriga`, `rodilla_*`, `pie_*` y
  `cuerpo` (el resto de Zoe: solo un meneíto, ni acierto ni error). `input.topOnly = false`; entre zonas que se pisan gana la de menor distancia normalizada
  al dibujo. En pantallas chicas el área táctil crece hasta 26 px (cara) o 36 px (manos) de radio, máximo 1,7×.
  En las partes dobles vale cualquier lado, salvo que el reto traiga `"lado"`.
- **Partida al azar** (`Retos.armarPartida`): `juego.rondas` (3) rondas de `juego.partesPorRonda` (4) partes distintas,
  tomadas de `config.json → banco` (una lista de frases por parte: `texto`, `ayuda`, `acierto`, `personaje`). Prefiere las
  partes que menos han salido (en 3 rondas salen las 9), no empieza una ronda con la parte con que terminó la anterior y
  no repite frase mientras haya otra. Una parte nueva = dibujo + zona en `personaje.js`, entrada en `Retos.PARTES`/zonas,
  reacción en `animaciones.js`, ícono en `script.js → ICONOS_PARTE` y frases en `banco`.
- **Ayuda**: el pulso dorado sobre la zona sale **solo tras varios errores** en la misma parte
  (`juego.erroresParaBrillo`, 2), no por tiempo (pedido del usuario). Sin tocar nada, a los 8 s Zeus dice la `ayuda`
  y luego repite la instrucción cada 9 s. Error = Zoe mueve la cabeza, Zeus dice "¡Ups! ¡Esa no es!…" y `tic`.
- **Reacciones nuevas**: orejas crecen y se menean; coletas bailan; barriga = risa con todo el cuerpo; rodillas =
  se agacha y salta dos veces; pies = zapateo alternado (punta arriba desde el talón, `tic` en cada golpe).
- **Sonidos** (tema `polimotor`): ojos, boca, cabello y pies `acierto`; nariz, barriga y rodillas `bote`; orejas `aparece`;
  manos `correcto` (aplausos); fin de ronda `correcto`; victoria `victoria`. Risitas: no hay archivo; las dice la voz ("¡Jijí!", "¡Jajajá!").
- **Final "Desfile en la alfombra"** (elegido por el usuario entre 4 ideas; no le gustó el primero porque el fondo no
  participaba). `terminarJuego` (~15 s): Zeus anuncia "¡Miren! ¡Zoe sale del espejo…" → `Vestidor.desfile(true)` baja la
  luz (`.vf-penumbra`), la alfombra se vuelve pasarela con bombillos en cadena y bajan dos haces de luz → el espejo destella
  y se desvanece (`EspejoPhaser.salirDelEspejo`) y Zoe salta al cuarto al 80 % de tamaño (`ZoeAnim.salir`) → Zoe desfila
  centro → derecha (brazos arriba) → izquierda (saluda) → centro (`ZoeAnim.desfilar`) mientras Zeus 3D camina hasta la
  pasarela (`Guia3D.desfilar`: clip Caminar + translate del lienzo, `body.en-desfile` lo pone sobre el espejo); la ropa
  del perchero vuela a la pasarela (`.vf-prenda`, capa intermedia porque un transform CSS pisaría el atributo), los
  sombreros saltan (`.vf-salta`) y hay flashes de cámara (`#vf-flashes`) → cartel "¡MUY BIEN!" compacto arriba (`.arriba`,
  sin tapar la cabeza), aplausos, confeti y la victoria compartida (que apaga el desfile).
- Trampa: no poner la clase `final` a elementos del juego: `final/final.css` la usa para la victoria (fondo azul).
  `gestoGuia` solo agrega clases de gestos con animación CSS.
- Menús de accesibilidad abajo a la **derecha** (a la izquierda está la guía).
- **Quién habla** (pedido del usuario): si se ve Zeus, habla en **tercera persona** ("¡Busca los ojos de Zoe!").
  Zeus dice instrucciones, pistas, errores, demo, fin de ronda y cierre, en la nube lateral. Zoe solo dice sus propias
  reacciones en primera persona (saludo, risas al acertar, final) en `#zoe-globo`, una nube rosada que `ubicarGloboZoe`
  pone más allá de su coleta para no tapar partes que se tocan. Todo `banco[].personaje` es `"zeus"`; la prueba de node
  falla si un texto de Zeus dice "mi/mis/me/yo".
- **Guía 3D**: `script.js` llama `Guia3D.gesto()` desde `gestoGuia` (senala al dar una instrucción, celebra al acertar,
  duda → Pensar al fallar, saluda en la presentación, final → Bailar) y `Guia3D.hablar()` mientras suena la voz de Zeus.
  No se usó `intro3d/js/personajes-juego.js` porque solo alterna quieto/hablar y lo comparten muchos juegos. El lienzo
  sobresale 25 % a cada lado del panel (sin eventos) para que el encuadre no lo limite el ancho; en pantallas angostas
  el panel toma `height: 20vh` (15vh en celular) porque ya no depende del alto del GIF.
- Probar: `node scripts/probar-toque-magico.js`. En el navegador, los toques se simulan con `MouseEvent`
  (`mousedown` en el canvas, `mouseup` en `window`) en `EspejoPhaser.puntoDe(zona)`; también responde a `TouchEvent`.
  Con el panel oculto Phaser no procesa toques: mostrar el panel antes. `EspejoPhaser.ultimoToque()` da los candidatos
  y distancias del último toque.
- **Trampa corregida**: Phaser guarda la posición del lienzo y solo la renueva si cambia de tamaño. Cuando la cabecera se
  reacomodaba (fuente cargada, progreso visible) el lienzo se movía sin cambiar de tamaño y los toques se leían hasta
  42 px corridos (ojo → boca). `vigilarPosicion` llama `scale.updateBounds()` en la fase de captura de cada toque y con un
  `ResizeObserver`. Además se usa `pointer.x/y` (no `worldX`, que se actualiza un cuadro después).
- **Pantalla de inicio**: cada juego debe traer en su `style.css` los estilos base de `.pantalla-inicio` (posición fija,
  `z-index` 4000, mancha y animaciones); `comun/inicio-fondo.css` solo pone color y trazo. El ícono (`cosquillas.png`)
  es un **glifo blanco sobre transparente**, como los demás: el catálogo y la portada lo pintan con el color del juego.
- Registro: fila en `database/ambientes.sql`
  (ambiente 7, eje 11, temática 29, módulo 9, orden 11, imagen `cosquillas.png`).
