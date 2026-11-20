# ¡El Pinball de Gravedad Mágica!

**Tema**: coordinación visual, seguimiento de objetos, anticipación, reacción rápida y coordinación ojo-mano.
**Edad**: 5-6 años (transición).
**Carpeta**: `public/catalogo_juegos/Polimotor/PinballGravedadMagica/`
**Slug**: `pinball-gravedad-magica` · eje 17 · temática 34 (coordinación visual) · módulo 9 · orden 34 · color `#b197fc`.
**Creado**: 2026-11-20.

## Qué hace el niño

Una bola de energía entra por la parte alta de una mesa de pinball arcade y baja rebotando en
bumpers, dianas y rampas. El niño toca **TOCA IZQUIERDA** o **TOCA DERECHA** para accionar la
palanca de ese lado y devolver la bola hacia arriba antes de que caiga por el hueco del fondo.
Tres rondas, cada una con más velocidad y más elementos activos.

En escritorio también valen **←/A** (izquierda) y **→/D** (derecha), y tocar la mitad izquierda o
derecha del propio tablero.

## Diseño (según la imagen de referencia)

Rehecho el 2026-11-20 porque la primera versión no se parecía a la referencia. Ahora sigue su
disposición: campamento nocturno de fondo (luna, tiendas naranja y verde, guirnalda de luces),
título de colores arriba, **Inicio** y la pastilla **5-6 años** arriba a la izquierda,
**Reiniciar** arriba a la derecha, marcador LED de 8 dígitos sobre la cabecera, máquina arcade
inclinada en perspectiva con bumpers tipo hongo en arco, aro dorado de energía al centro,
rebotadores triangulares cian y amarillo sobre las palancas, luces de carril de colores, bola
rosa de energía, botones arcade redondos rojo (izquierda) y amarillo (derecha) con su rótulo, Zoe a
la izquierda (explica) y Zeus a la derecha (avisa «¡Ahí viene por la izquierda!»). En la
presentación se rotulan «Palanca Izquierda», «Palanca Derecha» y «Esfera Metálica de Energía».

### Cambios pedidos después (2026-11-20)

- Sin título del juego y sin la pastilla «5-6 años» en la partida.
- **Reiniciar y Volver juntos arriba a la derecha** (Volver a la derecha de Reiniciar).
- **Zoe y Zeus son los modelos 3D** (`guia-3d.js`, `nina.glb` y `nino.glb` de la intro), no GIF:
  saludan al aparecer, hablan con su voz, Zeus señala al avisar, celebran aciertos, rondas y final.
- **Cielo vivo** (`fondo.js`, lienzo a pantalla completa): nebulosas, vía láctea, tres capas de
  estrellas que titilan y se desplazan, estrellas fugaces, aurora, luna, montañas, pinos, tiendas
  con farol, fogata con chispas, luciérnagas y guirnalda de bombillos. **Reacciona al juego**:
  bumper → la aurora toma su color y los bombillos corren; diana → ráfaga de fugaces; aro → onda
  dorada; golpe de palanca → fugaz desde ese lado; racha → aurora más intensa; aviso → las
  luciérnagas van a ese lado; caída → el cielo se oscurece y la fogata baja; ronda → fuegos
  artificiales; final → fuegos continuos y bombillos en arcoíris.

- **Tubos laterales de energía** (uno a cada lado, por fuera de las paredes, sobre el mueble):
  la bola ya no aparece de la nada. Un lanzador con resorte al pie la dispara, sube por el tubo de
  cristal (anillos de neón que se encienden a su paso, energía que corre por dentro), rodea la
  cabecera y cae a la mesa por la boca (~1,1 s). Alterna de lado. El recorrido lo define
  `reglas.js` (`puntoTubo`, `geometriaTubo`) y lo usan la física y el dibujo. Mientras la bola va
  por el tubo no hay golpe de palanca ni avisos. Eventos `tubo` y `salidaTubo`. No es un carril
  físico junto a la pared: ese pasillo atrapaba la bola en la primera versión.

- **Consola frontal acoplada**: los botones arcade ya no flotan sueltos. Van empotrados en una
  consola del mismo violeta metálico que el mueble, con riel de neón y luces al centro, pegada al
  borde inferior de la mesa y con su mismo ancho. `acomodar()` en `script.js` la mide y la coloca
  tras cada cambio de tamaño; la mesa deja libre `--alto-consola` abajo para que no tape las
  palancas ni los lanzadores de los tubos.

