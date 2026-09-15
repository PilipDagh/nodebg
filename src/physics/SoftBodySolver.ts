import * as THREE from 'three';
import { Node, Beam, BeamState, BeamType, CollisionMesh } from './Types';
import { PowertrainSimulator } from './PowertrainSimulator';

export class SoftBodySolver {
  public nodes: Node[] = [];
  public beams: Beam[] = [];
  public collisionObjects: CollisionMesh[] = [];
  public powertrain: PowertrainSimulator;
  
  public subSteps: number = 1000;
  public gravity: THREE.Vector3 = new THREE.Vector3(0, -9.80665, 0);
  public timeScale: number = 1.0;
  public paused: boolean = false;
  
  private accumulator: number = 0;
  public tirePressureMultiplier: number = 1.0;
  public groundY: number = 0.0;

  constructor(powertrain: PowertrainSimulator) {
    this.powertrain = powertrain;
  }

  public addNode(node: Node): number {
    node.invMass = node.fixed || node.mass <= 0 ? 0.0 : 1.0 / node.mass;
    node.px = node.x;
    node.py = node.y;
    node.pz = node.z;
    this.nodes.push(node);
    return node.id;
  }

  public addBeam(beam: Beam): void {
    const na = this.nodes[beam.nodeA];
    const nb = this.nodes[beam.nodeB];
    const dx = nb.x - na.x;
    const dy = nb.y - na.y;
    const dz = nb.z - na.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    beam.length0 = dist;
    beam.plasticLength = dist;
    beam.state = BeamState.INTACT;
    beam.currentStress = 0;
    this.beams.push(beam);
  }

  public setSubSteps(subSteps: number) {
    this.subSteps = Math.max(500, Math.min(2500, subSteps));
  }

  public update(dt: number, steerInput: number, throttleInput: number, brakeInput: number, clutchInput: number, handbrakeInput: boolean): void {
    if (this.paused) return;

    const scaledDt = dt * this.timeScale;
    const fixedDt = 1.0 / this.subSteps;
    this.accumulator += scaledDt;

    // Cap accumulator to avoid spiral-of-death during freeze/lag
    if (this.accumulator > 0.1) this.accumulator = 0.1;

    while (this.accumulator >= fixedDt) {
      this.solveSubStep(fixedDt, steerInput, throttleInput, brakeInput, clutchInput, handbrakeInput);
      this.accumulator -= fixedDt;
    }
  }

  private solveSubStep(dt: number, steer: number, throttle: number, brake: number, clutch: number, handbrake: boolean): void {
    const nodeCount = this.nodes.length;
    const beamCount = this.beams.length;

    // 1. Reset node accelerations and apply external forces (Gravity)
    const gx = this.gravity.x;
    const gy = this.gravity.y;
    const gz = this.gravity.z;

    for (let i = 0; i < nodeCount; i++) {
      const n = this.nodes[i];
      if (n.invMass === 0) continue;
      n.fx = gx * n.mass;
      n.fy = gy * n.mass;
      n.fz = gz * n.mass;
    }

    // 2. Hydros & Steering Actuation
    for (let i = 0; i < beamCount; i++) {
      const b = this.beams[i];
      if (b.type === BeamType.HYDRO && b.state !== BeamState.BROKEN) {
        b.plasticLength = b.length0 * (1.0 + steer * (b.hydroRatio ?? 0.18));
      }
    }

    // 3. Beam Internal Forces & Viscoelastic Plastic Yielding
    for (let i = 0; i < beamCount; i++) {
      const b = this.beams[i];
      if (b.state === BeamState.BROKEN) continue;

      const na = this.nodes[b.nodeA];
      const nb = this.nodes[b.nodeB];

      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const dz = nb.z - na.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;

      const invLen = 1.0 / len;
      const nx = dx * invLen;
      const ny = dy * invLen;
      const nz = dz * invLen;

      // Axial relative velocity
      const rvx = nb.vx - na.vx;
      const rvy = nb.vy - na.vy;
      const rvz = nb.vz - na.vz;
      const rVel = rvx * nx + rvy * ny + rvz * nz;

      // Engineering deformation
      const delta = len - b.plasticLength;
      b.currentStress = Math.abs(delta) / b.length0;

      // Plastic yield test
      if (Math.abs(delta) > b.yieldStress * b.length0) {
        const plasticSlip = (Math.abs(delta) - b.yieldStress * b.length0) * 0.12;
        b.plasticLength += Math.sign(delta) * plasticSlip;
        b.state = BeamState.DEFORMED;
      }

      // Failure / Rupture test
      if (Math.abs(len - b.length0) > b.breakLimit * b.length0) {
        b.state = BeamState.BROKEN;
        b.currentStress = 0;
        this.powertrain.notifyBeamBroken(b);
        continue;
      }

      // Spring-damper force calculation
      const kFactor = (b.type === BeamType.TIRE_SIDEWALL || b.type === BeamType.TIRE_TREAD) ? b.k * this.tirePressureMultiplier : b.k;
      const fTotal = (delta * kFactor) + (rVel * b.c);

      const fX = fTotal * nx;
      const fY = fTotal * ny;
      const fZ = fTotal * nz;

      if (na.invMass > 0) {
        na.fx += fX;
        na.fy += fY;
        na.fz += fZ;
      }
      if (nb.invMass > 0) {
        nb.fx -= fX;
        nb.fy -= fY;
        nb.fz -= fZ;
      }
    }

    // 4. Powertrain wheel torque and brake application
    this.powertrain.step(dt, throttle, brake, clutch, handbrake, this.nodes);

    // 5. Semi-Implicit (Symplectic) Euler Integration
    for (let i = 0; i < nodeCount; i++) {
      const n = this.nodes[i];
      if (n.invMass === 0) continue;

      n.vx += (n.fx * n.invMass) * dt;
      n.vy += (n.fy * n.invMass) * dt;
      n.vz += (n.fz * n.invMass) * dt;

      // Air resistance damping
      n.vx *= 0.99998;
      n.vy *= 0.99998;
      n.vz *= 0.99998;

      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.z += n.vz * dt;

      // 6. Primary Ground & Object Collision
      this.resolveCollisions(n, dt);
    }
  }

