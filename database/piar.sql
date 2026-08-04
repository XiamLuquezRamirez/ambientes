
DROP TABLE IF EXISTS `piar`;

CREATE TABLE `piar` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `docente_id` bigint unsigned DEFAULT NULL,
  `estado` enum('borrador','revisado','aprobado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `paso` int DEFAULT NULL,
  `fecha_diligenciamiento` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `activo` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `piar_estudiante_id_unique` (`estudiante_id`),
  KEY `piar_docente_id_foreign` (`docente_id`),
  CONSTRAINT `piar_docente_id_foreign` FOREIGN KEY (`docente_id`) REFERENCES `docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `piar_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Table structure for table `piar_acta_compromiso` */

DROP TABLE IF EXISTS `piar_acta_compromiso`;

CREATE TABLE `piar_acta_compromiso` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `compromisos` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_acta_compromiso_actividades` */

DROP TABLE IF EXISTS `piar_acta_compromiso_actividades`;

CREATE TABLE `piar_acta_compromiso_actividades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_acta_compromiso` bigint unsigned NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text,
  `frecuencia` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_ajuste_razonable` */

DROP TABLE IF EXISTS `piar_ajuste_razonable`;

CREATE TABLE `piar_ajuste_razonable` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `docente_orientador_id` bigint unsigned DEFAULT NULL,
  `docente_apoyo_pedagogico_id` bigint unsigned DEFAULT NULL,
  `docente_coordinador_pedagogico_id` bigint unsigned DEFAULT NULL,
  `docente_orientador_area` text,
  `docente_apoyo_pedagogico_area` text,
  `docente_coordinador_pedagogico_area` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_ajuste_razonable_docente_firma` */

DROP TABLE IF EXISTS `piar_ajuste_razonable_docente_firma`;

CREATE TABLE `piar_ajuste_razonable_docente_firma` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_ajuste_razonable` bigint unsigned NOT NULL,
  `docente_id` bigint unsigned NOT NULL,
  `area` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_ajuste_razonable_item` */

DROP TABLE IF EXISTS `piar_ajuste_razonable_item`;

CREATE TABLE `piar_ajuste_razonable_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_ajuste_razonable` bigint unsigned NOT NULL,
  `area` varchar(255) DEFAULT NULL,
  `barrera` text,
  `tipo` varchar(255) DEFAULT NULL,
  `apoyo` text,
  `descripcion` text,
  `seguimiento` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_atencion_medica` */

DROP TABLE IF EXISTS `piar_atencion_medica`;

CREATE TABLE `piar_atencion_medica` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_entorno_salud` bigint unsigned NOT NULL,
  `cual` varchar(255) NOT NULL,
  `frecuencia` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_datos_generales` */

DROP TABLE IF EXISTS `piar_datos_generales`;

CREATE TABLE `piar_datos_generales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `vinculado` varchar(255) DEFAULT NULL,
  `victima` varchar(10) DEFAULT NULL,
  `registro_victima` varchar(255) DEFAULT NULL,
  `centro_proteccion` varchar(10) DEFAULT NULL,
  `cual_centro_proteccion` varchar(255) DEFAULT NULL,
  `grupo_etnico` varchar(10) DEFAULT NULL,
  `cual_etnico` varchar(255) DEFAULT NULL,
  `capacidades` text,
  `gustos` text,
  `expectativas_estudiante` text,
  `expectativas_familia` text,
  `redes_apoyo` text,
  `otras` text,
  `fecha_diligenciamiento` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_entorno_educativo` */

DROP TABLE IF EXISTS `piar_entorno_educativo`;

CREATE TABLE `piar_entorno_educativo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `vinculado_otra_institucion` varchar(10) DEFAULT NULL,
  `instituciones_anteriores` text,
  `motivo_no_vinculado` text,
  `ultimo_grado` varchar(100) DEFAULT NULL,
  `estado_ultimo_grado` varchar(100) DEFAULT NULL,
  `observaciones_estado` text,
  `recibe_informe_pedagogico` varchar(10) DEFAULT NULL,
  `institucion_informe` varchar(255) DEFAULT NULL,
  `programas_complementarios` varchar(10) DEFAULT NULL,
  `cuales_programas` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_entorno_hogar` */

DROP TABLE IF EXISTS `piar_entorno_hogar`;

CREATE TABLE `piar_entorno_hogar` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `nombre_madre` varchar(255) DEFAULT NULL,
  `ocupacion_madre` varchar(255) DEFAULT NULL,
  `nivel_madre` varchar(100) DEFAULT NULL,
  `nombre_padre` varchar(255) DEFAULT NULL,
  `ocupacion_padre` varchar(255) DEFAULT NULL,
  `nivel_padre` varchar(100) DEFAULT NULL,
  `nombre_cuidador` varchar(255) DEFAULT NULL,
  `nivel_cuidador` varchar(100) DEFAULT NULL,
  `telefono_cuidador` varchar(30) DEFAULT NULL,
  `parentesco_cuidador` varchar(100) DEFAULT NULL,
  `correo_cuidador` varchar(255) DEFAULT NULL,
  `numero_hermanos` int DEFAULT NULL,
  `lugar_ocupa` int DEFAULT NULL,
  `apoyo_crianza` text,
  `personas_con_quien_vive` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_entorno_salud` */

DROP TABLE IF EXISTS `piar_entorno_salud`;

CREATE TABLE `piar_entorno_salud` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `afiliado_salud` varchar(10) DEFAULT NULL,
  `regimen` varchar(50) DEFAULT NULL,
  `eps` varchar(255) DEFAULT NULL,
  `lugar_emergencia` varchar(255) DEFAULT NULL,
  `diagnostico_medico` varchar(10) DEFAULT NULL,
  `cual_diagnostico` text,
  `atencion_medica` varchar(10) DEFAULT NULL,
  `tratamiento_integral` varchar(10) DEFAULT NULL,
  `consume_medicamentos` varchar(10) DEFAULT NULL,
  `ayudas_tecnicas` varchar(10) DEFAULT NULL,
  `cuales_ayudas` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_medicamento` */

DROP TABLE IF EXISTS `piar_medicamento`;

CREATE TABLE `piar_medicamento` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_entorno_salud` bigint unsigned NOT NULL,
  `cual` varchar(255) NOT NULL,
  `frecuencia` varchar(255) NOT NULL,
  `horario` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_tratamiento` */

DROP TABLE IF EXISTS `piar_tratamiento`;

CREATE TABLE `piar_tratamiento` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_entorno_salud` bigint unsigned NOT NULL,
  `cual` varchar(255) NOT NULL,
  `frecuencia` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Table structure for table `piar_valoracion_pedagogica` */

DROP TABLE IF EXISTS `piar_valoracion_pedagogica`;

CREATE TABLE `piar_valoracion_pedagogica` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `vp_mov_apoyo_sistema` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_mov_apoyo_sistema_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_mov_ajustes_espacio` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_mov_ajustes_espacio_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_mov_ajustes_movilidad` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_mov_ajustes_movilidad_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_mov_motricidad_fina` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_mov_motricidad_fina_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_mov_adaptacion_agarrar` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_mov_adaptacion_agarrar_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_mov_intensidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_com_apoyo_sistema` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_com_apoyo_sistema_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_com_aditamentos` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_com_aditamentos_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_com_ajustes` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_com_ajustes_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_com_intensidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_info_apoyo_sistema` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_info_apoyo_sistema_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_info_ajustes` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_info_ajustes_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_info_intensidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_soc_apoyo_regulacion` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_soc_apoyo_regulacion_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_soc_ajustes_interaccion` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_soc_ajustes_interaccion_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_soc_intensidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_acad_ajustes_permanencia` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_acad_ajustes_permanencia_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_acad_ajustes_tiempos` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_acad_ajustes_tiempos_obs` text COLLATE utf8mb4_unicode_ci,
  `vp_acad_intensidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vp_observaciones` text COLLATE utf8mb4_unicode_ci,
  `cle_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_1_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_2_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_3_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_4_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_5` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_5_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_6` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_6_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_7` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_7_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_8` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_8_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_9` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_9_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_10` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_10_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_11` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_11_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_12` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_12_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_13` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_13_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_14` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_14_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_15` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_15_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_16` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_16_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_17` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_17_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_18` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cle_18_obs` text COLLATE utf8mb4_unicode_ci,
  `cle_observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `clm_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_1_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_2_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_3_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_4_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_5_desde` int DEFAULT NULL,
  `clm_5_hasta` int DEFAULT NULL,
  `clm_5` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_5_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_6` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_6_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_7` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_7_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_8` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_8_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_9` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_9_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_10` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_10_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_11` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_11_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_12` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_12_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_13` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_13_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_14` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_14_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_15` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_15_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_16` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_16_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_17` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_17_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_18` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_18_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_19` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clm_19_obs` text COLLATE utf8mb4_unicode_ci,
  `clm_observaciones` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_1_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_2_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_3_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_4_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_5` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_5_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_6` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_6_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_mem_7` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_mem_7_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_ate_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_ate_1_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_ate_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_ate_2_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_ate_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_ate_3_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_ate_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_ate_4_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_ate_4_tiempo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_per_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_per_1_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_per_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_per_2_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_per_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_per_3_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_per_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_per_4_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_per_5` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_per_5_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_fe_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_fe_1_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_fe_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_fe_2_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_fe_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_fe_3_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_fe_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_fe_4_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_fe_5` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_fe_5_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_fe_6` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_fe_6_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_1` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_1_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_2_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_3` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_3_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_4` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_4_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_5` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_5_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_6` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_6_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_7` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_7_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_8` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_8_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_9` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_9_obs` text COLLATE utf8mb4_unicode_ci,
  `dba_lc_10` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dba_lc_10_obs` text COLLATE utf8mb4_unicode_ci,
  `habilidades_destrezas` text COLLATE utf8mb4_unicode_ci,
  `estrategias_acciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;