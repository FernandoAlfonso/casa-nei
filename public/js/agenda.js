/**
 * Casa Nei - Sistema de Agenda y Citas
 * Módulo de Frontend para selección de servicio, calendario, horarios y WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = '/api';

  // Estado de la aplicación
  const state = {
    step: 1,
    servicios: [],
    servicioSeleccionado: null,
    fechaSeleccionada: null,
    horaSeleccionada: null,
    calendario: [],
    clienteExistente: null
  };

  // Elementos DOM
  const agendaContainer = document.getElementById('agenda-flow-container');
  if (!agendaContainer) return;

  // Inicializar
  init();

  async function init() {
    renderSkeleton();
    await cargarServicios();
  }

  // 1. Cargar Catálogo de Servicios
  async function cargarServicios() {
    try {
      const res = await fetch(`${API_BASE}/servicios`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        state.servicios = json.data;
        renderPaso1Servicios();
      } else {
        renderError('No se encontraron servicios disponibles en este momento.');
      }
    } catch (e) {
      console.error(e);
      renderError('Error de conexión al cargar los servicios.');
    }
  }

  // 2. Cargar Calendario para el servicio elegido
  async function cargarCalendario() {
    renderLoadingCalendario();
    try {
      const params = new URLSearchParams({
        servicio_id: state.servicioSeleccionado.id,
        semanas: 4
      });
      const res = await fetch(`${API_BASE}/calendario?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        state.calendario = json.data;
        renderPaso2Calendario();
      } else {
        renderError('No se pudo calcular la disponibilidad del calendario.');
      }
    } catch (e) {
      console.error(e);
      renderError('Error al conectar con el calendario.');
    }
  }

  // 3. Cargar Horas Disponibles para el día seleccionado
  async function cargarHorasDisponibles(fecha) {
    const horasContainer = document.getElementById('agenda-horas-list');
    if (!horasContainer) return;

    horasContainer.innerHTML = `
      <div class="agenda-loading">
        <i class="fas fa-spinner fa-spin"></i> Consultando horarios libres para el ${formatearFechaLegible(fecha)}...
      </div>
    `;

    try {
      const params = new URLSearchParams({
        fecha: fecha,
        servicio_id: state.servicioSeleccionado.id
      });
      const res = await fetch(`${API_BASE}/horas-disponibles?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        renderPaso3Horas(json.data);
      } else {
        horasContainer.innerHTML = `
          <div class="agenda-alert warning">
            <i class="fas fa-info-circle"></i> No hay horarios disponibles para esta fecha. Por favor selecciona otro día.
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
      horasContainer.innerHTML = `
        <div class="agenda-alert error">
          <i class="fas fa-exclamation-triangle"></i> Error al cargar los horarios disponibles.
        </div>
      `;
    }
  }

  // 4. Consultar si el teléfono ya existe
  async function verificarTelefono(telefono) {
    const infoBox = document.getElementById('cliente-reconocido-box');
    const inputNombre = document.getElementById('paciente_nombre');
    if (!telefono || telefono.length < 10) {
      if (infoBox) infoBox.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/cliente/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono })
      });
      const json = await res.json();

      if (json.success && json.data) {
        state.clienteExistente = json.data;
        if (inputNombre && !inputNombre.value) {
          inputNombre.value = json.data.nombre_completo;
        }
        if (infoBox) {
          infoBox.innerHTML = `
            <i class="fas fa-check-circle"></i> ¡Hola de nuevo, <strong>${escapeHtml(json.data.nombre_completo)}</strong>! Hemos precargado tus datos.
          `;
          infoBox.style.display = 'block';
        }
      } else {
        state.clienteExistente = null;
        if (infoBox) infoBox.style.display = 'none';
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 5. Enviar Solicitud de Cita
  async function enviarCita(formData) {
    const submitBtn = document.getElementById('btn-submit-cita');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando y generando WhatsApp...';
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

      const res = await fetch(`${API_BASE}/citas/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        renderExito(json.data);
      } else {
        alert(json.error || 'Ocurrió un error al agendar la cita.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar y Enviar por WhatsApp';
        }
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al agendar la cita.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar y Enviar por WhatsApp';
      }
    }
  }

  // --- RENDERIZADORES DE VISTAS Y PASOS ---

  function renderStepsHeader() {
    return `
      <div class="agenda-steps-bar">
        <div class="agenda-step-item ${state.step >= 1 ? 'active' : ''} ${state.step > 1 ? 'completed' : ''}">
          <span class="step-num">1</span>
          <span class="step-label">Servicio</span>
        </div>
        <div class="step-connector ${state.step > 1 ? 'completed' : ''}"></div>
        <div class="agenda-step-item ${state.step >= 2 ? 'active' : ''} ${state.step > 2 ? 'completed' : ''}">
          <span class="step-num">2</span>
          <span class="step-label">Fecha</span>
        </div>
        <div class="step-connector ${state.step > 2 ? 'completed' : ''}"></div>
        <div class="agenda-step-item ${state.step >= 3 ? 'active' : ''} ${state.step > 3 ? 'completed' : ''}">
          <span class="step-num">3</span>
          <span class="step-label">Horario</span>
        </div>
        <div class="step-connector ${state.step > 3 ? 'completed' : ''}"></div>
        <div class="agenda-step-item ${state.step >= 4 ? 'active' : ''}">
          <span class="step-num">4</span>
          <span class="step-label">Confirmación</span>
        </div>
      </div>
    `;
  }

  function renderPaso1Servicios() {
    state.step = 1;
    let html = `
      ${renderStepsHeader()}
      <div class="agenda-step-content animate-fade-in">
        <div class="agenda-header-text">
          <h3>Selecciona el servicio que deseas</h3>
          <p>Elige el tipo de consulta o terapia para mostrarte la disponibilidad correspondiente.</p>
        </div>
        <div class="agenda-services-grid">
    `;

    state.servicios.forEach(s => {
      const isSelected = state.servicioSeleccionado && state.servicioSeleccionado.id === s.id;
      const precioTexto = s.precio ? `$${parseFloat(s.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : 'Consultar';
      html += `
        <div class="agenda-service-card ${isSelected ? 'selected' : ''}" data-id="${s.id}">
          <div class="service-icon"><i class="fas fa-leaf"></i></div>
          <h4>${escapeHtml(s.nombre)}</h4>
          <p class="service-desc">${escapeHtml(s.descripcion || '')}</p>
          <div class="service-meta">
            <span><i class="far fa-clock"></i> ${s.duracion_minutos} min</span>
            <span class="service-price">${precioTexto}</span>
          </div>
          <button class="btn-select-service" type="button">
            ${isSelected ? '<i class="fas fa-check"></i> Seleccionado' : 'Elegir servicio'}
          </button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    agendaContainer.innerHTML = html;

    // Listeners
    agendaContainer.querySelectorAll('.agenda-service-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        state.servicioSeleccionado = state.servicios.find(s => s.id === id);
        state.fechaSeleccionada = null;
        state.horaSeleccionada = null;
        cargarCalendario();
      });
    });
  }

  function renderPaso2Calendario() {
    state.step = 2;
    let html = `
      ${renderStepsHeader()}
      <div class="agenda-step-content animate-fade-in">
        <div class="agenda-selected-summary">
          <div class="summary-item">
            <span class="label">Servicio seleccionado:</span>
            <strong>${escapeHtml(state.servicioSeleccionado.nombre)} (${state.servicioSeleccionado.duracion_minutos} min)</strong>
          </div>
          <button class="btn-change-step" id="btn-cambiar-servicio" type="button"><i class="fas fa-edit"></i> Cambiar</button>
        </div>

        <div class="agenda-header-text">
          <h3>Selecciona el día de tu cita</h3>
          <p>Disponibilidad para las próximas 4 semanas.</p>
        </div>

        <!-- Leyenda -->
        <div class="agenda-legend">
          <span class="legend-item"><span class="badge disponible"></span> Disponible</span>
          <span class="legend-item"><span class="badge pendiente"></span> En confirmación</span>
          <span class="legend-item"><span class="badge ocupado"></span> Ocupado</span>
          <span class="legend-item"><span class="badge cerrado"></span> No disponible</span>
        </div>

        <!-- Cuadrícula del Calendario -->
        <div class="agenda-calendar-grid">
    `;

    state.calendario.forEach(dia => {
      const fechaObj = new Date(dia.fecha + 'T00:00:00');
      const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      const diaNombre = diasNombres[dia.dia_semana];
      const diaNumero = fechaObj.getDate();
      const mesNombre = mesesNombres[fechaObj.getMonth()];

      const isSelectable = dia.estado === 'disponible';
      const isSelected = state.fechaSeleccionada === dia.fecha;

      let statusBadge = '';
      if (dia.estado === 'disponible') {
        statusBadge = `<span class="dia-tag disponible">${dia.slots_libres} libres</span>`;
      } else if (dia.estado === 'ocupado') {
        statusBadge = `<span class="dia-tag ocupado">Lleno</span>`;
      } else if (dia.estado === 'bloqueado') {
        statusBadge = `<span class="dia-tag cerrado">${escapeHtml(dia.motivo || 'Festivo')}</span>`;
      } else {
        statusBadge = `<span class="dia-tag cerrado">Cerrado</span>`;
      }

      const pendingBadge = dia.tiene_pendientes ? `<span class="pending-dot" title="Tiene solicitudes en confirmación"></span>` : '';

      html += `
        <div class="agenda-calendar-day ${dia.estado} ${isSelectable ? 'clickable' : 'disabled'} ${isSelected ? 'selected' : ''}" 
             data-fecha="${dia.fecha}" 
             data-disponible="${isSelectable ? '1' : '0'}">
          ${pendingBadge}
          <span class="day-name">${diaNombre}</span>
          <span class="day-number">${diaNumero}</span>
          <span class="day-month">${mesNombre}</span>
          ${statusBadge}
        </div>
      `;
    });

    html += `
        </div>

        <!-- Contenedor para Horarios (Paso 3) -->
        <div id="agenda-horas-section" class="agenda-horas-section" style="${state.fechaSeleccionada ? 'display: block;' : 'display: none;'}">
          <div class="agenda-header-text">
            <h3>Horarios disponibles</h3>
            <p id="horas-fecha-label"></p>
          </div>
          <div id="agenda-horas-list" class="agenda-horas-list"></div>
        </div>
      </div>
    `;

    agendaContainer.innerHTML = html;

    // Listeners
    document.getElementById('btn-cambiar-servicio').addEventListener('click', renderPaso1Servicios);

    agendaContainer.querySelectorAll('.agenda-calendar-day.clickable').forEach(card => {
      card.addEventListener('click', () => {
        agendaContainer.querySelectorAll('.agenda-calendar-day').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const fecha = card.dataset.fecha;
        state.fechaSeleccionada = fecha;
        state.horaSeleccionada = null;

        const horasSection = document.getElementById('agenda-horas-section');
        const label = document.getElementById('horas-fecha-label');
        if (horasSection) horasSection.style.display = 'block';
        if (label) label.textContent = `Selecciona una hora para el ${formatearFechaLegible(fecha)}:`;

        cargarHorasDisponibles(fecha);
        horasSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  function renderPaso3Horas(horas) {
    const horasList = document.getElementById('agenda-horas-list');
    if (!horasList) return;

    let html = '';
    horas.forEach(h => {
      const isSelected = state.horaSeleccionada && state.horaSeleccionada.hora_inicio === h.hora_inicio;
      html += `
        <button type="button" class="btn-slot-hora ${isSelected ? 'selected' : ''}" 
                data-inicio="${h.hora_inicio}" 
                data-fin="${h.hora_fin}"
                data-inicio-completo="${h.hora_inicio_completa}"
                data-fin-completo="${h.hora_fin_completa}">
          <i class="far fa-clock"></i> ${h.hora_inicio} - ${h.hora_fin}
        </button>
      `;
    });

    horasList.innerHTML = html;

    horasList.querySelectorAll('.btn-slot-hora').forEach(btn => {
      btn.addEventListener('click', () => {
        horasList.querySelectorAll('.btn-slot-hora').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.horaSeleccionada = {
          hora_inicio: btn.dataset.inicio,
          hora_fin: btn.dataset.fin,
          hora_inicio_completa: btn.dataset.inicioCompleto,
          hora_fin_completa: btn.dataset.finCompleto
        };

        renderPaso4Formulario();
      });
    });
  }

  function renderPaso4Formulario() {
    state.step = 4;
    const precioTexto = state.servicioSeleccionado.precio ? `$${parseFloat(state.servicioSeleccionado.precio).toFixed(2)} MXN` : 'A convenir';

    let html = `
      ${renderStepsHeader()}
      <div class="agenda-step-content animate-fade-in">
        <div class="agenda-form-layout">
          
          <!-- Resumen de Cita -->
          <div class="agenda-summary-card">
            <h4><i class="fas fa-clipboard-check"></i> Resumen de tu cita</h4>
            <div class="summary-row">
              <span>Servicio:</span>
              <strong>${escapeHtml(state.servicioSeleccionado.nombre)}</strong>
            </div>
            <div class="summary-row">
              <span>Duración:</span>
              <span>${state.servicioSeleccionado.duracion_minutos} minutos</span>
            </div>
            <div class="summary-row">
              <span>Fecha:</span>
              <strong>${formatearFechaLegible(state.fechaSeleccionada)}</strong>
            </div>
            <div class="summary-row">
              <span>Horario:</span>
              <strong>${state.horaSeleccionada.hora_inicio} a ${state.horaSeleccionada.hora_fin} hrs</strong>
            </div>
            <div class="summary-row total">
              <span>Precio estimado:</span>
              <strong class="price-highlight">${precioTexto}</strong>
            </div>
            <button class="btn-change-step" id="btn-cambiar-fecha" type="button" style="margin-top: 1rem; width: 100%;">
              <i class="fas fa-calendar-alt"></i> Cambiar fecha u hora
            </button>
          </div>

          <!-- Formulario de Datos -->
          <div class="agenda-form-card">
            <h4><i class="fas fa-user-edit"></i> Completa tus datos</h4>
            <p class="form-desc">Ingresa tu número de WhatsApp para confirmar tu espacio y precargar tu información.</p>

            <form id="form-agendar-cita">
              
              <!-- Teléfono Celular -->
              <div class="form-group">
                <label for="paciente_telefono"><i class="fab fa-whatsapp"></i> Número de Celular / WhatsApp <span class="req">*</span></label>
                <input type="tel" id="paciente_telefono" name="telefono" placeholder="Ej. 312 123 4567 (10 dígitos)" maxlength="15" required autocomplete="tel">
                <small class="form-hint">Lo usaremos para precargar tus datos y enviarte tu recordatorio.</small>
              </div>

              <!-- Mensaje de bienvenida si ya es cliente -->
              <div id="cliente-reconocido-box" class="agenda-alert success" style="display: none;"></div>

              <!-- Nombre Completo -->
              <div class="form-group">
                <label for="paciente_nombre"><i class="fas fa-user"></i> Nombre completo <span class="req">*</span></label>
                <input type="text" id="paciente_nombre" name="nombre" placeholder="Nombre y Apellidos" required autocomplete="name">
              </div>

              <!-- Notas Adicionales -->
              <div class="form-group">
                <label for="paciente_notas"><i class="fas fa-comment-medical"></i> ¿Tienes algún síntoma o motivo específico? (Opcional)</label>
                <textarea id="paciente_notas" name="notas" rows="3" placeholder="Describe brevemente tus dudas o molestias para prepararnos mejor..."></textarea>
              </div>

              <!-- Botón Submit -->
              <button type="submit" id="btn-submit-cita" class="btn-primary btn-submit-agenda">
                <i class="fab fa-whatsapp"></i> Confirmar y Enviar por WhatsApp
              </button>
              <p class="form-disclaimer"><i class="fas fa-shield-alt"></i> Tus datos personales están protegidos y cifrados de forma segura.</p>
            </form>
          </div>

        </div>
      </div>
    `;

    agendaContainer.innerHTML = html;

    // Listeners
    document.getElementById('btn-cambiar-fecha').addEventListener('click', renderPaso2Calendario);

    const inputTelefono = document.getElementById('paciente_telefono');
    let debounceTimer;
    inputTelefono.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const val = e.target.value.replace(/\D/g, '');
      if (val.length >= 10) {
        debounceTimer = setTimeout(() => verificarTelefono(val), 400);
      }
    });

    const form = document.getElementById('form-agendar-cita');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = document.getElementById('paciente_nombre').value.trim();
      const telefono = document.getElementById('paciente_telefono').value.trim();
      const notas = document.getElementById('paciente_notas').value.trim();

      if (!nombre || !telefono) {
        alert('Por favor ingresa tu nombre y número de teléfono.');
        return;
      }

      enviarCita({ nombre, telefono, notas });
    });
  }

  function renderExito(data) {
    const html = `
      <div class="agenda-success-card animate-fade-in">
        <div class="success-icon"><i class="fab fa-whatsapp"></i></div>
        <h2>¡Cita Registrada con Éxito!</h2>
        <p class="success-code">Código de Cita: <strong>${escapeHtml(data.codigo_cita)}</strong></p>
        <p class="success-desc">
          Tu solicitud para <strong>${escapeHtml(data.servicio.nombre)}</strong> el día 
          <strong>${formatearFechaLegible(data.fecha_cita)}</strong> a las <strong>${data.hora_inicio} hrs</strong> ha sido agendada como <em>Pendiente de confirmación</em>.
        </p>

        <div class="whatsapp-action-box">
          <p>Se ha generado tu mensaje precargado. Haz clic en el botón para enviarlo al administrador:</p>
          <a href="${data.whatsapp_url}" target="_blank" class="btn-primary btn-whatsapp-direct">
            <i class="fab fa-whatsapp"></i> Abrir WhatsApp y Enviar Mensaje
          </a>
        </div>

        <button type="button" class="btn-secondary" id="btn-agendar-otra" style="margin-top: 2rem;">
          <i class="fas fa-calendar-plus"></i> Agendar otra cita
        </button>
      </div>
    `;

    agendaContainer.innerHTML = html;

    // Intentar abrir WhatsApp en una nueva pestaña automáticamente
    if (data.whatsapp_url) {
      window.open(data.whatsapp_url, '_blank');
    }

    document.getElementById('btn-agendar-otra').addEventListener('click', () => {
      state.step = 1;
      state.servicioSeleccionado = null;
      state.fechaSeleccionada = null;
      state.horaSeleccionada = null;
      renderPaso1Servicios();
    });
  }

  // --- UTILIDADES ---

  function renderSkeleton() {
    agendaContainer.innerHTML = `
      <div class="agenda-loading">
        <i class="fas fa-circle-notch fa-spin"></i> Cargando agenda de Casa Nei...
      </div>
    `;
  }

  function renderError(msg) {
    agendaContainer.innerHTML = `
      <div class="agenda-alert error">
        <i class="fas fa-exclamation-circle"></i> ${escapeHtml(msg)}
        <br><br>
        <button class="btn-secondary" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }

  function renderLoadingCalendario() {
    const content = agendaContainer.querySelector('.agenda-step-content');
    if (content) {
      content.innerHTML = `
        <div class="agenda-loading">
          <i class="fas fa-circle-notch fa-spin"></i> Consultando calendario de disponibilidad...
        </div>
      `;
    }
  }

  function formatearFechaLegible(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }
});
