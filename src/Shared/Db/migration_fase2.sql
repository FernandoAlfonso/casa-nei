-- ============================================================
-- MIGRACIÓN FASE 2: Casa Nei - Sistema de Agenda y Citas
-- Ejecutar en cPanel / phpMyAdmin sobre la base de datos `ferflomi_casa_nei`
-- ============================================================

USE `ferflomi_casa_nei`;

-- 1. Flexibilizar teléfono en clientes (Permite NULL para citas agendadas directamente por el admin sin celular)
ALTER TABLE `clientes` 
  MODIFY `telefono_encriptado` VARBINARY(255) NULL COMMENT 'Número encriptado con AES-256 (NULL si agendó admin sin cel)',
  MODIFY `telefono_hash` VARCHAR(64) NULL COMMENT 'Hash SHA-256 del teléfono para búsquedas (NULL si no tiene)';

-- 2. Agregar columnas tiene_whatsapp y canal a la tabla citas
ALTER TABLE `citas` 
  ADD COLUMN `tiene_whatsapp` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 si el cliente cuenta con WhatsApp, 0 de lo contrario' AFTER `estado`,
  ADD COLUMN `canal` VARCHAR(20) NOT NULL DEFAULT 'web' COMMENT 'Canal de origen: web, llamada, admin presencial' AFTER `tiene_whatsapp`,
  ADD INDEX `idx_tiene_whatsapp` (`tiene_whatsapp`);

-- 3. Crear tabla de persistencia MySQL para suscripciones Web Push (FCM / APNs)
CREATE TABLE IF NOT EXISTS `suscripciones_push` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `endpoint` TEXT NOT NULL COMMENT 'URL del servicio push de Google FCM / Apple APNs',
  `endpoint_hash` VARCHAR(64) NOT NULL UNIQUE COMMENT 'Hash SHA-256 del endpoint para búsqueda e índice único',
  `p256dh` VARCHAR(255) NOT NULL COMMENT 'Clave pública del cliente para ECDH',
  `auth` VARCHAR(255) NOT NULL COMMENT 'Secreto de autenticación del cliente',
  `user_agent` VARCHAR(255) NULL,
  `ip` VARCHAR(45) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Actualizar vista del panel administrativo para incluir canal y tiene_whatsapp
CREATE OR REPLACE VIEW `vw_citas_panel` AS
SELECT 
  c.`id` AS `cita_id`,
  c.`codigo_cita`,
  cl.`nombre_completo` AS `cliente_nombre`,
  c.`fecha_cita`,
  c.`hora_inicio`,
  c.`hora_fin`,
  s.`nombre` AS `servicio_nombre`,
  c.`estado`,
  c.`tiene_whatsapp`,
  c.`canal`,
  c.`created_at` AS `fecha_solicitud`
FROM `citas` c
INNER JOIN `clientes` cl ON c.`cliente_id` = cl.`id`
INNER JOIN `servicios` s ON c.`servicio_id` = s.`id`;
