# ¡Simón Dice Corporal! (`public/catalogo_juegos/Polimotor/SimonDiceCorporal/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (2026-11-13), Prejardín 3-4 años, temática 31 "Juegos de memoria corporal", **juego 2** de la serie.
Memoria corporal y secuencial: Zeus hace unos movimientos y el niño los repite **en el mismo orden** con los
botones ilustrados.

**Seis movimientos, tres a la vista** (corrección 4, 2026-11-13): el juego tiene **seis** movimientos — **Tocar
Cabeza** (amarillo), **Aplaudir** (azul), **Zapatear** (verde), **Saltar** (rosa), **Tocar Pies** (morado) y **Abrir
Brazos** (cian) — pero en la botonera solo se ven **tres a la vez**. Cada ítem sortea sus tres (`st.visibles[ronda]
[item]`, `ReglasSimon.sortearVisibles`) y **su secuencia se arma únicamente con esos tres**, así que el niño siempre
tiene a la vista todo lo que Zeus hizo. El trío **nunca repite** el del ítem anterior (ni el de la demo), y al
cambiar de ítem los botones de antes se encogen girando (`.accion.sale`) y los nuevos caen rebotando uno tras otro
(`.accion.entra`, escalonados con `--i`), mientras Zeus dice `textos.cambioOpciones`. Un toque en un movimiento que
no está visible no cuenta (`ReglasSimon.tocar` → `motivo: "no visible"`).

**Escena**: el teatro interactivo de PedNia (SVG en `index.html`): sala morada, telones rojos recogidos con cenefa
dorada, arco de neón con bombillas que parpadean, guirnaldas de banderines, pantalla luminosa al fondo, tres
reflectores que se mecen (su color cambia con cada movimiento: `--haz-a`, `--haz-b`) y estrellitas. En la escena
(HTML, alineada con Zeus): tarima redonda de madera con bombillas en el borde y foco de luz (`--luz`). Zeus 3D de pie
en el centro; Zoe 3D abajo a la izquierda con su nube; a la derecha la **marquesina** de neón con la fase
(¡OBSERVA! / ¡REPITE LA SECUENCIA!) y las ranuras numeradas (una por movimiento). Abajo, los **tres botones
redondos visibles**, que `script.js` vuelve a armar en cada ítem (`ponerBotones(ids)`; el `<footer id="botonera">`
sale vacío del HTML).
Arriba: Inicio, reiniciar, "3-4 años", título y la franja de progreso (RONDA n DE 3 · ÍTEM n DE 4 · 3 × 4 puntos ·
barra n/12).

**Pedidos del enunciado** (2026-11-13): HTML/CSS/JS vanilla + Phaser 4; reutilizar personajes (sin SVG nuevos de
Zeus/Zoe); demo siempre automática (cabeza → aplaudir); mínimo 3 rondas × 4 ítems, siempre 2 movimientos; errores
sin vidas y con la misma secuencia; avance automático; botón de inicio en la introducción que arranca la demo;
"VOLVER A JUGAR" y "CONTINUAR"; registro solo en `database/ambientes.sql` (sin archivos SQL nuevos); solo computador
y tableta.

**Correcciones del usuario (2026-11-13):**
1. "Solo una ronda de 4 ítems" (después de la primera versión de 3 × 4).
2. 6 rondas de 4 ítems con 2/3/3/3/4/4 movimientos (descartado).
3. 1 ronda de 6 ítems con 2, 2, 3, 3, 4 y 4 movimientos (reemplazó "siempre dos movimientos" del enunciado).
4. **Vigente: tres movimientos más — Saltar, Tocar Pies y Abrir Brazos — y de los seis solo se ven tres por
   ítem**, sorteados al azar y con animación al cambiar (ver arriba). Reemplaza "tres botones fijos".
5. **Vigente: ítems 1 a 3 con 2 movimientos y 4 a 6 con 3** (`config.rondas[0].movimientos: [2, 2, 2, 3, 3, 3]`;
   `ReglasSimon.largoDeItem(cfg, ronda, item)`). Razón del usuario: **4 movimientos es muy difícil para 3-4 años**.
   Ningún ítem pasa de 3. El código de los ítems de 4 sigue (la regla "los de 4 usan las tres acciones" y
   `textos.cuantos["4"]`) y vuelve a aplicarse si se suben los movimientos en `config`.
