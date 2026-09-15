import * as THREE from 'three';
import { SoftBodySolver } from './physics/SoftBodySolver';
import { PowertrainSimulator } from './physics/PowertrainSimulator';
import { EnvironmentManager } from './world/EnvironmentManager';
import { BeamNGInputManager } from './input/BeamNGInputManager';
import { UIManager } from './ui/UIManager';
import { VEHICLE_ROSTER } from './vehicles/VehicleDatabase';
import { VehicleBuilder } from './vehicles/VehicleBuilder';
import { FlexbodyRenderer } from './rendering/FlexbodyRenderer';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  private solver: SoftBodySolver;
  private powertrain: PowertrainSimulator;
  private envManager: EnvironmentManager;
  private inputManager: BeamNGInputManager;
  private uiManager: UIManager;
  private flexbodyRenderer: FlexbodyRenderer | null = null;

  private clock = new THREE.Clock();

  constructor() {
    // 1. Three.js Scene, Camera, and WebGL2 PBR Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0e14);
    this.scene.fog = new THREE.FogExp2(0x0c0e14, 0.0015);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('canvas-container');
    container?.appendChild(this.renderer.domElement);

    // 2. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x222233, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(80, 150, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 400;
    const d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // 3. Subsystems
    this.powertrain = new PowertrainSimulator();
    this.solver = new SoftBodySolver(this.powertrain);
    this.envManager = new EnvironmentManager(this.scene);
    this.envManager.loadMap('proving_grounds');
    this.solver.collisionObjects = this.envManager.collisionObjects;

    this.uiManager = new UIManager(this.solver);

    this.inputManager = new BeamNGInputManager(this.solver, this.camera, this.renderer.domElement, () => {
      const drawer = document.getElementById('pause-drawer');
      if (drawer) {
        drawer.classList.toggle('hidden');
        this.solver.paused = !drawer.classList.contains('hidden');
      }
    });

    // 4. Initial Vehicle Load
    const defaultSpec = VEHICLE_ROSTER[0];
    VehicleBuilder.buildParametricVehicle(defaultSpec, this.solver, 0, 0.6, 0);

    // Create flexbody hull geometry
    const carGeo = new THREE.BoxGeometry(
      defaultSpec.dimensions.width,
      defaultSpec.dimensions.height,
      defaultSpec.dimensions.length,
      8, 6, 12
    );
    this.flexbodyRenderer = new FlexbodyRenderer(carGeo, this.solver, 0xcc2200);
    this.scene.add(this.flexbodyRenderer.mesh);

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate();
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // Input and Physics Update
    this.inputManager.update(dt);

    // Update Visual Deformable Meshes
    if (this.flexbodyRenderer) {
      this.flexbodyRenderer.update();
    }

    // Telemetry & Gauge HUD
    const speedMs = Math.hypot(
      this.solver.nodes[0]?.vx || 0,
      this.solver.nodes[0]?.vz || 0
    );
    this.uiManager.updateHUD(
      speedMs * 3.6,
      this.powertrain.rpm,
      this.powertrain.maxRpm,
      this.powertrain.gearIndex
    );

    this.renderer.render(this.scene, this.camera);
  };
}

// Instantiate on window load
new Application();
