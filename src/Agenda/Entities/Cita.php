<?php

namespace App\Agenda\Entities;

/**
 * Cita - Entidad de dominio que modela una cita o solicitud de agenda.
 *
 * Administra el ciclo de vida de la reserva, servicio solicitado, horarios,
 * canal de origen (web, llamada, admin) y preferencia de comunicación (WhatsApp o llamada).
 *
 * @package App\Agenda\Entities
 */
class Cita
{
  /**
   * Constructor de la entidad Cita.
   *
   * @param int|null $id Identificador primario en base de datos.
   * @param string $codigoCita Código público alfanumérico único (ej. CN-20260914-A8F2).
   * @param int $clienteId Clave foránea del cliente asociado.
   * @param int $servicioId Clave foránea del servicio solicitado.
   * @param string $fechaCita Fecha reservada en formato YYYY-MM-DD.
   * @param string $horaInicio Hora de inicio en formato HH:MM:SS.
   * @param string $horaFin Hora de culminación en formato HH:MM:SS.
   * @param EstadoCita $estado Estado actual de la cita (pendiente, confirmada, rechazada, cancelada, completada).
   * @param bool $tieneWhatsapp Indica si el paciente dispone de WhatsApp activo para notificaciones.
   * @param string $canal Canal por el que se originó la reserva ('web', 'llamada', 'admin').
   * @param string|null $notasCliente Comentarios, síntomas o motivos expuestos por el paciente.
   * @param string|null $notasAdmin Observaciones o notas internas del terapeuta / administrador.
   * @param string|null $createdAt Fecha y hora de creación.
   * @param string|null $updatedAt Fecha y hora de última modificación.
   */
  public function __construct(
    private ?int $id = null,
    private string $codigoCita = '',
    private int $clienteId = 0,
    private int $servicioId = 0,
    private string $fechaCita = '',
    private string $horaInicio = '',
    private string $horaFin = '',
    private EstadoCita $estado = EstadoCita::PENDIENTE,
    private bool $tieneWhatsapp = true,
    private string $canal = 'web',
    private ?string $notasCliente = null,
    private ?string $notasAdmin = null,
    private ?string $createdAt = null,
    private ?string $updatedAt = null
  ) {
  }

  /**
   * Obtiene el identificador de la cita.
   *
   * @return int|null
   */
  public function getId(): ?int
  {
    return $this->id;
  }

  /**
   * Establece el identificador de la cita.
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
   * Obtiene el código alfanumérico público de la cita.
   *
   * @return string
   */
  public function getCodigoCita(): string
  {
    return $this->codigoCita;
  }

  /**
   * Establece el código de cita.
   *
   * @param string $codigoCita
   * @return self
   */
  public function setCodigoCita(string $codigoCita): self
  {
    $this->codigoCita = $codigoCita;
    return $this;
  }

  /**
   * Obtiene el ID del cliente asociado.
   *
   * @return int
   */
  public function getClienteId(): int
  {
    return $this->clienteId;
  }

  /**
   * Establece el ID del cliente.
   *
   * @param int $clienteId
   * @return self
   */
  public function setClienteId(int $clienteId): self
  {
    $this->clienteId = $clienteId;
    return $this;
  }

  /**
   * Obtiene el ID del servicio reservado.
   *
   * @return int
   */
  public function getServicioId(): int
  {
    return $this->servicioId;
  }

  /**
   * Establece el ID del servicio.
   *
   * @param int $servicioId
   * @return self
   */
  public function setServicioId(int $servicioId): self
  {
    $this->servicioId = $servicioId;
    return $this;
  }

  /**
   * Obtiene la fecha de la cita (YYYY-MM-DD).
   *
   * @return string
   */
  public function getFechaCita(): string
  {
    return $this->fechaCita;
  }

  /**
   * Establece la fecha de la cita.
   *
   * @param string $fechaCita
   * @return self
   */
  public function setFechaCita(string $fechaCita): self
  {
    $this->fechaCita = $fechaCita;
    return $this;
  }

  /**
   * Obtiene la hora de inicio (HH:MM:SS).
   *
   * @return string
   */
  public function getHoraInicio(): string
  {
    return $this->horaInicio;
  }

  /**
   * Establece la hora de inicio.
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
   * Obtiene la hora de finalización (HH:MM:SS).
   *
   * @return string
   */
  public function getHoraFin(): string
  {
    return $this->horaFin;
  }

  /**
   * Establece la hora de finalización.
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
   * Obtiene el enum de estado de la cita.
   *
   * @return EstadoCita
   */
  public function getEstado(): EstadoCita
  {
    return $this->estado;
  }

  /**
   * Establece el estado de la cita.
   *
   * @param EstadoCita|string $estado
   * @return self
   */
  public function setEstado(EstadoCita|string $estado): self
  {
    if (is_string($estado)) {
      $estado = EstadoCita::from($estado);
    }
    $this->estado = $estado;
    return $this;
  }

  /**
   * Indica si el paciente dispone de WhatsApp para recibir notificaciones y enlaces.
   *
   * @return bool
   */
  public function tieneWhatsapp(): bool
  {
    return $this->tieneWhatsapp;
  }

  /**
   * Establece si la cita maneja interacción vía WhatsApp.
   *
   * @param bool $tieneWhatsapp
   * @return self
   */
  public function setTieneWhatsapp(bool $tieneWhatsapp): self
  {
    $this->tieneWhatsapp = $tieneWhatsapp;
    return $this;
  }

  /**
   * Obtiene el canal de origen de la cita ('web', 'llamada', 'admin').
   *
   * @return string
   */
  public function getCanal(): string
  {
    return $this->canal;
  }