6. **Vigente: modelo propio `zeus_animado_suave.glb` con un clip por movimiento** (lo agregó el usuario) y
   **Manos Arriba → Abrir Brazos** (el clip del modelo es `Abrir_brazos`). Reemplaza las poses por código.

Ritmo: 2000 ms por movimiento, pausa 950 ms, apoyo alto (botón iluminado y dibujo en la ranura) y nombre dicho en
todos los ítems. Cuando la secuencia se alarga (ítem 4), un cartel y Zeus avisan "¡Ahora son tres movimientos!
¡Mira con atención!" (`textos.cambioLargo`). Secuencias: nunca la misma acción dos veces seguidas, sin
ítems repetidos en la ronda, el primero ≠ demo, el primer ítem de 3 usa sus tres acciones visibles y los de 4 usan
sus tres. Todas las secuencias salen del trío visible de su ítem.
La marquesina arma tantas ranuras como movimientos (`armarRanuras(n)`, `n-3`/`n-4` más chicas) y el niño toca todos
antes de comprobar. Zeus dice "Recordaste los {dos/tres} movimientos…" (`textos.cuantos`). Con una sola ronda
no se ve "RONDA n DE n": el progreso es "ÍTEM n DE 6" + 6 puntos + barra n/6. El código de varias rondas (cambio de
ronda, fichas R1…Rn de la franja) sigue y vuelve a funcionar si se agregan rondas en `config.rondas`.

## Flujo

Inicio → intro 3D compartida → `PedniaEdad` → **introducción** (estado `INTRO`): cartel "¡SIMÓN DICE CORPORAL!",
Zoe saluda, Zeus saluda y dice "¡Simón dice... muévete con memoria!…" mientras la marquesina enciende
"1. OBSERVA" y "2. REPITE"; luego presenta **los seis** movimientos de tres en tres (muestra un trío, lo hace
encendiendo cada botón, cambia al siguiente trío y vuelve al de la demo), así el niño conoce todos desde el
principio y ya ve que la botonera se renueva → botón **"¡Empezar!"** (el
"botón de inicio" del enunciado; es el único botón del flujo) → **demo** (`demo.js`, estado `DEMO`, automática) →
"¡AHORA ES TU TURNO!" → ronda 1 sola.

Cada ítem (`jugarItem`): `SHOWING_SEQUENCE` (botones bloqueados, sala más oscura, Zeus dice "¡Observa bien…!" —
completo al empezar ronda y en reintentos, "¡Observa!" en los demás— y hace los dos movimientos) →
`WAITING_INPUT` (marquesina verde, botones habilitados; cada toque ilumina el botón, Zeus hace el movimiento, voz
"¡Cabeza!/¡Aplaudir!/¡Zapatear!" y el dibujo llena su ranura; se esperan los dos toques) → `CHECKING_ANSWER` →
- **acierto** (`CORRECT_FEEDBACK`): los dos botones "cantan" su nota (marimba) con notas que suben, Zeus y Zoe
  celebran, chispas, punto verde con estrella y barra; Zoe "¡MUY BIEN!" + Zeus "Recordaste…" → siguiente ítem solo.
- **error** (`INCORRECT_FEEDBACK`): el botón equivocado rebota, ranura roja, dos notas suaves, Zeus asiente
  (gesto amistoso, clip `Decir_si`) y dice "¡Casi!…"; Zeus **vuelve a mostrar la misma secuencia**
  (`juego.repetirSecuenciaTrasError`) y se reintenta. Con 2 errores en el mismo ítem, el reintento se muestra con
  apoyo alto.
- 4 ítems → `ROUND_TRANSITION`: fanfarria, confeti, "¡RONDA n COMPLETADA!", "¡Excelente! Completaste esta ronda…",
  cartel e instrucción de la ronda siguiente.
- 12 ítems → `VICTORY`: sala en fiesta, Zeus baila, Zoe celebra, confeti y lluvia de estrellas, cartel
  "¡ERES UN CAMPEÓN DE LA MEMORIA CORPORAL!", voces finales → tarjeta con **VOLVER A JUGAR** (progreso a cero,
  secuencias nuevas, las tres rondas otra vez sin repetir la demo, que sigue fija) y **CONTINUAR** (victoria
  compartida `../../final`).

