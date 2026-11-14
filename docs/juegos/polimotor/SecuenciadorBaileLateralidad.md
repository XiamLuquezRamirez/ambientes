# El Secuenciador de Baile y Lateralidad (`public/catalogo_juegos/Polimotor/SecuenciadorBaileLateralidad/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (2026-11-14), Transición 5-6 años, temática 31 "Juegos de memoria corporal", **juego 4** de la
serie. Memoria corporal secuencial **con lateralidad**: Zeus baila una rutina en la pista y el niño la repite
**en el mismo orden** con botones ilustrados.

Copia de [`SimonDiceCorporal`](SimonDiceCorporal.md) (3-4 años) a pedido del usuario: mismo motor
(`reglas.js`, `script.js`, `demo.js`), config y escena propias.

## Lo que pidió el usuario

Enunciado (2026-11-13) + tres correcciones en la conversación:

1. **Usar el juego de Simón Dice y su modelo como base** ("usar juego de simon dice que hay junto con el
   modelo que hay").
2. **Todos los clips del GLB menos los de estado de ánimo** (el enunciado pedía "todos sus clips"; al
   listarlos, el usuario acotó: "todos menos los de estado de animos").
3. **6 tandas de 3, 3, 3, 4, 4, 4 movimientos** (el enunciado pedía 3 rondas de 4).
4. **Siempre 3 botones visibles**, como Simón Dice (con imagen de referencia del diseño esperado).
5. **Escenario distinto** que no se parezca al de Simón Dice, pero con la misma lógica.
6. **Zeus al centro** de la pista (la imagen de referencia mostraba a Zoe; el usuario confirmó Zeus).

## Los 16 comandos y sus clips

El GLB trae **33 clips**. Se usan como comando los **16 corporales**; quedan fuera los de ánimo
(`Triste`, `Asustado`, `Enojado`, `Timido`, `Reir`, `Decir_si`, `Decir_no`, `Pensar`, `Mirar_alrededor`),
los de base (`Quieto`, `Hablar`, `Caminar_y_hablar`), los de saludo/señal (`Saludar`, `Senalar`), los de
celebración (`Celebrar`, `Porra_con_pompones`, que se usan como gesto, no como botón) y `Correr` (a 1.77 s y
sin desplazamiento de raíz se confunde con `Caminar`).

| Comando | id | Clip del GLB | Dur. | Contactos | Efecto |
|---|---|---|---|---|---|
| Mano a la Cabeza | `cabeza` | `Tocar_cabeza` | 3.4 s | 0.42, 0.66 | estrellas sobre la cabeza |
| Manos a la Cintura | `cintura` | `Tocar_cintura` | 3.4 s | 0.44 | destello en el centro |
| Tocar los Pies | `pies` | `Tocar_pies` | 4.0 s | 0.46 | destello en los pies |
| Aplaudir | `aplaudir` | `Aplaudir` | 2.1 s | 0.3, 0.52, 0.74 | destello en las manos + palmada |
| Abrir los Brazos | `abrirBrazos` | `Abrir_brazos` | 3.2 s | 0.42 | destello en las manos |
| Estirarse Arriba | `estirarse` | `Estirarse` | 4.2 s | 0.4 | estrellas en las manos |
| **Brazo Derecho Arriba** | `brazoDerecho` | `Levantar_brazo_derecho` | 3.2 s | 0.42 | destello en las manos |
| **Brazo Izquierdo Arriba** | `brazoIzquierdo` | `Levantar_brazo_izquierdo` | 3.2 s | 0.42 | destello en las manos |
| **Pie Derecho Arriba** | `pieDerecho` | `Levantar_pie_derecho` | 3.0 s | 0.44 | notas en el pie derecho |
| **Pie Izquierdo Arriba** | `pieIzquierdo` | `Levantar_pie_izquierdo` | 3.0 s | 0.44 | notas en el pie izquierdo |
| Zapatear | `zapatear` | `Zapatear` | 1.0 s | 0.3, 0.75 | ondas + la pista vibra |
| Saltar | `saltar` | `Saltar` | 2.33 s | 0.3, 0.68 | 1 = despegue, 2 = caída |
| Salto con un Pie | `saltarUnPie` | `Saltar_en_un_pie` | 5.6 s | 0.32, 0.62 | 1 = despegue, 2 = caída |
| Giro Corporal | `girar` | `Girar` | 3.6 s | 0.5 | notas alrededor |
| Bailar | `bailar` | `Bailar` | 2.23 s | 0.3, 0.7 | notas en las manos |
| Marchar en el Sitio | `marchar` | `Caminar` | 2.1 s | 0.25, 0.75 | ondas + la pista vibra |
| *(celebrar, no es botón)* | `brazos` | `Celebrar` | 2.3 s | 0.25 | — |

Los **cuatro de lateralidad** (en negrita) vienen animados por el propio modelo: no se espejan por código.
`Saltar` y `Saltar_en_un_pie` necesitan el campo `vuelo` (el clip flexiona pero no desplaza la raíz; el
desplazamiento va en `mesh.position.y`, ver la nota de Simón Dice).

**El modelo no se duplica**: `zeus-3d.js` apunta a `../SimonDiceCorporal/zeus_animado_suave.glb` (17 MB).

## Estructura

**1 ronda de 6 tandas** (`config.rondas[0].movimientos: [3,3,3,4,4,4]`), siempre **3 botones visibles**
(`juego.visibles: 3`), sorteados por tanda y sin repetir el trío anterior. Como solo hay 3 botones, **las
tandas de 4 repiten un comando** por fuerza (nunca dos iguales seguidos): es deliberado y sube la exigencia
de memoria. Las 6 tandas cubren los 16 comandos entre todas.

Ritmo: 1900 ms por movimiento, pausa 850 ms. El clip no se corta: `hacer(id, {ms})` ajusta `timeScale`
(`DURACION_CLIP[clip] / (ms/1000)`), así que `Saltar_en_un_pie` (5.6 s) se ve entero, acelerado.

## Escena

**Pista de baile futurista**, nada del teatro de Simón Dice (sin telones, sin cenefa dorada, sin marquesina
de bombillas, sin tarima de madera): suelo de baldosas luminosas en perspectiva que laten en cadena, aro de
neón tras Zeus que toma el color del movimiento (`--luz`), torres de altavoces cuyos conos vibran,
estructura de luces en el techo y tres haces que barren. La plataforma es de cristal oscuro con anillos de
luz y las luces del borde recorren el anillo. En `fase-observa` la pista baja de brillo y los haces se
cierran; en `fiesta` todo se acelera.

Arriba: Inicio, reiniciar, "5-6 años", título y la franja de progreso (TANDA n DE 6 · 6 puntos · barra n/6).
Zeus 3D al centro; Zoe a la izquierda con su nube; a la derecha la marquesina con la fase
(¡A BAILAR! / ¡OBSERVA Y MEMORIZA! / ¡REPITE LA RUTINA!) y las ranuras numeradas (una por movimiento).

## Flujo

Inicio → intro 3D compartida → `PedniaEdad` → **introducción**: cartel, Zoe y Zeus saludan, la marquesina
enciende "1. OBSERVA" y "2. REPITE", Zeus enseña **dos tríos** de movimientos (el de la demo y el de
lateralidad, `config.intro.gruposPresentados`; enseñar los 16 serían más de 30 s antes de jugar) → botón
**"¡COMENZAR!"** → **demo automática** (cabeza → salto con un pie → giro) → "¡AHORA ES TU TURNO!" → las 6
tandas → victoria.

Cada tanda: `SHOWING_SEQUENCE` (botones bloqueados, Zeus baila la rutina) → `WAITING_INPUT` (cada toque
ilumina el botón, Zeus hace el movimiento y el dibujo llena su ranura) → `CHECKING_ANSWER` → acierto
(celebración, punto verde, siguiente tanda) o error (el botón rebota, Zeus asiente y **vuelve a bailar la
misma rutina**, sin restar vidas).

## Cambios en el motor respecto a Simón Dice

`reglas.js` leía sus seis acciones de una **constante**, así que con 16 en el config el sorteo las ignoraba:

- **`accionesDeConfig(cfg)`** y **`demoDeConfig(cfg)`** nuevas; `sortearVisibles`, `sortear`,
  `problemasSecuencias`, `tocar`, `visiblesActuales` y `revisarJuego` operan sobre esa lista.
- `visiblesActuales(st, cfg)` y `tocar(st, id, cfg)` reciben el config como **parámetro opcional al final**
  (no rompe llamadas antiguas); `script.js` les pasa `gameConfig`. Sin él, los 10 comandos nuevos se
  rechazaban como `"desconocida"`.
- `script.js`: los efectos pasan de una cadena de `if/else` por id a la tabla **`EFECTOS`** con los 16
  (el id viejo `tocarPies` ya no existía y los nuevos se quedaban sin luz ni sonido).

## Archivos

| Archivo | Qué cambia respecto a Simón Dice |
|---|---|
| `config.json` | 16 comandos con su `clip`, 6 tandas `[3,3,3,4,4,4]`, `intro.gruposPresentados`, textos y edad 5-6 |
| `reglas.js` | acciones y demo leídas del config (ver arriba) |
| `iconos.js` | 10 dibujos nuevos; los de lateralidad llevan flecha e insignia **D**/**I** |
| `zeus-3d.js` | los 16 clips, duraciones medidas y GLB referenciado al juego vecino |
| `script.js` | tabla `EFECTOS`, colores de luz de los 16, intro acotada, identidad del juego |
| `index.html` | SVG de la pista, título, portada, edad |
| `style.css` | paleta de neón, plataforma de cristal, baldosas y conos |
| `secuenciador.png` | icono 256 × 256 (pista de neón con tres botones numerados) |

## Probar

- `node scripts/probar-secuenciador-baile-lateralidad.js` (24 pruebas: config de 16 comandos con clips
  reales leídos del GLB, 6 tandas, 3 visibles, edad; generador con 200 semillas incluidas las tandas de 4
  con 3 visibles; cobertura de los 16; toque fuera del trío; dibujos y pares D/I distintos; clips y
  duraciones contra el GLB; ritmo; efectos y colores de los 16; sin textos del juego anterior; fila única en
  `ambientes.sql`).
- `node scripts/probar-simon-dice-corporal.js` sigue en 19/19 (el paquete anterior no se tocó).

## Registro

Fila en `database/ambientes.sql` después de `simon-dice-corporal`: slug `secuenciador-baile-lateralidad`,
ambiente 7 (Polimotor), eje 11, temática 31, módulo 9, orden 20, imagen `secuenciador.png`, color `#5ce1ff`.
Insertada **también en la tabla `juegos`** de la base local: el `.sql` es solo un volcado
(ver [[registrar-juego-nuevo-bd]]). Comprobado: aparece para 5 años y no para 3.
