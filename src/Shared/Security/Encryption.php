<?php

namespace App\Shared\Security;

use Exception;

/**
 * Encryption - Servicio para cifrado simétrico AES-256 y hashing determinista de datos sensibles.
 *
 * Implementa:
 * - Cifrado simétrico AES-256-CBC con vector de inicialización (IV) criptográficamente seguro.
 * - Concatenación de IV prefijado al ciphertext para compatibilidad con campos MySQL VARBINARY / BLOB.
 * - Normalización canónica de números telefónicos para blind index consistente (búsquedas indexadas).
 * - Derivación determinista SHA-256 para indexación sin exposición de datos personales en claro.
 *
 * @package App\Shared\Security
 */
class Encryption
{
    /**
     * Algoritmo de cifrado simétrico empleado (256 bits en modo CBC).
     * @var string
     */
    private const CIPHER = 'AES-256-CBC';

    /**
     * Clave binaria de 32 bytes derivada con SHA-256 para operaciones con OpenSSL.
     * @var string
     */
    private string $key;

    /**
     * Inicializa el servicio de cifrado con la clave provista, la constante global ENCRYPTION_KEY o un fallback seguro.
     *
     * @param string|null $key Clave secreta personalizada (opcional).
     */
    public function __construct(?string $key = null)
    {
        if ($key !== null) {
            $this->key = hash('sha256', $key, true);
            return;
        }

        if (defined('ENCRYPTION_KEY')) {
            $this->key = hash('sha256', (string) ENCRYPTION_KEY, true);
            return;
        }

        // Clave por defecto si no está definida en config.php
        $fallbackKey = 'casa-nei-secret-encryption-key-2026';
        $this->key = hash('sha256', $fallbackKey, true);
    }

    /**
     * Normaliza un número telefónico eliminando espacios, guiones, símbolos y prefijos internacionales mexicanos (+52, 52, +521, 521).
     *
     * Convierte cualquier variante de marcación nacional a su formato canónico de 10 dígitos:
     * - "+52 312 122 7086"  => "3121227086"
     * - "5213121227086"     => "3121227086"
     * - "(312) 122-7086"    => "3121227086"
     * - "3121227086"        => "3121227086"
     *
     * Si el número es internacional de otro país (ej. +1 415 555 2671), conserva los dígitos limpios sin símbolos.
     *
     * @param string $phone Cadena de texto con el número telefónico sin normalizar.
     * @return string Número telefónico normalizado compuesto únicamente por dígitos.
     */
    public static function normalizePhone(string $phone): string
    {
        // 1. Extraer estrictamente los caracteres numéricos
        $digits = preg_replace('/\D+/', '', trim($phone));

        // 2. Si tiene prefijo internacional mexicano con código celular móvil (521 + 10 dígitos = 13 dígitos)
        if (str_starts_with($digits, '521') && strlen($digits) === 13) {
            return substr($digits, 3);
        }

        // 3. Si tiene prefijo internacional mexicano estándar (52 + 10 dígitos = 12 dígitos)
        if (str_starts_with($digits, '52') && strlen($digits) === 12) {
            return substr($digits, 2);
        }

        return $digits;
    }

    /**
     * Genera un hash determinista SHA-256 para búsquedas indexadas (blind index) en base de datos.
     *
     * Aplica previamente normalizePhone() para garantizar que variantes del mismo número generen el mismo hash.
     *
     * @param string $data Número telefónico o dato identificador.
     * @return string Hash hexadecimal SHA-256 de 64 caracteres.
     */
    public function hash(string $data): string
    {
        $normalized = self::normalizePhone($data);
        return hash('sha256', $normalized);
    }

    /**
     * Cifra un texto en claro empleando AES-256-CBC con vector de inicialización (IV) aleatorio y seguro.
     *
     * El resultado binario contiene el IV concatenado al inicio del texto cifrado (IV || Ciphertext),
     * adecuado para su almacenamiento en columnas MySQL VARBINARY o BLOB.
     *
     * @param string $plainText Texto sin cifrar.
     * @return string Bytes binarios con el IV y el texto cifrado.
     * @throws Exception Si la generación del vector aleatorio o el cifrado OpenSSL falla.
     */
    public function encrypt(string $plainText): string
    {
        $ivLength = openssl_cipher_iv_length(self::CIPHER);
        $iv = openssl_random_pseudo_bytes($ivLength);

        if ($iv === false) {
            throw new Exception("Error al generar el vector de inicialización (IV).");
        }

        $cipherRaw = openssl_encrypt(
            $plainText,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($cipherRaw === false) {
            throw new Exception("Error al cifrar los datos sensibles.");
        }

        // Concatenamos el IV al inicio del ciphertext para posibilitar el descifrado
        return $iv . $cipherRaw;
    }

    /**
     * Desencripta un valor binario generado previamente por encrypt().
     *
     * Separa los primeros 16 bytes correspondientes al IV y descifra el payload restante con AES-256-CBC.
     *
     * @param string|null $cipherData Cadena de bytes binarios (IV || Ciphertext) o null.
     * @return string|null El texto en claro original, o null si el dato es nulo, vacío o inválido.
     */
    public function decrypt(?string $cipherData): ?string
    {
        if ($cipherData === null || $cipherData === '') {
            return null;
        }

        $ivLength = openssl_cipher_iv_length(self::CIPHER);
        if (strlen($cipherData) <= $ivLength) {
            return null;
        }

        $iv = substr($cipherData, 0, $ivLength);
        $rawCipher = substr($cipherData, $ivLength);

        $plain = openssl_decrypt(
            $rawCipher,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv
        );

        return $plain !== false ? $plain : null;
    }
}

