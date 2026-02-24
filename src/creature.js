import * as THREE from 'three/webgpu';
import { color, positionLocal, sin, time, float } from 'three/tsl';

const DEFAULT_PARTICLE_COUNT = 1000;

/**
 * Visual creature with 4 evolution stages:
 *   L0 Embryo  — scattered flickering particles
 *   L1 Spark   — coalescing sphere, pulsing glow core
 *   L2 Aware   — solid nucleus + orbiting particle ring
 *   L3 Sentient — multi-part body (core + sprite extensions + particle aura)
 */
export class Creature {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.y = 1.5;
    scene.add(this.group);

    this.level = 0;
    this.hue = Math.random();
    this.particleCount = DEFAULT_PARTICLE_COUNT;
    this.overrides = {};

    // Morph animation state
    this.morphProgress = 1.0; // 1 = complete
    this.morphFrom = 0;
    this.morphTo = 0;

    // Heartbeat pulse (set externally)
    this.pulse = 0;

    // Build particle system
    this._buildParticles(this.particleCount);

    // Nucleus mesh (hidden until L2)
    const nucleusGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const nucleusMat = new THREE.MeshStandardNodeMaterial();
    nucleusMat.colorNode = color(new THREE.Color().setHSL(this.hue, 1.0, 0.6));
    nucleusMat.emissiveNode = color(new THREE.Color().setHSL(this.hue, 1.0, 0.4));
    nucleusMat.roughnessNode = float(0.3);
    nucleusMat.metalnessNode = float(0.7);
    this.nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    this.nucleus.visible = false;
    this.group.add(this.nucleus);

    // Extension sprites (hidden until L3)
    this.extensions = [];
    for (let i = 0; i < 4; i++) {
      const spriteMat = new THREE.SpriteMaterial({
        color: new THREE.Color().setHSL(this.hue, 0.8, 0.6),
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.4, 0.8, 1);
      sprite.visible = false;
      this.group.add(sprite);
      this.extensions.push(sprite);
    }
  }

  _buildParticles(count) {
    // Remove old particles if rebuilding
    if (this.points) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
      this.points.material.dispose();
    }

    this.particleCount = count;
    const positions = new Float32Array(count * 3);
    this.basePositions = new Float32Array(count * 3);
    this.targetPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random();
      const i3 = i * 3;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
      this.basePositions[i3] = positions[i3];
      this.basePositions[i3 + 1] = positions[i3 + 1];
      this.basePositions[i3 + 2] = positions[i3 + 2];
      this.targetPositions[i3] = positions[i3];
      this.targetPositions[i3 + 1] = positions[i3 + 1];
      this.targetPositions[i3 + 2] = positions[i3 + 2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const creatureColor = new THREE.Color().setHSL(this.hue, 1.0, 0.7);
    const material = new THREE.PointsNodeMaterial();
    material.colorNode = color(creatureColor).mul(
      sin(time.mul(2.0).add(positionLocal.y.mul(3.0))).mul(0.2).add(0.8),
    );
    material.sizeNode = float(6.0).mul(
      sin(time.add(positionLocal.x.mul(5.0))).mul(0.2).add(0.8),
    );
    material.opacityNode = sin(time.mul(1.5).add(positionLocal.y.mul(4.0))).mul(0.3).add(0.7);
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.positionAttr = geometry.getAttribute('position');
    this.group.add(this.points);
  }

  setLevel(level, params) {
    if (level === this.level && this.morphProgress >= 1.0) return;

    this.morphFrom = this.level;
    this.morphTo = level;
    this.morphProgress = 0;
    this.level = level;

    // Compute target positions for new level shape
    this._computeTargetPositions(level);
    this._updateMaterials(level);
    this._updateVisibility(level);
  }

