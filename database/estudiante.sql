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

/*Table structure for table `estudiantes` */

DROP TABLE IF EXISTS `estudiantes`;

CREATE TABLE `estudiantes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `identificacion` int DEFAULT NULL,
  `iniciales` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grado_id` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `color_avatar` varchar(9) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#0F6E56',
  `condicion_id` int DEFAULT '1',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_nacimiento` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `acudiente` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `telefono_acudiente` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `requiere_apoyo` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'no',
  `sexo` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `estudiantes` */

insert  into `estudiantes`(`id`,`nombre`,`avatar`,`identificacion`,`iniciales`,`grado_id`,`color_avatar`,`condicion_id`,`activo`,`fecha_nacimiento`,`acudiente`,`telefono_acudiente`,`created_at`,`updated_at`,`requiere_apoyo`,`sexo`) values 
(1,'Valentina',NULL,1111,'VA',NULL,'#0F6E56',1,1,'2021-01-17',NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL),
(2,'Mateo',NULL,2222,'MA',NULL,'#534AB7',1,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL),
(3,'Sofía',NULL,3333,'SO',NULL,'#854F0B',1,0,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','si',NULL),
(4,'Juan',NULL,4444,'JU',NULL,'#185FA5',1,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL),
(5,'Camila',NULL,5555,'CA',NULL,'#993C1D',1,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL),
(6,'Luna',NULL,6666,'LU',NULL,'#F59E0B',1,1,NULL,NULL,NULL,'2026-06-16 00:02:01','2026-06-16 00:02:01','no',NULL),
(7,'José',NULL,134123123,'Jo','1','#0F6E56',1,1,NULL,'Juana','245234234','2026-06-18 16:04:20','2026-06-18 16:04:20','no',NULL),
(8,'José',NULL,134123123,'Jo','1','#0F6E56',1,1,NULL,'Juana','245234234','2026-06-18 16:04:36','2026-06-18 16:04:36','no',NULL),
(9,'Fabian Mendez',NULL,123123123,'FM','3','#0F6E56',1,1,NULL,'Juana 2','32434234','2026-06-18 16:08:25','2026-06-18 16:08:25','no',NULL),
(10,'Juan Lopez 3',NULL,3423423,'JL','2','#0F6E56',1,1,NULL,'Juana 5','3423423','2026-06-18 16:12:47','2026-06-18 16:12:47','no',NULL),
(11,'Andres quintero',NULL,5345345,'AQ','1','#0F6E56',1,1,'2018-01-22','yyyyyyy','5345345','2026-06-18 16:19:02','2026-06-18 16:19:02','no',NULL),
(12,'Fabian Mendez Quintero',NULL,342423,'FM','1','#0F6E56',1,1,'2019-05-16','hfghfghfgh','634634','2026-06-18 16:56:48','2026-06-18 16:56:48','no',NULL),
(13,'Andrea Rodriguez','estudiantes/lNIZ6VFiTteCno5FKRNh5FCY37imQS7xXLNXdP9U.jpg',5345345,'AR','1','#ffb81f',1,1,'2023-12-10','Julian Rodriguez','45345','2026-06-18 17:15:22','2026-06-23 09:59:35','si','femenino'),
(14,'Xiamir luquez','estudiantes/23NS51sSHtdWtH2tQynzAD0EfRAd6m2WaZensqbP.webp',4353453,'XL','1','#0F6E56',1,1,'2021-06-12','yyyy','345345','2026-06-18 17:20:14','2026-06-18 17:20:14','no',NULL),
(15,'Juan David  Perez',NULL,6456456,'JD',NULL,'#ff8a05',1,1,'2023-06-07','tttt','345345','2026-06-19 08:00:29','2026-06-19 08:00:29','no',NULL),
(16,'Juana Lopera',NULL,654645,'JL',NULL,'#79fbf9',1,1,'2014-07-12','uuuu','6666','2026-06-19 08:01:32','2026-06-19 08:01:32','no',NULL),
(17,'Luisa Castro',NULL,525252,'LC',NULL,'#ff0000',1,1,'2020-01-12','yyyy','23423423','2026-06-19 14:17:51','2026-06-19 14:17:51','no',NULL),
(18,'pedro velazques',NULL,34534534,'PV',NULL,'#3d2258',1,1,'2026-06-23','ertert','334634634','2026-06-20 10:12:28','2026-06-20 10:12:28','no',NULL),
(19,'Julio Jaramillo',NULL,12323123,'JJ',NULL,'#ba79fb',1,1,'2017-05-23','ghdfh','345345','2026-06-20 10:16:15','2026-06-20 10:16:15','no',NULL),
(20,'Olimpo cardenas',NULL,324234,'OC',NULL,'#ba79fb',1,1,'2022-12-12','234234','45345','2026-06-20 10:19:58','2026-06-20 10:19:58','no',NULL),
(21,'Nicola Di Bari',NULL,5634545,'ND',NULL,'#ba79fb',1,1,'2000-01-22','fgfdgdfgdf','34534','2026-06-20 10:39:00','2026-06-20 10:39:00','no',NULL),
(26,'fghfghfg',NULL,45345,'FG','2','#ba79fb',1,1,'2024-06-17','5etrwetr','34534','2026-06-22 15:20:25','2026-06-22 15:20:25','en_proceso','femenino');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
