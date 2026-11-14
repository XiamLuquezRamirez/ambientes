# El Secuenciador de Baile y Lateralidad — diseño

Fecha: 2026-11-13. Ambiente: Polimotor. Temática 31 "Juegos de memoria corporal", juego 4 de la serie.
Edad: **5-6 años** (Transición).

## Intención y porqué

Memoria corporal secuencial **con lateralidad**: Zeus baila una rutina en una pista futurista y el niño la
repite en el mismo orden con botones ilustrados. A diferencia de los juegos previos de la serie, los comandos
incluyen los cuatro clips de izquierda/derecha del modelo, de modo que el niño distingue lado además de orden.

El usuario pidió explícitamente: reutilizar la base de `SimonDiceCorporal` (versión 3-4 años) y su modelo,
**usar todos los clips del GLB menos los de estado de ánimo**, **6 tandas de 3,3,3,4,4,4 movimientos**,
**siempre 3 botones visibles**, y un escenario que no se parezca al teatro.

## Objetivos

- Reutilizar el motor de Simón Dice (estados, generador de secuencias, demo automática, reintento sin vidas).
- 1 ronda × 6 tandas con `movimientos: [3,3,3,4,4,4]`.
- 16 comandos corporales del GLB de Zeus, 3 visibles por tanda, cubriendo los 16 entre las seis tandas.
- Lateralidad real: pares izquierda/derecha animados por el modelo, no espejados por código.
- Escena propia: pista de baile futurista (baldosas luminosas, neón, altavoces, aro de luz).

## No-objetivos

- No tocar los juegos existentes ni su motor compartido.
- No crear archivos SQL nuevos ni reinsertar la base.
- No teléfonos móviles: solo computador y tableta.
- No frameworks (sin React/Vue/Livewire). HTML + CSS + JS vanilla + Phaser 4.

## Anti-objetivos

- Inventar animaciones o simular movimientos por rotación de huesos: todo movimiento es un clip del GLB.
- Duplicar el GLB de 17 MB.
- Botonera con 16 botones a la vista (ilegible a 5-6 años en tablet).

## Restricciones

- La edad del catálogo sale de `config.json` → `niveles[].edad` (`JuegoCatalogoService::edadesDesdeConfigPaquete`),
  no de la BD.
- `database/ambientes.sql` es un volcado: hay que insertar **además** en la tabla `juegos` real.
- Claves de catálogo de memoria corporal en Polimotor: `ambiente_id 7, eje_id 11, tematica_id 31, modulo_id 9`.

## Aproximaciones consideradas

1. **Juego nuevo desde cero** — máxima libertad de escena, pero rehace un motor que ya funciona y arriesga
   divergencias en estados y bloqueos. Descartada.
2. **Añadir una ronda/modo a SimonDiceCorporal** — barato, pero mezcla 3-4 y 5-6 años en un paquete y el
   catálogo saca la edad del config, que es único por paquete. Descartada.
3. **Copiar el paquete y cambiar datos + escena (elegida)** — motor idéntico ya probado, config y escena
   propias, registro independiente por edad. Es lo que el usuario pidió ("usa la base de simon dice").

## Decisiones tomadas en la conversación

- Zeus al centro de la pista (los 16 clips son de su GLB); Zoe a un costado dando pistas.
- 16 comandos: Tocar_cabeza, Tocar_cintura, Tocar_pies, Aplaudir, Abrir_brazos, Estirarse,
  Levantar_brazo_derecho, Levantar_brazo_izquierdo, Levantar_pie_derecho, Levantar_pie_izquierdo,
  Zapatear, Saltar, Saltar_en_un_pie, Girar, Bailar, Caminar (marcha en el sitio).
- Fuera como comando: Quieto, Hablar, Caminar_y_hablar, Saludar, Senalar, Celebrar, Porra_con_pompones
  (gestos/base) y los de ánimo: Triste, Asustado, Enojado, Timido, Reir, Decir_si, Decir_no, Pensar,
  Mirar_alrededor.
- `Correr` fuera: a 1.77 s y sin desplazamiento de raíz se confunde con `Caminar` (decisión mía).
- GLB reutilizado por ruta relativa a `SimonDiceCorporal/`, sin copiar 17 MB (decisión mía).
- Las tandas de 4 movimientos repiten comandos por fuerza (solo 3 botones visibles); es deliberado y sube
  la exigencia de memoria.
- `Saltar_en_un_pie` (5.6 s) y `Tocar_pies` (4.0 s) solo en las tandas de 4, donde hay más aire.

## Lo que queda al constructor

Valores finos de ritmo por tanda, paleta exacta del neón, reparto concreto de los 16 comandos entre los seis
tríos (respetando: cubrir los 16, no repetir trío y que varias tandas lleven un par izquierda/derecha).
