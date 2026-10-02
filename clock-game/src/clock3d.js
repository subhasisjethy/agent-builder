// The 3D alarm clock: model, animation, and drag-the-hands interaction.
//
// The widget owns its own scene + camera and renders into the screen rectangle of a DOM
// element (see Stage), so CSS decides where the clock goes and how big it is.
import {
  AmbientLight, CanvasTexture, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight,
  DoubleSide, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera,
  Plane, Raycaster, RingGeometry, Scene, Shape, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2, Vector3,
  Quaternion, BoxGeometry,
} from 'three';
import {
  angleFromXY, dragHourHand, dragMinuteHand, hourAngle, minuteAngle, mod, nearestEquivalent, norm12,
} from './clockTime.js';

const R = 1.5; // face radius in model units
const HOUR_LEN = 0.8;
const MINUTE_LEN = 1.36;
const HOUR_COLOR = '#ff4d5e';
const MINUTE_COLOR = '#2d7ff9';
const DEG = Math.PI / 180;

const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

// ---------------------------------------------------------------- face texture

function drawFace(canvas, { ticks, minuteNumbers }) {
  const S = canvas.width;
  const c = S / 2;
  const k = S / 1024;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);

  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, S, S);
  // slightly darker outer track the ticks sit on
  ctx.beginPath();
  ctx.arc(c, c, 512 * k, 0, Math.PI * 2);
  ctx.arc(c, c, 458 * k, 0, Math.PI * 2, true);
  ctx.fillStyle = '#f3e8d3';
  ctx.fill('evenodd');

  ctx.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * DEG;
    const five = i % 5 === 0;
    if (ticks !== 'minutes' && !five) continue;
    const sx = Math.sin(a), sy = -Math.cos(a);
    if (ticks === 'hours') {
      ctx.beginPath();
      ctx.arc(c + sx * 484 * k, c + sy * 484 * k, 13 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#2b2d42';
      ctx.fill();
    } else {
      const r1 = (five ? 462 : 480) * k, r2 = 504 * k;
      ctx.beginPath();
      ctx.moveTo(c + sx * r1, c + sy * r1);
      ctx.lineTo(c + sx * r2, c + sy * r2);
      ctx.lineWidth = (five ? 11 : 5) * k;
      ctx.strokeStyle = five ? '#2b2d42' : '#7d869c';
      ctx.stroke();
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (minuteNumbers) {
    ctx.font = `800 ${46 * k}px ${FONT}`;
    ctx.fillStyle = MINUTE_COLOR;
    for (let i = 1; i <= 12; i++) {
      const a = i * 30 * DEG;
      ctx.fillText(String(i === 12 ? 0 : i * 5), c + Math.sin(a) * 418 * k, c - Math.cos(a) * 418 * k + 4 * k);
    }
  }
  const big = minuteNumbers ? 112 : 138;
  const rad = minuteNumbers ? 322 : 366;
  ctx.font = `800 ${big * k}px ${FONT}`;
  ctx.fillStyle = '#2b2d42';
  for (let i = 1; i <= 12; i++) {
    const a = i * 30 * DEG;
    ctx.fillText(String(i), c + Math.sin(a) * rad * k, c - Math.cos(a) * rad * k + big * 0.07 * k);
  }
}

// ---------------------------------------------------------------- hand model

function handGeometry(length, width, tail, tipLen, headHalf) {
  const hw = width / 2;
  const s = new Shape();
  s.moveTo(-hw, -tail + hw);
  s.absarc(0, -tail + hw, hw, Math.PI, Math.PI * 2, false);
  s.lineTo(hw, length - tipLen);
  s.lineTo(headHalf, length - tipLen);
  s.lineTo(0, length);
  s.lineTo(-headHalf, length - tipLen);
  s.lineTo(-hw, length - tipLen);
  s.closePath();
  const g = new ExtrudeGeometry(s, {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: 3, curveSegments: 14,
  });
  g.translate(0, 0, -0.025);
  return g;
}

class Hand {
  constructor(name, { length, width, tail, tipLen, headHalf, color, z }) {
    this.name = name;
    this.length = length;
    this.color = new Color(color);
    this.pivot = new Group();
    this.pivot.position.z = z;
    this.material = new MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05, emissive: color, emissiveIntensity: 0 });
    this.mesh = new Mesh(handGeometry(length, width, tail, tipLen, headHalf), this.material);
    this.mesh.castShadow = true;
    this.pivot.add(this.mesh);

    // A glowing "grab me" ring at the tip, shown when the hand can be dragged.
    this.halo = new Group();
    this.halo.position.set(0, length - 0.02, 0.07);
    this.halo.add(new Mesh(new CircleGeometry(0.27, 40), new MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false })));
    this.halo.add(new Mesh(new RingGeometry(0.2, 0.27, 40), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false })));
    this.halo.visible = false;
    this.pivot.add(this.halo);

    this.angle = 0; // displayed angle (deg, unwrapped)
  }
}

