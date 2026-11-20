# Picnic con los Animalitos Glotones

`public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/` · slug `picnic-animalitos-glotones` · **3-4 años** · Eje 17 «Coordinación y orientación», temática 34 «Coordinación visual» · orden 35 · color `#51cf66`.

Picnic en el bosque (el mismo de «¡La Hora de Comer!»): varios animalitos sentados en la manta esperan con la boca abierta. El niño toma cada comida del plato y la arrastra hasta la boca del animalito que la come.

Diseño: [`docs/superpowers/specs/2026-11-20-picnic-animalitos-glotones-design.md`](../../superpowers/specs/2026-11-20-picnic-animalitos-glotones-design.md) · Plan: [`docs/superpowers/plans/2026-11-20-picnic-animalitos-glotones.md`](../../superpowers/plans/2026-11-20-picnic-animalitos-glotones.md).

## Pedido (2026-11-20)

- Conejito y perrito en un mantel, cesta de picnic abajo (luego cambiada por un plato) con zanahoria y huesito, aro de luz dorada sobre la boca de destino y sonido divertido de agradecimiento al acertar.
- El usuario amplió: **cuatro animales de dietas distintas** (herbívoro, carnívoro, granívoro, omnívoro) con **forma de comer diferente**, y **el mismo fondo** del juego del oso. Base: `HoraDeComerOsito`.
- Botones e íconos comunes (`../comun/interfaz.css`), sin pastilla de edad, título solo en la introducción, solo escritorio y tableta horizontal, sin SQL incremental aparte.

## Escena

- `escena-picnic.js` conserva tal cual el bosque, la manta (pintada en `fondoPicnic`), el `Animador` y las `Particulas` del juego del oso. Cambia el centro: **un plato centrado abajo** (`800, 812`, el mismo dibujo del juego del oso) es de donde salen los alimentos (hasta 4, en una fila sobre el plato). El pedido original decía plato; el usuario pidió plato (2026-11-20).
- Lugares **fijos** de cada animal (pies, mundo 1600 × 900): pájaro `455, 650`, conejo `690, 662`, perro `925, 662`, oso `1165, 656`. R1 conejo y perro en el centro; en R2 llega el pájaro a la izquierda y en R3 el oso a la derecha, sin mover a los demás (el oso tapa parte del letrero PEDNIA en R3).
- `animales.js` (`AnimalesPicnic`): los cuatro por piezas, de frente, con la misma API (`puntoBoca`, `comer`, `negar`, `celebrar`, `saltar`, `terminarDeComer`, `mostrarAro`, `resaltarAro`, `update`, `reiniciar`). Ojos, nariz y boca con `Graphics`. Quietos con la boca abierta (apertura 0,6).
- Aro dorado: lo dibuja cada animal en un `Graphics` suelto de la escena (px del mundo), con radio 0,8 × la zona de entrega vigente y pulso de `aroPulsoMs`. Se enciende **solo sobre el dueño** del alimento tomado y brilla más cuando el alimento está cerca.
- Fiesta: los cuatro animales en la manta de la fiesta; terminan de comer a su manera, lluvia de hojas y pétalos, el oso se pone de pie y los demás saltan, bailan 4 tiempos y en el 2 y el 4 levantan sobre la cabeza el alimento de su última ronda (manzana, croqueta, maíz, miel); al final saludan.

| Animal | Come | Forma de comer | Fin de la fiesta | Sonido |
|---|---|---|---|---|
| Conejo | zanahoria, lechuga, manzana | 6 mordiscos rápidos, orejas sacudiéndose | se sacude y da dos saltitos | `ñam` |
| Perro | huesito, salchicha, croqueta | inclina la cabeza y roe de lado, saca la lengua | mueve la cola y se relame | `ladrido` |
| Pájaro | semillas, maíz | 5 picotazos y echa la cabeza atrás para tragar | ahueca las plumas y abre las alas | `pio` |
| Oso | miel | 3 masticadas lentas y se frota la barriga | se frota la barriga | `gruñido` |

## Flujo

inicio → intro 3D → PedniaEdad → presentación (conejo y perro llegan saltando, la comida cae en el plato, entra Zoe con `introZoe`) → demo (Zeus `demoZeus`; la mano lleva la zanahoria al conejito) → Zoe sale → «¡Comenzar a jugar!» → R1 (2) → R2 (3) → R3 (4) → fiesta → panel «¡9 ALIMENTOS ENTREGADOS!» con «Jugar nuevamente» y «Volver al menú». «Jugar nuevamente» vuelve al picnic sin recargar: se van el pájaro y el oso.

## Mecánica (`reglas.js`, `ReglasPicnic`)

- Cada ronda da un alimento por animal presente (`rondas[].alimentos`), mezclados con Fisher-Yates.
- `evaluarEntrega` busca la boca **más cercana** al soltar: dentro de `radioBoca` (92, +12 por fallo, máx. 140) y es el dueño → acierto; es otro → `otroAnimal`; fuera de toda boca → `lejos`; ya entregado → `repetida`.
- `otroAnimal`: ese animal cierra la boca y niega, el alimento vuelve, Zoe dice la pista («las semillas son para el pajarito», verbo según `plural`). No cuenta como fallo.
- `lejos`: rebota al plato, «¡Inténtalo otra vez!», cuenta como fallo y agranda la zona. La zona vuelve a 92 al empezar cada ronda.
- Mientras un animal come o niega se bloquea el arrastre.
- Ayuda a los 10 s: halo en el primer alimento del plato y caminito hasta la boca de su dueño (se apaga con «Ayuda visual»).

## Sonidos (`sonidos.js`, `SonidosPicnic`)

Los del juego del oso sin `abreBoca`, más `ladrido`, `gruñido`, `ñam` y `niega`. La música de la fiesta va por el canal de fondo (`amb`) y `agachar` respeta el volumen de fondo que fija `comun/volumen.js`.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | portada, intro 3D, escena, contador, ronda, controles, panel final |
| `style.css` | contador, ronda, carteles, panel final |
| `config.json` | animales, alimentos, rondas, textos, nivel 3-4 años |
| `reglas.js` | `ReglasPicnic` (puro, también en node) |
| `dibujos.js` | `DibujosPicnic`: alimentos, animales y escenario SVG rasterizados |
| `animales.js` | `AnimalesPicnic`: los cuatro animales y su forma de comer |
| `escena-picnic.js` | `EscenarioPicnic`: escenas `Picnic` y `Fiesta` |
| `sonidos.js` | `SonidosPicnic` |
| `demo.js` | `PicnicDemo` |
| `guia-3d.js` | Zoe 3D |
| `script.js` | flujo, voces, ayudas, rondas, final, reinicio |
| `picnic-animalitos.png` | ícono 256 × 256 (captura de la propia escena recortada en círculo) |

## Cómo probar

- `node scripts/probar-picnic-animalitos.js` (23 pruebas: config, reglas, interfaz, orden de scripts, textos usados).
- Servidor estático `juegos-picnic` (puerto 8043) en `.claude/launch.json` → `/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/index.html`. La voz (`/juegos/tts`) solo responde en Laravel.

## Registro en BD

Fila en la BD local (`updateOrInsert` por slug) y en `database/ambientes.sql` (antes de `pinball-gravedad-magica`). Verificado con `JuegoCatalogoService::listarActivosPorAmbiente(7, edad)`: 3 sí, 4 sí, 5 no.

## Pendientes

- Probar en una tableta real y oír las voces dentro de Laravel.
