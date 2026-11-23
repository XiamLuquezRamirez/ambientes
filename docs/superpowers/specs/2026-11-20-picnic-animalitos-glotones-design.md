# Diseño — Picnic con los Animalitos Glotones

Fecha: 2026-11-20 · Ambiente: Polimotor · Base: `HoraDeComerOsito`

## Intención y por qué

Juego nuevo de arrastre preciso para **3-4 años**. A diferencia de «¡La Hora de Comer!», donde el reto era *esperar* a que el osito abriera la boca mientras se movía, aquí los animales están **quietos y con la boca ya abierta**. El reto se mueve a dos cosas:

1. **Elegir** a quién le toca cada alimento (el perro no come zanahoria).
2. **Arrastrar con precisión** hasta la zona de entrega.

El pedido original pide conejito y perrito en un mantel, con una cesta de picnic con zanahoria y huesito, aro de luz dorada sobre la boca de destino, y sonido divertido de agradecimiento al acertar. El usuario amplió: **cuatro animales de dietas distintas** (herbívoro, carnívoro, granívoro, omnívoro) **con forma de comer diferente**, y **el mismo fondo** de picnic en el bosque del juego del oso.

## Metas

- Reutilizar el fondo de picnic del bosque **sin cambios visuales** (árboles, cerca, manchas de sol, hojas que caen, manta de cuadros, cesta, letrero PEDNIA).
- Cuatro animales fijos, cada uno con una **animación de comer propia y reconocible**.
- Dificultad creciente por **número de animales en escena**: 2 → 3 → 4.
- Acierto obvio y error amable: nunca se pierden estrellas.

## No metas

- No hay movimiento lateral de los animales ni ciclo de apertura de boca (eso era del oso).
- No hay objetos no comestibles tipo cuchara/tenedor; el distractor es el **animal equivocado**.
- No hay cronómetro, vidas ni penalizaciones.
- Un solo nivel de edad (3-4 años). No se ramifica la escena por edad.
- Solo escritorio y tableta horizontal.

## Anti-metas

Sería un fracaso, aunque funcione, si:

- El niño no distingue qué animal come qué (dibujos ambiguos, alimentos genéricos).
- Las cuatro animaciones de comer se ven iguales (se pierde el aprendizaje de la dieta).
- Al llevar un alimento al animal equivocado el niño cree que acertó.
- Cambia el fondo del picnic respecto al juego del oso.

## Restricciones

- Familia **escena** de Polimotor: `reglas.js` + `escena-*.js` + `demo.js` + `script.js`, mundo 1600×900 con `Scale.ENVELOP`, lo importante entre x 220 y 1380.
- Phaser + JS vanilla. Sin frameworks nuevos.
- Botones e íconos comunes de `../comun/interfaz.css`: reiniciar `btn btn-warning btn-round` con `location.reload()`, salir `btn btn-danger btn-round` con `history.back()`, `#btn-menu-acc`/`#btn-menu-vol` con `menu-acc-fab`, `btn-comenzar`. **Nunca cambiar esos íconos.**
- Volumen por canales con `../comun/volumen.js` (fondo y efectos separados).
- Sin pastilla de edad en pantalla. Título solo en la introducción.
- Eje 17 «Coordinación y orientación», temática 34 «Coordinación visual», `ambiente_id` 7, `modulo_id` 9.
- La edad vive **solo** en `config.json` → `niveles[].edad` = `"3-4 años"`.

## Aproximaciones consideradas

**A. Copiar la carpeta y sustituir el osito por un grupo de animales.** Se conserva `escena-picnic.js` (bosque, manta, cesta, arrastre, partículas, `Animador`), se cambia `oso.js` por `animales.js` y se reescriben `reglas.js` y `config.json`. **Elegida.** El fondo queda idéntico por construcción y el arrastre ya está probado. Cuesta reescribir las reglas (de ciclo de boca a emparejamiento) y el HUD.

**B. Extender el juego del oso con un modo «varios animales».** Un solo paquete con dos mecánicas. Descartada: contradice el patrón de un juego por mecánica del catálogo, y los parámetros generales advierten que mezclar modos en un config obliga a ramificar toda la escena.

**C. Partir de `CazadorBurbujasMagicas` (arrastre a una canasta).** Descartada: habría que reconstruir el fondo del picnic desde cero, que es justo lo que el usuario pidió conservar.

