/**
 * Casa Nei - Vista de Calendario Mensual para Panel Administrativo
 *
 * Accesibilidad para daltonismo rojo-verde (deuteranomalía/deuteranopía):
 *  - Estados del calendario diferenciados por: color + icono SVG + patrón CSS
 *  - Paleta segura: ámbar (nada) → azul (parcial) → índigo (todo)
 *  - Detalle de citas con iconos de estado como diferenciador primario
 *
 * @module views/CalendarView
 */

import ApiService from '../services/api.js';
import {
  iconCircle,
  iconCircleHalf,
  iconCheckCircleFill,
  iconSlashCircle,
  iconExclamationTriangleFill,
  iconXCircleFill,
  iconPlusCircleFill
} from '../icons.js';

/**
 * Clase que gestiona la vista del calendario mensual administrativo.
 * Incluye cuadrícula inteligente (6 o 7 columnas), adaptación para daltonismo
 * y gestión de estado visual para día actual y selección activa.
 */
export default class CalendarView {
  constructor() {
    this.currentDate = new Date();
    /** @type {string} Mes actual en formato YYYY-MM */
    this.currentMonth = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}`;
    /** @type {string} Fecha de hoy en formato YYYY-MM-DD */
    this.todayStr = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(this.currentDate.getDate()).padStart(2, '0')}`;
    /** @type {string} Día seleccionado actualmente */
    this.selectedDate = this.todayStr;
  }

  /**
   * Renderiza el markup HTML estructural de la vista del calendario.
   * La leyenda usa iconos SVG + patrones CSS para ser accesible a daltónicos.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <h1 style="font-size: 1.8rem;">Calendario</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Disponibilidad y citas mensuales</p>
        </header>

        <div class="card" style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <button id="btnPrevMonth" class="btn btn-secondary" style="width: auto; padding: 8px 14px;" aria-label="Mes anterior">&larr;</button>
            <h2 id="monthTitle" style="font-size: 1.25rem; text-transform: capitalize; margin: 0;">Mes Año</h2>
            <button id="btnNextMonth" class="btn btn-secondary" style="width: auto; padding: 8px 14px;" aria-label="Mes siguiente">&rarr;</button>
          </div>
          
          <!-- Encabezado de columnas de la cuadrícula -->
          <div id="calendarHeader" class="cal-grid-header cols-6">
            <div class="col-name">Lu</div>
            <div class="col-name">Ma</div>
            <div class="col-name">Mi</div>
            <div class="col-name">Ju</div>
            <div class="col-name">Vi</div>
            <div class="col-name">Sá</div>
          </div>
          
          <!-- Cuadrícula interactiva de días -->
          <div id="calendarGrid" class="cal-grid cols-6">
            <div style="grid-column: 1 / -1; padding: 24px; text-align: center;">Cargando calendario...</div>
          </div>

          <!-- Leyenda accesible: color + icono SVG + patrón CSS -->
          <div class="cal-legend" role="list" aria-label="Leyenda del calendario">
            <div class="cal-legend-item" role="listitem">
              <div class="cal-legend-badge badge-nada" aria-hidden="true">
                ${iconCircle()}
              </div>
              <span>Nada agendado</span>
            </div>
            <div class="cal-legend-item" role="listitem">
              <div class="cal-legend-badge badge-parcial" aria-hidden="true">
                ${iconCircleHalf()}
              </div>
              <span>Parcialmente lleno</span>
            </div>
            <div class="cal-legend-item" role="listitem">
              <div class="cal-legend-badge badge-todo" aria-hidden="true">
                ${iconCheckCircleFill()}
              </div>
              <span>Todo agendado</span>
            </div>
            <div class="cal-legend-item" role="listitem">
              <div class="cal-legend-badge badge-bloqueado" aria-hidden="true">
                ${iconSlashCircle()}
              </div>
              <span>Bloqueado</span>
            </div>
            <div class="cal-legend-item" role="listitem">
              <div class="cal-legend-badge badge-hoy circle" aria-hidden="true"></div>
              <span>Hoy</span>
            </div>
          </div>
        </div>

        <!-- Contenedor del Detalle de Citas del Día Seleccionado -->
        <div id="dayDetailsContainer" style="display: none; margin-top: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <h3 id="dayDetailsTitle" style="font-size: 1.25rem; margin: 0;">Citas del día</h3>
            <a id="btnAgendarDia" href="#new-cita" class="btn btn-add" style="width: auto; padding: 8px 14px; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              ${iconPlusCircleFill('icon-btn')} <span>Agendar Cita</span>
            </a>
          </div>
          <div id="dayDetailsList" class="card" style="padding: 16px;"></div>
        </div>
      </div>
    `;
  }

  /**
   * Enlaza eventos y carga los datos iniciales al montar la vista.
   *
   * @param {Object} [queryParams={}] Parámetros de la URL
   * @returns {Promise<void>}
   */
  async mount(queryParams = {}) {
    this.btnPrev = document.getElementById('btnPrevMonth');
    this.btnNext = document.getElementById('btnNextMonth');
    this.monthTitle = document.getElementById('monthTitle');
    this.header = document.getElementById('calendarHeader');
    this.grid = document.getElementById('calendarGrid');
    this.detailsContainer = document.getElementById('dayDetailsContainer');
    this.detailsList = document.getElementById('dayDetailsList');
    this.detailsTitle = document.getElementById('dayDetailsTitle');
    this.btnAgendarDia = document.getElementById('btnAgendarDia');

    this.btnPrev.addEventListener('click', () => this.changeMonth(-1));
    this.btnNext.addEventListener('click', () => this.changeMonth(1));

    // Si viene una fecha específica en la URL (ej. ?fecha=YYYY-MM-DD), usarla
    if (queryParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(queryParams.fecha)) {
      this.selectedDate = queryParams.fecha;
      this.currentMonth = queryParams.fecha.substring(0, 7);
    }

    await this.loadMonth(this.currentMonth);
  }

  /**
   * Cambia el mes actual hacia atrás o adelante y recarga la cuadrícula.
   *
   * @param {number} offset Desplazamiento (-1 para mes anterior, 1 para siguiente)
   */
  changeMonth(offset) {
    const [year, month] = this.currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    this.currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.loadMonth(this.currentMonth);
  }

  /**
   * Carga los datos de disponibilidad mensual desde la API.
   * Incluye Cache-Control: no-store para evitar caché agresivo en móviles.
   *
   * @param {string} mesStr Mes en formato YYYY-MM
   * @returns {Promise<void>}
   */
  async loadMonth(mesStr) {
    const [year, month] = mesStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    
    // Formatear mes en español (ej. "Octubre 2026")
    const formatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
    this.monthTitle.textContent = formatter.format(dateObj);

    this.grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 28px;"><div class="spinner" style="margin: 0 auto;"></div></div>';
    this.detailsContainer.style.display = 'none';

    try {
      const response = await ApiService.get(`/admin/calendario-mensual?mes=${mesStr}`);
      const data = response.data || [];
      this.renderGrid(data, year, month);

      // Si el día seleccionado está en el mes actual, abrir automáticamente sus detalles
      if (this.selectedDate && this.selectedDate.startsWith(mesStr)) {
        this.loadDayDetails(this.selectedDate);
      }
    } catch (error) {
      this.grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 24px; color: var(--danger);">Error al cargar calendario: ${error.message}</div>`;
    }
  }

  /**
   * Devuelve el icono SVG correspondiente al nivel de ocupación de un día.
   * Los iconos son el diferenciador PRIMARIO para accesibilidad daltónica.
   *
   * @param {string} nivelOcupacion - Nivel de ocupación del día ('nada agendado', 'parcial', etc.)
   * @returns {string} Markup SVG del icono
   */
  getStatusIcon(nivelOcupacion) {
    switch (nivelOcupacion) {
      case 'nada agendado':
        return iconCircle('cal-status-icon');
      case 'parcial':
        return iconCircleHalf('cal-status-icon');
      case 'todo agendado':
        return iconCheckCircleFill('cal-status-icon');
      case 'bloqueado':
        return iconSlashCircle('cal-status-icon');
      case 'no laboral':
        return iconSlashCircle('cal-status-icon');
      default:
        return '';
    }
  }

  /**
   * Renderiza la cuadrícula de días con adaptación dinámica de columnas.
   * Si ningún domingo tiene citas, omite domingos (6 columnas Lu-Sá).
   * Si al menos un domingo tiene citas agendadas, incluye domingos (7 columnas Lu-Do).
   *
   * Cada celda incluye: número de día + icono de estado (para daltonismo).
   *
   * @param {Array<Object>} daysData Datos de días del mes
   * @param {number} year Año
   * @param {number} month Mes (1-12)
   */
  renderGrid(daysData, year, month) {
    // 1. Detectar si algún domingo del mes tiene citas registradas
    const hayDomingosConCitas = daysData.some(dia => dia.dia_semana === 0 && (dia.total_citas > 0 || dia.nivel_ocupacion === 'parcial' || dia.nivel_ocupacion === 'todo agendado'));

    // Configurar encabezado y rejilla: 6 columnas (Lu-Sá) o 7 columnas (Lu-Do)
    if (hayDomingosConCitas) {
      this.header.className = 'cal-grid-header cols-7';
      this.grid.className = 'cal-grid cols-7';
      this.header.innerHTML = `
        <div class="col-name">Lu</div>
        <div class="col-name">Ma</div>
        <div class="col-name">Mi</div>
        <div class="col-name">Ju</div>
        <div class="col-name">Vi</div>
        <div class="col-name">Sá</div>
        <div class="col-name">Do</div>
      `;
    } else {
      this.header.className = 'cal-grid-header cols-6';
      this.grid.className = 'cal-grid cols-6';
      this.header.innerHTML = `
        <div class="col-name">Lu</div>
        <div class="col-name">Ma</div>
        <div class="col-name">Mi</div>
        <div class="col-name">Ju</div>
        <div class="col-name">Vi</div>
        <div class="col-name">Sá</div>
      `;
    }

    // Filtrar días a mostrar: si no hay domingos con citas, omitir los domingos
    const diasVisibles = hayDomingosConCitas
      ? daysData
      : daysData.filter(dia => dia.dia_semana !== 0);

    if (diasVisibles.length === 0) {
      this.grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px;">Sin días disponibles.</div>';
      return;
    }

    // 2. Calcular los espacios en blanco iniciales antes del primer día visible del mes
    const primerDiaVisible = diasVisibles[0];
    const primerDiaFecha = new Date(primerDiaVisible.fecha + 'T12:00:00');
    const diaSemanaJs = primerDiaFecha.getDay(); // 0 = Domingo, 1 = Lunes, ...
    
    // Mapear a índice de columna (Lunes = 0, ..., Sábado = 5, Domingo = 6)
    const colIndexPrimerDia = diaSemanaJs === 0 ? 6 : diaSemanaJs - 1;

    let html = '';

    // Rellenar espacios vacíos al inicio de la primera fila
    const columnasTotales = hayDomingosConCitas ? 7 : 6;
    const offsetInicial = colIndexPrimerDia < columnasTotales ? colIndexPrimerDia : 0;
    
    for (let i = 0; i < offsetInicial; i++) {
      html += '<div></div>';
    }

    // 3. Renderizar cada celda del mes
    diasVisibles.forEach(dia => {
      const dayNum = parseInt(dia.fecha.split('-')[2], 10);
      const isToday = dia.fecha === this.todayStr;
      const isSelected = dia.fecha === this.selectedDate;

      // Determinar clase de color según regla de negocio
      let statusClass = 'cal-status-bloqueado';
      if (dia.nivel_ocupacion === 'no laboral') {
        statusClass = 'cal-status-no-laboral';
      } else if (dia.nivel_ocupacion === 'nada agendado') {
        statusClass = 'cal-status-nada';
      } else if (dia.nivel_ocupacion === 'parcial') {
        statusClass = 'cal-status-parcial';
      } else if (dia.nivel_ocupacion === 'todo agendado') {
        statusClass = 'cal-status-todo';
      } else if (dia.nivel_ocupacion === 'bloqueado') {
        statusClass = 'cal-status-bloqueado';
      }

      const classes = [
        'cal-day-cell',
        statusClass,
        isToday ? 'cal-day-today' : '',
        isSelected ? 'cal-day-selected' : ''
      ].filter(Boolean).join(' ');

      const ariaLabel = `${dayNum} de ${this.monthTitle.textContent}, ${dia.nivel_ocupacion}, ${dia.total_citas || 0} citas`;

      // Icono de estado: diferenciador primario para daltonismo
      const statusIcon = this.getStatusIcon(dia.nivel_ocupacion);

      html += `
        <div class="${classes}"
             data-fecha="${dia.fecha}"
             data-ocupacion="${dia.nivel_ocupacion}"
             role="button"
             tabindex="0"
             aria-label="${ariaLabel}">
          <span>${dayNum}</span>
          ${statusIcon}
        </div>
      `;
    });

    this.grid.innerHTML = html;

    // 4. Asignar manejadores de eventos táctiles y de clic
    this.grid.querySelectorAll('.cal-day-cell').forEach(el => {
      el.addEventListener('click', () => {
        this.selectDay(el.dataset.fecha);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectDay(el.dataset.fecha);
        }
      });
    });
  }

  /**
   * Gestiona la selección interactiva de un día.
   * Actualiza los resaltados de selección manteniendo la forma circular en el día actual.
   *
   * @param {string} fecha Fecha en formato YYYY-MM-DD
   */
  selectDay(fecha) {
    this.selectedDate = fecha;

    // Actualizar clases de selección en la interfaz
    this.grid.querySelectorAll('.cal-day-cell').forEach(cell => {
      if (cell.dataset.fecha === fecha) {
        cell.classList.add('cal-day-selected');
      } else {
        cell.classList.remove('cal-day-selected');
      }
    });

    this.loadDayDetails(fecha);
  }

  /**
   * Retorna el markup HTML de una tarjeta de cita con icono y badge de estado accesibles.
   * El icono es el diferenciador primario (no el color) para usuarios daltónicos.
   *
   * @param {Object} cita - Datos de la cita
   * @param {string} cita.estado - Estado: 'confirmada' | 'pendiente' | 'cancelada'
   * @param {string} cita.hora_inicio - Hora de inicio (HH:MM:SS)
   * @param {string} cita.hora_fin - Hora de fin (HH:MM:SS)
   * @param {string} cita.cliente_nombre - Nombre del cliente
   * @param {string} cita.servicio_nombre - Nombre del servicio
   * @param {number} cita.cita_id - ID de la cita
   * @returns {string} Markup HTML de la tarjeta
   */
  renderCitaCard(cita) {
    // Mapear estado a: clase CSS, icono SVG, color variable
    const estadoConfig = {
      confirmada: {
        cardClass: 'cita-confirmada',
        badgeClass: 'badge-confirmada',
        icon: iconCheckCircleFill(),
        label: 'Confirmada'
      },
      pendiente: {
        cardClass: 'cita-pendiente',
        badgeClass: 'badge-pendiente',
        icon: iconExclamationTriangleFill(),
        label: 'Pendiente'
      },
      cancelada: {
        cardClass: 'cita-cancelada',
        badgeClass: 'badge-cancelada',
        icon: iconXCircleFill(),
        label: 'Cancelada'
      }
    };

    const config = estadoConfig[cita.estado] || {
      cardClass: '',
      badgeClass: '',
      icon: '',
      label: cita.estado
    };

    return `
      <div class="cita-card ${config.cardClass}">
        <div style="flex: 1; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong style="color: var(--text-main); font-size: 1rem;">
              ${cita.hora_inicio.substring(0, 5)} - ${cita.hora_fin.substring(0, 5)}
            </strong>
            <span class="estado-badge ${config.badgeClass}" aria-label="Estado: ${config.label}">
              ${config.icon} ${config.label}
            </span>
          </div>
          <div style="margin-top: 4px; font-size: 0.95rem; color: var(--text-main); font-weight: 600;">${cita.cliente_nombre}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${cita.servicio_nombre}</div>
        </div>
        
        <div>
          <a href="#solicitud?id=${cita.cita_id || cita.id}" class="btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 0.8rem; text-decoration: none;">
            Ver Detalle
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Carga y muestra los detalles y citas del día seleccionado.
   * Usa Cache-Control: no-store en ApiService para evitar caché en móviles.
   *
   * @param {string} fecha Fecha en formato YYYY-MM-DD
   * @returns {Promise<void>}
   */
  async loadDayDetails(fecha) {
    this.detailsContainer.style.display = 'block';
    
    // Formatear fecha amigable (ej. "Jueves 15 de Octubre de 2026")
    const [y, m, d] = fecha.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formatter = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const fechaLegible = formatter.format(dateObj);

    this.detailsTitle.textContent = `Citas: ${fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1)}`;
    this.btnAgendarDia.href = `#new-cita?fecha=${fecha}`;
    this.detailsList.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

    try {
      const response = await ApiService.get(`/admin/citas?fecha=${fecha}`);
      const citas = response.data || [];

      if (citas.length === 0) {
        this.detailsList.innerHTML = `
          <div style="text-align: center; padding: 20px 0; color: var(--text-muted);">
            <p style="margin-bottom: 8px;">No hay citas registradas para este día.</p>
            <p style="font-size: 0.85rem; color: var(--text-subtle);">Usa el botón "+ Agendar Cita" para programar una atención.</p>
          </div>
        `;
        return;
      }

      const html = '<div style="display: flex; flex-direction: column; gap: 12px;">'
        + citas.map(cita => this.renderCitaCard(cita)).join('')
        + '</div>';

      this.detailsList.innerHTML = html;

    } catch (error) {
      this.detailsList.innerHTML = `<p style="color: var(--danger); text-align: center;">Error al cargar citas: ${error.message}</p>`;
    }
  }
}
