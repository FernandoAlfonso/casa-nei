<?php

namespace App\Agenda\Entities;

/**
 * Class Servicio
 *
 * Entidad de dominio que representa los servicios, terapias y tratamientos ofrecidos por Casa Nei.
 * Define la duración en minutos requerida para el cálculo de slots, precios e instrucciones previas.
 *
 * @package App\Agenda\Entities
 */
class Servicio
{
  /**
   * Constructor de la entidad Servicio.
   *
   * @param int|null $id Identificador primario autoincremental.
   * @param string $nombre Nombre oficial del servicio o terapia.
   * @param string|null $descripcion Breve resumen explicativo del servicio.
   * @param string|null $instrucciones Indicaciones previas para el paciente (ej. tipo de ropa, ayuno).
   * @param int $duracionMinutos Duración estimada en minutos para el cálculo de disponibilidad (por defecto 60).
   * @param float|null $precio Costo monetario del servicio.
   * @param bool $activo Indica si el servicio está habilitado para reservaciones públicas.
   * @param string|null $createdAt Fecha y hora de registro en la base de datos.
   */
  public function __construct(
    private ?int $id = null,
    private string $nombre = '',
    private ?string $descripcion = null,
    private ?string $instrucciones = null,
    private int $duracionMinutos = 60,
    private ?float $precio = null,
    private bool $activo = true,
    private ?array $horarioPersonalizado = null,
    private ?string $createdAt = null
  ) {
  }

  /**
   * Obtiene el identificador primario del servicio.
   *
   * @return int|null
   */
  public function getId(): ?int
  {
    return $this->id;
  }

  /**
   * Establece el identificador primario del servicio.
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
   * Obtiene el nombre del servicio.
   *
   * @return string
   */
  public function getNombre(): string
  {
    return $this->nombre;
  }

  /**
   * Establece el nombre del servicio.
   *
   * @param string $nombre
   * @return self
   */
  public function setNombre(string $nombre): self
  {
    $this->nombre = trim($nombre);
    return $this;
  }

  /**
   * Obtiene la descripción del servicio.
   *
   * @return string|null
   */
  public function getDescripcion(): ?string
  {
    return $this->descripcion;
  }

  /**
   * Establece la descripción del servicio.
   *
   * @param string|null $descripcion
   * @return self
   */
  public function setDescripcion(?string $descripcion): self
  {
    $this->descripcion = $descripcion;
    return $this;
  }

  /**
   * Obtiene las instrucciones o recomendaciones previas para el paciente.
   *
   * @return string|null
   */
  public function getInstrucciones(): ?string
  {
    return $this->instrucciones;
  }

  /**
   * Establece las instrucciones o notas previas del servicio.
   *
   * @param string|null $instrucciones
   * @return self
   */
  public function setInstrucciones(?string $instrucciones): self
  {
    $this->instrucciones = $instrucciones ? trim($instrucciones) : null;
    return $this;
  }

  /**
   * Obtiene la duración del servicio en minutos.
   *
   * @return int
   */
  public function getDuracionMinutos(): int
  {
    return $this->duracionMinutos;
  }

  /**
   * Establece la duración del servicio en minutos.
   *
   * @param int $duracionMinutos
   * @return self
   */
  public function setDuracionMinutos(int $duracionMinutos): self
  {
    $this->duracionMinutos = $duracionMinutos;
    return $this;
  }

  /**
   * Obtiene el precio del servicio.
   *
   * @return float|null
   */
  public function getPrecio(): ?float
  {
    return $this->precio;
  }

  /**
   * Establece el precio del servicio.
   *
   * @param float|null $precio
   * @return self
   */
  public function setPrecio(?float $precio): self
  {
    $this->precio = $precio;
    return $this;
  }

  /**
   * Indica si el servicio está activo y disponible en el catálogo.
   *
   * @return bool
   */
  public function isActivo(): bool
  {
    return $this->activo;
  }

