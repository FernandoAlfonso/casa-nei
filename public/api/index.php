<?php

/**
 * Front Controller / Router para la API REST de Casa Nei
 */

// Cargar bootstrap y Contenedor de Inyección de Dependencias
$bootstrapCandidates = [
  dirname(__DIR__, 2) . '/src/bootstrap.php',
  dirname(__DIR__, 3) . '/.apps/casa-nei/bootstrap.php',
  dirname(__DIR__) . '/.apps/casa-nei/bootstrap.php'
];

$container = null;
foreach ($bootstrapCandidates as $candidate) {
  if (file_exists($candidate)) {
    $container = require_once $candidate;
    break;
  }
}

if (!$container) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['success' => false, 'error' => 'No se pudo inicializar el contenedor de la aplicación.']);
  exit;
}

use App\Agenda\Controllers\AdminAuthController;
use App\Agenda\Controllers\AgendaController;
use App\Agenda\Controllers\PwaTestController;
use App\Shared\Http\Request;
use App\Shared\Http\Response;

$request = $container->get(Request::class);
$controller = $container->get(AgendaController::class);
$pwaController = $container->get(PwaTestController::class);
$adminAuthController = $container->get(AdminAuthController::class);

$method = $request->getMethod();
$path = $request->getPath();

// Responder a solicitudes preflight de CORS
if ($method === 'OPTIONS') {
  Response::json([], 200);
}

// Middleware Admin
if (str_starts_with($path, '/admin/') && $path !== '/admin/login') {
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  
  if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    Response::error('Token no proporcionado', 401);
  }
  
  $token = $matches[1];
  $parts = explode('.', $token);
  if (count($parts) !== 3) {
    Response::error('Token inválido', 401);
  }
  
  list($head, $payload, $signature) = $parts;
  
  $validSignature = hash_hmac('sha256', $head . "." . $payload, ADMIN_TOKEN_SECRET, true);
  $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));
  
  if (!hash_equals($base64UrlSignature, $signature)) {
    Response::error('Token modificado o inválido', 401);
  }
  
  $payloadData = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
  if (isset($payloadData['exp']) && time() > $payloadData['exp']) {
    Response::error('Token expirado', 401);
  }
}

// Enrutador de peticiones REST
try {
  match (true) {
    // Endpoints públicos de la agenda
    $method === 'GET' && $path === '/servicios' => $controller->obtenerServicios($request),
    $method === 'GET' && $path === '/calendario' => $controller->obtenerCalendario($request),
    $method === 'GET' && $path === '/horas-disponibles' => $controller->obtenerHorasDisponibles($request),
    $method === 'POST' && $path === '/cliente/consultar' => $controller->consultarCliente($request),
    $method === 'POST' && $path === '/citas/agendar' => $controller->agendarCita($request),

    // Endpoints administrativos
    $method === 'POST' && $path === '/admin/login' => $adminAuthController->login($request),
    $method === 'GET' && $path === '/admin/solicitudes' => $controller->obtenerSolicitudesAdmin($request),
    $method === 'POST' && $path === '/admin/citas/agendar' => $controller->agendarCitaAdmin($request),
    $method === 'POST' && $path === '/admin/citas/confirmar' => $controller->confirmarCita($request),
    $method === 'POST' && $path === '/admin/citas/cancelar' => $controller->cancelarCita($request),
    $method === 'POST' && $path === '/admin/citas/actualizar' => $controller->actualizarCita($request),

    // Endpoints de prueba para PWA y Web Push (Google FCM / Apple APNs)
    $method === 'GET' && $path === '/pwa/vapid-key' => $pwaController->obtenerVapidKey($request),
    $method === 'POST' && $path === '/pwa/suscribir' => $pwaController->suscribirDispositivo($request),
    $method === 'POST' && $path === '/pwa/enviar-prueba' => $pwaController->enviarNotificacionPrueba($request),
    $method === 'POST' && $path === '/pwa/confirmar-cita' => $pwaController->confirmarCitaPrueba($request),
    $method === 'GET' && $path === '/pwa/estado' => $pwaController->obtenerEstado($request),

    // Ruta por defecto / 404
    default => Response::error("Ruta no encontrada: [{$method}] {$path}", 404)
  };
} catch (Throwable $e) {
  $message = (defined('DEBUG_MODE') && DEBUG_MODE)
    ? "Error interno en el servidor: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine()
    : "Error interno en el servidor.";
  Response::error($message, 500);
}
