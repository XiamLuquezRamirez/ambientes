# El Memorama de las Partes del Cuerpo (`public/catalogo_juegos/Polimotor/MemoramaPartesCuerpo/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (2026-11-12), Prejardín 3-4 años, temática 31 "Juegos de memoria corporal", juego 1 de la serie.
Memoria visual en **3 rondas, todas de 4 tarjetas en 2 × 2** (2 parejas). Cuarto de juegos mágico (SVG en
`index.html`: pared lila y durazno, guirnalda de estrellas que se mece, huellitas de manos y pies pintadas en la
pared a los lados, tapete) y en el centro un **tablero de corcho** (Phaser: marco de madera, corcho moteado,
calcomanías de estrellas fuera de la zona de las tarjetas, brillos que flotan). Cada tarjeta cuelga de una chinche
roja. Reverso: azul mágico con estrella sonriente, luna y borde punteado dorado. Cara: dibujo grande y el nombre en
una cinta con su color (MANO rosa, PIE turquesa…).

**Pedido del enunciado**: durante la partida sin Zoe ni Zeus en la escena (solo se oyen). Solo computador y tableta,
sin diseño para teléfonos.

**Pedidos del usuario (2026-11-12, después de la primera versión):**
- **3 rondas, todas con 4 tarjetas** (primero se hizo 4, 6 y 8 tarjetas; el usuario lo corrigió). Cada ronda tiene un
  grupo de partes y en cada partida se sortean 2 (`config.rondas[i].partes`, `ReglasMemorama.ronda(cfg, i, rnd)`):
  ronda 1 mano y pie · ronda 2 dos de ojos/nariz/boca · ronda 3 dos de oreja/cabeza/brazo/pierna.
- **Más partes del cuerpo reutilizando dibujos de Polimotor**: ojos, nariz, boca, oreja (`orejas`), cabeza, brazo,
  pierna (y cuello, sin usar) copiados de `UnePartesCuerpo/iconos.js` a un bloque propio de `iconos.js` (con sus
  colores). Mano y pie son los dibujos propios de este juego.
- **"Faltaba la intro" y la dice Zeus**: presentación y demostración narradas por Zeus, con **Zeus 3D** (`guia-3d.js`,
  copia del de "¿Dónde lo uso?" con `nino.glb`) que entra caminando, se para a la izquierda de las tarjetas con su
  nube de texto y se va caminando antes de "¡A jugar!". En la partida no está.

## Flujo

Inicio → intro 3D compartida → `PedniaEdad` → **presentación** (cartel "¡EL MEMORAMA DEL CUERPO!", Zeus 3D entra
caminando y dice "¡Bienvenido al Memorama del Cuerpo!…", las tarjetas caen boca abajo y se iluminan por turnos) →
**demostración** (`demo.js`, si "Mostrar intro"): la mano de PedniaTutorial voltea una mano y un pie ("no son
iguales: se vuelven a esconder"), luego "yo recuerdo dónde estaba la mano" y voltea las dos manos → pareja dorada
con aplausos → "¡Así se juega! Ahora te toca a ti." → todo se cierra → Zeus se va → "¡A jugar!" → **ronda 1**.

Cada ronda: (desde la 2) cartel "RONDA n" y la voz nombra sus partes ("Busca los ojos y la nariz"), el cartel se
va → **vista previa** (estado `preview`): las cuatro se voltean, cuenta 3-2-1 (`previaMs` de la ronda, 3000),
aviso "¡MIRA Y RECUERDA!" en la barra de abajo (un cartel sobre el tablero tapaba las tarjetas) → se cierran →
partida → "¡RONDA n LISTA!" con confeti → las tarjetas se cierran (`reiniciar`) → ronda siguiente. Abajo, cinta
"RONDA n/3" + "PAREJAS ENCONTRADAS: n/2" + dos círculos con los dibujos de la ronda.

- **Volteo**: tween de `scaleX` 1 → 0 → 1 con un leve levantamiento; la textura cambia a mitad (de canto), así la
  ilustración nunca queda invertida. Suena un soplido (Web Audio) y la voz dice "¡Mano!" o "¡Pie!".
- **Pareja distinta** (`checking`): las dos se ven `errorVisibleMs` (2 s), balanceo pequeño, dos notas graves
  suaves (`suave`), se cierran y Zeus dice "¡Recuerda dónde estaba la mano/el pie y busca su pareja idéntica!". Sin
  vidas, puntos ni mensajes negativos.
- **Pareja correcta** (`matched`): halo y marco dorados, estallido de estrellas, acorde alegre, queda abierta y se
  llena su espacio en la barra ("PAREJAS ENCONTRADAS: n/2" + dos círculos con el dibujo, gris → dorado con estrella).
  Manos: **tres aplausos** (las tarjetas se aprietan, rayitas de palmada y sonido de palmada). Pies: **huellitas
  turquesa** que caminan alrededor de las dos tarjetas y las tarjetas dan pasitos (también la pierna). Las demás
  partes: dos saltos con chispas.
- **Final** (tras la ronda 3): las cuatro bailan en ola, lluvia de estrellas, confeti (`PedniaFx`), Zoe "¡SÚPER
  MEMORIA! Encontraste las dos manos y los dos pies, ¡y también …!" (las partes que salieron) y Zeus "¡Tienes unos ojos de superdetective!" → tarjeta "¡LO LOGRASTE!
  / Encontraste todas las parejas del cuerpo." con los dibujos de las 6 parejas, **Volver a jugar** (vuelve a la
  ronda 1 sin intro, con otro orden y otras partes en las rondas 2 y 3) y **Continuar** (victoria compartida `../../final`).
