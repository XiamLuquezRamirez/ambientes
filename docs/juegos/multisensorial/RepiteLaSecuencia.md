# Multisensorial / Repite la secuencia (rediseño con motor propio)

Fecha: 2026-11-17. Mismo estándar que Memoria auditiva: motor Phaser propio por juego sobre `MemoriaAuditiva/comun/kit.js`,
4 niveles, fondo vivo, presentador 3D, escena final propia e insignia. Fallback: las tarjetas DOM originales si el motor no monta.

| Juego | Edad | Mundo / gesto | Archivo |
|---|---|---|---|
| DosSonidos | 3-4 | **«¡El capitán soy yo!»**: el niño MANEJA el barco con el dedo por un mar que avanza (boyas que suenan al chocarlas, monedas, rocas, remolinos). Recoge las boyas en el orden que sigue la canción del loro; quedan atadas detrás del barco. Con la canción completa llega la isla y se atraca en el muelle. 4 niveles = mañana, mediodía, atardecer, noche. Final: cofre, fuegos artificiales y las boyas tocando en fila | `capitan.js` |
| DosInstrumentos | 3-4 | **«El globo de la orquesta»**: globo aerostático que sube/baja con el dedo por 4 paisajes (aldea al amanecer, montañas nevadas, cañón al atardecer, noche con aurora). Se atrapan globos-regalo con instrumentos en el orden de la canción; cada acierto suma un músico a la orquesta del escenario, que toca la melodía. Tormentas y aves, aterrizaje en pista, final con fuegos | `globo.js` |
| TresSonidos | 3-4 | **«El taller del duende»**: construir con física real (Matter). Una cinta trae bloques de madera con animal/instrumento; se apilan en el pedestal en el orden de la canción (de abajo hacia arriba). Los bloques se tambalean y caen; cada piso bien puesto se ilumina (bombillas de progreso), el equivocado se marca en rojo y se puede sacar. 4 niveles con formas más difíciles (cubos, tablones, altos, pequeños). Final: la torre toca como xilófono | `taller.js` |
| SecuenciaConDistractor | 3-4 | **«Safari fotográfico»**: el niño maneja el visor de una cámara (con lente de aumento real: segunda cámara de Phaser) por un desfile de animales; un letrero muestra los INVITADOS y hay que fotografiar al INTRUSO (enfoque automático al mantener el visor quieto o disparo al levantar el dedo). Álbum de polaroids con estrellas. 4 lugares: sabana, selva, laguna, noche con luciérnagas. Final: foto de grupo con cuenta atrás | `safari.js` |
| GranSecuenciaFinal | 3-4 | «Arcoíris»: atrapar nubes que derivan, cada acierto pinta una banda | `arcoiris.js` |
| SecuenciaDe3Sonidos | 5-6 | «Caja fuerte»: marcar el código en un teclado, la puerta se abre | `cajafuerte.js` |

| SecuenciaDe3SonidosDiferentes | 5-6 | **PILOTO nuevo** «Concierto de luciérnagas»: repetir un RITMO en tiempo real (golpes, silencios; tambor y campana). Se compara la forma, no el tempo | `ritmo.js` |
| SecuenciaDe4Sonidos | 5-6 | **PILOTO nuevo** «Robot programado»: cada sonido es una ORDEN (↑→↓←); se oye el programa y se toca A DÓNDE llegará el robot | `robot.js` |
| SecuenciaConCambio | 5-6 | «Mesa del DJ»: tras acertar la mesa se mezcla y suena otra secuencia | `dj.js` |
| ElGranCodigoSecreto | 5-6 | «Torre»: arrastrar bloques, la torre se tambalea y sube la bandera | `torre.js` |

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
