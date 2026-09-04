/**
 * Casa Nei - Almacén de Estado Central (Store) para la Agenda
 * Patrón Observable con mutaciones controladas y suscripciones.
 * @module store
 */

/**
 * @typedef {Object} AgendaState
 * @property {number} step - Paso actual del flujo (1: Servicio, 2: Fecha, 3: Horario, 4: Confirmación, 5: Éxito)
 * @property {import('./api.js').Servicio[]} servicios - Catálogo de servicios disponibles
 * @property {import('./api.js').Servicio|null} servicioSeleccionado - Servicio actualmente seleccionado
 * @property {import('./api.js').DiaCalendario[]} calendario - Días del calendario disponibles
 * @property {string|null} fechaSeleccionada - Fecha seleccionada en formato YYYY-MM-DD
 * @property {import('./api.js').SlotHora[]} horasDisponibles - Horarios libres para la fecha seleccionada
 * @property {import('./api.js').SlotHora|null} horaSeleccionada - Horario seleccionado
 * @property {import('./api.js').Cliente|null} cliente - Cliente recurrente reconocido
 * @property {import('./api.js').CitaResponse|null} citaExitosa - Datos de la cita confirmada
 * @property {boolean} loading - Bandera de carga general
 * @property {string} loadingMessage - Mensaje explicativo del estado de carga
 * @property {string|null} error - Mensaje de error actual o null
 */

export class AgendaStore {
  constructor() {
    /** @type {AgendaState} */
    this._state = {
      step: 1,
      servicios: [],
      servicioSeleccionado: null,
      calendario: [],
      fechaSeleccionada: null,
      horasDisponibles: [],
      horaSeleccionada: null,
      cliente: null,
      citaExitosa: null,
      loading: false,
      loadingMessage: '',
      error: null
    };

    /** @type {Set<Function>} */
    this._subscribers = new Set();
  }

  /**
   * Retorna una copia de lectura del estado actual.
   * @returns {AgendaState}
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Suscribe una función escucha a los cambios del estado.
   * @param {function(AgendaState): void} listener
   * @returns {function(): void} Función para desuscribirse.
   */
  subscribe(listener) {
    this._subscribers.add(listener);
    return () => this._subscribers.delete(listener);
  }

  /**
   * Notifica a todos los escuchas sobre una actualización en el estado.
   * @private
   */
  _notify() {
    const currentState = this.getState();
    this._subscribers.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error en listener de AgendaStore:', err);
      }
    });
  }

  /**
   * Actualiza el paso actual del flujo.
   * @param {number} step
   */
  setStep(step) {
    this._state.step = step;
    this._state.error = null;
    this._notify();
  }

  /**
   * Establece el catálogo de servicios.
   * @param {import('./api.js').Servicio[]} servicios
   */
  setServicios(servicios) {
    this._state.servicios = servicios || [];
    this._notify();
  }

  /**
   * Selecciona un servicio y limpia selecciones de fecha y hora posteriores.
   * @param {import('./api.js').Servicio} servicio
   */
  selectServicio(servicio) {
    this._state.servicioSeleccionado = servicio;
    this._state.fechaSeleccionada = null;
    this._state.horaSeleccionada = null;
    this._state.horasDisponibles = [];
    this._state.step = 2;
    this._state.error = null;
    this._notify();
  }

  /**
   * Guarda los días calculados del calendario.
   * @param {import('./api.js').DiaCalendario[]} calendario
   */
  setCalendario(calendario) {
    this._state.calendario = calendario || [];
    this._notify();
  }

  /**
   * Selecciona una fecha y avanza al paso 3 (Horario).
   * @param {string} fecha - Formato YYYY-MM-DD
   */
  selectFecha(fecha) {
    this._state.fechaSeleccionada = fecha;
    this._state.horaSeleccionada = null;
    this._state.horasDisponibles = [];
    this._state.step = 3;
    this._state.error = null;
    this._notify();
  }

  /**
   * Establece los horarios libres de la fecha seleccionada.
   * @param {import('./api.js').SlotHora[]} horas
   */
  setHorasDisponibles(horas) {
    this._state.horasDisponibles = horas || [];
    this._notify();
  }

  /**
   * Selecciona un horario y avanza al paso 4 (Confirmación/Formulario).
   * @param {import('./api.js').SlotHora} hora
   */
  selectHora(hora) {
    this._state.horaSeleccionada = hora;
    this._state.step = 4;
    this._state.error = null;
    this._notify();
  }

  /**
   * Establece los datos del cliente reconocido por su teléfono.
   * @param {import('./api.js').Cliente|null} cliente
   */
  setCliente(cliente) {
    this._state.cliente = cliente;
    this._notify();
  }

  /**
   * Registra la cita completada exitosamente y avanza al paso 5 (Éxito).
   * @param {import('./api.js').CitaResponse} cita
   */
  setCitaExitosa(cita) {
    this._state.citaExitosa = cita;
    this._state.step = 5;
    this._state.error = null;
    this._notify();
  }

  /**
   * Activa o desactiva el estado de carga.
   * @param {boolean} loading
   * @param {string} [message='']
   */
  setLoading(loading, message = '') {
    this._state.loading = loading;
    this._state.loadingMessage = message;
    this._notify();
  }

  /**
   * Establece un mensaje de error accesible.
   * @param {string|null} error
   */
  setError(error) {
    this._state.error = error;
    this._state.loading = false;
    this._notify();
  }

  /**
   * Reinicia el estado para agendar una nueva cita.
   */
  reset() {
    this._state.step = 1;
    this._state.servicioSeleccionado = null;
    this._state.fechaSeleccionada = null;
    this._state.horaSeleccionada = null;
    this._state.horasDisponibles = [];
    this._state.cliente = null;
    this._state.citaExitosa = null;
    this._state.error = null;
    this._state.loading = false;
    this._notify();
  }
}
