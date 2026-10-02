// "Tock", the little chick who cheers you on. Built from primitives; no model files needed.
import {
  AmbientLight, BoxGeometry, CircleGeometry, ConeGeometry, DirectionalLight, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, Scene, SphereGeometry,
} from 'three';

const DEG = Math.PI / 180;

function ball(r, color, sx = 1, sy = 1, sz = 1, rough = 0.55) {
  const m = new Mesh(new SphereGeometry(r, 32, 24), new MeshStandardMaterial({ color, roughness: rough }));
  m.scale.set(sx, sy, sz);
  return m;
}

export class MascotWidget {
  constructor() {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(28, 1, 0.1, 50);
    this.scene.add(new AmbientLight(0xffffff, 2.3));
    const sun = new DirectionalLight(0xffffff, 2.4);
    sun.position.set(-2, 3, 5);
    this.scene.add(sun);

    this.root = new Group();
    this.scene.add(this.root);

    // soft ground shadow
    this.shadow = new Mesh(new CircleGeometry(0.85, 32), new MeshBasicMaterial({ color: '#1c2541', transparent: true, opacity: 0.18, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -1.16;
    this.scene.add(this.shadow);

    this.body = new Group();
    this.root.add(this.body);

    this.body.add(ball(1, '#ffca3a', 1, 1.04, 0.95));
    const belly = ball(0.74, '#fff1b8', 0.95, 0.95, 0.55);
    belly.position.set(0, -0.2, 0.62);
    this.body.add(belly);

    // tuft
    for (const [x, rz, h] of [[-0.12, 0.35, 0.34], [0, 0, 0.42], [0.12, -0.35, 0.34]]) {
      const tuft = new Mesh(new ConeGeometry(0.075, h, 10), new MeshStandardMaterial({ color: '#ff9f1c', roughness: 0.5 }));
      tuft.position.set(x, 1.08, 0.1);
      tuft.rotation.z = rz;
      this.body.add(tuft);
    }

    // face
    this.eyes = [];
    this.pupils = [];
    for (const side of [-1, 1]) {
      const eye = new Group();
      eye.position.set(side * 0.37, 0.3, 0.76);
      const white = ball(0.27, '#ffffff', 1, 1.18, 0.6, 0.3);
      const pupil = ball(0.14, '#22223b', 1, 1.1, 0.7, 0.2);
      pupil.position.z = 0.1;
      const glint = ball(0.045, '#ffffff', 1, 1, 1, 0.1);
      glint.position.set(0.04, 0.06, 0.07);
      pupil.add(glint);
      eye.add(white, pupil);
      this.body.add(eye);
      this.eyes.push(eye);
      this.pupils.push(pupil);

      const cheek = ball(0.15, '#ff8fab', 1.2, 0.8, 0.4);
      cheek.position.set(side * 0.64, -0.06, 0.68);
      cheek.rotation.y = side * 0.5;
      this.body.add(cheek);
    }
    this.brows = [];
    for (const side of [-1, 1]) {
      const brow = new Mesh(new BoxGeometry(0.3, 0.06, 0.05), new MeshStandardMaterial({ color: '#7a4b00', roughness: 0.6 }));
      brow.position.set(side * 0.37, 0.7, 0.8);
      this.body.add(brow);
      this.brows.push({ mesh: brow, side });
    }
    const beak = new Mesh(new ConeGeometry(0.17, 0.34, 20), new MeshStandardMaterial({ color: '#ff7b2c', roughness: 0.45 }));
    beak.rotation.x = Math.PI / 2;
    beak.scale.set(1.25, 1, 0.7);
    beak.position.set(0, 0.02, 0.97);
    this.body.add(beak);

    // wings (pivot at the shoulder)
    this.wings = [];
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(side * 0.93, 0.1, 0.05);
      const wing = ball(0.3, '#ffb703', 0.55, 1.3, 0.75);
      wing.position.y = -0.3;
      pivot.add(wing);
      this.body.add(pivot);
      this.wings.push({ pivot, side });
    }

    // feet
    for (const side of [-1, 1]) {
      const foot = new Mesh(new SphereGeometry(0.2, 16, 12), new MeshStandardMaterial({ color: '#ff7b2c', roughness: 0.5 }));
      foot.scale.set(1.1, 0.4, 1.5);
      foot.position.set(side * 0.38, -1.0, 0.35);
      this.root.add(foot);
    }

    this.t = 0;
    this.mood = 'idle';
    this.moodT = 0;
    this.moodDur = 0;
    this.nextBlink = 2;
    this.blinkT = 1;
    this.look = { x: 0, y: 0, tx: 0, ty: 0 };
  }

  /** Switch mood; it returns to idle by itself after `dur` seconds. */
  setMood(mood, dur = 1.8) {
    this.mood = mood;
    this.moodT = 0;
    this.moodDur = dur;
  }

  /** Eyes follow a point; nx, ny in -1..1. */
  setLook(nx, ny) { this.look.tx = nx; this.look.ty = ny; }

  update(dt) {
    this.t += dt;
    this.moodT += dt;
    if (this.mood !== 'idle' && this.mood !== 'think' && this.moodT > this.moodDur) this.mood = 'idle';
    const t = this.t, mt = this.moodT, mood = this.mood;

    // blink
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blinkT = 0; this.nextBlink = 2.2 + Math.random() * 3; }
    this.blinkT = Math.min(1, this.blinkT + dt * 7);
    let eyeY = this.blinkT < 1 ? Math.max(0.08, Math.abs(Math.cos(this.blinkT * Math.PI))) : 1;

    let y = Math.sin(t * 2.2) * 0.035;
    let rz = 0, ry = 0, rx = 0;
    let wing = 0.12 + Math.sin(t * 2.2) * 0.04; // resting wing angle (rad)
    let browTilt = 0, browY = 0.7;
    let squash = 1;

    if (mood === 'happy') {
      const decay = Math.max(0, 1 - mt / this.moodDur);
      y = Math.abs(Math.sin(mt * 9)) * 0.55 * decay;
      wing = 1.0 + Math.sin(t * 28) * 0.45;
      eyeY = 0.35;
      browY = 0.78;
      squash = 1 - (y < 0.05 ? 0.06 : 0);
      rz = Math.sin(mt * 9) * 0.05;
    } else if (mood === 'sad') {
      const decay = Math.max(0, 1 - mt / this.moodDur);
      ry = Math.sin(mt * 13) * 0.35 * decay;
      rz = 0.1;
      wing = 0.02;
      browTilt = -0.4;
      browY = 0.7;
      y -= 0.05;
    } else if (mood === 'think') {
      rz = 0.17 + Math.sin(t * 1.5) * 0.02;
      browTilt = -0.12;
    } else if (mood === 'wave') {
      wing = 0.12;
    } else if (mood === 'cheer') {
      y = Math.abs(Math.sin(mt * 7)) * 0.4;
      wing = 1.4 + Math.sin(t * 22) * 0.3;
    }

    this.root.position.y = y;
    this.body.scale.set(1 / Math.sqrt(squash), squash * (1 + Math.sin(t * 2.2) * 0.012), 1);
    this.root.rotation.set(rx, ry + Math.sin(t * 0.8) * 0.06, rz);
    const lift = Math.max(0, y);
    this.shadow.scale.setScalar(1 - Math.min(0.45, lift * 0.6));
    this.shadow.material.opacity = 0.18 - Math.min(0.1, lift * 0.15);

    for (const w of this.wings) {
      let a = w.side * wing;
      if (mood === 'wave' && w.side === 1) a = w.side * (2.3 + Math.sin(mt * 11) * 0.35);
      w.pivot.rotation.z = a;
    }
    for (const e of this.eyes) e.scale.y += (eyeY - e.scale.y) * Math.min(1, dt * 30);
    for (const b of this.brows) {
      b.mesh.rotation.z = b.side * browTilt;
      b.mesh.position.y = browY + (mood === 'happy' ? Math.sin(t * 12) * 0.01 : 0);
    }

    // eyes follow the pointer (and look up-left when "thinking")
    const k = Math.min(1, dt * 8);
    const tx = mood === 'think' ? -0.5 : this.look.tx, ty = mood === 'think' ? 0.7 : this.look.ty;
    this.look.x += (tx - this.look.x) * k;
    this.look.y += (ty - this.look.y) * k;
    for (const p of this.pupils) p.position.set(this.look.x * 0.09, this.look.y * 0.07, 0.1);
  }

  render(renderer, rect, canvasH) {
    const aspect = rect.width / rect.height;
    const tan = Math.tan((this.camera.fov * DEG) / 2);
    const visH = Math.max(3.35, 2.75 / aspect);
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0.55, visH / 2 / tan);
    this.camera.updateProjectionMatrix();
    renderer.setViewport(rect.left, canvasH - rect.bottom, rect.width, rect.height);
    renderer.setScissor(rect.left, canvasH - rect.bottom, rect.width, rect.height);
    renderer.setScissorTest(true);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
