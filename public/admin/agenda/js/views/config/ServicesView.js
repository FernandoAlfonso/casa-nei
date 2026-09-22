import ApiService from '../../services/api.js';

export default class ServicesView {
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <button onclick="window.location.hash='#settings'" class="btn btn-secondary" style="padding: 4px 12px; margin-bottom: 8px;">&larr; Volver</button>
            <h1 style="font-size: 1.6rem;">Servicios</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Catálogo de Terapias</p>
          </div>
          <button class="btn" id="btnNuevoServicio" style="width: auto; padding: 10px 16px;">
            ➕ Nuevo
          </button>
        </header>

        <div id="servicesList" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  async mount() {
    this.container = document.getElementById('servicesList');
    this.btnNuevo = document.getElementById('btnNuevoServicio');

    this.btnNuevo.addEventListener('click', () => this.abrirModal());

    await this.loadServicios();
  }

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
        const opacity = s.activo ? '1' : '0.5';
        html += `
          <div class="card" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; opacity: ${opacity};">
            <div>
              <h3 style="font-size: 1.1rem; margin-bottom: 4px;">${s.nombre}</h3>
              ${s.descripcion ? `<p style="font-size: 0.9rem; margin-bottom: 6px;">${s.descripcion}</p>` : ''}
              ${s.instrucciones ? `<p style="font-size: 0.85rem; color: var(--primary); margin-bottom: 6px;"><small>Instrucciones: ${s.instrucciones}</small></p>` : ''}
              <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: bold;">${s.duracion_minutos} minutos &bull; $${s.precio || '0'}</p>
            </div>
            <button class="btn btn-secondary btn-edit" data-id="${s.id}" style="width: auto; padding: 8px 12px;">Editar</button>
          </div>
        `;
      });
      this.container.innerHTML = html;

      this.container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = parseInt(e.target.dataset.id, 10);
          const servicio = this.servicios.find(s => s.id === id);
          this.abrirModal(servicio);
        });
      });
    } catch (error) {
      this.container.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }

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

    // Para simplificar, usamos prompts (en vez de un HTML modal completo)
    // Ya que esto es un admin rápido. Pero hagámoslo bien con un div overlay temporal
    const overlay = document.createElement('div');
    overlay.style = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;';
    
    overlay.innerHTML = `
      <div class="card" style="width: 100%; max-width: 400px; padding: 24px;">
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
          <div style="display: flex; gap: 16px;">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">Duración (min)</label>
              <input type="number" id="srv_duracion" class="form-input" value="${duracion}" required>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label">Precio ($)</label>
              <input type="number" id="srv_precio" class="form-input" value="${precio}">
            </div>
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="srv_activo" style="width: 20px; height: 20px;" ${checked}>
            <label for="srv_activo">Activo (Visible al público)</label>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="button" id="btnCancelModal" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
            <button type="submit" class="btn" style="flex: 1;">Guardar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    // Safely set textarea values to avoid HTML parsing issues
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
        alert("Error al guardar: " + error.message);
      }
    });
  }
}
