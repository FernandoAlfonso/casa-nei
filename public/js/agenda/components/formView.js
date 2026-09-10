/**
 * Casa Nei - Vista de Formulario y Confirmación de Cita (Paso 4)
 * @module components/formView
 */

import { escapeHtml, sanitizePhone, isValidMexicanPhone } from '../utils/sanitizer.js';
import { formatDateLegible } from '../utils/date.js';

/**
 * Renderiza el formulario y resumen de la cita.
 * @param {import('../api.js').Servicio} servicio - Servicio seleccionado.
 * @param {string} fecha - Fecha seleccionada (YYYY-MM-DD).
 * @param {import('../api.js').SlotHora} hora - Horario seleccionado.
 * @param {import('../api.js').Cliente|null} [cliente=null] - Cliente reconocido previamente.
 * @param {boolean} [submitting=false] - Indica si el formulario se está enviando.
 * @returns {string} Markup HTML accesible.
 */
/**
 * Renderiza el formulario y resumen de la cita.
 * @param {import('../api.js').Servicio} servicio - Servicio seleccionado.
 * @param {string} fecha - Fecha seleccionada (YYYY-MM-DD).
 * @param {import('../api.js').SlotHora} hora - Horario seleccionado.
 * @param {import('../api.js').Cliente|null} [cliente=null] - Cliente reconocido previamente.
 * @param {boolean} [submitting=false] - Indica si el formulario se está enviando.
 * @returns {string} Markup HTML accesible.
 */