- **Ayuda** sin revelar respuestas: sin tocar nada 10 s → "¡Toca una tarjeta para voltearla!"; con una abierta 7 s →
  "¡Ahora toca otra tarjeta!…"; las tarjetas cerradas se menean. Se repite cada 14 s, como mucho 3 veces seguidas.
- **Bloqueos** (reglas.js): solo 2 tarjetas por turno, nada durante la vista previa ni al comparar, ni la misma
  tarjeta dos veces, ni una pareja ya encontrada (suena un tic y "¡Esa ya tiene su pareja!"). Cada partida lleva
  `partidaId`: lo que termina después de un reinicio no toca la partida nueva.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasMemorama` | Puro (también `module.exports`): estados `preview → waiting → firstCard → secondCard → checking/matched → waiting/completed`; `rondas`, `ronda(cfg, i, rnd)` (sortea 2 partes del grupo), `crear` (reparte 2 + 2 al azar, distinto del orden anterior), `iniciar`, `tocar`, `comparar` (por `id`, nunca por el texto), `terminarTurno`, `progreso`, `cerradas`, `plantilla`, `listaPartes`, `revisarConfig`, `revisarJuego`. |
| `iconos.js` | `IconosMemorama` | Mano y pie propios (SVG 200 × 200, contorno de calcomanía) + copia de las partes de "Une" (SVG 120 × 120). `dataUri(id)` para la barra y la felicitación. |
| `sonidos.js` | `SonidosMemorama` | Web Audio sin archivos: `volteo`, `acorde`, `suave`, `aplauso`, `paso`. |
| `escenario-phaser.js` | `EscenarioMemorama` | Tablero, tarjetas (contenedores `ext` → `cuerpo` → `volteo`), entrada, `voltear`, `cuenta`, `pareja`, `aplausos`/`huellas`, `celebrarFinal`, `reiniciar`, resaltado con el cursor, `puntoCarta(i)`. |
| `demo.js` | `MemoramaDemo` | Demostración con la mano (pareja distinta y luego pareja igual), narrada por Zeus. |
| `guia-3d.js` | `Guia3D` | Zeus 3D (`nino.glb`) de la presentación y la demo; camina (`caminar`, `mirar`). |
| `script.js` | — | Flujo, Zeus en escena (`zeusEntra`/`zeusSale`, `hablaZeus`, `zonaGuia`), rondas (`empezarRonda`, `siguienteRonda`), voces, progreso, ayudas, final, menús. |
| `memorama.png` | — | Icono del catálogo (256 × 256, hecho con las texturas del juego). |

Catálogo de partes, rondas, textos y tiempos en `config.json` (`partes`, `rondas`, `juego`, `textos`). Parte nueva:
dibujo en `iconos.js` + entrada en `partes` + su id en el grupo de una ronda.

## Probar

- `node scripts/probar-memorama-partes-cuerpo.js` (19 pruebas: 3 rondas de 4 tarjetas, sorteo dentro del grupo y
  que salgan todas las partes, dibujos copiados de Une, siempre 2 + 2, las 6 posiciones, reinicio con orden
  distinto, bloqueos, pareja correcta/incorrecta, ronda completa, textos pedidos).
- En el navegador: `EscenarioMemorama.puntoCarta(i)` da el centro de la tarjeta en pantalla; `mousedown` en el canvas
  y `mouseup` en `window`. `st` (estado) y `ReglasMemorama.orden(st)` dicen dónde está cada tarjeta.
- Probado (2026-11-12) a 1366 × 768, 1024 × 768 y 768 × 1024 con el ratón: presentación, vista previa, volteo,
  pareja incorrecta (2 s y se cierra; una tercera tarjeta no se abre), manos, pies, felicitación, Volver a jugar
  (orden nuevo distinto) y Continuar. Con las rondas (mismo día, 1366 × 768 y 1024 × 768): intro con Zeus 3D y
  demo completa, las 3 rondas jugadas con clics, felicitación con 6 dibujos y Volver a jugar a la ronda 1. El táctil no se pudo emular (Phaser no activa el táctil sin pantalla táctil):
  falta probarlo en una tableta real.

## Registro

Fila en `database/ambientes.sql`: slug `memorama-partes-cuerpo`, ambiente 7, eje 11, temática 31, módulo 9,
orden 17, imagen `memorama.png`, color `#7048e8`. Aplicado en la base local y el catálogo lo lista para 3 y 4
años, no para 5.

## Pendiente

- Probar el toque en una tableta real.
- Sin commit.
