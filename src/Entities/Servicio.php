<?php

namespace App\Entities;

/**
 * Servicio - Entidad que representa los servicios/tratamientos ofrecidos.
 */
class Servicio
{
  public function __construct(
    private ?int $id = null,
    private string $nombre = '',
    private ?string $descripcion = null,
    private int $duracionMinutos = 60,
    private ?float $precio = null,
    private bool $activo = true,
    private ?string $createdAt = null
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

  public function getNombre(): string
  {
    return $this->nombre;
  }

  public function setNombre(string $nombre): self
  {
    $this->nombre = trim($nombre);
    return $this;
  }

  public function getDescripcion(): ?string
  {
    return $this->descripcion;
  }

  public function setDescripcion(?string $descripcion): self
  {
    $this->descripcion = $descripcion;
    return $this;
  }

  public function getDuracionMinutos(): int
  {
    return $this->duracionMinutos;
  }

  public function setDuracionMinutos(int $duracionMinutos): self
  {
    $this->duracionMinutos = $duracionMinutos;
    return $this;
  }

  public function getPrecio(): ?float
  {
    return $this->precio;
  }

  public function setPrecio(?float $precio): self
  {
    $this->precio = $precio;
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

  public function getCreatedAt(): ?string
  {
    return $this->createdAt;
  }

  public function setCreatedAt(?string $createdAt): self
  {
    $this->createdAt = $createdAt;
    return $this;
  }

  /**
   * Instancia la entidad desde un arreglo asociativo.
   */
  public static function fromArray(array $data): self
  {
    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      nombre: $data['nombre'] ?? '',
      descripcion: $data['descripcion'] ?? null,
      duracionMinutos: (int) ($data['duracion_minutos'] ?? 60),
      precio: isset($data['precio']) ? (float) $data['precio'] : null,
      activo: isset($data['activo']) ? (bool) $data['activo'] : true,
      createdAt: $data['created_at'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo.
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'nombre' => $this->nombre,
      'descripcion' => $this->descripcion,
      'duracion_minutos' => $this->duracionMinutos,
      'precio' => $this->precio,
      'activo' => $this->activo ? 1 : 0,
      'created_at' => $this->createdAt,
    ];
  }
}
