<?php

/**
 * Bootstrap Application & Dependency Injection Setup
 *
 * Carga de configuración de entorno, autoloader PSR-4, inicialización de zona horaria
 * y registro centralizado de dependencias en el Contenedor de Servicios (Container).
 *
 * Compatible tanto con Entorno Local como con Producción (Hostgator / cPanel).
 */

// 1. Cargar configuración de entorno
$configLoaded = false;
$posiblesConfig = [
  __DIR__ . '/config.php',
  dirname(__DIR__) . '/.apps/casa-nei/config.php',
  dirname(__DIR__, 2) . '/.apps/casa-nei/config.php'
];

foreach ($posiblesConfig as $cfg) {
  if (file_exists($cfg)) {
    require_once $cfg;
    $configLoaded = true;
    break;
  }
}

// 2. Establecer zona horaria oficial del centro Casa Nei (Colima, México - UTC-6)
date_default_timezone_set('America/Mexico_City');

// 3. Cargar autoloader PSR-4
$autoloaderLoaded = false;
$posiblesAutoload = [
  __DIR__ . '/Shared/autoload.php',
  dirname(__DIR__) . '/src/Shared/autoload.php',
  dirname(__DIR__, 2) . '/.apps/casa-nei/Shared/autoload.php'
];

foreach ($posiblesAutoload as $al) {
  if (file_exists($al)) {
    require_once $al;
    $autoloaderLoaded = true;
    break;
  }
}

if (!$autoloaderLoaded) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'success' => false,
    'error' => 'No se pudo inicializar el autoloader de la aplicación.'
  ]);
  exit;
}

// 4. Configurar manejo de errores según DEBUG_MODE
if (defined('DEBUG_MODE') && DEBUG_MODE) {
  ini_set('display_errors', '1');
  ini_set('display_startup_errors', '1');
  error_reporting(E_ALL);
} else {
  ini_set('display_errors', '0');
  ini_set('display_startup_errors', '0');
  error_reporting(0);
}

// 5. Configurar el Contenedor de Inyección de Dependencias (PSR-11)
use App\Agenda\Controllers\AdminAuthController;
use App\Agenda\Controllers\AgendaController;
use App\Agenda\Controllers\ConfigController;
use App\Agenda\Controllers\PwaTestController;
use App\Agenda\Repositories\CitaRepository;
use App\Agenda\Repositories\ClienteRepository;
use App\Agenda\Repositories\HorarioRepository;
use App\Agenda\Repositories\ServicioRepository;
use App\Agenda\Services\AgendaService;
use App\Agenda\Services\DisponibilidadService;
use App\Shared\Container\Container;
use App\Shared\Db\DataBase;
use App\Shared\Http\Request;
use App\Shared\Security\Encryption;
use App\Shared\Services\WebPushService;

$container = Container::getInstance();

// 5.1 Servicios Base e Infraestructura
$container->singleton(DataBase::class, fn() => DataBase::getInstance());
$container->singleton(Encryption::class, fn() => new Encryption());
$container->singleton(WebPushService::class, fn(Container $c) => new WebPushService(
  db: $c->get(DataBase::class)
));

// 5.2 Repositorios de Persistencia
$container->singleton(ServicioRepository::class, fn(Container $c) => new ServicioRepository(
  db: $c->get(DataBase::class)
));
$container->singleton(ClienteRepository::class, fn(Container $c) => new ClienteRepository(
  db: $c->get(DataBase::class),
  crypto: $c->get(Encryption::class)
));
$container->singleton(HorarioRepository::class, fn(Container $c) => new HorarioRepository(
  db: $c->get(DataBase::class)
));
$container->singleton(CitaRepository::class, fn(Container $c) => new CitaRepository(
  db: $c->get(DataBase::class),
  crypto: $c->get(Encryption::class)
));

// 5.3 Servicios de Dominio y Negocio
$container->singleton(DisponibilidadService::class, fn(Container $c) => new DisponibilidadService(
  horarioRepo: $c->get(HorarioRepository::class),
  citaRepo: $c->get(CitaRepository::class),
  servicioRepo: $c->get(ServicioRepository::class)
));

$container->singleton(AgendaService::class, fn(Container $c) => new AgendaService(
  citaRepo: $c->get(CitaRepository::class),
  clienteRepo: $c->get(ClienteRepository::class),
  servicioRepo: $c->get(ServicioRepository::class),
  horarioRepo: $c->get(HorarioRepository::class),
  disponibilidadService: $c->get(DisponibilidadService::class),
  webPushService: $c->get(WebPushService::class),
  db: $c->get(DataBase::class)
));

// 5.4 Controladores HTTP
$container->singleton(AgendaController::class, fn(Container $c) => new AgendaController(
  agendaService: $c->get(AgendaService::class),
  disponibilidadService: $c->get(DisponibilidadService::class)
));

$container->singleton(AdminAuthController::class, fn(Container $c) => new AdminAuthController());

$container->singleton(PwaTestController::class, fn(Container $c) => new PwaTestController(
  webPushService: $c->get(WebPushService::class)
));

$container->singleton(ConfigController::class, fn(Container $c) => new ConfigController(
  servicioRepo: $c->get(ServicioRepository::class),
  horarioRepo: $c->get(HorarioRepository::class),
  clienteRepo: $c->get(ClienteRepository::class)
));

// 5.5 HTTP Request (Fábrica)
$container->factory(Request::class, fn() => new Request());

return $container;
