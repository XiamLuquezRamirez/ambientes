# Une los Puntos de la Constelación

Juego de **Multisaberes → Cuenta los Objetos**, para **5-6 años**.

- Slug en BD: `une-los-puntos-de-la-constelacion`
- Ruta: `catalogo_juegos/Multisaberes/CuentaLosObjetos/UneLosPuntosDeLaConstelacion`
- Clasificación: ambiente 8, eje 20, temática 43, módulo 3 (la de su categoría)

Encaja en Cuenta los Objetos porque el niño recorre los números en orden
ascendente: la constelación es el soporte visual de un conteo del 1 al n.

El paquete es autónomo — no comparte `logica.js` ni `script.js` con ningún otro
juego — así que todos sus módulos son propios:

| Archivo | Papel |
|---|---|
| `constelacion/niveles.js` | Datos de los 5 niveles (estrellas, separación, planeta, colores) |
| `constelacion/validador.js` | Reglas de una distribución: dentro del área, sin solape, fuera de la UI |
| `constelacion/generador.js` | Poisson Disk Sampling + orden del recorrido |
| `constelacion/conexiones.js` | Qué estrella toca, si un trazo vale, conteo de errores |
| `constelacion/progreso.js` | Persistencia por nivel en localStorage |
| `constelacion/texturas.js` | Texturas generadas por código (cielo, estrellas, planetas, nave) |
| `constelacion/nave.js` | Nave y su secuencia de victoria |
| `constelacion/juego.js` | Motor: escenario, trazado, mapa de mundos |
| `constelacion-script.js` | Pegamento con el shell compartido |
| `constelacion-sfx.js` | Efectos por síntesis WebAudio |
| `constelacion.css` | HUD sobre el canvas |

Más `index.html` y `config.json` propios. No se tocó ningún archivo compartido
de `catalogo_juegos/` (shell, intro3d, final, tutorial, accesibilidad): el juego
los consume tal cual, como el resto del catálogo.

## Niveles

| Nivel | Estrellas | Separación mínima | Planeta |
|---|---|---|---|
| 1 | 4 | 300 | Azulón |
| 2 | 5 | 265 | Rojizo |
| 3 | 7 | 225 | Glacial |
| 4 | 10 | 185 | Solaris |
| 5 | 15 | 150 | Violeta |

La separación baja al crecer el número de estrellas: con 15 no cabe la holgura
que sí cabe con 4. Lo que nunca baja es el solape táctil (96 px entre centros).

## Generación de posiciones

Poisson Disk Sampling (Bridson). Cada partida genera una distribución nueva;
después se valida con `validador.js`, que es independiente del generador para
que las reglas sobrevivan a un cambio de algoritmo. Si una nube no cumple, se
regenera; cada 6 intentos fallidos se afloja la separación un 8 %, nunca por
debajo del límite táctil. El orden de los números sigue el ángulo alrededor del
centroide, para que el recorrido no se cruce consigo mismo.

El área jugable excluye la banda del HUD, de modo que una estrella no puede
caer bajo un botón.

## Interacción

Trazado continuo con puntero (ratón y táctil):

1. `pointerdown` sobre la estrella 1 la enciende y abre la cadena.
2. `pointermove` dibuja la goma elástica desde la última confirmada.
3. `pointerup` sobre la siguiente correcta confirma el tramo; sobre otra, el
   trazo se pone rojo, rebota y desaparece.

La cadena **sigue viva hasta terminar el nivel**: el niño puede levantar el dedo
entre estrella y estrella. Un error no reinicia nada — sube el contador de
errores y se continúa desde la última estrella correcta.

## Responsive

El lienzo cambia de forma según la pantalla, decidido al montar:

| Proporción | Lienzo | Caso |
|---|---|---|
| < 0.85 | 820×1280 | Móvil vertical |
| < 1.25 | 1024×1000 | Tablet casi cuadrada |
| resto | 1280×720 | Escritorio, apaisado |

Sin esto, un lienzo 16:9 con `Scale.FIT` en un móvil vertical se reduce a una
franja y las estrellas quedan en 35 px, por debajo del mínimo táctil de 44.
Con el lienzo vertical suben a 55 px. En tablet quedan en 96 px.

`touch-action: none` y `overscroll-behavior: none` evitan que el arrastre largo
se interprete como scroll.

## Progreso y paso de nivel

El avance vive **solo en memoria**: al salir del juego o recargar se empieza de
nuevo en el nivel 1. Es lo propio de una actividad de aula — cada niño que se
sienta encuentra el juego limpio, sin el avance del anterior. El módulo borra
de paso la clave que usaban versiones anteriores en `localStorage`.

Los niveles se encadenan solos, sin que el niño elija nada:

1. Completa la constelación → se ilumina entera y despega la nave (~5 s).
2. Aparece el **mapa estelar**, con el HUD en «Viajando…».
3. La nave viaja del planeta recién terminado al siguiente (~1,7 s), con estela
   y un destello al llegar. Durante el viaje los planetas no son pulsables.
4. Al aterrizar arranca el nivel nuevo.

Tras el quinto nivel, en lugar de viajar se lanza la victoria final con la
insignia. El botón MAPA sigue disponible durante el juego para consultar el
recorrido; ahí sí se puede tocar un planeta ya desbloqueado para volver a él.

