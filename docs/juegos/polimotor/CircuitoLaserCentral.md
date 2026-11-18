# El Circuito Láser de la Central de Energía

Polimotor · Transición (5-6 años) · Eje *Coordinación y orientación* (Juego 1) · Temática 32 *Laberintos de coordinación*
Carpeta: `public/catalogo_juegos/Polimotor/CircuitoLaserCentral/`
Slug: `circuito-laser-central-energia` (ambiente 7, eje 17, temática 32, módulo 9, orden 26, imagen `circuito-laser.png`, color `#0ea5e9`)

El niño arrastra una esfera de luz neón por un carril estrecho con paredes de metal, desde la salida hasta el
reactor central de una central de energía. En el camino hay barreras láser que se encienden y se apagan con su propio
ciclo: hay que detenerse, mirar el contador 3, 2, 1 y pasar cuando el rayo se apaga. Habilidades: coordinación
visomotora, control del pulso, precisión, orientación espacial y anticipación temporal.

## Pedidos del usuario (2026-11-18)

- Sin rama nueva y **sin otro archivo SQL**: una sola fila nueva en `database/ambientes.sql` (orden alfabético) y la
  misma en la BD local.
- Guía de estructura: `docs/juegos/polimotor/estructura.md` + el hermano de recorrido más reciente (La Ardilla); no
  leer todos los juegos de Polimotor.
- Pruebas **solo en escritorio y tableta horizontal**.
- Personaje en pantalla (presentación, demo y final) **al azar entre Zoe y Zeus** en cada partida (`GUIA` en
  `script.js`; `guia-3d.js` carga `nina.glb` o `nino.glb`); nunca el mismo tres partidas seguidas (`localStorage`
  `circuitoLaserGuias`). El otro personaje solo se oye. Las voces durante la partida también se sortean (`vozAzar`).
