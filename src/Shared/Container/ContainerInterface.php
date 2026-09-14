<?php

namespace App\Shared\Container;

/**
 * Interface ContainerInterface
 *
 * Contrato estándar para el contenedor de inyección de dependencias (compatible con PSR-11).
 *
 * @package App\Shared\Container
 */
interface ContainerInterface
{
  /**
   * Encuentra una entrada del contenedor por su identificador (nombre de clase o alias) y la devuelve.
   *
   * @param string $id Identificador del servicio o clase.
   * @return mixed Instancia resuelta.
   * @throws \Exception Si el servicio no existe o no puede ser instanciado.
   */
  public function get(string $id): mixed;

  /**
   * Retorna true si el contenedor puede retornar una entrada para el identificador dado.
   *
   * @param string $id Identificador del servicio.
   * @return bool
   */
  public function has(string $id): bool;
}
