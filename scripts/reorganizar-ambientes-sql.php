<?php

/**
 * Sincroniza database/ambientes.sql con el esquema activo del proyecto.
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

$defaultsJuegos = [
    ['tipo' => 'rompecabezas', 'nombre' => 'Rompecabezas', 'descripcion' => 'Armar la imagen arrastrando piezas', 'icono' => 'fa-puzzle-piece', 'color' => '#d97706', 'orden' => 1],
    ['tipo' => 'memoria', 'nombre' => 'Memoria', 'descripcion' => 'Encontrar parejas de imágenes iguales', 'icono' => 'fa-clone', 'color' => '#0284c7', 'orden' => 2],
    ['tipo' => 'colorear', 'nombre' => 'Colorear', 'descripcion' => 'Pintar sobre una imagen en blanco y negro', 'icono' => 'fa-palette', 'color' => '#a855f7', 'orden' => 3],
    ['tipo' => 'secuencia', 'nombre' => 'Secuencia', 'descripcion' => 'Ordenar imágenes en el paso correcto', 'icono' => 'fa-arrow-down-wide-short', 'color' => '#0f6e56', 'orden' => 4],
];

function escaparSql(?string $valor): string
{
    if ($valor === null) {
        return 'NULL';
    }

    return "'".str_replace("'", "''", $valor)."'";
}

function generarBloqueJuegos(string $contenidoSql, array $defaultsJuegos): string
{
    preg_match_all(
        '/\((\d+),(\d+),NULL,[^,]+,[^,]+,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,\d+,\d+,\d+,[^,]+,[^,]+,1\)/',
        $contenidoSql,
        $coincidencias,
        PREG_SET_ORDER
    );

    $modulosOficiales = [];
    foreach ($coincidencias as $fila) {
        $modulosOficiales[(int) $fila[1]] = (int) $fila[2];
    }

    if ($modulosOficiales === []) {
        $modulosOficiales = [1 => 6, 2 => 6, 3 => 8, 4 => 6];
    }

    $filasInsert = [];
    $id = 1;
    $timestamp = '2026-09-02 17:00:00';

    foreach ($modulosOficiales as $moduloId => $ambienteId) {
        foreach ($defaultsJuegos as $juego) {
            $filasInsert[] = sprintf(
                '(%d,%d,NULL,NULL,%d,%s,%s,%s,%s,%s,%d,1,%s,%s)',
                $id,
                $ambienteId,
                $moduloId,
                escaparSql($juego['tipo']),
                escaparSql($juego['nombre']),
                escaparSql($juego['descripcion']),
                escaparSql($juego['icono']),
                escaparSql($juego['color']),
                $juego['orden'],
                escaparSql($timestamp),
                escaparSql($timestamp)
            );
            $id++;
        }
    }

    $insert = implode(",\n", $filasInsert);
    $autoIncrement = max($id, 2);

    return <<<SQL
/*Table structure for table `juegos` */

DROP TABLE IF EXISTS `juegos`;

CREATE TABLE `juegos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint unsigned DEFAULT NULL,
  `eje_id` bigint unsigned DEFAULT NULL,
  `tematica_id` bigint unsigned DEFAULT NULL,
  `modulo_id` bigint unsigned DEFAULT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `icono` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fa-gamepad',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#2563eb',
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `juegos_modulo_id_activo_orden_index` (`modulo_id`,`activo`,`orden`),
  KEY `juegos_ambiente_id_activo_orden_index` (`ambiente_id`,`activo`,`orden`),
  KEY `juegos_eje_id_activo_orden_index` (`eje_id`,`activo`,`orden`),
  KEY `juegos_tematica_id_activo_orden_index` (`tematica_id`,`activo`,`orden`),
  CONSTRAINT `juegos_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `juegos_eje_id_foreign` FOREIGN KEY (`eje_id`) REFERENCES `ejes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `juegos_modulo_id_foreign` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `juegos_tematica_id_foreign` FOREIGN KEY (`tematica_id`) REFERENCES `tematicas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT={$autoIncrement} DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `juegos` */

insert  into `juegos`(`id`,`ambiente_id`,`eje_id`,`tematica_id`,`modulo_id`,`tipo`,`nombre`,`descripcion`,`icono`,`color`,`orden`,`activo`,`created_at`,`updated_at`) values
{$insert};

SQL;
}

$partes = preg_split(
    '/(?=\/\*Table structure for table `[^`]+` \*\/)/',
    $contenido,
    -1,
    PREG_SPLIT_NO_EMPTY
);

