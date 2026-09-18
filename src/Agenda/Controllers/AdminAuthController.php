<?php

namespace App\Agenda\Controllers;

use App\Shared\Http\Request;
use App\Shared\Http\Response;

class AdminAuthController
{
  /**
   * Valida la contraseña del administrador y genera un JWT simple.
   *
   * @param Request $request
   * @return void
   */
  public function login(Request $request): void
  {
    $password = $request->getBody('password');

    if (!$password || $password !== ADMIN_PASSWORD) {
      Response::error('Credenciales inválidas', 401);
    }

    // Generación de JWT simple
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    // Expira en 30 días
    $payload = json_encode(['admin' => true, 'exp' => time() + (86400 * 30)]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, ADMIN_TOKEN_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    $token = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

    Response::success(['token' => $token], 'Autenticación exitosa');
  }
}
