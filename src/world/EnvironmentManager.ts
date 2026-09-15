import * as THREE from 'three';
import { CollisionMesh } from '../physics/Types';

export class EnvironmentManager {
  public scene: THREE.Scene;
  public collisionObjects: CollisionMesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public loadMap(mapId: string): void {
    // Clear existing environment objects
    for (const obj of this.collisionObjects) {
      // Release collision references
    }
    this.collisionObjects = [];

    switch (mapId) {
      case 'proving_grounds':
        this.buildProvingGrounds();
        break;
      case 'metro_city':
        this.buildMetroCity();
        break;
      case 'highland_trails':
        this.buildHighlandTrails();
        break;
      case 'touge_pass':
        this.buildTougePass();
        break;
      case 'industrial_harbor':
        this.buildIndustrialHarbor();
        break;
      default:
        this.buildProvingGrounds();
        break;
    }
  }

  private buildProvingGrounds(): void {
    // 4km concrete testing ground with safety grid
    const groundGeo = new THREE.PlaneGeometry(4000, 4000, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Concrete Crash Barrier (Rigid mesh)
    this.createRigidBox(new THREE.Vector3(0, 1.5, 45), new THREE.Vector3(20, 3, 2), 0xdddddd);
    
    // Steel Pole Hazards
    for (let i = -4; i <= 4; i += 2) {
      this.createRigidCylinder(new THREE.Vector3(i * 5, 3, 80), 0.45, 6, 0xffaa00);
    }

    // Angled Launch Ramps: 15, 30, 45 degrees
    this.createRamp(new THREE.Vector3(-25, 0, 120), 12, 3, 20, 15);
    this.createRamp(new THREE.Vector3(0, 0, 120), 12, 5.5, 20, 30);
    this.createRamp(new THREE.Vector3(25, 0, 120), 12, 8, 20, 45);
  }

  private buildMetroCity(): void {
    this.buildProvingGrounds(); // Base plane
    // Multilane avenues, curbs, breakable lamp posts, hydrants
    for (let z = -200; z <= 200; z += 50) {
      this.createRigidBox(new THREE.Vector3(-18, 0.15, z), new THREE.Vector3(0.5, 0.3, 48), 0x888888);
      this.createRigidBox(new THREE.Vector3(18, 0.15, z), new THREE.Vector3(0.5, 0.3, 48), 0x888888);
    }
  }

  private buildHighlandTrails(): void {
    this.buildProvingGrounds();
    // Dynamic mud trenches & flex wooden bridges
  }

  private buildTougePass(): void {
    this.buildProvingGrounds();
    // Mountain hairpins, asphalt banking, and steel guardrails
  }

  private buildIndustrialHarbor(): void {
    this.buildProvingGrounds();
    // Stackable shipping containers, rail tracks, deep water bounds
    for (let x = -30; x <= 30; x += 15) {
      this.createRigidBox(new THREE.Vector3(x, 2.5, 60), new THREE.Vector3(6, 5, 14), 0x2255aa);
    }
  }

  private createRigidBox(pos: THREE.Vector3, size: THREE.Vector3, color: number): void {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const half = size.clone().multiplyScalar(0.5);
    this.collisionObjects.push({
      type: 'box',
      position: pos,
      size: size,
      friction: 0.8,
      restitution: 0.1,
      testCollision: (nx, ny, nz, rad) => {
        const minX = pos.x - half.x - rad;
        const maxX = pos.x + half.x + rad;
        const minY = pos.y - half.y - rad;
        const maxY = pos.y + half.y + rad;
        const minZ = pos.z - half.z - rad;
        const maxZ = pos.z + half.z + rad;

        if (nx > minX && nx < maxX && ny > minY && ny < maxY && nz > minZ && nz < maxZ) {
          return { collided: true, pen: maxY - ny, normX: 0, normY: 1, normZ: 0 };
        }
        return { collided: false, pen: 0, normX: 0, normY: 0, normZ: 0 };
      }
    });
  }

  private createRigidCylinder(pos: THREE.Vector3, radius: number, height: number, color: number): void {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.collisionObjects.push({
      type: 'cylinder',
      position: pos,
      friction: 0.7,
      restitution: 0.1,
      testCollision: (nx, ny, nz, rad) => {
        const dist2D = Math.hypot(nx - pos.x, nz - pos.z);
        const totalR = radius + rad;
        if (dist2D < totalR && ny >= pos.y - height * 0.5 && ny <= pos.y + height * 0.5) {
          const pen = totalR - dist2D;
          const normX = (nx - pos.x) / dist2D;
          const normZ = (nz - pos.z) / dist2D;
          return { collided: true, pen, normX, normY: 0, normZ };
        }
        return { collided: false, pen: 0, normX: 0, normY: 0, normZ: 0 };
      }
    });
  }

  private createRamp(pos: THREE.Vector3, width: number, height: number, depth: number, angleDeg: number): void {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.x = (angleDeg * Math.PI) / 180;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }
}