- **Como los demás juegos, Zoe solo entra para la demo** (`guia-3d.js`, `nina.glb`): llega
  caminando por la izquierda, presenta, narra la demo y sale caminando antes de «¡Comenzar a
  jugar!». Al salir se destruye su WebGL (`dispose` + `forceContextLoss`). Durante la partida no
  hay personajes: lo que dicen Zoe y Zeus sale en una **nube con su ícono** (Zoe a la izquierda,
  Zeus a la derecha). Los íconos `icono-zoe.png` / `icono-zeus.png` son retratos sacados de los
  propios modelos `nina.glb` y `nino.glb`. Trampa: el clip `Caminar` trae avance de raíz
  (`raiz.position` hasta 1,6 de lado y 4,2 de fondo); se anula en X/Z o Zoe queda corrida.
- **Botones en paneles de esquina** como en la referencia: cada botón centrado en su panel
  inclinado, rótulo debajo, y el pie de la máquina con luces en medio.
- **Modo ligero** (tabletas de 4 GB): se activa por `navigator.deviceMemory <= 4`, 4 núcleos o
  menos, pantalla táctil, o si los cuadros superan ~24 ms en promedio. Mesa a 1× sin sombras
  difuminadas; cielo a 30 cuadros, al 75 % de resolución y con cielo/nebulosas/luna horneados.
  En todos los modos lo fijo de la mesa (mueble, tablero, rieles, cristal de los tubos) se pinta
  una sola vez en una capa (`construirCapa`).

## Decisión de arquitectura: canvas 2D dentro del cascarón de siempre

- **Cascarón estándar, intacto**: portada, intro 3D compartida de Zeus y Zoe (se arranca con el
  evento `intro3d-start`, Omitir / CONTINUAR como en Tiro), `PedniaEdad`, botones comunes de
  `comun/interfaz.css`, `comun/volumen.js` y `#comenzar-wrap`.
- **Partida 100 % canvas 2D vanilla**: ni Phaser ni three.js tocan la mesa. El lienzo contiene
  solo la máquina (fondo transparente) y CSS lo inclina con `perspective` + `rotateX(24deg)`: la
  cabecera queda lejos y estrecha. Los volúmenes se extruyen hacia −Y en el lienzo (que en
  pantalla es "hacia arriba") y proyectan sombra hacia +Y. `mesa.js` mide la caja ya
  transformada para que la mesa inclinada quepa sin deformarse.

Errores de la primera versión que ya no deben repetirse: la portada sin `position: fixed; inset: 0`
(ocupaba media pantalla) y una llamada a una API de intro que no existe (`IntroPednia`), que hacía
saltar la intro sin aviso. La intro compartida se arranca con `intro3d-start`.

## Archivos

| Archivo | Papel |
|---|---|
| `index.html` | Cascarón común + `<canvas id="mesa">` + los dos controles de palanca |
| `config.json` | Datos: física, rondas, bumpers, dianas, rampas, flippers, textos y voces |
| `reglas.js` | **Decisión**: física 2D pura (gravedad, rebote, colisiones, antiatasco), puntaje y fin de ronda. Sin DOM, exportable a Node |
| `mesa.js` | **Dibujo**: la máquina en canvas 2D (inclinada por CSS), partículas, rótulos y celebración |
| `fondo.js` | Cielo animado del campamento que reacciona a los eventos (`FondoPinball.evento`) |
| `guia-3d.js` | Zoe y Zeus en 3D a los lados (`Guias3D.hablar/gesto`) |
| `sonidos.js` | Web Audio sintetizado, sin archivos externos. Global `SonidosPinball` |
| `demo.js` | Demostración automática (dos golpes, uno por lado) |
| `script.js` | **Flujo**: pantallas, rondas, avisos, ayuda, final |
| `style.css` | Estilo propio; los botones de control los pinta `comun/interfaz.css` |
| `pinball-gravedad.png` | Icono 256×256 (`juegos.imagen`) |

## Geometría de la mesa (y por qué es así)

El tablero mide **1000 × 1600** en unidades propias, con cabecera en arco; `mesa.js` lo escala e
inclina sin deformarlo. La geometría costó varias correcciones, todas por el mismo motivo: **cualquier pasillo
estrecho se convierte en una trampa donde la bola baja sin que el niño pueda hacer nada**.

