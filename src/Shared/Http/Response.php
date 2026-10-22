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

    // Deshabilitar caché agresivo en navegadores móviles (como iOS/Safari)
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

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
   * Emite la respuesta JSON al cliente de inmediato y libera la conexión HTTP,
   * permitiendo que PHP continúe ejecutando tareas en segundo plano (Web Push, logs, etc.)
   * sin demorar la interacción del usuario final en el navegador móvil.
   *
   * @param mixed $data Datos a serializar.
   * @param int $statusCode Código HTTP (por defecto 200).
   * @return void
   */
  public static function jsonAndContinue(mixed $data, int $statusCode = 200): void
  {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    // Deshabilitar caché agresivo en navegadores móviles (como iOS/Safari)
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

    if (defined('DEBUG_MODE') && DEBUG_MODE) {
      $flags |= JSON_PRETTY_PRINT;
    }

    $output = json_encode($data, $flags);

    // En entornos PHP-FPM (como cPanel / Hostgator en producción)
    if (function_exists('fastcgi_finish_request')) {
      echo $output;
      fastcgi_finish_request();
      return;
    }

    // Fallback para CLI Server / Apache / mod_php
    ignore_user_abort(true);
    header('Connection: close');
    header('Content-Length: ' . strlen($output));
    echo $output;
    if (ob_get_level() > 0) {
      ob_end_flush();
    }
    flush();
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
   * Emite una respuesta JSON de éxito estandarizada liberando de inmediato la conexión al cliente.
   *
   * @param mixed $data Datos o payload de respuesta.
   * @param string $message Mensaje informativo para el cliente.
   * @param int $statusCode Código HTTP (por defecto 200).
   * @return void
   */
  public static function successAndContinue(mixed $data = null, string $message = 'Operación exitosa', int $statusCode = 200): void
  {
    self::jsonAndContinue([
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
