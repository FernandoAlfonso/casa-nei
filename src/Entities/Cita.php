<?php

namespace App\Entities;

/**
 * Cita - Entidad que modela una cita o solicitud de agenda.
 */
class Cita
{
  public function __construct(
    private ?int $id = null,
    private string $codigoCita = '',
    private int $clienteId = 0,
    private int $servicioId = 0,
    private string $fechaCita = '',
    private string $horaInicio = '',
    private string $horaFin = '',
    private EstadoCita $estado = EstadoCita::PENDIENTE,
    private ?string $notasCliente = null,
    private ?string $notasAdmin = null,
    private ?string $createdAt = null,
    private ?string $updatedAt = null
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

  public function getCodigoCita(): string
  {
    return $this->codigoCita;
  }

  public function setCodigoCita(string $codigoCita): self
  {
    $this->codigoCita = $codigoCita;
    return $this;
  }

  public function getClienteId(): int
  {
    return $this->clienteId;
  }

  public function setClienteId(int $clienteId): self
  {
    $this->clienteId = $clienteId;
    return $this;
  }

  public function getServicioId(): int
  {
    return $this->servicioId;
  }

  public function setServicioId(int $servicioId): self
  {
    $this->servicioId = $servicioId;
    return $this;
  }

  public function getFechaCita(): string
  {
    return $this->fechaCita;
  }

  public function setFechaCita(string $fechaCita): self
  {
    $this->fechaCita = $fechaCita;
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

  public function getEstado(): EstadoCita
  {
    return $this->estado;
  }

  public function setEstado(EstadoCita|string $estado): self
  {
    if (is_string($estado)) {
      $estado = EstadoCita::from($estado);
    }
    $this->estado = $estado;
    return $this;
  }

  public function getNotasCliente(): ?string
  {
    return $this->notasCliente;
  }

  public function setNotasCliente(?string $notasCliente): self
  {
    $this->notasCliente = $notasCliente;
    return $this;
  }

  public function getNotasAdmin(): ?string
  {
    return $this->notasAdmin;
  }

  public function setNotasAdmin(?string $notasAdmin): self
  {
    $this->notasAdmin = $notasAdmin;
    return $this;
  }

  public function getCreatedAt(): ?string
  {
    return $this->createdAt;
  }

  public function setCreatedAt(?string $createdAt): self
  {
    $this->createdAt = $createdAt;
    return $this;
  }

  public function getUpdatedAt(): ?string
  {
    return $this->updatedAt;
  }

  public function setUpdatedAt(?string $updatedAt): self
  {
    $this->updatedAt = $updatedAt;
    return $this;
  }

  // Métodos de comportamiento de dominio
  public function confirmar(?string $mensajeAdmin = null): self
  {
    $this->estado = EstadoCita::CONFIRMADA;
    if ($mensajeAdmin !== null) {
      $this->notasAdmin = $mensajeAdmin;
    }
    return $this;
  }

  public function cancelar(?string $motivo = null): self
  {
    $this->estado = EstadoCita::CANCELADA;
    if ($motivo !== null) {
      $this->notasAdmin = $motivo;
    }
    return $this;
  }

  public function rechazar(?string $motivo = null): self
  {
    $this->estado = EstadoCita::RECHAZADA;
    if ($motivo !== null) {
      $this->notasAdmin = $motivo;
    }
    return $this;
  }

  public function completar(): self
  {
    $this->estado = EstadoCita::COMPLETADA;
    return $this;
  }

  public function estaPendiente(): bool
  {
    return $this->estado === EstadoCita::PENDIENTE;
  }

  public function estaConfirmada(): bool
  {
    return $this->estado === EstadoCita::CONFIRMADA;
  }

  /**
   * Instancia la entidad desde un arreglo asociativo.
   */
  public static function fromArray(array $data): self
  {
    $estado = isset($data['estado'])
      ? ($data['estado'] instanceof EstadoCita ? $data['estado'] : EstadoCita::from($data['estado']))
      : EstadoCita::PENDIENTE;

    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      codigoCita: $data['codigo_cita'] ?? '',
      clienteId: (int) ($data['cliente_id'] ?? 0),
      servicioId: (int) ($data['servicio_id'] ?? 0),
      fechaCita: $data['fecha_cita'] ?? '',
      horaInicio: $data['hora_inicio'] ?? '',
      horaFin: $data['hora_fin'] ?? '',
      estado: $estado,
      notasCliente: $data['notas_cliente'] ?? null,
      notasAdmin: $data['notas_admin'] ?? null,
      createdAt: $data['created_at'] ?? null,
      updatedAt: $data['updated_at'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo.
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'codigo_cita' => $this->codigoCita,
      'cliente_id' => $this->clienteId,
      'servicio_id' => $this->servicioId,
      'fecha_cita' => $this->fechaCita,
      'hora_inicio' => $this->horaInicio,
      'hora_fin' => $this->horaFin,
      'estado' => $this->estado->value,
      'notas_cliente' => $this->notasCliente,
      'notas_admin' => $this->notasAdmin,
      'created_at' => $this->createdAt,
      'updated_at' => $this->updatedAt,
    ];
  }
}
