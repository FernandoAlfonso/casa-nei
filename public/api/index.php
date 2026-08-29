<?php

/**
 * Front Controller / Router para la API REST de Casa Nei
 */

require_once dirname(__DIR__, 2) . '/src/Shared/autoload.php';

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
    $method === 'GET'  && $path === '/servicios'            => $controller->obtenerServicios($request),
    $method === 'GET'  && $path === '/calendario'           => $controller->obtenerCalendario($request),
    $method === 'GET'  && $path === '/horas-disponibles'    => $controller->obtenerHorasDisponibles($request),
    $method === 'POST' && $path === '/cliente/consultar'    => $controller->consultarCliente($request),
    $method === 'POST' && $path === '/citas/agendar'        => $controller->agendarCita($request),

    // Endpoints administrativos
    $method === 'GET'  && $path === '/admin/solicitudes'    => $controller->obtenerSolicitudesAdmin($request),
    $method === 'POST' && $path === '/admin/citas/confirmar' => $controller->confirmarCita($request),
    $method === 'POST' && $path === '/admin/citas/cancelar'  => $controller->cancelarCita($request),
    $method === 'POST' && $path === '/admin/citas/actualizar' => $controller->actualizarCita($request),

    // Ruta por defecto / 404
    default => Response::error("Ruta no encontrada: [{$method}] {$path}", 404)
  };
} catch (Throwable $e) {
  Response::error("Error interno en el servidor: " . $e->getMessage(), 500);
}