  private resolveCollisions(n: Node, dt: number): void {
    // Planar ground test
    const groundClearance = n.y - (this.groundY + n.radius);
    if (groundClearance < 0) {
      n.y = this.groundY + n.radius;
      if (n.vy < 0) {
        n.vy = -n.vy * 0.15; // Ground restitution
      }
      // Coulomb friction
      const frictionCoef = n.friction * 1.2;
      const vtX = n.vx;
      const vtZ = n.vz;
      const vt = Math.sqrt(vtX * vtX + vtZ * vtZ);
      if (vt > 1e-4) {
        const frictionForce = Math.min(vt, Math.abs(n.fy) * frictionCoef * dt);
        n.vx -= (vtX / vt) * frictionForce;
        n.vz -= (vtZ / vt) * frictionForce;
      }
    }

    // Environmental obstacle collision detection
    const colLen = this.collisionObjects.length;
    for (let i = 0; i < colLen; i++) {
      const col = this.collisionObjects[i];
      const res = col.testCollision(n.x, n.y, n.z, n.radius);
      if (res.collided) {
        n.x += res.normX * res.pen;
        n.y += res.normY * res.pen;
        n.z += res.normZ * res.pen;

        const vDotN = n.vx * res.normX + n.vy * res.normY + n.vz * res.normZ;
        if (vDotN < 0) {
          n.vx -= (1.0 + col.restitution) * vDotN * res.normX;
          n.vy -= (1.0 + col.restitution) * vDotN * res.normY;
          n.vz -= (1.0 + col.restitution) * vDotN * res.normZ;

          // Tangential friction against collision mesh
          n.vx *= (1.0 - col.friction * 0.1);
          n.vz *= (1.0 - col.friction * 0.1);
        }
      }
    }
  }

  public resetVehicle(spawnTransform: THREE.Matrix4): void {
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    spawnTransform.decompose(pos, rot, scale);

    for (const b of this.beams) {
      b.plasticLength = b.length0;
      b.state = BeamState.INTACT;
      b.currentStress = 0;
    }

    for (const n of this.nodes) {
      n.vx = 0; n.vy = 0; n.vz = 0;
      n.fx = 0; n.fy = 0; n.fz = 0;
      const origPos = new THREE.Vector3(n.px, n.py, n.pz).applyQuaternion(rot).add(pos);
      n.x = origPos.x;
      n.y = origPos.y;
      n.z = origPos.z;
    }

    this.powertrain.reset();
  }
}
