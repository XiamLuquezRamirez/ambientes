# Multisensorial / Repite la secuencia (rediseño con motor propio)

Fecha: 2026-11-17. Mismo estándar que Memoria auditiva: motor Phaser propio por juego sobre `MemoriaAuditiva/comun/kit.js`,
4 niveles, fondo vivo, presentador 3D, escena final propia e insignia. Fallback: las tarjetas DOM originales si el motor no monta.

| Juego | Edad | Mundo / gesto | Archivo |
|---|---|---|---|
| DosSonidos | 3-4 | **«¡El capitán soy yo!»**: el niño MANEJA el barco con el dedo por un mar que avanza (boyas que suenan al chocarlas, monedas, rocas, remolinos). Recoge las boyas en el orden que sigue la canción del loro; quedan atadas detrás del barco. Con la canción completa llega la isla y se atraca en el muelle. 4 niveles = mañana, mediodía, atardecer, noche. Final: cofre, fuegos artificiales y las boyas tocando en fila | `capitan.js` |
| DosInstrumentos | 3-4 | **«El globo de la orquesta»**: globo aerostático que sube/baja con el dedo por 4 paisajes (aldea al amanecer, montañas nevadas, cañón al atardecer, noche con aurora). Se atrapan globos-regalo con instrumentos en el orden de la canción; cada acierto suma un músico a la orquesta del escenario, que toca la melodía. Tormentas y aves, aterrizaje en pista, final con fuegos | `globo.js` |
| TresSonidos | 3-4 | **«El taller del duende»**: construir con física real (Matter). Una cinta trae bloques de madera con animal/instrumento; se apilan en el pedestal en el orden de la canción (de abajo hacia arriba). Los bloques se tambalean y caen; cada piso bien puesto se ilumina (bombillas de progreso), el equivocado se marca en rojo y se puede sacar. 4 niveles con formas más difíciles (cubos, tablones, altos, pequeños). Final: la torre toca como xilófono | `taller.js` |
| SecuenciaConDistractor | 3-4 | **«Safari fotográfico»**: el niño maneja el visor de una cámara (con lente de aumento real: segunda cámara de Phaser) por un desfile de animales; un letrero muestra los INVITADOS y hay que fotografiar al INTRUSO (enfoque automático al mantener el visor quieto o disparo al levantar el dedo). Álbum de polaroids con estrellas. 4 lugares: sabana, selva, laguna, noche con luciérnagas. Final: foto de grupo con cuenta atrás | `safari.js` |
| GranSecuenciaFinal | 3-4 | **«La fábrica de caramelos»**: verbo = DIBUJAR RAMPAS. Una máquina de chicles suelta una bola; el niño dibuja caminos de crayón (cada trazo es un tobogán de física Matter) para que la bola toque las teclas-caramelo del xilófono en el orden de la canción; tecla equivocada reinicia la melodía; goma para borrar. 4 niveles (más teclas, donas rebotadoras, decoración distinta). Final: lluvia de chicles que rebotan | `caramelos.js` |
| SecuenciaDe3Sonidos | 5-6 | «Caja fuerte» mejorada (el usuario quiso conservarla): marcar el código en el teclado y luego **girar la rueda con el dedo** (los cerrojos se retiran; respaldo automático a los 10 s). Sala de paneles con tuberías, cámaras con conos de luz, baliza de alarma y láseres; cada nivel es otra sala (tinte) con su tesoro (lingotes, gemas, corona, copa). Final con focos de colores | `cajafuerte.js` |

