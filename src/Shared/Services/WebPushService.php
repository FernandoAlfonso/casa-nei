<?php

namespace App\Shared\Services;

use Exception;

/**
 * WebPushService - Servicio nativo en PHP para la emisión de notificaciones Web Push.
 *
 * Implementa de manera autocontenida y sin dependencias externas:
 * - RFC 8292: Voluntary Application Server Identification (VAPID) para Web Push (JWT ES256).
 * - RFC 8291: Message Encryption for Web Push (Content-Encoding: aes128gcm sobre curvas elípticas P-256).
 * - Despacho HTTP hacia los servicios push oficiales:
 *     - Google FCM (Firebase Cloud Messaging / Chrome / Android): https://fcm.googleapis.com
 *     - Apple APNs (Apple Push Notification service / Safari / iOS): https://web.push.apple.com
 *     - Mozilla Push Service (Firefox): https://updates.push.services.mozilla.com
 *
 * @package App\Shared\Services
 */
class WebPushService
{
  /**
   * Ruta al archivo de almacenamiento persistente de las llaves VAPID.
   */
  private string $keysFilePath;

  /**
   * Ruta al archivo de suscripciones guardadas para pruebas.
   */
  private string $subsFilePath;

  /**
   * Sujeto de contacto para VAPID (mailto o URL oficial).
   */
  private string $subject;

  /**
   * Constructor del servicio.
   *
   * @param string|null $storageDir Directorio para almacenar credenciales y suscripciones.
   * @param string $subject Correo de contacto del operador del servicio VAPID.
   */
  public function __construct(?string $storageDir = null, string $subject = 'mailto:casaneicolima@gmail.com')
  {
    $dir = $storageDir ?? dirname(__DIR__) . '/Security/storage';
    if (!is_dir($dir)) {
      @mkdir($dir, 0750, true);
    }
    $this->keysFilePath = $dir . '/vapid_keys.json';
    $this->subsFilePath = $dir . '/pwa_subscriptions.json';
    $this->subject = $subject;
  }

  /**
   * Obtiene la clave pública VAPID en formato Base64Url para el cliente (pushManager.subscribe).
   *
   * @return string Clave pública P-256 sin comprimir (65 bytes) en Base64Url.
   * @throws Exception Si no se pueden generar o cargar las llaves.
   */
  public function getPublicKey(): string
  {
    $keys = $this->obtenerOCrearLlavesVapid();
    return $keys['publicKey'];
  }