- Interfaz: título centrado; Inicio y reiniciar arriba a la derecha; nivel abajo a la izquierda; accesibilidad y
  volumen abajo a la derecha. Edad visible **5-6 años**.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasLaser` | Puro (`module.exports`). Construye el circuito desde puntos normalizados (esquinas redondeadas, remuestreo), `mover` (inercia, velocidad máxima, sub-pasos, pared, rayo, meta), ciclo de láseres, retroceso, `validar` y `simular`. |
| `sonidos.js` | `SonidosLaser` | Web Audio: zumbido de la esfera (según velocidad), crepitar de láseres (según cercanía), láser on/off, aviso, tic 3-2-1, choque suave, impacto, regreso, cruce, panel, aparece, conexión, éxito, fanfarria, fiesta; música `intro` / `central` / `final`. |
| `escenario-phaser.js` | `EscenarioLaser` | Central (paredes con placas, rejilla en perspectiva, tuberías con pulsos, tiras de luz, paneles con pantallas, polvo), velo que se aclara con el avance, circuito (sombra, metal, neón, flechas, estela), barreras (emisores, lámparas, rayo, chispas, placa 3-2-1), reactor (ventana, anillos, medidor), esfera, final. |
| `arrastre.js` | `ArrastreEsfera` | Ratón y dedo (primer puntero) con `mundoDeJuego`. Soltar deja la esfera quieta. |
| `demo.js` | `CircuitoDemo` | Mano que lleva la esfera; se detiene ante cada láser encendido, espera el 3-2-1 y cruza; llega al reactor. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copia del módulo de la Ardilla). |
| `script.js` | — | Flujo, voces, ayudas, eventos, niveles, final y resumen. |
| `circuito-laser.png` | — | Icono 256×256 (SVG propio rasterizado con Edge sin interfaz). |

## Mecánica (`reglas.js` + `config.json → juego`)

- Carril: `ancho` y `radio` de la esfera por circuito. Choque con la pared cuando el centro de la esfera pasa
  `ancho/2 − radio + toleranciaPared·radio`. La búsqueda del punto del centro es local (`sRef ± ventana`): en los
  zigzag la esfera no salta al carril vecino a través de la pared.
- Pared: chispas, vibración y rayitos; la esfera se desliza `retrocesoPared` (0,4 anchos) hacia atrás por el centro.
  Si el dedo sigue apoyado, la esfera se vuelve a tomar donde quedó (no hace falta levantar el dedo).
- Láser: `enc` / `apag` ms y `fase`. El contador 3-2-1 son los últimos 3 s del encendido; lámpara ámbar 1,2 s antes de
  encender. Un rayo nunca se enciende con la esfera dentro (espera a que salga). Tocarlo encendido: impacto, onda
  roja y retroceso `retrocesoLaser` antes de la barrera; el láser sigue su ciclo.
- Aproximación (`distanciaAviso` anchos antes de un rayo encendido): triángulos de aviso, placa más grande; Zeus la
  primera vez "¡Calcula el tiempo! …", luego "¡Espera a que el rayo rojo se apague!" (cada `vozLaserMs`).
- Nada se pierde: el avance máximo (`maxS`) queda iluminado y alimenta el reactor y la luz de la central.

| Nivel | ancho | radio | curva | tramos | láseres (enc/apag ms) |
|---|---|---|---|---|---|
| 1 Aprendiz de energía | 132 | 30 | 0,95 | 5 | 1 (4000/4400) |
| 2 Ingeniero de precisión | 114 | 28 | 0,6 | 11 | 2 (4000/3200 y 5000/2800) |
| 3 Maestro de la central | 102 | 26 | 0,5 | 13 | 2 (4500/2600 y 3600/2400) |

Demo: circuito propio con dos láseres (`demoCircuito`). El mundo es 1600 de ancho y 800-1100 de alto según la
pantalla; los puntos son normalizados, así que el mismo circuito se estira en vertical.

## Flujo

Inicio → intro 3D (conversación Zoe/Zeus) → `PedniaEdad` → presentación (cartel, Zoe entra, el circuito se enciende
de la salida al reactor, la esfera aparece; Zoe: "¡Alerta de precisión…") → demo automática → Zoe sale →
"¡Comenzar a jugar!" → por nivel: barrido de luz, circuito nuevo, cartel, la esfera aparece, instrucción → al llegar la
esfera entra al reactor, se carga, la central se ilumina, cartel con el logro → final: barreras apagadas en verde,
pulsos por las tuberías, paneles uno a uno, gran onda de energía, fuegos; Zoe "¡SÚPER CONTROL! …" → resumen
(¡NIVEL COMPLETADO!, barra 3 de 3, miniatura, barreras y tiempo de cada circuito, ¡JUGAR OTRA VEZ!, CONTINUAR).

## Cómo probar

- `node scripts/probar-circuito-laser-central.js`: config, textos literales, index, ciclo de láseres, circuitos en 4
  altos de mundo (válidos; esfera cuidadosa sin choques; apurada choca y llega; desviada no sale del carril),
  movimiento en las 4 direcciones y bloqueo del rayo. Resultado: 181/181.
- Navegador: servidor estático `juegos-estatico` (8010). Arrastre con `PointerEvent` + `MouseEvent` sobre el canvas,
  en coordenadas de `EscenarioLaser.aPantalla(ReglasLaser.puntoEn(EscenarioLaser.circuito(), s))`.
- Probado (2026-11-18) a 1366×768, 1024×768 y 1920×1080: presentación, demo (espera ambos láseres), nivel 1 con dos
  choques contra el rayo encendido, niveles 2 y 3 completos, choque con la pared, final, resumen, jugar otra vez,
  accesibilidad y volumen. Sin errores de JavaScript (solo 404 de `/juegos/tts`, normal en el servidor estático).

## Trampas

- En pruebas automáticas, no capturar `EscenarioLaser.circuito()` en una variable entre niveles: la geometría cambia
  y el puntero simulado iría por el circuito anterior (parece que la esfera choca sola).
- Lo que se repinta cada cuadro (láseres, flechas, neón) usa `visCirc` para desvanecerse; cambiar `alpha` a mano no
  basta.

## Pendientes

- El táctil real solo se puede comprobar en una tableta física.
- Las voces dan 404 en `/juegos/tts` con el servidor estático; probar con Laravel para oírlas.
