/**
 * Casa Nei - Cliente HTTP para API Administrativa
 *
 * Encapsula llamadas fetch con cabeceras de autorización JWT y control de caché
 * estricto (cache: 'no-store') para prevenir caché heurístico en móviles.
 *
 * @module services/api
 */

/**
 * Servicio utilitario para peticiones API.
 */
export default class ApiService {
  /**
   * Obtiene la URL base de la API según el entorno.
   *
   * @returns {string} URL base del backend
   */
  static getApiBase() {
    if (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/casa-nei')) {
      return '/casa-nei/api';
    }
    return '/api';
  }

  /**
   * Obtiene el token JWT del administrador almacenado en localStorage.
   *
   * @returns {string|null} Token JWT o null si no ha iniciado sesión
   */
  static getToken() {
    return localStorage.getItem('admin_token');
  }

  /**
   * Realiza una petición HTTP fetch autenticada.
   *
   * @param {string} endpoint - Ruta relativa del endpoint
   * @param {RequestInit} [options={}] - Opciones de fetch
   * @returns {Promise<any>} Datos JSON de respuesta
   * @throws {Error} Si el servidor responde con error HTTP
   */
  static async request(endpoint, options = {}) {
    const url = `${this.getApiBase()}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido: limpiar sesión y redireccionar
          localStorage.removeItem('admin_token');
          window.location.hash = '#login';
        }
        throw new Error(data.error || data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error(`[API] Error on ${url}:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta una petición GET con flag cache: 'no-store' estricto.
   *
   * @param {string} endpoint - Endpoint a consultar
   * @returns {Promise<any>}
   */
  static async get(endpoint) {
    return this.request(endpoint, { method: 'GET', cache: 'no-store' });
  }

  /**
   * Ejecuta una petición POST enviando cuerpo JSON.
   *
   * @param {string} endpoint - Endpoint destino
   * @param {Object} body - Objeto a serializar como JSON
   * @returns {Promise<any>}
   */
  static async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}