- **No hay carril de lanzamiento.** La primera versión tenía el carril clásico de pinball pegado a
  la pared derecha. La bola bajaba por ese pasillo de ~68 px sin tocar un solo bumper, partida tras
  partida. Ahora la bola **entra directamente por arriba**, alternando lado y con algo de variación.
- **Los embudos terminan exactamente en el pivote de cada palanca**, nunca más abajo: si los
  sobrepasan, forman una cuña con la palanca donde la bola queda encajada.
- **Las rampas van por encima del embudo**, no paralelas a él, por la misma razón.
- **El hueco entre las puntas de las palancas** es de ~110 px para una bola de 52 px de diámetro:
  pasa, pero hay que fallar para que pase.
- **Bumpers y dianas tienen que estar dentro del alcance real de un golpe.** Un golpe ideal sube la
  bola hasta y≈690; con los bumpers más arriba, el niño nunca veía un rebote. Dos veces hubo que
  bajarlos. La prueba `la bola golpea bumpers jugando de verdad` fija esto.

## Conducta con el niño (lo que el enunciado pide y no se debe "mejorar")

- **Tocar la palanca lejos de la bola no castiga**: la palanca se mueve igual, suena suave y no
  resta nada. Es un error de coordinación, no una falta.
- **Caer no reinicia la partida**: animación amable, voz de Zoe («¡Uy! Vamos a darle otra
  oportunidad.») y relanzamiento automático. Sin vidas y sin puntaje negativo.
- **Los avisos llegan antes**: «¡Viene por la izquierda!» se calcula proyectando dónde estará la
  bola cuando alcance la altura de las palancas, nunca después de que haya pasado.
- **Antiatasco invisible**: detecta dos casos, la bola casi parada y la bola que se agita en una
  bolsa sin desplazarse, y le da un empujón suave que el niño no percibe como penalización.

## Audio

Todo sintetizado en `sonidos.js` (sin archivos): lanzamiento, rodadura continua según velocidad,
rebote, impacto metálico, bumper (cada uno con su nota, así los rebotes suenan musicales), diana,
palanca izquierda y derecha —distintas a propósito—, caída, rescate, punto, estrella, victoria y
música ambiental.

El módulo arma un bus único con compresor, así que implementa `volumenFondo(pct)` y
`volumenEfectos(pct)` para que `comun/volumen.js` separe los dos canales
(ver [`docs/juegos-volumen-polimotor.md`](../../juegos-volumen-polimotor.md)). Se llama
`SonidosPinball` para que `volumen.js` lo encuentre por su patrón `/^Sonidos[A-Z]/`.

## Cómo probar

```
node scripts/probar-pinball-gravedad.js
```

34 pruebas que corren la física real en Node: config y textos literales del enunciado, marcado
común del `index.html`, y jugabilidad — que la bola no se escape, no baje pegada a una pared, no se
atasque, alcance los bumpers en las tres rondas, que la palanca la devuelva, que fallar no castigue
y que la demo acierte sus dos golpes.

En navegador, con el servidor estático `juegos-estatico` (puerto 8010):

```
http://localhost:8010/catalogo_juegos/Polimotor/PinballGravedadMagica/index.html
```

Para saltar portada e intro: `document.getElementById('pantalla-inicio').hidden = true;
document.body.classList.remove('esperando-inicio');
document.getElementById('principal').classList.add('visible'); window.__pinball.irARonda(0);`

`window.__pinball` expone `estado()`, `fase()`, `golpear(lado)`, `irARonda(i)` y `forzarFinal()`.

Probado a 1366×768 y 1024×768. Los 404 de `/juegos/tts` en el servidor estático son los esperados.

## Registro

Fila en la tabla `juegos` de la BD local y la misma fila en `database/ambientes.sql`. Sin SQL
aparte (el enunciado lo pedía así). La edad **no** va en la base: sale de
`config.json` → `niveles[].edad`.

- **Los rebotadores empujan casi en horizontal**, hacia las palancas. Con empuje hacia arriba los
  dos triángulos se pasaban la bola de uno a otro para siempre.
- **El bucle tiene respaldo por intervalo** cuando `requestAnimationFrame` deja de llegar más de
  120 ms (el panel del navegador lo congela aunque la página diga estar visible).

## Pendientes

- La celebración final tarda ~12 s hasta el panel cuando no hay TTS, porque `hablar()` cae al
  respaldo por tiempo. Con voz real es más corta.
- No probado en tableta física, solo con viewport emulado.
