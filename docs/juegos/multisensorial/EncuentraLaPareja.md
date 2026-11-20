# Multisensorial / Encuentra la pareja — los 4 primeros (3-4 años, «El mural mágico»)

Fecha: 2026-11-18. Ya eran juegos con motor Phaser propio y 3-4 rondas (ver `docs/juegos-escenas-animadas.md`); se les sumó el estilo nuevo sin tocar su mecánica.

| Juego | Escena | Rondas (⭐ = nivel) |
|---|---|---|
| ConQueSentidoSentimosLaCampana | glorieta (`concierto.js`) | ⭐1 la campana · ⭐2 globos · ⭐3 ¿quién suena? · ⭐4 concierto |
| ConQueSentidoSentimosLaFlor | jardín (`jardin.js`) | ⭐1 el ramo · ⭐2 atrapa el aroma · ⭐3 arbustos · ⭐4 **La brisa** (nueva: empujar con el dedo el aroma hasta la nariz) |
| ConQueSentidoSentimosElHelado | paseo marítimo (`heladeria.js`) | ⭐1 el helado · ⭐2 sabores · ⭐3 ¿qué se saborea? · ⭐4 **Lengüetazos** (nueva: tocar las gotas del helado antes de que caigan) |
| ConQueSentidoSentimosElSol | lago de montaña (`amanecer.js`) | ⭐1 el sol · ⭐2 nubes · ⭐3 la noche · ⭐4 **Los girasoles** (nueva: llevar el sol hasta cada flor para que abra) |

## Estilo nuevo (opt-in: `crearMotor({ extras: true })`)
`comun/extras.js` (`PedniaParejaExtras`, lo monta `base.js` solo si el juego lo pide): marcador de 4 estrellas del diseño (a la izquierda de los botones), cartel de
nivel con estrellas entre rondas, presentador 3D (Zoe; `AsociaPj3D`, módulo cargado en el index) que saluda, celebra al acertar y dice «no» al equivocarse (lo dispara
el `ctx.decir` de la escena), insignia del config bajando girando tras la fiesta final y capa 3D apagada al terminar. Cada `jugar()` llama `await this.ganarNivel(i)`.
Los botones Reiniciar/Salir usan `Multisensorial/botones-hud.css`. En la demo solo aparece el personaje del tutorial, mediano (lo resuelve `personajes3d.js`).
Jardín: mariposas del diseño (`img/mariposa1-5.svg`, cargadas con tamaño) en lugar de las dibujadas. Sol: se corrigió que el brillo de la noche no se apagaba al amanecer.

## Cómo probar (solo horizontal)
`PedniaTutorial.mostrarIntroActiva = () => false` y `setInterval(() => PedniaJuego.escena().game.loop.step(performance.now()), 16)`. Para el bot: `mousedown`/`mousemove`/**`mouseup` sobre el canvas del juego**
(`#<id>-canvas canvas`), no sobre `window`. `PedniaJuego.estado()` da posiciones; las rondas nuevas se pueden lanzar directo (`escena().rondaBrisa()`, `rondaLengua()`, `rondaGirasoles()`).

## Los 4 de 5-6 años («La máquina de conexiones sensoriales»), 2026-11-18
Mismo `extras: true` (presentador = Zeus). Se partieron las rondas largas para llegar a 4 niveles y se sumó una ronda nueva por juego:

| Juego | ⭐1 | ⭐2 | ⭐3 | ⭐4 (nueva) |
|---|---|---|---|---|
| ConectandoElHeladoGusto (`fabrica.js`) | helado + sabor | cinta (4 cosas) | cinta más rápida (5, ×1.6) | **Las llaves**: tocar la llave del sabor que pide cada cono que pasa |
| ConectandoElSolVista (`observatorio.js`) | sol + colores | espejos 1 | espejos 2 | **El telescopio**: mover la lente por la cúpula para que brillen 4 estrellas escondidas |
| ConectandoLaCampanaAudicion (`campanario.js`, rehecho 2026-11-19) | **«El campanario del gigante»**: noche en un pueblo; un gigante dormido muestra sus 5 sentidos (órganos enormes). R1 tirar de la soga y llevar la nota al oído + afinar con 3 campanillas · R2 regalos del pueblo a su sentido · R3 contraventanas: ¿qué instrumento suena? · R4 campanas perdidas con la trompetilla | cierre: el gigante despierta y la señal llega a su cerebro (título de Ingeniero) |
| ConectandoLaFlorOlfato (`invernadero.js`) | flor + moléculas | tubos 3×3 | tubos 3×4 | **El ventilador**: girar la rueda con el dedo para llevar el aroma hasta la nariz |

`rondaCinta(meta, vel, intro, cierre)`, `rondaEspejos(parte)` y `rondaTubos(parte)` ahora reciben el tramo. Las rondas nuevas se pueden lanzar directo: `escena().rondaValvulas()`,
`rondaTelescopio()`, `rondaBuscar()`, `rondaVentilador()`. Trampa: al cambiar un `.js` subir su `?v=` en el index (el navegador lo cachea).

## Pendiente
- Las 4 de 5-6 años se probaron por ronda nueva y con el arranque normal, no el recorrido completo de principio a fin.
- Flor y Helado: la 4.ª ronda se probó suelta y el recorrido completo solo hasta el primer nivel; el Sol y la Campana avanzan entre rondas con el marcador.

2026-11-19: Conectando la Campana rehecho como campanario.js (ya no usa el laboratorio de cables). Pendientes del mismo rediseño: Flor (huerto/regar), Helado (heladería/armar conos), Sol (cielo/arrastrar el sol). `PedniaLab.titulo` sigue en uso.