import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { color, float } from 'three/tsl';

export async function createTerrarium(container) {
  console.log(`[terrarium] WebGPU available: ${!!navigator.gpu}`);

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  try {
    await renderer.init();
  } catch (err) {
    console.error('[terrarium] Renderer init failed:', err);
    throw err;
  }
  console.log('[terrarium] Renderer initialized');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e14);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 1, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.minDistance = 3;
  controls.maxDistance = 12;

  // Ground
  const groundMat = new THREE.MeshStandardNodeMaterial();
  groundMat.colorNode = color(0x111111);
  groundMat.roughnessNode = float(0.9);
  groundMat.metalnessNode = float(0.1);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid — brighter so scene isn't pitch black
  const grid = new THREE.GridHelper(10, 20, 0x2a2a4e, 0x1a1a3e);
  grid.position.y = 0.001;
  grid.material.opacity = 0.5;
  grid.material.transparent = true;
  scene.add(grid);

  // Glass walls
  const glassMat = new THREE.MeshStandardNodeMaterial();
  glassMat.colorNode = color(0x88aacc);
  glassMat.roughnessNode = float(0.1);
  glassMat.metalnessNode = float(0.0);
  glassMat.transparent = true;
  glassMat.opacity = 0.12;
  glassMat.side = THREE.DoubleSide;

  const wallGeo = new THREE.PlaneGeometry(4, 3);
  const walls = [
    { pos: [0, 1.5, -2], rot: [0, 0, 0] },
    { pos: [0, 1.5, 2], rot: [0, Math.PI, 0] },
    { pos: [-2, 1.5, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [2, 1.5, 0], rot: [0, -Math.PI / 2, 0] },
  ];
  for (const w of walls) {
    const wall = new THREE.Mesh(wallGeo, glassMat);
    wall.position.set(...w.pos);
    wall.rotation.set(...w.rot);
    scene.add(wall);
  }

  // Lighting — bright enough to see environment
  scene.add(new THREE.HemisphereLight(0x3344aa, 0x111122, 1.0));

  const dir = new THREE.DirectionalLight(0xff6b2b, 1.2);
  dir.position.set(3, 5, 2);
  scene.add(dir);

  scene.add(new THREE.AmbientLight(0x334466, 0.6));

  const innerLight = new THREE.PointLight(0x00ff88, 0.8, 8);
  innerLight.position.set(0, 2, 0);
  scene.add(innerLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, innerLight };
}