// ---------------------------------------------------------------- the widget

export class ClockWidget {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(26, 1, 0.1, 60);
    this.scene.add(new AmbientLight(0xffffff, 1.7));
    const sun = new DirectionalLight(0xffffff, 2.1);
    sun.position.set(-2.8, 3.6, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 1; sc.far = 16;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.015;
    this.scene.add(sun);

    this.model = new Group();
    this.scene.add(this.model);
    this.build();

    this.time = { hour: 0, minute: 0 };
    this.mode = 'none'; // 'none' | 'minute' | 'both' | 'tap'
    this.snapStep = 5;
    this.focus = null;
    this.realTime = false;
    this.wedge = false;
    this.drag = null;
    this.turned = 0; // total minutes the player has dragged (for the "turn the hand" lesson)
    this.t = 0;
    this.bounceT = 1;
    this.shakeT = 1;
    this.ringT = 0;
    this.listeners = {};

    this.raycaster = new Raycaster();
    this._plane = new Plane();
    this._v = new Vector3();
    this._q = new Quaternion();
    this._n = new Vector3();
    this._ndc = new Vector2();
    this.wedgeAngle = -1;
    this.wedgeKind = '';

    this.faceOpts = { ticks: 'hours', minuteNumbers: false };
    this.setFace(this.faceOpts);
    this.snapToTargets();
    // Re-draw the face once the rounded font has loaded.
    document.fonts?.load?.(`800 100px "Baloo 2"`).then(() => this.setFace(this.faceOpts, true)).catch(() => {});
  }

  on(name, fn) { this.listeners[name] = fn; return this; }
  emit(name, ...a) { this.listeners[name]?.(...a); }

  // ------------------------------------------------------------------ model