  /**
   * Establece el canal de origen de la cita.
   *
   * @param string $canal
   * @return self
   */
  public function setCanal(string $canal): self
  {
    $this->canal = $canal;
    return $this;
  }

  /**
   * Obtiene las notas o motivos proporcionados por el cliente.
   *
   * @return string|null
   */
  public function getNotasCliente(): ?string
  {
    return $this->notasCliente;
  }

  /**
   * Establece las notas del cliente.
   *
   * @param string|null $notasCliente
   * @return self
   */
  public function setNotasCliente(?string $notasCliente): self
  {
    $this->notasCliente = $notasCliente;
    return $this;
  }

  /**
   * Obtiene las notas u observaciones administrativas.
   *
   * @return string|null
   */
  public function getNotasAdmin(): ?string
  {
    return $this->notasAdmin;
  }

  /**
   * Establece las notas administrativas.
   *
   * @param string|null $notasAdmin
   * @return self
   */
  public function setNotasAdmin(?string $notasAdmin): self
  {
    $this->notasAdmin = $notasAdmin;
    return $this;
  }

  /**
   * Obtiene la fecha y hora de creación de la cita.
   *
   * @return string|null
   */
  public function getCreatedAt(): ?string
  {
    return $this->createdAt;
  }

  /**
   * Establece la fecha de creación.
   *
   * @param string|null $createdAt
   * @return self
   */
  public function setCreatedAt(?string $createdAt): self
  {
    $this->createdAt = $createdAt;
    return $this;
  }

  /**
   * Obtiene la fecha de última modificación.
   *
   * @return string|null
   */
  public function getUpdatedAt(): ?string
  {
    return $this->updatedAt;
  }

  /**
   * Establece la fecha de última modificación.
   *
   * @param string|null $updatedAt
   * @return self
   */
  public function setUpdatedAt(?string $updatedAt): self
  {
    $this->updatedAt = $updatedAt;
    return $this;
  }

  // --- Métodos de comportamiento de dominio ---

  /**
   * Transiciona la cita al estado CONFIRMADA.
   *
   * @param string|null $mensajeAdmin Mensaje o indicaciones opcionales del administrador.
   * @return self
   */
  public function confirmar(?string $mensajeAdmin = null): self
  {
    $this->estado = EstadoCita::CONFIRMADA;
    if ($mensajeAdmin !== null) {
      $this->notasAdmin = $mensajeAdmin;
    }
    return $this;
  }

  /**
   * Transiciona la cita al estado CANCELADA.
   *
   * @param string|null $motivo Motivo opcional de la cancelación.
   * @return self
   */
  public function cancelar(?string $motivo = null): self
  {
    $this->estado = EstadoCita::CANCELADA;
    if ($motivo !== null) {
      $this->notasAdmin = $motivo;
    }
    return $this;
  }

  /**
   * Transiciona la cita al estado RECHAZADA.
   *
   * @param string|null $motivo Motivo opcional del rechazo.
   * @return self
   */
  public function rechazar(?string $motivo = null): self
  {
    $this->estado = EstadoCita::RECHAZADA;
    if ($motivo !== null) {
      $this->notasAdmin = $motivo;
    }
    return $this;
  }

  /**
   * Transiciona la cita al estado COMPLETADA tras la atención.
   *
   * @return self
   */
  public function completar(): self
  {
    $this->estado = EstadoCita::COMPLETADA;
    return $this;
  }

  /**
   * Determina si la cita se encuentra en espera de confirmación.
   *
   * @return bool
   */
  public function estaPendiente(): bool
  {
    return $this->estado === EstadoCita::PENDIENTE;
  }

  /**
   * Determina si la cita ya fue confirmada.
   *
   * @return bool
   */
  public function estaConfirmada(): bool
  {
    return $this->estado === EstadoCita::CONFIRMADA;
  }

  /**
   * Instancia una entidad Cita desde un arreglo asociativo.
   *
   * @param array<string, mixed> $data
   * @return self
   */
  public static function fromArray(array $data): self
  {
    $estado = isset($data['estado'])
      ? ($data['estado'] instanceof EstadoCita ? $data['estado'] : EstadoCita::from($data['estado']))
      : EstadoCita::PENDIENTE;

    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      codigoCita: (string) ($data['codigo_cita'] ?? ''),
      clienteId: (int) ($data['cliente_id'] ?? 0),
      servicioId: (int) ($data['servicio_id'] ?? 0),
      fechaCita: (string) ($data['fecha_cita'] ?? ''),
      horaInicio: (string) ($data['hora_inicio'] ?? ''),
      horaFin: (string) ($data['hora_fin'] ?? ''),
      estado: $estado,
      tieneWhatsapp: isset($data['tiene_whatsapp']) ? (bool) $data['tiene_whatsapp'] : true,
      canal: (string) ($data['canal'] ?? 'web'),
      notasCliente: $data['notas_cliente'] ?? null,
      notasAdmin: $data['notas_admin'] ?? null,
      createdAt: $data['created_at'] ?? null,
      updatedAt: $data['updated_at'] ?? null
    );
  }

  /**
   * Convierte la entidad Cita a un arreglo asociativo para persistencia o respuesta JSON.
   *
   * @return array<string, mixed>
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
      'tiene_whatsapp' => $this->tieneWhatsapp ? 1 : 0,
      'canal' => $this->canal,
      'notas_cliente' => $this->notasCliente,
      'notas_admin' => $this->notasAdmin,
      'created_at' => $this->createdAt,
      'updated_at' => $this->updatedAt,
    ];
  }
}

