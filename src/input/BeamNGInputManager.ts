import * as THREE from 'three';
import { SoftBodySolver } from '../physics/SoftBodySolver';

export class BeamNGInputManager {
  public keys: { [code: string]: boolean } = {};
  public throttle = 0;
  public brake = 0;
  public steer = 0;
  public clutch = 0;
  public handbrake = false;
  
  public cameraMode: 'orbit' | 'driver' | 'hood' | 'external' | 'relative' | 'chase' | 'topdown' | 'free' = 'chase';
  public freeCam = false;
  public debugSkeleton = false;
  public debugNodes = false;
  public debugCoG = false;

  private solver: SoftBodySolver;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private onToggleEscMenu: () => void;

  constructor(solver: SoftBodySolver, camera: THREE.PerspectiveCamera, domElement: HTMLElement, onToggleEscMenu: () => void) {
    this.solver = solver;
    this.camera = camera;
    this.domElement = domElement;
    this.onToggleEscMenu = onToggleEscMenu;

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;

    // BeamNG System Shortcuts
    if (e.code === 'Escape') {
      this.onToggleEscMenu();
      e.preventDefault();
    }
    if (e.code === 'KeyJ') {
      this.solver.paused = !this.solver.paused;
    }
    if (e.code === 'KeyR' || e.code === 'KeyI') {
      this.solver.resetVehicle(new THREE.Matrix4().identity());
    }
    if (e.code === 'KeyX') {
      this.solver.powertrain.shiftUp();
    }
    if (e.code === 'KeyZ') {
      this.solver.powertrain.shiftDown();
    }
    if (e.code === 'KeyP') {
      this.handbrake = !this.handbrake;
    }
    if (e.code === 'KeyB') {
      this.solver.powertrain.nitrousActive = true;
    }
    if (e.altKey && e.code === 'ArrowDown') {
      this.solver.timeScale = Math.max(0.05, this.solver.timeScale * 0.5);
    }
    if (e.altKey && e.code === 'ArrowUp') {
      this.solver.timeScale = Math.min(1.0, this.solver.timeScale * 2.0);
    }
    if (e.ctrlKey && e.code === 'KeyB') {
      this.debugSkeleton = !this.debugSkeleton;
    }
    if (e.code === 'KeyC') {
      this.cycleCamera();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
    if (e.code === 'KeyB') {
      this.solver.powertrain.nitrousActive = false;
    }
  }

  private cycleCamera() {
    const modes: ('orbit' | 'driver' | 'hood' | 'chase')[] = ['chase', 'driver', 'hood', 'orbit'];
    const cur = modes.indexOf(this.cameraMode as any);
    this.cameraMode = modes[(cur + 1) % modes.length];
  }

  public update(dt: number) {
    // Analog input ramping
    const targetThrottle = (this.keys['KeyW'] || this.keys['ArrowUp']) ? 1.0 : 0.0;
    const targetBrake = (this.keys['KeyS'] || this.keys['ArrowDown']) ? 1.0 : 0.0;
    let targetSteer = 0.0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetSteer -= 1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetSteer += 1.0;

    this.throttle += (targetThrottle - this.throttle) * Math.min(1.0, dt * 14.0);
    this.brake += (targetBrake - this.brake) * Math.min(1.0, dt * 18.0);
    this.steer += (targetSteer - this.steer) * Math.min(1.0, dt * 10.0);
    this.clutch = this.keys['ShiftLeft'] ? 1.0 : 0.0;
    if (this.keys['Space']) this.handbrake = true;
    else if (!this.keys['KeyP']) this.handbrake = false;

    this.solver.update(dt, this.steer, this.throttle, this.brake, this.clutch, this.handbrake);
    this.updateCamera(dt);
  }

  private updateCamera(dt: number) {
    if (this.freeCam) return;

    // Calculate vehicle center of mass & directional heading
    const nodes = this.solver.nodes;
    if (nodes.length === 0) return;

    let cx = 0, cy = 0, cz = 0;
    for (const n of nodes) {
      cx += n.x; cy += n.y; cz += n.z;
    }
    cx /= nodes.length;
    cy /= nodes.length;
    cz /= nodes.length;

    const targetPos = new THREE.Vector3(cx, cy + 0.8, cz);

    if (this.cameraMode === 'chase') {
      const offset = new THREE.Vector3(0, 1.8, -5.2);
      const camTarget = targetPos.clone().add(offset);
      this.camera.position.lerp(camTarget, Math.min(1.0, dt * 8.0));
      this.camera.lookAt(targetPos);
    } else if (this.cameraMode === 'hood') {
      this.camera.position.set(cx, cy + 0.9, cz + 0.8);
      this.camera.lookAt(cx, cy + 0.8, cz + 20);
    } else if (this.cameraMode === 'driver') {
      this.camera.position.set(cx - 0.35, cy + 0.85, cz - 0.2);
      this.camera.lookAt(cx - 0.35, cy + 0.8, cz + 10);
    }
  }
}
