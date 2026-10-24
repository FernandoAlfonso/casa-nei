/**
 * Casa Nei - Vista de Catálogo de Servicios
 *
 * Accesibilidad para daltonismo:
 *  - Botón "Nuevo": icono + + verde
 *  - Botón "Editar": icono lápiz + secundario
 *  - Botón "Guardar" en modal: icono disco + azul
 *  - Botón "Cancelar" en modal: icono flecha + secundario
 *  - Servicios inactivos se muestran con opacidad reducida (no solo con color)
 *  - Soporte para horario específico por servicio con pills táctiles y badges
 *
 * @module views/config/ServicesView
 */

import ApiService from '../../services/api.js';
import Modal from '../../services/modal.js';
import {
  iconPlusCircleFill,
  iconPencilFill,
  iconFloppyFill,
  iconArrowLeft,
  iconStarFill
} from '../../icons.js';

/**
 * Genera el badge HTML para mostrar en la tarjeta si tiene horario personalizado o general.
 *
 * @param {Array|null} horarioPersonalizado
 * @returns {string} Markup del badge
 */
function formatHorarioBadge(horarioPersonalizado) {
  if (!Array.isArray(horarioPersonalizado) || horarioPersonalizado.length === 0) {
    return `<span class="service-schedule-badge is-general">Horario general</span>`;
  }
  const mapaDias = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom', 7: 'Dom' };
  const resumen = horarioPersonalizado.map(b => {
    const diasTxt = (b.dias || []).map(d => mapaDias[d] || d).join(', ');
    return `${diasTxt} • ${b.hora_inicio} - ${b.hora_fin}`;
  }).join(' | ');

  return `<span class="service-schedule-badge is-custom">${resumen}</span>`;
}

/**
 * Vista de administración del catálogo de terapias/servicios.
 * Permite listar, crear y editar servicios con sus precios, duraciones y horarios específicos.
 */
export default class ServicesView {
  /**
   * Renderiza el markup HTML estructural de la vista de servicios.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <button onclick="window.location.hash='#settings'" class="btn btn-secondary" style="padding: 4px 12px; margin-bottom: 8px; width: auto;">
              ${iconArrowLeft('icon-btn')} Volver
            </button>
            <h1 style="font-size: 1.6rem;">Servicios</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Catálogo de Terapias</p>
          </div>
          <button class="btn btn-add" id="btnNuevoServicio" style="width: auto; padding: 10px 16px;">
            ${iconPlusCircleFill('icon-btn')} Nuevo
          </button>
        </header>

        <div id="servicesList" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  /**
   * Monta la vista: asigna el evento del botón nuevo y carga el catálogo.
   *
   * @returns {Promise<void>}
   */
  async mount() {
    this.container = document.getElementById('servicesList');
    this.btnNuevo = document.getElementById('btnNuevoServicio');

    this.btnNuevo.addEventListener('click', () => this.abrirModal());

    await this.loadServicios();
  }

