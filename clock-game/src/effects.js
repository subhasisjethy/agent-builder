// Celebration particles (confetti + stars), drawn in screen-pixel space over everything.
import {
  DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D, OrthographicCamera, PlaneGeometry, Color, Scene, Shape, ShapeGeometry,
} from 'three';

const COLORS = ['#ff4d5e', '#ffca3a', '#2d7ff9', '#52d681', '#c77dff', '#ff924c', '#38d6e8'];

function starGeometry() {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return new ShapeGeometry(s);
}

class Layer {
  constructor(scene, geometry, max, mult) {
    this.max = max;
    this.mult = mult;
    this.mesh = new InstancedMesh(geometry, new MeshBasicMaterial({ side: DoubleSide }), max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(35048); // DynamicDrawUsage
    this.items = Array.from({ length: max }, () => ({ life: 0 }));
    this.dummy = new Object3D();
    const hidden = new Object3D();
    hidden.scale.setScalar(0);
    hidden.updateMatrix();
    for (let i = 0; i < max; i++) {
      this.mesh.setMatrixAt(i, hidden.matrix);
      this.mesh.setColorAt(i, new Color('#ffffff'));
    }
    scene.add(this.mesh);
    this.cursor = 0;
    this.dirty = false;
  }

  spawn(p) {
    this.dirty = true;
    const i = this.cursor++ % this.max;
    Object.assign(this.items[i], p, { life: p.ttl });
    this.mesh.setColorAt(i, new Color(p.color));
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt, H) {
    if (!this.dirty) return;
    let alive = false;
    const d = this.dummy;
    const drag = Math.exp(-1.6 * dt);
    for (let i = 0; i < this.max; i++) {
      const p = this.items[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life > 0) alive = true;
      p.vy -= 1500 * dt * this.mult;
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rx += p.vrx * dt;
      p.rz += p.vrz * dt;
      const fade = Math.min(1, p.life / 0.5);
      d.position.set(p.x, H - p.y, 0);
      d.rotation.set(p.rx, 0, p.rz);
      d.scale.set(p.size * fade, p.size * (this.mult === 1 ? 1.6 : 1) * fade, 1);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
      if (p.life <= 0) {
        d.scale.setScalar(0);
        d.updateMatrix();
        this.mesh.setMatrixAt(i, d.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.dirty = alive;
  }
}

export class Confetti {
  constructor() {
    this.scene = new Scene();
    this.camera = new OrthographicCamera(0, 1, 1, 0, -10, 10);
    this.paper = new Layer(this.scene, new PlaneGeometry(1, 1), 360, 1);
    this.stars = new Layer(this.scene, starGeometry(), 80, 0.6);
    this.W = 1;
    this.H = 1;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /** Burst of confetti from a screen point (CSS pixels, y down). */
  burst(x, y, { count = 70, power = 650, spread = Math.PI * 2, angle = -Math.PI / 2, stars = 0 } = {}) {
    const n = this.reduced ? Math.floor(count / 4) : count;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = power * (0.4 + Math.random() * 0.8);
      this.paper.spawn({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rx: Math.random() * 6, rz: Math.random() * 6,
        vrx: (Math.random() - 0.5) * 16, vrz: (Math.random() - 0.5) * 10, size: 7 + Math.random() * 6,
        color: COLORS[(Math.random() * COLORS.length) | 0], ttl: 1.8 + Math.random() * 1.4,
      });
    }
    for (let i = 0; i < stars; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = power * (0.5 + Math.random() * 0.6);
      this.stars.spawn({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rx: 0, rz: Math.random() * 6, vrx: 0, vrz: (Math.random() - 0.5) * 6,
        size: 22 + Math.random() * 20, color: i % 2 ? '#ffd23f' : '#fff3a0', ttl: 1.3 + Math.random() * 0.8,
      });
    }
  }

  /** A continuous shower from the top of the screen (for the results screen). */
  rain(count = 120) {
    for (let i = 0; i < (this.reduced ? count / 4 : count); i++) {
      this.paper.spawn({
        x: Math.random() * this.W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 120, vy: 80 + Math.random() * 200,
        rx: Math.random() * 6, rz: Math.random() * 6, vrx: (Math.random() - 0.5) * 12, vrz: (Math.random() - 0.5) * 8,
        size: 7 + Math.random() * 6, color: COLORS[(Math.random() * COLORS.length) | 0], ttl: 3.5 + Math.random() * 1.5,
      });
    }
  }

  update(dt) {
    this.paper.update(dt, this.H);
    this.stars.update(dt, this.H);
  }

  render(renderer, W, H) {
    this.W = W;
    this.H = H;
    this.camera.right = W;
    this.camera.top = H;
    this.camera.updateProjectionMatrix();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
