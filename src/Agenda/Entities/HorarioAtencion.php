<?php

namespace App\Agenda\Entities;

/**
 * Class HorarioAtencion
 *
 * Entidad de dominio que representa las reglas de horarios laborales semanales de Casa Nei.
 * Mapea el día de la semana (0=Domingo a 6=Sábado) con los horarios de apertura y cierre.
 *
 * @package App\Agenda\Entities
 */
class HorarioAtencion
{
  /**
   * Constructor de la entidad HorarioAtencion.
   *
   * @param int|null $id Identificador primario del horario.
   * @param int $diaSemana Día de la semana (0=Dom, 1=Lun, ..., 6=Sáb).
   * @param string $horaInicio Hora de apertura laboral (HH:MM:SS).
   * @param string $horaFin Hora de culminación laboral (HH:MM:SS).
   * @param bool $activo Indica si el centro labora en este día de la semana.
   */
  public function __construct(
    private ?int $id = null,
    private int $diaSemana = 1,
    private string $horaInicio = '09:00:00',
    private string $horaFin = '18:00:00',
    private bool $activo = true
  ) {
  }

  /**
   * Obtiene el identificador primario del registro.
   *
   * @return int|null
   */
  public function getId(): ?int
  {
    return $this->id;
  }

  /**
   * Establece el identificador primario del registro.
   *
   * @param int|null $id
   * @return self
   */
  public function setId(?int $id): self
  {
    $this->id = $id;
    return $this;
  }

  /**
   * Obtiene el número de día de la semana (0-6).
   *
   * @return int
   */
  public function getDiaSemana(): int
  {
    return $this->diaSemana;
  }

  /**
   * Establece el número de día de la semana (0-6).
   *
   * @param int $diaSemana
   * @return self
   */
  public function setDiaSemana(int $diaSemana): self
  {
    $this->diaSemana = $diaSemana;
    return $this;
  }

  /**
   * Obtiene la hora de apertura laboral.
   *
   * @return string
   */
  public function getHoraInicio(): string
  {
    return $this->horaInicio;
  }

  /**
   * Establece la hora de apertura laboral.
   *
   * @param string $horaInicio
   * @return self
   */
  public function setHoraInicio(string $horaInicio): self
  {
    $this->horaInicio = $horaInicio;
    return $this;
  }

  /**
   * Obtiene la hora de cierre laboral.
   *
   * @return string
   */
  public function getHoraFin(): string
  {
    return $this->horaFin;
  }

  /**
   * Establece la hora de cierre laboral.
   *
   * @param string $horaFin
   * @return self
   */
  public function setHoraFin(string $horaFin): self
  {
    $this->horaFin = $horaFin;
    return $this;
  }

  /**
   * Indica si el día se encuentra activo para atención al público.
   *
   * @return bool
   */
  public function isActivo(): bool
  {
    return $this->activo;
  }

  /**
   * Establece el estado de activación del día laboral.
   *
   * @param bool $activo
   * @return self
   */
  public function setActivo(bool $activo): self
  {
    $this->activo = $activo;
    return $this;
  }

  /**
   * Retorna el nombre en texto en español del día de la semana.
   *
   * @return string
   */
  public function getNombreDia(): string
  {
    return match ($this->diaSemana) {
      0 => 'Domingo',
      1 => 'Lunes',
      2 => 'Martes',
      3 => 'Miércoles',
      4 => 'Jueves',
      5 => 'Viernes',
      6 => 'Sábado',
      default => 'Desconocido',
    };
  }

  /**
   * Instancia la entidad desde un arreglo asociativo proveniente de base de datos.
   *
   * @param array<string, mixed> $data
   * @return self
   */
  public static function fromArray(array $data): self
  {
    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      diaSemana: (int) ($data['dia_semana'] ?? 1),
      horaInicio: $data['hora_inicio'] ?? '09:00:00',
      horaFin: $data['hora_fin'] ?? '18:00:00',
      activo: isset($data['activo']) ? (bool) $data['activo'] : true
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo.
   *
   * @return array<string, mixed>
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'dia_semana' => $this->diaSemana,
      'hora_inicio' => $this->horaInicio,
      'hora_fin' => $this->horaFin,
      'activo' => $this->activo ? 1 : 0,
    ];
  }
}