## Decisiones del usuario (2026-11-20)

| Decisión | Elección |
|---|---|
| Dificultad entre rondas | **Más animales en escena**: R1 dos, R2 tres, R3 cuatro |
| Animales | **Cuatro**: conejo, perro, pájaro, oso |
| Animal equivocado | **Niega y devuelve a la cesta**, sin castigo |
| Dibujos | **Oso reutilizado** de `oso.js`; conejo, perro y pájaro nuevos con la misma técnica por piezas |
| Final | **Fiesta adaptada** a los cuatro animales |

## Los animales y su dieta

| Animal | Dieta | Alimentos | Forma de comer | Sonido |
|---|---|---|---|---|
| Conejo | Herbívoro | zanahoria, lechuga, manzana | Mordisqueos **rápidos y pequeños**; las orejas se sacuden | «Ñam ñam ñam» agudo y rápido |
| Perro | Carnívoro | huesito, salchicha, croqueta | **Roe de lado**, la cabeza se inclina; la lengua sale | Ladrido corto y contento |
| Pájaro | Granívoro | semillas, maíz, lombriz | **Picotea** hacia abajo varias veces y echa la cabeza atrás para tragar | Piar agudo (`pio`, ya existe) |
| Oso | Omnívoro | miel, pescado, bayas | **Masticadas lentas y grandes**, luego se frota la barriga | Gruñido suave y satisfecho |

Cada ronda reparte un alimento por animal presente, de modo que cada animal recibe **exactamente uno** por ronda. Total de entregas: 2 + 3 + 4 = **9**.

## Flujo

inicio → intro 3D (Zeus y Zoe) → `PedniaEdad` → presentación (los animales llegan y se sientan en la manta, la cesta cae con los alimentos, Zoe entra) → demo automática (Zeus explica; la mano toma la zanahoria, la lleva a la boca del conejo y el conejo mordisquea) → Zoe sale → «¡Comenzar a jugar!» → ronda 1 (2 animales) → ronda 2 (3) → ronda 3 (4) → fiesta → panel de resultado «¡9 ALIMENTOS ENTREGADOS!» con «Jugar nuevamente» y «Volver al menú».

## Mecánica

- Los animales se colocan en posiciones fijas sobre la manta según cuántos haya en la ronda (2, 3 o 4 huecos predefinidos, repartidos en el eje x y escalados por profundidad).
- La boca de cada animal es una zona circular de radio `radioBoca` (92 px de diseño, igual que el oso). El **animal objetivo del alimento que se está arrastrando** muestra un **aro de luz dorada** pulsante alrededor de su boca; los demás no.
- Al tomar un alimento de la cesta: sonido de selección, el alimento sigue el dedo y se enciende el aro del animal correcto.
- **Acierto** (se suelta a menos de `radioBoca` de la boca del animal correcto): el alimento vuela a la boca, el animal ejecuta **su** animación de comer, hace **su** sonido, suma una estrella en el contador y el hueco de la cesta queda marcado.
- **Animal equivocado** (se suelta dentro del radio de otro animal): ese animal **cierra la boca y niega con la cabeza**, el alimento vuelve solo a la cesta, Zoe dice de quién es ese alimento («La zanahoria es para el conejito»). No cuenta como fallo ni agranda la zona.
- **Fuera de toda boca**: el alimento rebota y vuelve a la cesta, Zoe anima a intentar de nuevo. Cuenta como fallo y **agranda** la zona de entrega (`radioBocaPorFallo` 12, hasta `radioBocaMax` 140), igual que el oso.
- Mientras un animal come, el arrastre se bloquea y ese alimento ya no se puede volver a entregar.
- **Ayuda**: a los `ayudaMs` sin entregar, halo bajo un alimento y caminito de puntos hasta la boca de su animal; Zoe da la pista. Se apaga con «Ayuda visual».

## Rondas

| Ronda | Animales | Alimentos | Entregas |
|---|---|---|---|
| 1 «Dos amigos» | conejo, perro | zanahoria, huesito | 2 |
| 2 «Llega el pajarito» | conejo, perro, pájaro | lechuga, salchicha, semillas | 3 |
| 3 «Todos a comer» | conejo, perro, pájaro, oso | manzana, croqueta, maíz, miel | 4 |

