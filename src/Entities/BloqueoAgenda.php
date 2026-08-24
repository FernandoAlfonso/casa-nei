<?php

namespace App\Entities;

/**
 * BloqueoAgenda - Entidad para registrar bloqueos de fechas/horas (vacaciones, festivos, descansos).
 */
class BloqueoAgenda
{
  public function __construct(
    private ?int $id = null,
    private string $fecha = '',
    private ?string $horaInicio = null,
    private ?string $horaFin = null,
    private ?string $motivo = null
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

  public function getFecha(): string
  {
    return $this->fecha;
  }

  public function setFecha(string $fecha): self
  {
    $this->fecha = $fecha;
    return $this;
  }

  public function getHoraInicio(): ?string
  {
    return $this->horaInicio;
  }

  public function setHoraInicio(?string $horaInicio): self
  {
    $this->horaInicio = $horaInicio;
    return $this;
  }

  public function getHoraFin(): ?string
  {
    return $this->horaFin;
  }

  public function setHoraFin(?string $horaFin): self
  {
    $this->horaFin = $horaFin;
    return $this;
  }

  public function getMotivo(): ?string
  {
    return $this->motivo;
  }

  public function setMotivo(?string $motivo): self
  {
    $this->motivo = $motivo;
    return $this;
  }

  /**
   * Comprueba si el bloqueo aplica a todo el día.
   */
  public function esDiaCompleto(): bool
  {
    return $this->horaInicio === null && $this->horaFin === null;
  }

  /**
   * Instancia la entidad desde un arreglo asociativo.
   */
  public static function fromArray(array $data): self
  {
    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      fecha: $data['fecha'] ?? '',
      horaInicio: $data['hora_inicio'] ?? null,
      horaFin: $data['hora_fin'] ?? null,
      motivo: $data['motivo'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo.
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'fecha' => $this->fecha,
      'hora_inicio' => $this->horaInicio,
      'hora_fin' => $this->horaFin,
      'motivo' => $this->motivo,
    ];
  }
}
