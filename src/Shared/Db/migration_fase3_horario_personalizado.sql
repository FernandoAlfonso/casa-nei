-- ============================================================
-- MIGRACIÓN FASE 3: Casa Nei - Horarios Específicos por Servicio
-- Ejecutar en cPanel / phpMyAdmin sobre la base de datos `ferflomi_casa_nei`
-- ============================================================

USE `ferflomi_casa_nei`;

-- Agregar columna horario_personalizado a servicios
ALTER TABLE `servicios` 
  ADD COLUMN `horario_personalizado` JSON NULL DEFAULT NULL 
  COMMENT 'Horarios específicos que sobrescriben el horario de atención general'
  AFTER `activo`;
