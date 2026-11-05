/**
 * Casa Nei - Controlador Principal de Agenda (Frontend)
 * Arquitectura modular en capas: API -> Store -> Vistas/Componentes.
 * @module main
 */

import { AgendaApi, getApiBase } from './api.js?v=20261105-cfb423';
import { AgendaStore } from './store.js?v=20261105-d2a017';
import { renderStepsBar, attachStepsBarListeners } from './components/stepsBar.js?v=20260903-6fc36d';
import { renderServicesView, attachServicesListeners } from './components/servicesView.js?v=20261105-f9738f';
import { renderCalendarView, attachCalendarListeners } from './components/calendarView.js?v=20261105-3b3fe5';
import { renderHoursView, attachHoursListeners } from './components/hoursView.js?v=20261105-679b37';
import { renderFormView, attachFormListeners } from './components/formView.js?v=20261105-27032d';
import { renderSuccessView, attachSuccessListeners } from './components/successView.js?v=20261105-03943f';
import { escapeHtml, sanitizePhone } from './utils/sanitizer.js?v=20261105-598836';
import { scrollToAgendaTop, initAgendaAnchorLinks } from './utils/scroll.js?v=20260911-4771ca';
import { initNavbarScroll } from './utils/navbar.js?v=20260911-f94990';

