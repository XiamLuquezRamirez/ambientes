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

/*Table structure for table `ejes` */

DROP TABLE IF EXISTS `ejes`;

CREATE TABLE `ejes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `modulo_id` bigint unsigned NOT NULL,
  `institucion_id` bigint unsigned DEFAULT NULL,
  `creado_por` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `es_oficial` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ejes_modulo_id_slug_unique` (`modulo_id`,`slug`),
  KEY `ejes_institucion_id_foreign` (`institucion_id`),
  KEY `ejes_creado_por_foreign` (`creado_por`),
  CONSTRAINT `ejes_modulo_id_foreign` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ejes_institucion_id_foreign` FOREIGN KEY (`institucion_id`) REFERENCES `instituciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ejes_creado_por_foreign` FOREIGN KEY (`creado_por`) REFERENCES `docentes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `ejes` */

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
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(40,'2026_06_23_000003_actualizar_campos_configuracion_pins',10),
(41,'2026_08_06_000001_create_modulo_institucion_and_ensure_modulos_oficiales',11),
(42,'2026_08_06_000002_create_ejes_table',11),
(43,'2026_08_10_000001_add_creado_por_to_ejes_table',11);

/*Table structure for table `modulo_institucion` */

DROP TABLE IF EXISTS `modulo_institucion`;

