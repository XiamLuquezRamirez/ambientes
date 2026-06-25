/*
SQLyog Community v13.3.0 (64 bit)
MySQL - 10.4.32-MariaDB : Database - ambientes
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
USE `ambientes`;

/*Table structure for table `actividades` */

DROP TABLE IF EXISTS `actividades`;

CREATE TABLE `actividades` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tema_id` bigint(20) unsigned NOT NULL,
  `tipo` enum('audio','video_lsc','animacion','juego','simulacion') NOT NULL,
  `contenido_path` varchar(255) NOT NULL,
  `configuracion` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`configuracion`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `actividades_tema_id_foreign` (`tema_id`),
  CONSTRAINT `actividades_tema_id_foreign` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `actividades` */

/*Table structure for table `ajustes_temporales` */

DROP TABLE IF EXISTS `ajustes_temporales`;

CREATE TABLE `ajustes_temporales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint(20) unsigned NOT NULL,
  `grado_id` bigint(20) unsigned NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ambiente_id` (`ambiente_id`,`grado_id`),
  KEY `grado_id` (`grado_id`),
  CONSTRAINT `ambiente_grado_ibfk_1` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`),
  CONSTRAINT `ambiente_grado_ibfk_2` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(12,3,1,1);

/*Table structure for table `ambientes` */

DROP TABLE IF EXISTS `ambientes`;

CREATE TABLE `ambientes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `color_hex` varchar(9) NOT NULL,
  `icono` varchar(255) NOT NULL,
  `servidor_ip` varchar(15) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `cupo_defecto` smallint(5) unsigned NOT NULL DEFAULT 25,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ambientes_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `ambientes` */

insert  into `ambientes`(`id`,`nombre`,`slug`,`color_hex`,`icono`,`servidor_ip`,`activo`,`cupo_defecto`,`created_at`,`updated_at`) values 
(1,'Música','musica','#0F6E56','?','192.168.1.20',1,25,'2026-06-16 00:02:01','2026-06-17 18:34:22'),
(2,'Polimotor','polimotor','#534AB7','?','192.168.1.21',1,25,'2026-06-16 00:02:01','2026-06-16 00:02:01'),
(3,'Lógico','logico','#854F0B','?','192.168.1.22',1,25,'2026-06-16 00:02:01','2026-06-16 00:02:01'),
(4,'Multisensorial','multisensorial','#185FA5','?','192.168.1.23',1,25,'2026-06-16 00:02:01','2026-06-16 00:02:01'),
(5,'Tecnología','tecnologia','#993C1D','?','192.168.1.24',1,25,'2026-06-16 00:02:01','2026-06-16 00:02:01');

/*Table structure for table `asistencias` */

DROP TABLE IF EXISTS `asistencias`;

CREATE TABLE `asistencias` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `presente` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asistencias_estudiante_id_fecha_unique` (`estudiante_id`,`fecha`),
  CONSTRAINT `asistencias_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `asistencias` */

/*Table structure for table `carga_docente` */

DROP TABLE IF EXISTS `carga_docente`;

CREATE TABLE `carga_docente` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `docente_id` bigint(20) unsigned NOT NULL,
  `ambiente_id` bigint(20) unsigned NOT NULL,
  `grado_id` bigint(20) unsigned NOT NULL,
  `grupo_id` bigint(20) unsigned NOT NULL,
  `anio_lectivo` year(4) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `carga_docente` */

insert  into `carga_docente`(`id`,`docente_id`,`ambiente_id`,`grado_id`,`grupo_id`,`anio_lectivo`,`activo`,`created_at`,`updated_at`) values 
(1,1,1,2,3,2026,1,'2026-06-16 19:35:18','2026-06-16 19:35:18');

/*Table structure for table `cola_sincronizacion` */

DROP TABLE IF EXISTS `cola_sincronizacion`;

CREATE TABLE `cola_sincronizacion` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `entidad` varchar(255) NOT NULL,
  `entidad_id` bigint(20) unsigned NOT NULL,
  `accion` enum('create','update','delete','transfer') NOT NULL,
  `servidor_origen` varchar(255) NOT NULL DEFAULT 'musica',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `estado` enum('pendiente','enviado','confirmado','error') NOT NULL DEFAULT 'pendiente',
  `intentos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `enviado_en` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `cola_sincronizacion` */