Los animales entran en ese orden fijo (conejo, perro, pájaro, oso) y **conservan su posición** al llegar uno nuevo: en R2 el pájaro ocupa un hueco libre sin mover al conejo ni al perro, y en R3 el oso ocupa el cuarto. Al empezar cada ronda, los animales ya presentes se quedan y el nuevo **llega saltando y se sienta**, con una frase de Zoe que lo presenta. Los carteles de ronda («¡RONDA {n} LISTA!» / «¡RONDA {n}!») y el indicador de ronda se conservan igual que en el juego del oso; los nombres de ronda («Dos amigos»…) van en `config.json` y se muestran en el cartel, como el `nombre` del oso.

El **orden de los alimentos en la cesta se mezcla** en cada ronda (Fisher-Yates, como `piezasRonda` del oso), y la cesta muestra **solo los alimentos de la ronda**, no toda la dieta de cada animal.

## Detalles resueltos por el constructor (2026-11-20)

Decisiones tomadas al revisar el diseño, para no dejarlas al azar en la implementación:

- **Alimento correcto = emparejamiento 1:1 de la ronda**, no la dieta entera. Cada alimento de la ronda pertenece a exactamente un animal, y el aro dorado se enciende sobre ese animal. Las dietas de la tabla sirven para **elegir** qué alimento le toca a cada animal y para que el dibujo sea coherente, pero `reglas.js` compara contra el par de la ronda. Así se evita la ambigüedad de la manzana (que un oso omnívoro también comería).
- **Se dibujan solo los 9 alimentos usados.** Lombriz, pescado y bayas quedan fuera; están en la tabla de dietas como contexto, no como material a dibujar. La manzana es del **conejo** (R3) y el oso recibe **miel**.
- **Contador**: 3 grupos de huecos (2, 3 y 4) con el mismo `contador-grupo`/`contador-hueco` del oso, y el texto «0 / 9». Las «estrellas» del pedido original **son esos huecos**: al acertar, el hueco se llena con el ícono del alimento y suena `estrellas`. No hay un segundo indicador.
- **La zona de entrega agrandada por fallo es global** (afecta a todos los animales) y **se reinicia al empezar cada ronda**, igual que `fallosSeguidos` en el oso. Soltar en el animal equivocado no la toca.
- **Al soltar en el animal equivocado**, el aro del animal correcto se apaga junto con el regreso del alimento a la cesta; vuelve a encenderse cuando el niño toma otra vez un alimento.
- **Mientras un animal come se bloquea todo el arrastre** (`bloqueado`, como en el oso) y se espera a que termine la animación antes de contar la entrega y antes de pasar de ronda.
- **Negar**: `OsoComer.prototype.negar()` y `EscenarioComer.rechazar()` ya existen en el juego base; los tres animales nuevos implementan `negar()` con la misma firma (cerrar boca + sacudir la cabeza), de modo que la escena los trata igual.
- **Radio de la boca**: `radioBoca` 92 en px de diseño, igual para los cuatro, **escalado por la profundidad** del animal en la manta, para que la zona corresponda al tamaño que se ve.
- **Gesto de «terminar de comer» en la fiesta**: conejo se sacude y da dos saltitos, perro mueve la cola y se relame, pájaro ahueca las plumas, oso se frota la barriga (el que ya tiene). En los tiempos 2 y 4 cada animal levanta **el alimento de la última ronda en que comió** (conejo manzana, perro croqueta, pájaro maíz, oso miel). Participan **los cuatro**, aunque en R1 solo hubiera dos.
- **Demo**: corre sobre la escena de R1 (conejo y perro), con Zeus explicando y Zoe acompañando, igual que el oso; al terminar se recarga la ronda 0 limpia (cesta llena, contador en 0).
- **Voz de la pista**: plantilla con artículo por alimento y nombre por animal (`{alimento} es para {animal}`, con `articulo` en cada alimento y `nombre` en cada animal), para que salga bien «las semillas son para el pajarito» y «el maíz es para el pajarito». El verbo concuerda con dos plantillas, singular y plural.
- **Ayuda**: `ayudaMs` 10000 y `ayudaRepetirMs` 14000 como el oso; elige el **primer alimento pendiente** de la cesta en el orden en que quedó mezclado.
- **Sonidos**: se reutilizan `seleccion`, `arrastre`, `entraBoca`, `masticar`, `satisfaccion`, `acierto`, `error`, `rebote`, `aparece`, `ronda`, `pio`, `brinco` y `estrellas`. Se agregan tres: `ladrido` (perro), `gruñido` (oso) y `ñam` (conejo, mordisqueos rápidos). El «sonido divertido de agradecimiento» del pedido **es el sonido propio del animal**, seguido de `estrellas`. Para la negativa se agrega `niega` (un «uh-uh» corto y descendente).
- **Ícono** `picnic-animalitos.png` 256×256: lo genera el constructor rasterizando los dibujos propios con Edge headless, como se hizo en el juego del oso.
- **SQL**: fila en la BD local (tinker, idempotente) y en `database/ambientes.sql`. **Sin archivo SQL incremental aparte**, siguiendo lo que el usuario pidió en los juegos recientes.
- **La cesta reemplaza al plato.** En el juego del oso los alimentos salían de un plato en el centro abajo (`800, 812`) y la cesta en `(1300, 770)` era decorativa. Con cuatro animales ocupando el centro de la manta, el plato estorba: los alimentos pasan a salir de **la cesta, centrada abajo** en `(800, 836)`, que además es lo que pedía el enunciado original («bandeja inferior: una cesta de picnic»). El fondo del bosque y la manta no cambian.
- **Cuatro slots de alimento, no seis.** La escena del oso tenía seis ranuras porque mezclaba frutas con utensilios; aquí el máximo por ronda es cuatro.
- **Al pasar de ronda, la zona de entrega agrandada se reinicia** junto con `fallosSeguidos`, en `comenzarRonda`.
- **Los animales nuevos se presentan con voz**: al entrar el pájaro (R2) y el oso (R3), la escena emite `llega` y Zoe dice «¡Mira! Llegó el pajarito y también tiene hambre».

