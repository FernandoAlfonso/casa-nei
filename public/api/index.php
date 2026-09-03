<?php

/**
 * Front Controller / Router para la API REST de Casa Nei
 */

// Cargar configuración global si existe
$configPath1 = dirname(__DIR__) . '/.apps/casa-nei/config.php';
$configPath2 = dirname(__DIR__, 2) . '/src/config.php';
if (file_exists($configPath1))
  require_once $configPath1;
if (file_exists($configPath2))
  require_once $configPath2;

// Carga de autoloader compatible con Entorno Local y Producción
$loaded = false;
if (defined('DEBUG_MODE') && DEBUG_MODE)
  $path = dirname(__DIR__, 2) . '/src/Shared/autoload.php';
else
  $path = dirname(__DIR__, 3) . '/.apps/casa-nei/Shared/autoload.php';

if (file_exists($path)) {
  require_once $path;
  $loaded = true;
}

if (!$loaded) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'success' => false,
    'error' => 'No se pudo cargar el autoloader de la aplicación.'
  ]);
  exit;
}

// Configuración de errores en tiempo de ejecución según DEBUG_MODE
if (defined('DEBUG_MODE') && DEBUG_MODE) {
  ini_set('display_errors', '1');
  ini_set('display_startup_errors', '1');
  error_reporting(E_ALL);
} else {
  ini_set('display_errors', '0');
  ini_set('display_startup_errors', '0');
  error_reporting(0);
}

use App\Agenda\Controllers\AgendaController;
use App\Shared\Http\Request;
use App\Shared\Http\Response;

$request = new Request();
$controller = new AgendaController();

$method = $request->getMethod();
$path = $request->getPath();

// Responder a solicitudes preflight de CORS
if ($method === 'OPTIONS') {
  Response::json([], 200);
}

// Enrutador de peticiones
try {
  match (true) {
    // Endpoints públicos de la agenda
    $method === 'GET' && $path === '/servicios' => $controller->obtenerServicios($request),
    $method === 'GET' && $path === '/calendario' => $controller->obtenerCalendario($request),
    $method === 'GET' && $path === '/horas-disponibles' => $controller->obtenerHorasDisponibles($request),
    $method === 'POST' && $path === '/cliente/consultar' => $controller->consultarCliente($request),
    $method === 'POST' && $path === '/citas/agendar' => $controller->agendarCita($request),

    // Endpoints administrativos
    $method === 'GET' && $path === '/admin/solicitudes' => $controller->obtenerSolicitudesAdmin($request),
    $method === 'POST' && $path === '/admin/citas/confirmar' => $controller->confirmarCita($request),
    $method === 'POST' && $path === '/admin/citas/cancelar' => $controller->cancelarCita($request),
    $method === 'POST' && $path === '/admin/citas/actualizar' => $controller->actualizarCita($request),

    // Ruta por defecto / 404
    default => Response::error("Ruta no encontrada: [{$method}] {$path}", 404)
  };
} catch (Throwable $e) {
  $message = (defined('DEBUG_MODE') && DEBUG_MODE)
    ? "Error interno en el servidor: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine()
    : "Error interno en el servidor.";
  Response::error($message, 500);
}

