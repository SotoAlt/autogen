import * as THREE from 'three/webgpu';
import { color, positionLocal, sin, time, float, uniform } from 'three/tsl';
import { getIntensity } from './dna.js';

const DEFAULT_PARTICLE_COUNT = 1000;

/**
 * Visual creature with 4 evolution stages + 12 action-driven animations.
 * All actions set animation targets that update() lerps toward.
 */
export class Creature {
  constructor(scene, dna) {
    this.scene = scene;
    this.dna = dna;
    this.group = new THREE.Group();
    this.group.position.y = 1.5;
    scene.add(this.group);

    this.level = 0;
    this.hue = dna.huePrimary;
    this.particleCount = DEFAULT_PARTICLE_COUNT;
    this.overrides = {};

    // Morph animation state
    this.morphProgress = 1.0;
    this.morphFrom = 0;
    this.morphTo = 0;

    // Heartbeat pulse (set externally)
    this.pulse = 0;

    // --- Action animation targets ---
    this.positionOffset = new THREE.Vector3(0, 0, 0);
    this.targetOffset = new THREE.Vector3(0, 0, 0);
    this.emissiveBoost = 0;
    this.targetEmissive = 0;
    this.radiusMultiplier = 1.0;
    this.targetRadius = 1.0;
    this.rotationBoost = 0;
    this.targetRotation = 0;
    this.hueShift = 0;
    this.targetHueShift = 0;
    this.splitOffset = 0;
    this.targetSplit = 0;

    // Energy dimming (1.0 = full, 0.15 = nearly off)
    this.dimming = 1.0;
    this.targetDimming = 1.0;

    // Current action for display
    this.currentAction = null;

    // TSL uniforms — runtime values that update the GPU shader every frame
    this._uEmissiveBoost = uniform(0.0);
    this._uDimming = uniform(1.0);
    this._uRadiusMultiplier = uniform(1.0);

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

  // ─── Action Execution ───────────────────────────────────────

  executeAction(actionData) {
    if (!actionData || !actionData.action) return;
    this.currentAction = actionData;

    const intensity = getIntensity(actionData.intensity ?? 0.5, this.dna);
    const dir = actionData.direction || 'toward';

    switch (actionData.action) {
      case 'drift':
        this._doDrift(intensity, dir);
        break;
      case 'pulse':
        this._doPulse(intensity);
        break;
      case 'absorb':
        this._doAbsorb(intensity);
        break;
      case 'glow':
        this._doGlow(intensity);
        break;
      case 'shrink':
        this._doShrink(intensity);
        break;
      case 'reach':
        this._doReach(intensity, dir);
        break;
      case 'shift_color':
        this._doShiftColor(intensity);
        break;
      case 'spin':
        this._doSpin(intensity);
        break;
      case 'speak':
        this._doSpeak(intensity);
        break;
      case 'morph':
        this._doMorph(intensity);
        break;
      case 'split':
        this._doSplit(intensity);
        break;
      case 'rest':
        this._doRest();
        break;
    }
  }

  _directionToVector(dir) {
    switch (dir) {
      case 'up': return new THREE.Vector3(0, 1, 0);
      case 'down': return new THREE.Vector3(0, -1, 0);
      case 'left': return new THREE.Vector3(-1, 0, 0);
      case 'right': return new THREE.Vector3(1, 0, 0);
      case 'toward': return new THREE.Vector3(0, 0, 1);
      case 'away': return new THREE.Vector3(0, 0, -1);
      default: return new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5),
        (Math.random() - 0.5) * 2,
      ).normalize();
    }
  }

  _doDrift(intensity, dir) {
    const v = this._directionToVector(dir);
    this.targetOffset.copy(v).multiplyScalar(intensity * 0.8);
  }

  _doPulse(intensity) {
    this.pulse = Math.min(1.0, this.pulse + intensity);
    this.targetRadius = 1.0 + intensity * 0.5;
  }

  _doAbsorb(intensity) {
    this.targetRadius = 1.0 - intensity * 0.4;
    this.targetEmissive = intensity * 1.2;
  }

  _doGlow(intensity) {
    this.targetEmissive = intensity * 1.5;
    // Glow fades after 2s (handled in update via decay)
  }

  _doShrink(intensity) {
    this.targetRadius = 1.0 - intensity * 0.4;
  }

  _doReach(intensity, dir) {
    const v = this._directionToVector(dir);
    this.targetOffset.copy(v).multiplyScalar(intensity * 1.2);
    this.targetRadius = 1.0 + intensity * 0.15;
  }

  _doShiftColor(intensity) {
    const range = Math.max(0.15, this.dna.hueShiftRange);
    const shift = (Math.random() - 0.5) * 2 * range;
    this.targetHueShift = shift * intensity;
  }

  _doSpin(intensity) {
    this.targetRotation = intensity * 3.0;
  }

  _doSpeak(intensity) {
    this.targetEmissive = intensity * 1.5;
    this.pulse = Math.min(1.0, this.pulse + intensity * 0.7);
  }

  _doMorph(intensity) {
    // Randomize target positions for particles
    this._randomizeTargetPositions(intensity);
    this.morphProgress = 0;
  }

  _doSplit(intensity) {
    this.targetSplit = intensity * 1.5;
  }

  _doRest() {
    this.targetOffset.set(0, 0, 0);
    this.targetRadius = 0.95;
    this.targetEmissive = -0.2; // dim slightly
    this.targetRotation = 0;
  }

  _randomizeTargetPositions(intensity) {
    const count = this.particleCount;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const jitter = intensity * 0.5;
      this.targetPositions[i3] = this.basePositions[i3] + (Math.random() - 0.5) * jitter;
      this.targetPositions[i3 + 1] = this.basePositions[i3 + 1] + (Math.random() - 0.5) * jitter;
      this.targetPositions[i3 + 2] = this.basePositions[i3 + 2] + (Math.random() - 0.5) * jitter;
    }
  }

  // ─── Particle System ────────────────────────────────────────

  _buildParticles(count) {
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
    const baseColor = color(creatureColor).mul(
      sin(time.mul(2.0).add(positionLocal.y.mul(3.0))).mul(0.2).add(0.8),
    );
    // Emissive boost adds white glow, dimming scales overall brightness
    material.colorNode = baseColor.add(color(0xffffff).mul(this._uEmissiveBoost)).mul(this._uDimming);
    material.sizeNode = float(6.0).mul(
      sin(time.add(positionLocal.x.mul(5.0))).mul(0.2).add(0.8),
    ).mul(this._uRadiusMultiplier);
    material.opacityNode = sin(time.mul(1.5).add(positionLocal.y.mul(4.0))).mul(0.3).add(0.7).mul(this._uDimming);
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
          const spread = 2.0;
          this.targetPositions[i3] = r * Math.sin(phi) * Math.cos(theta) * spread;
          this.targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * spread;
          this.targetPositions[i3 + 2] = r * Math.cos(phi) * spread;
          break;
        }
        case 1: {
          const shellR = 0.6 + r * 0.4;
          this.targetPositions[i3] = shellR * Math.sin(phi) * Math.cos(theta);
          this.targetPositions[i3 + 1] = shellR * Math.sin(phi) * Math.sin(theta);
          this.targetPositions[i3 + 2] = shellR * Math.cos(phi);
          break;
        }
        case 2: {
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
    const effectiveHue = (this.hue + this.hueShift + 1) % 1;
    const creatureColor = new THREE.Color().setHSL(effectiveHue, 0.6 + level * 0.12, 0.5 + level * 0.1);
    const baseSize = 3.0 + level * 1.5;
    const pulseSpeed = 2.0 + level * 0.5;

    const baseColorNode = color(creatureColor).mul(
      sin(time.mul(pulseSpeed).add(positionLocal.y.mul(3.0))).mul(0.3).add(0.7),
    );
    this.points.material.colorNode = baseColorNode.add(color(0xffffff).mul(this._uEmissiveBoost)).mul(this._uDimming);
    this.points.material.sizeNode = float(baseSize).mul(
      sin(time.add(positionLocal.x.mul(5.0))).mul(0.2).add(0.8),
    ).mul(this._uRadiusMultiplier);

    if (level === 0) {
      this.points.material.opacityNode = sin(time.mul(8.0).add(positionLocal.y.mul(10.0))).mul(0.4).add(0.4).mul(this._uDimming);
    } else {
      this.points.material.opacityNode = sin(time.mul(1.5).add(positionLocal.y.mul(4.0))).mul(0.2).add(0.8).mul(this._uDimming);
    }

    if (level >= 2) {
      const nucleusColor = new THREE.Color().setHSL(effectiveHue, 1.0, 0.5 + level * 0.05);
      this.nucleus.material.colorNode = color(nucleusColor);
      this.nucleus.material.emissiveNode = color(new THREE.Color().setHSL(effectiveHue, 1.0, 0.3 + level * 0.05));
      this.nucleus.scale.setScalar(level === 3 ? 1.2 : 0.8);
    }

    for (const sprite of this.extensions) {
      sprite.material.color.setHSL((effectiveHue + 0.1) % 1, 0.8, 0.6);
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

  setDimming(value) {
    this.targetDimming = value;
  }

  setParticleCount(count) {
    if (count === this.particleCount) return;
    this._buildParticles(count);
    this._computeTargetPositions(this.level);
    this.morphProgress = 1.0;
    this.basePositions.set(this.targetPositions);
  }

  update(delta) {
    const t = performance.now() * 0.001;
    const lerpSpeed = 3.0;

    // Lerp animation targets
    this.positionOffset.lerp(this.targetOffset, delta * lerpSpeed);
    this.emissiveBoost += (this.targetEmissive - this.emissiveBoost) * delta * lerpSpeed;
    this.radiusMultiplier += (this.targetRadius - this.radiusMultiplier) * delta * lerpSpeed;
    this.rotationBoost += (this.targetRotation - this.rotationBoost) * delta * 2;
    this.hueShift += (this.targetHueShift - this.hueShift) * delta * 2;
    this.splitOffset += (this.targetSplit - this.splitOffset) * delta * lerpSpeed;
    this.dimming += (this.targetDimming - this.dimming) * delta * 2;

    // Decay targets back to neutral (slower decay so effects last longer)
    this.targetOffset.multiplyScalar(0.98);
    this.targetEmissive *= 0.985;
    this.targetRadius += (1.0 - this.targetRadius) * delta * 0.5;
    this.targetRotation *= 0.95;
    this.targetHueShift *= 0.99;
    this.targetSplit *= 0.97;

    // Push lerped values to GPU uniforms
    this._uEmissiveBoost.value = Math.max(0, this.emissiveBoost);
    this._uDimming.value = this.dimming;
    this._uRadiusMultiplier.value = this.radiusMultiplier;

    // Apply position offset to group
    this.group.position.x = this.positionOffset.x;
    this.group.position.y = 1.5 + this.positionOffset.y;
    this.group.position.z = this.positionOffset.z;

    // Advance morph
    if (this.morphProgress < 1.0) {
      this.morphProgress = Math.min(1.0, this.morphProgress + delta * 0.5);
      const ease = 1 - Math.pow(1 - this.morphProgress, 3);

      for (let i = 0; i < this.particleCount * 3; i++) {
        this.basePositions[i] += (this.targetPositions[i] - this.basePositions[i]) * ease * delta * 3;
      }
    }

    // Heartbeat pulse modulation
    const pulseScale = (1.0 + this.pulse * 0.15) * this.radiusMultiplier;

    // Update particle positions with animation
    const pos = this.positionAttr.array;
    const base = this.basePositions;

    // Split effect: offset half the particles
    const splitX = this.splitOffset;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      let noiseAmp, driftAmp;
      switch (this.level) {
        case 0: noiseAmp = 0.2; driftAmp = 0.15; break;
        case 1: noiseAmp = 0.08; driftAmp = 0.05; break;
        case 2: noiseAmp = 0.04; driftAmp = 0.03; break;
        case 3: noiseAmp = 0.02; driftAmp = 0.02; break;
        default: noiseAmp = 0.1; driftAmp = 0.05;
      }

      const noise = Math.sin(t * 1.5 + i * 0.1) * noiseAmp;
      const drift = Math.cos(t * 0.7 + i * 0.05) * driftAmp;
      const breathe = Math.sin(t + i * 0.02) * 0.03;

      const splitDir = i < this.particleCount / 2 ? 1 : -1;

      pos[i3] = base[i3] * pulseScale + noise + splitDir * splitX;
      pos[i3 + 1] = base[i3 + 1] * pulseScale + breathe;
      pos[i3 + 2] = base[i3 + 2] * pulseScale + drift;
    }

    this.positionAttr.needsUpdate = true;

    // Nucleus pulse + emissive boost
    if (this.nucleus.visible) {
      const nucleusPulse = 1.0 + Math.sin(t * 3) * 0.05 + this.pulse * 0.2;
      const baseScale = this.level === 3 ? 1.2 : 0.8;
      this.nucleus.scale.setScalar(baseScale * nucleusPulse * this.radiusMultiplier);
    }

    // Extension sprite orbiting (L3)
    if (this.level >= 3) {
      for (let i = 0; i < this.extensions.length; i++) {
        const angle = t * (0.8 + this.rotationBoost) + (i / this.extensions.length) * Math.PI * 2;
        const orbitR = 0.6 + Math.sin(t * 0.5 + i) * 0.1;
        const sprite = this.extensions[i];
        sprite.position.set(
          Math.cos(angle) * orbitR,
          Math.sin(t * 1.2 + i * 1.5) * 0.3,
          Math.sin(angle) * orbitR,
        );
        sprite.material.opacity = (0.4 + this.pulse * 0.3 + Math.sin(t + i) * 0.1) * this.dimming;
      }
    }

    // Rotation with boost
    this.group.rotation.y += delta * (0.05 + this.level * 0.02 + this.rotationBoost);

    // Update materials if hue shifted (color requires rebuilding the color node)
    if (Math.abs(this.hueShift) > 0.005) {
      this._updateMaterials(this.level);
    }
  }
}