## Final

Escena `Fiesta` adaptada de la del oso: los animales alimentados terminan de comer y se frotan la barriga; empieza la lluvia de hojas de otoño y pétalos; los cuatro se levantan y bailan cuatro tiempos, y en los tiempos 2 y 4 cada uno levanta **su** alimento con destellos; al final todos saludan. Luego entra Zoe 3D y aparece el panel «¡9 ALIMENTOS ENTREGADOS!».

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | portada, intro 3D, escena, contador, ronda, controles, panel final |
| `style.css` | contador, ronda, carteles, panel final; botones con `../comun/interfaz.css` |
| `config.json` | animales, alimentos, rondas, textos, nivel 3-4 años |
| `reglas.js` | `ReglasPicnic` (puro, también para node): emparejamiento, radio, evaluación |
| `dibujos.js` | `DibujosPicnic`: alimentos y escenario SVG estilo Ardilla, rasterizados |
| `animales.js` | `AnimalesPicnic`: los cuatro animales por piezas, cada uno con su comer |
| `escena-picnic.js` | `EscenarioPicnic`: escenas `Picnic` y `Fiesta`, arrastre, partículas |
| `sonidos.js` | `SonidosPicnic` (Web Audio, canales fondo/efectos) |
| `demo.js` | `PicnicDemo` |
| `guia-3d.js` | Zoe 3D |
| `script.js` | flujo, voces, ayudas, rondas, final, reinicio |
| `picnic-animalitos.png` | ícono 256×256 |

## Registro en BD

Carpeta `PicnicAnimalitosGlotones`, slug `picnic-animalitos-glotones`, `ambiente_id` 7, eje 17, temática 34, `modulo_id` 9, ruta `catalogo_juegos/Polimotor/PicnicAnimalitosGlotones`, imagen `picnic-animalitos.png`, color a elegir, **orden 35** (el máximo actual de Polimotor es 34). Fila en la BD local y en `database/ambientes.sql`. La edad la resuelve `config.json`.

## Qué queda al constructor

- Las posiciones exactas de los animales en la manta y su escala por profundidad.
- El color del juego en la tabla `juegos`.
- Las frases literales de `config.textos` (siguiendo el tono de Zoe y Zeus del juego del oso).
- La síntesis concreta de cada sonido de animal en Web Audio.
- El script de prueba de node (`scripts/probar-picnic-animalitos.js`) y el puerto del servidor estático.