  /**
   * Carga el catálogo de servicios desde la API.
   *
   * @returns {Promise<void>}
   */
  async loadServicios() {
    try {
      const response = await ApiService.get('/admin/config/servicios');
      const servicios = response.data || [];
      this.servicios = servicios;
      
      if (servicios.length === 0) {
        this.container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No hay servicios registrados.</p>';
        return;
      }

      let html = '';
      servicios.forEach(s => {
        // Parsear horario_personalizado si viniera como string JSON
        let horarioPers = s.horario_personalizado;
        if (typeof horarioPers === 'string') {
          try {
            horarioPers = JSON.parse(horarioPers);
          } catch (e) {
            horarioPers = null;
          }
        }
        s.horario_personalizado = horarioPers;

        // Servicios inactivos: opacidad + etiqueta textual (no solo color)
        const inactivoLabel = !s.activo
          ? `<span style="font-size: 0.75rem; background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; margin-left: 8px; color: var(--text-muted);">Inactivo</span>`
          : '';

        html += `
          <div class="card" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; opacity: ${s.activo ? '1' : '0.55'}; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 4px;">
                <span style="color: var(--text-muted); display: flex;">${iconStarFill()}</span>
                <h3 style="font-size: 1.1rem;">${s.nombre}</h3>
                ${inactivoLabel}
              </div>
              ${s.descripcion ? `<p style="font-size: 0.9rem; margin-bottom: 6px;">${s.descripcion}</p>` : ''}
              ${s.instrucciones ? `<p style="font-size: 0.85rem; color: var(--primary); margin-bottom: 6px;"><small>Instrucciones: ${s.instrucciones}</small></p>` : ''}
              <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: bold; margin-bottom: 4px;">${s.duracion_minutos} minutos &bull; $${s.precio || '0'}</p>
              <div>
                ${formatHorarioBadge(s.horario_personalizado)}
              </div>
            </div>
            <button class="btn btn-secondary btn-edit" data-id="${s.id}" style="width: auto; padding: 8px 12px; flex-shrink: 0;">
              ${iconPencilFill('icon-btn')} Editar
            </button>
          </div>
        `;
      });
      this.container.innerHTML = html;

      this.container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = parseInt(e.target.closest('.btn-edit').dataset.id, 10);
          const servicio = this.servicios.find(s => s.id === id);
          this.abrirModal(servicio);
        });
      });
    } catch (error) {
      this.container.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }

  /**
   * Genera el HTML para un bloque individual de horario específico.
   *
   * @param {Object} [bloque] - Datos del bloque de horario
   * @param {number[]} [bloque.dias] - Días de la semana (1=Lunes ... 0=Domingo)
   * @param {string} [bloque.hora_inicio] - Hora de inicio (HH:MM)
   * @param {string} [bloque.hora_fin] - Hora de fin (HH:MM)
   * @param {number} [index=0] - Índice del bloque
   * @returns {string} Markup del bloque
   */
  renderScheduleBlock(bloque = { dias: [1, 3, 5], hora_inicio: '19:00', hora_fin: '21:00' }, index = 0) {
    const diasSemana = [
      { id: 1, label: 'L' },
      { id: 2, label: 'M' },
      { id: 3, label: 'X' },
      { id: 4, label: 'J' },
      { id: 5, label: 'V' },
      { id: 6, label: 'S' },
      { id: 0, label: 'D' }
    ];

    const pillsHtml = diasSemana.map(d => {
      const active = (bloque.dias || []).includes(d.id) || (d.id === 0 && (bloque.dias || []).includes(7)) ? 'active' : '';
      return `<button type="button" class="day-pill ${active}" data-day="${d.id}" aria-label="Día ${d.label}">${d.label}</button>`;
    }).join('');

    return `
      <div class="schedule-block-item" data-index="${index}">
        <div class="day-pills-row">${pillsHtml}</div>
        <div class="time-range-row">
          <div class="time-field">
            <label>De</label>
            <input type="time" class="form-input input-hora-inicio" value="${bloque.hora_inicio || '19:00'}" required aria-label="Hora de inicio">
          </div>
          <div class="time-field">
            <label>a</label>
            <input type="time" class="form-input input-hora-fin" value="${bloque.hora_fin || '21:00'}" required aria-label="Hora de fin">
          </div>
          <button type="button" class="btn-remove-block" title="Eliminar bloque" aria-label="Eliminar bloque">&times;</button>
        </div>
      </div>
    `;
  }

  /**
   * Abre el modal para crear o editar un servicio.
   * Usa un overlay con backdrop blur. Accesible con teclado y optimizado para móvil.
   *
   * @param {Object|null} [data=null] - Datos del servicio a editar, o null para crear nuevo
   */
  abrirModal(data = null) {
    const isEdit = !!data;
    const title = isEdit ? 'Editar Servicio' : 'Nuevo Servicio';
    const id = isEdit ? data.id : '';
    const nombre = isEdit ? data.nombre : '';
    const descripcion = isEdit && data.descripcion ? data.descripcion : '';
    const instrucciones = isEdit && data.instrucciones ? data.instrucciones : '';
    const duracion = isEdit ? data.duracion_minutos : '60';
    const precio = isEdit ? data.precio : '0';
    const checked = isEdit && data.activo === false ? '' : 'checked';

    // Parsear horario personalizado si existe
    let horarioPers = data && data.horario_personalizado ? data.horario_personalizado : null;
    if (typeof horarioPers === 'string') {
      try {
        horarioPers = JSON.parse(horarioPers);
      } catch (e) {
        horarioPers = null;
      }
    }
    const tieneHorario = Array.isArray(horarioPers) && horarioPers.length > 0;

    const overlay = document.createElement('div');
    overlay.style = 'position: fixed; inset: 0; background: rgba(25, 36, 28, 0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;';
    
    overlay.innerHTML = `
      <div class="card" style="width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: var(--shadow-lg);">
        <h3 style="margin-bottom: 16px;">${title}</h3>
        <form id="servicioForm">
          <input type="hidden" id="srv_id" value="${id}">
          <div class="form-group">
            <label class="form-label" for="srv_nombre">Nombre</label>
            <input type="text" id="srv_nombre" class="form-input" value="${nombre}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="srv_descripcion">Descripción</label>
            <textarea id="srv_descripcion" class="form-input" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="srv_instrucciones">Instrucciones</label>
            <textarea id="srv_instrucciones" class="form-input" rows="2"></textarea>
          </div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 0;">
              <label class="form-label" for="srv_duracion">Duración (min)</label>
              <input type="number" id="srv_duracion" class="form-input" value="${duracion}" required>
            </div>
            <div class="form-group" style="flex: 1; min-width: 0;">
              <label class="form-label" for="srv_precio">Precio ($)</label>
              <input type="number" id="srv_precio" class="form-input" value="${precio}">
            </div>
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="srv_activo" style="width: 20px; height: 20px;" ${checked}>
            <label for="srv_activo">Activo (Visible al público)</label>
          </div>

          <!-- Módulo de Horario Personalizado Mobile-First -->
          <div class="form-group schedule-override-box">
            <label class="toggle-row" for="chkHorarioPersonalizado">
              <div class="toggle-info">
                <span class="toggle-title">Horario específico</span>
                <small class="toggle-subtitle" id="scheduleModeLabel">${tieneHorario ? 'Horario personalizado activo' : 'Usa el horario de atención general'}</small>
              </div>
              <input type="checkbox" id="chkHorarioPersonalizado" class="toggle-switch" ${tieneHorario ? 'checked' : ''}>
            </label>

            <div id="customScheduleContainer" class="custom-schedule-container ${tieneHorario ? '' : 'hidden'}">
              <div id="scheduleBlocksList"></div>
              <button type="button" id="btnAddScheduleBlock" class="btn-link-sm">
                + Agregar otro bloque de horario
              </button>
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap;">
            <button type="button" id="btnCancelModal" class="btn btn-secondary" style="flex: 1;">
              ${iconArrowLeft('icon-btn')} Cancelar
            </button>
            <button type="submit" class="btn btn-save" style="flex: 1;">
              ${iconFloppyFill('icon-btn')} Guardar
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    // Asignar valores de textarea de forma segura (evita inyección HTML)
    document.getElementById('srv_descripcion').value = descripcion;
    document.getElementById('srv_instrucciones').value = instrucciones;

    const chkCustom = overlay.querySelector('#chkHorarioPersonalizado');
    const containerCustom = overlay.querySelector('#customScheduleContainer');
    const labelCustom = overlay.querySelector('#scheduleModeLabel');
    const listCustom = overlay.querySelector('#scheduleBlocksList');
    const btnAddBlock = overlay.querySelector('#btnAddScheduleBlock');

    // Inicializar bloques si ya tiene horario personalizado o si se activa
    if (tieneHorario) {
      listCustom.innerHTML = horarioPers.map((b, idx) => this.renderScheduleBlock(b, idx)).join('');
    }

    // Toggle de horario específico
    chkCustom.addEventListener('change', () => {
      if (chkCustom.checked) {
        containerCustom.classList.remove('hidden');
        labelCustom.textContent = 'Horario personalizado activo';
        if (listCustom.querySelectorAll('.schedule-block-item').length === 0) {
          listCustom.innerHTML = this.renderScheduleBlock();
        }
      } else {
        containerCustom.classList.add('hidden');
        labelCustom.textContent = 'Usa el horario de atención general';
      }
    });

    // Añadir nuevo bloque
    btnAddBlock.addEventListener('click', () => {
      const totalBlocks = listCustom.querySelectorAll('.schedule-block-item').length;
      const nuevoBloqueHtml = this.renderScheduleBlock({ dias: [6], hora_inicio: '09:00', hora_fin: '14:00' }, totalBlocks);
      listCustom.insertAdjacentHTML('beforeend', nuevoBloqueHtml);
    });

    // Delegación de eventos para pills táctiles y eliminación de bloques
    listCustom.addEventListener('click', (e) => {
      const pill = e.target.closest('.day-pill');
      if (pill) {
        pill.classList.toggle('active');
        return;
      }

      const btnRemove = e.target.closest('.btn-remove-block');
      if (btnRemove) {
        const item = btnRemove.closest('.schedule-block-item');
        const count = listCustom.querySelectorAll('.schedule-block-item').length;
        if (count > 1) {
          item.remove();
        } else {
          // Si es el único bloque, desactivamos el interruptor
          item.remove();
          chkCustom.checked = false;
          containerCustom.classList.add('hidden');
          labelCustom.textContent = 'Usa el horario de atención general';
        }
      }
    });

    // Cancelar modal
    document.getElementById('btnCancelModal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    // Guardar servicio
    document.getElementById('servicioForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      let horarioFinal = null;
      if (chkCustom.checked) {
        const bloques = [];
        listCustom.querySelectorAll('.schedule-block-item').forEach(item => {
          const dias = Array.from(item.querySelectorAll('.day-pill.active'))
                            .map(btn => parseInt(btn.dataset.day, 10));
          const horaInicio = item.querySelector('.input-hora-inicio').value;
          const horaFin = item.querySelector('.input-hora-fin').value;

          if (dias.length > 0 && horaInicio && horaFin) {
            bloques.push({ dias, hora_inicio: horaInicio, hora_fin: horaFin });
          }
        });

        if (bloques.length === 0) {
          await Modal.alert({
            title: 'Horario requerido',
            message: 'Has activado el horario específico. Selecciona al menos un día en el bloque o desactiva el interruptor.',
            type: 'warning'
          });
          return;
        }

        // Validar coherencia de horas (inicio < fin)
        for (const b of bloques) {
          if (b.hora_inicio >= b.hora_fin) {
            await Modal.alert({
              title: 'Rango de horario inválido',
              message: `La hora de inicio (${b.hora_inicio}) debe ser anterior a la hora de fin (${b.hora_fin}).`,
              type: 'warning'
            });
            return;
          }
        }

        horarioFinal = bloques;
      }
      
      const payload = {
        id: document.getElementById('srv_id').value,
        nombre: document.getElementById('srv_nombre').value,
        descripcion: document.getElementById('srv_descripcion').value || null,
        instrucciones: document.getElementById('srv_instrucciones').value || null,
        duracion_minutos: document.getElementById('srv_duracion').value,
        precio: document.getElementById('srv_precio').value,
        activo: document.getElementById('srv_activo').checked,
        horario_personalizado: horarioFinal
      };

      const endpoint = isEdit ? '/admin/config/servicios/actualizar' : '/admin/config/servicios/crear';

      try {
        await ApiService.post(endpoint, payload);
        document.body.removeChild(overlay);
        await this.loadServicios();
      } catch (error) {
        await Modal.alert({
          title: 'Error al guardar',
          message: error.message,
          type: 'error'
        });
      }
    });
  }
}