export class AgendaApp {
  /**
   * @param {string} containerId - ID del contenedor DOM de la agenda.
   * @param {string} [apiBase] - Ruta base de la API REST (por defecto detectada con getApiBase()).
   * @param {Promise<import('./api.js').Servicio[]>|null} [initialServiciosPromise=null] - Promesa temprana de servicios.
   */
  constructor(containerId = 'agenda-flow-container', apiBase = getApiBase(), initialServiciosPromise = null) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`[AgendaApp] No se encontró el contenedor con ID "${containerId}".`);
      return;
    }

    this.api = new AgendaApi(apiBase);
    this.store = new AgendaStore();
    this._initialServiciosPromise = initialServiciosPromise;

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
      const promise = this._initialServiciosPromise || this.api.obtenerServicios();
      this._initialServiciosPromise = null;
      const servicios = await promise;
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
          state.fechaSeleccionada,
          state.cargandoMasDias,
          state.error
        );
        break;

      case 3:
        stepContentHtml = renderHoursView(
          state.servicioSeleccionado,
          state.fechaSeleccionada,
          state.horasDisponibles,
          state.horaSeleccionada,
          state.loading,
          state.error
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
          () => {
            this.store.setStep(1);
            scrollToAgendaTop('agenda-flow-container');
          },
          () => this.handleCargarSiguientesDias(),
          () => {
            if (state.servicioSeleccionado) {
              this.handleSelectServicio(state.servicioSeleccionado);
            }
          }
        );
        break;

      case 3:
        attachHoursListeners(
          this.container,
          state.horasDisponibles,
          (hora) => this.handleSelectHora(hora),
          () => {
            this.store.setStep(2);
            scrollToAgendaTop('agenda-flow-container');
          },
          () => {
            if (state.fechaSeleccionada) {
              this.handleSelectFecha(state.fechaSeleccionada);
            }
          }
        );
        break;

      case 4:
        attachFormListeners(
          this.container,
          (telefono) => this.handlePhoneLookup(telefono),
          (formData) => this.handleSubmitCita(formData),
          () => {
            this.store.setStep(3);
            scrollToAgendaTop('agenda-flow-container');
          }
        );
        break;

      case 5:
        attachSuccessListeners(this.container, () => {
          this.store.reset();
          scrollToAgendaTop('agenda-flow-container');
        });
        break;
    }
  }

  // --- MANEJADORES DE ACCIONES Y FLUJO ---

  /**
   * Maneja la selección de un servicio y descarga los primeros 12 días disponibles garantizados.
   * Posiciona de inmediato la vista para que el loader sea visible y no caiga al pie de página.
   * @param {import('./api.js').Servicio} servicio
   */
  async handleSelectServicio(servicio) {
    this.store.selectServicio(servicio);
    // Desplazar inmediatamente hacia el contenedor para enfocar el loader
    scrollToAgendaTop('agenda-flow-container');
    this.renderLoading('Consultando disponibilidad en el calendario...');

    try {
      const calendario = await this.api.obtenerCalendario(servicio.id, 12);
      this.store.setCalendario(calendario);
      // Asegurar que la vista comience al inicio del Paso 2 ("Selecciona el día de tu cita")
      scrollToAgendaTop('agenda-flow-container');
    } catch (err) {
      console.error('[AgendaApp] Error al obtener calendario:', err);
      this.store.setError(err.message || 'Error al conectar con el calendario.');
    }
  }

  /**
   * Consulta y anexa el siguiente bloque de 12 días disponibles garantizados a partir de la última fecha cargada.
   */
  async handleCargarSiguientesDias() {
    const state = this.store.getState();
    if (state.cargandoMasDias || !state.servicioSeleccionado) return;

    // Obtener la última fecha de los días disponibles ya presentes en el estado
    const diasActuales = (state.calendario || []).filter(
      (dia) => dia.estado === 'disponible' && dia.slots_libres > 0
    );

    let fechaBase = null;
    if (diasActuales.length > 0) {
      const ultimaFechaStr = diasActuales[diasActuales.length - 1].fecha;
      const parts = ultimaFechaStr.split('-').map(Number);
      if (parts.length === 3) {
        const nextDateObj = new Date(parts[0], parts[1] - 1, parts[2] + 1, 12, 0, 0);
        const nextY = nextDateObj.getFullYear();
        const nextM = String(nextDateObj.getMonth() + 1).padStart(2, '0');
        const nextD = String(nextDateObj.getDate()).padStart(2, '0');
        fechaBase = `${nextY}-${nextM}-${nextD}`;
      }
    }

    this.store.setError(null);
    this.store.setCargandoMasDias(true);

    try {
      const nuevosDias = await this.api.obtenerCalendario(
        state.servicioSeleccionado.id,
        12,
        fechaBase
      );

      if (nuevosDias && nuevosDias.length > 0) {
        this.store.appendCalendario(nuevosDias);
      } else {
        this.store.setCargandoMasDias(false);
      }
    } catch (err) {
      console.error('[AgendaApp] Error al cargar siguientes días:', err);
      this.store.setCargandoMasDias(false);
      this.store.setError(err.message || 'No se pudieron consultar los siguientes días. Revisa tu conexión e intenta de nuevo.');
    }
  }


  /**
   * Maneja la selección de una fecha y visualiza las horas disponibles (Paso 3).
   * Si los slots ya vinieron precargados en el calendario (con_slots=1), la transición es instantánea (0 ms).
   * De lo contrario, descarga los horarios con indicador de carga como respaldo.
   * @param {string} fecha - Formato YYYY-MM-DD
   */
  async handleSelectFecha(fecha) {
    const state = this.store.getState();
    const servicio = state.servicioSeleccionado;
    if (!servicio) {
      this.store.setStep(1);
      scrollToAgendaTop('agenda-flow-container');
      return;
    }

    // 1. Verificar si el día ya cuenta con slots precargados en el estado local
    const diaEnCalendario = (state.calendario || []).find((d) => d.fecha === fecha);
    const tieneSlotsPrecargados = diaEnCalendario && Array.isArray(diaEnCalendario.slots) && diaEnCalendario.slots.length > 0;

    if (tieneSlotsPrecargados) {
      // Transición instantánea a 0 ms sin viaje de red ni spinner
      this.store.selectFecha(fecha, diaEnCalendario.slots);
      scrollToAgendaTop('agenda-flow-container');
      return;
    }

    // 2. Fallback: descarga asíncrona si no vinieran slots precargados
    this.store.selectFecha(fecha, []);
    scrollToAgendaTop('agenda-flow-container');
    this.store.setLoading(true, 'Cargando horarios disponibles...');

    try {
      const horas = await this.api.obtenerHorasDisponibles(fecha, servicio.id);
      this.store.setHorasDisponibles(horas);
      this.store.setLoading(false);
      // Asegurar que la vista comience al inicio del Paso 3 ("Selecciona el horario de tu preferencia")
      scrollToAgendaTop('agenda-flow-container');
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
    // Desplazamiento suave al inicio de la confirmación
    scrollToAgendaTop('agenda-flow-container');
  }

  /**
   * Consulta si el teléfono ya está registrado para precargar los datos del cliente.
   * No bloquea el campo de nombre en conexiones lentas para permitir escribir sin espera,
   * y valida que el teléfono siga coincidiendo antes de aplicar la respuesta.
   * @param {string} telefono - 10 dígitos limpios o cadena vacía para resetear
   */
  async handlePhoneLookup(telefono) {
    const lookupBox = this.container.querySelector('#cliente-lookup-box');
    const infoBox = this.container.querySelector('#cliente-reconocido-box');
    const inputTelefono = this.container.querySelector('#paciente_telefono');
    const inputNombre = this.container.querySelector('#paciente_nombre');
    const phoneSpinner = this.container.querySelector('#telefono-spinner');
    const nameSpinner = this.container.querySelector('#nombre-spinner');

    // Si se envía cadena vacía (el usuario borró dígitos), restaurar estado normal
    if (!telefono || telefono.length < 10) {
      if (lookupBox) {
        lookupBox.style.display = 'none';
        lookupBox.innerHTML = '';
      }
      if (infoBox) infoBox.style.display = 'none';
      if (phoneSpinner) phoneSpinner.style.display = 'none';
      if (nameSpinner) nameSpinner.style.display = 'none';
      if (inputNombre) {
        inputNombre.readOnly = false;
        inputNombre.classList.remove('field-searching');
        inputNombre.placeholder = 'Nombre y Apellidos';
      }
      this.store.setCliente(null);
      return;
    }

    const clientePrevio = this.store.getState().cliente;

    // Activar estado visible de búsqueda sin bloquear la escritura en servidores lentos
    if (phoneSpinner) phoneSpinner.style.display = 'inline-block';
    if (lookupBox) {
      lookupBox.innerHTML = `
        <div class="cliente-lookup-loading" role="status" aria-live="polite">
          <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
          <div class="lookup-text">
            <strong>Buscando si ya estás registrado...</strong>
            <small>Consultando tus datos para precargarlos automáticamente.</small>
          </div>
        </div>
      `;
      lookupBox.style.display = 'block';
    }
    if (infoBox) infoBox.style.display = 'none';

    const nombreAntesDeBuscar = inputNombre ? inputNombre.value.trim() : '';
    if (inputNombre && !nombreAntesDeBuscar) {
      inputNombre.placeholder = 'Buscando tu registro (o escribe tu nombre)...';
      if (nameSpinner) nameSpinner.style.display = 'inline-block';
    }

    try {
      const cliente = await this.api.consultarCliente(telefono);

      // Salvaguarda contra condición de carrera: verificar que el teléfono actual siga siendo el consultado
      const telefonoActual = inputTelefono ? sanitizePhone(inputTelefono.value) : telefono;
      if (telefonoActual !== telefono) {
        return;
      }

      // Ocultar spinners
      if (phoneSpinner) phoneSpinner.style.display = 'none';
      if (nameSpinner) nameSpinner.style.display = 'none';

      if (cliente) {
        this.store.setCliente(cliente);
        if (lookupBox) {
          lookupBox.style.display = 'none';
          lookupBox.innerHTML = '';
        }
        if (inputNombre) {
          inputNombre.readOnly = false;
          inputNombre.classList.remove('field-searching');
          inputNombre.placeholder = 'Nombre y Apellidos';
          const valorActualNombre = inputNombre.value.trim();
          const eraDeClientePrevio = clientePrevio && valorActualNombre === clientePrevio.nombre_completo;
          // Precargar si el usuario no escribió otro nombre manualmente mientras esperaba al servidor
          if (!valorActualNombre || eraDeClientePrevio) {
            inputNombre.value = cliente.nombre_completo;
            inputNombre.classList.add('field-prefilled');
            setTimeout(() => inputNombre.classList.remove('field-prefilled'), 2000);
          }
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
        if (inputNombre) {
          inputNombre.readOnly = false;
          inputNombre.classList.remove('field-searching');
          inputNombre.placeholder = 'Nombre y Apellidos';
          if (clientePrevio && inputNombre.value.trim() === clientePrevio.nombre_completo) {
            inputNombre.value = '';
          }
          if (!inputNombre.value && document.activeElement === inputTelefono) {
            inputNombre.focus();
          }
        }
        if (lookupBox) {
          lookupBox.innerHTML = `
            <div class="cliente-lookup-notfound" role="status">
              <i class="fas fa-user-plus" aria-hidden="true"></i>
              <span>No encontramos registros previos con este número. Por favor ingresa tu nombre completo.</span>
            </div>
          `;
          lookupBox.style.display = 'block';
          setTimeout(() => {
            if (lookupBox && lookupBox.querySelector('.cliente-lookup-notfound')) {
              lookupBox.style.display = 'none';
              lookupBox.innerHTML = '';
            }
          }, 4500);
        }
      }
    } catch (err) {
      console.warn('[AgendaApp] Consulta de cliente omitida:', err.message);
      if (phoneSpinner) phoneSpinner.style.display = 'none';
      if (nameSpinner) nameSpinner.style.display = 'none';
      if (lookupBox) {
        lookupBox.style.display = 'none';
        lookupBox.innerHTML = '';
      }
      if (inputNombre) {
        inputNombre.readOnly = false;
        inputNombre.classList.remove('field-searching');
        inputNombre.placeholder = 'Nombre y Apellidos';
      }
    }
  }

  /**
   * Envía la solicitud de cita al backend y transiciona a la pantalla de confirmación.
   * @param {{ nombre: string, telefono: string, notas: string, medio_contacto?: string }} formData
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
        notas_cliente: formData.notas,
        medio_contacto: 'whatsapp'
      };

      const citaResponse = await this.api.agendarCita(payload);
      this.store.setCitaExitosa(citaResponse);
      scrollToAgendaTop('agenda-flow-container');
    } catch (err) {
      console.error('[AgendaApp] Error al agendar cita:', err);

      // Si el horario fue ocupado por otro usuario (HTTP 409), refrescar calendario en segundo plano
      if (err.status === 409 && state.servicioSeleccionado) {
        this.api
          .obtenerCalendario(state.servicioSeleccionado.id, 12)
          .then((calendarioActualizado) => {
            this.store.setCalendario(calendarioActualizado);
            const diaActualizado = (calendarioActualizado || []).find(
              (d) => d.fecha === state.fechaSeleccionada
            );
            this.store.setHorasDisponibles(diaActualizado?.slots || []);
          })
          .catch(() => {});
      }

      if (errorBox) {
        errorBox.innerHTML = `<i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ${escapeHtml(err.message || 'Ocurrió un error al registrar la cita.')}`;
        errorBox.style.display = 'block';
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i> Confirmar y Abrir WhatsApp';
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
      scrollToAgendaTop('agenda-flow-container');
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

/**
 * Inicialización controlada de la aplicación y controladores globales de navegación.
 * Dispara la descarga de servicios inmediatamente al evaluar el módulo para ganar tiempo en servidores lentos.
 */
const earlyApiBase = typeof window !== 'undefined' ? getApiBase() : '/api';
const earlyServiciosPromise =
  typeof window !== 'undefined' && typeof fetch !== 'undefined'
    ? new AgendaApi(earlyApiBase).obtenerServicios()
    : null;

// Evitar unhandledrejection si la promesa falla antes de que el DOM termine de cargar
if (earlyServiciosPromise) {
  earlyServiciosPromise.catch(() => {});
}

function bootAgendaApp() {
  initNavbarScroll('.navbar');
  initAgendaAnchorLinks();
  new AgendaApp('agenda-flow-container', earlyApiBase, earlyServiciosPromise);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAgendaApp);
  } else {
    bootAgendaApp();
  }
}
