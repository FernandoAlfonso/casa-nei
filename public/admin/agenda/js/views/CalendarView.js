export default class CalendarView {
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <h1 style="font-size: 1.8rem;">Calendario</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Disponibilidad mensual</p>
        </header>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <button class="btn btn-secondary" style="width: auto; padding: 8px 12px;">&larr;</button>
            <h2 style="font-size: 1.2rem;">Septiembre 2026</h2>
            <button class="btn btn-secondary" style="width: auto; padding: 8px 12px;">&rarr;</button>
          </div>
          
          <!-- Placeholder Grid -->
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Do</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Lu</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Ma</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Mi</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Ju</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Vi</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Sa</div>
            
            <!-- Dummy Days -->
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(255,255,255,0.05); color: #666;">30</div>
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(255,255,255,0.05); color: #666;">31</div>
            
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger); color: #fff;">1</div>
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); color: #fff;">2</div>
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); color: #fff;">3</div>
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); color: #fff;">4</div>
            <div style="aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; background: rgba(16, 185, 129, 0.2); border: 1px solid var(--primary); color: #fff;">5</div>
          </div>

          <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-muted);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--primary);"></div> Verde: Disponibilidad
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--danger);"></div> Rojo: Todo Agendado
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