  /**
   * Guarda o actualiza la suscripción push de un dispositivo cliente.
   *
   * @param array $subscription Datos de suscripción ({ endpoint, keys: { p256dh, auth } }).
   * @return bool True si se guardó correctamente.
   */
  public function guardarSuscripcion(array $subscription): bool
  {
    if (empty($subscription['endpoint']) || empty($subscription['keys']['p256dh']) || empty($subscription['keys']['auth'])) {
      return false;
    }

    $subscriptions = $this->obtenerSuscripciones();
    $endpoint = $subscription['endpoint'];
    $subscription['actualizado_el'] = date('Y-m-d H:i:s');
    $subscriptions[$endpoint] = $subscription;

    return (bool) file_put_contents($this->subsFilePath, json_encode($subscriptions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  }

  /**
   * Obtiene la lista de todas las suscripciones guardadas.
   *
   * @return array<string, array> Mapa de suscripciones indexadas por endpoint.
   */
  public function obtenerSuscripciones(): array
  {
    if (!file_exists($this->subsFilePath)) {
      return [];
    }
    $content = file_get_contents($this->subsFilePath);
    return json_decode($content, true) ?: [];
  }

  /**
   * Obtiene la última suscripción registrada.
   *
   * @return array|null Última suscripción o null si no hay ninguna.
   */
  public function obtenerUltimaSuscripcion(): ?array
  {
    $subs = $this->obtenerSuscripciones();
    if (empty($subs)) {
      return null;
    }
    return end($subs);
  }

  /**
   * Envía una notificación Web Push a una suscripción específica mediante Google FCM o Apple APNs.
   *
   * @param array $subscription Objeto de suscripción ({ endpoint, keys: { p256dh, auth } }).
   * @param array $payload Datos a enviar (ej: title, body, data, actions).
   * @return array Resultado de la entrega con estado HTTP, servicio detectado y detalle.
   * @throws Exception En caso de error de cifrado o conexión.
   */
  public function enviarNotificacion(array $subscription, array $payload): array
  {
    $endpoint = $subscription['endpoint'] ?? '';
    $p256dh = $subscription['keys']['p256dh'] ?? '';
    $auth = $subscription['keys']['auth'] ?? '';

    if (empty($endpoint) || empty($p256dh) || empty($auth)) {
      throw new Exception("Suscripción incompleta: faltan endpoint, p256dh o auth.");
    }

    // 1. Identificar el servicio push receptor
    $servicioPush = match (true) {
      str_contains($endpoint, 'fcm.googleapis.com') => 'Google FCM (Android / Chrome)',
      str_contains($endpoint, 'push.apple.com') => 'Apple APNs (iOS / Safari)',
      str_contains($endpoint, 'mozilla.com') => 'Mozilla Push (Firefox)',
      default => 'Web Push Gateway Estándar'
    };

    // 2. Obtener llaves VAPID del servidor
    $vapidKeys = $this->obtenerOCrearLlavesVapid();

    // 3. Generar token JWT VAPID firmado con ES256
    $jwt = $this->generarVapidJwt($endpoint, $vapidKeys);

    // 4. Cifrar la carga útil mediante RFC 8291 (aes128gcm)
    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $cifrado = $this->cifrarPayloadRfc8291($payloadJson, $p256dh, $auth);

    // 5. Preparar encabezados HTTP para RFC 8030 / RFC 8292
    $headers = [
      'Content-Type: application/octet-stream',
      'Content-Encoding: aes128gcm',
      'Content-Length: ' . strlen($cifrado['body']),
      'TTL: 86400',
      'Urgency: high',
      'Authorization: vapid t=' . $jwt . ', k=' . $vapidKeys['publicKey']
    ];

    // 6. Enviar petición HTTP POST vía cURL
    $ch = curl_init();
    curl_setopt_array($ch, [
      CURLOPT_URL => $endpoint,
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => $cifrado['body'],
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 15,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_HEADER => true
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    if ($response === false) {
      throw new Exception("Error cURL al contactar {$servicioPush}: {$curlError}");
    }

    $responseBody = substr($response, $headerSize);

    // Códigos 201 Created (Google/Apple) o 200/202 indican entrega exitosa al broker
    $exitoso = in_array($httpCode, [200, 201, 202], true);

    return [
      'exito' => $exitoso,
      'http_code' => $httpCode,
      'servicio' => $servicioPush,
      'endpoint' => $endpoint,
      'respuesta' => $responseBody ?: 'Mensaje encolado exitosamente por el servicio push.',
      'fecha' => date('Y-m-d H:i:s')
    ];
  }

  /**
   * Carga o genera las llaves VAPID requeridas para la aplicación.
   *
   * @return array{publicKey: string, privateKeyPem: string}
   * @throws Exception
   */
  private function obtenerOCrearLlavesVapid(): array
  {
    if (file_exists($this->keysFilePath)) {
      $data = json_decode(file_get_contents($this->keysFilePath), true);
      if (!empty($data['publicKey']) && !empty($data['privateKeyPem'])) {
        return $data;
      }
    }

    // Generar nuevo par de llaves EC prime256v1 (P-256)
    $config = [
      'curve_name' => 'prime256v1',
      'private_key_type' => OPENSSL_KEYTYPE_EC
    ];
    $res = openssl_pkey_new($config);
    if (!$res) {
      throw new Exception("No se pudo generar la clave elíptica P-256: " . openssl_error_string());
    }

    openssl_pkey_export($res, $pem);
    $details = openssl_pkey_get_details($res);
    $rawPub = "\x04" . $details['ec']['x'] . $details['ec']['y'];

    $keys = [
      'publicKey' => self::base64UrlEncode($rawPub),
      'privateKeyPem' => $pem,
      'creado_el' => date('Y-m-d H:i:s')
    ];

    file_put_contents($this->keysFilePath, json_encode($keys, JSON_PRETTY_PRINT));
    return $keys;
  }

  /**
   * Genera y firma el token JWT para autenticación VAPID ante Google / Apple.
   *
   * @param string $endpoint URL del endpoint de la suscripción.
   * @param array $vapidKeys Claves VAPID del servidor.
   * @return string JWT codificado.
   * @throws Exception
   */
  private function generarVapidJwt(string $endpoint, array $vapidKeys): string
  {
    $parsed = parse_url($endpoint);
    $audience = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '');

    $header = ['typ' => 'JWT', 'alg' => 'ES256'];
    $claims = [
      'aud' => $audience,
      'exp' => time() + 43200, // 12 horas
      'sub' => $this->subject
    ];

    $headerB64 = self::base64UrlEncode(json_encode($header));
    $claimsB64 = self::base64UrlEncode(json_encode($claims));
    $dataToSign = $headerB64 . '.' . $claimsB64;

    $privKeyRes = openssl_pkey_get_private($vapidKeys['privateKeyPem']);
    if (!$privKeyRes) {
      throw new Exception("Error al cargar la clave privada VAPID.");
    }

    if (!openssl_sign($dataToSign, $derSignature, $privKeyRes, OPENSSL_ALGO_SHA256)) {
      throw new Exception("Error al firmar token VAPID con ES256: " . openssl_error_string());
    }

    $rawSignature = self::derToRawSignature($derSignature);
    return $dataToSign . '.' . self::base64UrlEncode($rawSignature);
  }

  /**
   * Cifra la carga útil según la especificación RFC 8291 (Content-Encoding: aes128gcm).
   *
   * @param string $payload Contenido en texto plano (generalmente JSON).
   * @param string $clientPubB64 Clave pública P-256 del cliente en Base64Url.
   * @param string $clientAuthB64 Secreto de autenticación del cliente en Base64Url.
   * @return array{body: string}
   * @throws Exception
   */
  private function cifrarPayloadRfc8291(string $payload, string $clientPubB64, string $clientAuthB64): array
  {
    $clientPubRaw = self::base64UrlDecode($clientPubB64);
    $clientAuthRaw = self::base64UrlDecode($clientAuthB64);

    if (strlen($clientPubRaw) !== 65) {
      throw new Exception("La clave pública del cliente no tiene la longitud esperada de 65 bytes.");
    }

    // 1. Generar par de llaves efímero del servidor
    $serverRes = openssl_pkey_new([
      'curve_name' => 'prime256v1',
      'private_key_type' => OPENSSL_KEYTYPE_EC
    ]);
    $serverDetails = openssl_pkey_get_details($serverRes);
    $serverPubRaw = "\x04" . $serverDetails['ec']['x'] . $serverDetails['ec']['y'];

    // 2. Importar la clave pública del cliente para ECDH
    $spkiHeader = hex2bin("3059301306072a8648ce3d020106082a8648ce3d030107034200");
    $clientDer = $spkiHeader . $clientPubRaw;
    $clientPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($clientDer), 64, "\n") . "-----END PUBLIC KEY-----\n";
    $clientPubRes = openssl_pkey_get_public($clientPem);
    if (!$clientPubRes) {
      throw new Exception("No se pudo importar la clave pública del cliente para el intercambio ECDH.");
    }

    // 3. Derivar secreto compartido ECDH
    $sharedSecret = openssl_pkey_derive($clientPubRes, $serverRes, 32);
    if ($sharedSecret === false) {
      throw new Exception("Fallo en la derivación de clave compartida ECDH.");
    }

    // 4. Derivación de claves con HKDF (RFC 8291)
    $salt = random_bytes(16);
    $keyInfo = "WebPush: info\x00" . $clientPubRaw . $serverPubRaw;
    $prk = hash_hkdf('sha256', $sharedSecret, 32, $keyInfo, $clientAuthRaw);
    $cek = hash_hkdf('sha256', $prk, 16, "Content-Encoding: aes128gcm\x00", $salt);
    $nonce = hash_hkdf('sha256', $prk, 12, "Content-Encoding: nonce\x00", $salt);

    // 5. Cifrado simétrico AES-128-GCM con delimitador de registro RFC 8291 (0x02)
    $padded = $payload . "\x02";
    $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    if ($ciphertext === false) {
      throw new Exception("Error durante el cifrado aes-128-gcm del mensaje Web Push.");
    }

    // 6. Ensamblado del cuerpo RFC 8291:
    // salt (16) || rs (4) || idlen (1) || keyid (65) || ciphertext || tag (16)
    $rs = pack('N', 4096);
    $idlen = chr(strlen($serverPubRaw));
    $body = $salt . $rs . $idlen . $serverPubRaw . $ciphertext . $tag;

    return ['body' => $body];
  }

  /**
   * Convierte una firma ASN.1 DER generada por OpenSSL a formato IEEE P1363 (64 bytes R||S) para ES256 JWT.
   *
   * @param string $der Firma en formato ASN.1 DER.
   * @return string Firma en formato crudo de 64 bytes.
   * @throws Exception
   */
  private static function derToRawSignature(string $der): string
  {
    $hex = bin2hex($der);
    $pos = 0;
    if (substr($hex, 0, 2) !== '30') {
      throw new Exception("Firma DER inválida.");
    }
    $pos = 4; // Saltar 30 y longitud

    // R
    if (substr($hex, $pos, 2) !== '02') {
      throw new Exception("Se esperaba entero para R en firma DER.");
    }
    $pos += 2;
    $rLen = hexdec(substr($hex, $pos, 2)) * 2;
    $pos += 2;
    $r = substr($hex, $pos, $rLen);
    $pos += $rLen;

    // S
    if (substr($hex, $pos, 2) !== '02') {
      throw new Exception("Se esperaba entero para S en firma DER.");
    }
    $pos += 2;
    $sLen = hexdec(substr($hex, $pos, 2)) * 2;
    $pos += 2;
    $s = substr($hex, $pos, $sLen);

    // Asegurar 32 bytes (64 caracteres hexadecimales) por componente
    $r = str_pad(ltrim($r, '0'), 64, '0', STR_PAD_LEFT);
    $s = str_pad(ltrim($s, '0'), 64, '0', STR_PAD_LEFT);

    return hex2bin($r . $s);
  }

  /**
   * Codifica datos en Base64 seguro para URLs (RFC 4648 §5).
   */
  public static function base64UrlEncode(string $data): string
  {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }

  /**
   * Decodifica datos en Base64Url (RFC 4648 §5).
   */
  public static function base64UrlDecode(string $data): string
  {
    $remainder = strlen($data) % 4;
    if ($remainder) {
      $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
  }
}