insert  into `cola_sincronizacion`(`id`,`entidad`,`entidad_id`,`accion`,`servidor_origen`,`payload`,`estado`,`intentos`,`enviado_en`,`created_at`,`updated_at`) values 
(1,'Estudiante',1,'update','polimotor','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(2,'Estudiante',1,'update','logico','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(3,'Estudiante',1,'update','multisensorial','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02'),
(4,'Estudiante',1,'update','tecnologia','{\"nombre\":\"Valentina\",\"activo\":true}','confirmado',0,NULL,'2026-06-16 00:02:02','2026-06-16 00:02:02');

/*Table structure for table `configuracion_pins` */

DROP TABLE IF EXISTS `configuracion_pins`;

CREATE TABLE `configuracion_pins` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `figura_1` varchar(20) NOT NULL,
  `color_figura_1` varchar(20) DEFAULT NULL,
  `figura_2` varchar(20) NOT NULL,
  `color_figura_2` varchar(20) DEFAULT NULL,
  `figura_3` varchar(20) NOT NULL,
  `color_figura_3` varchar(20) DEFAULT NULL,
  `intentos_fallidos` tinyint(3) unsigned NOT NULL DEFAULT 0,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(255) NOT NULL,
  `valor` text DEFAULT NULL,
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

/*Table structure for table `docentes` */

DROP TABLE IF EXISTS `docentes`;

CREATE TABLE `docentes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `firma_url` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('activo','inactivo','eliminado') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `docentes_user_id_foreign` (`user_id`),
  CONSTRAINT `docentes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `docentes` */

insert  into `docentes`(`id`,`user_id`,`telefono`,`direccion`,`especialidad`,`fecha_ingreso`,`firma_url`,`descripcion`,`estado`,`created_at`,`updated_at`) values 
(1,2,'12345678925','direc','maestro','2026-06-23',NULL,NULL,'eliminado','2026-06-16 00:02:02','2026-06-24 15:50:15'),
(2,4,'12345678925','direc','maestro','2026-06-23',NULL,NULL,'activo','2026-06-16 17:32:50','2026-06-24 15:57:11'),
(3,5,'12345678925','direc','maestro','2026-06-23',NULL,NULL,'activo','2026-06-16 17:32:50','2026-06-23 14:23:57');

/*Table structure for table `estudiante_ambiente` */

DROP TABLE IF EXISTS `estudiante_ambiente`;

CREATE TABLE `estudiante_ambiente` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `ambiente_id` bigint(20) unsigned NOT NULL,
  `anio_lectivo` smallint(5) unsigned NOT NULL,
  `estado` enum('activo','restringido','adaptado') NOT NULL DEFAULT 'activo',
  `observacion` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ea_unique` (`estudiante_id`,`ambiente_id`,`anio_lectivo`),
  KEY `estudiante_ambiente_ambiente_id_foreign` (`ambiente_id`),
  CONSTRAINT `estudiante_ambiente_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `estudiante_ambiente_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `estudiante_ambiente` */

insert  into `estudiante_ambiente`(`id`,`estudiante_id`,`ambiente_id`,`anio_lectivo`,`estado`,`observacion`,`created_at`,`updated_at`) values 
(1,13,3,2026,'activo',NULL,'2026-06-24 09:05:13','2026-06-24 09:05:13'),
(2,11,3,2026,'activo',NULL,'2026-06-24 09:05:13','2026-06-24 09:05:13');

/*Table structure for table `estudiantes` */

DROP TABLE IF EXISTS `estudiantes`;

CREATE TABLE `estudiantes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `avatar` text DEFAULT NULL,
  `identificacion` int(11) DEFAULT NULL,
  `iniciales` varchar(3) NOT NULL,
  `grado_id` text DEFAULT NULL,
  `color_avatar` varchar(9) NOT NULL DEFAULT '#0F6E56',
  `condicion_id` int(11) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_nacimiento` text DEFAULT NULL,
  `acudiente` text DEFAULT NULL,
  `telefono_acudiente` text DEFAULT NULL,
  `requiere_apoyo` varchar(15) NOT NULL DEFAULT 'no',
  `sexo` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `estado_piar` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `estudiantes` */

insert  into `estudiantes`(`id`,`nombre`,`avatar`,`identificacion`,`iniciales`,`grado_id`,`color_avatar`,`condicion_id`,`activo`,`fecha_nacimiento`,`acudiente`,`telefono_acudiente`,`requiere_apoyo`,`sexo`,`created_at`,`updated_at`,`estado_piar`) values 
(1,'Valentina',NULL,1111,'VA',NULL,'#0F6E56',1,1,'2021-01-17',NULL,NULL,'no',NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01',0),
(2,'Mateo',NULL,2222,'MA',NULL,'#534AB7',1,1,'2018-01-22',NULL,NULL,'no',NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01',0),
(3,'Sofía',NULL,3333,'SO',NULL,'#854F0B',1,0,'2018-01-22',NULL,NULL,'si',NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01',0),
(4,'Juan',NULL,4444,'JU',NULL,'#185FA5',1,1,'2018-01-22',NULL,NULL,'no',NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01',0),
(5,'Camila',NULL,5555,'CA',NULL,'#993C1D',1,1,'2018-01-22',NULL,NULL,'no',NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01',0),
(6,'Luna',NULL,6666,'LU',NULL,'#F59E0B',1,1,'2018-01-22',NULL,NULL,'no',NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01',0),
(7,'José',NULL,134123123,'Jo','1','#0F6E56',1,1,'2018-01-22','Juana','245234234','no',NULL,'2026-06-18 16:04:20','2026-06-18 16:04:20',0),
(8,'José',NULL,134123123,'Jo','1','#0F6E56',1,1,'2018-01-22','Juana','245234234','no',NULL,'2026-06-18 16:04:36','2026-06-18 16:04:36',0),
(9,'Fabian Mendez',NULL,123123123,'FM','3','#0F6E56',1,1,'2018-01-22','Juana 2','32434234','no',NULL,'2026-06-18 16:08:25','2026-06-18 16:08:25',0),
(10,'Juan Lopez 3',NULL,3423423,'JL','2','#0F6E56',1,1,'2018-01-22','Juana 5','3423423','no',NULL,'2026-06-18 16:12:47','2026-06-18 16:12:47',0),
(11,'Andres quintero',NULL,5345345,'AQ','1','#0F6E56',1,1,'2018-01-22','yyyyyyy','5345345','no',NULL,'2026-06-18 16:19:02','2026-06-18 16:19:02',0),
(12,'Fabian Mendez Quintero',NULL,342423,'FM','1','#0F6E56',1,1,'2019-05-16','hfghfghfgh','634634','no',NULL,'2026-06-18 16:56:48','2026-06-18 16:56:48',0),
(13,'Andrea Rodriguez','estudiantes/lNIZ6VFiTteCno5FKRNh5FCY37imQS7xXLNXdP9U.jpg',5345345,'AR','1','#ffb81f',1,1,'2023-12-10','Julian Rodriguez','45345','si','femenino','2026-06-18 17:15:22','2026-06-23 09:59:35',0),
(14,'Xiamir luquez','estudiantes/23NS51sSHtdWtH2tQynzAD0EfRAd6m2WaZensqbP.webp',4353453,'XL','1','#0F6E56',1,1,'2021-06-12','yyyy','345345','no',NULL,'2026-06-18 17:20:14','2026-06-18 17:20:14',0),
(15,'Juan David  Perez',NULL,6456456,'JD',NULL,'#ff8a05',1,1,'2023-06-07','tttt','345345','no',NULL,'2026-06-19 08:00:29','2026-06-19 08:00:29',0),
(16,'Juana Lopera',NULL,654645,'JL',NULL,'#79fbf9',1,1,'2014-07-12','uuuu','6666','no',NULL,'2026-06-19 08:01:32','2026-06-19 08:01:32',0),
(17,'Luisa Castro',NULL,525252,'LC',NULL,'#ff0000',1,1,'2020-01-12','yyyy','23423423','no',NULL,'2026-06-19 14:17:51','2026-06-19 14:17:51',0),
(18,'pedro velazques',NULL,34534534,'PV',NULL,'#3d2258',1,1,'2026-06-23','ertert','334634634','no',NULL,'2026-06-20 10:12:28','2026-06-20 10:12:28',0),
(19,'Julio Jaramillo',NULL,12323123,'JJ',NULL,'#ba79fb',1,1,'2017-05-23','ghdfh','345345','no',NULL,'2026-06-20 10:16:15','2026-06-20 10:16:15',0),
(20,'Olimpo cardenas',NULL,324234,'OC',NULL,'#ba79fb',1,1,'2022-12-12','234234','45345','no',NULL,'2026-06-20 10:19:58','2026-06-20 10:19:58',0),
(21,'Nicola Di Bari',NULL,5634545,'ND',NULL,'#ba79fb',1,1,'2000-01-22','fgfdgdfgdf','34534','no',NULL,'2026-06-20 10:39:00','2026-06-20 10:39:00',0),
(26,'fghfghfg',NULL,45345,'FG','2','#ba79fb',1,1,'2024-06-17','5etrwetr','34534','en_proceso','femenino','2026-06-22 15:20:25','2026-06-22 15:20:25',0);

/*Table structure for table `failed_jobs` */

DROP TABLE IF EXISTS `failed_jobs`;

CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `failed_jobs` */

/*Table structure for table `grados` */

DROP TABLE IF EXISTS `grados`;

CREATE TABLE `grados` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `edad_anos` tinyint(4) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `orden` tinyint(4) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `grado_id` bigint(20) unsigned NOT NULL,
  `nombre` varchar(10) NOT NULL,
  `anio_lectivo` year(4) NOT NULL,
  `cupo_maximo` tinyint(4) NOT NULL DEFAULT 30,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grp_unique` (`grado_id`,`nombre`,`anio_lectivo`),
  CONSTRAINT `grupos_grado_id_foreign` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `grupos` */

insert  into `grupos`(`id`,`grado_id`,`nombre`,`anio_lectivo`,`cupo_maximo`,`activo`,`created_at`,`updated_at`) values 
(1,1,'A',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(3,2,'A',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(4,2,'B',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(5,3,'A',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(6,3,'B',2026,25,1,'2026-06-16 19:35:18','2026-06-16 19:35:18'),
(23,2,'C',2026,25,1,'2026-06-18 12:23:28','2026-06-18 12:23:28'),
(26,1,'A',2027,25,1,'2026-06-19 09:57:51','2026-06-19 09:57:51');

/*Table structure for table `matriculas` */

DROP TABLE IF EXISTS `matriculas`;

CREATE TABLE `matriculas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `grado_id` bigint(20) unsigned NOT NULL,
  `grupo_id` bigint(20) unsigned NOT NULL,
  `anio_lectivo` year(4) NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `matriculas` */

insert  into `matriculas`(`id`,`estudiante_id`,`grado_id`,`grupo_id`,`anio_lectivo`,`estado`,`fecha_ingreso`,`fecha_egreso`,`created_at`,`updated_at`) values 
(1,1,2,3,2026,'activo','2026-01-01',NULL,'2026-06-16 19:35:19','2026-06-22 15:46:32'),
(2,2,2,3,2026,'activo','2026-01-01',NULL,'2026-06-16 19:35:19','2026-06-22 15:46:36'),
(3,3,2,3,2026,'activo','2026-01-01',NULL,'2026-06-16 19:35:19','2026-06-22 15:46:39'),
(4,4,2,3,2026,'activo','2026-01-01',NULL,'2026-06-16 19:35:19','2026-06-22 15:46:43'),
(5,5,2,3,2026,'activo','2026-01-01',NULL,'2026-06-16 19:35:19','2026-06-22 15:46:50'),
(17,5,1,1,2027,'activo','2026-06-19',NULL,'2026-06-19 17:54:51','2026-06-19 17:54:51'),
(18,4,1,1,2027,'activo','2026-06-19',NULL,'2026-06-19 17:54:51','2026-06-19 17:54:51'),
(19,1,1,26,2027,'promovido','2026-06-20','2026-06-20','2026-06-20 11:45:40','2026-06-20 11:53:46'),
(20,2,1,26,2027,'promovido','2026-06-20','2026-06-20','2026-06-20 11:45:40','2026-06-20 11:53:46'),
(21,3,1,26,2027,'promovido','2026-06-20','2026-06-20','2026-06-20 11:45:40','2026-06-20 11:53:46'),
(22,12,1,1,2026,'promovido','2026-06-23','2026-06-23','2026-06-23 10:38:47','2026-06-23 15:32:21');

/*Table structure for table `migrations` */

DROP TABLE IF EXISTS `migrations`;

CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
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
(28,'2026_06_17_000007_eliminar_ambiente_id_docentes',3),
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ambiente_id` bigint(20) unsigned NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(255) DEFAULT NULL,
  `orden` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `visible_estudiantes` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modulos_ambiente_id_foreign` (`ambiente_id`),
  CONSTRAINT `modulos_ambiente_id_foreign` FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `modulos` */

/*Table structure for table `notas_docente` */

DROP TABLE IF EXISTS `notas_docente`;

CREATE TABLE `notas_docente` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tema_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `tema_id` bigint(20) unsigned DEFAULT NULL,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `docente_id` bigint(20) unsigned DEFAULT NULL,
  `anio_lectivo` year(4) NOT NULL,
  `descripcion_diagnostico` text DEFAULT NULL,
  `barreras_aprendizaje` text DEFAULT NULL,
  `ajustes_propuestos` text DEFAULT NULL,
  `estado` enum('borrador','revisado','aprobado') NOT NULL DEFAULT 'borrador',
  `archivo_adjunto` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `piar_estudiante_id_unique` (`estudiante_id`),
  KEY `piar_docente_id_foreign` (`docente_id`),
  CONSTRAINT `piar_docente_id_foreign` FOREIGN KEY (`docente_id`) REFERENCES `docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `piar_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `piar` */

/*Table structure for table `portafolios` */

DROP TABLE IF EXISTS `portafolios`;

CREATE TABLE `portafolios` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` bigint(20) unsigned NOT NULL,
  `tema_id` bigint(20) unsigned NOT NULL,
  `tipo_registro` enum('foto','audio','emocion','resultado') NOT NULL,
  `contenido` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`contenido`)),
  `emocion_seleccionada` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `portafolios_estudiante_id_foreign` (`estudiante_id`),
  KEY `portafolios_tema_id_foreign` (`tema_id`),
  CONSTRAINT `portafolios_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `portafolios_tema_id_foreign` FOREIGN KEY (`tema_id`) REFERENCES `temas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `portafolios` */

/*Table structure for table `registros_acceso` */

DROP TABLE IF EXISTS `registros_acceso`;

CREATE TABLE `registros_acceso` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `ambiente` varchar(255) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `login_logs_user_id_foreign` (`user_id`),
  CONSTRAINT `login_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `registros_acceso` */

insert  into `registros_acceso`(`id`,`user_id`,`ip`,`ambiente`,`fecha`) values 
(10,3,'127.0.0.1','polimotor','2026-06-18 17:16:38'),
(11,3,'127.0.0.1','polimotor','2026-06-19 09:16:42'),
(12,3,'127.0.0.1','polimotor','2026-06-19 10:46:12'),
(13,3,'127.0.0.1','polimotor','2026-06-19 11:04:19'),
(14,3,'127.0.0.1','polimotor','2026-06-19 15:46:05'),
(15,3,'127.0.0.1','polimotor','2026-06-19 15:47:12'),
(16,3,'127.0.0.1','polimotor','2026-06-19 17:36:25'),
(17,3,'127.0.0.1','polimotor','2026-06-20 11:10:00'),
(18,3,'127.0.0.1','polimotor','2026-06-20 11:53:57'),
(19,3,'127.0.0.1','polimotor','2026-06-21 22:33:39'),
(20,3,'127.0.0.1','polimotor','2026-06-22 08:43:43'),
(21,3,'127.0.0.1','polimotor','2026-06-22 14:27:15'),
(22,3,'127.0.0.1','polimotor','2026-06-23 08:26:20'),
(23,3,'127.0.0.1','polimotor','2026-06-23 11:11:53'),
(24,3,'127.0.0.1','polimotor','2026-06-23 15:28:21'),
(25,3,'127.0.0.1','polimotor','2026-06-24 09:03:55'),
(26,3,'127.0.0.1','polimotor','2026-06-24 09:13:34'),
(27,3,'127.0.0.1','polimotor','2026-06-24 14:31:48');

/*Table structure for table `temas` */

DROP TABLE IF EXISTS `temas`;

CREATE TABLE `temas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `modulo_id` bigint(20) unsigned NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(255) DEFAULT NULL,
  `instruccion_corta` varchar(255) DEFAULT NULL,
  `orden` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `marcador_ra` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
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
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `identificacion` varchar(50) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','docente') NOT NULL DEFAULT 'docente',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `bloqueado_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `users` */

insert  into `users`(`id`,`identificacion`,`nombre`,`apellido`,`email`,`password`,`rol`,`activo`,`remember_token`,`created_at`,`updated_at`,`bloqueado_en`) values 
(2,'2131231456','Docente Líder','Música','docente.musica@aulasreggio.test','$2y$10$1ayJZZHZTm69wZ3YQcU4ZewcwdSd7GDpGKMR2LH0reayC5g6Rg1bW','docente',1,NULL,'2026-06-16 00:02:02','2026-06-24 15:36:58',NULL),
(3,'213123','Adminitrador del sistema',NULL,'admin@aulasreggio.test','$2y$10$wjLu1JkqDfVwAMR7VEkx0eN0K4jQVh5G/75sE.0V9wO1x4GO.3Wlq','admin',1,NULL,'2026-06-16 00:12:01','2026-06-18 17:16:17',NULL),
(4,'3423445664','Ana Sofia','Ramirez','ana.sofia@aulasreggio.test','$2y$10$xaq8IzkCANMR486WjHqUOORDgCC9BuwE7sIUUgKMYWCbhEHKcGi5q','docente',1,NULL,'2026-06-16 17:32:50','2026-06-24 15:36:35',NULL),
(5,'32434','Carlos Eduardo',' Perez','carlos.perez@aulasreggio.test','$2y$10$CrH2dWYlMdA4gcmrQ6J2ReOmOFUb3oq47nb6PxSdjxpjHRkSfMWVC','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(6,'5346345','Maria Fernanda ','Lopez','maria.lopez@aulasreggio.test','$2y$10$IbOTCndCL4IOh8onIxVRiuJDeLpBfdEXDpxfdZuwIgq3Zi1vY8EqS','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(7,'21341234','Jorge Luis ','Martinez','jorge.martinez@aulasreggio.test','$2y$10$rDzC74Ze6pmumLs7bWBOjOwGNea5lCtZ9adym4fhrqSsb.26L4eG2','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(8,'654645','Laura Valentina ','Torres','laura.torres@aulasreggio.test','$2y$10$ZDHYEz4BE9bk6klx3d1m0.ahZdMVbq529pq3zsturZltFeYOte/Vi','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(9,'2342342','Sebastian Felipe ','Gomez','sebastian.gomez@aulasreggio.test','$2y$10$Beizcu7u5jKpws.5KjvCQePwF2fJtB5cEdHdqD18bm4WlBsSYOhpy','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(10,'5656645','Daniela Paola ','Vargas','daniela.vargas@aulasreggio.test','$2y$10$ktfn.me/EGyB9U7ZcnO15uyIVgwctNshg9FngAUPMn451GErJxOnm','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(11,'234234234','Andres Felipe ','Rojas','andres.rojas@aulasreggio.test','$2y$10$iywC4mD8f5r13hPX6HGOOufZkCqMV.gAGRs/h3F3CN/V1rCvOt3sq','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(12,'43563456','Natalia Alejandra ','Cruz','natalia.cruz@aulasreggio.test','$2y$10$bN/LOLfQiKjTC12vdl3uTutiKsngQ344gDF507hc6YsdpRX85XKS2','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(13,'32454365','Juan Pablo ','Herrera','juan.herrera@aulasreggio.test','$2y$10$uiFhUMOeWjEjBtwY4kxcMewe9dXimg7ikaOJ3jFiY2P2AtWfjG9Uu','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(14,'5345345','Camila Andrea ','Mora','camila.mora@aulasreggio.test','$2y$10$ZVq5aurxoqa1KVRv7LgujO.zag/lhphPOf.0MsNkhgUulU3U./QmG','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL),
(15,'657567567','Ricardo Andres ','Silva','ricardo.silva@aulasreggio.test','$2y$10$.bghvK6emeHQyaxnz3V2vOZVc1s/RkeSQpA8NZOdOrkqF29iGberC','docente',1,NULL,'2026-06-16 17:32:50','2026-06-16 17:32:50',NULL);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