**Dificultad** (`config.rondas`, nunca más de 2 movimientos): R1 "Aprendizaje" 2100 ms por movimiento, pausa
1100 ms, apoyo alto (botón iluminado y dibujo en la ranura) y nombre dicho · R2 "Consolidación" 1800/700, apoyo
medio (el dibujo solo mientras Zeus se mueve) · R3 "Desafío" 1550/450, apoyo bajo (solo se enciende el número de
la ranura; sin botón, sin dibujo y sin nombre).

**Ayuda**: sin tocar nada 12 s en `WAITING_INPUT` → Zoe "¡Recuerda los movimientos que hizo Zeus!…" y los tres
botones se menean (no se marca ninguno). Se repite cada 14 s, como mucho 3 veces.

**Bloqueos**: solo `WAITING_INPUT` acepta toques; máximo 2 por intento; antirrebote de 420 ms (un doble toque
involuntario no cuenta dos veces, pero la misma acción dos veces seguidas sí vale); `avanzar` solo desde
`CORRECT_FEEDBACK`. Cada partida lleva `partidaId` y todos los `sleep` se registran: `cortarTodo()` cancela
temporizadores, voces, el movimiento de Zeus, los efectos y la mano de la demo.

## Zeus 3D y sus movimientos

**Modelo propio del juego** (corrección 6, 2026-11-13): `zeus-3d.js` carga `zeus_animado_suave.glb`, que está en
la carpeta del juego y **ya trae un clip animado por cada movimiento**, hecho por el animador. Antes se usaba
`intro3d/models/nino.glb` y las poses se mezclaban por código (`POSES`/`MOVIMIENTOS` con ángulos por articulación);
**eso ya no existe**: cada movimiento es su clip reproducido entero. El esqueleto es el mismo que `nino.glb`
(mismos nombres de hueso), así que `Zeus3D.punto(parte)` y los gestos siguen igual.

| Movimiento | Clip del GLB | Contactos (t normalizado) | Efecto y sonido |
|---|---|---|---|
| cabeza | `Tocar_cabeza` | 0.42, 0.66 | estrellas sobre la cabeza + brillo |
| aplaudir | `Aplaudir` | 0.3, 0.52, 0.74 | destello en las manos + palmada |
| zapatear | `Zapatear` | 0.3, 0.75 | ondas en el pie, la tarima vibra + golpe de tacón |
| saltar | `Saltar` | 0.3, 0.68 | 1 = despegue (estrellas + brillo), 2 = caída (ondas, tarima vibra) |
| tocarPies | `Tocar_pies` | 0.46 | destello en los pies + nota |
| abrirBrazos | `Abrir_brazos` | 0.42 | destello en las manos + brillo |
| brazos (celebrar) | `Celebrar` | 0.25 | — |

`MOVIMIENTOS` en `zeus-3d.js` mapea cada id a su clip y a los instantes del contacto; `alGolpe(n)` avisa en cada
uno para que la capa Phaser dibuje el efecto y suene justo ahí. Gestos de clip: `saluda`, `celebra`
(`Celebrar`/`Porra_con_pompones`), `baila`, `amistoso`, `piensa`.

**El clip dura lo que pide la ronda**: `hacer(id, {ms})` no corta el clip, le ajusta `timeScale`
(`DURACION_CLIP[clip] / (ms / 1000)`), así que se ve completo aunque el ritmo cambie.