  _computeTargetPositions(level) {
    const count = this.particleCount;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random();

      switch (level) {
        case 0: {
          // L0: scattered cloud, radius 2.0
          const spread = 2.0;
          this.targetPositions[i3] = r * Math.sin(phi) * Math.cos(theta) * spread;
          this.targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * spread;
          this.targetPositions[i3 + 2] = r * Math.cos(phi) * spread;
          break;
        }
        case 1: {
          // L1: tight sphere shell, radius 0.8
          const shellR = 0.6 + r * 0.4;
          this.targetPositions[i3] = shellR * Math.sin(phi) * Math.cos(theta);
          this.targetPositions[i3 + 1] = shellR * Math.sin(phi) * Math.sin(theta);
          this.targetPositions[i3 + 2] = shellR * Math.cos(phi);
          break;
        }
        case 2: {
          // L2: inner core (30%) + orbital ring (70%)
          if (i < count * 0.3) {
            const coreR = r * 0.25;
            this.targetPositions[i3] = coreR * Math.sin(phi) * Math.cos(theta);
            this.targetPositions[i3 + 1] = coreR * Math.sin(phi) * Math.sin(theta);
            this.targetPositions[i3 + 2] = coreR * Math.cos(phi);
          } else {
            const ringR = 0.8 + r * 0.3;
            const ringAngle = (i / count) * Math.PI * 2;
            const ringY = (Math.random() - 0.5) * 0.15;
            this.targetPositions[i3] = Math.cos(ringAngle) * ringR;
            this.targetPositions[i3 + 1] = ringY;
            this.targetPositions[i3 + 2] = Math.sin(ringAngle) * ringR;
          }
          break;
        }
        case 3: {
          // L3: dense core (20%) + orbital bands (50%) + diffuse aura (30%)
          if (i < count * 0.2) {
            const coreR = r * 0.2;
            this.targetPositions[i3] = coreR * Math.sin(phi) * Math.cos(theta);
            this.targetPositions[i3 + 1] = coreR * Math.sin(phi) * Math.sin(theta);
            this.targetPositions[i3 + 2] = coreR * Math.cos(phi);
          } else if (i < count * 0.7) {
            const band = Math.floor(Math.random() * 3);
            const bandR = 0.5 + band * 0.25;
            const bandAngle = (i / count) * Math.PI * 2;
            const tilt = band * 0.3;
            this.targetPositions[i3] = Math.cos(bandAngle) * bandR;
            this.targetPositions[i3 + 1] = Math.sin(bandAngle) * tilt + (Math.random() - 0.5) * 0.1;
            this.targetPositions[i3 + 2] = Math.sin(bandAngle) * bandR;
          } else {
            const auraR = 1.0 + r * 0.5;
            this.targetPositions[i3] = auraR * Math.sin(phi) * Math.cos(theta);
            this.targetPositions[i3 + 1] = auraR * Math.sin(phi) * Math.sin(theta);
            this.targetPositions[i3 + 2] = auraR * Math.cos(phi);
          }
          break;
        }
      }
    }
  }

  _updateMaterials(level) {
    const creatureColor = new THREE.Color().setHSL(this.hue, 0.6 + level * 0.12, 0.5 + level * 0.1);
    const baseSize = 3.0 + level * 1.5;
    const pulseSpeed = 2.0 + level * 0.5;

    this.points.material.colorNode = color(creatureColor).mul(
      sin(time.mul(pulseSpeed).add(positionLocal.y.mul(3.0))).mul(0.3).add(0.7),
    );
    this.points.material.sizeNode = float(baseSize).mul(
      sin(time.add(positionLocal.x.mul(5.0))).mul(0.2).add(0.8),
    );

    // L0 gets flickering opacity
    if (level === 0) {
      this.points.material.opacityNode = sin(time.mul(8.0).add(positionLocal.y.mul(10.0))).mul(0.4).add(0.4);
    } else {
      this.points.material.opacityNode = sin(time.mul(1.5).add(positionLocal.y.mul(4.0))).mul(0.2).add(0.8);
    }

    // Nucleus color
    if (level >= 2) {
      const nucleusColor = new THREE.Color().setHSL(this.hue, 1.0, 0.5 + level * 0.05);
      this.nucleus.material.colorNode = color(nucleusColor);
      this.nucleus.material.emissiveNode = color(new THREE.Color().setHSL(this.hue, 1.0, 0.3 + level * 0.05));
      this.nucleus.scale.setScalar(level === 3 ? 1.2 : 0.8);
    }

    // Extension sprites color
    for (const sprite of this.extensions) {
      sprite.material.color.setHSL((this.hue + 0.1) % 1, 0.8, 0.6);
    }
  }

  _updateVisibility(level) {
    this.nucleus.visible = level >= 2;
    for (const sprite of this.extensions) {
      sprite.visible = level >= 3;
    }
  }

  setHue(hue) {
    this.hue = hue;
    this._updateMaterials(this.level);
  }

  setParticleCount(count) {
    if (count === this.particleCount) return;
    this._buildParticles(count);
    this._computeTargetPositions(this.level);
    this.morphProgress = 1.0; // skip morph for rebuild
    // Copy targets to base so they appear immediately
    this.basePositions.set(this.targetPositions);
  }

  update(delta) {
    const t = performance.now() * 0.001;

    // Advance morph
    if (this.morphProgress < 1.0) {
      this.morphProgress = Math.min(1.0, this.morphProgress + delta * 0.5); // 2 second morph
      const ease = 1 - Math.pow(1 - this.morphProgress, 3); // ease-out cubic

      // Lerp base positions toward target
      for (let i = 0; i < this.particleCount * 3; i++) {
        this.basePositions[i] += (this.targetPositions[i] - this.basePositions[i]) * ease * delta * 3;
      }
    }

    // Heartbeat pulse modulation
    const pulseScale = 1.0 + this.pulse * 0.15;

    // Update particle positions with animation
    const pos = this.positionAttr.array;
    const base = this.basePositions;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Level-dependent noise
      let noiseAmp, driftAmp;
      switch (this.level) {
        case 0:
          noiseAmp = 0.2;
          driftAmp = 0.15;
          break;
        case 1:
          noiseAmp = 0.08;
          driftAmp = 0.05;
          break;
        case 2:
          noiseAmp = 0.04;
          driftAmp = 0.03;
          break;
        case 3:
          noiseAmp = 0.02;
          driftAmp = 0.02;
          break;
        default:
          noiseAmp = 0.1;
          driftAmp = 0.05;
      }

      const noise = Math.sin(t * 1.5 + i * 0.1) * noiseAmp;
      const drift = Math.cos(t * 0.7 + i * 0.05) * driftAmp;
      const breathe = Math.sin(t + i * 0.02) * 0.03;

      pos[i3] = base[i3] * pulseScale + noise;
      pos[i3 + 1] = base[i3 + 1] * pulseScale + breathe;
      pos[i3 + 2] = base[i3 + 2] * pulseScale + drift;
    }

    this.positionAttr.needsUpdate = true;

    // Nucleus pulse
    if (this.nucleus.visible) {
      const nucleusPulse = 1.0 + Math.sin(t * 3) * 0.05 + this.pulse * 0.2;
      this.nucleus.scale.setScalar((this.level === 3 ? 1.2 : 0.8) * nucleusPulse);
    }

    // Extension sprite orbiting (L3)
    if (this.level >= 3) {
      for (let i = 0; i < this.extensions.length; i++) {
        const angle = t * 0.8 + (i / this.extensions.length) * Math.PI * 2;
        const orbitR = 0.6 + Math.sin(t * 0.5 + i) * 0.1;
        const sprite = this.extensions[i];
        sprite.position.set(
          Math.cos(angle) * orbitR,
          Math.sin(t * 1.2 + i * 1.5) * 0.3,
          Math.sin(angle) * orbitR,
        );
        sprite.material.opacity = 0.4 + this.pulse * 0.3 + Math.sin(t + i) * 0.1;
      }
    }

    // Slow rotation
    this.group.rotation.y += delta * (0.05 + this.level * 0.02);
  }
}
