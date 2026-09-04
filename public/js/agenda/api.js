/**
 * Casa Nei - Cliente API REST para Agenda y Citas
 * @module api
 */

/**
 * @typedef {Object} Servicio
 * @property {number} id
 * @property {string} nombre
 * @property {string} [descripcion]
 * @property {number} duracion_minutos
 * @property {number|string} precio
 * @property {number} activo
 */

/**
 * @typedef {Object} DiaCalendario
 * @property {string} fecha - Formato YYYY-MM-DD
 * @property {number} dia_semana - 0=Dom, 1=Lun, ..., 6=Sáb
 * @property {'disponible'|'ocupado'|'bloqueado'|'cerrado'} estado
 * @property {string|null} motivo
 * @property {number} slots_libres
 * @property {boolean} tiene_pendientes
 */

/**
 * @typedef {Object} SlotHora
 * @property {string} hora_inicio - Formato HH:MM
 * @property {string} hora_fin - Formato HH:MM
 * @property {string} hora_inicio_completa - Formato HH:MM:SS
 * @property {string} hora_fin_completa - Formato HH:MM:SS
 */

/**
 * @typedef {Object} Cliente
 * @property {number} id
 * @property {string} nombre_completo
 * @property {string} telefono
 */

/**
 * @typedef {Object} CitaPayload
 * @property {string} nombre_completo
 * @property {string} telefono
 * @property {number} servicio_id
 * @property {string} fecha_cita
 * @property {string} hora_inicio
 * @property {string} [notas_cliente]
 */

/**
 * @typedef {Object} CitaResponse
 * @property {number} cita_id
 * @property {string} codigo_cita
 * @property {string} estado
 * @property {string} fecha_cita
 * @property {string} hora_inicio
 * @property {Servicio} servicio
 * @property {Cliente} cliente
 * @property {string} whatsapp_url
 */

export class AgendaApi {
  /**
   * @param {string} [baseUrl='/api'] - Ruta base de la API REST.
   */
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Realiza una petición HTTP genérica con captura y parseo de errores de API.
   * @private
   * @param {string} endpoint
   * @param {RequestInit} [options={}]
   * @returns {Promise<any>}
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });

      const json = await response.json().catch(() => ({
        success: false,
        error: `Respuesta inválida del servidor (HTTP ${response.status})`
      }));

      if (!response.ok || !json.success) {
        const errorMsg = json.error || json.message || `Error en la solicitud (HTTP ${response.status})`;
        const errorObj = new Error(errorMsg);
        errorObj.status = response.status;
        errorObj.data = json;
        throw errorObj;
      }

      return json.data;
    } catch (err) {
      if (err.name === 'TypeError') {
        throw new Error('No se pudo establecer conexión con el servidor. Revisa tu conexión a internet.');
      }
      throw err;
    }
  }

  /**
   * Obtiene la lista de servicios activos.
   * @returns {Promise<Servicio[]>}
   */
  async obtenerServicios() {
    return this._request('/servicios');
  }

  /**
   * Obtiene la disponibilidad del calendario de los próximos días.
   * @param {number} servicioId - ID del servicio seleccionado.
   * @param {number} [semanas=4] - Semanas a proyectar.
   * @returns {Promise<DiaCalendario[]>}
   */
  async obtenerCalendario(servicioId, semanas = 4) {
    const params = new URLSearchParams({
      servicio_id: String(servicioId),
      semanas: String(semanas)
    });
    return this._request(`/calendario?${params.toString()}`);
  }

  /**
   * Obtiene los horarios específicos disponibles para un día y servicio.
   * @param {string} fecha - Formato YYYY-MM-DD.
   * @param {number} servicioId - ID del servicio seleccionado.
   * @returns {Promise<SlotHora[]>}
   */
  async obtenerHorasDisponibles(fecha, servicioId) {
    const params = new URLSearchParams({
      fecha: fecha,
      servicio_id: String(servicioId)
    });
    return this._request(`/horas-disponibles?${params.toString()}`);
  }

  /**
   * Consulta si existe un cliente con el teléfono proporcionado.
   * @param {string} telefono - Teléfono normalizado de 10 dígitos.
   * @returns {Promise<Cliente|null>}
   */
  async consultarCliente(telefono) {
    return this._request('/cliente/consultar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono })
    });
  }

  /**
   * Registra una nueva solicitud de cita y genera el enlace de WhatsApp.
   * @param {CitaPayload} payload
   * @returns {Promise<CitaResponse>}
   */
  async agendarCita(payload) {
    return this._request('/citas/agendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}
