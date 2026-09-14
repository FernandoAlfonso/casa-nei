<?php

namespace App\Shared\Http;

/**
 * Class Request
 *
 * Objeto de valor que abstrae y encapsula la petición HTTP entrante.
 * Normaliza métodos HTTP, detecta rutas de API REST, procesa payloads JSON
 * y parámetros de consulta de forma segura.
 *
 * @package App\Shared\Http
 */
class Request
{
  /**
   * Método HTTP de la petición (GET, POST, PUT, DELETE, OPTIONS).
   */
  private string $method;

  /**
   * Ruta relativa normalizada de la API (ej. '/citas/agendar').
   */
  private string $path;

  /**
   * Parámetros recibidos por la cadena de consulta ($_GET).
   *
   * @var array<string, mixed>
   */
  private array $query;

  /**
   * Cuerpo de la petición deserializado (JSON o $_POST).
   *
   * @var array<string, mixed>
   */
  private array $body;

  /**
   * Constructor del Request. Extrae y normaliza los encabezados y datos globales de PHP.
   */
  public function __construct()
  {
    $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $this->query = $_GET;

    // Detectar ruta (soporta PATH_INFO, REQUEST_URI o parámetro route)
    $path = $_SERVER['PATH_INFO'] ?? ($_GET['route'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
    // Limpiar prefijo /api si viene en la URL
    $path = preg_replace('#^.*/api#', '', $path);
    $this->path = '/' . trim($path, '/');

    // Parsear cuerpo JSON o FormData
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
      $input = file_get_contents('php://input');
      $this->body = json_decode($input, true) ?? [];
    } else {
      $this->body = $_POST;
    }
  }

  /**
   * Obtiene el método HTTP en mayúsculas.
   *
   * @return string
   */
  public function getMethod(): string
  {
    return $this->method;
  }

  /**
   * Obtiene la ruta normalizada sin el prefijo /api.
   *
   * @return string
   */
  public function getPath(): string
  {
    return $this->path;
  }

  /**
   * Obtiene un valor de la query string o el arreglo completo si no se pasa clave.
   *
   * @param string|null $key Nombre del parámetro (opcional).
   * @param mixed $default Valor por defecto si no existe la clave.
   * @return mixed
   */
  public function getQuery(?string $key = null, mixed $default = null): mixed
  {
    if ($key === null) {
      return $this->query;
    }
    return $this->query[$key] ?? $default;
  }

  /**
   * Obtiene un valor del cuerpo de la petición (JSON/POST) o el arreglo completo.
   *
   * @param string|null $key Nombre del parámetro en el body (opcional).
   * @param mixed $default Valor por defecto si no existe la clave.
   * @return mixed
   */
  public function getBody(?string $key = null, mixed $default = null): mixed
  {
    if ($key === null) {
      return $this->body;
    }
    return $this->body[$key] ?? $default;
  }

  /**
   * Obtiene un parámetro buscando primero en el cuerpo y luego en los parámetros query.
   *
   * @param string $key Clave del parámetro a consultar.
   * @param mixed $default Valor por defecto en caso de no encontrarse en ninguna fuente.
   * @return mixed
   */
  public function get(string $key, mixed $default = null): mixed
  {
    return $this->getBody($key, $this->getQuery($key, $default));
  }
}