`viajarAlSiguiente()` lleva un temporizador de respaldo: el aviso de llegada lo
dispara la escena de Phaser, y si esta se pausa a media animación el juego se
quedaría atascado en el mapa.

## Verificación hecha

Lógica pura en Node (`node --check` en todos los módulos y pruebas de
comportamiento):

- 750 distribuciones en apaisado y 400 en vertical: ninguna con estrellas
  solapadas, fuera del área o sobre la UI.
- 40/40 distribuciones distintas por nivel (no se repiten entre partidas).
- Caso hostil (15 estrellas en 700×400): 30 corridas en 41 ms.
- El validador rechaza de verdad solape, borde, UI y poca separación.
- Un error no borra el avance; se continúa desde la última correcta.
- Progreso en memoria: desbloqueo en cadena, y `reiniciar()` deja la partida
  limpia (es lo que hace cada entrada al juego).

En navegador (servidor estático, los 5 niveles):

- Cantidades exactas 4/5/7/10/15 y distribuciones válidas en pantalla.
- Los 5 niveles se completan y desbloquean el siguiente; victoria final con
  insignia al terminar el quinto.
- Partida completa de los 5 niveles encadenados: 4, 5, 7, 10 y 15 estrellas,
  las 4 transiciones por el mapa, **0 errores de juego y 0 excepciones en
  consola**, bucle de render vivo al terminar, y victoria final.
- El avance se pierde al recargar: tras completar los 5 niveles, una recarga
  devuelve el juego al nivel 1 limpio.
- Móvil 375×812, tablet 768×1024 y escritorio.
- Las rutas relativas (`../../../`) resuelven desde la ubicación en
  Multisaberes: shell, intro3d, sonidos, personajes y Phaser.
- La intro 3D carga el aula de Multisaberes: `ambientes-tema.js` deduce el
  ambiente de la ruta de la URL.

Los 404 de `/juegos/tts` en las pruebas son del servidor estático: ese endpoint
existe en Laravel.

## Nunca regenerar una textura en uso

Las funciones de `texturas.js` **reutilizan** la textura si la clave ya existe,
y el fondo usa una clave por nivel (`cielo-n2`, `neb-a-n2`…). No es un detalle
de rendimiento: es el fallo que dejaba el juego clavado en el nivel 1.

`generateTexture` sobre una clave existente obliga a destruirla primero, y
Phaser libera su textura de GPU aunque queden sprites o emisores de partículas
usándola. Esos objetos se quedan con `glTexture` a null y el siguiente render
lanza:

    Uncaught TypeError: Cannot read properties of null (reading 'glTexture')
        at initialize.renderWebGLStep (phaser.min.js)

Esa excepción **mata el bucle de render**. El juego se congela con la imagen
del nivel terminado: no aparece el mapa, no viaja la nave, no carga el nivel
siguiente. El estado interno sí avanza, lo que despista — el HUD puede llegar
a anunciar el nivel nuevo mientras la pantalla sigue mostrando el anterior.

La textura más peligrosa era `chispa`: se regeneraba al crear las estrellas, al
abrir el mapa y al crear la nave, con emisores vivos en los tres momentos.

## Por qué el toque no pasa por el sistema de objetos de Phaser

Las estrellas **no** usan `setInteractive()`. El toque se resuelve por
distancia al puntero en `iniciarTrazo()`, con el radio generoso de
`RADIO_AGARRE`. La razón es un fallo que dejó el juego clavado en el nivel 1:

Phaser encola los objetos que se hacen interactivos y solo los pasa a su lista
de detección en el siguiente paso del bucle. Al cambiar de nivel, las estrellas
nuevas nacían después de ese paso: quedaban en la cola mientras la lista
conservaba las del nivel anterior, ya destruidas. Resultado: **ningún toque
encontraba ninguna estrella** y no se podía avanzar.

Resolver por distancia elimina la dependencia entera. Los planetas del mapa sí
usan `setInteractive`, y para ellos queda `sincronizarDeteccion()`, que vacía
la cola en el acto.

Otras dos trampas del mismo sistema:

- **El bloque `input` reemplaza la configuración, no la amplía.** Pasar
  `input: { activePointers: 1 }` dejaba `touch: false` y el juego no respondía
  al dedo, justo en la tablet. Hay que declarar `mouse` y `touch`.
- **Soltar sobre la estrella de la que se parte no es un fallo.** Es el final
  natural de un toque simple, que es como juegan muchos niños; antes contaba
  un error injusto en cada estrella.

Nada de esto se ve disparando eventos al emisor interno (`escena.input.emit`)
con el objeto ya resuelto: ese atajo se salta justo las partes que fallaban.
Phaser además ignora los `PointerEvent` sintéticos por no ser de confianza, así
que la verificación útil es tocar en coordenadas de mundo reales o clicar de
verdad sobre el canvas.

## Pendiente conocido

- Los personajes 3D (`personajes-juego.js`) sustituyen los GIF de Zeus y Zoe.
  Si el 3D no monta, el CSS vuelve a mostrar el GIF.
- La animación de victoria se verificó por pasos y capturas; conviene mirarla
  una vez en un equipo real, donde el `requestAnimationFrame` corre a ritmo
  normal.
