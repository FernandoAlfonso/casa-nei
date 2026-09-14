<?php

namespace App\Shared\Http;

/**
 * Class Response
 *
 * Objeto para estructurar y emitir respuestas HTTP y serialización JSON optimizada.
 * Adapta el payload según DEBUG_MODE: JSON comprimido/minificado en producción
 * para ahorro de ancho de banda móvil, o JSON_PRETTY_PRINT en desarrollo.
 *
 * @package App\Shared\Http
 */
class Response
{
  /**
   * Emite una respuesta JSON con el código de estado adecuado y flags optimizados para móviles.
   *
   * @param mixed $data Datos a serializar.
   * @param int $statusCode Código HTTP (por defecto 200).
   * @return void
   */
  public static function json(mixed $data, int $statusCode = 200): void
  {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    // JSON_UNESCAPED_SLASHES previene escapar URLs como https:\/\/wa.me\... ahorrando bytes.
    // JSON_UNESCAPED_UNICODE mantiene tildes y caracteres en UTF-8 nativo.
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

    if (defined('DEBUG_MODE') && DEBUG_MODE) {
      $flags |= JSON_PRETTY_PRINT;
    }

    echo json_encode($data, $flags);
    exit;
  }

  /**
   * Emite una respuesta JSON de éxito estandarizada.
   *
   * @param mixed $data Datos o payload de respuesta.
   * @param string $message Mensaje informativo para el cliente.
   * @param int $statusCode Código HTTP (por defecto 200).
   * @return void
   */
  public static function success(mixed $data = null, string $message = 'Operación exitosa', int $statusCode = 200): void
  {
    self::json([
      'success' => true,
      'message' => $message,
      'data'    => $data
    ], $statusCode);
  }

  /**
   * Emite una respuesta JSON de error estandarizada.
   *
   * @param string $message Mensaje de error general.
   * @param int $statusCode Código HTTP de error (por defecto 400).
   * @param array<int|string, mixed> $errors Lista detallada de fallos de validación.
   * @return void
   */
  public static function error(string $message = 'Error en la petición', int $statusCode = 400, array $errors = []): void
  {
    self::json([
      'success' => false,
      'error'   => $message,
      'errors'  => $errors
    ], $statusCode);
  }
}
