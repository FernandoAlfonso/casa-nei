<?php

namespace App\Agenda\Entities;

/**
 * Class BloqueoAgenda
 *
 * Entidad de dominio que representa los bloqueos de fechas y horarios extraordinarios
 * (días festivos, vacaciones del centro, descansos o indisponibilidad temporal de terapeutas).
 *
 * @package App\Agenda\Entities
 */
class BloqueoAgenda
{
  /**
   * Constructor de la entidad BloqueoAgenda.
   *
   * @param int|null $id Identificador primario.
   * @param string $fecha Fecha del bloqueo en formato YYYY-MM-DD.
   * @param string|null $horaInicio Hora inicial del bloqueo (null si es día completo).
   * @param string|null $horaFin Hora final del bloqueo (null si es día completo).
   * @param string|null $motivo Razón o causa del bloqueo (ej. 'Festivo Nacional', 'Mantenimiento').
   */
  public function __construct(
    private ?int $id = null,
    private string $fecha = '',
    private ?string $horaInicio = null,
    private ?string $horaFin = null,
    private ?string $motivo = null
  ) {
  }

  /**
   * Obtiene el ID del bloqueo.
   *
   * @return int|null
   */
  public function getId(): ?int
  {
    return $this->id;
  }

  /**
   * Establece el ID del bloqueo.
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
   * Obtiene la fecha del bloqueo.
   *
   * @return string
   */
  public function getFecha(): string
  {
    return $this->fecha;
  }

  /**
   * Establece la fecha del bloqueo.
   *
   * @param string $fecha
   * @return self
   */
  public function setFecha(string $fecha): self
  {
    $this->fecha = $fecha;
    return $this;
  }

  /**
   * Obtiene la hora de inicio del bloqueo.
   *
   * @return string|null
   */
  public function getHoraInicio(): ?string
  {
    return $this->horaInicio;
  }

  /**
   * Establece la hora de inicio del bloqueo.
   *
   * @param string|null $horaInicio
   * @return self
   */
  public function setHoraInicio(?string $horaInicio): self
  {
    $this->horaInicio = $horaInicio;
    return $this;
  }

  /**
   * Obtiene la hora de fin del bloqueo.
   *
   * @return string|null
   */
  public function getHoraFin(): ?string
  {
    return $this->horaFin;
  }

  /**
   * Establece la hora de fin del bloqueo.
   *
   * @param string|null $horaFin
   * @return self
   */
  public function setHoraFin(?string $horaFin): self
  {
    $this->horaFin = $horaFin;
    return $this;
  }

  /**
   * Obtiene el motivo de la suspensión o bloqueo.
   *
   * @return string|null
   */
  public function getMotivo(): ?string
  {
    return $this->motivo;
  }

  /**
   * Establece el motivo de la suspensión o bloqueo.
   *
   * @param string|null $motivo
   * @return self
   */
  public function setMotivo(?string $motivo): self
  {
    $this->motivo = $motivo;
    return $this;
  }

  /**
   * Comprueba si el bloqueo aplica a todo el día de forma completa (sin horario específico).
   *
   * @return bool
   */
  public function esDiaCompleto(): bool
  {
    return $this->horaInicio === null && $this->horaFin === null;
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
      fecha: $data['fecha'] ?? '',
      horaInicio: $data['hora_inicio'] ?? null,
      horaFin: $data['hora_fin'] ?? null,
      motivo: $data['motivo'] ?? null
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
      'fecha' => $this->fecha,
      'hora_inicio' => $this->horaInicio,
      'hora_fin' => $this->horaFin,
      'motivo' => $this->motivo,
    ];
  }
}
