<?php

namespace App\Agenda\Entities;

/**
 * EstadoCita - Enumeración de estados para el ciclo de vida de una cita.
 */
enum EstadoCita: string
{
  case PENDIENTE = 'pendiente';
  case CONFIRMADA = 'confirmada';
  case RECHAZADA = 'rechazada';
  case CANCELADA = 'cancelada';
  case COMPLETADA = 'completada';

  /**
   * Retorna una etiqueta amigable para mostrar en interfaces.
   */
  public function label(): string
  {
    return match ($this) {
      self::PENDIENTE => 'Pendiente de confirmación',
      self::CONFIRMADA => 'Confirmada',
      self::RECHAZADA => 'Rechazada',
      self::CANCELADA => 'Cancelada',
      self::COMPLETADA => 'Completada',
    };
  }
}
