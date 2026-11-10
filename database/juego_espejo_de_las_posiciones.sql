-- Registro del juego "El Espejo de las Posiciones y Lateralidad" (Polimotor · Transición · 5 a 6 años)
-- para bases ya instaladas. Es idempotente: se puede ejecutar varias veces sin duplicar nada.
--
-- Clasificación (la misma que el resto de Polimotor en ambientes.sql):
--   ambiente  7  Polimotor (slug 'polimotor')
--   módulo    9  (eje 11 "Conocimiento y control corporal")
--   temática 30  "Juegos de lateralidad" (la misma del juego Lateralidad)
--   grado     3  Transición (5 a 6 años); la edad del juego sale de config.json → niveles[].edad = "5-6 años"
-- No crea ambientes, grados, ejes ni temáticas: solo inserta si ya existen.

-- Transición ya está habilitado para Polimotor (ambiente_grado id 24). Por si falta en esta base:
INSERT IGNORE INTO `ambiente_grado` (`ambiente_id`, `grado_id`, `activo`)
SELECT a.`id`, g.`id`, 1
FROM `ambientes` a
JOIN `grados` g ON g.`id` = 3
WHERE a.`slug` = 'polimotor';

INSERT INTO `juegos`
    (`slug`, `ambiente_id`, `eje_id`, `tematica_id`, `modulo_id`, `ruta`, `nombre`, `descripcion`, `imagen`, `color`, `orden`, `activo`, `created_at`, `updated_at`)
SELECT
    'el-espejo-de-las-posiciones-y-lateralidad',
    a.`id`, e.`id`, t.`id`, e.`modulo_id`,
    'catalogo_juegos/Polimotor/EspejoDeLasPosiciones',
    'El Espejo de las Posiciones y Lateralidad',
    'Transición (5 a 6 años). Reproducir posturas del modelo armando la figura con piezas articuladas: arrastrar, girar hombros, caderas, codos y rodillas, respetando izquierda y derecha.',
    'espejo.png', '#7abb2f', 9, 1, NOW(), NOW()
FROM `ambientes` a
JOIN `ejes` e ON e.`id` = 11
JOIN `tematicas` t ON t.`id` = 30 AND t.`eje_id` = e.`id`
WHERE a.`slug` = 'polimotor'
ON DUPLICATE KEY UPDATE
    `ruta` = VALUES(`ruta`),
    `nombre` = VALUES(`nombre`),
    `descripcion` = VALUES(`descripcion`),
    `imagen` = VALUES(`imagen`),
    `updated_at` = NOW();
