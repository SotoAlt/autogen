// Creature — particle cloud that morphs with intelligence level

import * as THREE from 'three/webgpu';
import { color, positionLocal, sin, cos, time, float, vec3, instanceIndex, hash } from 'three/tsl';

const PARTICLE_COUNT = 1000;

export class Creature {
  constructor(scene) {
    this.level = 0;
    this.targetRadius = 2.0;
    this.currentRadius = 2.0;
    this.hue = Math.random();

    // Generate particle positions in a sphere
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random();
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) + 1.5; // center at y=1.5
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // TSL-based material — animated color and size
    const creatureColor = new THREE.Color().setHSL(this.hue, 0.8, 0.6);
    const material = new THREE.PointsNodeMaterial();
    material.colorNode = color(creatureColor).mul(
      sin(time.mul(2.0).add(positionLocal.y.mul(3.0))).mul(0.3).add(0.7)
    );
    material.sizeNode = float(3.0).mul(
      sin(time.add(positionLocal.x.mul(5.0))).mul(0.3).add(0.7)
    );
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;

    this.mesh = new THREE.Points(geometry, material);
    this.mesh.frustumCulled = false;
    this.positionAttr = geometry.getAttribute('position');

    scene.add(this.mesh);
  }

  setLevel(level, params) {
    this.level = level;
    this.targetRadius = params.particleRadius;

    // Update color saturation with level
    const creatureColor = new THREE.Color().setHSL(this.hue, 0.5 + level * 0.15, 0.5 + level * 0.1);
    this.mesh.material.colorNode = color(creatureColor).mul(
      sin(time.mul(2.0).add(positionLocal.y.mul(3.0))).mul(0.3).add(0.7)
    );

    // Size grows more defined at higher levels
    const baseSize = 2.0 + level * 1.0;
    this.mesh.material.sizeNode = float(baseSize).mul(
      sin(time.add(positionLocal.x.mul(5.0))).mul(0.2).add(0.8)
    );
  }

  update(delta) {
    // Smoothly interpolate radius
    this.currentRadius += (this.targetRadius - this.currentRadius) * delta * 2;

    const pos = this.positionAttr.array;
    const base = this.basePositions;
    const t = performance.now() * 0.001;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Base position scaled by current radius
      const bx = base[i3] * this.currentRadius;
      const by = base[i3 + 1];
      const bz = base[i3 + 2] * this.currentRadius;

      // Add organic noise movement
      const noise = Math.sin(t * 1.5 + i * 0.1) * 0.1 * this.currentRadius;
      const drift = Math.cos(t * 0.7 + i * 0.05) * 0.05 * this.currentRadius;

      pos[i3] = bx + noise;
      pos[i3 + 1] = by + Math.sin(t + i * 0.02) * 0.05;
      pos[i3 + 2] = bz + drift;
    }

    this.positionAttr.needsUpdate = true;

    // Gentle rotation
    this.mesh.rotation.y += delta * 0.1;
  }
}
