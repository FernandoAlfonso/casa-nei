<?php

namespace App\Agenda\Entities;

/**
 * Enum EstadoCita
 *
 * Enumeración con respaldo de cadenas (backed enum) que modela los estados válidos
 * dentro de la máquina de estados del ciclo de vida de una cita en Casa Nei.
 *
 * @package App\Agenda\Entities
 */
enum EstadoCita: string
{
  /**
   * Cita solicitada por el paciente en espera de revisión por el administrador.
   */
  case PENDIENTE = 'pendiente';

  /**
   * Cita validada y confirmada por el terapeuta/administrador.
   */
  case CONFIRMADA = 'confirmada';

  /**
   * Cita no aceptada por incompatibilidad de horario o motivo administrativo.
   */
  case RECHAZADA = 'rechazada';

  /**
   * Cita cancelada por solicitud del paciente o fuerza mayor del centro.
   */
  case CANCELADA = 'cancelada';

  /**
   * Sesión de terapia o clase llevada a cabo satisfactoriamente.
   */
  case COMPLETADA = 'completada';

  /**
   * Retorna una etiqueta amigable en lenguaje natural para mostrar en interfaces web y móviles.
   *
   * @return string
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
