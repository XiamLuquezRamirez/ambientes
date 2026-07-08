/*
SQLyog Community v13.3.0 (64 bit)
MySQL - 8.0.41 : Database - ambientes
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`ambientes` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `ambientes`;

/*Table structure for table `piar` */

DROP TABLE IF EXISTS `piar`;

CREATE TABLE `piar` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `docente_id` bigint unsigned DEFAULT NULL,
  `estado` enum('borrador','revisado','aprobado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `paso` int DEFAULT NULL,
  `fecha_diligenciamiento` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `activo` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `piar_estudiante_id_unique` (`estudiante_id`),
  KEY `piar_docente_id_foreign` (`docente_id`),
  CONSTRAINT `piar_docente_id_foreign` FOREIGN KEY (`docente_id`) REFERENCES `docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `piar_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar` */

insert  into `piar`(`id`,`estudiante_id`,`docente_id`,`estado`,`paso`,`fecha_diligenciamiento`,`created_at`,`updated_at`,`activo`) values 
(6,13,3,'borrador',8,'2026-07-04','2026-07-04 08:40:50','2026-07-04 08:53:38',1);

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

/*Data for the table `piar_acta_compromiso` */

insert  into `piar_acta_compromiso`(`id`,`id_piar`,`compromisos`,`created_at`,`updated_at`) values 
(5,6,'uyikuy vgty  5rtu nj','2026-07-04 08:53:38','2026-07-04 08:53:38');

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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_acta_compromiso_actividades` */

insert  into `piar_acta_compromiso_actividades`(`id`,`id_acta_compromiso`,`nombre`,`descripcion`,`frecuencia`,`created_at`,`updated_at`) values 
(19,5,'uj\r\n\r\n\r\nbtguy','jikyyhik','S','2026-07-04 08:53:38','2026-07-04 08:53:38'),
(20,5,'guyvi k','uik v','D','2026-07-04 08:53:38','2026-07-04 08:53:38');

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

/*Data for the table `piar_ajuste_razonable` */

insert  into `piar_ajuste_razonable`(`id`,`id_piar`,`docente_orientador_id`,`docente_apoyo_pedagogico_id`,`docente_coordinador_pedagogico_id`,`docente_orientador_area`,`docente_apoyo_pedagogico_area`,`docente_coordinador_pedagogico_area`,`created_at`,`updated_at`) values 
(7,6,3,2,4,'sdfgsdfg','vvvvvv 111','fdgsdfgsdfg','2026-07-04 08:53:04','2026-07-04 08:53:04');

/*Table structure for table `piar_ajuste_razonable_docente_firma` */

DROP TABLE IF EXISTS `piar_ajuste_razonable_docente_firma`;

CREATE TABLE `piar_ajuste_razonable_docente_firma` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_ajuste_razonable` bigint unsigned NOT NULL,
  `id_docente` bigint unsigned NOT NULL,
  `area` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_ajuste_razonable_docente_firma` */

insert  into `piar_ajuste_razonable_docente_firma`(`id`,`id_ajuste_razonable`,`id_docente`,`area`,`created_at`,`updated_at`) values 
(34,7,3,'fgdfg','2026-07-08 15:53:33','2026-07-08 15:53:33'),
(35,7,4,'bbb','2026-07-08 15:53:33','2026-07-08 15:53:33'),
(36,7,2,'uuuu','2026-07-08 15:53:33','2026-07-08 15:53:33');

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
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_ajuste_razonable_item` */

insert  into `piar_ajuste_razonable_item`(`id`,`id_ajuste_razonable`,`area`,`barrera`,`tipo`,`apoyo`,`descripcion`,`seguimiento`,`created_at`,`updated_at`) values 
(32,7,'ne54y','df','iknpñ','guytik, vtgiuyhdfgh dfg hdfghdfghdfgh fdghfdghfdghfdghdfgh fdgh  hfdghdfg hdfhdgfhdfghfdghfdg h fdghf dgh fgdhfdghgfdh fdghfdghdfgh fdgh','hgoik vbn jnd fgh dfgh dfghdfgh  fghdfg hfdgh fdg hdfg h dfghdf gh dfgh dfghfdgh fdghdfghdfghfdgh fdghdfgh\r\nhyik hvyb\r\n\r\n\r\n nop0uh','yguv jhygtuj','2026-07-08 15:53:33','2026-07-08 15:53:33');

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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_atencion_medica` */

insert  into `piar_atencion_medica`(`id`,`id_entorno_salud`,`cual`,`frecuencia`,`created_at`,`updated_at`) values 
(37,8,'pedi sdfg dfsgfg f','2 diaas a la semana','2026-07-06 17:28:25','2026-07-06 17:28:25'),
(38,8,'gfdsgsdfg sdfgfsdgf','dsfgsd gsd sdfgsdfg','2026-07-06 17:28:25','2026-07-06 17:28:25'),
(39,8,'gsfdg gsdf sfdg','dfgsdfgsdfg fsdg gfdsg','2026-07-06 17:28:25','2026-07-06 17:28:25');

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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_datos_generales` */

insert  into `piar_datos_generales`(`id`,`id_piar`,`vinculado`,`victima`,`registro_victima`,`centro_proteccion`,`cual_centro_proteccion`,`grupo_etnico`,`cual_etnico`,`capacidades`,`gustos`,`expectativas_estudiante`,`expectativas_familia`,`redes_apoyo`,`otras`,`fecha_diligenciamiento`,`created_at`,`updated_at`) values 
(5,6,'Si','No','No','No','ddsd','Si','8888','El estudianjfgfag kgnfj687rr698nm 6u58ityi 686ytkkuyokluuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu yuuuutyrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu','y yyyyyyyyyyyyyyyyyyyyy lzxjkgpodjt msloa mshjndonjhwrsfrcgvfhg gfdhgdh  bggggggggggg','dhrfynb tufu6ruihj drutr8rfygk d7u5hjfgjt rey6trui tru56r re7yfyticvhyfuyujhvbjmn riuygoigk gikg, 6r8ihjoyuoy u8tyyyyyyykgh uytrfikghl ytooooo truitryik 6trrrrrrrrrrjfjgj tfutfu tuuuuuuuuuu rui6tuim','chgdfgu tiiiiiiiiiicvtk         tyityoikyuoi       kyhgdutfd  fjtggggggggd ffjgjjjjjjjjjjj dyuuuuuuuuuuuuuuuuuuuuuuuuuuu hjfdutrtyun  trur tyiktyiiiiiiiiiii fiyti     rujrtfgjghkhg truiygikgy ftriky yikoyuo','fgkjhlk  rtuygoi xhfhf frdytrifyg truuuuuuuuuuuuuuuuuudruy  truiytiytuloy  yigfyyyyyyyyyyyyyyyyyyyy ikyghouyotctuyy tyyyyyyyyyyyyyyyyyyyyyyy,m yi        yitiyu ytiiiuy','hgikiytufcdg fduyfdhjtr trurkjc rtu cjutuftgjnu','2026-07-04','2026-07-04 08:40:50','2026-07-06 11:28:52');

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

/*Data for the table `piar_entorno_educativo` */

insert  into `piar_entorno_educativo`(`id`,`id_piar`,`vinculado_otra_institucion`,`instituciones_anteriores`,`motivo_no_vinculado`,`ultimo_grado`,`estado_ultimo_grado`,`observaciones_estado`,`recibe_informe_pedagogico`,`institucion_informe`,`programas_complementarios`,`cuales_programas`,`created_at`,`updated_at`) values 
(5,6,'Si','c etr de apoyo',NULL,'transicion','Aprobado','k78i76','Si','xtib tyufd mytt','Si','gruy t','2026-07-04 08:45:35','2026-07-04 08:45:35');

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

/*Data for the table `piar_entorno_hogar` */

insert  into `piar_entorno_hogar`(`id`,`id_piar`,`nombre_madre`,`ocupacion_madre`,`nivel_madre`,`nombre_padre`,`ocupacion_padre`,`nivel_padre`,`nombre_cuidador`,`nivel_cuidador`,`telefono_cuidador`,`parentesco_cuidador`,`correo_cuidador`,`numero_hermanos`,`lugar_ocupa`,`apoyo_crianza`,`personas_con_quien_vive`,`created_at`,`updated_at`) values 
(4,6,',aria','vfdhg','Primaria','dfsghd b','estg','Primaria','fh','Bachillerato','3113006249','mamá','grovveip@gmail.com',-2,-4,'dh tuh tryhh','rthujgfj','2026-07-04 08:44:15','2026-07-04 08:44:15');

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

/*Data for the table `piar_entorno_salud` */

insert  into `piar_entorno_salud`(`id`,`id_piar`,`afiliado_salud`,`regimen`,`eps`,`lugar_emergencia`,`diagnostico_medico`,`cual_diagnostico`,`atencion_medica`,`tratamiento_integral`,`consume_medicamentos`,`ayudas_tecnicas`,`cuales_ayudas`,`created_at`,`updated_at`) values 
(8,6,'Si','Subsidiado','rewrqwer','cole','Si','3','Si','Si','Si','Si','sdasdasd','2026-07-04 08:42:48','2026-07-06 16:51:36');

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
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_medicamento` */

insert  into `piar_medicamento`(`id`,`id_entorno_salud`,`cual`,`frecuencia`,`horario`,`created_at`,`updated_at`) values 
(36,8,'zxgc','csdftrddfdg fdgf dsg fgfsd gfgfds g','dtg fg dfsgsdf gsdfgdsfgdfsg  sfdgfgsdfgsdfgsfdgf gsdfg','2026-07-06 17:28:25','2026-07-06 17:28:25'),
(37,8,'yturty','tyutryu yu rtyu','ytu rt utryuytru','2026-07-06 17:28:25','2026-07-06 17:28:25');

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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_tratamiento` */

insert  into `piar_tratamiento`(`id`,`id_entorno_salud`,`cual`,`frecuencia`,`created_at`,`updated_at`) values 
(36,8,'fhbfgujvcb gsfdgsf gsfg','jkygfkm c fgs ffg sdfgfsdgsd','2026-07-06 17:28:25','2026-07-06 17:28:25'),
(37,8,'foinonfg  sdfg  gsd gdfgsdfg','2 hjvggsdfg  g g gsdfgsfdgsdfgsfdg sfdgsfdg','2026-07-06 17:28:25','2026-07-06 17:28:25'),
(38,8,'tera o fggsdf gsdfgsdfg dfsg','2 fcvcvexf gsdgsdfg sdf g','2026-07-06 17:28:25','2026-07-06 17:28:25');

/*Table structure for table `piar_valoracion_pedagogica` */

DROP TABLE IF EXISTS `piar_valoracion_pedagogica`;

CREATE TABLE `piar_valoracion_pedagogica` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `vp_mov_apoyo_sistema` varchar(10) DEFAULT NULL,
  `vp_mov_apoyo_sistema_obs` text,
  `vp_mov_ajustes_espacio` varchar(10) DEFAULT NULL,
  `vp_mov_ajustes_espacio_obs` text,
  `vp_mov_ajustes_movilidad` varchar(10) DEFAULT NULL,
  `vp_mov_ajustes_movilidad_obs` text,
  `vp_mov_motricidad_fina` varchar(10) DEFAULT NULL,
  `vp_mov_motricidad_fina_obs` text,
  `vp_mov_adaptacion_agarrar` varchar(10) DEFAULT NULL,
  `vp_mov_adaptacion_agarrar_obs` text,
  `vp_mov_intensidad` varchar(50) DEFAULT NULL,
  `vp_com_apoyo_sistema` varchar(10) DEFAULT NULL,
  `vp_com_apoyo_sistema_obs` text,
  `vp_com_aditamentos` varchar(10) DEFAULT NULL,
  `vp_com_aditamentos_obs` text,
  `vp_com_ajustes` varchar(10) DEFAULT NULL,
  `vp_com_ajustes_obs` text,
  `vp_com_intensidad` varchar(50) DEFAULT NULL,
  `vp_info_apoyo_sistema` varchar(10) DEFAULT NULL,
  `vp_info_apoyo_sistema_obs` text,
  `vp_info_ajustes` varchar(10) DEFAULT NULL,
  `vp_info_ajustes_obs` text,
  `vp_info_intensidad` varchar(50) DEFAULT NULL,
  `vp_soc_apoyo_regulacion` varchar(10) DEFAULT NULL,
  `vp_soc_apoyo_regulacion_obs` text,
  `vp_soc_ajustes_interaccion` varchar(10) DEFAULT NULL,
  `vp_soc_ajustes_interaccion_obs` text,
  `vp_soc_intensidad` varchar(50) DEFAULT NULL,
  `vp_acad_ajustes_permanencia` varchar(10) DEFAULT NULL,
  `vp_acad_ajustes_permanencia_obs` text,
  `vp_acad_ajustes_tiempos` varchar(10) DEFAULT NULL,
  `vp_acad_ajustes_tiempos_obs` text,
  `vp_acad_intensidad` varchar(50) DEFAULT NULL,
  `vp_observaciones` text,
  `cle_1` varchar(10) DEFAULT NULL,
  `cle_1_obs` text,
  `cle_2` varchar(10) DEFAULT NULL,
  `cle_2_obs` text,
  `cle_3` varchar(10) DEFAULT NULL,
  `cle_3_obs` text,
  `cle_4` varchar(10) DEFAULT NULL,
  `cle_4_obs` text,
  `cle_5` varchar(10) DEFAULT NULL,
  `cle_5_obs` text,
  `cle_6` varchar(10) DEFAULT NULL,
  `cle_6_obs` text,
  `cle_7` varchar(10) DEFAULT NULL,
  `cle_7_obs` text,
  `cle_8` varchar(10) DEFAULT NULL,
  `cle_8_obs` text,
  `cle_9` varchar(10) DEFAULT NULL,
  `cle_9_obs` text,
  `cle_10` varchar(10) DEFAULT NULL,
  `cle_10_obs` text,
  `cle_11` varchar(10) DEFAULT NULL,
  `cle_11_obs` text,
  `cle_12` varchar(10) DEFAULT NULL,
  `cle_12_obs` text,
  `cle_13` varchar(10) DEFAULT NULL,
  `cle_13_obs` text,
  `cle_14` varchar(10) DEFAULT NULL,
  `cle_14_obs` text,
  `cle_15` varchar(10) DEFAULT NULL,
  `cle_15_obs` text,
  `cle_16` varchar(10) DEFAULT NULL,
  `cle_16_obs` text,
  `cle_17` varchar(10) DEFAULT NULL,
  `cle_17_obs` text,
  `cle_18` varchar(10) DEFAULT NULL,
  `cle_18_obs` text,
  `cle_observaciones` text,
  `clm_1` varchar(10) DEFAULT NULL,
  `clm_1_obs` text,
  `clm_2` varchar(10) DEFAULT NULL,
  `clm_2_obs` text,
  `clm_3` varchar(10) DEFAULT NULL,
  `clm_3_obs` text,
  `clm_4` varchar(10) DEFAULT NULL,
  `clm_4_obs` text,
  `clm_5_desde` int DEFAULT NULL,
  `clm_5_hasta` int DEFAULT NULL,
  `clm_5` varchar(10) DEFAULT NULL,
  `clm_5_obs` text,
  `clm_6` varchar(10) DEFAULT NULL,
  `clm_6_obs` text,
  `clm_7` varchar(10) DEFAULT NULL,
  `clm_7_obs` text,
  `clm_8` varchar(10) DEFAULT NULL,
  `clm_8_obs` text,
  `clm_9` varchar(10) DEFAULT NULL,
  `clm_9_obs` text,
  `clm_10` varchar(10) DEFAULT NULL,
  `clm_10_obs` text,
  `clm_11` varchar(10) DEFAULT NULL,
  `clm_11_obs` text,
  `clm_12` varchar(10) DEFAULT NULL,
  `clm_12_obs` text,
  `clm_13` varchar(10) DEFAULT NULL,
  `clm_13_obs` text,
  `clm_14` varchar(10) DEFAULT NULL,
  `clm_14_obs` text,
  `clm_15` varchar(10) DEFAULT NULL,
  `clm_15_obs` text,
  `clm_16` varchar(10) DEFAULT NULL,
  `clm_16_obs` text,
  `clm_17` varchar(10) DEFAULT NULL,
  `clm_17_obs` text,
  `clm_18` varchar(10) DEFAULT NULL,
  `clm_18_obs` text,
  `clm_19` varchar(10) DEFAULT NULL,
  `clm_19_obs` text,
  `clm_observaciones` text,
  `dba_mem_1` varchar(10) DEFAULT NULL,
  `dba_mem_1_obs` text,
  `dba_mem_2` varchar(10) DEFAULT NULL,
  `dba_mem_2_obs` text,
  `dba_mem_3` varchar(10) DEFAULT NULL,
  `dba_mem_3_obs` text,
  `dba_mem_4` varchar(10) DEFAULT NULL,
  `dba_mem_4_obs` text,
  `dba_mem_5` varchar(10) DEFAULT NULL,
  `dba_mem_5_obs` text,
  `dba_mem_6` varchar(10) DEFAULT NULL,
  `dba_mem_6_obs` text,
  `dba_mem_7` varchar(10) DEFAULT NULL,
  `dba_mem_7_obs` text,
  `dba_ate_1` varchar(10) DEFAULT NULL,
  `dba_ate_1_obs` text,
  `dba_ate_2` varchar(10) DEFAULT NULL,
  `dba_ate_2_obs` text,
  `dba_ate_3` varchar(10) DEFAULT NULL,
  `dba_ate_3_obs` text,
  `dba_ate_4` varchar(10) DEFAULT NULL,
  `dba_ate_4_obs` text,
  `dba_ate_4_tiempo` varchar(10) DEFAULT NULL,
  `dba_per_1` varchar(10) DEFAULT NULL,
  `dba_per_1_obs` text,
  `dba_per_2` varchar(10) DEFAULT NULL,
  `dba_per_2_obs` text,
  `dba_per_3` varchar(10) DEFAULT NULL,
  `dba_per_3_obs` text,
  `dba_per_4` varchar(10) DEFAULT NULL,
  `dba_per_4_obs` text,
  `dba_per_5` varchar(10) DEFAULT NULL,
  `dba_per_5_obs` text,
  `dba_fe_1` varchar(10) DEFAULT NULL,
  `dba_fe_1_obs` text,
  `dba_fe_2` varchar(10) DEFAULT NULL,
  `dba_fe_2_obs` text,
  `dba_fe_3` varchar(10) DEFAULT NULL,
  `dba_fe_3_obs` text,
  `dba_fe_4` varchar(10) DEFAULT NULL,
  `dba_fe_4_obs` text,
  `dba_fe_5` varchar(10) DEFAULT NULL,
  `dba_fe_5_obs` text,
  `dba_fe_6` varchar(10) DEFAULT NULL,
  `dba_fe_6_obs` text,
  `dba_lc_1` varchar(10) DEFAULT NULL,
  `dba_lc_1_obs` text,
  `dba_lc_2` varchar(10) DEFAULT NULL,
  `dba_lc_2_obs` text,
  `dba_lc_3` varchar(10) DEFAULT NULL,
  `dba_lc_3_obs` text,
  `dba_lc_4` varchar(10) DEFAULT NULL,
  `dba_lc_4_obs` text,
  `dba_lc_5` varchar(10) DEFAULT NULL,
  `dba_lc_5_obs` text,
  `dba_lc_6` varchar(10) DEFAULT NULL,
  `dba_lc_6_obs` text,
  `dba_lc_7` varchar(10) DEFAULT NULL,
  `dba_lc_7_obs` text,
  `dba_lc_8` varchar(10) DEFAULT NULL,
  `dba_lc_8_obs` text,
  `dba_lc_9` varchar(10) DEFAULT NULL,
  `dba_lc_9_obs` text,
  `dba_lc_10` varchar(10) DEFAULT NULL,
  `dba_lc_10_obs` text,
  `habilidades_destrezas` text,
  `estrategias_acciones` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `piar_valoracion_pedagogica` */

insert  into `piar_valoracion_pedagogica`(`id`,`id_piar`,`vp_mov_apoyo_sistema`,`vp_mov_apoyo_sistema_obs`,`vp_mov_ajustes_espacio`,`vp_mov_ajustes_espacio_obs`,`vp_mov_ajustes_movilidad`,`vp_mov_ajustes_movilidad_obs`,`vp_mov_motricidad_fina`,`vp_mov_motricidad_fina_obs`,`vp_mov_adaptacion_agarrar`,`vp_mov_adaptacion_agarrar_obs`,`vp_mov_intensidad`,`vp_com_apoyo_sistema`,`vp_com_apoyo_sistema_obs`,`vp_com_aditamentos`,`vp_com_aditamentos_obs`,`vp_com_ajustes`,`vp_com_ajustes_obs`,`vp_com_intensidad`,`vp_info_apoyo_sistema`,`vp_info_apoyo_sistema_obs`,`vp_info_ajustes`,`vp_info_ajustes_obs`,`vp_info_intensidad`,`vp_soc_apoyo_regulacion`,`vp_soc_apoyo_regulacion_obs`,`vp_soc_ajustes_interaccion`,`vp_soc_ajustes_interaccion_obs`,`vp_soc_intensidad`,`vp_acad_ajustes_permanencia`,`vp_acad_ajustes_permanencia_obs`,`vp_acad_ajustes_tiempos`,`vp_acad_ajustes_tiempos_obs`,`vp_acad_intensidad`,`vp_observaciones`,`cle_1`,`cle_1_obs`,`cle_2`,`cle_2_obs`,`cle_3`,`cle_3_obs`,`cle_4`,`cle_4_obs`,`cle_5`,`cle_5_obs`,`cle_6`,`cle_6_obs`,`cle_7`,`cle_7_obs`,`cle_8`,`cle_8_obs`,`cle_9`,`cle_9_obs`,`cle_10`,`cle_10_obs`,`cle_11`,`cle_11_obs`,`cle_12`,`cle_12_obs`,`cle_13`,`cle_13_obs`,`cle_14`,`cle_14_obs`,`cle_15`,`cle_15_obs`,`cle_16`,`cle_16_obs`,`cle_17`,`cle_17_obs`,`cle_18`,`cle_18_obs`,`cle_observaciones`,`clm_1`,`clm_1_obs`,`clm_2`,`clm_2_obs`,`clm_3`,`clm_3_obs`,`clm_4`,`clm_4_obs`,`clm_5_desde`,`clm_5_hasta`,`clm_5`,`clm_5_obs`,`clm_6`,`clm_6_obs`,`clm_7`,`clm_7_obs`,`clm_8`,`clm_8_obs`,`clm_9`,`clm_9_obs`,`clm_10`,`clm_10_obs`,`clm_11`,`clm_11_obs`,`clm_12`,`clm_12_obs`,`clm_13`,`clm_13_obs`,`clm_14`,`clm_14_obs`,`clm_15`,`clm_15_obs`,`clm_16`,`clm_16_obs`,`clm_17`,`clm_17_obs`,`clm_18`,`clm_18_obs`,`clm_19`,`clm_19_obs`,`clm_observaciones`,`dba_mem_1`,`dba_mem_1_obs`,`dba_mem_2`,`dba_mem_2_obs`,`dba_mem_3`,`dba_mem_3_obs`,`dba_mem_4`,`dba_mem_4_obs`,`dba_mem_5`,`dba_mem_5_obs`,`dba_mem_6`,`dba_mem_6_obs`,`dba_mem_7`,`dba_mem_7_obs`,`dba_ate_1`,`dba_ate_1_obs`,`dba_ate_2`,`dba_ate_2_obs`,`dba_ate_3`,`dba_ate_3_obs`,`dba_ate_4`,`dba_ate_4_obs`,`dba_ate_4_tiempo`,`dba_per_1`,`dba_per_1_obs`,`dba_per_2`,`dba_per_2_obs`,`dba_per_3`,`dba_per_3_obs`,`dba_per_4`,`dba_per_4_obs`,`dba_per_5`,`dba_per_5_obs`,`dba_fe_1`,`dba_fe_1_obs`,`dba_fe_2`,`dba_fe_2_obs`,`dba_fe_3`,`dba_fe_3_obs`,`dba_fe_4`,`dba_fe_4_obs`,`dba_fe_5`,`dba_fe_5_obs`,`dba_fe_6`,`dba_fe_6_obs`,`dba_lc_1`,`dba_lc_1_obs`,`dba_lc_2`,`dba_lc_2_obs`,`dba_lc_3`,`dba_lc_3_obs`,`dba_lc_4`,`dba_lc_4_obs`,`dba_lc_5`,`dba_lc_5_obs`,`dba_lc_6`,`dba_lc_6_obs`,`dba_lc_7`,`dba_lc_7_obs`,`dba_lc_8`,`dba_lc_8_obs`,`dba_lc_9`,`dba_lc_9_obs`,`dba_lc_10`,`dba_lc_10_obs`,`habilidades_destrezas`,`estrategias_acciones`,`created_at`,`updated_at`) values 
(4,6,'No',NULL,'No',NULL,'No','¿Requiere apoyos para favorecer su motricidad fina? (no es\r\nmovilidad)','No',NULL,'Si',NULL,'extenso','No',NULL,'No','sdgs sdfsdf sd sadfasdf asdfasfasdf sf asdf asdfafasdfasd f dfa sdf','Si',NULL,'extenso','No',NULL,'No','SFD SADF FDSAFDSF SDFASDFASDFASDF DSFDASFD','extenso','Si',NULL,'Si','SFD SADF FDSAFDSF SDFASDFASDFASDF DSFDASFD','generalizado','Si',NULL,'Si',NULL,'extenso','zvgfsdtgs shgrh','No',NULL,'Si',NULL,'Si','xto. Lorem Ipsum ha sido el texto de relleno estándar de las industrias desde el año 1500, cuando un impresor (N. del T. persona que se dedica a la impren','Si',NULL,'Si',NULL,'Si',NULL,'No','v h jgj','No',NULL,'Si',NULL,'No',NULL,'No',NULL,'No',NULL,'No',NULL,'No','xto. Lorem Ipsum ha sido el texto de relleno estándar de las industrias desde el año 1500, cuando un impresor (N. del T. persona que se dedica a la impren','No',NULL,'Si','xto. Lorem Ipsum ha sido el texto de relleno estándar de las industrias desde el año 1500, cuando un impresor (N. del T. persona que se dedica a la impren','Si',NULL,'Si',NULL,'vnftgjhftjuytr jfturt','No',NULL,'Si',NULL,'Si',NULL,'Si',NULL,10,11,'Si',NULL,'Si',NULL,'Si',NULL,'Si',NULL,'Si',NULL,'No',NULL,'No','nbkbhk','No',NULL,'Si','cxhbxf','Si',NULL,'Si',NULL,'Si',NULL,'Si',NULL,'Si',NULL,'No','tiktgyymju','yuitfygjy','Si',NULL,'Si','de relleno en documentos electrónicos, quedando esencialmente igual al original. Fue popularizado en los 60s con la creación de las','Si',NULL,'No',NULL,'Si','de relleno en documentos electrónicos, quedando esencialmente igual al original. Fue popularizado en los 60s con la creación de las','Si',NULL,'Si',NULL,'No',NULL,'Si',NULL,'Si',NULL,'No','gfhjftg 2','10','Si',NULL,'Si',' El punto de usar Lorem Ipsum es que tiene una distribución más o menos normal de las letras, al contrario de usar textos como por ejemplo','No',NULL,'Si',NULL,'Si',NULL,'Si',' encuentran en estado de desarrollo. Muchas versiones han evolucionado a través de los años, algunas veces por accidente, otras vece','Si',NULL,'No',NULL,'Si',NULL,'No',NULL,'Si',NULL,'Si',NULL,'No',NULL,'Si','LENGUAJE Y COMUNICACIÓN','No',NULL,'No',NULL,'No',NULL,'No',NULL,'No',NULL,'No',NULL,'Si',NULL,'ry hyedhth tuht hy\r\nt\r\n\r\n\r\n\r\n\r\nthn rfth','gfjn \r\n\r\n\r\ngytuj','2026-07-04 08:51:53','2026-07-07 10:51:48');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
