<?php
namespace App\Agenda\Services;

use App\Agenda\Entities\Cita;
use App\Agenda\Entities\Cliente;
use App\Agenda\Entities\Servicio;
use App\Agenda\Repositories\ClienteRepository;
use App\Shared\Services\WebPushService;
use Throwable;

class NotificationService
{
    private WebPushService $webPushService;
    private ClienteRepository $clienteRepo;

    public function __construct(WebPushService $webPushService, ClienteRepository $clienteRepo)
    {
        $this->webPushService = $webPushService;
        $this->clienteRepo = $clienteRepo;
    }

    /**
     * Notifica de forma asíncrona o no bloqueante al Administrador en su PWA cuando se agenda una cita.
     *
     * @param Cita $cita
     * @param Cliente $cliente
     * @param Servicio $servicio
     * @return void
     */
    public function notificarAdminNuevaCita(Cita $cita, Cliente $cliente, Servicio $servicio): void
    {
        try {
            $subs = $this->webPushService->obtenerSuscripciones();
            if (empty($subs)) {
                error_log("Push Admin: 0 suscripciones activas encontradas.");
                return;
            }
            error_log("Push Admin: " . count($subs) . " suscripciones encontradas.");

            $horaFormato = DisponibilidadService::formatearHoraAmPm(substr($cita->getHoraInicio(), 0, 5));
            $telefonoTexto = $this->clienteRepo->descifrarTelefono($cliente) ?? 'Sin celular';

            $uri = $_SERVER['REQUEST_URI'] ?? '';
            $baseApp = str_starts_with($uri, '/casa-nei') ? '/casa-nei/' : '/';
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $fullBase = "{$scheme}://{$host}{$baseApp}";

            $urlAdmin = "{$fullBase}admin/agenda/?cita_id={$cita->getId()}";
            $iconUrl = "{$fullBase}admin/agenda/icons/icon-192.png";

            $payload = [
                'title' => '🔔 Nueva Solicitud de Cita - Casa Nei',
                'body' => "{$cliente->getNombreCompleto()} solicita {$servicio->getNombre()} ({$cita->getFechaCita()} a las {$horaFormato}). Verifica en WhatsApp el código [{$cita->getCodigoCita()}] antes de confirmar.",
                'icon' => $iconUrl,
                'badge' => $iconUrl,
                'tag' => 'cita-' . $cita->getId(),
                'renotify' => true,
                'data' => [
                    'cita_id' => $cita->getId(),
                    'codigo_cita' => $cita->getCodigoCita(),
                    'paciente' => $cliente->getNombreCompleto(),
                    'telefono' => $telefonoTexto,
                    'servicio' => $servicio->getNombre(),
                    'fecha' => $cita->getFechaCita(),
                    'hora' => $horaFormato,
                    'tiene_whatsapp' => $cita->tieneWhatsapp(),
                    'canal' => $cita->getCanal(),
                    'url' => $urlAdmin
                ]
            ];

            foreach ($subs as $sub) {
                try {
                    $res = $this->webPushService->enviarNotificacion($sub, $payload);
                    error_log("Push Admin exitoso a {$sub['endpoint']}: HTTP " . $res['http_code']);
                } catch (Throwable $e) {
                    error_log("Aviso: Notificación Web Push a Admin no entregada a endpoint {$sub['endpoint']}: " . $e->getMessage());
                }
            }
        } catch (Throwable $e) {
            error_log("Aviso: Error general al notificar Web Push a Admin: " . $e->getMessage());
        }
    }
}
