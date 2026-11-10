-- Registro puntual del juego "El Puzle de Siluetas en Acción" (Polimotor · Transición · 5 a 6 años).
--
-- SOLO registra este juego. No vuelve a cargar ambientes.sql y no crea ni modifica ambientes, grados,
-- ejes, temáticas, módulos ni otros juegos.
-- Se puede ejecutar varias veces: si el slug ya está, no lo duplica.
--
-- El catálogo vive en la tabla `juegos` (PK = slug). Clasificación, la misma de Lateralidad y del Espejo:
--   ambiente  7  Polimotor              (se busca por slug 'polimotor')
--   eje      11  Conocimiento y control corporal (módulo 9)
--   temática 30  Juegos de lateralidad  (eje 11)
--   grado     3  Transición (5 a 6 años). Polimotor ya tiene Transición en `ambiente_grado` (id 24);
--                la tabla `juegos` no tiene relación con grados: la edad sale de config.json → niveles[].edad.
-- No hace falta ninguna otra relación.
--
-- Revisar antes de ejecutar; no se ejecuta automáticamente sobre producción.

INSERT INTO `juegos`
    (`slug`, `ambiente_id`, `eje_id`, `tematica_id`, `modulo_id`, `ruta`, `nombre`, `descripcion`, `imagen`, `color`, `orden`, `activo`, `created_at`, `updated_at`)
SELECT
    'el-puzle-de-siluetas-en-accion',
    a.`id`,
    e.`id`,
    t.`id`,
    e.`modulo_id`,
    'catalogo_juegos/Polimotor/PuzleDeSiluetasEnAccion',
    'El Puzle de Siluetas en Acción',
    'Transición (5 a 6 años). Reconstruir posturas deportivas de Zoe y Zeus a partir de su silueta: elegir cada parte del cuerpo, girarla y encajarla en la sombra (cabeza, tronco, brazos, piernas y tenis).',
    'siluetas.png',
    '#7abb2f',
    10,
    1,
    NOW(),
    NOW()
FROM `ambientes` a
JOIN `ejes` e ON e.`id` = 11
JOIN `tematicas` t ON t.`id` = 30 AND t.`eje_id` = e.`id`
WHERE a.`slug` = 'polimotor'
  AND NOT EXISTS (
      SELECT 1 FROM `juegos` j WHERE j.`slug` = 'el-puzle-de-siluetas-en-accion'
  );

-- Si una versión anterior de este archivo ya lo registró en la temática 8 (Rompecabezas del cuerpo),
-- lo pasa a Juegos de lateralidad. Solo toca la fila de este juego.
UPDATE `juegos` j
JOIN `tematicas` t ON t.`id` = 30 AND t.`eje_id` = 11
SET j.`tematica_id` = t.`id`, j.`updated_at` = NOW()
WHERE j.`slug` = 'el-puzle-de-siluetas-en-accion'
  AND j.`tematica_id` = 8;

-- Comprobación (opcional):
-- SELECT `slug`, `ambiente_id`, `eje_id`, `tematica_id`, `modulo_id`, `ruta`, `imagen`, `orden`
--   FROM `juegos` WHERE `slug` = 'el-puzle-de-siluetas-en-accion';