$encabezado = array_shift($partes);
$bloquesPorTabla = [];
$eliminadas = 0;

foreach ($partes as $bloque) {
    if (! preg_match('/\/\*Table structure for table `([^`]+)` \*\//', $bloque, $coincidencia)) {
        continue;
    }

    $tabla = $coincidencia[1];

    if (in_array($tabla, $tablasEliminar, true)) {
        $eliminadas++;
        continue;
    }

    if (in_array($tabla, ['juegos', 'resultados_bloque_nino'], true)) {
        continue;
    }

    $bloquesPorTabla[$tabla] = $bloque;
}

$bloquesPorTabla['juegos'] = generarBloqueJuegos($contenido, $defaultsJuegos)."\n";
$bloquesPorTabla['resultados_bloque_nino'] = $bloqueResultadosNino."\n";

$ordenTablas = array_keys($bloquesPorTabla);
usort($ordenTablas, 'strnatcasecmp');

$salida = [$encabezado];
foreach ($ordenTablas as $tabla) {
    $salida[] = $bloquesPorTabla[$tabla];
}

$texto = implode('', $salida);

$migracionesNuevas = [
    "(48,'2026_09_02_000001_create_resultados_bloque_nino_table',18)",
    "(49,'2026_09_02_000002_drop_tablas_huerfanas',18)",
    "(50,'2026_09_02_000003_create_juegos_table',19)",
    "(51,'2026_09_02_000004_expand_juegos_curriculo_columns',19)",
];

foreach ($migracionesNuevas as $migracion) {
    if (! str_contains($texto, $migracion)) {
        $texto = preg_replace(
            '/(\(49,\'2026_09_02_000002_drop_tablas_huerfanas\',18\));/',
            '$1,'.implode(',', array_slice($migracionesNuevas, 2)),
            $texto,
            1
        );

        if (! str_contains($texto, "(48,'2026_09_02_000001_create_resultados_bloque_nino_table',18)")) {
            $texto = preg_replace(
                "/(\(47,'2026_08_28_000002_add_media_to_modulos_and_ejes',17\));/",
                '$1,'.implode(',', array_slice($migracionesNuevas, 0, 2)),
                $texto,
                1
            );
        }

        if (! str_contains($texto, "(50,'2026_09_02_000003_create_juegos_table',19)")) {
            $texto = preg_replace(
                '/(\(49,\'2026_09_02_000002_drop_tablas_huerfanas\',18\));/',
                '$1,'.implode(',', array_slice($migracionesNuevas, 2)),
                $texto,
                1
            );
        }
    }
}

$texto = preg_replace(
    '/(CREATE TABLE `migrations` \(\s*`id` int unsigned NOT NULL AUTO_INCREMENT,\s*`migration` varchar\(255\) COLLATE utf8mb4_unicode_ci NOT NULL,\s*`batch` int NOT NULL,\s*PRIMARY KEY \(`id`\)\s*\) ENGINE=InnoDB AUTO_INCREMENT=)\d+/',
    '${1}52',
    $texto,
    1
);

if (! str_contains($texto, "(50,'2026_09_02_000003_create_juegos_table',19)")) {
    $texto = str_replace(
        "(49,'2026_09_02_000002_drop_tablas_huerfanas',18);",
        "(49,'2026_09_02_000002_drop_tablas_huerfanas',18),\n(50,'2026_09_02_000003_create_juegos_table',19),\n(51,'2026_09_02_000004_expand_juegos_curriculo_columns',19);",
        $texto
    );
}

$texto = preg_replace(
    "/\(49,'2026_09_02_000002_drop_tablas_huerfanas',18\),\(50,'2026_09_02_000003_create_juegos_table',19\),\(51,'2026_09_02_000004_expand_juegos_curriculo_columns',19\)\s*(?!;)/",
    "(49,'2026_09_02_000002_drop_tablas_huerfanas',18),\n(50,'2026_09_02_000003_create_juegos_table',19),\n(51,'2026_09_02_000004_expand_juegos_curriculo_columns',19);",
    $texto
);

file_put_contents($rutaSql, $texto);

echo "Tablas huérfanas eliminadas: {$eliminadas}\n";
echo "Tabla juegos sincronizada\n";
echo "Tablas reordenadas alfabéticamente: ".count($ordenTablas)."\n";
echo "Archivo actualizado: {$rutaSql}\n";