CREATE TABLE `modulo_institucion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `modulo_id` bigint unsigned NOT NULL,
  `institucion_id` bigint unsigned NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modulo_institucion_modulo_id_institucion_id_unique` (`modulo_id`,`institucion_id`),
  KEY `modulo_institucion_institucion_id_foreign` (`institucion_id`),
  CONSTRAINT `modulo_institucion_modulo_id_foreign` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `modulo_institucion_institucion_id_foreign` FOREIGN KEY (`institucion_id`) REFERENCES `instituciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `modulo_institucion` */

/*Table structure for table `modulos` */

DROP TABLE IF EXISTS `modulos`;

CREATE TABLE `modulos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint unsigned NOT NULL,
  `institucion_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text,
  `icono` varchar(255) DEFAULT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `visible_estudiantes` tinyint(1) NOT NULL DEFAULT '1',
  `es_oficial` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modulos_ambiente_id_foreign` (`ambiente_id`),
  KEY `modulos_institucion_id_foreign` (`institucion_id`),
  CONSTRAINT `modulos_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `modulos_institucion_id_foreign` FOREIGN KEY (`institucion_id`) REFERENCES `instituciones` (`id`) ON DELETE SET NULL
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
(1,'Medellin','05'),
(2,'Barranquilla','08'),
(3,'Bogota D.c.','11'),
(4,'Cartagena','13'),
(5,'Tunja','15'),
(6,'Manizales','17'),
(7,'Florencia','18'),
(8,'Popayan','19'),
(9,'Valledupar','20'),
(10,'Monteria','23'),
(11,'Agua De Dios','25'),
(12,'Quibdo','27'),
(13,'Neiva','41'),
(14,'Riohacha','44'),
(15,'Santa Marta','47'),
(16,'Villavicencio','50'),
(17,'Pasto','52'),
(18,'Cucuta','54'),
(19,'Armenia','63'),
(20,'Pereira','66'),
(21,'Bucaramanga','68'),
(22,'Sincelejo','70'),
(23,'Ibague','73'),
(24,'Cali','76'),
(25,'Arauca','81'),
(26,'Yopal','85'),
(27,'Mocoa','86'),
(28,'San Andres','88'),
(29,'Leticia','91'),
(30,'Inirida','94'),
(31,'San Jose Del Gu','95'),
(32,'Mitu','97'),
(33,'Puerto Carre','99'),
(34,'Abejorral','05'),
(35,'Abrego','54'),
(36,'Abriaqui','05'),
(37,'Achi','13'),
(38,'Acandi','27'),
(39,'Acevedo','41'),
(40,'Acacias','50'),
(41,'Aguazul','85'),
(42,'Aguachica','20'),
(43,'Aguadas','17'),
(44,'Agustin Codazzi','20'),
(45,'Agrado','41'),
(46,'Aguada','68'),
(47,'Chameza','85'),
(48,'Calamar','95'),
(49,'Aipe','41'),
(50,'Alban','25'),
(51,'Alban','52'),
(52,'Algeciras','41'),
(53,'Albania','68'),
(54,'Alcala','76'),
(55,'Alejandria','05'),
(56,'Almeida','15'),
(57,'Almaguer','19'),
(58,'Aldana','52'),
(59,'Alpujarra','73'),
(60,'Alto Baudo','27'),
(61,'El Retorno','95'),
(62,'Altamira','41'),
(63,'Alvarado','73'),
(64,'Albania','18'),
(65,'Amaga','05'),
(66,'Altos Del Rosar','13'),
(67,'Algarrobo','47'),
(68,'Ambalema','73'),
(69,'Amalfi','05'),
(70,'Astrea','20'),
(71,'Andes','05'),
(72,'Anapoima','25'),
(73,'Albania','44'),
(74,'Angelopolis','05'),
(75,'Ancuya','52'),
(76,'Andalucia','76'),
(77,'Angostura','05'),
(78,'Anoria','05'),
(79,'Anolaima','25'),
(80,'Ansermanuevo','76'),
(81,'Santa Fe De Ant','05'),
(82,'Arenal','13'),
(83,'Anserma','17'),
(84,'Anzoategui','73'),
(85,'Anza','05'),
(86,'Apartado','05'),
(87,'Becerril','20'),
(88,'Apia','66'),
(89,'Aquitania','15'),
(90,'Aranzazu','17'),
(91,'Argelia','19'),
(92,'Atrato','27'),
(93,'Arboletes','05'),
(94,'Arcabuco','15'),
(95,'Arboleda','52'),
(96,'Arboledas','54'),
(97,'Aratoca','68'),
(98,'Arjona','13'),
(99,'Arbelaez','25'),
(100,'Aracataca','47'),
(101,'Argelia','76'),
(102,'Argelia','05'),
(103,'Armero','73'),
(104,'Ariguani','47'),
(105,'Armenia','05'),
(106,'Bosconia','20'),
(107,'Arroyohondo','13'),
(108,'Arauquita','81'),
(109,'Ataco','73'),
(110,'Ayapel','23'),
(111,'Bagado','27'),
(112,'Barranco De Lob','13'),
(113,'Balboa','19'),
(114,'Bahia Solano','27'),
(115,'Balboa','66'),
(116,'Bajo Baudo','27'),
(117,'Barbosa','68'),
(118,'Baranoa','08'),
(119,'Baraya','41'),
(120,'Barrancas','44'),
(121,'Barbosa','05'),
(122,'Buenavista','23'),
(123,'Barbacoas','52'),
(124,'Barichara','68'),
(125,'Barrancabermeja','68'),
(126,'Belen','52'),
(127,'Belmira','05'),
(128,'Beltran','25'),
(129,'Belen De Bajira','27'),
(130,'Belen','15'),
(131,'Vello','05'),
(132,'Belalcazar','17'),
(133,'Belen De Umbria','66'),
(134,'Berbeo','15'),
(135,'Canalete','23'),
(136,'Dibulla','44'),
(137,'Betania','05'),
(138,'Beteitiva','15'),
(139,'Betulia','68'),
(140,'Betulia','05'),
(141,'Belen De Los An','18'),
(142,'Bituima','25'),
(143,'Boavita','15'),
(144,'Distraccion','44'),
(145,'Bojaca','25'),
(146,'Bojaya','27'),
(147,'Bochalema','54'),
(148,'Bolivar','19'),
(149,'Bolivar','76'),
(150,'Ciudad Bolivar','05'),
(151,'Bolivar','68'),
(152,'Boyaca','15'),
(153,'Brice','15'),
(154,'Brice','05'),
(155,'Buenavista','15'),
(156,'Bucarasica','54'),
(157,'Buenaventura','76'),
(158,'Buenos Aires','19'),
(159,'El Molino','44'),
(160,'Barranca De Upi','50'),
(161,'Buesaco','52'),
(162,'Buenavista','70'),
(163,'Buenavista','63'),
(164,'Guadalajara De ','76'),
(165,'Buritica','05'),
(166,'Bugalagrande','76'),
(167,'Busbanza','15'),
(168,'Caceres','05'),
(169,'Cabrera','25'),
(170,'Cabrera','68'),
(171,'Caicedonia','76'),
(172,'Cachipay','25'),
(173,'Cabuyaro','50'),
(174,'Caimito','70'),
(175,'Cajamarca','73'),
(176,'Caicedo','05'),
(177,'Cacota','54'),
(178,'Hato Corozal','85'),
(179,'Cajica','25'),
(180,'Calima','76'),
(181,'Cachira','54'),
(182,'Caldas','05'),
(183,'Cajibio','19'),
(184,'Calarca','63'),
(185,'Candelaria','76'),
(186,'Caldas','15'),
(187,'Campoalegre','41'),
(188,'California','68'),
(189,'Campamento','05'),
(190,'Campohermoso','15'),
(191,'El Canton Del S','27'),
(192,'La Salina','85'),
(193,'Campo De La Cru','08'),
(194,'Caldono','19'),
(195,'Ca','05'),
(196,'Mani','85'),
(197,'Calamar','13'),
(198,'Candelaria','08'),
(199,'Caracoli','05'),
(200,'Caloto','19'),
(201,'Caramanta','05'),
(202,'Carepa','05'),
(203,'Capitanejo','68'),
(204,'Cartago','76'),
(205,'El Carmen De Vi','05'),
(206,'Caparrapi','25'),
(207,'Carmen De Apica','73'),
(208,'Carolina','05'),
(209,'Cartagena Del C','18'),
(210,'Carmen Del Dari','27'),
(211,'Castilla La Nue','50'),
(212,'Caqueza','25'),
(213,'Carcasi','68'),
(214,'Casabianca','73'),
(215,'Caucasia','05'),
(216,'Carmen De Carup','25'),
(217,'Cantagallo','13'),
(218,'Certegui','27'),
(219,'Cepita','68'),
(220,'Cerro San Anton','47'),
(221,'Caruru','97'),
(222,'Cerinza','15'),
(223,'Cerete','23'),
(224,'Cerrito','68'),
(225,'Monterrey','85'),
(226,'Charala','68'),
(227,'Chima','23'),
(228,'Chaguani','25'),
(229,'Chaparral','73'),
(230,'Charta','68'),
(231,'Chibolo','47'),
(232,'Dosquebradas','66'),
(233,'Chigorodo','05'),
(234,'Chinavita','15'),
(235,'Chinacota','54'),
(236,'Chinchina','17'),
(237,'Chitaga','54'),
(238,'Chimichagua','20'),
(239,'Chia','25'),
(240,'Chiquinquira','15'),
(241,'Chima','68'),
(242,'Chiriguana','20'),
(243,'Chipaque','25'),
(244,'Chipata','68'),
(245,'Chiscas','15'),
(246,'Choachi','25'),
(247,'Chinu','23'),
(248,'Chita','15'),
(249,'Choconta','25'),
(250,'Chitaraque','15'),
(251,'Chivata','15'),
(252,'Cicuco','13'),
(253,'Cienega','15'),
(254,'Cienaga De Oro','23'),
(255,'Cienaga','47'),
(256,'Cisneros','05'),
(257,'Circasia','63'),
(258,'Cimitarra','68'),
(259,'Cocorna','05'),
(260,'Cogua','25'),
(261,'Coello','73'),
(262,'Miraflores','95'),
(263,'Colon','52'),
(264,'Combita','15'),
(265,'Coloso','70'),
(266,'Curillo','18'),
(267,'Condoto','27'),
(268,'Concordia','47'),
(269,'Concepcion','05'),
(270,'Colombia','41'),
(271,'Convencion','54'),
(272,'Consaca','52'),
(273,'Concepcion','68'),
(274,'Concordia','05'),
(275,'Confines','68'),
(276,'Contadero','52'),
(277,'Contratacion','68'),
(278,'Copacabana','05'),
(279,'Cordoba','13'),
(280,'Coper','15'),
(281,'Corinto','19'),
(282,'Cordoba','63'),
(283,'Cota','25'),
(284,'Corrales','15'),
(285,'Maripi','44'),
(286,'Cordoba','52'),
(287,'Corozal','70'),
(288,'Coromoro','68'),
(289,'Coyaima','73'),
(290,'Covarachia','15'),
(291,'Colon','86'),
(292,'Cravo Norte','81'),
(293,'Cove','70'),
(294,'Clemencia','13'),
(295,'Cubara','15'),
(296,'Cubarral','50'),
(297,'Cucutilla','54'),
(298,'Cucaita','15'),
(299,'Cuaspud','52'),
(300,'Nunchia','85'),
(301,'Cuitiva','15'),
(302,'Cumaral','50'),
(303,'Cunday','73'),
(304,'Cumbal','52'),
(305,'Curumani','20'),
(306,'Curiti','68'),
(307,'Chalan','70'),
(308,'Orocue','85'),
(309,'Chiquiza','15'),
(310,'Cumbitara','52'),
(311,'El Roble','70'),
(312,'Dagua','76'),
(313,'Dabeiba','05'),
(314,'El Carmen De Ch','68'),
(315,'Galeras','70'),
(316,'Chivor','15'),
(317,'Dolores','73'),
(318,'Don Matias','05'),
(319,'Duitama','15'),
(320,'El Copey','20'),
(321,'Durania','54'),
(322,'Ebejico','05'),
(323,'Chachag','52'),
(324,'El ','76'),
(325,'El Carmen De Bo','13'),
(326,'El Cocuy','15'),
(327,'Elias','41'),
(328,'El Colegio','25'),
(329,'El Carmen De At','27'),
(330,'El Banco','47'),
(331,'El Calvario','50'),
(332,'El Carmen','54'),
(333,'El Guacamayo','68'),
(334,'El Cairo','76'),
(335,'El Doncello','18'),
(336,'El Guamo','13'),
(337,'El Espino','15'),
(338,'El Cerrito','76'),
(339,'El Bagre','05'),
(340,'El Paso','20'),
(341,'El Litoral Del ','27'),
(342,'El Charco','52'),
(343,'El Tarra','54'),
(344,'El Pe','68'),
(345,'El Dovio','76'),
(346,'Paz De Ariporo','85'),
(347,'El Castillo','50'),
(348,'El Pe','52'),
(349,'El Playon','68'),
(350,'El Paujil','18'),
(351,'El Tambo','19'),
(352,'El Rosario','52'),
(353,'El Pe','25'),
(354,'El Pi','47'),
(355,'El Tablon De Go','52'),
(356,'El Rosal','25'),
(357,'El Tambo','52'),
(358,'El Zulia','54'),
(359,'Pore','85'),
(360,'El Encanto','91'),
(361,'Entrerrios','05'),
(362,'Encino','68'),
(363,'Guaranda','70'),
(364,'Envigado','05'),
(365,'Enciso','68'),
(366,'El Pe','13'),
(367,'El Reten','47'),
(368,'Espinal','73'),
(369,'Facatativa','25'),
(370,'El Dorado','50'),
(371,'Falan','73'),
(372,'Florian','68'),
(373,'Firavitoba','15'),
(374,'Filadelfia','17'),
(375,'Filandia','63'),
(376,'Flandes','73'),
(377,'Florida','76'),
(378,'Floresta','15'),
(379,'Floridablanca','68'),
(380,'Fomeque','25'),
(381,'Fonseca','44'),
(382,'Recetor','85'),
(383,'Fosca','25'),
(384,'Fredonia','05'),
(385,'Fresno','73'),
(386,'Frontino','05'),
(387,'Funza','25'),
(388,'Fuente De Oro','50'),
(389,'Funes','52'),
(390,'Fuquene','25'),
(391,'Fundacion','47'),
(392,'Florencia','19'),
(393,'Fusagasuga','25'),
(394,'Gachantiva','15'),
(395,'Gachala','25'),
(396,'Gamarra','20'),
(397,'Gachancipa','25'),
(398,'Galapa','08'),
(399,'Gameza','15'),
(400,'Galan','68'),
(401,'Gacheta','25'),
(402,'Garzon','41'),
(403,'Gambita','68'),
(404,'Garagoa','15'),
(405,'Gama','25'),
(406,'Hatillo De Loba','13'),
(407,'Cotorra','23'),
(408,'Fortul','81'),
(409,'Sabanalarga','85'),
(410,'Genova','63'),
(411,'Giraldo','05'),
(412,'Gigante','41'),
(413,'Ginebra','76'),
(414,'Girardot','25'),
(415,'Giron','68'),
(416,'Girardota','05'),
(417,'Gomez Plata','05'),
(418,'Gonzalez','20'),
(419,'Granada','25'),
(420,'Granada','05'),
(421,'Granada','50'),
(422,'Gramalote','54'),
(423,'Guadalupe','05'),
(424,'Sacama','85'),
(425,'Guacamayas','15'),
(426,'Guacheta','25'),
(427,'Guachucal','52'),
(428,'Guarne','05'),
(429,'Guapi','19'),
(430,'Guamal','47'),
(431,'Guamal','50'),
(432,'Guatica','66'),
(433,'Guaca','68'),
(434,'Guacari','76'),
(435,'Guadalupe','41'),
(436,'Guamo','73'),
(437,'Guaduas','25'),
(438,'Guaitarilla','52'),
(439,'Guadalupe','68'),
(440,'Orito','86'),
(441,'Guatape','05'),
(442,'Guateque','15'),
(443,'Guasca','25'),
(444,'Guapota','68'),
(445,'Gualmatan','52'),
(446,'Guataqui','25'),
(447,'Guavata','68'),
(448,'Guayata','15'),
(449,'Mapiripan','50'),
(450,'San Luis De Pal','85'),
(451,'Guatavita','25'),
(452,'G','68'),
(453,'Guayabal De Siq','25'),
(454,'Mesetas','50'),
(455,'G','15'),
(456,'Guayabetal','25'),
(457,'Gutierrez','25'),
(458,'Barranco Minas','94'),
(459,'Hacari','54'),
(460,'Hato','68'),
(461,'Heliconia','05'),
(462,'Herran','54'),
(463,'Herveo','73'),
(464,'Hobo','41'),
(465,'Honda','73'),
(466,'La Apartada','23'),
(467,'La Macarena','50'),
(468,'Iles','52'),
(469,'Icononzo','73'),
(470,'Hispania','05'),
(471,'Imues','52'),
(472,'Inza','19'),
(473,'Ipiales','52'),
(474,'Iquira','41'),
(475,'Isnos','41'),
(476,'Itagui','05'),
(477,'Ituango','05'),
(478,'Istmina','27'),
(479,'Iza','15'),
(480,'Jardin','05'),
(481,'Jambalo','19'),
(482,'Jamundi','76'),
(483,'Jenesano','15'),
(484,'Jerico','05'),
(485,'Jerico','15'),
(486,'Jerusalen','25'),
(487,'Jesus Maria','68'),
(488,'Uribe','50'),
(489,'Jordan','68'),
(490,'Juan De Acosta','08'),
(491,'Junin','25'),
(492,'Jurado','27'),
(493,'La Ceja','05'),
(494,'Labranzagrande','15'),
(495,'La Calera','25'),
(496,'Labateca','54'),
(497,'La Belleza','68'),
(498,'La Cumbre','76'),
(499,'La Argentina','41'),
(500,'Hatonuevo','44'),
(501,'La Cruz','52'),
(502,'La Estrella','05'),
(503,'La Capilla','15'),
(504,'La Dorada','17'),
(505,'La Florida','52'),
(506,'La Gloria','20'),
(507,'La Celia','66'),
(508,'La Llanada','52'),
(509,'La Esperanza','54'),
(510,'Landazuri','68'),
(511,'La Mesa','25'),
(512,'La Merced','17'),
(513,'La Pintada','05'),
(514,'La Tola','52'),
(515,'La Sierra','19'),
(516,'La Palma','25'),
(517,'La Plata','41'),
(518,'La Vega','19'),
(519,'La Paz','68'),
(520,'La Pe','25'),
(521,'La Playa','54'),
(522,'La Union','52'),
(523,'La Union','05'),
(524,'La Jagua De Ibi','20'),
(525,'Lejanias','50'),
(526,'La Virginia','66'),
(527,'La Union','70'),
(528,'La Union','76'),
(529,'Tamara','85'),
(530,'La Victoria','15'),
(531,'La Tebaida','63'),
(532,'La Vega','25'),
(533,'La Uvita','15'),
(534,'La Victoria','76'),
(535,'Leiva','52'),
(536,'Los Patios','54'),
(537,'La Chorrera','91'),
(538,'Lebrija','68'),
(539,'Villa De Leyva','15'),
(540,'Lenguazaque','25'),
(541,'La Pedrera','91'),
(542,'Lerida','73'),
(543,'La Monta','18'),
(544,'Tauramena','85'),
(545,'Liborina','05'),
(546,'Linares','52'),
(547,'Libano','73'),
(548,'Lloro','27'),
(549,'Lorica','23'),
(550,'Lopez','19'),
(551,'Los Andes','52'),
(552,'Lourdes','54'),
(553,'Los Santos','68'),
(554,'Los Palmitos','70'),
(555,'Los Cordobas','23'),
(556,'La Jagua Del Pi','44'),
(557,'Luruaco','08'),
(558,'Maceo','05'),
(559,'Macanal','15'),
(560,'Medio Atrato','27'),
(561,'Macaravita','68'),
(562,'Macheta','25'),
(563,'Mag','52'),
(564,'Majagual','70'),
(565,'Magangue','13'),
(566,'Madrid','25'),
(567,'Medio Baudo','27'),
(568,'Maicao','44'),
(569,'Trinidad','85'),
(570,'La Victoria','91'),
(571,'Malaga','68'),
(572,'Malambo','08'),
(573,'Mahates','13'),
(574,'Manzanares','17'),
(575,'Mallama','52'),
(576,'Manati','08'),
(577,'Manta','25'),
(578,'Medina','25'),
(579,'Marinilla','05'),
(580,'Margarita','13'),
(581,'Marsella','66'),
(582,'Villanueva','85'),
(583,'Maria La Baja','13'),
(584,'Marmato','17'),
(585,'Manaure','20'),
(586,'Mariquita','73'),
(587,'Marquetalia','17'),
(588,'Matanza','68'),
(589,'Marulanda','17'),
(590,'Melgar','73'),
(591,'Mercaderes','19'),
(592,'Medio San Juan','27'),
(593,'Puerto Concordi','50'),
(594,'Miraflores','15'),
(595,'Miranda','19'),
(596,'Mistrato','66'),
(597,'Montecristo','13'),
(598,'Milan','18'),
(599,'Nueva Granada','47'),
(600,'Miriti-parana','91'),
(601,'Murillo','73'),
(602,'Mongua','15'),
(603,'Momil','23'),
(604,'Mogotes','68'),
(605,'Mongui','15'),
(606,'Montelibano','23'),
(607,'Montebello','05'),
(608,'Mompos','13'),
(609,'Molagavita','68'),
(610,'Moniquira','15'),
(611,'Montenegro','63'),
(612,'Morales','13'),
(613,'Morales','19'),
(614,'Mosquera','25'),
(615,'Mosquera','52'),
(616,'Morroa','70'),
(617,'Murindo','05'),
(618,'Motavita','15'),
(619,'Morelia','18'),
(620,'Mutata','05'),
(621,'Muzo','15'),
(622,'Nari','52'),
(623,'Mutiscua','54'),
(624,'Nari','05'),
(625,'Nari','25'),
(626,'Nataga','41'),
(627,'Natagaima','73'),
(628,'Neira','17'),
(629,'Nemocon','25'),
(630,'Nilo','25'),
(631,'Nimaima','25'),
(632,'Necocli','05'),
(633,'Olaya Herrera','52'),
(634,'Nobsa','15'),
(635,'Nocaima','25'),
(636,'Novita','27'),
(637,'Nuevo Colon','15'),
(638,'Nechi','05'),
(639,'Norcasia','17'),
(640,'Nuqui','27'),
(641,'Obando','76'),
(642,'Oca','54'),
(643,'Ocamonte','68'),
(644,'Oicata','15'),
(645,'Mo','23'),
(646,'Oiba','68'),
(647,'Olaya','05'),
(648,'Onzaga','68'),
(649,'Oporapa','41'),
(650,'Ortega','73'),
(651,'Venecia','25'),
(652,'Ospina','52'),
(653,'Otanche','15'),
(654,'Ovejas','70'),
(655,'Pachavita','15'),
(656,'Pacoa','97'),
(657,'Pacora','17'),
(658,'Padilla','19'),
(659,'Pacho','25'),
(660,'Paez','15'),
(661,'Paipa','15'),
(662,'Paez','19'),
(663,'Pailitas','20'),
(664,'Pajarito','15'),
(665,'Paime','25'),
(666,'Paicol','41'),
(667,'Pamplona','54'),
(668,'Palmar De Varel','08'),
(669,'Francisco Pizar','52'),
(670,'Pamplonita','54'),
(671,'Palocabildo','73'),
(672,'Palmira','76'),
(673,'Panqueba','15'),
(674,'Palmar','68'),
(675,'Palmito','70'),
(676,'Palestina','17'),
(677,'Cucunuba','22'),
(678,'Pandi','25'),
(679,'Palermo','41'),
(680,'Palmas Del Soco','68'),
(681,'La Primavera','99'),
(682,'Paratebueno','25'),
(683,'Palestina','41'),
(684,'Puerto Alegria','91'),
(685,'Pauna','15'),
(686,'Patia','19'),
(687,'Paya','15'),
(688,'Piamonte','19'),
(689,'Paramo','68'),
(690,'Pasca','25'),
(691,'Puerto Arica','91'),
(692,'Paz De Rio','15'),
(693,'Policarpa','52'),
(694,'Puerto Nari','91'),
(695,'Pe','05'),
(696,'Pensilvania','17'),
(697,'Pedraza','47'),
(698,'Pesca','15'),
(699,'Peque','05'),
(700,'Piji','47'),
(701,'Piedecuesta','68'),
(702,'Piedras','73'),
(703,'Pital','41'),
(704,'Pijao','63'),
(705,'Piojo','08'),
(706,'Pinillos','13'),
(707,'Pinchote','68'),
(708,'Pisba','15'),
(709,'Pelaya','20'),
(710,'Pitalito','41'),
(711,'Pivijay','47'),
(712,'Puerto Santande','54'),
(713,'Planeta Rica','23'),
(714,'Plato','47'),
(715,'Planadas','73'),
(716,'Polonuevo','08'),
(717,'Ponedera','08'),
(718,'Manaure','44'),
(719,'Potosi','52'),
(720,'Prado','73'),
(721,'Pradera','76'),
(722,'Providencia','88'),
(723,'Providencia','52'),
(724,'Puerto Gaitan','50'),
(725,'Puerto Asis','86'),
(726,'Puerto Caicedo','86'),
(727,'Pueblo Bello','20'),
(728,'Pueblo Nuevo','23'),
(729,'Puebloviejo','47'),
(730,'Puerto Guzman','86'),
(731,'Puerto Boyaca','15'),
(732,'Puerto Salgar','25'),
(733,'Pueblo Rico','66'),
(734,'Puente Nacional','68'),
(735,'Puerto Colombia','08'),
(736,'Puerto Tejada','19'),
(737,'Puerto Lopez','50'),
(738,'Puerres','52'),
(739,'Puerto Parra','68'),
(740,'Leguizamo','86'),
(741,'Puerto Escondid','23'),
(742,'Puerto Wilches','68'),
(743,'Pueblorrico','05'),
(744,'Puerto Lleras','50'),
(745,'Puerto Berrio','05'),
(746,'Regidor','13'),
(747,'Quipama','15'),
(748,'Puerto Libertad','23'),
(749,'Puli','25'),
(750,'Rio Iro','27'),
(751,'Puerto Nare','05'),
(752,'Purace','19'),
(753,'Pupiales','52'),
(754,'Purificacion','73'),
(755,'Purisima','23'),
(756,'Puerto Rico','50'),
(757,'Puerto Triunfo','05'),
(758,'Puerto Rondon','81'),
(759,'Puerto Rico','18'),
(760,'Quebradanegra','25'),
(761,'Quetame','25'),
(762,'Quimbaya','63'),
(763,'Quinchia','66'),
(764,'Quipile','25'),
(765,'Ramiriqui','15'),
(766,'Apulo','25'),
(767,'Ragonvalia','54'),
(768,'Rio Viejo','13'),
(769,'Raquira','15'),
(770,'Rio Quito','27'),
(771,'Remedios','05'),
(772,'Remolino','47'),
(773,'Repelon','08'),
(774,'Restrepo','50'),
(775,'Restrepo','76'),
(776,'Retiro','05'),
(777,'San Jose Del Fr','18'),
(778,'Ricaurte','25'),
(779,'Ricaurte','52'),
(780,'Riosucio','17'),
(781,'Rio De Oro','20'),
(782,'Rionegro','05'),
(783,'Riosucio','27'),
(784,'Rivera','41'),
(785,'Rionegro','68'),
(786,'Risaralda','17'),
(787,'Rioblanco','73'),
(788,'Riofrio','76'),
(789,'San Cristobal','13'),
(790,'Rondon','15'),
(791,'La Paz','20'),
(792,'Roberto Payan','52'),
(793,'Rosas','19'),
(794,'Roncesvalles','73'),
(795,'Roldanillo','76'),
(796,'Rovira','73'),
(797,'Santa Rosalia','99'),
(798,'Sabanalarga','05'),
(799,'Sabaneta','05'),
(800,'Saboya','15'),
(801,'Sabanagrande','08'),
(802,'Sabanalarga','08'),
(803,'Sachica','15'),
(804,'Salgar','05'),
(805,'San Antonio Del','25'),
(806,'Samaca','15'),
(807,'San Andres','05'),
(808,'San Estanislao','13'),
(809,'San Carlos','05'),
(810,'San Bernardo','25'),
(811,'San Fernando','13'),
(812,'San Juan Del Ce','44'),
(813,'San Francisco','05'),
(814,'Salamina','17'),
(815,'San Cayetano','25'),
(816,'San Jacinto','13'),
(817,'San Jacinto Del','13'),
(818,'Sabana De Torre','68'),
(819,'San Jeronimo','05'),
(820,'San Juan Nepomu','13'),
(821,'San Jose De La ','05'),
(822,'San Francisco','25'),
(823,'San Juan De Ura','05'),
(824,'San Luis','05'),
(825,'San Eduardo','15'),
(826,'Sahagun','23'),
(827,'San Jose Del Pa','27'),
(828,'Saladoblanco','41'),
(829,'Sabanas De San ','47'),
(830,'Salazar','54'),
(831,'Samana','17'),
(832,'San Juan De Rio','25'),
(833,'Mapiripana','94'),
(834,'San Pedro','05'),
(835,'San Jose De Par','15'),
(836,'San Pedro De Ur','05'),
(837,'San Jose','17'),
(838,'Taraira','97'),
(839,'San Rafael','05'),
(840,'San Martin De L','13'),
(841,'San Luis De Gac','15'),
(842,'San Agustin','41'),
(843,'San Andres','68'),
(844,'Puerto Santande','91'),
(845,'San Roque','05'),
(846,'San Pablo','13'),
(847,'San Andres Sota','23'),
(848,'San Calixto','54'),
(849,'Sampues','70'),
(850,'San Pedro','76'),
(851,'Salda','73'),
(852,'San Antero','23'),
(853,'Santa Catalina','13'),
(854,'San Mateo','15'),
(855,'San Cayetano','54'),
(856,'San Benito','68'),
(857,'San Vicente','05'),
(858,'Santa Lucia','08'),
(859,'San Bernardo De','23'),
(860,'Salamina','47'),
(861,'San Antonio','73'),
(862,'San Miguel De S','15'),
(863,'Santa Maria','41'),
(864,'San Carlos','23'),
(865,'Samaniego','52'),
(866,'San Benito Abad','70'),
(867,'San Luis','73'),
(868,'Santa Barbara','05'),
(869,'San Gil','68'),
(870,'San Carlos De G','50'),
(871,'Santiago','54'),
(872,'San Pablo De Bo','15'),
(873,'Santa Rosa De C','66'),
(874,'San Joaquin','68'),
(875,'Santa Rosa','13'),
(876,'San Juan De Ara','50'),
(877,'Sandona','52'),
(878,'San Jose De Mir','68'),
(879,'Santo Tomas','08'),
(880,'San Bernardo','52'),
(881,'Santa Rosa De O','05'),
(882,'Santana','15'),
(883,'San Pelayo','23'),
(884,'San Juanito','50'),
(885,'San Miguel','68'),
(886,'Santa Isabel','73'),
(887,'San Lorenzo','52'),
(888,'Santuario','66'),
(889,'Santa Rosa Del ','13'),
(890,'San Martin','50'),
(891,'San Vicente De ','68'),
(892,'Santo Domingo','05'),
(893,'Santa Maria','15'),
(894,'Salento','63'),
(895,'San Sebastian D','47'),
(896,'Santa Rosa De V','15'),
(897,'San Sebastian','19'),
(898,'San Pablo','52'),
(899,'San Pedro De Ca','52'),
(900,'Santa Sofia','15'),
(901,'Santa Barbara','52'),
(902,'El Santuario','05'),
(903,'Santander De Qu','19'),
(904,'Santacruz','52'),
(905,'Santa Rosa','19'),
(906,'San Juan De Bet','70'),
(907,'San Zenon','47'),
(908,'Santa Barbara','68'),
(909,'Santa Ana','47'),
(910,'San Marcos','70'),
(911,'San Alberto','20'),
(912,'Vistahermosa','50'),
(913,'San Onofre','70'),
(914,'San Pedro','70'),
(915,'Sasaima','25'),
(916,'Sativanorte','15'),
(917,'Santa Barbara D','47'),
(918,'Sapuyes','52'),
(919,'Sardinata','54'),
(920,'Santa Helena De','68'),
(921,'Sativasur','15'),
(922,'Segovia','05'),
(923,'Sesquile','25'),
(924,'Sevilla','76'),
(925,'Saravena','81'),
(926,'Siachoque','15'),
(927,'Sibate','25'),
(928,'Since','70'),
(929,'Silvia','19'),
(930,'Silvania','25'),
(931,'Silos','54'),
(932,'Simiti','13'),
(933,'Simijaca','25'),
(934,'Sipi','27'),
(935,'Sitionuevo','47'),
(936,'Simacota','68'),
(937,'Sibundoy','86'),
(938,'San Diego','20'),
(939,'Soata','15'),
(940,'San Vicente Del','18'),
(941,'Soacha','25'),
(942,'Socota','15'),
(943,'Socorro','68'),
(944,'San Francisco','86'),
(945,'Sonson','05'),
(946,'Solano','18'),
(947,'Socha','15'),
(948,'San Miguel','86'),
(949,'Soledad','08'),
(950,'Sopo','25'),
(951,'Sogamoso','15'),
(952,'Soplaviento','13'),
(953,'Sotara','19'),
(954,'Santiago','86'),
(955,'Sopetran','05'),
(956,'Somondoco','15'),
(957,'Sora','15'),
(958,'Sotaquira','15'),
(959,'Soraca','15'),
(960,'Subachoque','25'),
(961,'Suan','08'),
(962,'San Martin','20'),
(963,'Suaza','41'),
(964,'Suaita','68'),
(965,'Suarez','73'),
(966,'Sucre','70'),
(967,'Suesca','25'),
(968,'Sucre','68'),
(969,'Cumaribo','99'),
(970,'Susacon','15'),
(971,'Sutamarchan','15'),
(972,'Supia','17'),
(973,'Supata','25'),
(974,'Papunaua','97'),
(975,'Sutatenza','15'),
(976,'Susa','25'),
(977,'Talaigua Nuevo','13'),
(978,'Suarez','19'),
(979,'Surata','68'),
(980,'Sutatausa','25'),
(981,'Solita','18'),
(982,'Sucre','19'),
(983,'Tabio','25'),
(984,'Taminango','52'),
(985,'Tamalameque','20'),
(986,'Tado','27'),
(987,'Tangua','52'),
(988,'Tamesis','05'),
(989,'Taraza','05'),
(990,'Tasco','15'),
(991,'Tarqui','41'),
(992,'Tarso','05'),
(993,'Tausa','25'),
(994,'Tame','81'),
(995,'Tena','25'),
(996,'Tesalia','41'),
(997,'Tenza','15'),
(998,'Tenerife','47'),
(999,'Tarapaca','91'),
(1000,'Tenjo','25'),
(1001,'Tello','41'),
(1002,'Unguia','27'),
(1003,'Teorama','54'),
(1004,'Teruel','41'),
(1005,'Tibana','15'),
(1006,'Tibacuy','25'),
(1007,'Tibasosa','15'),
(1008,'Timbio','19'),
(1009,'Tierralta','23'),
(1010,'Tibirita','25'),
(1011,'Timana','41'),
(1012,'Tinjaca','15'),
(1013,'Titiribi','05'),
(1014,'Timbiqui','19'),
(1015,'Tiquisio','13'),
(1016,'Tipacoque','15'),
(1017,'Union Panameric','27'),
(1018,'Tibu','54'),
(1019,'Toca','15'),
(1020,'Tocaima','25'),
(1021,'Tog','15'),
(1022,'Tocancipa','25'),
(1023,'Toledo','05'),
(1024,'Piendamo','54'),
(1025,'Topaga','15'),
(1026,'Toledo','54'),
(1027,'Tona','68'),
(1028,'Santiago De Tol','70'),
(1029,'Toribio','19'),
(1030,'Tota','15'),
(1031,'Topaipi','25'),
(1032,'Tolu Viejo','70'),
(1033,'Toro','76'),
(1034,'Totoro','19'),
(1035,'Trujillo','76'),
(1036,'Tubara','08'),
(1037,'Tunungua','15'),
(1038,'Tulua','76'),
(1039,'Turmeque','15'),
(1040,'Tumaco','52'),
(1041,'Turbaco','13'),
(1042,'Turbo','05'),
(1043,'Tuta','15'),
(1044,'Turbana','13'),
(1045,'Tuquerres','52'),
(1046,'Tutaza','15'),
(1047,'Ubala','25'),
(1048,'Ubaque','25'),
(1049,'Uramita','05'),
(1050,'Umbita','15'),
(1051,'Villa De San Di','25'),
(1052,'Villa Rica','19'),
(1053,'Une','25'),
(1054,'Ulloa','76'),
(1055,'Urrao','05'),
(1056,'Uribia','44'),
(1057,'Usiacuri','08'),
(1058,'','25'),
(1059,'Valdivia','05'),
(1060,'Valle De San Ju','73'),
(1061,'Valencia','23'),
(1062,'Urumita','44'),
(1063,'Valle De San Jo','68'),
(1064,'Valparaiso','05'),
(1065,'Vegachi','05'),
(1066,'Valparaiso','18'),
(1067,'Venecia','05'),
(1068,'Ventaquemada','15'),
(1069,'Velez','68'),
(1070,'Venadillo','73'),
(1071,'Vergara','25'),
(1072,'Versalles','76'),
(1073,'Valle Del Guamu','86'),
(1074,'Victoria','17'),
(1075,'Viani','25'),
(1076,'Vetas','68'),
(1077,'Vijes','76'),
(1078,'Villahermosa','73'),
(1079,'Villagomez','25'),
(1080,'Villa Caro','54'),
(1081,'Villavieja','41'),
(1082,'Villanueva','68'),
(1083,'Vigia Del Fuert','05'),
(1084,'Villanueva','13'),
(1085,'Villamaria','17'),
(1086,'Villapinzon','25'),
(1087,'Villarrica','73'),
(1088,'Villanueva','44'),
(1089,'Villa Del Rosar','54'),
(1090,'Villeta','25'),
(1091,'Viterbo','17'),
(1092,'Viota','25'),
(1093,'Viracacha','15'),
(1094,'San Felipe','94'),
(1095,'Puerto Colombia','94'),
(1096,'Yali','05'),
(1097,'Yacopi','25'),
(1098,'Yaguara','41'),
(1099,'Yacuanquer','52'),
(1100,'Villagarzon','86'),
(1101,'La Guadalupe','94'),
(1102,'Cacahual','94'),
(1103,'Yarumal','05'),
(1104,'Pana Pana','94'),
(1105,'Morichal Nuevo','94'),
(1106,'Yavarate','97'),
(1107,'Yolombo','05'),
(1108,'Yotoco','76'),
(1109,'Yumbo','76'),
(1110,'Yondo','05'),
(1111,'Zambrano','13'),
(1112,'Zaragoza','05'),
(1113,'Zapatoca','68'),
(1114,'Zarzal','76'),
(1115,'Zetaquira','15'),
(1116,'Zipacon','25'),
(1117,'Zipaquira','25'),
(1118,'Zapayan','47'),
(1119,'Zona Bananera','47');


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
  `eje_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text,
  `icono` varchar(255) DEFAULT NULL,
  `instruccion_corta` varchar(255) DEFAULT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  `marcador_ra` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `es_oficial` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `temas_modulo_id_foreign` (`modulo_id`),
  KEY `temas_eje_id_foreign` (`eje_id`),
  CONSTRAINT `temas_modulo_id_foreign` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `temas_eje_id_foreign` FOREIGN KEY (`eje_id`) REFERENCES `ejes` (`id`) ON DELETE SET NULL
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