**El salto necesita ayuda**: el clip `Saltar` flexiona las piernas pero **no desplaza la raíz**, así que Zeus no
despegaba. El vuelo se agrega por código con el campo `vuelo: [despegue, caída, alto]`, una parábola entre los
dos contactos. Importante: **el AnimationMixer sobrescribe la posición de los huesos en cada cuadro** (incluida
`raiz`), así que escribir en `raiz.position` no mueve nada; el desplazamiento va en **`mesh.position.y`**, que el
mixer no toca (`ALTURA_UNIDAD` convierte las unidades de `vuelo`/`baja` al espacio del modelo). Medido en pantalla,
Zeus sube ~58 px en el pico y vuelve exactamente al piso al terminar.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasSimon` | Puro (también `module.exports`): estados y transiciones, `sortearVisibles` (los tres movimientos a la vista en cada ítem), `generarSecuencias` (sorteo repetido hasta cumplir `problemasSecuencias`: el largo que pide el ítem, solo movimientos visibles, sin seguidas iguales, el primero ≠ demo, sin ítems repetidos), `visiblesActuales`, `tocar`, `comparar` (por id y en orden), `avanzar`, `siguienteRonda`, `reintentar`, `progreso`, `revisarJuego`. |
| `iconos.js` | `IconosSimon` | Ilustraciones propias de los seis botones (SVG 200 × 200), el mismo niño en cada pose: tocándose la cabeza, manos aplaudiendo, piernas zapateando, saltando, tocándose los pies y con los brazos abiertos. Ayudas `carita(cx, cy, r)` y `miembro(d, grosor)` para que las seis se dibujen igual. |
| `sonidos.js` | `SonidosSimon` | Web Audio sin archivos: `seleccion`, `brillo`, `aplauso`, `zapateo`, `nota(f)` (marimba), `suave`, `fanfarria`, `redoble`. Se apagan con "Efectos" en el menú de sonido. |
| `escenario-phaser.js` | `EscenarioSimon` | Capa Phaser 4 transparente a pantalla completa (sin toques): `estrellas`, `destello`, `ondas`, `notas`, `chispas`, `confeti`, `lluviaEstrellas`, `limpiar`. Tweens con respaldo por tiempo. |
| `zeus-3d.js` | `Zeus3D` | Zeus 3D en la tarima, con el modelo propio del juego: `hacer(id, {ms, alGolpe})` reproduce el clip del movimiento, `gesto`, `hablar`, `detener`, `punto`. |
| `zeus_animado_suave.glb` | — | Modelo de Zeus con un clip por movimiento (`Saltar`, `Tocar_cabeza`, `Aplaudir`, `Zapatear`, `Tocar_pies`, `Abrir_brazos`) además de los de siempre. ~17 MB; mismo esqueleto que `nino.glb`. |
| `zoe-3d.js` | `Zoe3D` | Zoe 3D (`nina.glb`) en la esquina: `hablar`, `gesto`. |
| `demo.js` | `SimonDemo` | Demostración automática con la mano de PedniaTutorial. |
| `script.js` | — | Flujo, voces y nubes, progreso, marquesina, botones, ayudas, final, menús. |
| `simon-dice.png` | — | Icono 256 × 256 (insignia del teatro con tres botones, hecho con los dibujos del juego). |

## Probar

- `node scripts/probar-simon-dice-corporal.js` (18 pruebas: config de 1 ronda × 6 ítems (2, 2, 2, 3, 3, 3 movimientos), seis acciones con tres visibles, edad, generador con 200 semillas,
  máquina de estados y bloqueos, orden, reintento con la misma secuencia, partida completa 6 → victoria, error en el 3.º de 4, aviso al alargar, textos,
  dibujos, fila única en `ambientes.sql`). Recorrido de 1 ronda probado en el navegador el mismo día (4/4 → victoria).
- En el navegador: `st` (estado), `ReglasSimon.secuenciaActual(st)`; los botones responden a `pointerdown`
  (`new PointerEvent('pointerdown', {bubbles: true, isPrimary: true, button: 0, pointerType: 'mouse'})`).
- Probado (2026-11-13) a 1366 × 768 con clics reales y con un recorrido automático: intro, "¡Empezar!", demo
  completa, acierto, error con reintento (tercer toque ignorado, progreso intacto), las 3 rondas, victoria, volver
  a jugar; también 1024 × 768 y 768 × 1024. Sin errores de consola (solo los 404 de `/juegos/tts` del servidor estático).

## Registro

Fila en `database/ambientes.sql` (después de `sigue-el-pulso-del-tambor-magico`): slug `simon-dice-corporal`,
ambiente 7 (Polimotor), eje 11, temática 31, módulo 9, orden 18, imagen `simon-dice.png`, color `#e64980`. Aplicada
también en la base local (127.0.0.1, sin duplicar); el catálogo la muestra para 5 y 6 años, no para 3.

## Pendiente

- Probar el toque en una tableta real (el panel no emula el táctil en ancho de tableta).
- Sin commit.
