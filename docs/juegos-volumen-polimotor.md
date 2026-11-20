# Volumen por canales en los juegos de Polimotor

El botón de sonido de los juegos de Polimotor tiene **dos controles separados**:

- **Música de fondo** — la música y el ambiente en bucle.
- **Efectos y voces** — los sonidos que responden a la acción (toques, aciertos, fallos,
  celebraciones) y la voz de Zoe y Zeus.

La voz va con los efectos a propósito: si fuera con el fondo, bajar la música dejaría al niño sin
las instrucciones.

Debajo hay un botón **Silenciar**, que apaga los dos canales y recuerda los niveles para
restaurarlos al reactivar.

Todo lo gobierna un único archivo: `public/catalogo_juegos/Polimotor/comun/volumen.js`.

## Cómo se usa en un juego

Basta con cargarlo en el `<head>`, **antes** del `sonidos.js` del juego y de `script.js`:

```html
<script src="../comun/volumen.js?v=20261120vol2"></script>
```

Ya está en los 35 juegos de Polimotor. El archivo arranca solo: reconstruye el contenido del
panel `#menu-vol-panel` con los dos controles, inyecta sus estilos y aplica los niveles. **No hace
falta tocar el `script.js` de cada juego**: lo que el juego tuviera enganchado a su slider
antiguo se reemplaza al reconstruir el panel.

Un juego puede tomar el control si lo necesita:

```js
VolumenPolimotor.iniciar({
    sonidos: window.SonidosTiro,   // su módulo sonidos.js
    fondoPorDefecto: 45,
    efectosPorDefecto: 80,
    alCambiar: function (v) { /* v = {fondo, efectos, mudo} en 0..100 */ }
});
```

### API

| Método | Qué hace |
|--------|----------|
| `iniciar(opciones)` | Arranca el control (lo hace solo si el juego no lo llama). |
| `fondo(pct)` / `efectos(pct)` | Fija un canal, 0..100. |
| `silenciar(on)` / `silenciado()` | Apaga o reactiva los dos canales. |
| `estado()` | `{fondo, efectos, mudo}`. |
| `ganaciaFondo()` / `ganaciaEfectos()` | El factor 0..1 que debe aplicar un sonido suelto. |
| `usarSonidos(mod)` | Engancha el `sonidos.js` si se crea después de iniciar. |
| `refrescar()` | Reaplica los niveles. |
| `buses()` | `{ctx, fondo, efectos}`, para inspeccionar o medir el reparto. |

Las dos preferencias se guardan en `localStorage` (`pednia_vol_polimotor`) y **valen para todos
los juegos de Polimotor**: lo que el docente ajusta en uno se respeta en el siguiente. El
`config.json` del juego (`accesibilidad.volumenFondo`) solo da el valor inicial la primera vez.

## Cómo separa el audio

Los juegos no tienen una sola fuente de sonido, sino tres, y el archivo las gobierna todas:

| Fuente | Fondo | Efectos |
|--------|-------|---------|
| `sonidos.js` del juego (Web Audio sintetizado) | bus de ambiente/música | bus de efectos |
| `PedniaAudio` (Howler: música del tema + sprite) | `agacharMusica()` | volumen de cada efecto |
| `TextoVoz` (voz y música del config) | `definirVolumenFondo()` | volumen del `<audio>` de voz |

Los 18 `sonidos.js` de Polimotor se escribieron por separado y no comparten estructura, así que
hay **dos estrategias** según cómo arme su mezcla cada módulo:

**1. Desvío automático (5 juegos).** Cuando cada sonido se conecta por su cuenta a
`ctx.destination` (Linterna, los dos Memorama, Secuenciador, Simón Dice), el archivo interviene el
getter `AudioContext.prototype.destination` e interpone dos nodos de ganancia:

```
nodos de fondo   → ganFondo   ─┐
                                ├→ destination (el real)
nodos de efecto  → ganEfectos  ┘
```

El reparto se decide por el momento de la lectura: mientras corre `ambiente()` o `musica()` del
módulo (métodos que el archivo envuelve), lo que pida `destination` recibe el bus de fondo; el
resto del tiempo, el de efectos.

**2. Métodos propios (13 juegos).** Cuando el módulo arma un único bus (`maestro`, `salida` o un
compresor) del que cuelga todo, desde fuera no se puede separar: esos `sonidos.js` exponen
`volumenFondo(pct)` y `volumenEfectos(pct)`, y `volumen.js` los usa cuando existen. Un módulo sin
música propia solo trae `volumenEfectos`.

El grafo de Howler se deja intacto a propósito: su música y sus efectos comparten salida, así que
se regulan por su API y no por los buses.

### Por qué los buses se rehacen

Un juego usa varios `AudioContext` a lo largo de la partida: la intro 3D crea el suyo y lo cierra
al entrar al juego. Si los buses se quedaran en ese contexto muerto, los sliders no moverían nada,
así que el archivo anota los contextos que ve y los rehace sobre el que siga vivo.

### Por qué el nivel se reaplica durante unos segundos

Cuando el archivo arranca, el juego todavía no ha creado su audio: el `sonidos.js` suele armar la
mezcla al primer sonido, y la intro 3D cierra su contexto al entrar a la partida. Aplicar el nivel
una sola vez dejaba el valor escrito en un contexto que ya no sonaba, así que **el panel marcaba el
nivel guardado pero el juego entraba a todo volumen** — se notaba al salir de un juego y entrar a
otro.

Por eso `vigilarAudioDelJuego()` revisa cada 400 ms durante los primeros segundos (luego cada 3 s)
y reaplica los niveles cuando cambia algo relevante: aparece el módulo de sonidos, nace un
`AudioContext` o se cierra el que sostenía los buses.

## Al añadir un juego nuevo

1. Cargar `comun/volumen.js` en el `<head>`, antes de `sonidos.js` y `script.js`.
2. Dejar en el HTML el contenedor `#menu-vol-panel` con su botón `#btn-menu-vol`, como los demás
   juegos; el archivo se encarga del contenido.
3. Si el `sonidos.js` arma un **único bus** para todo, añadirle `volumenFondo` y `volumenEfectos`
   siguiendo cualquiera de los 13 que ya los tienen. Si cada sonido se conecta por su cuenta a
   `destination`, no hace falta nada.
4. Comprobarlo en el navegador: `VolumenPolimotor.buses()` da los nodos para medir, y mover un
   canal no debe cambiar el nivel del otro.

Ver también [botones e íconos comunes](../public/catalogo_juegos/Polimotor/comun/interfaz.css) y
[la plantilla general de juegos](juegos-escenas-animadas.md).
