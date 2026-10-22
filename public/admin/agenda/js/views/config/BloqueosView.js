/**
 * Casa Nei - Vista de Bloqueos y Vacaciones
 *
 * Accesibilidad para daltonismo:
 *  - Borde lateral de bloqueo: naranja-oscuro (var --btn-orange-bg) en lugar de rojo
 *  - Icono de candado al lado del borde para diferenciador adicional
 *  - Botón eliminar: icono de basura + naranja-oscuro
 *  - Botón nuevo: icono de + + verde
 *
 * @module views/config/BloqueosView
 */

import ApiService from '../../services/api.js';
import Modal from '../../services/modal.js';
import {
  iconLockFill,
  iconTrashFill,
  iconPlusCircleFill,
  iconArrowLeft,
  iconFloppyFill
} from '../../icons.js';

/**
 * Vista de administración de bloqueos de agenda (festivos, ausencias, vacaciones).
 * Permite listar, crear y eliminar bloqueos de días completos.
 */
export default class BloqueosView {
  /**
   * Renderiza el markup HTML estructural de la vista de bloqueos.
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
            <h1 style="font-size: 1.6rem;">Bloqueos</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Festivos y ausencias</p>
          </div>
          <button class="btn btn-add" id="btnNuevoBloqueo" style="width: auto; padding: 10px 16px;">
            ${iconPlusCircleFill('icon-btn')} Nuevo
          </button>
        </header>

        <div id="bloqueosList" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  /**
   * Monta la vista: referencia el contenedor y carga la lista de bloqueos.
   *
   * @returns {Promise<void>}
   */
  async mount() {
    this.container = document.getElementById('bloqueosList');
    this.btnNuevo = document.getElementById('btnNuevoBloqueo');

    this.btnNuevo.addEventListener('click', () => this.abrirModal());

    await this.loadBloqueos();
  }

  /**
   * Carga la lista de bloqueos activos y futuros desde la API.
   *
   * @returns {Promise<void>}
   */
  async loadBloqueos() {
    try {
      const response = await ApiService.get('/admin/config/bloqueos');
      const bloqueos = response.data || [];
      
      if (bloqueos.length === 0) {
        this.container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No hay bloqueos activos ni futuros.</p>';
        return;
      }

      let html = '';
      bloqueos.forEach(b => {
        html += `
          <div class="card" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--btn-orange-bg); gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0;">
              <span style="color: var(--btn-orange-bg); display: flex; flex-shrink: 0; margin-top: 2px;">${iconLockFill()}</span>
              <div>
                <h3 style="font-size: 1.1rem; color: var(--text-main);">${b.fecha}</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted);">${b.es_dia_completo ? 'Día completo' : b.hora_inicio + ' - ' + b.hora_fin}</p>
                ${b.motivo ? `<p style="font-size: 0.85rem; color: var(--text-main); margin-top: 4px;">Motivo: ${b.motivo}</p>` : ''}
              </div>
            </div>
            <button class="btn btn-delete btn-del" data-id="${b.id}" style="width: auto; padding: 8px 14px;" title="Eliminar bloqueo">
              ${iconTrashFill('icon-btn')} Eliminar
            </button>
          </div>
        `;
      });
      this.container.innerHTML = html;

      this.container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', (e) => this.eliminarBloqueo(e.target.closest('.btn-del').dataset.id));
      });
    } catch (error) {
      this.container.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }

  /**
   * Elimina un bloqueo por ID tras confirmar con el usuario mediante modal UI.
   *
   * @param {string} id - ID del bloqueo a eliminar
   * @returns {Promise<void>}
   */
  async eliminarBloqueo(id) {
    const confirmado = await Modal.confirm({
      title: '¿Eliminar bloqueo?',
      message: 'Esta fecha volverá a estar disponible para citas de pacientes.',
      confirmText: 'Eliminar',
      confirmType: 'delete'
    });
    if (!confirmado) return;

    try {
      await ApiService.post('/admin/config/bloqueos/eliminar', { id });
      await this.loadBloqueos();
    } catch (error) {
      await Modal.alert({
        title: 'Error al eliminar',
        message: error.message,
        type: 'error'
      });
    }
  }

  /**
   * Abre el modal de creación de nuevo bloqueo.
   * El modal usa backdrop blur y es accesible con teclado.
   */
  abrirModal() {
    const overlay = document.createElement('div');
    overlay.style = 'position: fixed; inset: 0; background: rgba(25, 36, 28, 0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;';
    
    overlay.innerHTML = `
      <div class="card" style="width: 100%; max-width: 400px; padding: 24px; box-shadow: var(--shadow-lg);">
        <h3 style="margin-bottom: 16px;">Nuevo Bloqueo (Día completo)</h3>
        <form id="bloqueoForm">
          <div class="form-group">
            <label class="form-label">Fecha a bloquear</label>
            <input type="date" id="bl_fecha" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Motivo (Opcional)</label>
            <input type="text" id="bl_motivo" class="form-input" placeholder="Vacaciones, Festivo, Enfermedad...">
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

    document.getElementById('btnCancelModal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.getElementById('bloqueoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        fecha: document.getElementById('bl_fecha').value,
        hora_inicio: '00:00:00',
        hora_fin: '23:59:59',
        motivo: document.getElementById('bl_motivo').value
      };

      try {
        await ApiService.post('/admin/config/bloqueos/crear', payload);
        document.body.removeChild(overlay);
        await this.loadBloqueos();
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
