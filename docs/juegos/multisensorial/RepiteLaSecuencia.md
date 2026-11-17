# Multisensorial / Repite la secuencia (rediseño con motor propio)

Fecha: 2026-11-17. Mismo estándar que Memoria auditiva: motor Phaser propio por juego sobre `MemoriaAuditiva/comun/kit.js`,
4 niveles, fondo vivo, presentador 3D, escena final propia e insignia. Fallback: las tarjetas DOM originales si el motor no monta.

| Juego | Edad | Mundo / gesto | Archivo |
|---|---|---|---|
| DosSonidos | 3-4 | «Rayuela del jardín»: tocar casillas, la mariquita salta | `rayuela.js` |
| DosInstrumentos | 3-4 | «Escenario de la banda»: golpear instrumentos, notas en el pentagrama | `banda.js` |
| TresSonidos | 3-4 | «Casitas del bosque»: arrastrar al pajarito cartero | `casitas.js` |
| SecuenciaConDistractor | 3-4 | «Cohete»: arrastrar cápsulas (hay un distractor) a los compartimientos | `cohete.js` |
| GranSecuenciaFinal | 3-4 | «Arcoíris»: atrapar nubes que derivan, cada acierto pinta una banda | `arcoiris.js` |
| SecuenciaDe3Sonidos | 5-6 | «Caja fuerte»: marcar el código en un teclado, la puerta se abre | `cajafuerte.js` |

| SecuenciaDe3SonidosDiferentes | 5-6 | «Ruleta de la feria»: tocar cabinas al pasar, tablero de aciertos | `ruleta.js` |
| SecuenciaDe4Sonidos | 5-6 | «Fábrica»: tocar piezas en la cinta, saltan a la caja | `fabrica.js` |
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
