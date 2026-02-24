// Terrarium — Three.js WebGPU scene: ground, glass container, lighting

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { color, positionWorld, normalWorld, float, vec3 } from 'three/tsl';

export async function createTerrarium(container) {
  // Renderer
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  container.appendChild(renderer.domElement);

  await renderer.init();

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.08);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 1, 0);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.minDistance = 3;
  controls.maxDistance = 12;

  // Ground plane with grid
  const groundMat = new THREE.MeshStandardNodeMaterial();
  groundMat.colorNode = color(0x111111);
  groundMat.roughnessNode = float(0.9);
  groundMat.metalnessNode = float(0.1);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid overlay
  const grid = new THREE.GridHelper(10, 20, 0x1a1a2e, 0x1a1a2e);
  grid.position.y = 0.001;
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  // Glass container walls (4 sides)
  const glassMat = new THREE.MeshStandardNodeMaterial();
  glassMat.colorNode = color(0x88aacc);
  glassMat.roughnessNode = float(0.1);
  glassMat.metalnessNode = float(0.0);
  glassMat.transparent = true;
  glassMat.opacity = 0.08;
  glassMat.side = THREE.DoubleSide;

  const wallGeo = new THREE.PlaneGeometry(4, 3);
  const wallPositions = [
    { pos: [0, 1.5, -2], rot: [0, 0, 0] },
    { pos: [0, 1.5, 2], rot: [0, Math.PI, 0] },
    { pos: [-2, 1.5, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [2, 1.5, 0], rot: [0, -Math.PI / 2, 0] },
  ];
  for (const w of wallPositions) {
    const wall = new THREE.Mesh(wallGeo, glassMat);
    wall.position.set(...w.pos);
    wall.rotation.set(...w.rot);
    scene.add(wall);
  }

  // Lighting
  const hemi = new THREE.HemisphereLight(0x1a1a3e, 0x0a0a0a, 0.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xff6b2b, 0.8);
  dir.position.set(3, 5, 2);
  scene.add(dir);

  const ambient = new THREE.AmbientLight(0x222244, 0.3);
  scene.add(ambient);

  // Subtle point light inside terrarium
  const innerLight = new THREE.PointLight(0x00ff88, 0.3, 8);
  innerLight.position.set(0, 2, 0);
  scene.add(innerLight);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, innerLight };
}
