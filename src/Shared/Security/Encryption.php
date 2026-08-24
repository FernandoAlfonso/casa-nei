<?php

namespace App\Shared\Security;

use Exception;

/**
 * Encryption - Servicio para cifrado simétrico AES-256 y hashing de datos sensibles.
 */
class Encryption
{
    private const CIPHER = 'AES-256-CBC';
    private string $key;

    /**
     * @param string|null $key Clave secreta de 32 bytes (si es nula, busca la constante ENCRYPTION_KEY)
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

        // Clave por defecto si no está definida en config.php (se recomienda definir ENCRYPTION_KEY en config.php)
        $fallbackKey = 'casa-nei-secret-encryption-key-2026';
        $this->key = hash('sha256', $fallbackKey, true);
    }

    /**
     * Normaliza un número telefónico eliminando espacios, guiones y caracteres no numéricos.
     */
    public static function normalizePhone(string $phone): string
    {
        return preg_replace('/[^\d+]/', '', trim($phone));
    }

    /**
     * Genera un hash determinista SHA-256 para búsquedas indexadas (blind index).
     */
    public function hash(string $data): string
    {
        $normalized = self::normalizePhone($data);
        return hash('sha256', $normalized);
    }

    /**
     * Cifra un texto en claro empleando AES-256-CBC con vector de inicialización (IV) seguro.
     * Retorna los bytes binarios (adecuado para campos VARBINARY o BLOB).
     *
     * @throws Exception Si la generación del IV o el cifrado falla
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

        // Concatenamos el IV al inicio del ciphertext para poder desencriptar luego
        return $iv . $cipherRaw;
    }

    /**
     * Desencripta un valor binario cifrado previamente con encrypt().
     *
     * @return string|null El texto en claro o null si el descifrado falla
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
