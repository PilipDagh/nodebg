import { Node, Beam, BeamType } from './Types';

export class PowertrainSimulator {
  public rpm: number = 800;
  public idleRpm: number = 850;
  public maxRpm: number = 7200;
  public engineDamage: number = 0; // 0 (intact) to 1 (hydrolocked/blown)
  public coolantTemp: number = 85.0; // Celsius
  public oilTemp: number = 90.0;
  public radiatorPunctured: boolean = false;
  public driveshaftSnapped: boolean = false;
  public differentialLocked: boolean = false;
  public gearIndex: number = 1; // 0 = R, 1 = N, 2 = 1st, 3 = 2nd, etc.
  public gearRatios: number[] = [-3.4, 0, 3.82, 2.36, 1.69, 1.31, 1.0, 0.79];
  public finalDrive: number = 4.10;
  public wheelNodeIndices: { fl: number[]; fr: number[]; rl: number[]; rr: number[] } = {
    fl: [], fr: [], rl: [], rr: []
  };

  public layout: 'MR' | 'FR' | 'FF' | 'AWD' | 'e-AWD' = 'FR';
  public turboBoost: number = 0;
  public hasTurbo: boolean = false;
  public nitrousActive: boolean = false;

  public notifyBeamBroken(beam: Beam) {
    if (beam.type === BeamType.CRUMPLE) {
      this.radiatorPunctured = true;
    }
    if (beam.type === BeamType.STRUCTURAL && Math.random() < 0.05) {
      this.driveshaftSnapped = true;
    }
  }

  public step(dt: number, throttle: number, brake: number, clutch: number, handbrake: boolean, nodes: Node[]) {
    if (this.radiatorPunctured) {
      this.coolantTemp += dt * 8.5;
      if (this.coolantTemp > 135) {
        this.engineDamage = Math.min(1.0, this.engineDamage + dt * 0.15);
      }
    }

    if (this.engineDamage >= 1.0) {
      this.rpm = 0;
      return;
    }

    // Engine RPM dynamic response
    const targetRpm = this.idleRpm + (this.maxRpm - this.idleRpm) * throttle * (1.0 - this.engineDamage);
    const rpmInertia = 9.5;
    this.rpm += (targetRpm - this.rpm) * Math.min(1.0, dt * rpmInertia);

    // Nitrous injection boost
    const n2oMultiplier = this.nitrousActive ? 1.45 : 1.0;

    // Torque curve calculation: T = P(rpm) * shape
    const rpmNorm = this.rpm / this.maxRpm;
    const torquePeak = 450.0 * n2oMultiplier;
    const engineTorque = Math.max(0, Math.sin(rpmNorm * Math.PI) * torquePeak * (1.0 - this.engineDamage));

    // Gear transmission
    const gearRatio = this.gearRatios[this.gearIndex];
    if (gearRatio === 0 || this.driveshaftSnapped) return;

    const totalRatio = gearRatio * this.finalDrive;
    const outputTorque = engineTorque * totalRatio * (1.0 - clutch);

    // Apply mechanical drive forces to driven wheels
    const isRear = (this.layout === 'FR' || this.layout === 'MR' || this.layout === 'AWD');
    const isFront = (this.layout === 'FF' || this.layout === 'AWD' || this.layout === 'e-AWD');

    const drivenGroups: number[][] = [];
    if (isFront) {
      if (this.wheelNodeIndices.fl.length) drivenGroups.push(this.wheelNodeIndices.fl);
      if (this.wheelNodeIndices.fr.length) drivenGroups.push(this.wheelNodeIndices.fr);
    }
    if (isRear) {
      if (this.wheelNodeIndices.rl.length) drivenGroups.push(this.wheelNodeIndices.rl);
      if (this.wheelNodeIndices.rr.length) drivenGroups.push(this.wheelNodeIndices.rr);
    }

    const groupTorque = drivenGroups.length > 0 ? outputTorque / drivenGroups.length : 0;

    for (const group of drivenGroups) {
      for (const idx of group) {
        const n = nodes[idx];
        if (!n) continue;
        // Direction vector forward
        n.fx += (gearRatio > 0 ? 1 : -1) * (groupTorque / Math.max(1, group.length)) * 0.45;
      }
    }

    // Brake and handbrake friction forces
    const brakeForce = brake * 4500.0;
    const allWheels = [
      ...this.wheelNodeIndices.fl,
      ...this.wheelNodeIndices.fr,
      ...this.wheelNodeIndices.rl,
      ...this.wheelNodeIndices.rr
    ];

    for (const idx of allWheels) {
      const n = nodes[idx];
      if (!n) continue;
      n.vx *= Math.max(0, 1.0 - (brakeForce / n.mass) * dt);
      n.vz *= Math.max(0, 1.0 - (brakeForce / n.mass) * dt);
    }

    if (handbrake) {
      const rearWheels = [...this.wheelNodeIndices.rl, ...this.wheelNodeIndices.rr];
      for (const idx of rearWheels) {
        const n = nodes[idx];
        if (!n) continue;
        n.vx *= Math.max(0, 1.0 - (9000.0 / n.mass) * dt);
        n.vz *= Math.max(0, 1.0 - (9000.0 / n.mass) * dt);
      }
    }
  }

  public shiftUp() {
    if (this.gearIndex < this.gearRatios.length - 1) this.gearIndex++;
  }

  public shiftDown() {
    if (this.gearIndex > 0) this.gearIndex--;
  }

  public reset() {
    this.rpm = this.idleRpm;
    this.engineDamage = 0;
    this.coolantTemp = 85.0;
    this.radiatorPunctured = false;
    this.driveshaftSnapped = false;
    this.gearIndex = 2; // Default 1st gear
    this.turboBoost = 0;
  }
}
