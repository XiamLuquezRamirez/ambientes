/*
SQLyog Community v13.3.0 (64 bit)
MySQL - 8.0.41 : Database - ambientes
Charset / Collation: utf8mb4 / utf8mb4_unicode_ci
*********************************************************************
*/

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `ambientes`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ambientes`;

/*!40101 SET character_set_client = utf8mb4 */;

/*Table structure for table `actividades` */

DROP TABLE IF EXISTS `actividades`;

CREATE TABLE `actividades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tema_id` bigint unsigned NOT NULL,
  `tipo` enum('audio','video_lsc','animacion','juego','simulacion') NOT NULL,
  `contenido_path` varchar(255) NOT NULL,
  `configuracion` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `actividades_tema_id_foreign` (`tema_id`),
  CONSTRAINT `actividades_tema_id_foreign` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `actividades_chk_1` CHECK (json_valid(`configuracion`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `actividades` */

/*Table structure for table `ajustes_temporales` */

DROP TABLE IF EXISTS `ajustes_temporales`;

CREATE TABLE `ajustes_temporales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `clave` varchar(255) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `expira_en` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ajustes_temporales_estudiante_id_clave_unique` (`estudiante_id`,`clave`),
  CONSTRAINT `ajustes_temporales_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `ajustes_temporales` */

/*Table structure for table `ambiente_grado` */

DROP TABLE IF EXISTS `ambiente_grado`;

CREATE TABLE `ambiente_grado` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint unsigned NOT NULL,
  `grado_id` bigint unsigned NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ambiente_id` (`ambiente_id`,`grado_id`),
  KEY `grado_id` (`grado_id`),
  CONSTRAINT `ambiente_grado_ibfk_1` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`),
  CONSTRAINT `ambiente_grado_ibfk_2` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `ambiente_grado` */

insert  into `ambiente_grado`(`id`,`ambiente_id`,`grado_id`,`activo`) values
(1,1,1,1),
(2,1,2,1),
(3,1,3,1),
(4,2,1,1),
(5,2,2,1),
(6,3,2,1),
(7,3,3,1),
(8,4,1,1),
(9,4,2,1),
(10,4,3,1),
(11,5,3,1),
(12,3,1,1),
(13,8,1,1),
(14,8,2,1),
(15,8,3,1),
(16,9,1,1),
(17,9,2,1),
(18,9,3,1),
(19,6,1,1),
(20,6,2,1),
(21,6,3,1),
(22,7,1,1),
(23,7,2,1),
(24,7,3,1),
(25,10,1,1),
(26,10,2,1),
(27,10,3,1);

/*Table structure for table `ambiente_institucion` */

DROP TABLE IF EXISTS `ambiente_institucion`;

CREATE TABLE `ambiente_institucion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint unsigned NOT NULL,
  `institucion_id` bigint unsigned NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `puerto` smallint unsigned DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ambiente_institucion_unique` (`ambiente_id`,`institucion_id`),
  KEY `ambiente_institucion_institucion_id_foreign` (`institucion_id`),
  CONSTRAINT `ambiente_institucion_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ambiente_institucion_institucion_id_foreign` FOREIGN KEY (`institucion_id`) REFERENCES `instituciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `ambiente_institucion` */

insert  into `ambiente_institucion`(`id`,`ambiente_id`,`institucion_id`,`ip`,`puerto`,`activo`,`created_at`,`updated_at`) values
(2,6,1,'192.168.1.11',NULL,1,'2026-08-04 08:52:01','2026-08-04 08:52:01'),
(3,7,1,'192.168.1.12',NULL,1,'2026-08-04 08:52:01','2026-08-04 08:52:01'),
(4,8,1,'192.168.1.13',NULL,1,'2026-08-04 08:52:01','2026-08-04 08:52:01'),
(5,9,1,'192.168.1.14',NULL,1,'2026-08-04 08:52:01','2026-08-04 08:52:01'),
(6,10,1,'192.168.1.15',NULL,1,'2026-08-04 08:52:01','2026-08-04 08:52:01');

/*Table structure for table `ambientes` */

DROP TABLE IF EXISTS `ambientes`;

CREATE TABLE `ambientes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `color_hex` varchar(9) NOT NULL,
  `icono` varchar(255) NOT NULL,
  `servidor_ip` varchar(15) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `cupo_defecto` smallint unsigned NOT NULL DEFAULT '25',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ambientes_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `ambientes` */

insert  into `ambientes`(`id`,`nombre`,`slug`,`color_hex`,`icono`,`servidor_ip`,`activo`,`cupo_defecto`,`created_at`,`updated_at`) values
(6,'Expresión Artística','expresion-artistica','#0F6E56','🎨','192.168.1.20',1,25,'2026-08-04 08:38:25','2026-08-04 08:38:25'),
(7,'Polimotor','polimotor','#534AB7','🤸','192.168.1.21',1,25,'2026-08-04 08:38:25','2026-08-04 08:38:25'),
(8,'Multisaberes','multisaberes','#854F0B','🧠','192.168.1.22',1,25,'2026-08-04 08:38:25','2026-08-04 08:38:25'),
(9,'Multisensorial','multisensorial','#185FA5','✋','192.168.1.23',1,25,'2026-08-04 08:38:25','2026-08-04 08:38:25'),
(10,'Tecnología','tecnologia','#993C1D','💻','192.168.1.24',1,25,'2026-08-04 08:38:25','2026-08-04 08:38:25');

/*Table structure for table `asistencias` */

DROP TABLE IF EXISTS `asistencias`;

CREATE TABLE `asistencias` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `carga_docente_id` bigint unsigned NOT NULL,
  `estudiante_id` bigint unsigned NOT NULL,
  `fecha` date NOT NULL,
  `presente` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asistencias_estudiante_id_fecha_unique` (`estudiante_id`,`fecha`),
  KEY `asistencias_carga_docente_id_foreign` (`carga_docente_id`),
  CONSTRAINT `asistencias_carga_docente_id_foreign` FOREIGN KEY (`carga_docente_id`) REFERENCES `carga_docente` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asistencias_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `asistencias` */

/*Table structure for table `carga_docente` */

DROP TABLE IF EXISTS `carga_docente`;

CREATE TABLE `carga_docente` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `docente_id` bigint unsigned NOT NULL,
  `ambiente_id` bigint unsigned NOT NULL,
  `grado_id` bigint unsigned NOT NULL,
  `grupo_id` bigint unsigned NOT NULL,
  `anio_lectivo` year NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_carga_docente` (`docente_id`,`ambiente_id`,`grado_id`,`grupo_id`,`anio_lectivo`),
  KEY `carga_docente_grado_id_foreign` (`grado_id`),
  KEY `carga_docente_grupo_id_foreign` (`grupo_id`),
  KEY `carga_docente_docente_id_anio_lectivo_index` (`docente_id`,`anio_lectivo`),
  KEY `carga_docente_ambiente_id_grado_id_grupo_id_anio_lectivo_index` (`ambiente_id`,`grado_id`,`grupo_id`,`anio_lectivo`),
  CONSTRAINT `carga_docente_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`),
  CONSTRAINT `carga_docente_docente_id_foreign` FOREIGN KEY (`docente_id`) REFERENCES `docentes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `carga_docente_grado_id_foreign` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`),
  CONSTRAINT `carga_docente_grupo_id_foreign` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `carga_docente` */

insert  into `carga_docente`(`id`,`docente_id`,`ambiente_id`,`grado_id`,`grupo_id`,`anio_lectivo`,`activo`,`created_at`,`updated_at`) values
(2,2,8,1,1,2026,1,'2026-08-04 09:02:28','2026-08-04 09:02:28'),
(3,2,8,1,28,2026,1,'2026-08-04 09:02:35','2026-08-04 09:02:35'),
(4,2,8,2,3,2026,1,'2026-08-04 09:02:44','2026-08-04 09:02:44'),
(5,2,8,2,4,2026,0,'2026-08-04 09:02:52','2026-08-04 09:02:54'),
(6,2,9,1,1,2026,1,'2026-08-04 09:03:15','2026-08-04 09:03:15');

/*Table structure for table `cola_sincronizacion` */

DROP TABLE IF EXISTS `cola_sincronizacion`;

CREATE TABLE `cola_sincronizacion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entidad` varchar(255) NOT NULL,
  `entidad_id` bigint unsigned NOT NULL,
  `accion` enum('create','update','delete','transfer') NOT NULL,
  `servidor_origen` varchar(255) NOT NULL DEFAULT 'musica',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `estado` enum('pendiente','enviado','confirmado','error') NOT NULL DEFAULT 'pendiente',
  `intentos` tinyint unsigned NOT NULL DEFAULT '0',
  `enviado_en` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `cola_sincronizacion_chk_1` CHECK (json_valid(`payload`))
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `cola_sincronizacion` */