export function renderFormView(servicio, fecha, hora, cliente = null, submitting = false) {
  const precioNum = parseFloat(String(servicio.precio || 0));
  const precioTexto = precioNum > 0
    ? `$${precioNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
    : 'A convenir';

  const fechaTexto = formatDateLegible(fecha);
  const clienteNombre = cliente ? escapeHtml(cliente.nombre_completo) : '';
  const clienteTelefono = cliente ? escapeHtml(cliente.telefono) : '';
  const tieneInstrucciones = Boolean(servicio.instrucciones && String(servicio.instrucciones).trim() !== '');

  let html = `
    <div class="agenda-step-content animate-fade-in">
      <div class="agenda-form-layout">
        
        <!-- Tarjeta de Resumen de Cita -->
        <aside class="agenda-summary-card" aria-label="Resumen de la cita elegida">
          <h4><i class="fas fa-clipboard-check" aria-hidden="true"></i> Resumen de tu cita</h4>
          
          <div class="summary-row">
            <span>Servicio:</span>
            <strong>${escapeHtml(servicio.nombre)}</strong>
          </div>
          <div class="summary-row">
            <span>Duración:</span>
            <span>${servicio.duracion_minutos} minutos</span>
          </div>
          <div class="summary-row">
            <span>Fecha:</span>
            <strong>${fechaTexto}</strong>
          </div>
          <div class="summary-row">
            <span>Horario:</span>
            <strong>${hora.hora_inicio} a ${hora.hora_fin} hrs</strong>
          </div>
          <div class="summary-row total">
            <span>Precio estimado:</span>
            <strong class="price-highlight">${precioTexto}</strong>
          </div>

          ${tieneInstrucciones ? `
            <!-- Instrucciones del Servicio (Solo si existen) -->
            <div class="summary-instructions" role="note" aria-label="Instrucciones previas al servicio">
              <div class="instructions-header">
                <i class="fas fa-info-circle" aria-hidden="true"></i>
                <strong>Instrucciones del servicio:</strong>
              </div>
              <p class="instructions-text">${escapeHtml(servicio.instrucciones)}</p>
            </div>
          ` : ''}

          <button class="btn-change-step" id="btn-cambiar-fecha-hora" type="button" style="margin-top: 1.2rem; width: 100%;">
            <i class="fas fa-calendar-alt" aria-hidden="true"></i> Cambiar fecha u horario
          </button>
        </aside>

        <!-- Formulario de Datos del Paciente -->
        <div class="agenda-form-card" role="region" aria-label="Formulario de contacto del paciente">
          <h4><i class="fas fa-user-edit" aria-hidden="true"></i> Completa tus datos</h4>
          <p class="form-desc">Ingresa tus datos para registrar tu espacio y confirmar tu atención.</p>

          <!-- Atajo directo para agendar por llamada telefónica -->
          <div class="no-whatsapp-banner" role="complementary">
            <div class="banner-text">
              <i class="fas fa-phone-volume" aria-hidden="true"></i>
              <span>¿No tienes WhatsApp o prefieres agendar por llamada?</span>
            </div>
            <a href="tel:+523121064455" class="btn-call-shortcut" aria-label="Llamar directamente al 312 106 4455">
              <i class="fas fa-phone-alt" aria-hidden="true"></i> Llamar al (312) 106-4455
            </a>
          </div>

          <!-- Banner de error accesible -->
          <div id="form-error-box" class="agenda-alert error" style="display: none;" role="alert"></div>

          <form id="form-agendar-cita" novalidate>
            
            <!-- Selector de Preferencia de Confirmación -->
            <div class="form-group contact-method-group">
              <label class="contact-method-title">
                <i class="fas fa-paper-plane" aria-hidden="true"></i> ¿Cómo prefieres confirmar tu cita? <span class="req" aria-hidden="true">*</span>
              </label>
              <div class="contact-options-grid" role="radiogroup" aria-label="Preferencia de contacto">
                <label class="contact-option-card selected" id="opt-method-whatsapp">
                  <input type="radio" name="medio_contacto" value="whatsapp" checked>
                  <span class="option-icon"><i class="fab fa-whatsapp" aria-hidden="true"></i></span>
                  <span class="option-info">
                    <strong>Vía WhatsApp</strong>
                    <small>Recomendado • Mensaje precargado</small>
                  </span>
                </label>

                <label class="contact-option-card" id="opt-method-llamada">
                  <input type="radio" name="medio_contacto" value="llamada">
                  <span class="option-icon phone-icon"><i class="fas fa-phone-alt" aria-hidden="true"></i></span>
                  <span class="option-info">
                    <strong>Vía Llamada Celular</strong>
                    <small>Si no cuentas con WhatsApp</small>
                  </span>
                </label>
              </div>
            </div>

            <!-- Campo: Celular -->
            <div class="form-group">
              <label for="paciente_telefono" id="label-telefono">
                <i class="fas fa-mobile-alt" aria-hidden="true"></i> Número de Celular <span class="req" aria-hidden="true">*</span>
              </label>
              <input type="tel" 
                     id="paciente_telefono" 
                     name="telefono" 
                     value="${clienteTelefono}"
                     placeholder="Ej. 312 123 4567 (10 dígitos)" 
                     maxlength="15" 
                     required 
                     autocomplete="tel"
                     aria-describedby="telefono-hint">
              <small id="telefono-hint" class="form-hint">
                Se usará para autocompletar tus datos si ya eres paciente y coordinar tu cita.
              </small>
            </div>

            <!-- Notificación de reconocimiento de cliente recurrente -->
            <div id="cliente-reconocido-box" 
                 class="agenda-alert success" 
                 style="${cliente ? 'display: block;' : 'display: none;'}" 
                 role="status" 
                 aria-live="polite">
              ${cliente ? `<i class="fas fa-check-circle" aria-hidden="true"></i> ¡Hola de nuevo, <strong>${clienteNombre}</strong>! Hemos precargado tus datos.` : ''}
            </div>

            <!-- Campo: Nombre Completo -->
            <div class="form-group">
              <label for="paciente_nombre">
                <i class="fas fa-user" aria-hidden="true"></i> Nombre completo <span class="req" aria-hidden="true">*</span>
              </label>
              <input type="text" 
                     id="paciente_nombre" 
                     name="nombre" 
                     value="${clienteNombre}"
                     placeholder="Nombre y Apellidos" 
                     required 
                     autocomplete="name">
            </div>

            <!-- Campo: Notas o Síntomas -->
            <div class="form-group">
              <label for="paciente_notas">
                <i class="fas fa-comment-medical" aria-hidden="true"></i> ¿Tienes algún síntoma o motivo específico? (Opcional)
              </label>
              <textarea id="paciente_notas" 
                        name="notas" 
                        rows="3" 
                        placeholder="Describe brevemente tus dudas o molestias para prepararnos mejor..."></textarea>
            </div>

            <!-- Botón de Envío Dinámico -->
            <button type="submit" 
                    id="btn-submit-cita" 
                    class="btn-primary btn-submit-agenda"
                    ${submitting ? 'disabled' : ''}>
              ${submitting 
                ? '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Procesando tu cita...' 
                : '<i class="fab fa-whatsapp" aria-hidden="true"></i> Confirmar y Generar WhatsApp'}
            </button>

            <p class="form-disclaimer">
              <i class="fas fa-shield-alt" aria-hidden="true"></i> Tus datos personales están protegidos de forma confidencial y segura.
            </p>
          </form>
        </div>

      </div>
    </div>
  `;

  return html;
}

/**
 * Asocia los escuchadores de eventos para el formulario de citas.
 * @param {HTMLElement} container - Contenedor raíz.
 * @param {function(string): void} onPhoneLookup - Callback para consultar cliente al escribir 10 dígitos.
 * @param {function({ nombre: string, telefono: string, notas: string, medio_contacto: string }): void} onSubmit - Callback de envío con datos limpios.
 * @param {function(): void} onChangeFechaHora - Callback al pulsar "Cambiar fecha u horario".
 */
export function attachFormListeners(container, onPhoneLookup, onSubmit, onChangeFechaHora) {
  const changeBtn = container.querySelector('#btn-cambiar-fecha-hora');
  if (changeBtn && typeof onChangeFechaHora === 'function') {
    changeBtn.addEventListener('click', onChangeFechaHora);
  }

  const inputTelefono = container.querySelector('#paciente_telefono');
  const inputNombre = container.querySelector('#paciente_nombre');
  const inputNotas = container.querySelector('#paciente_notas');
  const errorBox = container.querySelector('#form-error-box');
  const form = container.querySelector('#form-agendar-cita');
  const submitBtn = container.querySelector('#btn-submit-cita');

  // Control interactivo del método de contacto (WhatsApp vs Llamada)
  const radioMethodWhatsApp = container.querySelector('input[name="medio_contacto"][value="whatsapp"]');
  const radioMethodLlamada = container.querySelector('input[name="medio_contacto"][value="llamada"]');
  const cardWhatsApp = container.querySelector('#opt-method-whatsapp');
  const cardLlamada = container.querySelector('#opt-method-llamada');

  function updateMethodUI(method) {
    if (method === 'llamada') {
      cardLlamada?.classList.add('selected');
      cardWhatsApp?.classList.remove('selected');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-phone-alt" aria-hidden="true"></i> Agendar y Confirmar por Llamada';
      }
    } else {
      cardWhatsApp?.classList.add('selected');
      cardLlamada?.classList.remove('selected');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i> Confirmar y Generar WhatsApp';
      }
    }
  }

  radioMethodWhatsApp?.addEventListener('change', () => updateMethodUI('whatsapp'));
  radioMethodLlamada?.addEventListener('change', () => updateMethodUI('llamada'));

  // Debounce para búsqueda automática de cliente por teléfono
  let debounceTimer = null;
  if (inputTelefono) {
    inputTelefono.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const digits = sanitizePhone(e.target.value);
      if (digits.length === 10 && typeof onPhoneLookup === 'function') {
        debounceTimer = setTimeout(() => {
          onPhoneLookup(digits);
        }, 350);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
      }

      const rawTelefono = inputTelefono ? inputTelefono.value : '';
      const rawNombre = inputNombre ? inputNombre.value : '';
      const rawNotas = inputNotas ? inputNotas.value : '';
      const selectedMethodInput = form.querySelector('input[name="medio_contacto"]:checked');
      const medioContacto = selectedMethodInput ? selectedMethodInput.value : 'whatsapp';

      const cleanPhone = sanitizePhone(rawTelefono);
      const cleanNombre = rawNombre.trim();
      const cleanNotas = rawNotas.trim();

      // Validaciones en cliente
      if (!cleanNombre) {
        mostrarError('Por favor ingresa tu nombre completo.');
        inputNombre?.focus();
        return;
      }

      if (!isValidMexicanPhone(cleanPhone)) {
        mostrarError('Por favor ingresa un número de celular válido a 10 dígitos (Ej. 312 123 4567).');
        inputTelefono?.focus();
        return;
      }

      if (typeof onSubmit === 'function') {
        onSubmit({
          nombre: cleanNombre,
          telefono: cleanPhone,
          notas: cleanNotas,
          medio_contacto: medioContacto
        });
      }
    });
  }

  /**
   * Muestra un mensaje de error accesible dentro del formulario sin usar alert().
   * @param {string} msg
   */
  function mostrarError(msg) {
    if (errorBox) {
      errorBox.innerHTML = `<i class="fas fa-exclamation-circle" aria-hidden="true"></i> ${escapeHtml(msg)}`;
      errorBox.style.display = 'block';
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}
