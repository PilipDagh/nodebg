import { VEHICLE_ROSTER, VehicleSpec } from '../vehicles/VehicleDatabase';
import { SoftBodySolver } from '../physics/SoftBodySolver';
import { VehicleBuilder } from '../vehicles/VehicleBuilder';

export class UIManager {
  private selectedVehicle: VehicleSpec = VEHICLE_ROSTER[0];
  private solver: SoftBodySolver;

  constructor(solver: SoftBodySolver) {
    this.solver = solver;
    this.initVehicleGrid();
    this.bindEvents();
  }

  private initVehicleGrid(): void {
    const container = document.getElementById('vehicle-grid-container');
    if (!container) return;

    container.innerHTML = '';
    VEHICLE_ROSTER.forEach((v) => {
      const card = document.createElement('div');
      card.className = `vehicle-card ${v.id === this.selectedVehicle.id ? 'selected' : ''}`;
      card.innerHTML = `
        <h3 style="font-size:16px; color:#fff; margin-bottom:4px;">${v.name}</h3>
        <p style="font-size:12px; color:#ff6600;">${v.inspiration}</p>
        <p style="font-size:11px; color:#888; margin-top:6px;">${v.engine} | ${v.hp} HP</p>
        <p style="font-size:11px; color:#888;">Weight: ${v.weightKg} kg</p>
      `;
      card.onclick = () => {
        document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedVehicle = v;
      };
      container.appendChild(card);
    });
  }

  private bindEvents(): void {
    // Esc drawer toggles
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      document.getElementById('pause-drawer')?.classList.add('hidden');
      this.solver.paused = false;
    });

    document.getElementById('btn-open-vehicles')?.addEventListener('click', () => {
      document.getElementById('vehicle-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-vehicles')?.addEventListener('click', () => {
      document.getElementById('vehicle-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-open-graphics')?.addEventListener('click', () => {
      document.getElementById('graphics-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-graphics')?.addEventListener('click', () => {
      document.getElementById('graphics-modal')?.classList.add('hidden');
    });

    // Graphics Presets
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const preset = target.dataset.preset;
        if (preset === 'low') this.solver.setSubSteps(500);
        if (preset === 'medium') this.solver.setSubSteps(1000);
        if (preset === 'high') this.solver.setSubSteps(1500);
        if (preset === 'ultra') this.solver.setSubSteps(2000);
      });
    });

    // Vehicle Spawning Handlers
    document.getElementById('btn-spawn-replace')?.addEventListener('click', () => {
      this.solver.nodes = [];
      this.solver.beams = [];
      VehicleBuilder.buildParametricVehicle(this.selectedVehicle, this.solver, 0, 0.6, 0);
      document.getElementById('vehicle-modal')?.classList.add('hidden');
      document.getElementById('pause-drawer')?.classList.add('hidden');
      this.solver.paused = false;
    });

    document.getElementById('btn-spawn-beside')?.addEventListener('click', () => {
      VehicleBuilder.buildParametricVehicle(this.selectedVehicle, this.solver, 3.2, 0.6, 0);
      document.getElementById('vehicle-modal')?.classList.add('hidden');
      document.getElementById('pause-drawer')?.classList.add('hidden');
      this.solver.paused = false;
    });
  }

  public updateHUD(speedKmh: number, rpm: number, maxRpm: number, gear: number) {
    const elSpeed = document.getElementById('hud-speed');
    const elGear = document.getElementById('hud-gear');
    const elRpm = document.getElementById('hud-rpm');
    const elRpmBar = document.getElementById('hud-rpm-bar');

    if (elSpeed) elSpeed.innerText = Math.round(speedKmh).toString();
    if (elGear) elGear.innerText = gear === 0 ? 'R' : gear === 1 ? 'N' : (gear - 1).toString();
    if (elRpm) elRpm.innerText = Math.round(rpm).toString();
    if (elRpmBar) elRpmBar.style.width = `${Math.min(100, (rpm / maxRpm) * 100)}%`;
  }
}