insert  into `cola_sincronizacion`(`id`,`entidad`,`entidad_id`,`accion`,`servidor_origen`,`payload`,`estado`,`intentos`,`enviado_en`,`created_at`,`updated_at`) values
(1,'Estudiante',1,'update','polimotor','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(2,'Estudiante',1,'update','logico','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(3,'Estudiante',1,'update','multisensorial','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(4,'Estudiante',1,'update','tecnologia','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(5,'CargaDocente',2,'create','musica','{\"id\":2,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:28.000000Z\",\"updated_at\":\"2026-08-04T14:02:28.000000Z\",\"servidor_destino\":\"musica\"}','pendiente',0,NULL,'2026-08-04 09:02:28','2026-08-04 09:02:28'),
(6,'CargaDocente',2,'create','musica','{\"id\":2,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:28.000000Z\",\"updated_at\":\"2026-08-04T14:02:28.000000Z\",\"servidor_destino\":\"polimotor\"}','pendiente',0,NULL,'2026-08-04 09:02:28','2026-08-04 09:02:28'),
(7,'CargaDocente',2,'create','musica','{\"id\":2,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:28.000000Z\",\"updated_at\":\"2026-08-04T14:02:28.000000Z\",\"servidor_destino\":\"logico\"}','pendiente',0,NULL,'2026-08-04 09:02:28','2026-08-04 09:02:28'),
(8,'CargaDocente',2,'create','musica','{\"id\":2,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:28.000000Z\",\"updated_at\":\"2026-08-04T14:02:28.000000Z\",\"servidor_destino\":\"multisensorial\"}','pendiente',0,NULL,'2026-08-04 09:02:28','2026-08-04 09:02:28'),
(9,'CargaDocente',2,'create','musica','{\"id\":2,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:28.000000Z\",\"updated_at\":\"2026-08-04T14:02:28.000000Z\",\"servidor_destino\":\"tecnologia\"}','pendiente',0,NULL,'2026-08-04 09:02:28','2026-08-04 09:02:28'),
(10,'CargaDocente',3,'create','musica','{\"id\":3,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":28,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:35.000000Z\",\"updated_at\":\"2026-08-04T14:02:35.000000Z\",\"servidor_destino\":\"musica\"}','pendiente',0,NULL,'2026-08-04 09:02:35','2026-08-04 09:02:35'),
(11,'CargaDocente',3,'create','musica','{\"id\":3,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":28,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:35.000000Z\",\"updated_at\":\"2026-08-04T14:02:35.000000Z\",\"servidor_destino\":\"polimotor\"}','pendiente',0,NULL,'2026-08-04 09:02:35','2026-08-04 09:02:35'),
(12,'CargaDocente',3,'create','musica','{\"id\":3,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":28,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:35.000000Z\",\"updated_at\":\"2026-08-04T14:02:35.000000Z\",\"servidor_destino\":\"logico\"}','pendiente',0,NULL,'2026-08-04 09:02:35','2026-08-04 09:02:35'),
(13,'CargaDocente',3,'create','musica','{\"id\":3,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":28,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:35.000000Z\",\"updated_at\":\"2026-08-04T14:02:35.000000Z\",\"servidor_destino\":\"multisensorial\"}','pendiente',0,NULL,'2026-08-04 09:02:35','2026-08-04 09:02:35'),
(14,'CargaDocente',3,'create','musica','{\"id\":3,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":1,\"grupo_id\":28,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:35.000000Z\",\"updated_at\":\"2026-08-04T14:02:35.000000Z\",\"servidor_destino\":\"tecnologia\"}','pendiente',0,NULL,'2026-08-04 09:02:35','2026-08-04 09:02:35'),
(15,'CargaDocente',4,'create','musica','{\"id\":4,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":3,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:44.000000Z\",\"updated_at\":\"2026-08-04T14:02:44.000000Z\",\"servidor_destino\":\"musica\"}','pendiente',0,NULL,'2026-08-04 09:02:44','2026-08-04 09:02:44'),
(16,'CargaDocente',4,'create','musica','{\"id\":4,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":3,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:44.000000Z\",\"updated_at\":\"2026-08-04T14:02:44.000000Z\",\"servidor_destino\":\"polimotor\"}','pendiente',0,NULL,'2026-08-04 09:02:44','2026-08-04 09:02:44'),
(17,'CargaDocente',4,'create','musica','{\"id\":4,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":3,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:44.000000Z\",\"updated_at\":\"2026-08-04T14:02:44.000000Z\",\"servidor_destino\":\"logico\"}','pendiente',0,NULL,'2026-08-04 09:02:44','2026-08-04 09:02:44'),
(18,'CargaDocente',4,'create','musica','{\"id\":4,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":3,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:44.000000Z\",\"updated_at\":\"2026-08-04T14:02:44.000000Z\",\"servidor_destino\":\"multisensorial\"}','pendiente',0,NULL,'2026-08-04 09:02:44','2026-08-04 09:02:44'),
(19,'CargaDocente',4,'create','musica','{\"id\":4,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":3,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:44.000000Z\",\"updated_at\":\"2026-08-04T14:02:44.000000Z\",\"servidor_destino\":\"tecnologia\"}','pendiente',0,NULL,'2026-08-04 09:02:44','2026-08-04 09:02:44'),
(20,'CargaDocente',5,'create','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:52.000000Z\",\"servidor_destino\":\"musica\"}','pendiente',0,NULL,'2026-08-04 09:02:52','2026-08-04 09:02:52'),
(21,'CargaDocente',5,'create','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:52.000000Z\",\"servidor_destino\":\"polimotor\"}','pendiente',0,NULL,'2026-08-04 09:02:52','2026-08-04 09:02:52'),
(22,'CargaDocente',5,'create','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:52.000000Z\",\"servidor_destino\":\"logico\"}','pendiente',0,NULL,'2026-08-04 09:02:52','2026-08-04 09:02:52'),
(23,'CargaDocente',5,'create','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:52.000000Z\",\"servidor_destino\":\"multisensorial\"}','pendiente',0,NULL,'2026-08-04 09:02:52','2026-08-04 09:02:52'),
(24,'CargaDocente',5,'create','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:52.000000Z\",\"servidor_destino\":\"tecnologia\"}','pendiente',0,NULL,'2026-08-04 09:02:52','2026-08-04 09:02:52'),
(25,'CargaDocente',5,'update','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":0,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:54.000000Z\",\"servidor_destino\":\"musica\"}','pendiente',0,NULL,'2026-08-04 09:02:54','2026-08-04 09:02:54'),
(26,'CargaDocente',5,'update','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":0,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:54.000000Z\",\"servidor_destino\":\"polimotor\"}','pendiente',0,NULL,'2026-08-04 09:02:54','2026-08-04 09:02:54'),
(27,'CargaDocente',5,'update','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":0,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:54.000000Z\",\"servidor_destino\":\"logico\"}','pendiente',0,NULL,'2026-08-04 09:02:54','2026-08-04 09:02:54'),
(28,'CargaDocente',5,'update','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":0,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:54.000000Z\",\"servidor_destino\":\"multisensorial\"}','pendiente',0,NULL,'2026-08-04 09:02:54','2026-08-04 09:02:54'),
(29,'CargaDocente',5,'update','musica','{\"id\":5,\"docente_id\":2,\"ambiente_id\":8,\"grado_id\":2,\"grupo_id\":4,\"anio_lectivo\":2026,\"activo\":0,\"created_at\":\"2026-08-04T14:02:52.000000Z\",\"updated_at\":\"2026-08-04T14:02:54.000000Z\",\"servidor_destino\":\"tecnologia\"}','pendiente',0,NULL,'2026-08-04 09:02:54','2026-08-04 09:02:54'),
(30,'CargaDocente',6,'create','musica','{\"id\":6,\"docente_id\":2,\"ambiente_id\":9,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:03:15.000000Z\",\"updated_at\":\"2026-08-04T14:03:15.000000Z\",\"servidor_destino\":\"musica\"}','pendiente',0,NULL,'2026-08-04 09:03:15','2026-08-04 09:03:15'),
(31,'CargaDocente',6,'create','musica','{\"id\":6,\"docente_id\":2,\"ambiente_id\":9,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:03:15.000000Z\",\"updated_at\":\"2026-08-04T14:03:15.000000Z\",\"servidor_destino\":\"polimotor\"}','pendiente',0,NULL,'2026-08-04 09:03:15','2026-08-04 09:03:15'),
(32,'CargaDocente',6,'create','musica','{\"id\":6,\"docente_id\":2,\"ambiente_id\":9,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:03:15.000000Z\",\"updated_at\":\"2026-08-04T14:03:15.000000Z\",\"servidor_destino\":\"logico\"}','pendiente',0,NULL,'2026-08-04 09:03:15','2026-08-04 09:03:15'),
(33,'CargaDocente',6,'create','musica','{\"id\":6,\"docente_id\":2,\"ambiente_id\":9,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:03:15.000000Z\",\"updated_at\":\"2026-08-04T14:03:15.000000Z\",\"servidor_destino\":\"multisensorial\"}','pendiente',0,NULL,'2026-08-04 09:03:15','2026-08-04 09:03:15'),
(34,'CargaDocente',6,'create','musica','{\"id\":6,\"docente_id\":2,\"ambiente_id\":9,\"grado_id\":1,\"grupo_id\":1,\"anio_lectivo\":2026,\"activo\":1,\"created_at\":\"2026-08-04T14:03:15.000000Z\",\"updated_at\":\"2026-08-04T14:03:15.000000Z\",\"servidor_destino\":\"tecnologia\"}','pendiente',0,NULL,'2026-08-04 09:03:15','2026-08-04 09:03:15');

DROP TABLE IF EXISTS `perfil_aprendizaje`;

CREATE TABLE `perfil_aprendizaje` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion_corta` text COLLATE utf8mb4_unicode_ci,
  `estado` tinyint(1) DEFAULT '1',
  `color_hex` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#000000',
  `es_sistema` tinyint(1) DEFAULT '1',
  `fecha_ultima_edicion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `vista_info_asociada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eliminado` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `perfil_aprendizaje` */

insert  into `perfil_aprendizaje`(`id`,`codigo`,`nombre`,`descripcion_corta`,`estado`,`color_hex`,`es_sistema`,`fecha_ultima_edicion`,`vista_info_asociada`,`eliminado`) values 
(1,'COND-001','Estandar','Descripción corta del perfil de aprendizaje',1,'#000000',1,'2026-08-04 14:41:48',NULL,0),
(2,'COND-002','TDAH','Descripción corta del perfil de aprendizaje',1,'#000000',1,'2026-08-04 14:41:50',NULL,0),
(3,'COND-003','TEA','Descripción corta del perfil de aprendizaje',1,'#000000',1,'2026-08-04 14:41:49',NULL,0),
(4,'COND-004','Síndrome de Down','Descripción corta del perfil de aprendizaje',1,'#000000',1,'2026-08-04 14:41:50',NULL,0),
(5,'COND-005','Discapacidad Visual','Descripción corta del perfil de aprendizaje',1,'#000000',1,'2026-08-04 14:41:51',NULL,0),
(6,'COND-006','Discapacidad Auditiva','Descripción corta del perfil de aprendizaje',1,'#000000',1,'2026-08-04 14:41:53',NULL,0);

/*Table structure for table `perfil_aprendizaje_orden` */

DROP TABLE IF EXISTS `perfil_aprendizaje_orden`;

CREATE TABLE `perfil_aprendizaje_orden` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institucion_id` bigint unsigned NOT NULL,
  `perfil_aprendizaje_id` bigint unsigned NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_institucion_perfil_aprendizaje` (`institucion_id`,`perfil_aprendizaje_id`),
  KEY `idx_institucion_orden` (`institucion_id`,`orden`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `perfil_aprendizaje_orden` */

insert  into `perfil_aprendizaje_orden`(`id`,`institucion_id`,`perfil_aprendizaje_id`,`orden`,`activa`,`created_at`,`updated_at`) values
(1,1,6,2,1,'2026-08-04 08:52:01','2026-08-04 09:28:15'),
(2,1,5,3,1,'2026-08-04 08:52:01','2026-08-04 09:28:15'),
(3,1,1,1,1,'2026-08-04 08:52:01','2026-08-04 09:28:15'),
(4,1,4,4,1,'2026-08-04 08:52:01','2026-08-04 09:28:15'),
(5,1,2,5,1,'2026-08-04 08:52:01','2026-08-04 09:28:15'),
(6,1,3,0,1,'2026-08-04 08:52:01','2026-08-04 09:28:15');

/*Table structure for table `perfil_aprendizaje_personalizado` */

DROP TABLE IF EXISTS `perfil_aprendizaje_personalizado`;

CREATE TABLE `perfil_aprendizaje_personalizado` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institucion_id` bigint unsigned DEFAULT NULL,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `etiqueta` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion_interna` text COLLATE utf8mb4_unicode_ci,
  `perfil_aprendizaje_id` bigint unsigned DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT '0',
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `usuario_crea` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `eliminado` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `perfil_aprendizaje_personalizado` */

insert  into `perfil_aprendizaje_personalizado`(`id`,`institucion_id`,`codigo`,`etiqueta`,`descripcion_interna`,`perfil_aprendizaje_id`,`es_sistema`,`estado`,`usuario_crea`,`created_at`,`updated_at`,`eliminado`) values 
(1,NULL,'CTR-002','Sospecha de TDAH','Descripción corta del perfil de aprendizaje',2,1,1,1,'2026-08-04 08:38:26','2026-08-04 14:39:30',0),
(2,NULL,'CTR-003','Sospecha de TEA','Descripción corta del perfil de aprendizaje',3,1,1,1,'2026-08-04 08:38:26','2026-08-04 14:39:30',0),
(3,NULL,'CTR-004','Sospecha de Síndrome de Down','Descripción corta del perfil de aprendizaje',4,1,1,1,'2026-08-04 08:38:26','2026-08-04 14:39:34',0),
(4,NULL,'CTR-005','Sospecha de Discapacidad Visual','Descripción corta del perfil de aprendizaje',5,1,1,1,'2026-08-04 08:38:26','2026-08-04 14:39:32',0),
(5,NULL,'CTR-006','Sospecha de Discapacidad Auditiva','Descripción corta del perfil de aprendizaje',6,1,1,1,'2026-08-04 08:38:26','2026-08-04 14:39:35',0);

/*Table structure for table `perfil_aprendizaje_personalizado_orden` */

DROP TABLE IF EXISTS `perfil_aprendizaje_personalizado_orden`;

CREATE TABLE `perfil_aprendizaje_personalizado_orden` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institucion_id` bigint unsigned NOT NULL,
  `perfil_aprendizaje_personalizado_id` bigint unsigned NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_institucion_perfil_aprendizaje_personalizado` (`institucion_id`,`perfil_aprendizaje_personalizado_id`),
  KEY `idx_institucion_orden` (`institucion_id`,`orden`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `perfil_aprendizaje_personalizado_orden` */

insert  into `perfil_aprendizaje_personalizado_orden`(`id`,`institucion_id`,`perfil_aprendizaje_personalizado_id`,`orden`,`activa`,`created_at`,`updated_at`) values
(1,1,1,0,1,'2026-08-04 08:52:01','2026-08-04 09:29:45'),
(2,1,2,1,1,'2026-08-04 08:52:01','2026-08-04 09:29:45'),
(4,1,3,3,1,'2026-08-04 08:52:01','2026-08-04 09:29:45'),
(5,1,4,4,1,'2026-08-04 08:52:01','2026-08-04 09:29:45'),
(6,1,5,5,1,'2026-08-04 08:52:01','2026-08-04 09:29:45');
/*Table structure for table `configuracion_pins` */

DROP TABLE IF EXISTS `configuracion_pins`;

CREATE TABLE `configuracion_pins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `figura_1` varchar(20) NOT NULL,
  `color_figura_1` varchar(20) DEFAULT NULL,
  `figura_2` varchar(20) NOT NULL,
  `color_figura_2` varchar(20) DEFAULT NULL,
  `figura_3` varchar(20) NOT NULL,
  `color_figura_3` varchar(20) DEFAULT NULL,
  `intentos_fallidos` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `configuracion_pins_estudiante_id_foreign` (`estudiante_id`),
  CONSTRAINT `configuracion_pins_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `configuracion_pins` */

insert  into `configuracion_pins`(`id`,`estudiante_id`,`figura_1`,`color_figura_1`,`figura_2`,`color_figura_2`,`figura_3`,`color_figura_3`,`intentos_fallidos`,`created_at`,`updated_at`) values
(7,31,'fas fa-square','#437124','fas fa-square','#437124','fas fa-square','#437124',0,'2026-06-23 15:23:30','2026-06-23 16:03:55'),
(8,32,'fas fa-heart','#ff0606','fas fa-heart','#ff0606','fas fa-heart','#ff0606',0,'2026-06-23 15:31:26','2026-06-23 16:03:33'),
(9,33,'fas fa-star','#ff9019','fas fa-heart','#ff0606','fas fa-fish','#0f54ff',0,'2026-06-23 15:34:40','2026-06-23 15:34:40'),
(10,34,'fas fa-fish','#0f54ff','fas fa-heart','#ff0606','fas fa-circle','#f933e9',0,'2026-06-23 15:35:48','2026-06-23 15:35:48'),
(11,13,'fas fa-fish','#0f54ff','fas fa-fish','#0f54ff','fas fa-fish','#0f54ff',0,'2026-06-23 16:14:31','2026-06-23 17:12:10'),
(12,11,'fas fa-square','#437124','fas fa-square','#437124','fas fa-square','#437124',0,'2026-06-23 16:15:42','2026-06-23 16:15:42'),
(13,5,'fas fa-square','#437124','fas fa-square','#437124','fas fa-square','#437124',0,'2026-06-23 16:16:06','2026-06-23 16:16:06'),
(14,12,'fas fa-heart','#ff0606','fas fa-fish','#0f54ff','fas fa-square','#437124',0,'2026-06-23 16:39:05','2026-06-23 16:39:05');

/*Table structure for table `configuraciones` */

DROP TABLE IF EXISTS `configuraciones`;

CREATE TABLE `configuraciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(255) NOT NULL,
  `valor` text,
  `descripcion` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `configuraciones_clave_unique` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `configuraciones` */

insert  into `configuraciones`(`id`,`clave`,`valor`,`descripcion`,`created_at`,`updated_at`) values
(1,'tiempo_sesion_minutos','60',NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(2,'intentos_max_pin','5',NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(3,'idioma','es',NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(4,'zona_horaria','America/Bogota',NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02');

/*Table structure for table `departamentos` */

DROP TABLE IF EXISTS `departamentos`;

CREATE TABLE `departamentos` (
  `codigo` varchar(5) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `departamentos` */

insert  into `departamentos`(`codigo`,`descripcion`) values
('05','Antioquia'),
('08','Atlantico'),
('11','Bogota'),
('13','Bolivar'),
('15','Boyaca'),
('17','Caldas'),
('18','Caqueta'),
('19','Cauca'),
('20','Cesar'),
('23','Cordoba'),
('25','Cundinamarca'),
('27','Choco'),
('41','Huila'),
('44','La Guajira'),
('47','Magdalena'),
('50','Meta'),
('52','Narino'),
('54','Norte de Santan'),
('63','Quindio'),
('66','Risaralda'),
('68','Santander'),
('70','Sucre'),
('73','Tolima'),
('76','Valle del Cauca'),
('81','Arauca'),
('85','Casanare'),
('86','Putumayo'),
('88','San Andres'),
('91','Amazonas'),
('94','Guainia'),
('95','Guaviare'),
('97','Vaupes'),
('99','Vichada');

/*Table structure for table `docentes` */

DROP TABLE IF EXISTS `docentes`;

CREATE TABLE `docentes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `firma_url` varchar(255) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `descripcion` text,
  `estado` enum('activo','inactivo','eliminado') DEFAULT 'activo',
  `bloqueado_en` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `docentes_user_id_foreign` (`user_id`),
  CONSTRAINT `docentes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `docentes` */

insert  into `docentes`(`id`,`user_id`,`telefono`,`direccion`,`especialidad`,`fecha_ingreso`,`firma_url`,`foto_url`,`descripcion`,`estado`,`bloqueado_en`,`created_at`,`updated_at`) values
(1,2,'12345678925','direc','Educación Musical','2026-06-23',NULL,NULL,NULL,'activo',NULL,'2026-06-16 00:02:02','2026-06-24 15:50:15'),
(2,4,'12345678925','direc','maestro','2026-06-23',NULL,NULL,NULL,'activo',NULL,'2026-06-16 17:32:50','2026-06-24 15:57:11'),
(3,5,'12345678925','direc','maestro','2026-06-23',NULL,NULL,NULL,'activo',NULL,'2026-06-16 17:32:50','2026-06-23 14:23:57');

/*Table structure for table `estudiante_ambiente` */

DROP TABLE IF EXISTS `estudiante_ambiente`;

CREATE TABLE `estudiante_ambiente` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `ambiente_id` bigint unsigned NOT NULL,
  `anio_lectivo` smallint unsigned NOT NULL,
  `estado` enum('activo','restringido','adaptado') NOT NULL DEFAULT 'activo',
  `observacion` text,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ea_unique` (`estudiante_id`,`ambiente_id`,`anio_lectivo`),
  KEY `estudiante_ambiente_ambiente_id_foreign` (`ambiente_id`),
  CONSTRAINT `estudiante_ambiente_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `estudiante_ambiente_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `estudiante_ambiente` */

insert  into `estudiante_ambiente`(`id`,`estudiante_id`,`ambiente_id`,`anio_lectivo`,`estado`,`observacion`,`activo`,`created_at`,`updated_at`) values
(6,13,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(7,11,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(8,5,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(9,12,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(10,9,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(11,26,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(12,28,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(13,35,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(14,7,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(15,8,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(16,4,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(17,15,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(18,10,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(19,16,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(20,19,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(21,17,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(22,6,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(23,2,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(24,21,8,2026,'activo',NULL,1,'2026-08-04 09:02:15','2026-08-04 09:02:15'),
(25,37,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(26,20,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(27,18,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(28,27,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(29,36,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(30,1,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(31,14,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(32,31,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(33,32,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(34,33,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(35,34,8,2026,'activo',NULL,1,'2026-08-04 09:02:16','2026-08-04 09:02:16'),
(36,13,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(37,11,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(38,5,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(39,12,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(40,9,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(41,26,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(42,28,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(43,35,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(44,7,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(45,8,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(46,4,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(47,15,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(48,10,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(49,16,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(50,19,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(51,17,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(52,6,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(53,2,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(54,21,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(55,37,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(56,20,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(57,18,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(58,27,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(59,36,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(60,1,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(61,14,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(62,31,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(63,32,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(64,33,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02'),
(65,34,9,2026,'activo',NULL,1,'2026-08-04 09:03:02','2026-08-04 09:03:02');

/*Table structure for table `estudiante_perfil_aprendizaje_personalizado` */

DROP TABLE IF EXISTS `estudiante_perfil_aprendizaje_personalizado`;

CREATE TABLE `estudiante_perfil_aprendizaje_personalizado` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `perfil_aprendizaje_personalizado_id` bigint unsigned NOT NULL,
  `docente_id` bigint unsigned NOT NULL,
  `observacion` text NOT NULL,
  `fecha_activacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_cierre` datetime DEFAULT NULL,
  `motivo_cierre` enum('diagnostico_formal','perfil_aprendizaje_no_confirmado','otro') DEFAULT NULL,
  `observacion_cierre` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `docente_id` (`docente_id`),
  KEY `estudiante_id` (`estudiante_id`),
  KEY `perfil_aprendizaje_personalizado_id` (`perfil_aprendizaje_personalizado_id`),
  KEY `activa` (`activa`),
  CONSTRAINT `estudiante_perfil_aprendizaje_personalizado_ibfk_1` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`),
  CONSTRAINT `estudiante_perfil_aprendizaje_personalizado_ibfk_2` FOREIGN KEY (`perfil_aprendizaje_personalizado_id`) REFERENCES `perfil_aprendizaje_personalizado` (`id`),
  CONSTRAINT `estudiante_perfil_aprendizaje_personalizado_ibfk_3` FOREIGN KEY (`docente_id`) REFERENCES `docentes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `estudiante_perfil_aprendizaje_personalizado` */

insert  into `estudiante_perfil_aprendizaje_personalizado`(`id`,`estudiante_id`,`perfil_aprendizaje_personalizado_id`,`docente_id`,`observacion`,`fecha_activacion`,`activa`,`fecha_cierre`,`motivo_cierre`,`observacion_cierre`,`created_at`,`updated_at`) values
(2,11,2,2,'nueva creada por el admin','2026-08-04 11:03:10',0,'2026-08-04 11:03:50','perfil_aprendizaje_no_confirmado','nueva creada por el admin','2026-08-04 11:03:10','2026-08-04 11:03:50'),
(3,5,1,2,'nueva creada por el admin','2026-08-04 11:03:28',0,'2026-08-04 11:03:58','perfil_aprendizaje_no_confirmado','nueva creada por el admin','2026-08-04 11:03:28','2026-08-04 11:03:58');

/*Table structure for table `estudiantes` */

DROP TABLE IF EXISTS `estudiantes`;

CREATE TABLE `estudiantes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) DEFAULT NULL,
  `avatar` text,
  `tipo_identificacion` varchar(10) DEFAULT NULL,
  `identificacion` int NOT NULL,
  `iniciales` varchar(3) NOT NULL,
  `grado_id` text,
  `color_avatar` varchar(9) NOT NULL DEFAULT '#0F6E56',
  `perfil_aprendizaje_id` int DEFAULT '1',
  `perfil_aprendizaje_personalizado_id` int DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_nacimiento` text,
  `acudiente` text,
  `telefono_acudiente` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `requiere_apoyo` varchar(15) DEFAULT 'no',
  `sexo` text,
  `estado_piar` int DEFAULT '0',
  `otro_tipo_identificacion` varchar(255) DEFAULT NULL,
  `lugar_nacimiento` text,
  `departamento_id` int DEFAULT NULL,
  `municipio_id` int DEFAULT NULL,
  `barrio_vereda` text,
  `direccion` text,
  `telefono` text,
  `email` text,
  `institucion_id` int DEFAULT NULL,
  PRIMARY KEY (`id`,`identificacion`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `estudiantes` */

insert  into `estudiantes`(`id`,`nombre`,`apellido`,`avatar`,`tipo_identificacion`,`identificacion`,`iniciales`,`grado_id`,`color_avatar`,`perfil_aprendizaje_id`,`perfil_aprendizaje_personalizado_id`,`activo`,`fecha_nacimiento`,`acudiente`,`telefono_acudiente`,`created_at`,`updated_at`,`requiere_apoyo`,`sexo`,`estado_piar`,`otro_tipo_identificacion`,`lugar_nacimiento`,`departamento_id`,`municipio_id`,`barrio_vereda`,`direccion`,`telefono`,`email`,`institucion_id`) values
(1,'Valentina',NULL,NULL,NULL,1111,'VA',NULL,'#0F6E56',1,NULL,1,'2021-01-17',NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(2,'Mateo',NULL,NULL,NULL,2222,'MA',NULL,'#534AB7',1,NULL,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(3,'Sofía',NULL,NULL,NULL,3333,'SO',NULL,'#854F0B',1,NULL,0,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','si',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(4,'Juan',NULL,NULL,NULL,4444,'JU',NULL,'#185FA5',1,NULL,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(5,'Camila',NULL,NULL,NULL,5555,'CA','2','#993c1d',1,NULL,1,'2026-06-09','fggdfg','4534','2026-06-16 00:02:01','2026-08-04 11:03:58','no','masculino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(6,'Luna',NULL,NULL,NULL,6666,'LU',NULL,'#F59E0B',1,NULL,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(7,'José',NULL,NULL,NULL,134123123,'Jo','1','#0F6E56',1,NULL,1,NULL,'Juana','245234234','2026-06-18 16:04:20','2026-06-18 16:04:20','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(8,'José',NULL,NULL,NULL,134123123,'Jo','1','#0F6E56',1,NULL,1,NULL,'Juana','245234234','2026-06-18 16:04:36','2026-06-18 16:04:36','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(9,'Fabian Mendez',NULL,NULL,NULL,123123123,'FM','3','#0F6E56',1,1,1,NULL,'Juana 2','32434234','2026-06-18 16:08:25','2026-08-03 11:04:28','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(10,'Juan Lopez 3',NULL,NULL,NULL,3423423,'JL','2','#0F6E56',1,NULL,1,NULL,'Juana 5','3423423','2026-06-18 16:12:47','2026-06-18 16:12:47','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(11,'Andres','quintero',NULL,'CC',5345345,'AQ',NULL,'#dc2626',1,NULL,1,'2018-01-22','yyyyyyy','5345345','2026-06-18 16:19:02','2026-08-04 11:03:50','si','masculino',0,NULL,'VALLEDUPAR',20,305,'Los cortijos','Mz H Casa 7 Urbanizacion Don Jose','2065930','grovveip@gmail.com',1),
(12,'Fabian','Mendez Quintero',NULL,'TI',342423,'FM',NULL,'#ea580c',1,NULL,1,'2019-05-16','hfghfghfgh','634634','2026-06-18 16:56:48','2026-08-03 15:45:48','si','femenino',0,NULL,'VALLEDUPAR',20,9,'Los cortijos','Mz H Casa 7 Urbanizacion Don Jose','2065930','grovveifdgdfgp@gmail.com',1),
(13,'Andrea','Rodriguez','estudiantes/lNIZ6VFiTteCno5FKRNh5FCY37imQS7xXLNXdP9U.jpg','TI',5345345,'AR','1','#ffb81f',2,NULL,1,'2023-12-10','Julian Rodriguez','45345','2026-06-18 17:15:22','2026-08-03 14:53:19','si','femenino',0,NULL,'valledupar',20,9,'Los cortijos','manzana h casa 23','3042065930','hhhh@gmail.com',1),
(14,'Xiamir luquez',NULL,'estudiantes/23NS51sSHtdWtH2tQynzAD0EfRAd6m2WaZensqbP.webp',NULL,4353453,'XL','1','#0F6E56',1,NULL,1,'2021-06-12','yyyy','345345','2026-06-18 17:20:14','2026-06-18 17:20:14','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(15,'Juan David  Perez',NULL,NULL,NULL,6456456,'JD',NULL,'#ff8a05',1,NULL,1,'2023-06-07','tttt','345345','2026-06-19 08:00:29','2026-06-19 08:00:29','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(16,'Juana Lopera',NULL,NULL,NULL,654645,'JL',NULL,'#79fbf9',1,NULL,1,'2014-07-12','uuuu','6666','2026-06-19 08:01:32','2026-06-19 08:01:32','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(17,'Luisa Castro',NULL,NULL,NULL,525252,'LC',NULL,'#ff0000',1,NULL,1,'2020-01-12','yyyy','23423423','2026-06-19 14:17:51','2026-06-19 14:17:51','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(18,'pedro velazques',NULL,NULL,NULL,34534534,'PV',NULL,'#3d2258',1,NULL,1,'2026-06-23','ertert','334634634','2026-06-20 10:12:28','2026-06-20 10:12:28','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(19,'Julio Jaramillo',NULL,NULL,NULL,12323123,'JJ',NULL,'#ba79fb',1,NULL,1,'2017-05-23','ghdfh','345345','2026-06-20 10:16:15','2026-06-20 10:16:15','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(20,'Olimpo cardenas',NULL,NULL,NULL,324234,'OC',NULL,'#ba79fb',1,NULL,1,'2022-12-12','234234','45345','2026-06-20 10:19:58','2026-06-20 10:19:58','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(21,'Nicola Di Bari',NULL,NULL,NULL,5634545,'ND',NULL,'#ba79fb',1,NULL,1,'2000-01-22','fgfdgdfgdf','34534','2026-06-20 10:39:00','2026-06-20 10:39:00','no',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(26,'fghfghfg',NULL,NULL,NULL,45345,'FG','2','#ba79fb',1,NULL,1,'2024-06-17','5etrwetr','34534','2026-06-22 15:20:25','2026-06-22 15:20:25','en_proceso','femenino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(27,'sdsdfg dsfsdf',NULL,NULL,NULL,34234,'SD','1','#ba79fb',1,NULL,1,'2026-06-03','tgerter','435345','2026-06-23 14:52:29','2026-06-23 14:52:29','null','femenino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(28,'hdfgh',NULL,NULL,NULL,543252345,'HD','1','#ba79fb',1,NULL,1,'2026-06-07','fdghdfgh','36346','2026-06-23 15:01:31','2026-06-23 15:01:31','si','femenino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(31,'xxx yyy',NULL,NULL,NULL,111142342,'XY','3','#ba79fb',1,1,1,'2026-06-08','dsfgsdfg','34534','2026-06-23 15:23:30','2026-08-03 14:33:38','si','masculino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(32,'yyy bbb',NULL,NULL,NULL,534534,'YB','2','#ba79fb',1,NULL,1,'2026-06-08','fdgfdg','323423','2026-06-23 15:31:26','2026-06-23 16:03:33','si','femenino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(33,'yyyy',NULL,NULL,NULL,43534777,'FD','1','#ba79fb',1,NULL,1,'2026-06-03','dfgsdfgsdf','345','2026-06-23 15:34:40','2026-06-23 15:34:40','si','masculino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(34,'yyyy bbbb',NULL,NULL,NULL,1007615656,'WE','1','#ba79fb',1,NULL,1,'2026-06-08','retwert','43534','2026-06-23 15:35:48','2026-06-23 15:35:48','si','femenino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(35,'Hugo','Chavez',NULL,NULL,777888999,'HC','1','#302839',1,NULL,1,'2025-06-01','Juana kkk','3423423','2026-06-26 11:41:33','2026-06-26 11:42:28','no','masculino',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
(36,'Valentina','Madrid',NULL,'Otro',88880000,'VM','1','#ba79fb',1,NULL,1,'2016-05-26','Yo mero','3232323','2026-06-26 16:44:51','2026-06-26 16:44:51','no','femenino',0,'Pasaporte','Aguachica - Cesar',20,9,'La Nevada','Manzana B casa 43',NULL,NULL,1),
(37,'Nuevo','Magola',NULL,'TI',777666544,'NM','1','#ba79fb',1,NULL,1,'2006-01-22','jjjhhhgfff','456456456','2026-08-01 10:20:50','2026-08-01 10:20:50','en_proceso','masculino',0,NULL,'valledupar',8,398,'Los cortijos','Carrera 51 #23-51','3042065930','grovveip@gmail.com',1);

/*Table structure for table `failed_jobs` */

DROP TABLE IF EXISTS `failed_jobs`;

CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `failed_jobs` */

/*Table structure for table `grados` */

DROP TABLE IF EXISTS `grados`;

CREATE TABLE `grados` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `edad_anos` tinyint NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `orden` tinyint NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `grados` */

insert  into `grados`(`id`,`nombre`,`edad_anos`,`descripcion`,`orden`,`activo`,`created_at`,`updated_at`) values
(1,'Prejardin',3,'Para ninos de 3 anos. Socializacion y desarrollo motriz.',1,1,'2026-06-16 19:34:40','2026-06-16 19:34:40'),
(2,'Jardin',4,'Para ninos de 4 anos. Colores, numeros y letras.',2,1,'2026-06-16 19:34:40','2026-06-16 19:34:40'),
(3,'Transicion',5,'Para ninos de 5 anos. Lectoescritura y habilidades logicas.',3,1,'2026-06-16 19:34:40','2026-06-16 19:34:40');

/*Table structure for table `grupos` */

DROP TABLE IF EXISTS `grupos`;

CREATE TABLE `grupos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `grado_id` bigint unsigned NOT NULL,
  `nombre` varchar(10) NOT NULL,
  `anio_lectivo` year NOT NULL,
  `cupo_maximo` tinyint NOT NULL DEFAULT '30',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grp_unique` (`grado_id`,`nombre`,`anio_lectivo`),
  CONSTRAINT `grupos_grado_id_foreign` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `grupos` */

insert  into `grupos`(`id`,`grado_id`,`nombre`,`anio_lectivo`,`cupo_maximo`,`activo`,`created_at`,`updated_at`) values
(1,1,'A',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(3,2,'A',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(4,2,'B',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(5,3,'A',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(6,3,'B',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(23,2,'C',2026,25,1,'2026-06-18 12:23:28','2026-06-18 12:23:28'),
(26,1,'A',2027,25,1,'2026-06-19 09:57:51','2026-06-19 09:57:51'),
(28,1,'B',2026,25,1,'2026-08-04 09:00:30','2026-08-04 09:00:30');

/*Table structure for table `instituciones` */

DROP TABLE IF EXISTS `instituciones`;

CREATE TABLE `instituciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `municipio` varchar(100) NOT NULL,
  `departamento` varchar(100) NOT NULL,
  `codigo_dane` varchar(20) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `correo_contacto` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `instituciones` */

insert  into `instituciones`(`id`,`nombre`,`municipio`,`departamento`,`codigo_dane`,`logo`,`correo_contacto`,`activo`,`created_at`,`updated_at`) values
(1,'Institución Educativa Ejemplo','Medellín','Antioquia','050010000001','logos/institucion.png','contacto@institucion.edu.co',1,NULL,NULL);

/*Table structure for table `matriculas` */

DROP TABLE IF EXISTS `matriculas`;

CREATE TABLE `matriculas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `grado_id` bigint unsigned NOT NULL,
  `grupo_id` bigint unsigned NOT NULL,
  `anio_lectivo` year NOT NULL,
  `estado` enum('activo','promovido','graduado','retirado') NOT NULL DEFAULT 'activo',
  `fecha_ingreso` date NOT NULL,
  `fecha_egreso` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mat_unique` (`estudiante_id`,`anio_lectivo`),
  KEY `matriculas_grupo_id_anio_lectivo_estado_index` (`grupo_id`,`anio_lectivo`,`estado`),
  KEY `matriculas_grado_id_anio_lectivo_index` (`grado_id`,`anio_lectivo`),
  CONSTRAINT `matriculas_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`),
  CONSTRAINT `matriculas_grado_id_foreign` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`),
  CONSTRAINT `matriculas_grupo_id_foreign` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `matriculas` */

insert  into `matriculas`(`id`,`estudiante_id`,`grado_id`,`grupo_id`,`anio_lectivo`,`estado`,`fecha_ingreso`,`fecha_egreso`,`created_at`,`updated_at`) values
(23,13,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(24,11,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(25,5,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(26,12,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(27,9,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(28,26,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(29,28,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(30,35,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(31,7,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(32,8,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(33,4,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(34,15,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(35,10,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(36,16,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(37,19,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(38,17,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(39,6,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(40,2,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(41,21,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(42,37,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(43,20,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(44,18,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(45,27,1,1,2026,'activo','2026-08-04',NULL,'2026-08-04 09:00:54','2026-08-04 09:00:54'),
(46,34,1,28,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:13','2026-08-04 09:01:13'),
(47,33,1,28,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:13','2026-08-04 09:01:13'),
(48,32,1,28,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:13','2026-08-04 09:01:13'),
(49,31,2,3,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:32','2026-08-04 09:01:32'),
(50,14,2,3,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:32','2026-08-04 09:01:32'),
(51,36,2,3,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:32','2026-08-04 09:01:32'),
(52,1,2,3,2026,'activo','2026-08-04',NULL,'2026-08-04 09:01:32','2026-08-04 09:01:32');

/*Table structure for table `migrations` */

DROP TABLE IF EXISTS `migrations`;

CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `migrations` */

insert  into `migrations`(`id`,`migration`,`batch`) values
(1,'2014_10_12_000000_create_users_table',1),
(2,'2014_10_12_100000_create_password_reset_tokens_table',1),
(3,'2019_08_19_000000_create_failed_jobs_table',1),
(4,'2019_12_14_000001_create_personal_access_tokens_table',1),
(5,'2026_06_12_235259_create_ambientes_table',1),
(6,'2026_06_12_235300_create_docentes_table',1),
(7,'2026_06_12_235300_create_estudiantes_table',1),
(8,'2026_06_12_235301_create_configuracion_pins_table',1),
(9,'2026_06_12_235302_create_modulos_table',1),
(10,'2026_06_12_235303_create_temas_table',1),
(11,'2026_06_12_235304_create_actividades_table',1),
(12,'2026_06_12_235305_create_portafolios_table',1),
(13,'2026_06_13_004314_create_ambiente_estudiante_table',1),
(14,'2026_06_13_223657_create_configuraciones_table',1),
(15,'2026_06_13_223657_create_sync_queue_table',1),
(16,'2026_06_13_223658_create_asistencias_table',1),
(17,'2026_06_13_223658_create_login_logs_table',1),
(18,'2026_06_13_223658_create_notas_docente_table',1),
(19,'2026_06_13_223658_create_observaciones_table',1),
(20,'2026_06_13_223659_create_ajustes_temporales_table',1),
(21,'2026_06_16_002642_renombrar_tablas_inglesas',2),
(22,'2026_06_17_000001_create_grados_table',3),
(23,'2026_06_17_000002_create_grupos_table',3),
(24,'2026_06_17_000003_create_carga_docente_table',3),
(25,'2026_06_17_000004_create_matriculas_table',3),
(26,'2026_06_17_000005_create_piar_table',3),
(27,'2026_06_17_000006_eliminar_ambiente_estudiante',3),
(28,'2026_06_17_000007_eliminar_ambiente_docente_ids',3),
(29,'2026_06_17_000008_simplificar_rol_users',4),
(31,'2026_06_17_000009_drop_docente_grupo',5),
(32,'2026_06_17_155731_create_ambiente_grado_table',5),
(34,'2026_06_17_155747_add_ambiente_id_to_grupos_table',5),
(36,'2026_06_18_000001_add_cupo_defecto_to_ambientes_table',6),
(37,'2026_06_19_000001_restructure_matriculas_y_grupos',7),
(38,'2026_06_23_000001_actualizar_campos_estudiantes',8),
(39,'2026_06_23_000002_actualizar_campos_docentes',9),
(40,'2026_06_23_000003_actualizar_campos_configuracion_pins',10);

/*Table structure for table `modulos` */

DROP TABLE IF EXISTS `modulos`;

CREATE TABLE `modulos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint unsigned NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text,
  `icono` varchar(255) DEFAULT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `visible_estudiantes` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modulos_ambiente_id_foreign` (`ambiente_id`),
  CONSTRAINT `modulos_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `modulos` */

/*Table structure for table `municipios` */

DROP TABLE IF EXISTS `municipios`;

CREATE TABLE `municipios` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(50) NOT NULL,
  `coddep` varchar(2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `municipios` */

insert  into `municipios`(`id`,`descripcion`,`coddep`) values
(1,'MEDELLIN','05'),
(2,'BARRANQUILLA','08'),
(3,'BOGOTA D.C.','11'),
(4,'CARTAGENA','13'),
(5,'TUNJA','15'),
(6,'MANIZALES','17'),
(7,'FLORENCIA','18'),
(8,'POPAYAN','19'),
(9,'VALLEDUPAR','20'),
(10,'MONTERIA','23'),
(11,'AGUA DE DIOS','25'),
(12,'QUIBDO','27'),
(13,'NEIVA','41'),
(14,'RIOHACHA','44'),
(15,'SANTA MARTA','47'),
(16,'VILLAVICENCIO','50'),
(17,'PASTO','52'),
(18,'CUCUTA','54'),
(19,'ARMENIA','63'),
(20,'PEREIRA','66'),
(21,'BUCARAMANGA','68'),
(22,'SINCELEJO','70'),
(23,'IBAGUE','73'),
(24,'CALI','76'),
(25,'ARAUCA','81'),
(26,'YOPAL','85'),
(27,'MOCOA','86'),
(28,'SAN ANDRES','88'),
(29,'LETICIA','91'),
(30,'INIRIDA','94'),
(31,'SAN JOSE DEL GU','95'),
(32,'MITU','97'),
(33,'PUERTO CARRE','99'),
(34,'ABEJORRAL','05'),
(35,'ABREGO','54'),
(36,'ABRIAQUI','05'),
(37,'ACHI','13'),
(38,'ACANDI','27'),
(39,'ACEVEDO','41'),
(40,'ACACIAS','50'),
(41,'AGUAZUL','85'),
(42,'AGUACHICA','20'),
(43,'AGUADAS','17'),
(44,'AGUSTIN CODAZZI','20'),
(45,'AGRADO','41'),
(46,'AGUADA','68'),
(47,'CHAMEZA','85'),
(48,'CALAMAR','95'),
(49,'AIPE','41'),
(50,'ALBAN','25'),
(51,'ALBAN','52'),
(52,'ALGECIRAS','41'),
(53,'ALBANIA','68'),
(54,'ALCALA','76'),
(55,'ALEJANDRIA','05'),
(56,'ALMEIDA','15'),
(57,'ALMAGUER','19'),
(58,'ALDANA','52'),
(59,'ALPUJARRA','73'),
(60,'ALTO BAUDO','27'),
(61,'EL RETORNO','95'),
(62,'ALTAMIRA','41'),
(63,'ALVARADO','73'),
(64,'ALBANIA','18'),
(65,'AMAGA','05'),
(66,'ALTOS DEL ROSAR','13'),
(67,'ALGARROBO','47'),
(68,'AMBALEMA','73'),
(69,'AMALFI','05'),
(70,'ASTREA','20'),
(71,'ANDES','05'),
(72,'ANAPOIMA','25'),
(73,'ALBANIA','44'),
(74,'ANGELOPOLIS','05'),
(75,'ANCUYA','52'),
(76,'ANDALUCIA','76'),
(77,'ANGOSTURA','05'),
(78,'ANORIA','05'),
(79,'ANOLAIMA','25'),
(80,'ANSERMANUEVO','76'),
(81,'SANTA FE DE ANT','05'),
(82,'ARENAL','13'),
(83,'ANSERMA','17'),
(84,'ANZOATEGUI','73'),
(85,'ANZA','05'),
(86,'APARTADO','05'),
(87,'BECERRIL','20'),
(88,'APIA','66'),
(89,'AQUITANIA','15'),
(90,'ARANZAZU','17'),
(91,'ARGELIA','19'),
(92,'ATRATO','27'),
(93,'ARBOLETES','05'),
(94,'ARCABUCO','15'),
(95,'ARBOLEDA','52'),
(96,'ARBOLEDAS','54'),
(97,'ARATOCA','68'),
(98,'ARJONA','13'),
(99,'ARBELAEZ','25'),
(100,'ARACATACA','47'),
(101,'ARGELIA','76'),
(102,'ARGELIA','05'),
(103,'ARMERO','73'),
(104,'ARIGUANI','47'),
(105,'ARMENIA','05'),
(106,'BOSCONIA','20'),
(107,'ARROYOHONDO','13'),
(108,'ARAUQUITA','81'),
(109,'ATACO','73'),
(110,'AYAPEL','23'),
(111,'BAGADO','27'),
(112,'BARRANCO DE LOB','13'),
(113,'BALBOA','19'),
(114,'BAHIA SOLANO','27'),
(115,'BALBOA','66'),
(116,'BAJO BAUDO','27'),
(117,'BARBOSA','68'),
(118,'BARANOA','08'),
(119,'BARAYA','41'),
(120,'BARRANCAS','44'),
(121,'BARBOSA','05'),
(122,'BUENAVISTA','23'),
(123,'BARBACOAS','52'),
(124,'BARICHARA','68'),
(125,'BARRANCABERMEJA','68'),
(126,'BELEN','52'),
(127,'BELMIRA','05'),
(128,'BELTRAN','25'),
(129,'BELEN DE BAJIRA','27'),
(130,'BELEN','15'),
(131,'VELLO','05'),
(132,'BELALCAZAR','17'),
(133,'BELEN DE UMBRIA','66'),
(134,'BERBEO','15'),
(135,'CANALETE','23'),
(136,'DIBULLA','44'),
(137,'BETANIA','05'),
(138,'BETEITIVA','15'),
(139,'BETULIA','68'),
(140,'BETULIA','05'),
(141,'BELEN DE LOS AN','18'),
(142,'BITUIMA','25'),
(143,'BOAVITA','15'),
(144,'DISTRACCION','44'),
(145,'BOJACA','25'),
(146,'BOJAYA','27'),
(147,'BOCHALEMA','54'),
(148,'BOLIVAR','19'),
(149,'BOLIVAR','76'),
(150,'CIUDAD BOLIVAR','05'),
(151,'BOLIVAR','68'),
(152,'BOYACA','15'),
(153,'BRICE','15'),
(154,'BRICE','05'),
(155,'BUENAVISTA','15'),
(156,'BUCARASICA','54'),
(157,'BUENAVENTURA','76'),
(158,'BUENOS AIRES','19'),
(159,'EL MOLINO','44'),
(160,'BARRANCA DE UPI','50'),
(161,'BUESACO','52'),
(162,'BUENAVISTA','70'),
(163,'BUENAVISTA','63'),
(164,'GUADALAJARA DE ','76'),
(165,'BURITICA','05'),
(166,'BUGALAGRANDE','76'),
(167,'BUSBANZA','15'),
(168,'CACERES','05'),
(169,'CABRERA','25'),
(170,'CABRERA','68'),
(171,'CAICEDONIA','76'),
(172,'CACHIPAY','25'),
(173,'CABUYARO','50'),
(174,'CAIMITO','70'),
(175,'CAJAMARCA','73'),
(176,'CAICEDO','05'),
(177,'CACOTA','54'),
(178,'HATO COROZAL','85'),
(179,'CAJICA','25'),
(180,'CALIMA','76'),
(181,'CACHIRA','54'),
(182,'CALDAS','05'),
(183,'CAJIBIO','19'),
(184,'CALARCA','63'),
(185,'CANDELARIA','76'),
(186,'CALDAS','15'),
(187,'CAMPOALEGRE','41'),
(188,'CALIFORNIA','68'),
(189,'CAMPAMENTO','05'),
(190,'CAMPOHERMOSO','15'),
(191,'EL CANTON DEL S','27'),
(192,'LA SALINA','85'),
(193,'CAMPO DE LA CRU','08'),
(194,'CALDONO','19'),
(195,'CA','05'),
(196,'MANI','85'),
(197,'CALAMAR','13'),
(198,'CANDELARIA','08'),
(199,'CARACOLI','05'),
(200,'CALOTO','19'),
(201,'CARAMANTA','05'),
(202,'CAREPA','05'),
(203,'CAPITANEJO','68'),
(204,'CARTAGO','76'),
(205,'EL CARMEN DE VI','05'),
(206,'CAPARRAPI','25'),
(207,'CARMEN DE APICA','73'),
(208,'CAROLINA','05'),
(209,'CARTAGENA DEL C','18'),
(210,'CARMEN DEL DARI','27'),
(211,'CASTILLA LA NUE','50'),
(212,'CAQUEZA','25'),
(213,'CARCASI','68'),
(214,'CASABIANCA','73'),
(215,'CAUCASIA','05'),
(216,'CARMEN DE CARUP','25'),
(217,'CANTAGALLO','13'),
(218,'CERTEGUI','27'),
(219,'CEPITA','68'),
(220,'CERRO SAN ANTON','47'),
(221,'CARURU','97'),
(222,'CERINZA','15'),
(223,'CERETE','23'),
(224,'CERRITO','68'),
(225,'MONTERREY','85'),
(226,'CHARALA','68'),
(227,'CHIMA','23'),
(228,'CHAGUANI','25'),
(229,'CHAPARRAL','73'),
(230,'CHARTA','68'),
(231,'CHIBOLO','47'),
(232,'DOSQUEBRADAS','66'),
(233,'CHIGORODO','05'),
(234,'CHINAVITA','15'),
(235,'CHINACOTA','54'),
(236,'CHINCHINA','17'),
(237,'CHITAGA','54'),
(238,'CHIMICHAGUA','20'),
(239,'CHIA','25'),
(240,'CHIQUINQUIRA','15'),
(241,'CHIMA','68'),
(242,'CHIRIGUANA','20'),
(243,'CHIPAQUE','25'),
(244,'CHIPATA','68'),
(245,'CHISCAS','15'),
(246,'CHOACHI','25'),
(247,'CHINU','23'),
(248,'CHITA','15'),
(249,'CHOCONTA','25'),
(250,'CHITARAQUE','15'),
(251,'CHIVATA','15'),
(252,'CICUCO','13'),
(253,'CIENEGA','15'),
(254,'CIENAGA DE ORO','23'),
(255,'CIENAGA','47'),
(256,'CISNEROS','05'),
(257,'CIRCASIA','63'),
(258,'CIMITARRA','68'),
(259,'COCORNA','05'),
(260,'COGUA','25'),
(261,'COELLO','73'),
(262,'MIRAFLORES','95'),
(263,'COLON','52'),
(264,'COMBITA','15'),
(265,'COLOSO','70'),
(266,'CURILLO','18'),
(267,'CONDOTO','27'),
(268,'CONCORDIA','47'),
(269,'CONCEPCION','05'),
(270,'COLOMBIA','41'),
(271,'CONVENCION','54'),
(272,'CONSACA','52'),
(273,'CONCEPCION','68'),
(274,'CONCORDIA','05'),
(275,'CONFINES','68'),
(276,'CONTADERO','52'),
(277,'CONTRATACION','68'),
(278,'COPACABANA','05'),
(279,'CORDOBA','13'),
(280,'COPER','15'),
(281,'CORINTO','19'),
(282,'CORDOBA','63'),
(283,'COTA','25'),
(284,'CORRALES','15'),
(285,'MARIPI','44'),
(286,'CORDOBA','52'),
(287,'COROZAL','70'),
(288,'COROMORO','68'),
(289,'COYAIMA','73'),
(290,'COVARACHIA','15'),
(291,'COLON','86'),
(292,'CRAVO NORTE','81'),
(293,'COVE','70'),
(294,'CLEMENCIA','13'),
(295,'CUBARA','15'),
(296,'CUBARRAL','50'),
(297,'CUCUTILLA','54'),
(298,'CUCAITA','15'),
(299,'CUASPUD','52'),
(300,'NUNCHIA','85'),
(301,'CUITIVA','15'),
(302,'CUMARAL','50'),
(303,'CUNDAY','73'),
(304,'CUMBAL','52'),
(305,'CURUMANI','20'),
(306,'CURITI','68'),
(307,'CHALAN','70'),
(308,'OROCUE','85'),
(309,'CHIQUIZA','15'),
(310,'CUMBITARA','52'),
(311,'EL ROBLE','70'),
(312,'DAGUA','76'),
(313,'DABEIBA','05'),
(314,'EL CARMEN DE CH','68'),
(315,'GALERAS','70'),
(316,'CHIVOR','15'),
(317,'DOLORES','73'),
(318,'DON MATIAS','05'),
(319,'DUITAMA','15'),
(320,'EL COPEY','20'),
(321,'DURANIA','54'),
(322,'EBEJICO','05'),
(323,'CHACHAG','52'),
(324,'EL ','76'),
(325,'EL CARMEN DE BO','13'),
(326,'EL COCUY','15'),
(327,'ELIAS','41'),
(328,'EL COLEGIO','25'),
(329,'EL CARMEN DE AT','27'),
(330,'EL BANCO','47'),
(331,'EL CALVARIO','50'),
(332,'EL CARMEN','54'),
(333,'EL GUACAMAYO','68'),
(334,'EL CAIRO','76'),
(335,'EL DONCELLO','18'),
(336,'EL GUAMO','13'),
(337,'EL ESPINO','15'),
(338,'EL CERRITO','76'),
(339,'EL BAGRE','05'),
(340,'EL PASO','20'),
(341,'EL LITORAL DEL ','27'),
(342,'EL CHARCO','52'),
(343,'EL TARRA','54'),
(344,'EL PE','68'),
(345,'EL DOVIO','76'),
(346,'PAZ DE ARIPORO','85'),
(347,'EL CASTILLO','50'),
(348,'EL PE','52'),
(349,'EL PLAYON','68'),
(350,'EL PAUJIL','18'),
(351,'EL TAMBO','19'),
(352,'EL ROSARIO','52'),
(353,'EL PE','25'),
(354,'EL PI','47'),
(355,'EL TABLON DE GO','52'),
(356,'EL ROSAL','25'),
(357,'EL TAMBO','52'),
(358,'EL ZULIA','54'),
(359,'PORE','85'),
(360,'EL ENCANTO','91'),
(361,'ENTRERRIOS','05'),
(362,'ENCINO','68'),
(363,'GUARANDA','70'),
(364,'ENVIGADO','05'),
(365,'ENCISO','68'),
(366,'EL PE','13'),
(367,'EL RETEN','47'),
(368,'ESPINAL','73'),
(369,'FACATATIVA','25'),
(370,'EL DORADO','50'),
(371,'FALAN','73'),
(372,'FLORIAN','68'),
(373,'FIRAVITOBA','15'),
(374,'FILADELFIA','17'),
(375,'FILANDIA','63'),
(376,'FLANDES','73'),
(377,'FLORIDA','76'),
(378,'FLORESTA','15'),
(379,'FLORIDABLANCA','68'),
(380,'FOMEQUE','25'),
(381,'FONSECA','44'),
(382,'RECETOR','85'),
(383,'FOSCA','25'),
(384,'FREDONIA','05'),
(385,'FRESNO','73'),
(386,'FRONTINO','05'),
(387,'FUNZA','25'),
(388,'FUENTE DE ORO','50'),
(389,'FUNES','52'),
(390,'FUQUENE','25'),
(391,'FUNDACION','47'),
(392,'FLORENCIA','19'),
(393,'FUSAGASUGA','25'),
(394,'GACHANTIVA','15'),
(395,'GACHALA','25'),
(396,'GAMARRA','20'),
(397,'GACHANCIPA','25'),
(398,'GALAPA','08'),
(399,'GAMEZA','15'),
(400,'GALAN','68'),
(401,'GACHETA','25'),
(402,'GARZON','41'),
(403,'GAMBITA','68'),
(404,'GARAGOA','15'),
(405,'GAMA','25'),
(406,'HATILLO DE LOBA','13'),
(407,'COTORRA','23'),
(408,'FORTUL','81'),
(409,'SABANALARGA','85'),
(410,'GENOVA','63'),
(411,'GIRALDO','05'),
(412,'GIGANTE','41'),
(413,'GINEBRA','76'),
(414,'GIRARDOT','25'),
(415,'GIRON','68'),
(416,'GIRARDOTA','05'),
(417,'GOMEZ PLATA','05'),
(418,'GONZALEZ','20'),
(419,'GRANADA','25'),
(420,'GRANADA','05'),
(421,'GRANADA','50'),
(422,'GRAMALOTE','54'),
(423,'GUADALUPE','05'),
(424,'SACAMA','85'),
(425,'GUACAMAYAS','15'),
(426,'GUACHETA','25'),
(427,'GUACHUCAL','52'),
(428,'GUARNE','05'),
(429,'GUAPI','19'),
(430,'GUAMAL','47'),
(431,'GUAMAL','50'),
(432,'GUATICA','66'),
(433,'GUACA','68'),
(434,'GUACARI','76'),
(435,'GUADALUPE','41'),
(436,'GUAMO','73'),
(437,'GUADUAS','25'),
(438,'GUAITARILLA','52'),
(439,'GUADALUPE','68'),
(440,'ORITO','86'),
(441,'GUATAPE','05'),
(442,'GUATEQUE','15'),
(443,'GUASCA','25'),
(444,'GUAPOTA','68'),
(445,'GUALMATAN','52'),
(446,'GUATAQUI','25'),
(447,'GUAVATA','68'),
(448,'GUAYATA','15'),
(449,'MAPIRIPAN','50'),
(450,'SAN LUIS DE PAL','85'),
(451,'GUATAVITA','25'),
(452,'G','68'),
(453,'GUAYABAL DE SIQ','25'),
(454,'MESETAS','50'),
(455,'G','15'),
(456,'GUAYABETAL','25'),
(457,'GUTIERREZ','25'),
(458,'BARRANCO MINAS','94'),
(459,'HACARI','54'),
(460,'HATO','68'),
(461,'HELICONIA','05'),
(462,'HERRAN','54'),
(463,'HERVEO','73'),
(464,'HOBO','41'),
(465,'HONDA','73'),
(466,'LA APARTADA','23'),
(467,'LA MACARENA','50'),
(468,'ILES','52'),
(469,'ICONONZO','73'),
(470,'HISPANIA','05'),
(471,'IMUES','52'),
(472,'INZA','19'),
(473,'IPIALES','52'),
(474,'IQUIRA','41'),
(475,'ISNOS','41'),
(476,'ITAGUI','05'),
(477,'ITUANGO','05'),
(478,'ISTMINA','27'),
(479,'IZA','15'),
(480,'JARDIN','05'),
(481,'JAMBALO','19'),
(482,'JAMUNDI','76'),
(483,'JENESANO','15'),
(484,'JERICO','05'),
(485,'JERICO','15'),
(486,'JERUSALEN','25'),
(487,'JESUS MARIA','68'),
(488,'URIBE','50'),
(489,'JORDAN','68'),
(490,'JUAN DE ACOSTA','08'),
(491,'JUNIN','25'),
(492,'JURADO','27'),
(493,'LA CEJA','05'),
(494,'LABRANZAGRANDE','15'),
(495,'LA CALERA','25'),
(496,'LABATECA','54'),
(497,'LA BELLEZA','68'),
(498,'LA CUMBRE','76'),
(499,'LA ARGENTINA','41'),
(500,'HATONUEVO','44'),
(501,'LA CRUZ','52'),
(502,'LA ESTRELLA','05'),
(503,'LA CAPILLA','15'),
(504,'LA DORADA','17'),
(505,'LA FLORIDA','52'),
(506,'LA GLORIA','20'),
(507,'LA CELIA','66'),
(508,'LA LLANADA','52'),
(509,'LA ESPERANZA','54'),
(510,'LANDAZURI','68'),
(511,'LA MESA','25'),
(512,'LA MERCED','17'),
(513,'LA PINTADA','05'),
(514,'LA TOLA','52'),
(515,'LA SIERRA','19'),
(516,'LA PALMA','25'),
(517,'LA PLATA','41'),
(518,'LA VEGA','19'),
(519,'LA PAZ','68'),
(520,'LA PE','25'),
(521,'LA PLAYA','54'),
(522,'LA UNION','52'),
(523,'LA UNION','05'),
(524,'LA JAGUA DE IBI','20'),
(525,'LEJANIAS','50'),
(526,'LA VIRGINIA','66'),
(527,'LA UNION','70'),
(528,'LA UNION','76'),
(529,'TAMARA','85'),
(530,'LA VICTORIA','15'),
(531,'LA TEBAIDA','63'),
(532,'LA VEGA','25'),
(533,'LA UVITA','15'),
(534,'LA VICTORIA','76'),
(535,'LEIVA','52'),
(536,'LOS PATIOS','54'),
(537,'LA CHORRERA','91'),
(538,'LEBRIJA','68'),
(539,'VILLA DE LEYVA','15'),
(540,'LENGUAZAQUE','25'),
(541,'LA PEDRERA','91'),
(542,'LERIDA','73'),
(543,'LA MONTA','18'),
(544,'TAURAMENA','85'),
(545,'LIBORINA','05'),
(546,'LINARES','52'),
(547,'LIBANO','73'),
(548,'LLORO','27'),
(549,'LORICA','23'),
(550,'LOPEZ','19'),
(551,'LOS ANDES','52'),
(552,'LOURDES','54'),
(553,'LOS SANTOS','68'),
(554,'LOS PALMITOS','70'),
(555,'LOS CORDOBAS','23'),
(556,'LA JAGUA DEL PI','44'),
(557,'LURUACO','08'),
(558,'MACEO','05'),
(559,'MACANAL','15'),
(560,'MEDIO ATRATO','27'),
(561,'MACARAVITA','68'),
(562,'MACHETA','25'),
(563,'MAG','52'),
(564,'MAJAGUAL','70'),
(565,'MAGANGUE','13'),
(566,'MADRID','25'),
(567,'MEDIO BAUDO','27'),
(568,'MAICAO','44'),
(569,'TRINIDAD','85'),
(570,'LA VICTORIA','91'),
(571,'MALAGA','68'),
(572,'MALAMBO','08'),
(573,'MAHATES','13'),
(574,'MANZANARES','17'),
(575,'MALLAMA','52'),
(576,'MANATI','08'),
(577,'MANTA','25'),
(578,'MEDINA','25'),
(579,'MARINILLA','05'),
(580,'MARGARITA','13'),
(581,'MARSELLA','66'),
(582,'VILLANUEVA','85'),
(583,'MARIA LA BAJA','13'),
(584,'MARMATO','17'),
(585,'MANAURE','20'),
(586,'MARIQUITA','73'),
(587,'MARQUETALIA','17'),
(588,'MATANZA','68'),
(589,'MARULANDA','17'),
(590,'MELGAR','73'),
(591,'MERCADERES','19'),
(592,'MEDIO SAN JUAN','27'),
(593,'PUERTO CONCORDI','50'),
(594,'MIRAFLORES','15'),
(595,'MIRANDA','19'),
(596,'MISTRATO','66'),
(597,'MONTECRISTO','13'),
(598,'MILAN','18'),
(599,'NUEVA GRANADA','47'),
(600,'MIRITI-PARANA','91'),
(601,'MURILLO','73'),
(602,'MONGUA','15'),
(603,'MOMIL','23'),
(604,'MOGOTES','68'),
(605,'MONGUI','15'),
(606,'MONTELIBANO','23'),
(607,'MONTEBELLO','05'),
(608,'MOMPOS','13'),
(609,'MOLAGAVITA','68'),
(610,'MONIQUIRA','15'),
(611,'MONTENEGRO','63'),
(612,'MORALES','13'),
(613,'MORALES','19'),
(614,'MOSQUERA','25'),
(615,'MOSQUERA','52'),
(616,'MORROA','70'),
(617,'MURINDO','05'),
(618,'MOTAVITA','15'),
(619,'MORELIA','18'),
(620,'MUTATA','05'),
(621,'MUZO','15'),
(622,'NARI','52'),
(623,'MUTISCUA','54'),
(624,'NARI','05'),
(625,'NARI','25'),
(626,'NATAGA','41'),
(627,'NATAGAIMA','73'),
(628,'NEIRA','17'),
(629,'NEMOCON','25'),
(630,'NILO','25'),
(631,'NIMAIMA','25'),
(632,'NECOCLI','05'),
(633,'OLAYA HERRERA','52'),
(634,'NOBSA','15'),
(635,'NOCAIMA','25'),
(636,'NOVITA','27'),
(637,'NUEVO COLON','15'),
(638,'NECHI','05'),
(639,'NORCASIA','17'),
(640,'NUQUI','27'),
(641,'OBANDO','76'),
(642,'OCA','54'),
(643,'OCAMONTE','68'),
(644,'OICATA','15'),
(645,'MO','23'),
(646,'OIBA','68'),
(647,'OLAYA','05'),
(648,'ONZAGA','68'),
(649,'OPORAPA','41'),
(650,'ORTEGA','73'),
(651,'VENECIA','25'),
(652,'OSPINA','52'),
(653,'OTANCHE','15'),
(654,'OVEJAS','70'),
(655,'PACHAVITA','15'),
(656,'PACOA','97'),
(657,'PACORA','17'),
(658,'PADILLA','19'),
(659,'PACHO','25'),
(660,'PAEZ','15'),
(661,'PAIPA','15'),
(662,'PAEZ','19'),
(663,'PAILITAS','20'),
(664,'PAJARITO','15'),
(665,'PAIME','25'),
(666,'PAICOL','41'),
(667,'PAMPLONA','54'),
(668,'PALMAR DE VAREL','08'),
(669,'FRANCISCO PIZAR','52'),
(670,'PAMPLONITA','54'),
(671,'PALOCABILDO','73'),
(672,'PALMIRA','76'),
(673,'PANQUEBA','15'),
(674,'PALMAR','68'),
(675,'PALMITO','70'),
(676,'PALESTINA','17'),
(677,'CUCUNUBA','22'),
(678,'PANDI','25'),
(679,'PALERMO','41'),
(680,'PALMAS DEL SOCO','68'),
(681,'LA PRIMAVERA','99'),
(682,'PARATEBUENO','25'),
(683,'PALESTINA','41'),
(684,'PUERTO ALEGRIA','91'),
(685,'PAUNA','15'),
(686,'PATIA','19'),
(687,'PAYA','15'),
(688,'PIAMONTE','19'),
(689,'PARAMO','68'),
(690,'PASCA','25'),
(691,'PUERTO ARICA','91'),
(692,'PAZ DE RIO','15'),
(693,'POLICARPA','52'),
(694,'PUERTO NARI','91'),
(695,'PE','05'),
(696,'PENSILVANIA','17'),
(697,'PEDRAZA','47'),
(698,'PESCA','15'),
(699,'PEQUE','05'),
(700,'PIJI','47'),
(701,'PIEDECUESTA','68'),
(702,'PIEDRAS','73'),
(703,'PITAL','41'),
(704,'PIJAO','63'),
(705,'PIOJO','08'),
(706,'PINILLOS','13'),
(707,'PINCHOTE','68'),
(708,'PISBA','15'),
(709,'PELAYA','20'),
(710,'PITALITO','41'),
(711,'PIVIJAY','47'),
(712,'PUERTO SANTANDE','54'),
(713,'PLANETA RICA','23'),
(714,'PLATO','47'),
(715,'PLANADAS','73'),
(716,'POLONUEVO','08'),
(717,'PONEDERA','08'),
(718,'MANAURE','44'),
(719,'POTOSI','52'),
(720,'PRADO','73'),
(721,'PRADERA','76'),
(722,'PROVIDENCIA','88'),
(723,'PROVIDENCIA','52'),
(724,'PUERTO GAITAN','50'),
(725,'PUERTO ASIS','86'),
(726,'PUERTO CAICEDO','86'),
(727,'PUEBLO BELLO','20'),
(728,'PUEBLO NUEVO','23'),
(729,'PUEBLOVIEJO','47'),
(730,'PUERTO GUZMAN','86'),
(731,'PUERTO BOYACA','15'),
(732,'PUERTO SALGAR','25'),
(733,'PUEBLO RICO','66'),
(734,'PUENTE NACIONAL','68'),
(735,'PUERTO COLOMBIA','08'),
(736,'PUERTO TEJADA','19'),
(737,'PUERTO LOPEZ','50'),
(738,'PUERRES','52'),
(739,'PUERTO PARRA','68'),
(740,'LEGUIZAMO','86'),
(741,'PUERTO ESCONDID','23'),
(742,'PUERTO WILCHES','68'),
(743,'PUEBLORRICO','05'),
(744,'PUERTO LLERAS','50'),
(745,'PUERTO BERRIO','05'),
(746,'REGIDOR','13'),
(747,'QUIPAMA','15'),
(748,'PUERTO LIBERTAD','23'),
(749,'PULI','25'),
(750,'RIO IRO','27'),
(751,'PUERTO NARE','05'),
(752,'PURACE','19'),
(753,'PUPIALES','52'),
(754,'PURIFICACION','73'),
(755,'PURISIMA','23'),
(756,'PUERTO RICO','50'),
(757,'PUERTO TRIUNFO','05'),
(758,'PUERTO RONDON','81'),
(759,'PUERTO RICO','18'),
(760,'QUEBRADANEGRA','25'),
(761,'QUETAME','25'),
(762,'QUIMBAYA','63'),
(763,'QUINCHIA','66'),
(764,'QUIPILE','25'),
(765,'RAMIRIQUI','15'),
(766,'APULO','25'),
(767,'RAGONVALIA','54'),
(768,'RIO VIEJO','13'),
(769,'RAQUIRA','15'),
(770,'RIO QUITO','27'),
(771,'REMEDIOS','05'),
(772,'REMOLINO','47'),
(773,'REPELON','08'),
(774,'RESTREPO','50'),
(775,'RESTREPO','76'),
(776,'RETIRO','05'),
(777,'SAN JOSE DEL FR','18'),
(778,'RICAURTE','25'),
(779,'RICAURTE','52'),
(780,'RIOSUCIO','17'),
(781,'RIO DE ORO','20'),
(782,'RIONEGRO','05'),
(783,'RIOSUCIO','27'),
(784,'RIVERA','41'),
(785,'RIONEGRO','68'),
(786,'RISARALDA','17'),
(787,'RIOBLANCO','73'),
(788,'RIOFRIO','76'),
(789,'SAN CRISTOBAL','13'),
(790,'RONDON','15'),
(791,'LA PAZ','20'),
(792,'ROBERTO PAYAN','52'),
(793,'ROSAS','19'),
(794,'RONCESVALLES','73'),
(795,'ROLDANILLO','76'),
(796,'ROVIRA','73'),
(797,'SANTA ROSALIA','99'),
(798,'SABANALARGA','05'),
(799,'SABANETA','05'),
(800,'SABOYA','15'),
(801,'SABANAGRANDE','08'),
(802,'SABANALARGA','08'),
(803,'SACHICA','15'),
(804,'SALGAR','05'),
(805,'SAN ANTONIO DEL','25'),
(806,'SAMACA','15'),
(807,'SAN ANDRES','05'),
(808,'SAN ESTANISLAO','13'),
(809,'SAN CARLOS','05'),
(810,'SAN BERNARDO','25'),
(811,'SAN FERNANDO','13'),
(812,'SAN JUAN DEL CE','44'),
(813,'SAN FRANCISCO','05'),
(814,'SALAMINA','17'),
(815,'SAN CAYETANO','25'),
(816,'SAN JACINTO','13'),
(817,'SAN JACINTO DEL','13'),
(818,'SABANA DE TORRE','68'),
(819,'SAN JERONIMO','05'),
(820,'SAN JUAN NEPOMU','13'),
(821,'SAN JOSE DE LA ','05'),
(822,'SAN FRANCISCO','25'),
(823,'SAN JUAN DE URA','05'),
(824,'SAN LUIS','05'),
(825,'SAN EDUARDO','15'),
(826,'SAHAGUN','23'),
(827,'SAN JOSE DEL PA','27'),
(828,'SALADOBLANCO','41'),
(829,'SABANAS DE SAN ','47'),
(830,'SALAZAR','54'),
(831,'SAMANA','17'),
(832,'SAN JUAN DE RIO','25'),
(833,'MAPIRIPANA','94'),
(834,'SAN PEDRO','05'),
(835,'SAN JOSE DE PAR','15'),
(836,'SAN PEDRO DE UR','05'),
(837,'SAN JOSE','17'),
(838,'TARAIRA','97'),
(839,'SAN RAFAEL','05'),
(840,'SAN MARTIN DE L','13'),
(841,'SAN LUIS DE GAC','15'),
(842,'SAN AGUSTIN','41'),
(843,'SAN ANDRES','68'),
(844,'PUERTO SANTANDE','91'),
(845,'SAN ROQUE','05'),
(846,'SAN PABLO','13'),
(847,'SAN ANDRES SOTA','23'),
(848,'SAN CALIXTO','54'),
(849,'SAMPUES','70'),
(850,'SAN PEDRO','76'),
(851,'SALDA','73'),
(852,'SAN ANTERO','23'),
(853,'SANTA CATALINA','13'),
(854,'SAN MATEO','15'),
(855,'SAN CAYETANO','54'),
(856,'SAN BENITO','68'),
(857,'SAN VICENTE','05'),
(858,'SANTA LUCIA','08'),
(859,'SAN BERNARDO DE','23'),
(860,'SALAMINA','47'),
(861,'SAN ANTONIO','73'),
(862,'SAN MIGUEL DE S','15'),
(863,'SANTA MARIA','41'),
(864,'SAN CARLOS','23'),
(865,'SAMANIEGO','52'),
(866,'SAN BENITO ABAD','70'),
(867,'SAN LUIS','73'),
(868,'SANTA BARBARA','05'),
(869,'SAN GIL','68'),
(870,'SAN CARLOS DE G','50'),
(871,'SANTIAGO','54'),
(872,'SAN PABLO DE BO','15'),
(873,'SANTA ROSA DE C','66'),
(874,'SAN JOAQUIN','68'),
(875,'SANTA ROSA','13'),
(876,'SAN JUAN DE ARA','50'),
(877,'SANDONA','52'),
(878,'SAN JOSE DE MIR','68'),
(879,'SANTO TOMAS','08'),
(880,'SAN BERNARDO','52'),
(881,'SANTA ROSA DE O','05'),
(882,'SANTANA','15'),
(883,'SAN PELAYO','23'),
(884,'SAN JUANITO','50'),
(885,'SAN MIGUEL','68'),
(886,'SANTA ISABEL','73'),
(887,'SAN LORENZO','52'),
(888,'SANTUARIO','66'),
(889,'SANTA ROSA DEL ','13'),
(890,'SAN MARTIN','50'),
(891,'SAN VICENTE DE ','68'),
(892,'SANTO DOMINGO','05'),
(893,'SANTA MARIA','15'),
(894,'SALENTO','63'),
(895,'SAN SEBASTIAN D','47'),
(896,'SANTA ROSA DE V','15'),
(897,'SAN SEBASTIAN','19'),
(898,'SAN PABLO','52'),
(899,'SAN PEDRO DE CA','52'),
(900,'SANTA SOFIA','15'),
(901,'SANTA BARBARA','52'),
(902,'EL SANTUARIO','05'),
(903,'SANTANDER DE QU','19'),
(904,'SANTACRUZ','52'),
(905,'SANTA ROSA','19'),
(906,'SAN JUAN DE BET','70'),
(907,'SAN ZENON','47'),
(908,'SANTA BARBARA','68'),
(909,'SANTA ANA','47'),
(910,'SAN MARCOS','70'),
(911,'SAN ALBERTO','20'),
(912,'VISTAHERMOSA','50'),
(913,'SAN ONOFRE','70'),
(914,'SAN PEDRO','70'),
(915,'SASAIMA','25'),
(916,'SATIVANORTE','15'),
(917,'SANTA BARBARA D','47'),
(918,'SAPUYES','52'),
(919,'SARDINATA','54'),
(920,'SANTA HELENA DE','68'),
(921,'SATIVASUR','15'),
(922,'SEGOVIA','05'),
(923,'SESQUILE','25'),
(924,'SEVILLA','76'),
(925,'SARAVENA','81'),
(926,'SIACHOQUE','15'),
(927,'SIBATE','25'),
(928,'SINCE','70'),
(929,'SILVIA','19'),
(930,'SILVANIA','25'),
(931,'SILOS','54'),
(932,'SIMITI','13'),
(933,'SIMIJACA','25'),
(934,'SIPI','27'),
(935,'SITIONUEVO','47'),
(936,'SIMACOTA','68'),
(937,'SIBUNDOY','86'),
(938,'SAN DIEGO','20'),
(939,'SOATA','15'),
(940,'SAN VICENTE DEL','18'),
(941,'SOACHA','25'),
(942,'SOCOTA','15'),
(943,'SOCORRO','68'),
(944,'SAN FRANCISCO','86'),
(945,'SONSON','05'),
(946,'SOLANO','18'),
(947,'SOCHA','15'),
(948,'SAN MIGUEL','86'),
(949,'SOLEDAD','08'),
(950,'SOPO','25'),
(951,'SOGAMOSO','15'),
(952,'SOPLAVIENTO','13'),
(953,'SOTARA','19'),
(954,'SANTIAGO','86'),
(955,'SOPETRAN','05'),
(956,'SOMONDOCO','15'),
(957,'SORA','15'),
(958,'SOTAQUIRA','15'),
(959,'SORACA','15'),
(960,'SUBACHOQUE','25'),
(961,'SUAN','08'),
(962,'SAN MARTIN','20'),
(963,'SUAZA','41'),
(964,'SUAITA','68'),
(965,'SUAREZ','73'),
(966,'SUCRE','70'),
(967,'SUESCA','25'),
(968,'SUCRE','68'),
(969,'CUMARIBO','99'),
(970,'SUSACON','15'),
(971,'SUTAMARCHAN','15'),
(972,'SUPIA','17'),
(973,'SUPATA','25'),
(974,'PAPUNAUA','97'),
(975,'SUTATENZA','15'),
(976,'SUSA','25'),
(977,'TALAIGUA NUEVO','13'),
(978,'SUAREZ','19'),
(979,'SURATA','68'),
(980,'SUTATAUSA','25'),
(981,'SOLITA','18'),
(982,'SUCRE','19'),
(983,'TABIO','25'),
(984,'TAMINANGO','52'),
(985,'TAMALAMEQUE','20'),
(986,'TADO','27'),
(987,'TANGUA','52'),
(988,'TAMESIS','05'),
(989,'TARAZA','05'),
(990,'TASCO','15'),
(991,'TARQUI','41'),
(992,'TARSO','05'),
(993,'TAUSA','25'),
(994,'TAME','81'),
(995,'TENA','25'),
(996,'TESALIA','41'),
(997,'TENZA','15'),
(998,'TENERIFE','47'),
(999,'TARAPACA','91'),
(1000,'TENJO','25'),
(1001,'TELLO','41'),
(1002,'UNGUIA','27'),
(1003,'TEORAMA','54'),
(1004,'TERUEL','41'),
(1005,'TIBANA','15'),
(1006,'TIBACUY','25'),
(1007,'TIBASOSA','15'),
(1008,'TIMBIO','19'),
(1009,'TIERRALTA','23'),
(1010,'TIBIRITA','25'),
(1011,'TIMANA','41'),
(1012,'TINJACA','15'),
(1013,'TITIRIBI','05'),
(1014,'TIMBIQUI','19'),
(1015,'TIQUISIO','13'),
(1016,'TIPACOQUE','15'),
(1017,'UNION PANAMERIC','27'),
(1018,'TIBU','54'),
(1019,'TOCA','15'),
(1020,'TOCAIMA','25'),
(1021,'TOG','15'),
(1022,'TOCANCIPA','25'),
(1023,'TOLEDO','05'),
(1024,'PIENDAMO','54'),
(1025,'TOPAGA','15'),
(1026,'TOLEDO','54'),
(1027,'TONA','68'),
(1028,'SANTIAGO DE TOL','70'),
(1029,'TORIBIO','19'),
(1030,'TOTA','15'),
(1031,'TOPAIPI','25'),
(1032,'TOLU VIEJO','70'),
(1033,'TORO','76'),
(1034,'TOTORO','19'),
(1035,'TRUJILLO','76'),
(1036,'TUBARA','08'),
(1037,'TUNUNGUA','15'),
(1038,'TULUA','76'),
(1039,'TURMEQUE','15'),
(1040,'TUMACO','52'),
(1041,'TURBACO','13'),
(1042,'TURBO','05'),
(1043,'TUTA','15'),
(1044,'TURBANA','13'),
(1045,'TUQUERRES','52'),
(1046,'TUTAZA','15'),
(1047,'UBALA','25'),
(1048,'UBAQUE','25'),
(1049,'URAMITA','05'),
(1050,'UMBITA','15'),
(1051,'VILLA DE SAN DI','25'),
(1052,'VILLA RICA','19'),
(1053,'UNE','25'),
(1054,'ULLOA','76'),
(1055,'URRAO','05'),
(1056,'URIBIA','44'),
(1057,'USIACURI','08'),
(1058,'','25'),
(1059,'VALDIVIA','05'),
(1060,'VALLE DE SAN JU','73'),
(1061,'VALENCIA','23'),
(1062,'URUMITA','44'),
(1063,'VALLE DE SAN JO','68'),
(1064,'VALPARAISO','05'),
(1065,'VEGACHI','05'),
(1066,'VALPARAISO','18'),
(1067,'VENECIA','05'),
(1068,'VENTAQUEMADA','15'),
(1069,'VELEZ','68'),
(1070,'VENADILLO','73'),
(1071,'VERGARA','25'),
(1072,'VERSALLES','76'),
(1073,'VALLE DEL GUAMU','86'),
(1074,'VICTORIA','17'),
(1075,'VIANI','25'),
(1076,'VETAS','68'),
(1077,'VIJES','76'),
(1078,'VILLAHERMOSA','73'),
(1079,'VILLAGOMEZ','25'),
(1080,'VILLA CARO','54'),
(1081,'VILLAVIEJA','41'),
(1082,'VILLANUEVA','68'),
(1083,'VIGIA DEL FUERT','05'),
(1084,'VILLANUEVA','13'),
(1085,'VILLAMARIA','17'),
(1086,'VILLAPINZON','25'),
(1087,'VILLARRICA','73'),
(1088,'VILLANUEVA','44'),
(1089,'VILLA DEL ROSAR','54'),
(1090,'VILLETA','25'),
(1091,'VITERBO','17'),
(1092,'VIOTA','25'),
(1093,'VIRACACHA','15'),
(1094,'SAN FELIPE','94'),
(1095,'PUERTO COLOMBIA','94'),
(1096,'YALI','05'),
(1097,'YACOPI','25'),
(1098,'YAGUARA','41'),
(1099,'YACUANQUER','52'),
(1100,'VILLAGARZON','86'),
(1101,'LA GUADALUPE','94'),
(1102,'CACAHUAL','94'),
(1103,'YARUMAL','05'),
(1104,'PANA PANA','94'),
(1105,'MORICHAL NUEVO','94'),
(1106,'YAVARATE','97'),
(1107,'YOLOMBO','05'),
(1108,'YOTOCO','76'),
(1109,'YUMBO','76'),
(1110,'YONDO','05'),
(1111,'ZAMBRANO','13'),
(1112,'ZARAGOZA','05'),
(1113,'ZAPATOCA','68'),
(1114,'ZARZAL','76'),
(1115,'ZETAQUIRA','15'),
(1116,'ZIPACON','25'),
(1117,'ZIPAQUIRA','25'),
(1118,'ZAPAYAN','47'),
(1119,'ZONA BANANERA','47');

/*Table structure for table `notas_docente` */

DROP TABLE IF EXISTS `notas_docente`;

CREATE TABLE `notas_docente` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tema_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `contenido` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notas_docente_tema_id_foreign` (`tema_id`),
  KEY `notas_docente_user_id_foreign` (`user_id`),
  CONSTRAINT `notas_docente_tema_id_foreign` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notas_docente_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `notas_docente` */

/*Table structure for table `observaciones` */

DROP TABLE IF EXISTS `observaciones`;

CREATE TABLE `observaciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `tema_id` bigint unsigned DEFAULT NULL,
  `contenido` text NOT NULL,
  `tipo` enum('general','logro') NOT NULL DEFAULT 'general',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `observaciones_estudiante_id_foreign` (`estudiante_id`),
  KEY `observaciones_user_id_foreign` (`user_id`),
  KEY `observaciones_tema_id_foreign` (`tema_id`),
  CONSTRAINT `observaciones_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `observaciones_tema_id_foreign` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `observaciones_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `observaciones` */

/*Table structure for table `password_reset_tokens` */

DROP TABLE IF EXISTS `password_reset_tokens`;

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `password_reset_tokens` */

/*Table structure for table `personal_access_tokens` */

DROP TABLE IF EXISTS `personal_access_tokens`;

CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `personal_access_tokens` */

/*Table structure for table `piar` */

DROP TABLE IF EXISTS `piar`;

CREATE TABLE `piar` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `docente_id` bigint unsigned DEFAULT NULL,
  `estado` enum('borrador','revisado','aprobado') NOT NULL DEFAULT 'borrador',
  `paso` int DEFAULT NULL,
  `fecha_diligenciamiento` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `activo` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `piar_estudiante_id_unique` (`estudiante_id`),
  KEY `piar_docente_id_foreign` (`docente_id`),
  CONSTRAINT `piar_docente_id_foreign` FOREIGN KEY (`docente_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `piar_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar` */

/*Table structure for table `piar_acta_compromiso` */

DROP TABLE IF EXISTS `piar_acta_compromiso`;

CREATE TABLE `piar_acta_compromiso` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_piar` bigint unsigned NOT NULL,
  `compromisos` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_acta_compromiso` */

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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_acta_compromiso_actividades` */

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_ajuste_razonable` */

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
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_ajuste_razonable_docente_firma` */

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
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_ajuste_razonable_item` */

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
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_atencion_medica` */

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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_datos_generales` */

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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_entorno_educativo` */

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_entorno_hogar` */

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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_entorno_salud` */

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
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_medicamento` */

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
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_tratamiento` */

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
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar_valoracion_pedagogica` */

/*Table structure for table `portafolios` */

DROP TABLE IF EXISTS `portafolios`;

CREATE TABLE `portafolios` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint unsigned NOT NULL,
  `tema_id` bigint unsigned NOT NULL,
  `tipo_registro` enum('foto','audio','emocion','resultado') NOT NULL,
  `contenido` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `emocion_seleccionada` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `portafolios_estudiante_id_foreign` (`estudiante_id`),
  KEY `portafolios_tema_id_foreign` (`tema_id`),
  CONSTRAINT `portafolios_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `portafolios_tema_id_foreign` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `portafolios_chk_1` CHECK (json_valid(`contenido`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `portafolios` */

/*Table structure for table `registros_acceso` */

DROP TABLE IF EXISTS `registros_acceso`;

CREATE TABLE `registros_acceso` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `ambiente` varchar(255) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipo` varchar(30) NOT NULL DEFAULT 'inicio_sesion',
  PRIMARY KEY (`id`),
  KEY `login_logs_user_id_foreign` (`user_id`),
  CONSTRAINT `login_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `registros_acceso` */

insert  into `registros_acceso`(`id`,`user_id`,`ip`,`ambiente`,`fecha`,`tipo`) values
(34,1,'127.0.0.1','musica','2026-08-04 08:50:54','inicio_sesion'),
(35,16,'127.0.0.1','musica','2026-08-04 08:54:22','inicio_sesion'),
(36,4,'127.0.0.1','musica','2026-08-04 11:01:01','inicio_sesion');

/*Table structure for table `seguridad_logs` */

DROP TABLE IF EXISTS `seguridad_logs`;

CREATE TABLE `seguridad_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `actor_user_id` bigint unsigned DEFAULT NULL,
  `accion` varchar(50) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `registro_afectado` varchar(255) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `seguridad_logs_user_id_foreign` (`user_id`),
  KEY `seguridad_logs_actor_user_id_foreign` (`actor_user_id`),
  CONSTRAINT `seguridad_logs_actor_user_id_foreign` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `seguridad_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `seguridad_logs` */

insert  into `seguridad_logs`(`id`,`user_id`,`actor_user_id`,`accion`,`descripcion`,`registro_afectado`,`ip`,`user_agent`,`created_at`,`updated_at`) values
(1,1,1,'login','Inicio de sesión exitoso.',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-08-04 08:50:54','2026-08-04 08:50:54'),
(2,16,16,'login','Inicio de sesión exitoso.',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-08-04 08:54:22','2026-08-04 08:54:22'),
(3,4,4,'login','Inicio de sesión exitoso.',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','2026-08-04 11:01:01','2026-08-04 11:01:01');

/*Table structure for table `temas` */

DROP TABLE IF EXISTS `temas`;

CREATE TABLE `temas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `modulo_id` bigint unsigned NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text,
  `icono` varchar(255) DEFAULT NULL,
  `instruccion_corta` varchar(255) DEFAULT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  `marcador_ra` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `temas_modulo_id_foreign` (`modulo_id`),
  CONSTRAINT `temas_modulo_id_foreign` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `temas` */

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institucion_id` bigint unsigned DEFAULT NULL,
  `identificacion` varchar(50) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('superAdmin','admin','docente') NOT NULL DEFAULT 'docente',
  `estado` enum('activo','inactivo','eliminado') NOT NULL DEFAULT 'activo',
  `creado_por` bigint unsigned DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `bloqueado_en` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_institucion_id_foreign` (`institucion_id`),
  KEY `users_creado_por_foreign` (`creado_por`),
  CONSTRAINT `users_creado_por_foreign` FOREIGN KEY (`creado_por`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_institucion_id_foreign` FOREIGN KEY (`institucion_id`) REFERENCES `instituciones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `users` */

insert  into `users`(`id`,`institucion_id`,`identificacion`,`nombre`,`apellido`,`email`,`password`,`rol`,`estado`,`creado_por`,`remember_token`,`bloqueado_en`,`created_at`,`updated_at`) values
(1,NULL,'1234567890','Super','Admin','superadmin@aulasreggio.test','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','superAdmin','activo',NULL,NULL,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50'),
(2,1,'2131231456','Docente Música','Música','docente.musica@aulasreggio.test','$2y$10$1ayJZZHZTm69wZ3YQcU4ZewcwdSd7GDpGKMR2LH0reayC5g6Rg1bW','docente','activo',NULL,NULL,NULL,'2026-06-16 00:02:02','2026-06-24 15:36:58'),
(4,1,'3423445664','Ana Sofia','Ramirez','ana.sofia@aulasreggio.test','$2y$10$xaq8IzkCANMR486WjHqUOORDgCC9BuwE7sIUUgKMYWCbhEHKcGi5q','docente','activo',NULL,NULL,NULL,'2026-06-16 17:32:50','2026-06-24 15:36:35'),
(5,1,'32434','Carlos Eduardo',' Perez','carlos.perez@aulasreggio.test','$2y$10$CrH2dWYlMdA4gcmrQ6J2ReOmOFUb3oq47nb6PxSdjxpjHRkSfMWVC','docente','activo',NULL,NULL,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50'),
(16,1,'OSRaOLyVQB','Administrador',NULL,'fabian.quintero.2201@gmail.com','$2y$10$v8Np5rui71dWGOQFMtU3DOWfBNrJgjd.NqOhLUgwHHPYBOrHVt25y','admin','activo',1,NULL,NULL,'2026-08-04 08:53:36','2026-08-04 08:53:36');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