  /**
   * Establece el estado de activación del servicio.
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
   * Obtiene la configuración de horarios específicos del servicio.
   *
   * @return array<int, array<string, mixed>>|null
   */
  public function getHorarioPersonalizado(): ?array
  {
    return $this->horarioPersonalizado;
  }

  /**
   * Establece la configuración de horarios específicos del servicio.
   *
   * @param array<int, array<string, mixed>>|null $horarioPersonalizado
   * @return self
   */
  public function setHorarioPersonalizado(?array $horarioPersonalizado): self
  {
    $this->horarioPersonalizado = $horarioPersonalizado;
    return $this;
  }

  /**
   * Determina si el servicio cuenta con un horario personalizado que sobrescribe el general.
   *
   * @return bool
   */
  public function tieneHorarioPersonalizado(): bool
  {
    return !empty($this->horarioPersonalizado) && is_array($this->horarioPersonalizado);
  }

  /**
   * Devuelve los rangos horarios [['hora_inicio' => '19:00', 'hora_fin' => '21:00']]
   * para el día de la semana indicado (0=Dom, 1=Lun, ..., 6=Sáb). Si no abre ese día, devuelve [].
   *
   * @param int $diaSemana Día de la semana (0 a 6).
   * @return array<int, array{hora_inicio: string, hora_fin: string}>
   */
  public function obtenerRangosPorDia(int $diaSemana): array
  {
    if (!$this->tieneHorarioPersonalizado()) {
      return [];
    }

    $rangos = [];
    foreach ($this->horarioPersonalizado as $bloque) {
      $dias = array_map('intval', $bloque['dias'] ?? []);
      $coincide = in_array($diaSemana, $dias, true);
      if (!$coincide && $diaSemana === 0 && in_array(7, $dias, true)) {
        $coincide = true;
      }
      if (!$coincide && $diaSemana === 7 && in_array(0, $dias, true)) {
        $coincide = true;
      }

      if ($coincide) {
        $rangos[] = [
          'hora_inicio' => (string) ($bloque['hora_inicio'] ?? ''),
          'hora_fin'    => (string) ($bloque['hora_fin'] ?? '')
        ];
      }
    }
    return $rangos;
  }

  /**
   * Obtiene la fecha de creación del registro.
   *
   * @return string|null
   */
  public function getCreatedAt(): ?string
  {
    return $this->createdAt;
  }

  /**
   * Establece la fecha de creación del registro.
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
   * Instancia la entidad desde un arreglo asociativo proveniente de base de datos.
   *
   * @param array<string, mixed> $data
   * @return self
   */
  public static function fromArray(array $data): self
  {
    $horarioPersonalizado = null;
    if (isset($data['horario_personalizado']) && $data['horario_personalizado'] !== null && $data['horario_personalizado'] !== '') {
      $horarioPersonalizado = is_string($data['horario_personalizado'])
        ? json_decode($data['horario_personalizado'], true)
        : $data['horario_personalizado'];
      if (!is_array($horarioPersonalizado)) {
        $horarioPersonalizado = null;
      }
    }

    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      nombre: $data['nombre'] ?? '',
      descripcion: $data['descripcion'] ?? null,
      instrucciones: $data['instrucciones'] ?? null,
      duracionMinutos: (int) ($data['duracion_minutos'] ?? 60),
      precio: isset($data['precio']) && $data['precio'] !== null && $data['precio'] !== '' ? (float) $data['precio'] : null,
      activo: isset($data['activo']) ? (bool) $data['activo'] : true,
      horarioPersonalizado: $horarioPersonalizado,
      createdAt: $data['created_at'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo listo para serialización JSON.
   *
   * @return array<string, mixed>
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'nombre' => $this->nombre,
      'descripcion' => $this->descripcion,
      'instrucciones' => $this->instrucciones,
      'duracion_minutos' => $this->duracionMinutos,
      'precio' => $this->precio,
      'activo' => $this->activo ? 1 : 0,
      'horario_personalizado' => $this->horarioPersonalizado,
      'created_at' => $this->createdAt,
    ];
  }
}
