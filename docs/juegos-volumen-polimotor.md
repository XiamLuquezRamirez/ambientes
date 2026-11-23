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

## Refuerzo de los efectos (2026-11-23)

Queja del usuario: «en todos los juegos de Polimotor se escuchan los efectos muy bajos». Dos causas, las dos corregidas solo en `comun/volumen.js`:

1. **Doble atenuación en los módulos con buses propios** (los `sonidos.js` con `volumenEfectos()`, 18 hoy). Toda su mezcla sale por UN bus de este archivo, el que tocara cuando el módulo leyó `destination`: el de efectos si armó la mezcla al primer sonido, el de fondo si la armó dentro de `ambiente()`. Ese bus también aplicaba el canal, así que el efecto sonaba a 85 % × 85 % = 72 %, o incluso al nivel de la música. Ahora, si el módulo es "propio" (`moduloPropio()`), los dos buses valen lo mismo y el canal lo aplica solo el módulo.
2. **Los efectos sintetizados son flojos** frente a la voz y al sprite de PedniaAudio. En Web Audio el canal Efectos se multiplica por `REFUERZO_EFECTOS` (2,5). Para que la música no suba, a los módulos propios se les pasa `volumenFondo(fondo / 2,5)`. Un limitador (`DynamicsCompressor`, umbral −3 dB, ratio 20) entre los buses y el destino sujeta los picos.

Los `<audio>` (voz de TextoVoz) y Howler no pueden pasar de 1 y siguen con `ganaciaEfectos()`; el sprite ya trae su propio refuerzo (×1,8 y limitador en `shared/pednia-audio.js`).

Medido en el navegador (pico a la salida de los buses, efectos 85 %, fondo 35 %):

| Juego | Sonido | Antes | Después |
|---|---|---|---|
| Ensamblaje de la Nave (módulo propio) | encaje | −14,8 dBFS | −5,5 dBFS |
| Ensamblaje de la Nave | selección | −22,6 dBFS | −13,2 dBFS |
| Ensamblaje de la Nave | música de fondo | −30,1 dBFS | −28,7 dBFS (ya sin la doble atenuación) |
| Simón Dice (desvío automático) | brillo | ≈ −14 dBFS (calculado) | −6,3 dBFS |

El control sigue respondiendo: con efectos al 40 % el encaje baja 6,5 dB y la música no se mueve. `VolumenPolimotor.buses()` devuelve además `refuerzo` y `moduloPropio` para medir.

Para que el cambio llegue a las tabletas (que cachean por versión), los 40 `index.html` pasaron a `comun/volumen.js?v=20261123vol4`.

## Refuerzo más fuerte y buses por contexto (2026-11-23, segunda queja: «así esté al 100 no se escucha casi»)

1. **Buses abandonados (la causa principal).** Antes `volumen.js` guardaba solo los buses del ÚLTIMO contexto que pidió `destination`. El `sonidos.js` del juego arma su mezcla en su contexto; luego la intro 3D (u otro módulo) crea otro contexto, se hacían buses nuevos y los del juego quedaban congelados con la ganancia que tenían al crearse: ni el refuerzo ni los sliders le llegaban. Ahora hay buses por contexto (`porContexto`) y `aplicarBuses()` actualiza todos los vivos. `buses().todos` los lista.
2. `REFUERZO_EFECTOS` sube de 2,5 a **5**; el limitador de cada contexto queda en −1,5 dB (ratio 20, ataque 1 ms).
3. **Efectos del sprite de Howler** (los 17 juegos sin `sonidos.js`): `reforzarHowler()` parchea `Howl.prototype.play` y `volume` para poner cada sonido suelto (no en bucle) a ×3 (`REFUERZO_HOWLER`) en su propio nodo de ganancia. La música del tema (en bucle) no cambia. El limitador de `shared/pednia-audio.js` sigue sujetando los picos (no se tocó ese archivo, que es de todos los ambientes).

Medido con efectos al 100 % y fondo al 35 %:

| Juego | Sonido | Primera medición (85 %, sin arreglo) | Ahora (100 %) |
|---|---|---|---|
| Ensamblaje de la Nave | encaje | pico −14,8 dB | pico +0,4 dB, RMS −16,8 dB (salida del limitador) |
| Ensamblaje de la Nave | selección / acierto | −22,6 dB / — | −5,4 dB / −3,6 dB |
| Ensamblaje de la Nave | música | −30,1 dB | −28,4 dB |
| Golpea a los Topos (Howler) | acierto | ≈ −3,2 dB antes del limitador | +6,3 dB antes del limitador |

Con efectos al 40 % el encaje baja 7 dB de RMS: el slider sigue mandando. Versión del script: `?v=20261123vol6`.

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