  build() {
    const m = this.model;

    this.bodyMat = new MeshStandardMaterial({ color: '#cc7089', roughness: 0.5, metalness: 0.05 });
    this.bezelMat = new MeshStandardMaterial({ color: '#ff8fab', roughness: 0.38, metalness: 0.05 });
    const gold = new MeshStandardMaterial({ color: '#ffd23f', roughness: 0.35, metalness: 0.25 });
    const dark = new MeshStandardMaterial({ color: '#4a4e69', roughness: 0.6 });

    const body = new Mesh(new CylinderGeometry(1.8, 1.8, 0.6, 72), this.bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.3;
    body.castShadow = body.receiveShadow = true;
    m.add(body);

    const bezel = new Mesh(new TorusGeometry(1.66, 0.14, 20, 96), this.bezelMat);
    bezel.castShadow = true;
    m.add(bezel);

    // face
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = this.faceCanvas.height = 1024;
    this.faceTex = new CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = SRGBColorSpace;
    this.faceTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const face = new Mesh(new CircleGeometry(R + 0.04, 96), new MeshStandardMaterial({ map: this.faceTex, roughness: 0.95 }));
    face.position.z = 0.005;
    face.receiveShadow = true;
    m.add(face);

    // "progress slice" teaching aid (blue = minutes past, orange = minutes to)
    this.wedgeMat = new MeshBasicMaterial({ color: MINUTE_COLOR, transparent: true, opacity: 0.28, depthWrite: false, side: DoubleSide });
    this.wedgeMesh = new Mesh(new CircleGeometry(R * 0.995, 4, 0, 0.1), this.wedgeMat);
    this.wedgeMesh.position.z = 0.014;
    this.wedgeMesh.visible = false;
    m.add(this.wedgeMesh);

    // bells, hammer, legs
    this.bells = [];
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(side * 1.12, 1.4, -0.15);
      pivot.rotation.z = -side * 0.62;
      const bell = new Mesh(new SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold);
      bell.scale.set(1, 0.85, 0.85);
      bell.position.y = 0.16;
      bell.castShadow = true;
      const knob = new Mesh(new SphereGeometry(0.1, 16, 12), gold);
      knob.position.y = 0.6;
      const stem = new Mesh(new CylinderGeometry(0.06, 0.06, 0.34, 12), dark);
      stem.position.y = 0.02;
      pivot.add(bell, knob, stem);
      m.add(pivot);
      this.bells.push({ pivot, side, base: -side * 0.62 });
    }
    const hammer = new Mesh(new SphereGeometry(0.13, 16, 12), dark);
    hammer.position.set(0, 1.98, -0.1);
    const hammerStick = new Mesh(new CylinderGeometry(0.035, 0.035, 0.3, 8), dark);
    hammerStick.position.set(0, 1.84, -0.1);
    m.add(hammer, hammerStick);
    for (const side of [-1, 1]) {
      const leg = new Mesh(new ConeGeometry(0.17, 0.62, 16), dark);
      leg.position.set(side * 1.08, -1.58, -0.2);
      leg.rotation.z = side * 0.55;
      leg.castShadow = true;
      m.add(leg);
    }

    // hands
    this.hour = new Hand('hour', { length: HOUR_LEN, width: 0.2, tail: 0.2, tipLen: 0.3, headHalf: 0.2, color: HOUR_COLOR, z: 0.07 });
    this.minute = new Hand('minute', { length: MINUTE_LEN, width: 0.115, tail: 0.24, tipLen: 0.34, headHalf: 0.13, color: MINUTE_COLOR, z: 0.16 });
    m.add(this.hour.pivot, this.minute.pivot);

    this.secondPivot = new Group();
    this.secondPivot.position.z = 0.22;
    const sec = new Mesh(new BoxGeometry(0.035, 1.4, 0.02), new MeshStandardMaterial({ color: '#ff9f1c', roughness: 0.4 }));
    sec.position.y = 0.45;
    sec.castShadow = true;
    this.secondPivot.add(sec);
    this.secondPivot.visible = false;
    m.add(this.secondPivot);

    const cap = new Mesh(new SphereGeometry(0.15, 24, 16), gold);
    cap.position.z = 0.22;
    cap.scale.z = 0.7;
    cap.castShadow = true;
    m.add(cap);
  }

  // ------------------------------------------------------------------ configuration

  setTheme(rim) {
    this.bezelMat.color.set(rim);
    this.bodyMat.color.set(rim).multiplyScalar(0.72);
  }

  setFace(opts, force = false) {
    if (!force && this.faceOpts && opts.ticks === this.faceOpts.ticks && opts.minuteNumbers === this.faceOpts.minuteNumbers && this._faceDrawn) return;
    this.faceOpts = { ...opts };
    drawFace(this.faceCanvas, this.faceOpts);
    this.faceTex.needsUpdate = true;
    this._faceDrawn = true;
  }

  setWedge(on) { this.wedge = on; if (!on) this.wedgeMesh.visible = false; }
  setSnap(step) { this.snapStep = step; }
  setFocus(which) { this.focus = which; }
  setRealTime(on) {
    this.realTime = on;
    this.secondPivot.visible = on;
    if (on) this.setInteractive('none');
  }

  /** 'none' | 'minute' (drag minute hand only) | 'both' (drag either) | 'tap' (tap a hand). */
  setInteractive(mode) {
    this.mode = mode;
    this.drag = null;
    this.hour.halo.visible = mode === 'both';
    this.minute.halo.visible = mode === 'both' || mode === 'minute';
  }

  /** Move the hands (animated unless `instant`). hour is 0..11 or 1..12. */
  setTime(hour, minute, instant = false) {
    this.time = { hour: mod(hour, 12), minute };
    if (instant) this.snapToTargets();
  }

  snapToTargets() {
    this.hour.angle = hourAngle(this.time.hour, this.time.minute);
    this.minute.angle = minuteAngle(this.time.minute);
  }

