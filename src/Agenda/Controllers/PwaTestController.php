<?php

namespace App\Agenda\Controllers;

use App\Shared\Http\Request;
use App\Shared\Http\Response;
use App\Shared\Services\WebPushService;
use Exception;
use Throwable;

/**
 * PwaTestController - Controlador para la prueba aislada de PWA y Web Push Notifications.
 *
 * Expone endpoints REST para:
 * - Obtener la clave pública VAPID requerida por el navegador.
 * - Registrar la suscripción push (Google FCM / Apple APNs) del celular.
 * - Disparar el envío de la notificación Web Push real tras el temporizador de 3 segundos.
 * - Confirmar la cita de prueba en 1 solo toque.
 *
 * @package App\Agenda\Controllers
 */
class PwaTestController
{
  /**
   * Servicio de Web Push (RFC 8291 + RFC 8292).
   */
  private WebPushService $webPushService;

  /**
   * Constructor del controlador.
   *
   * @param WebPushService|null $webPushService Instancia inyectada o nueva.
   */
  public function __construct(?WebPushService $webPushService = null)
  {
    $this->webPushService = $webPushService ?? new WebPushService();
  }

  /**
   * GET /api/pwa/vapid-key
   *
   * Retorna la clave pública VAPID en Base64Url para ser utilizada por
   * registration.pushManager.subscribe() en el Service Worker.
   *
   * @param Request $request
   * @return void
   */
  public function obtenerVapidKey(Request $request): void
  {
    try {
      $publicKey = $this->webPushService->getPublicKey();
      Response::success([
        'publicKey' => $publicKey
      ], "Clave pública VAPID obtenida con éxito");
    } catch (Throwable $e) {
      Response::error("Error al obtener la clave VAPID: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/pwa/suscribir
   *
   * Recibe y persiste los datos de suscripción generados por el navegador
   * ({ endpoint, keys: { p256dh, auth } }).
   *
   * @param Request $request
   * @return void
   */
  public function suscribirDispositivo(Request $request): void
  {
    try {
      $endpoint = (string) $request->get('endpoint', '');
      $keys = (array) $request->get('keys', []);

      if (empty($endpoint) || empty($keys['p256dh']) || empty($keys['auth'])) {
        Response::error("Datos de suscripción incompletos. Se requieren endpoint, p256dh y auth.", 422);
      }

      $subscription = [
        'endpoint' => $endpoint,
        'keys' => [
          'p256dh' => (string) $keys['p256dh'],
          'auth' => (string) $keys['auth']
        ],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
      ];

      $guardado = $this->webPushService->guardarSuscripcion($subscription);
      if (!$guardado) {
        Response::error("No se pudo persistir la suscripción en el servidor.", 500);
      }

      // Determinar el proveedor
      $proveedor = match (true) {
        str_contains($endpoint, 'fcm.googleapis.com') => 'Google FCM (Android / Chrome)',
        str_contains($endpoint, 'push.apple.com') => 'Apple APNs (iOS / Safari)',
        default => 'Servicio Push Estándar'
      };

      Response::success([
        'proveedor' => $proveedor,
        'endpoint' => $endpoint,
        'registrado' => true
      ], "Dispositivo suscrito exitosamente a {$proveedor}");
    } catch (Throwable $e) {
      Response::error("Error al registrar la suscripción: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/pwa/enviar-prueba
   *
   * Despacha un mensaje Web Push real al celular suscrito a través de Google FCM o Apple APNs.
   * Si se especifica el parámetro 'delay', el servidor espera ese número de segundos antes
   * de enviar, garantizando la entrega incluso si la pantalla del teléfono se apaga de inmediato.
   *
   * @param Request $request
   * @return void
   */
  public function enviarNotificacionPrueba(Request $request): void
  {
    try {
      // Obtener la última suscripción o la enviada en el cuerpo
      $subEnviada = $request->get('subscription');
      $subscription = is_array($subEnviada) && !empty($subEnviada['endpoint'])
        ? $subEnviada
        : $this->webPushService->obtenerUltimaSuscripcion();

      if (!$subscription) {
        Response::error("No hay ningún dispositivo suscrito aún. Por favor activa las notificaciones primero.", 404);
      }

      // Tiempo de espera opcional en segundos antes de despachar (por defecto 3s para el requerimiento)
      $delay = (int) $request->get('delay', 0);
      if ($delay > 0 && $delay <= 10) {
        sleep($delay);
      }

      // Datos de la cita de prueba simulada
      $citaId = 101;
      $paciente = (string) $request->get('paciente', 'María López');
      $servicio = (string) $request->get('servicio', 'Acupuntura Tradicional');
      $hora = (string) $request->get('hora', 'Hoy a las 17:00 hrs');

      // Carga útil estructurada para el Service Worker
      $payload = [
        'title' => '🔔 Solicitud de Cita - Casa Nei',
        'body' => "{$paciente} solicita cita para {$servicio} ({$hora}). Toca para confirmar en 1 toque.",
        'icon' => '/pwa-test/icons/icon-192.png',
        'badge' => '/pwa-test/icons/icon-192.png',
        'tag' => 'cita-' . $citaId,
        'renotify' => true,
        'data' => [
          'cita_id' => $citaId,
          'paciente' => $paciente,
          'servicio' => $servicio,
          'hora' => $hora,
          'telefono' => '+52 312 123 4567',
          'url' => '/pwa-test/confirmar.html?cita_id=' . $citaId . '&paciente=' . urlencode($paciente)
        ],
        'actions' => [
          [
            'action' => 'confirmar',
            'title' => '✅ Confirmar Cita'
          ],
          [
            'action' => 'ver',
            'title' => '📋 Ver Detalles'
          ]
        ]
      ];

      // Despacho oficial al servicio de Google FCM o Apple APNs
      $resultado = $this->webPushService->enviarNotificacion($subscription, $payload);

      if ($resultado['exito']) {
        Response::success($resultado, "Notificación Web Push enviada con éxito a través de {$resultado['servicio']}");
      } else {
        Response::error("El servicio push retornó código {$resultado['http_code']}: {$resultado['respuesta']}", 502);
      }
    } catch (Throwable $e) {
      Response::error("Error al enviar notificación push: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/pwa/confirmar-cita
   *
   * Confirma la cita en 1 toque (invocado desde el botón de la vista o desde el Service Worker).
   *
   * @param Request $request
   * @return void
   */
  public function confirmarCitaPrueba(Request $request): void
  {
    try {
      $citaId = (int) $request->get('cita_id', 101);
      $paciente = (string) $request->get('paciente', 'María López');
      $telefono = (string) $request->get('telefono', '+52 312 123 4567');
      $servicio = (string) $request->get('servicio', 'Acupuntura Tradicional');
      $hora = (string) $request->get('hora', 'Hoy a las 17:00 hrs');

      // Generar mensaje pre-redactado de WhatsApp para el paciente
      $mensajeWhatsApp = "Hola {$paciente}, confirmamos tu cita de {$servicio} en Casa Nei para {$hora}. ¡Te esperamos con gusto en nuestras instalaciones!";
      $enlaceWhatsApp = "https://wa.me/" . preg_replace('/[^0-9]/', '', $telefono) . "?text=" . urlencode($mensajeWhatsApp);

      $respuesta = [
        'cita_id' => $citaId,
        'estado' => 'confirmada',
        'paciente' => $paciente,
        'servicio' => $servicio,
        'hora' => $hora,
        'whatsapp_url' => $enlaceWhatsApp,
        'mensaje' => "Cita #{$citaId} confirmada exitosamente en 1 toque."
      ];

      Response::success($respuesta, "Cita confirmada exitosamente");
    } catch (Throwable $e) {
      Response::error("Error al confirmar cita: " . $e->getMessage(), 500);
    }
  }

  /**
   * GET /api/pwa/estado
   *
   * Retorna el estado general de la configuración PWA y la última suscripción registrada.
   *
   * @param Request $request
   * @return void
   */
  public function obtenerEstado(Request $request): void
  {
    try {
      $ultimaSub = $this->webPushService->obtenerUltimaSuscripcion();
      $publicKey = $this->webPushService->getPublicKey();

      Response::success([
        'hay_suscripcion' => !empty($ultimaSub),
        'proveedor_detectado' => $ultimaSub ? (
          str_contains($ultimaSub['endpoint'], 'fcm.googleapis.com') ? 'Google FCM' : (
            str_contains($ultimaSub['endpoint'], 'push.apple.com') ? 'Apple APNs' : 'Web Push'
          )
        ) : null,
        'fecha_suscripcion' => $ultimaSub['actualizado_el'] ?? null,
        'vapid_public_key' => $publicKey
      ], "Estado de PWA recuperado");
    } catch (Throwable $e) {
      Response::error("Error al consultar estado PWA: " . $e->getMessage(), 500);
    }
  }
}