| SecuenciaDe3SonidosDiferentes | 5-6 | **«El valle de los cambiavías»**: verbo = PLANIFICAR el camino de un tren. Un árbol de desvíos (2 a 3 niveles) lleva a una estación por sonido; el niño toca los cambiavías (la ruta se ilumina) y el tren llega a la estación; debe visitarlas EN ORDEN de la canción (bombillas), una equivocada reinicia el programa sin dificultad de puntería. 4 niveles (más estaciones, tren más rápido; primavera, otoño, nieve, noche). Final: tren de fiesta con los instrumentos sobre los vagones | `trenes.js` |
| SecuenciaDe4Sonidos | 5-6 | **PILOTO nuevo** «Robot programado»: cada sonido es una ORDEN (↑→↓←); se oye el programa y se toca A DÓNDE llegará el robot | `robot.js` |
| SecuenciaConCambio | 5-6 | **«El cuento desplegable»**: verbo = TIRAR DE LENGÜETAS de papel en un libro pop-up (cada ventanita abre postigos y sube una figura de cartulina). Tras acertar se PASA LA PÁGINA (hoja que voltea, escena nueva, ventanitas en otro orden) y hay que repetir la nueva secuencia. 4 niveles con escenas de papel distintas (pradera/mar, selva/desierto, nieve/ciudad, espacio/fiesta). Final: página de fiesta con todas las figuras desplegadas | `libro.js` |
| ElGranCodigoSecreto | 5-6 | **«El templo sumergido»**: misma mecánica (escuchar el código y arrastrar las gemas-burbuja en orden a los engastes del friso del templo; error = las gemas salen disparadas y el código suena otra vez). Al completar se abre la puerta de piedra con el tesoro. 4 niveles que bajan más hondo (arrecife, algas con tortuga, aguas profundas con medusas, abismo luminoso). Final: templo iluminado, melodía y paso de una ballena | `templo.js` |

Los 10 juegos ya tienen motor propio. Mejoras de interactividad (2026-11-17): objetos que se mueven, arrastre, ritmo que crece por nivel.
Con cambio: el kit acepta `nv.segunda` (segunda secuencia con otro orden) y el mundo implementa `alCambioSecuencia()`.

## Base común
- `MemoriaKit` ganó el tipo `secuencia` (cambio aditivo): `generar`, `respuestas()` devuelve solo el sonido que toca (el orden es parte
  del reto), `marcar()` valida en orden y, ante un error, `reiniciarSecuencia()` borra lo marcado y vuelve a sonar todo.
  Helpers: `tocarOrden`, `demoOrden`, `siguienteDe`, `pistaToque`. Hooks de mundo: `alMarcar(id, k)`, `alReiniciar()`.
- Dificultad por juego en `config.json` → `retos[0].dificultad` (`[{n, extra}, …]`); el reto del documento sale en un nivel 1-3 al azar.
- `config.json` ahora lleva `tipo: "secuencia"`, `reproducciones` (copia de `secuencias`), `demo.secuencia` y más elementos (union con Memoria).
- `script.js`: se agregó `iniciarMotor`/`ctxMotor` (igual que Memoria). `sfx.js` es el de Memoria renombrado a `RepiteSecuenciaSfx`.
- La insignia sale de `niveles[].insignia.img` (`insignia_cfg`), así 5-6 usa «Maestro de las secuencias».

## Cómo probar (solo horizontal)
`PedniaTutorial.mostrarIntroActiva = () => false` antes de `confirmarNivel('3')` salta la demo. Para ver solo el final:
`PedniaJuego.jugar = async () => { PedniaJuego.escena().reunidos = [...] }`. Con el panel oculto Phaser va muy lento.

## Piloto de mecánicas nuevas (2026-11-18)
El usuario pidió juegos realmente distintos (no el mismo «escuchar y tocar en orden»). Plan: 1 completar patrón, 2 detective de cambios, 3 al revés, 4 sonido=instrucción (hecho: robot), 5 ritmo (hecho), 6 sonido en el espacio, 7 cuento sonoro, 8 teléfono roto, 9 dúo, 10 voz propia.
Robot y Ritmo reemplazan fabrica.js y ruleta.js (se conservan nombres de carpeta/catálogo). Pueden ignorar el reto oficial del documento (`planNiveles` propio).

Grupo 1 de 3-4 años hecho (2026-11-18): rio, musicos, cine. Pendientes: SecuenciaConDistractor (intruso/safari), GranSecuenciaFinal (ritmo fácil), y 5-6: SecuenciaDe3Sonidos (al revés), 3Diferentes (detective), ConCambio (teléfono roto), CodigoSecreto (contar).

