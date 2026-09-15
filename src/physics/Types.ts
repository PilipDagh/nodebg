import * as THREE from 'three';

export enum BeamState {
  INTACT = 0,
  DEFORMED = 1,
  BROKEN = 2
}

export enum BeamType {
  STRUCTURAL = 0,
  CROSS = 1,
  CRUMPLE = 2,
  SUSPENSION = 3,
  HYDRO = 4,
  TIRE_SIDEWALL = 5,
  TIRE_TREAD = 6
}

export interface Node {
  id: number;
  x: number; y: number; z: number;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  fx: number; fy: number; fz: number;
  mass: number;
  invMass: number;
  friction: number;
  radius: number;
  fixed?: boolean;
  surfaceNormal?: THREE.Vector3;
  tag?: 'chassis' | 'engine' | 'suspension' | 'wheel' | 'panel' | 'glass';
}

export interface Beam {
  id: number;
  nodeA: number;
  nodeB: number;
  length0: number;
  plasticLength: number;
  k: number;
  c: number;
  yieldStress: number;
  deformLimit: number;
  breakLimit: number;
  state: BeamState;
  type: BeamType;
  hydroRatio?: number;
  currentStress?: number;
}

export interface CollisionMesh {
  type: 'plane' | 'box' | 'cylinder' | 'ramp' | 'heightfield';
  position: THREE.Vector3;
  size?: THREE.Vector3;
  friction: number;
  restitution: number;
  testCollision: (nx: number, ny: number, nz: number, radius: number) => { collided: boolean; pen: number; normX: number; normY: number; normZ: number };
}
