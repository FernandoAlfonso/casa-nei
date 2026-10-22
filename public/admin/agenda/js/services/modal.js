/**
 * Casa Nei - Servicio Centralizado de Diálogos Modales (PWA / Móvil)
 *
 * Reemplaza alert(), confirm() y prompt() nativos del navegador por modales
 * UI elegantes, asíncronos y totalmente accesibles, eliminando:
 *  - El parpadeo/flickering en emuladores y DevTools
 *  - Los bloqueos del hilo principal (Event Loop)
 *  - La exposición de URLs en iOS Standalone / PWA
 *  - El riesgo de bloqueo automático de diálogos en Android Chrome
 *
 * Soporta la triple redundancia para daltonismo (iconos SVG + colores diferenciados).
 *
 * @module services/modal
 */

import {
  iconCheckCircleFill,
  iconXCircleFill,
  iconExclamationTriangleFill,
  iconTrashFill,
  iconArrowLeft,
  iconFloppyFill
} from '../icons.js';

/**
 * Servicio estático para mostrar diálogos modales no bloqueantes.
 */
export default class ModalService {
  /**
   * Crea la estructura base de overlay para un modal.
   *
   * @private
   * @returns {HTMLDivElement} Elemento overlay
   */
  static _createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(25, 36, 28, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      box-sizing: border-box;
    `;
    return overlay;
  }

  /**
   * Muestra un diálogo informativo o de error (reemplazo de alert).
   *
   * @param {string|Object} options - Mensaje o configuración del alert
   * @param {string} [options.title] - Título del modal
   * @param {string} options.message - Texto o descripción del aviso
   * @param {'info'|'success'|'error'|'warning'} [options.type='info'] - Tipo visual y semántico
   * @param {string} [options.confirmText='Entendido'] - Texto del botón de cierre
   * @returns {Promise<void>}
   */
  static alert(options) {
    const config = typeof options === 'string'
      ? { message: options }
      : { ...options };

    const type = config.type || (config.title && config.title.toLowerCase().includes('error') ? 'error' : 'info');
    let title = config.title;
    if (!title) {
      if (type === 'error') title = 'Error';
      else if (type === 'success') title = 'Éxito';
      else if (type === 'warning') title = 'Atención';
      else title = 'Aviso';
    }

    const confirmText = config.confirmText || 'Entendido';

    let iconHtml = '';
    let iconColor = 'var(--primary)';
    if (type === 'error') {
      iconHtml = iconXCircleFill();
      iconColor = 'var(--btn-orange-bg)';
    } else if (type === 'warning') {
      iconHtml = iconExclamationTriangleFill();
      iconColor = 'var(--accent)';
    } else {
      iconHtml = iconCheckCircleFill();
      iconColor = 'var(--primary)';
    }

    return new Promise((resolve) => {
      const overlay = this._createOverlay();
      overlay.innerHTML = `
        <div class="card fade-in" style="width: 100%; max-width: 380px; padding: 24px; box-shadow: var(--shadow-lg); text-align: center; margin: 0 auto;">
          <div style="color: ${iconColor}; font-size: 2.2rem; margin-bottom: 12px; display: flex; justify-content: center;">
            ${iconHtml}
          </div>
          <h3 id="modalAlertTitle" style="font-size: 1.25rem; margin-bottom: 8px; color: var(--text-main);"></h3>
          <p id="modalAlertMsg" style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.45; white-space: pre-wrap; word-break: break-word;"></p>
          <div style="display: flex;">
            <button type="button" id="btnModalAlertOk" class="btn btn-secondary" style="flex: 1; padding: 12px 16px;">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      // Asignar texto de forma segura para prevenir inyección HTML
      overlay.querySelector('#modalAlertTitle').textContent = title;
      overlay.querySelector('#modalAlertMsg').textContent = config.message || '';

      document.body.appendChild(overlay);

      const btnOk = overlay.querySelector('#btnModalAlertOk');
      btnOk.focus();

      const close = () => {
        document.removeEventListener('keydown', handleKey);
        if (overlay.parentNode) document.body.removeChild(overlay);
        resolve();
      };

      const handleKey = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          close();
        }
      };

      document.addEventListener('keydown', handleKey);
      btnOk.addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    });
  }

  /**
   * Muestra un diálogo de confirmación con dos opciones (reemplazo de confirm).
   *
   * @param {string|Object} options - Pregunta o configuración
   * @param {string} [options.title='¿Confirmar acción?'] - Título del diálogo
   * @param {string} options.message - Explicación o detalle de la acción
   * @param {string} [options.confirmText='Aceptar'] - Texto del botón de confirmación
   * @param {string} [options.cancelText='Cancelar'] - Texto del botón de cancelación
   * @param {'delete'|'reject'|'accept'|'save'|'default'} [options.confirmType='default'] - Estilo del botón
   * @param {string} [options.icon] - Icono personalizado ('trash', 'check', 'warning')
   * @returns {Promise<boolean>} Resuelve true si el usuario confirma, false si cancela
   */
  static confirm(options) {
    const config = typeof options === 'string'
      ? { message: options }
      : { ...options };

    const title = config.title || '¿Confirmar acción?';
    const message = config.message || '';
    const confirmText = config.confirmText || 'Aceptar';
    const cancelText = config.cancelText || 'Cancelar';
    const confirmType = config.confirmType || 'default';

    let btnClass = 'btn-add';
    let iconBtn = iconCheckCircleFill('icon-btn');
    let topIcon = iconCheckCircleFill();
    let topIconColor = 'var(--primary)';

    if (confirmType === 'delete' || confirmType === 'danger') {
      btnClass = 'btn-delete';
      iconBtn = iconTrashFill('icon-btn');
      topIcon = iconTrashFill();
      topIconColor = 'var(--btn-orange-bg)';
    } else if (confirmType === 'reject') {
      btnClass = 'btn-reject';
      iconBtn = iconXCircleFill('icon-btn');
      topIcon = iconXCircleFill();
      topIconColor = 'var(--btn-orange-bg)';
    } else if (confirmType === 'save') {
      btnClass = 'btn-save';
      iconBtn = iconFloppyFill('icon-btn');
      topIcon = iconFloppyFill();
      topIconColor = 'var(--btn-blue-bg)';
    } else if (config.icon === 'warning') {
      topIcon = iconExclamationTriangleFill();
      topIconColor = 'var(--accent)';
    }

    return new Promise((resolve) => {
      const overlay = this._createOverlay();
      overlay.innerHTML = `
        <div class="card fade-in" style="width: 100%; max-width: 380px; padding: 24px; box-shadow: var(--shadow-lg); text-align: center; margin: 0 auto;">
          <div style="color: ${topIconColor}; font-size: 2.2rem; margin-bottom: 12px; display: flex; justify-content: center;">
            ${topIcon}
          </div>
          <h3 id="modalConfirmTitle" style="font-size: 1.25rem; margin-bottom: 8px; color: var(--text-main);"></h3>
          <p id="modalConfirmMsg" style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.45; white-space: pre-wrap; word-break: break-word;"></p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button type="button" id="btnModalCancel" class="btn btn-secondary" style="flex: 1; padding: 10px 14px; min-width: 110px;">
              ${iconArrowLeft('icon-btn')} ${cancelText}
            </button>
            <button type="button" id="btnModalConfirm" class="btn ${btnClass}" style="flex: 1; padding: 10px 14px; min-width: 110px;">
              ${iconBtn} ${confirmText}
            </button>
          </div>
        </div>
      `;

      overlay.querySelector('#modalConfirmTitle').textContent = title;
      overlay.querySelector('#modalConfirmMsg').textContent = message;

      document.body.appendChild(overlay);

      const btnConfirm = overlay.querySelector('#btnModalConfirm');
      const btnCancel = overlay.querySelector('#btnModalCancel');
      btnConfirm.focus();

      const finish = (result) => {
        document.removeEventListener('keydown', handleKey);
        if (overlay.parentNode) document.body.removeChild(overlay);
        resolve(result);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      };

      document.addEventListener('keydown', handleKey);
      btnCancel.addEventListener('click', () => finish(false));
      btnConfirm.addEventListener('click', () => finish(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finish(false);
      });
    });
  }

  /**
   * Muestra un diálogo de captura de texto (reemplazo de prompt).
   *
   * @param {Object} options - Configuración del prompt
   * @param {string} options.title - Título del diálogo
   * @param {string} [options.message] - Indicación o subtítulo
   * @param {string} [options.placeholder=''] - Placeholder del campo de entrada
   * @param {string} [options.defaultValue=''] - Valor inicial
   * @param {boolean} [options.isTextarea=false] - Si debe renderizar un textarea en lugar de input
   * @param {string} [options.confirmText='Aceptar'] - Texto del botón de confirmación
   * @param {string} [options.cancelText='Cancelar'] - Texto del botón de cancelación
   * @param {'accept'|'reject'|'save'|'default'} [options.confirmType='default'] - Estilo del botón
   * @returns {Promise<string|null>} Resuelve con el texto ingresado o null si se cancela
   */
  static prompt(options) {
    const config = typeof options === 'string'
      ? { title: options }
      : { ...options };

    const title = config.title || 'Ingrese la información';
    const message = config.message || '';
    const placeholder = config.placeholder || '';
    const defaultValue = config.defaultValue || '';
    const isTextarea = !!config.isTextarea;
    const confirmText = config.confirmText || 'Aceptar';
    const cancelText = config.cancelText || 'Cancelar';
    const confirmType = config.confirmType || 'default';

    let btnClass = 'btn-add';
    let iconBtn = iconCheckCircleFill('icon-btn');
    if (confirmType === 'reject' || confirmType === 'delete') {
      btnClass = 'btn-reject';
      iconBtn = iconXCircleFill('icon-btn');
    } else if (confirmType === 'save') {
      btnClass = 'btn-save';
      iconBtn = iconFloppyFill('icon-btn');
    }

    return new Promise((resolve) => {
      const overlay = this._createOverlay();
      const inputHtml = isTextarea
        ? `<textarea id="modalPromptInput" class="form-input" rows="3" style="width: 100%; box-sizing: border-box; resize: vertical;" placeholder="${placeholder}"></textarea>`
        : `<input type="text" id="modalPromptInput" class="form-input" style="width: 100%; box-sizing: border-box;" placeholder="${placeholder}">`;

      overlay.innerHTML = `
        <div class="card fade-in" style="width: 100%; max-width: 420px; padding: 24px; box-shadow: var(--shadow-lg); margin: 0 auto;">
          <h3 id="modalPromptTitle" style="font-size: 1.25rem; margin-bottom: 8px; color: var(--text-main);"></h3>
          ${message ? `<p id="modalPromptMsg" style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.4;"></p>` : ''}
          <form id="modalPromptForm" style="margin-bottom: 0;">
            <div class="form-group" style="margin-bottom: 20px;">
              ${inputHtml}
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button type="button" id="btnPromptCancel" class="btn btn-secondary" style="flex: 1; padding: 10px 14px; min-width: 110px;">
                ${iconArrowLeft('icon-btn')} ${cancelText}
              </button>
              <button type="submit" id="btnPromptConfirm" class="btn ${btnClass}" style="flex: 1; padding: 10px 14px; min-width: 110px;">
                ${iconBtn} ${confirmText}
              </button>
            </div>
          </form>
        </div>
      `;

      overlay.querySelector('#modalPromptTitle').textContent = title;
      if (message) {
        overlay.querySelector('#modalPromptMsg').textContent = message;
      }

      const inputEl = overlay.querySelector('#modalPromptInput');
      inputEl.value = defaultValue;

      document.body.appendChild(overlay);

      // Auto foco al input en el siguiente tick
      setTimeout(() => {
        inputEl.focus();
        if (inputEl.setSelectionRange) {
          inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        }
      }, 50);

      const finish = (result) => {
        document.removeEventListener('keydown', handleKey);
        if (overlay.parentNode) document.body.removeChild(overlay);
        resolve(result);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        }
      };

      document.addEventListener('keydown', handleKey);

      overlay.querySelector('#btnPromptCancel').addEventListener('click', () => finish(null));
      overlay.querySelector('#modalPromptForm').addEventListener('submit', (e) => {
        e.preventDefault();
        finish(inputEl.value);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finish(null);
      });
    });
  }
}
