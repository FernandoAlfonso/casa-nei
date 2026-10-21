/**
 * Casa Nei - Vista de Catálogo de Servicios
 *
 * Accesibilidad para daltonismo:
 *  - Botón "Nuevo": icono + + verde
 *  - Botón "Editar": icono lápiz + secundario
 *  - Botón "Guardar" en modal: icono disco + azul
 *  - Botón "Cancelar" en modal: icono flecha + secundario
 *  - Servicios inactivos se muestran con opacidad reducida (no solo con color)
 *
 * @module views/config/ServicesView
 */

import ApiService from '../../services/api.js';
import {
  iconPlusCircleFill,
  iconPencilFill,
  iconFloppyFill,
  iconArrowLeft,
  iconStarFill
} from '../../icons.js';

/**
 * Vista de administración del catálogo de terapias/servicios.
 * Permite listar, crear y editar servicios con sus precios y duraciones.
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
              <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: bold;">${s.duracion_minutos} minutos &bull; $${s.precio || '0'}</p>
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
   * Abre el modal para crear o editar un servicio.
   * Usa un overlay con backdrop blur. Accesible con teclado.
   *
   * @param {Object|null} [data=null] - Datos del servicio a editar, o null para crear nuevo
   * @param {number} [data.id] - ID del servicio
   * @param {string} [data.nombre] - Nombre del servicio
   * @param {string} [data.descripcion] - Descripción del servicio
   * @param {string} [data.instrucciones] - Instrucciones del servicio
   * @param {number} [data.duracion_minutos] - Duración en minutos
   * @param {number} [data.precio] - Precio del servicio
   * @param {boolean} [data.activo] - Si el servicio está activo
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

    const overlay = document.createElement('div');
    overlay.style = 'position: fixed; inset: 0; background: rgba(25, 36, 28, 0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;';
    
    overlay.innerHTML = `
      <div class="card" style="width: 100%; max-width: 400px; padding: 24px; box-shadow: var(--shadow-lg);">
        <h3 style="margin-bottom: 16px;">${title}</h3>
        <form id="servicioForm">
          <input type="hidden" id="srv_id" value="${id}">
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input type="text" id="srv_nombre" class="form-input" value="${nombre}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea id="srv_descripcion" class="form-input" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Instrucciones</label>
            <textarea id="srv_instrucciones" class="form-input" rows="2"></textarea>
          </div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 0;">
              <label class="form-label">Duración (min)</label>
              <input type="number" id="srv_duracion" class="form-input" value="${duracion}" required>
            </div>
            <div class="form-group" style="flex: 1; min-width: 0;">
              <label class="form-label">Precio ($)</label>
              <input type="number" id="srv_precio" class="form-input" value="${precio}">
            </div>
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="srv_activo" style="width: 20px; height: 20px;" ${checked}>
            <label for="srv_activo">Activo (Visible al público)</label>
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

    document.getElementById('btnCancelModal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.getElementById('servicioForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        id: document.getElementById('srv_id').value,
        nombre: document.getElementById('srv_nombre').value,
        descripcion: document.getElementById('srv_descripcion').value || null,
        instrucciones: document.getElementById('srv_instrucciones').value || null,
        duracion_minutos: document.getElementById('srv_duracion').value,
        precio: document.getElementById('srv_precio').value,
        activo: document.getElementById('srv_activo').checked
      };

      const endpoint = isEdit ? '/admin/config/servicios/actualizar' : '/admin/config/servicios/crear';

      try {
        await ApiService.post(endpoint, payload);
        document.body.removeChild(overlay);
        await this.loadServicios();
      } catch (error) {
        alert('Error al guardar: ' + error.message);
      }
    });
  }
}
