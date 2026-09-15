import { SoftBodySolver } from '../physics/SoftBodySolver';
import { Node, Beam, BeamType, BeamState } from '../physics/Types';
import { VehicleSpec } from './VehicleDatabase';

export class VehicleBuilder {
  public static buildParametricVehicle(spec: VehicleSpec, solver: SoftBodySolver, originX = 0, originY = 0.5, originZ = 0): void {
    const { length, width, height, wheelbase } = spec.dimensions;
    const halfW = width * 0.5;
    const halfL = length * 0.5;
    const halfH = height * 0.5;
    const totalMass = spec.weightKg;

    const startIndex = solver.nodes.length;
    let nodeCounter = startIndex;

    // Structural coordinates: Longitudinal (7 slices), Lateral (4 slices), Vertical (3 levels)
    const xSlices = [-halfL, -wheelbase * 0.5, -wheelbase * 0.25, 0, wheelbase * 0.25, wheelbase * 0.5, halfL];
    const yLevels = [0.15, 0.55, halfH + 0.3];
    const zSlices = [-halfW, -halfW * 0.45, halfW * 0.45, halfW];

    const gridNodeMap: number[][][] = [];
    const totalStructuralNodes = xSlices.length * yLevels.length * zSlices.length;
    const nodeMass = (totalMass * 0.82) / totalStructuralNodes;

    // Generate Nodes
    for (let xi = 0; xi < xSlices.length; xi++) {
      gridNodeMap[xi] = [];
      for (let yi = 0; yi < yLevels.length; yi++) {
        gridNodeMap[xi][yi] = [];
        for (let zi = 0; zi < zSlices.length; zi++) {
          const isEngineBay = xi >= 4 && yi <= 1;
          const isCabinRoof = yi === 2 && (xi < 2 || xi > 4);
          if (isCabinRoof && spec.category === 'Truck' && xi > 4) continue; // Bed area

          const node: Node = {
            id: nodeCounter++,
            x: originX + zSlices[zi],
            y: originY + yLevels[yi],
            z: originZ + xSlices[xi],
            px: 0, py: 0, pz: 0,
            vx: 0, vy: 0, vz: 0,
            fx: 0, fy: 0, fz: 0,
            mass: isEngineBay ? nodeMass * 2.2 : nodeMass,
            invMass: 0,
            friction: 0.7,
            radius: 0.15,
            tag: isEngineBay ? 'engine' : yi === 2 ? 'glass' : 'chassis'
          };
          solver.addNode(node);
          gridNodeMap[xi][yi][zi] = node.id;
        }
      }
    }

    // Connect Viscoelastic Beams: Longitudinal, Transverse, Vertical, and Cross diagonals
    let beamCounter = solver.beams.length;
    const addBeamLink = (na: number, nb: number, type: BeamType, kMult = 1.0) => {
      if (na === undefined || nb === undefined) return;
      const b: Beam = {
        id: beamCounter++,
        nodeA: na,
        nodeB: nb,
        length0: 0,
        plasticLength: 0,
        k: spec.springK * kMult,
        c: spec.dampC,
        yieldStress: spec.yieldLimit,
        deformLimit: spec.breakLimit * 0.7,
        breakLimit: spec.breakLimit,
        state: BeamState.INTACT,
        type: type
      };
      solver.addBeam(b);
    };

    for (let xi = 0; xi < xSlices.length; xi++) {
      for (let yi = 0; yi < yLevels.length; yi++) {
        for (let zi = 0; zi < zSlices.length; zi++) {
          const cur = gridNodeMap[xi][yi][zi];
          if (cur === undefined) continue;

          // Longitudinal
          if (xi + 1 < xSlices.length && gridNodeMap[xi + 1][yi][zi] !== undefined) {
            const isCrumple = xi === 0 || xi === xSlices.length - 2;
            addBeamLink(cur, gridNodeMap[xi + 1][yi][zi], isCrumple ? BeamType.CRUMPLE : BeamType.STRUCTURAL);
          }
          // Vertical
          if (yi + 1 < yLevels.length && gridNodeMap[xi][yi + 1][zi] !== undefined) {
            addBeamLink(cur, gridNodeMap[xi][yi + 1][zi], BeamType.STRUCTURAL);
          }
          // Lateral
          if (zi + 1 < zSlices.length && gridNodeMap[xi][yi][zi + 1] !== undefined) {
            addBeamLink(cur, gridNodeMap[xi][yi][zi + 1], BeamType.STRUCTURAL);
          }
          // 3D Shear Cross Beams (Triangulation rigidity)
          if (xi + 1 < xSlices.length && yi + 1 < yLevels.length && gridNodeMap[xi + 1][yi + 1][zi] !== undefined) {
            addBeamLink(cur, gridNodeMap[xi + 1][yi + 1][zi], BeamType.CROSS, 0.75);
          }
          if (xi + 1 < xSlices.length && zi + 1 < zSlices.length && gridNodeMap[xi + 1][yi][zi + 1] !== undefined) {
            addBeamLink(cur, gridNodeMap[xi + 1][yi][zi + 1], BeamType.CROSS, 0.75);
          }
        }
      }
    }

    // Wheels, Suspension Struts, and Steering Hydros
    const wheelPositions = [
      { name: 'fl', x: -halfW - 0.08, y: 0.32, z: wheelbase * 0.5, steer: true, front: true },
      { name: 'fr', x: halfW + 0.08, y: 0.32, z: wheelbase * 0.5, steer: true, front: true },
      { name: 'rl', x: -halfW - 0.08, y: 0.32, z: -wheelbase * 0.5, steer: false, front: false },
      { name: 'rr', x: halfW + 0.08, y: 0.32, z: -wheelbase * 0.5, steer: false, front: false }
    ];

    const wheelNodeGroups: { [k: string]: number[] } = { fl: [], fr: [], rl: [], rr: [] };

    wheelPositions.forEach((wp) => {
      const rimHubNode: Node = {
        id: nodeCounter++,
        x: originX + wp.x,
        y: originY + wp.y,
        z: originZ + wp.z,
        px: 0, py: 0, pz: 0,
        vx: 0, vy: 0, vz: 0,
        fx: 0, fy: 0, fz: 0,
        mass: totalMass * 0.035,
        invMass: 0,
        friction: 0.95,
        radius: 0.35,
        tag: 'wheel'
      };
      solver.addNode(rimHubNode);
      wheelNodeGroups[wp.name].push(rimHubNode.id);

      // Find nearest chassis nodes for suspension mounting
      let nearestLower = startIndex;
      let nearestUpper = startIndex;
      let minDist = 999;

      for (let i = startIndex; i < rimHubNode.id; i++) {
        const n = solver.nodes[i];
        const dist = Math.hypot(n.x - rimHubNode.x, n.z - rimHubNode.z);
        if (dist < minDist && n.tag === 'chassis') {
          minDist = dist;
          if (n.y < originY + 0.35) nearestLower = n.id;
          else nearestUpper = n.id;
        }
      }

      // Suspension spring and damper
      addBeamLink(rimHubNode.id, nearestLower, BeamType.SUSPENSION, 0.8);
      addBeamLink(rimHubNode.id, nearestUpper, BeamType.SUSPENSION, 1.1);

      // Steering Hydro rack on front wheels
      if (wp.steer) {
        const hydroBeam: Beam = {
          id: beamCounter++,
          nodeA: rimHubNode.id,
          nodeB: nearestUpper,
          length0: 0,
          plasticLength: 0,
          k: spec.springK * 1.5,
          c: spec.dampC * 1.8,
          yieldStress: 0.99,
          deformLimit: 1.0,
          breakLimit: 1.5,
          state: BeamState.INTACT,
          type: BeamType.HYDRO,
          hydroRatio: wp.x > 0 ? -0.22 : 0.22
        };
        solver.addBeam(hydroBeam);
      }
    });

    solver.powertrain.wheelNodeIndices = {
      fl: wheelNodeGroups.fl,
      fr: wheelNodeGroups.fr,
      rl: wheelNodeGroups.rl,
      rr: wheelNodeGroups.rr
    };
    solver.powertrain.layout = spec.layout;
    solver.powertrain.maxRpm = spec.category === 'Hypercar' ? 8800 : spec.category === 'Truck' ? 3800 : 7200;
  }
}
