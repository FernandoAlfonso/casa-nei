import ApiService from '../services/api.js';

export default class CalendarView {
  constructor() {
    this.currentDate = new Date();
    // Default to current month
    this.currentMonth = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}`;
  }

  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <h1 style="font-size: 1.8rem;">Calendario</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Disponibilidad mensual</p>
        </header>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <button id="btnPrevMonth" class="btn btn-secondary" style="width: auto; padding: 8px 12px;">&larr;</button>
            <h2 id="monthTitle" style="font-size: 1.2rem; text-transform: capitalize;">Mes Año</h2>
            <button id="btnNextMonth" class="btn btn-secondary" style="width: auto; padding: 8px 12px;">&rarr;</button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center; margin-bottom: 8px;">
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Do</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Lu</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Ma</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Mi</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Ju</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Vi</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Sa</div>
          </div>
          
          <div id="calendarGrid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">
            <div style="grid-column: 1 / -1; padding: 20px;">Cargando calendario...</div>
          </div>

          <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-muted);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary);"></div> Verde: Nada o poco agendado
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger);"></div> Rojo: Todo Agendado
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: rgba(255,255,255,0.05);"></div> Gris: No laboral / Bloqueado
            </div>
          </div>
        </div>

        <div id="dayDetailsContainer" style="display: none; margin-top: 20px;">
          <h3 id="dayDetailsTitle" style="font-size: 1.2rem; margin-bottom: 12px;">Citas del día</h3>
          <div id="dayDetailsList" class="card" style="padding: 16px;"></div>
        </div>
      </div>
    `;
  }

  async mount() {
    this.btnPrev = document.getElementById('btnPrevMonth');
    this.btnNext = document.getElementById('btnNextMonth');
    this.monthTitle = document.getElementById('monthTitle');
    this.grid = document.getElementById('calendarGrid');
    this.detailsContainer = document.getElementById('dayDetailsContainer');
    this.detailsList = document.getElementById('dayDetailsList');
    this.detailsTitle = document.getElementById('dayDetailsTitle');

    this.btnPrev.addEventListener('click', () => this.changeMonth(-1));
    this.btnNext.addEventListener('click', () => this.changeMonth(1));

    await this.loadMonth(this.currentMonth);
  }

  changeMonth(offset) {
    const [year, month] = this.currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    this.currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.loadMonth(this.currentMonth);
  }

  async loadMonth(mesStr) {
    const [year, month] = mesStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    
    // Formatear mes en español
    const formatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
    this.monthTitle.textContent = formatter.format(dateObj);

    this.grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px;"><div class="spinner" style="margin: 0 auto;"></div></div>';
    this.detailsContainer.style.display = 'none';

    try {
      const response = await ApiService.get(`/admin/calendario-mensual?mes=${mesStr}`);
      const data = response.data || [];
      this.renderGrid(data, year, month);
    } catch (error) {
      this.grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; color: var(--danger);">Error: ${error.message}</div>`;
    }
  }

  renderGrid(daysData, year, month) {
    // daysData es un array consecutivo de días para este mes.
    // Necesitamos saber qué día de la semana es el día 1 para rellenar los espacios vacíos
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Domingo, 1 = Lunes...

    let html = '';
    
    // Rellenar días vacíos antes del día 1
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += '<div></div>';
    }

    daysData.forEach(dia => {
      const dayNum = parseInt(dia.fecha.split('-')[2], 10);
      let bgStyle = 'background: rgba(255,255,255,0.05); color: #666; border: 1px solid transparent;';
      let cursor = 'default';
      
      // 'no laboral', 'nada agendado', 'poco agendado', 'todo agendado'
      if (dia.nivel_ocupacion === 'no laboral') {
        bgStyle = 'background: rgba(255,255,255,0.05); color: #666;';
      } else if (dia.nivel_ocupacion === 'todo agendado') {
        bgStyle = 'background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger); color: #fff; cursor: pointer;';
        cursor = 'pointer';
      } else if (dia.nivel_ocupacion === 'poco agendado' || dia.nivel_ocupacion === 'nada agendado') {
        bgStyle = 'background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); color: #fff; cursor: pointer;';
        cursor = 'pointer';
      }

      html += `
        <div class="cal-day" data-fecha="${dia.fecha}" data-ocupacion="${dia.nivel_ocupacion}" style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; transition: transform 0.1s; ${bgStyle}">
          ${dayNum}
        </div>
      `;
    });

    this.grid.innerHTML = html;

    // Attach click events
    this.grid.querySelectorAll('.cal-day').forEach(el => {
      if (el.dataset.ocupacion !== 'no laboral') {
        el.addEventListener('click', () => {
          // simple highlight
          this.grid.querySelectorAll('.cal-day').forEach(d => d.style.transform = 'scale(1)');
          el.style.transform = 'scale(0.9)';
          this.loadDayDetails(el.dataset.fecha);
        });
      }
    });
  }

  async loadDayDetails(fecha) {
    this.detailsContainer.style.display = 'block';
    this.detailsTitle.textContent = `Citas del ${fecha}`;
    this.detailsList.innerHTML = '<div class="spinner" style="margin: 0 auto;"></div>';

    try {
      const response = await ApiService.get(`/admin/citas?fecha=${fecha}`);
      const citas = response.data || [];

      if (citas.length === 0) {
        this.detailsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No hay citas registradas este día.</p>';
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
      citas.forEach(cita => {
        let statusColor = 'var(--text-muted)';
        if (cita.estado === 'confirmada') statusColor = 'var(--primary)';
        if (cita.estado === 'pendiente') statusColor = 'var(--accent)';
        if (cita.estado === 'cancelada') statusColor = 'var(--danger)';

        html += `
          <div style="border-left: 3px solid ${statusColor}; padding-left: 12px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 0 8px 8px 0;">
            <div style="display: flex; justify-content: space-between;">
              <strong style="color: #fff;">${cita.hora_inicio.substring(0, 5)}</strong>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: ${statusColor}; font-weight: bold;">${cita.estado}</span>
            </div>
            <div style="margin-top: 4px; font-size: 0.9rem;">${cita.cliente_nombre}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${cita.servicio_nombre}</div>
          </div>
        `;
      });
      html += '</div>';

      this.detailsList.innerHTML = html;
      
      // Hacer scroll suave hacia los detalles
      this.detailsContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      this.detailsList.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }
}
