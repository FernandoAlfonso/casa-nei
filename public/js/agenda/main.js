/**
 * Casa Nei - Controlador Principal de Agenda (Frontend)
 * Arquitectura modular en capas: API -> Store -> Vistas/Componentes.
 * @module main
 */

import { AgendaApi } from './api.js';
import { AgendaStore } from './store.js';
import { renderStepsBar, attachStepsBarListeners } from './components/stepsBar.js';
import { renderServicesView, attachServicesListeners } from './components/servicesView.js';
import { renderCalendarView, attachCalendarListeners } from './components/calendarView.js';
import { renderHoursView, attachHoursListeners } from './components/hoursView.js';
import { renderFormView, attachFormListeners } from './components/formView.js';
import { renderSuccessView, attachSuccessListeners } from './components/successView.js';
import { escapeHtml } from './utils/sanitizer.js';

export class AgendaApp {
  /**
   * @param {string} containerId - ID del contenedor DOM de la agenda.
   * @param {string} [apiBase='/api'] - Ruta base de la API REST.
   */
  constructor(containerId = 'agenda-flow-container', apiBase = '/api') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`[AgendaApp] No se encontró el contenedor con ID "${containerId}".`);
      return;
    }

    this.api = new AgendaApi(apiBase);
    this.store = new AgendaStore();

    // Suscribirse a cambios del almacén de estado para re-renderizar
    this.store.subscribe((state) => this.render(state));

    // Inicializar carga
    this.init();
  }

  /**
   * Inicializa la aplicación cargando el catálogo de servicios.
   */
  async init() {
    this.renderLoading('Cargando servicios de Casa Nei...');
    try {
      const servicios = await this.api.obtenerServicios();
      if (servicios && servicios.length > 0) {
        this.store.setServicios(servicios);
      } else {
        this.store.setError('No se encontraron servicios disponibles en este momento.');
      }
    } catch (err) {
      console.error('[AgendaApp] Error al inicializar servicios:', err);
      this.store.setError(err.message || 'Error de conexión al cargar los servicios.');
    }
  }

  /**
   * Renderiza el estado actual de la agenda en el contenedor.
   * @param {import('./store.js').AgendaState} state
   */
  render(state) {
    if (!this.container) return;

    // Estado de Error Crítico
    if (state.error && !state.servicios.length) {
      this.container.innerHTML = `
        <div class="agenda-alert error" role="alert">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i> ${escapeHtml(state.error)}
          <br><br>
          <button class="btn-secondary" id="btn-reintentar-init" type="button">
            <i class="fas fa-redo" aria-hidden="true"></i> Reintentar
          </button>
        </div>
      `;
      this.container.querySelector('#btn-reintentar-init')?.addEventListener('click', () => {
        this.store.setError(null);
        this.init();
      });
      return;
    }

    // Renderizado según el paso actual
    let stepContentHtml = '';

    switch (state.step) {
      case 1:
        stepContentHtml = renderServicesView(state.servicios, state.servicioSeleccionado);
        break;

      case 2:
        stepContentHtml = renderCalendarView(
          state.servicioSeleccionado,
          state.calendario,
          state.fechaSeleccionada
        );
        break;

      case 3:
        stepContentHtml = renderHoursView(
          state.servicioSeleccionado,
          state.fechaSeleccionada,
          state.horasDisponibles,
          state.horaSeleccionada,
          state.loading
        );
        break;

      case 4:
        stepContentHtml = renderFormView(
          state.servicioSeleccionado,
          state.fechaSeleccionada,
          state.horaSeleccionada,
          state.cliente,
          state.loading
        );
        break;

      case 5:
        stepContentHtml = renderSuccessView(state.citaExitosa);
        break;

      default:
        stepContentHtml = renderServicesView(state.servicios, state.servicioSeleccionado);
    }

    // Combinar barra de pasos con el contenido de la vista
    const stepsBarHtml = renderStepsBar(state.step);
    this.container.innerHTML = `
      ${stepsBarHtml}
      <div id="agenda-step-view-wrapper">
        ${stepContentHtml}
      </div>
    `;

    // Asociar escuchadores de la barra de progreso
    attachStepsBarListeners(this.container, (targetStep) => {
      this.handleNavigateStep(targetStep);
    });

    // Asociar escuchadores específicos de la vista actual
    this.attachViewListeners(state);
  }

  /**
   * Asocia los escuchadores de eventos según el paso activo.
   * @private
   * @param {import('./store.js').AgendaState} state
   */
  attachViewListeners(state) {
    switch (state.step) {
      case 1:
        attachServicesListeners(this.container, state.servicios, (servicio) => {
          this.handleSelectServicio(servicio);
        });
        break;

      case 2:
        attachCalendarListeners(
          this.container,
          (fecha) => this.handleSelectFecha(fecha),
          () => this.store.setStep(1)
        );
        break;

      case 3:
        attachHoursListeners(
          this.container,
          state.horasDisponibles,
          (hora) => this.handleSelectHora(hora),
          () => this.store.setStep(2)
        );
        break;

      case 4:
        attachFormListeners(
          this.container,
          (telefono) => this.handlePhoneLookup(telefono),
          (formData) => this.handleSubmitCita(formData),
          () => this.store.setStep(3)
        );
        break;

      case 5:
        attachSuccessListeners(this.container, () => {
          this.store.reset();
        });
        break;
    }
  }

  // --- MANEJADORES DE ACCIONES Y FLUJO ---

  /**
   * Maneja la selección de un servicio y descarga el calendario de disponibilidad.
   * @param {import('./api.js').Servicio} servicio
   */
  async handleSelectServicio(servicio) {
    this.store.selectServicio(servicio);
    this.renderLoading('Consultando disponibilidad en el calendario...');

    try {
      const calendario = await this.api.obtenerCalendario(servicio.id, 4);
      this.store.setCalendario(calendario);
    } catch (err) {
      console.error('[AgendaApp] Error al obtener calendario:', err);
      this.store.setError(err.message || 'Error al conectar con el calendario.');
    }
  }

  /**
   * Maneja la selección de una fecha y descarga las horas disponibles (Paso 3).
   * @param {string} fecha - Formato YYYY-MM-DD
   */
  async handleSelectFecha(fecha) {
    const servicio = this.store.getState().servicioSeleccionado;
    if (!servicio) {
      this.store.setStep(1);
      return;
    }

    this.store.selectFecha(fecha);
    this.store.setLoading(true, 'Cargando horarios disponibles...');

    try {
      const horas = await this.api.obtenerHorasDisponibles(fecha, servicio.id);
      this.store.setHorasDisponibles(horas);
      this.store.setLoading(false);
    } catch (err) {
      console.error('[AgendaApp] Error al obtener horas:', err);
      this.store.setHorasDisponibles([]);
      this.store.setLoading(false);
      this.store.setError(err.message || 'Error al obtener los horarios disponibles.');
    }
  }

  /**
   * Maneja la selección de un horario y pasa al formulario de confirmación (Paso 4).
   * @param {import('./api.js').SlotHora} hora
   */
  handleSelectHora(hora) {
    this.store.selectHora(hora);
    // Desplazamiento suave al inicio de la agenda
    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Consulta si el teléfono ya está registrado para precargar los datos del cliente.
   * @param {string} telefono - 10 dígitos limpios
   */
  async handlePhoneLookup(telefono) {
    const infoBox = this.container.querySelector('#cliente-reconocido-box');
    const inputNombre = this.container.querySelector('#paciente_nombre');

    try {
      const cliente = await this.api.consultarCliente(telefono);
      if (cliente) {
        this.store.setCliente(cliente);
        if (inputNombre && !inputNombre.value) {
          inputNombre.value = cliente.nombre_completo;
        }
        if (infoBox) {
          infoBox.innerHTML = `
            <i class="fas fa-check-circle" aria-hidden="true"></i> 
            ¡Hola de nuevo, <strong>${escapeHtml(cliente.nombre_completo)}</strong>! Hemos precargado tus datos.
          `;
          infoBox.style.display = 'block';
        }
      } else {
        this.store.setCliente(null);
        if (infoBox) infoBox.style.display = 'none';
      }
    } catch (err) {
      console.warn('[AgendaApp] Consulta de cliente omitida:', err.message);
    }
  }

  /**
   * Envía la solicitud de cita al backend y transiciona a la pantalla de confirmación.
   * @param {{ nombre: string, telefono: string, notas: string }} formData
   */
  async handleSubmitCita(formData) {
    const state = this.store.getState();
    const submitBtn = this.container.querySelector('#btn-submit-cita');
    const errorBox = this.container.querySelector('#form-error-box');

    if (!state.servicioSeleccionado || !state.fechaSeleccionada || !state.horaSeleccionada) {
      if (errorBox) {
        errorBox.textContent = 'Faltan datos de servicio, fecha u horario para completar la cita.';
        errorBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Agendando y preparando WhatsApp...';
    }

    try {
      const payload = {
        nombre_completo: formData.nombre,
        telefono: formData.telefono,
        servicio_id: state.servicioSeleccionado.id,
        fecha_cita: state.fechaSeleccionada,
        hora_inicio: state.horaSeleccionada.hora_inicio_completa,
        notas_cliente: formData.notas
      };

      const citaResponse = await this.api.agendarCita(payload);
      this.store.setCitaExitosa(citaResponse);
      this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('[AgendaApp] Error al agendar cita:', err);
      if (errorBox) {
        errorBox.innerHTML = `<i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ${escapeHtml(err.message || 'Ocurrió un error al registrar la cita.')}`;
        errorBox.style.display = 'block';
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i> Confirmar y Generar WhatsApp';
      }
    }
  }

  /**
   * Permite retroceder a un paso previamente completado.
   * @param {number} targetStep
   */
  handleNavigateStep(targetStep) {
    const currentStep = this.store.getState().step;
    if (targetStep < currentStep && targetStep >= 1) {
      this.store.setStep(targetStep);
      this.container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Muestra un indicador de carga accesible en el contenedor.
   * @param {string} msg
   */
  renderLoading(msg = 'Cargando...') {
    this.container.innerHTML = `
      <div class="agenda-loading" role="status" aria-live="polite">
        <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
        ${escapeHtml(msg)}
      </div>
    `;
  }
}

// Inicialización automática cuando el DOM esté listo
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new AgendaApp('agenda-flow-container');
  });
}
