<?php

/**
 * Elimina bloques de tablas huérfanas de database/ambientes.sql
 * e inserta resultados_bloque_nino acorde al esquema actual.
 */

$rutaSql = dirname(__DIR__) . '/database/ambientes.sql';
$contenido = file_get_contents($rutaSql);

$tablasEliminar = [
    'condiciones',
    'condiciones_orden',
    'condiciones_transitorias',
    'condiciones_transitorias_orden',
    'emociones_sesion',
    'estudiante_condicion_transitoria',
    'participaciones_bloque',
    'resultados_bloque',
    'sesiones_experiencia',
];

$bloqueResultadosNino = <<<'SQL'

/*Table structure for table `resultados_bloque_nino` */

DROP TABLE IF EXISTS `resultados_bloque_nino`;

CREATE TABLE `resultados_bloque_nino` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `clase_id` bigint unsigned NOT NULL,
  `experiencia_id` bigint unsigned NOT NULL,
  `bloque_experiencia_id` bigint unsigned NOT NULL,
  `tipo_bloque` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_registro` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'resultado',
  `correcto` tinyint(1) DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `archivo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resultados_bloque_nino_unico` (`estudiante_id`,`clase_id`,`bloque_experiencia_id`),
  KEY `resultados_bloque_nino_clase_id_experiencia_id_index` (`clase_id`,`experiencia_id`),
  KEY `resultados_bloque_nino_estudiante_id_experiencia_id_index` (`estudiante_id`,`experiencia_id`),
  KEY `resultados_bloque_nino_experiencia_id_foreign` (`experiencia_id`),
  KEY `resultados_bloque_nino_bloque_experiencia_id_foreign` (`bloque_experiencia_id`),
  CONSTRAINT `resultados_bloque_nino_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `resultados_bloque_nino_clase_id_foreign` FOREIGN KEY (`clase_id`) REFERENCES `clases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `resultados_bloque_nino_experiencia_id_foreign` FOREIGN KEY (`experiencia_id`) REFERENCES `experiencias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `resultados_bloque_nino_bloque_experiencia_id_foreign` FOREIGN KEY (`bloque_experiencia_id`) REFERENCES `bloques_experiencia` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `resultados_bloque_nino` */

SQL;

$partes = preg_split(
    '/(?=\/\*Table structure for table `[^`]+` \*\/)/',
    $contenido,
    -1,
    PREG_SPLIT_NO_EMPTY
);

$encabezado = array_shift($partes);
$salida = [$encabezado];
$eliminadas = 0;

foreach ($partes as $bloque) {
    if (! preg_match('/\/\*Table structure for table `([^`]+)` \*\//', $bloque, $coincidencia)) {
        $salida[] = $bloque;
        continue;
    }

    $tabla = $coincidencia[1];

    if (in_array($tabla, $tablasEliminar, true)) {
        $eliminadas++;
        continue;
    }

    $salida[] = $bloque;
}

$texto = implode('', $salida);

$texto = str_replace(
    "/*Table structure for table `seguridad_logs` */",
    rtrim($bloqueResultadosNino) . "\n\n/*Table structure for table `seguridad_logs` */",
    $texto
);

$texto = preg_replace(
    '/AUTO_INCREMENT=\d+ DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\s*\n\s*\/\*Data for the table `migrations` \*\//',
    "AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n/*Data for the table `migrations` */",
    $texto,
    1
);

$texto = str_replace(
    "(47,'2026_08_28_000002_add_media_to_modulos_and_ejes',17);",
    "(47,'2026_08_28_000002_add_media_to_modulos_and_ejes',17),\n(48,'2026_09_02_000001_create_resultados_bloque_nino_table',18),\n(49,'2026_09_02_000002_drop_tablas_huerfanas',18);",
    $texto
);

file_put_contents($rutaSql, $texto);

echo "Tablas eliminadas del dump: {$eliminadas}\n";
echo "Archivo actualizado: {$rutaSql}\n";