DROP TABLE IF EXISTS `areas`;

CREATE TABLE `areas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `areas_nombre_unique` (`nombre`)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

INSERT INTO `areas` (`nombre`, `estado`, `created_at`, `updated_at`) VALUES
('Lenguaje', TRUE, NOW(), NOW()),
('Matemáticas', TRUE, NOW(), NOW()),
('Ciencias Naturales', TRUE, NOW(), NOW()),
('Ciencias Sociales', TRUE, NOW(), NOW()),
('Artística', TRUE, NOW(), NOW()),
('Corporal', TRUE, NOW(), NOW());

DROP TABLE IF EXISTS `catalogo_dba`;

CREATE TABLE `catalogo_dba` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(50) NOT NULL,
    `area_id` BIGINT UNSIGNED NOT NULL,
    `grado_id` BIGINT UNSIGNED NOT NULL,
    `descripcion` TEXT NULL,
    `es_men` BOOLEAN NOT NULL DEFAULT TRUE,
    `estado` BOOLEAN NOT NULL DEFAULT TRUE,
    `institucion_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `creado_por` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `catalogo_dba_institucion_codigo_unique` (`institucion_id`, `codigo`),
    KEY `catalogo_dba_area_id_foreign` (`area_id`),
    KEY `catalogo_dba_grado_id_foreign` (`grado_id`),
    KEY `catalogo_dba_institucion_id_foreign` (`institucion_id`),
    KEY `catalogo_dba_creado_por_foreign` (`creado_por`),

    CONSTRAINT `catalogo_dba_area_id_foreign`
        FOREIGN KEY (`area_id`)
        REFERENCES `areas` (`id`)
        ON DELETE RESTRICT,

    CONSTRAINT `catalogo_dba_grado_id_foreign`
        FOREIGN KEY (`grado_id`)
        REFERENCES `grados` (`id`)
        ON DELETE RESTRICT,

    CONSTRAINT `catalogo_dba_institucion_id_foreign`
        FOREIGN KEY (`institucion_id`)
        REFERENCES `instituciones` (`id`)
        ON DELETE RESTRICT,

    CONSTRAINT `catalogo_dba_creado_por_foreign`
        FOREIGN KEY (`creado_por`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*Table structure for curriculum tematicas / experiencias */

DROP TABLE IF EXISTS `tematica_dba`;
DROP TABLE IF EXISTS `indicadores_logro`;
DROP TABLE IF EXISTS `experiencia_materiales`;
DROP TABLE IF EXISTS `experiencias`;
DROP TABLE IF EXISTS `versiones_tematica`;
DROP TABLE IF EXISTS `tematicas`;

CREATE TABLE `tematicas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `eje_id` BIGINT UNSIGNED NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `competencia` VARCHAR(100) NULL,
    `referente_alternativo` TEXT NULL,
    `requiere_ra` TINYINT(1) NOT NULL DEFAULT 0,
    `requiere_acompanamiento` TINYINT(1) NOT NULL DEFAULT 0,
    `es_oficial` TINYINT(1) NOT NULL DEFAULT 1,
    `institucion_id` BIGINT UNSIGNED NULL,
    `estado` ENUM('borrador', 'activa', 'archivada') NOT NULL DEFAULT 'borrador',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `creado_por` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `tematicas_eje_id_foreign` (`eje_id`),
    KEY `tematicas_institucion_id_foreign` (`institucion_id`),
    KEY `tematicas_creado_por_foreign` (`creado_por`),
    KEY `tematicas_eje_oficial_institucion_index` (`eje_id`, `es_oficial`, `institucion_id`),
    KEY `tematicas_estado_activo_index` (`estado`, `activo`),
    CONSTRAINT `tematicas_eje_id_foreign`
        FOREIGN KEY (`eje_id`)
        REFERENCES `ejes` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `tematicas_institucion_id_foreign`
        FOREIGN KEY (`institucion_id`)
        REFERENCES `instituciones` (`id`)
        ON DELETE SET NULL,
    CONSTRAINT `tematicas_creado_por_foreign`
        FOREIGN KEY (`creado_por`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*Data for the table `tematicas` */

CREATE TABLE `experiencias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tematica_id` BIGINT UNSIGNED NOT NULL,
    `grado_id` BIGINT UNSIGNED NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `objetivo` TEXT NOT NULL,
    `proposito` TEXT NULL,
    `habilidades` TEXT NULL,
    `duracion_minutos` TINYINT UNSIGNED NOT NULL DEFAULT 20,
    `referente_aprendizaje` TEXT NULL,
    `estado` ENUM('borrador', 'activa', 'archivada') NOT NULL DEFAULT 'borrador',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `creado_por` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `experiencias_tematica_id_foreign` (`tematica_id`),
    KEY `experiencias_grado_id_foreign` (`grado_id`),
    KEY `experiencias_creado_por_foreign` (`creado_por`),
    KEY `experiencias_tematica_estado_activo_index` (`tematica_id`, `estado`, `activo`),
    CONSTRAINT `experiencias_tematica_id_foreign`
        FOREIGN KEY (`tematica_id`)
        REFERENCES `tematicas` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `experiencias_grado_id_foreign`
        FOREIGN KEY (`grado_id`)
        REFERENCES `grados` (`id`)
        ON DELETE RESTRICT,
    CONSTRAINT `experiencias_creado_por_foreign`
        FOREIGN KEY (`creado_por`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*Data for the table `experiencias` */

CREATE TABLE `experiencia_materiales` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `experiencia_id` BIGINT UNSIGNED NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `cantidad` VARCHAR(60) NOT NULL,
    `es_obligatorio` TINYINT(1) NOT NULL DEFAULT 1,
    `orden` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `experiencia_materiales_experiencia_id_foreign` (`experiencia_id`),
    KEY `experiencia_materiales_experiencia_orden_index` (`experiencia_id`, `orden`),
    CONSTRAINT `experiencia_materiales_experiencia_id_foreign`
        FOREIGN KEY (`experiencia_id`)
        REFERENCES `experiencias` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*Data for the table `experiencia_materiales` */

CREATE TABLE `indicadores_logro` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tematica_id` BIGINT UNSIGNED NOT NULL,
    `descripcion` VARCHAR(300) NOT NULL,
    `orden` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `indicadores_logro_tematica_id_foreign` (`tematica_id`),
    KEY `indicadores_logro_tematica_orden_index` (`tematica_id`, `orden`),
    CONSTRAINT `indicadores_logro_tematica_id_foreign`
        FOREIGN KEY (`tematica_id`)
        REFERENCES `tematicas` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*Data for the table `indicadores_logro` */

CREATE TABLE `tematica_dba` (
    `tematica_id` BIGINT UNSIGNED NOT NULL,
    `catalogo_dba_id` BIGINT UNSIGNED NOT NULL,
    `relacion` ENUM('principal', 'complementario') NOT NULL DEFAULT 'principal',
    `observacion` TEXT NULL,
    PRIMARY KEY (`tematica_id`, `catalogo_dba_id`),
    KEY `tematica_dba_catalogo_dba_id_foreign` (`catalogo_dba_id`),
    CONSTRAINT `tematica_dba_tematica_id_foreign`
        FOREIGN KEY (`tematica_id`)
        REFERENCES `tematicas` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `tematica_dba_catalogo_dba_id_foreign`
        FOREIGN KEY (`catalogo_dba_id`)
        REFERENCES `catalogo_dba` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*Data for the table `tematica_dba` */

CREATE TABLE `versiones_tematica` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tematica_id` BIGINT UNSIGNED NOT NULL,
    `snapshot` JSON NOT NULL,
    `creado_por` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `versiones_tematica_tematica_id_foreign` (`tematica_id`),
    KEY `versiones_tematica_creado_por_foreign` (`creado_por`),
    KEY `versiones_tematica_tematica_id_created_at_index` (`tematica_id`, `created_at`),
    CONSTRAINT `versiones_tematica_tematica_id_foreign`
        FOREIGN KEY (`tematica_id`)
        REFERENCES `tematicas` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `versiones_tematica_creado_por_foreign`
        FOREIGN KEY (`creado_por`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `bloques_experiencia`;

/*Table structure for table `bloques_experiencia` */
CREATE TABLE `bloques_experiencia` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `experiencia_id` BIGINT UNSIGNED NOT NULL,
    `tipo` ENUM(
        'bienvenida',
        'audio',
        'video',
        'imagen',
        'historia',
        'ra',
        'evidencia',
        'juego',
        'dibujo',
        'pregunta',
        'emparejar',
        'clasificacion',
        'arrastrar',
        'reto',
        'emocion',
        'recompensa'
    ) NOT NULL,
    `orden` TINYINT UNSIGNED NOT NULL,
    `datos` JSON NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),

    UNIQUE KEY `bloques_experiencia_experiencia_orden_unique`
        (`experiencia_id`, `orden`),

    KEY `bloques_experiencia_experiencia_id_index`
        (`experiencia_id`),

    KEY `bloques_experiencia_tipo_index`
        (`tipo`),

    CONSTRAINT `bloques_experiencia_experiencia_id_foreign`
        FOREIGN KEY (`experiencia_id`)
        REFERENCES `experiencias` (`id`)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sesiones_experiencia`;

/*Table structure for table `sesiones_experiencia` */
CREATE TABLE `sesiones_experiencia` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `experiencia_id` BIGINT UNSIGNED NOT NULL,
    `estudiante_id` BIGINT UNSIGNED NOT NULL,
    `iniciada_en` TIMESTAMP NOT NULL,
    `finalizada_en` TIMESTAMP NULL DEFAULT NULL,
    `duracion_real_segundos` INT UNSIGNED NULL DEFAULT NULL,
    `completada` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),

    KEY `sesiones_experiencia_experiencia_estudiante_index`
        (`experiencia_id`, `estudiante_id`),

    KEY `sesiones_experiencia_estudiante_iniciada_index`
        (`estudiante_id`, `iniciada_en`),

    KEY `sesiones_experiencia_completada_index`
        (`completada`),

    CONSTRAINT `sesiones_experiencia_experiencia_id_foreign`
        FOREIGN KEY (`experiencia_id`)
        REFERENCES `experiencias` (`id`)
        ON DELETE RESTRICT,

    CONSTRAINT `sesiones_experiencia_estudiante_id_foreign`
        FOREIGN KEY (`estudiante_id`)
        REFERENCES `estudiantes` (`id`)
        ON DELETE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `resultados_bloque`;

/*Table structure for table `resultados_bloque` */
CREATE TABLE `resultados_bloque` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sesion_id` BIGINT UNSIGNED NOT NULL,
    `bloque_id` BIGINT UNSIGNED NOT NULL,
    `estudiante_id` BIGINT UNSIGNED NOT NULL,
    `correcto` BOOLEAN NOT NULL,
    `intentos` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `tiempo_segundos` SMALLINT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),

    KEY `resultados_bloque_bloque_estudiante_index`
        (`bloque_id`, `estudiante_id`),

    KEY `resultados_bloque_sesion_index`
        (`sesion_id`),

    KEY `resultados_bloque_correcto_index`
        (`correcto`),

    CONSTRAINT `resultados_bloque_sesion_id_foreign`
        FOREIGN KEY (`sesion_id`)
        REFERENCES `sesiones_experiencia` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `resultados_bloque_bloque_id_foreign`
        FOREIGN KEY (`bloque_id`)
        REFERENCES `bloques_experiencia` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `resultados_bloque_estudiante_id_foreign`
        FOREIGN KEY (`estudiante_id`)
        REFERENCES `estudiantes` (`id`)
        ON DELETE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `participaciones_bloque`;

/*Table structure for table `participaciones_bloque` */
CREATE TABLE `participaciones_bloque` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sesion_id` BIGINT UNSIGNED NOT NULL,
    `bloque_id` BIGINT UNSIGNED NOT NULL,
    `estudiante_id` BIGINT UNSIGNED NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `archivo_path` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `participaciones_bloque_bloque_estudiante_index`
        (`bloque_id`, `estudiante_id`),
    KEY `participaciones_bloque_sesion_index`
        (`sesion_id`),
    CONSTRAINT `participaciones_bloque_sesion_id_foreign`
        FOREIGN KEY (`sesion_id`)
        REFERENCES `sesiones_experiencia` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `participaciones_bloque_bloque_id_foreign`
        FOREIGN KEY (`bloque_id`)
        REFERENCES `bloques_experiencia` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `participaciones_bloque_estudiante_id_foreign`
        FOREIGN KEY (`estudiante_id`)
        REFERENCES `estudiantes` (`id`)
        ON DELETE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `emociones_sesion`;

/*Table structure for table `emociones_sesion` */
CREATE TABLE `emociones_sesion` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sesion_id` BIGINT UNSIGNED NOT NULL,
    `bloque_id` BIGINT UNSIGNED NOT NULL,
    `estudiante_id` BIGINT UNSIGNED NOT NULL,
    `emocion` VARCHAR(30) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `emociones_sesion_sesion_id_unique`
        (`sesion_id`),
    KEY `emociones_sesion_estudiante_created_index`
        (`estudiante_id`, `created_at`),
    CONSTRAINT `emociones_sesion_sesion_id_foreign`
        FOREIGN KEY (`sesion_id`)
        REFERENCES `sesiones_experiencia` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `emociones_sesion_bloque_id_foreign`
        FOREIGN KEY (`bloque_id`)
        REFERENCES `bloques_experiencia` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `emociones_sesion_estudiante_id_foreign`
        FOREIGN KEY (`estudiante_id`)
        REFERENCES `estudiantes` (`id`)
        ON DELETE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
