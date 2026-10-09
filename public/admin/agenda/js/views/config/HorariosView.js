import ApiService from '../../services/api.js';

export default class HorariosView {
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <button onclick="window.location.hash='#settings'" class="btn btn-secondary" style="padding: 4px 12px; margin-bottom: 8px;">&larr; Volver</button>
          <h1 style="font-size: 1.6rem;">Horarios de Atención</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Configura los días laborales y turnos múltiples</p>
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
      
      // Agrupar por dia_semana
      const horariosPorDia = {};
      for (let i = 0; i < 7; i++) {
        horariosPorDia[i] = [];
      }
      
      horarios.forEach(h => {
        horariosPorDia[h.dia_semana].push(h);
      });

      let html = '';
      const diasStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diasOrdenados = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo

      for (const dia of diasOrdenados) {
        const turnos = horariosPorDia[dia];
        // Determinar si el día está activo. Si hay turnos y el primero está activo (o si un placeholder está activo)
        // Ya que la tabla no tiene 'activo' a nivel de día, nos basamos en el 'activo' del primer turno
        const isActivo = turnos.length > 0 && turnos[0].activo == 1;
        
        let turnosHtml = '';
        if (turnos.length === 0 || (!isActivo && turnos.length === 1 && turnos[0].hora_inicio === '00:00:00')) {
          // Placeholder para cuando agreguen uno nuevo, o inicial
          turnosHtml = this.renderTurnoRow('', '');
        } else {
          turnos.forEach(t => {
            turnosHtml += this.renderTurnoRow(t.hora_inicio.substring(0, 5), t.hora_fin.substring(0, 5));
          });
        }

        html += `
          <div class="card card-dia" data-dia="${dia}" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; opacity: ${isActivo ? '1' : '0.5'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 1.1rem; width: 100px;">${diasStr[dia]}</h3>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" class="chk-activo" ${isActivo ? 'checked' : ''} style="width: 20px; height: 20px;">
                <span style="font-size: 0.85rem;">Laboral</span>
              </div>
            </div>
            
            <div class="turnos-container" style="display: flex; flex-direction: column; gap: 8px; ${!isActivo ? 'pointer-events: none; opacity: 0.6;' : ''}">
              ${turnosHtml}
            </div>
            
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
              <button class="btn btn-add-turno" style="flex: 1; padding: 8px 12px; font-size: 0.9rem; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; text-align: center; ${!isActivo ? 'display: none;' : ''}">+ Agregar horario</button>
              <button class="btn btn-save" style="flex: 1; padding: 8px 12px; font-size: 0.9rem; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; text-align: center;">Guardar horarios</button>
            </div>
          </div>
        `;
      }

      this.container.innerHTML = html;
      this.attachEvents();

    } catch (error) {
      this.container.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }

  renderTurnoRow(inicio, fin) {
    return `
      <div class="turno-row" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 0;">
          <input type="time" class="form-input input-inicio" value="${inicio}" style="flex: 1; min-width: 0; padding-left: 8px; padding-right: 8px;">
          <span>-</span>
          <input type="time" class="form-input input-fin" value="${fin}" style="flex: 1; min-width: 0; padding-left: 8px; padding-right: 8px;">
        </div>
        <button class="btn btn-remove-turno" style="padding: 6px 10px; flex-shrink: 0; font-size: 0.85rem; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Eliminar turno">Eliminar horario</button>
      </div>
    `;
  }

  attachEvents() {
    // Toggle activo
    this.container.querySelectorAll('.chk-activo').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const container = e.target.closest('.card-dia');
        const isActivo = e.target.checked;
        container.style.opacity = isActivo ? '1' : '0.5';
        
        const turnosContainer = container.querySelector('.turnos-container');
        const btnAdd = container.querySelector('.btn-add-turno');
        
        if (isActivo) {
          turnosContainer.style.pointerEvents = 'auto';
          turnosContainer.style.opacity = '1';
          btnAdd.style.display = 'block';
        } else {
          turnosContainer.style.pointerEvents = 'none';
          turnosContainer.style.opacity = '0.6';
          btnAdd.style.display = 'none';
        }
      });
    });

    // Añadir turno
    this.container.querySelectorAll('.btn-add-turno').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const container = e.target.closest('.card-dia').querySelector('.turnos-container');
        const rowHTML = this.renderTurnoRow('', '');
        container.insertAdjacentHTML('beforeend', rowHTML);
      });
    });

    // Eliminar turno (delegación de eventos)
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-turno')) {
        const turnoRow = e.target.closest('.turno-row');
        const turnosContainer = turnoRow.parentElement;
        if (turnosContainer.querySelectorAll('.turno-row').length > 1) {
          turnoRow.remove();
        } else {
          // Si es el último, solo vaciamos los inputs
          turnoRow.querySelector('.input-inicio').value = '';
          turnoRow.querySelector('.input-fin').value = '';
        }
      }
    });

    // Guardar
    this.container.querySelectorAll('.btn-save').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const container = e.target.closest('.card-dia');
        this.guardarHorario(container);
      });
    });
  }

  async guardarHorario(container) {
    const diaSemana = container.dataset.dia;
    const activo = container.querySelector('.chk-activo').checked;
    
    const turnos = [];
    if (activo) {
      container.querySelectorAll('.turno-row').forEach(row => {
        const inicio = row.querySelector('.input-inicio').value;
        const fin = row.querySelector('.input-fin').value;
        if (inicio && fin) {
          turnos.push({ hora_inicio: inicio, hora_fin: fin });
        }
      });
      
      if (turnos.length === 0) {
        alert("Agrega al menos un rango de horario válido o marca el día como no laboral.");
        return;
      }
    }

    const payload = {
      dia_semana: parseInt(diaSemana),
      activo: activo,
      horarios: turnos
    };

    const btnSave = container.querySelector('.btn-save');
    const originalText = btnSave.textContent;
    btnSave.textContent = '...';
    btnSave.disabled = true;

    try {
      await ApiService.post('/admin/config/horarios/actualizar', payload);
      // Opcional: mostrar mensaje de éxito en UI en lugar de alert
      btnSave.textContent = '¡Guardado!';
      setTimeout(() => {
        btnSave.textContent = originalText;
        btnSave.disabled = false;
      }, 2000);
    } catch (error) {
      alert("Error al guardar: " + error.message);
      btnSave.textContent = originalText;
      btnSave.disabled = false;
    }
  }
}
