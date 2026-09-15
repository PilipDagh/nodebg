import * as THREE from 'three';
import { SoftBodySolver } from '../physics/SoftBodySolver';
import { PBRDeformVertexShader, PBRDeformFragmentShader, GlassFractureShader } from './Shaders';

export class FlexbodyRenderer {
  public mesh: THREE.Mesh;
  public solver: SoftBodySolver;
  private originalPositions: Float32Array;
  private nodeBindings: { nodeId: number; weight: number }[][] = [];

  constructor(geometry: THREE.BufferGeometry, solver: SoftBodySolver, baseColor: number) {
    this.solver = solver;
    const vertexCount = geometry.attributes.position.count;
    this.originalPositions = new Float32Array(geometry.attributes.position.array);

    // Custom shader material with procedural crumple/paint damage
    const material = new THREE.ShaderMaterial({
      vertexShader: PBRDeformVertexShader,
      fragmentShader: PBRDeformFragmentShader,
      uniforms: {
        uBaseColor: { value: new THREE.Color(baseColor) },
        uMetallic: { value: 0.85 },
        uRoughness: { value: 0.25 },
        uStrainFactor: { value: 1.0 }
      }
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.bindFlexbodyVertices();
  }

  private bindFlexbodyVertices(): void {
    const posAttr = this.mesh.geometry.attributes.position;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);

      // Associate vertex with 3 nearest physical nodes
      const dists: { id: number; d: number }[] = [];
      for (const n of this.solver.nodes) {
        const d = Math.hypot(n.x - vx, n.y - vy, n.z - vz);
        dists.push({ id: n.id, d });
      }
      dists.sort((a, b) => a.d - b.d);

      const top3 = dists.slice(0, 3);
      const invSum = (1 / top3[0].d) + (1 / top3[1].d) + (1 / top3[2].d);
      this.nodeBindings[i] = top3.map(t => ({
        nodeId: t.id,
        weight: (1 / t.d) / invSum
      }));
    }
  }

  public update(): void {
    const posAttr = this.mesh.geometry.attributes.position;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const bindings = this.nodeBindings[i];
      if (!bindings) continue;

      let dx = 0, dy = 0, dz = 0;
      for (const b of bindings) {
        const n = this.solver.nodes[b.nodeId];
        if (n) {
          dx += (n.x - n.px) * b.weight;
          dy += (n.y - n.py) * b.weight;
          dz += (n.z - n.pz) * b.weight;
        }
      }

      posAttr.setXYZ(
        i,
        this.originalPositions[i * 3] + dx,
        this.originalPositions[i * 3 + 1] + dy,
        this.originalPositions[i * 3 + 2] + dz
      );
    }

    posAttr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}
