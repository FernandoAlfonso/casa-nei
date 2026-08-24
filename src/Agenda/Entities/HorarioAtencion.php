<?php

namespace App\Agenda\Entities;

/**
 * HorarioAtencion - Entidad para las reglas de horarios semanales del centro.
 */
class HorarioAtencion
{
  public function __construct(
    private ?int $id = null,
    private int $diaSemana = 1,
    private string $horaInicio = '09:00:00',
    private string $horaFin = '18:00:00',
    private bool $activo = true
  ) {
  }

  // Getters y Setters
  public function getId(): ?int
  {
    return $this->id;
  }

  public function setId(?int $id): self
  {
    $this->id = $id;
    return $this;
  }

  public function getDiaSemana(): int
  {
    return $this->diaSemana;
  }

  public function setDiaSemana(int $diaSemana): self
  {
    $this->diaSemana = $diaSemana;
    return $this;
  }

  public function getHoraInicio(): string
  {
    return $this->horaInicio;
  }

  public function setHoraInicio(string $horaInicio): self
  {
    $this->horaInicio = $horaInicio;
    return $this;
  }

  public function getHoraFin(): string
  {
    return $this->horaFin;
  }

  public function setHoraFin(string $horaFin): self
  {
    $this->horaFin = $horaFin;
    return $this;
  }

  public function isActivo(): bool
  {
    return $this->activo;
  }

  public function setActivo(bool $activo): self
  {
    $this->activo = $activo;
    return $this;
  }

  /**
   * Retorna el nombre en texto del día de la semana.
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
   * Instancia la entidad desde un arreglo asociativo.
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