  /** True once the displayed hands have reached the current time (used by tests). */
  isSettled() {
    const h = nearestEquivalent(hourAngle(this.time.hour, this.time.minute), this.hour.angle);
    const m = nearestEquivalent(minuteAngle(this.time.minute), this.minute.angle);
    return Math.abs(h - this.hour.angle) < 0.3 && Math.abs(m - this.minute.angle) < 0.3;
  }

  bounce() { this.bounceT = 0; }
  shake() { this.shakeT = 0; }
  ring() { this.ringT = 1; }

  // ------------------------------------------------------------------ pointer

  /** Point on the clock face under the pointer, in model coordinates (x right, y up). */
  localPoint(clientX, clientY, rect) {
    this._ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this._ndc, this.camera);
    this.model.updateMatrixWorld(true);
    this.model.getWorldQuaternion(this._q);
    this._n.set(0, 0, 1).applyQuaternion(this._q);
    this.model.getWorldPosition(this._v);
    this._v.addScaledVector(this._n, 0.12);
    this._plane.setFromNormalAndCoplanarPoint(this._n, this._v);
    const hit = this.raycaster.ray.intersectPlane(this._plane, new Vector3());
    if (!hit) return null;
    this.model.worldToLocal(hit);
    return hit;
  }

  canGrab(name) {
    if (this.mode === 'both' || this.mode === 'tap') return true;
    return this.mode === 'minute' && name === 'minute';
  }

  /** Which hand is the pointer on? Prefers grab-rings at the tips, then distance to the hand. */
  pickHand(p, touch) {
    const tol = touch ? 0.42 : 0.32;
    let best = null;
    const radius = Math.hypot(p.x, p.y);
    for (const hand of [this.hour, this.minute]) {
      if (!this.canGrab(hand.name)) continue;
      const a = hand.angle * DEG;
      const dx = Math.sin(a), dy = Math.cos(a);
      const t = Math.min(Math.max(p.x * dx + p.y * dy, 0), hand.length);
      const seg = Math.hypot(p.x - dx * t, p.y - dy * t);
      const tip = Math.hypot(p.x - dx * hand.length, p.y - dy * hand.length);
      const score = Math.min(seg, tip * 0.75);
      if (score < tol && (!best || score < best.score - 0.025 || (Math.abs(score - best.score) <= 0.025 && radius > HOUR_LEN * 1.02 && hand.name === 'minute'))) {
        best = { hand, score };
      }
    }
    return best?.hand ?? null;
  }

  pointerDown(x, y, rect, touch) {
    if (this.mode === 'none' || this.realTime) return false;
    const p = this.localPoint(x, y, rect);
    if (!p) return false;
    const hand = this.pickHand(p, touch);
    if (!hand) return false;
    if (this.mode === 'tap') {
      this.emit('tap', hand.name);
      return false;
    }
    this.drag = { hand: hand.name };
    this.emit('grab', hand.name);
    return true;
  }

  pointerMove(x, y, rect) {
    if (!this.drag) return;
    const p = this.localPoint(x, y, rect);
    if (!p || Math.hypot(p.x, p.y) < 0.14) return;
    const angle = angleFromXY(p.x, p.y);
    const before = this.time;
    const next = this.drag.hand === 'minute'
      ? dragMinuteHand(before, angle, this.snapStep)
      : dragHourHand(before, angle);
    if (next.hour === before.hour && next.minute === before.minute) return;
    let delta = Math.abs(next.minute - before.minute);
    if (delta > 30) delta = 60 - delta;
    if (this.drag.hand === 'minute') this.turned += delta;
    this.time = next;
    this.emit('change', next, this.drag.hand);
  }

  pointerUp() {
    if (!this.drag) return;
    const hand = this.drag.hand;
    this.drag = null;
    this.emit('release', hand);
  }

  // ------------------------------------------------------------------ frame

  update(dt) {
    this.t += dt;
    const t = this.t;

    if (this.realTime) {
      const d = new Date();
      const s = d.getSeconds() + d.getMilliseconds() / 1000;
      const mins = d.getMinutes() + s / 60;
      this.minute.angle = mins * 6;
      this.hour.angle = ((d.getHours() % 12) + mins / 60) * 30;
      this.secondPivot.rotation.z = -s * 6 * DEG;
    } else {
      const fast = this.drag ? 30 : 7;
      const k = 1 - Math.exp(-fast * dt);
      const hTarget = nearestEquivalent(hourAngle(this.time.hour, this.time.minute), this.hour.angle);
      const mTarget = nearestEquivalent(minuteAngle(this.time.minute), this.minute.angle);
      this.hour.angle += (hTarget - this.hour.angle) * k;
      this.minute.angle += (mTarget - this.minute.angle) * k;
    }
    this.hour.pivot.rotation.z = -this.hour.angle * DEG;
    this.minute.pivot.rotation.z = -this.minute.angle * DEG;

    // focus pulse + grab-ring pulse
    for (const hand of [this.hour, this.minute]) {
      const on = this.focus === hand.name || this.focus === 'both';
      const pulse = on ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      hand.material.emissiveIntensity += (pulse * 0.75 - hand.material.emissiveIntensity) * 0.3;
      hand.mesh.scale.x = 1 + pulse * 0.45;
      if (hand.halo.visible) hand.halo.scale.setScalar(1 + 0.12 * Math.sin(t * 5 + (hand.name === 'hour' ? 1.5 : 0)));
    }

    this.updateWedge();

    // idle sway, bounce on success, shake on a wrong answer, bells ringing
    this.bounceT = Math.min(1, this.bounceT + dt * 2.2);
    this.shakeT = Math.min(1, this.shakeT + dt * 2.4);
    this.ringT = Math.max(0, this.ringT - dt * 1.1);
    const bounce = Math.sin(this.bounceT * Math.PI) * (1 - this.bounceT) ;
    this.model.scale.setScalar(1 + bounce * 0.2);
    this.model.position.y = Math.sin(t * 1.6) * 0.045 + bounce * 0.15;
    this.model.rotation.y = Math.sin(t * 0.7) * 0.07;
    this.model.rotation.x = Math.sin(t * 0.9 + 1) * 0.03;
    this.model.rotation.z = Math.sin(this.shakeT * Math.PI * 6) * (1 - this.shakeT) * 0.09;
    for (const b of this.bells) b.pivot.rotation.z = b.base + Math.sin(t * 38) * 0.16 * this.ringT * b.side;
  }

  updateWedge() {
    const m = this.time.minute;
    if (!this.wedge || this.realTime || m === 0) { this.wedgeMesh.visible = false; return; }
    const a = mod(this.minute.angle, 360);
    const past = m <= 30;
    const kind = past ? 'past' : 'to';
    if (Math.abs(a - this.wedgeAngle) < 0.4 && kind === this.wedgeKind) return;
    this.wedgeAngle = a;
    this.wedgeKind = kind;
    const deg = past ? Math.max(a, 0.5) : Math.max(360 - a, 0.5);
    const start = past ? Math.PI / 2 - deg * DEG : Math.PI / 2;
    this.wedgeMesh.geometry.dispose();
    this.wedgeMesh.geometry = new CircleGeometry(R * 0.995, Math.max(4, Math.ceil(deg / 5)), start, deg * DEG);
    this.wedgeMat.color.set(past ? MINUTE_COLOR : '#ff9f1c');
    this.wedgeMesh.visible = true;
  }

  /** Fit the model into a w x h pixel box and render it into the given rect. */
  render(r, rect, canvasH) {
    const aspect = rect.width / rect.height;
    const tan = Math.tan((this.camera.fov * DEG) / 2);
    // model is ~3.9 wide and ~4.7 tall including bells and legs
    const visH = Math.max(4.9, (4.1 * 1.04) / aspect);
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0.05, visH / 2 / tan);
    this.camera.updateProjectionMatrix();

    r.setViewport(rect.left, canvasH - rect.bottom, rect.width, rect.height);
    r.setScissor(rect.left, canvasH - rect.bottom, rect.width, rect.height);
    r.setScissorTest(true);
    r.clearDepth();
    r.render(this.scene, this.camera);
  }

  /** Hand names for the digital readout. */
  get readout() { return { hour: norm12(this.time.hour), minute: this.time.minute }; }
}
