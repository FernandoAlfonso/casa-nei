import ApiService from '../../services/api.js';

export default class HorariosView {
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <button onclick="window.location.hash='#settings'" class="btn btn-secondary" style="padding: 4px 12px; margin-bottom: 8px;">&larr; Volver</button>
          <h1 style="font-size: 1.6rem;">Horarios de Atención</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Configura los días laborales</p>
        </header>

        <div id="horariosList" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  async mount() {
    this.container = document.getElementById('horariosList');
    await this.loadHorarios();
  }

  async loadHorarios() {
    try {
      const response = await ApiService.get('/admin/config/horarios');
      const horarios = response.data || [];
      
      let html = '';
      const diasStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

      horarios.forEach(h => {
        const isActivo = h.activo;
        html += `
          <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; opacity: ${isActivo ? '1' : '0.5'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 1.1rem; width: 100px;">${diasStr[h.dia_semana]}</h3>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" class="chk-activo" data-id="${h.id}" ${isActivo ? 'checked' : ''} style="width: 20px; height: 20px;">
                <span style="font-size: 0.85rem;">Laboral</span>
              </div>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <input type="time" class="form-input input-inicio" data-id="${h.id}" value="${h.hora_inicio.substring(0, 5)}" ${!isActivo ? 'disabled' : ''}>
              <span>-</span>
              <input type="time" class="form-input input-fin" data-id="${h.id}" value="${h.hora_fin.substring(0, 5)}" ${!isActivo ? 'disabled' : ''}>
              <button class="btn btn-secondary btn-save" data-id="${h.id}" style="padding: 8px;">💾</button>
            </div>
          </div>
        `;
      });
      this.container.innerHTML = html;

      // Eventos
      this.container.querySelectorAll('.chk-activo').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const id = e.target.dataset.id;
          const container = e.target.closest('.card');
          const isActivo = e.target.checked;
          container.style.opacity = isActivo ? '1' : '0.5';
          container.querySelector('.input-inicio').disabled = !isActivo;
          container.querySelector('.input-fin').disabled = !isActivo;
        });
      });

      this.container.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const container = e.target.closest('.card');
          this.guardarHorario(id, container);
        });
      });

    } catch (error) {
      this.container.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }

  async guardarHorario(id, container) {
    const payload = {
      id: id,
      activo: container.querySelector('.chk-activo').checked,
      hora_inicio: container.querySelector('.input-inicio').value,
      hora_fin: container.querySelector('.input-fin').value
    };

    try {
      await ApiService.post('/admin/config/horarios/actualizar', payload);
      alert('Horario guardado');
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  }
}