2026-11-18: el usuario rechazó río/músicos/cine («mismos escenarios»). Pide que TODO sea distinto (mundo, mecánica, final), bonito y como juego real. `piratas.js` es el primer juego con ese estándar; músicos y cine quedan por rehacer igual.

2026-11-18: piratas.js (disparar al barril correcto) también rechazado: «sigue siendo seleccionar la respuesta correcta como un cuestionario». Principio aprobado: el niño controla algo con el dedo todo el tiempo (moverse, explorar, chocar); el sonido es parte del mundo, no una pregunta. capitan.js lo aplica.

2026-11-19 capitan.js (pulido): agua en 5 capas con crestas y espuma, camino de luz del astro, peces y delfín que salta; cielo que cambia de hora con transición suave (paleta `pal`); vela que se hincha con la velocidad, estela y chorro de proa, reflejo/sombra del barco; boyas que se mecen con la ola y reciben empuje de la ola de proa; cuerda con comba; marca del dedo; anillos de sonido en el agua; loro con pupila que mira y parpadea; contador de monedas que recibe las monedas volando; ambiente sonoro suave. Respaldo previo en el scratchpad de la sesión.

2026-11-19: DosInstrumentos rehecho como globo.js (estándar capitan.js: control libre con el dedo, mundo propio, final propio). Pendientes con ese estándar: TresSonidos, Distractor, GranFinal, 3Sonidos, 3Diferentes, ConCambio, CodigoSecreto.

2026-11-19: TresSonidos rehecho como taller.js, primer juego con verbo distinto de «manejar y recoger»: construir con física. Matter está disponible sin tocar base.js: `Phaser.Physics.Matter.Matter` (v0.20) se usa con su propio Engine y se sincroniza a mano en `paso`.

2026-11-19: SecuenciaConDistractor rehecho como safari.js: verbo = apuntar/enfocar/disparar (lente con `this.cameras.add` + `ignore` de la interfaz). Pendientes: GranFinal, 3Sonidos, 3Diferentes, ConCambio, CodigoSecreto.

2026-11-19: GranSecuenciaFinal rehecho como caramelos.js (dibujar rampas con física). Pendientes: 3Sonidos, 3Diferentes, ConCambio, CodigoSecreto.

2026-11-19: SecuenciaDe3SonidosDiferentes rehecho como pinball.js. Notas de física: en Matter 0.20 la velocidad de lanzamiento necesaria es ~26 (el divisor del carril debe terminar más abajo que el arco). Pendientes: 3Sonidos (5-6), ConCambio, CodigoSecreto.

2026-11-19: SecuenciaDe3SonidosDiferentes rehecho como trenes.js (el pinball se descartó por difícil/azar; guardado en ideas/). Hook de dibujo: `paso`. Pendientes: 3Sonidos (5-6), ConCambio, CodigoSecreto.
2026-11-19: SecuenciaConCambio rehecho como libro.js (libro pop-up; pasar página = el cambio). Pendientes: 3Sonidos (5-6), CodigoSecreto.
2026-11-19: ElGranCodigoSecreto rehecho como templo.js (misma mecánica, escenario nuevo). Cuidado: `fiestaFinal` ya es un método del kit; no usarlo como bandera. Pendiente: 3Sonidos (5-6).2026-11-19: el presentador 3D de El Gran Código Secreto lleva careta de buceo con tubo. Se activa con `L.pres.accesorio = 'careta'` (kit de Memoria auditiva → `AsociaPj3D.crear`, que la engancha al hueso «cabeza» y mide con «malla_cabeza_piel»; ajustable con `p.caretaY`).

2026-11-19: SecuenciaDe3Sonidos mejorada (no rehecha): rueda giratoria + sala más rica. Con esto quedan los 10 juegos de Repite la secuencia en su versión nueva; SecuenciaDe3SonidosDiferentes (trenes) está pendiente de que el usuario precise qué rediseñar.