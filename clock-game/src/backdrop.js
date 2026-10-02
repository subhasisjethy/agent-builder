// The scenery behind everything: sky objects, hills and a themed set of props per level.
// Rendered full-screen with its own camera; the sky colour itself is a CSS gradient.
import {
  AmbientLight, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute,
  Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Points, PointsMaterial, Scene, Shape,
  ShapeGeometry, SphereGeometry, TorusGeometry, BoxGeometry, CircleGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const std = (color, rough = 0.7) => new MeshStandardMaterial({ color, roughness: rough });

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// ---------------------------------------------------------------- small prop builders

function roundTree(scale = 1, crown = '#4cbb5a', apples = false, rng = Math.random) {
  const g = new Group();
  const trunk = new Mesh(new CylinderGeometry(0.22, 0.32, 1.6, 10), std('#8d5a2b'));
  trunk.position.y = 0.8;
  const top = new Mesh(new SphereGeometry(1.25, 20, 16), std(crown));
  top.position.y = 2.5;
  g.add(trunk, top);
  if (apples) {
    for (let i = 0; i < 7; i++) {
      const a = new Mesh(new SphereGeometry(0.16, 10, 8), std('#ff4040', 0.4));
      const th = rng() * Math.PI * 2, ph = 0.4 + rng() * 1.8;
      a.position.set(Math.sin(ph) * Math.cos(th) * 1.22, 2.5 + Math.cos(ph) * 1.22, Math.sin(ph) * Math.sin(th) * 1.22);
      g.add(a);
    }
  }
  g.scale.setScalar(scale);
  return g;
}

function pine(scale = 1, color = '#2f8f4e') {
  const g = new Group();
  const trunk = new Mesh(new CylinderGeometry(0.2, 0.26, 0.9, 8), std('#7a4b25'));
  trunk.position.y = 0.45;
  g.add(trunk);
  [[1.35, 1.7, 1.2], [1.05, 1.5, 2.2], [0.75, 1.3, 3.1]].forEach(([r, h, y], i) => {
    const c = new Mesh(new ConeGeometry(r, h, 14), std(i % 2 ? color : '#38a35a'));
    c.position.y = y;
    g.add(c);
  });
  g.scale.setScalar(scale);
  return g;
}

function flower(color, rng) {
  const g = new Group();
  const stem = new Mesh(new CylinderGeometry(0.04, 0.04, 0.9, 6), std('#3f9b3f'));
  stem.position.y = 0.45;
  g.add(stem);
  const head = new Group();
  head.position.y = 0.95;
  for (let i = 0; i < 6; i++) {
    const p = new Mesh(new SphereGeometry(0.17, 10, 8), std(color, 0.5));
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
    head.add(p);
  }
  const mid = new Mesh(new SphereGeometry(0.14, 10, 8), std('#ffe066', 0.5));
  mid.position.z = 0.08;
  head.add(mid);
  head.rotation.y = (rng() - 0.5) * 0.8;
  g.add(head);
  return g;
}

function mushroom(scale = 1) {
  const g = new Group();
  const stem = new Mesh(new CylinderGeometry(0.2, 0.26, 0.6, 12), std('#fff3dc'));
  stem.position.y = 0.3;
  const cap = new Mesh(new SphereGeometry(0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#ff5a5f', 0.5));
  cap.position.y = 0.55;
  g.add(stem, cap);
  for (const [x, z] of [[0.2, 0.25], [-0.25, 0.1], [0.05, -0.3]]) {
    const d = new Mesh(new SphereGeometry(0.09, 8, 6), std('#ffffff', 0.5));
    d.position.set(x, 0.95 - (x * x + z * z) * 0.7, z);
    g.add(d);
  }
  g.scale.setScalar(scale);
  return g;
}

function mountain(radius, height, rock, snow = true) {
  const g = new Group();
  const m = new Mesh(new ConeGeometry(radius, height, 7), std(rock, 0.9));
  m.position.y = height / 2;
  g.add(m);
  if (snow) {
    const sh = height * 0.32;
    const cap = new Mesh(new ConeGeometry(radius * 0.32, sh, 7), std('#ffffff', 0.8));
    cap.position.y = height - sh / 2 + 0.02;
    g.add(cap);
  }
  return g;
}

function castle() {
  const g = new Group();
  const stone = std('#f2e6ff', 0.8), roof = std('#ff6b9d', 0.5), door = std('#7a4b25');
  const keep = new Mesh(new BoxGeometry(4, 4.2, 2.6), stone);
  keep.position.y = 2.1;
  g.add(keep);
  const gate = new Mesh(new BoxGeometry(1.3, 1.6, 0.2), door);
  gate.position.set(0, 0.8, 1.35);
  g.add(gate);
  for (const x of [-2.6, 2.6]) {
    const tower = new Mesh(new CylinderGeometry(0.9, 0.95, 5.8, 16), stone);
    tower.position.set(x, 2.9, 0);
    const cone = new Mesh(new ConeGeometry(1.25, 1.9, 16), roof);
    cone.position.set(x, 6.7, 0);
    g.add(tower, cone);
    const flag = new Mesh(new BoxGeometry(0.7, 0.4, 0.04), std('#ffd23f'));
    flag.position.set(x + 0.4, 7.9, 0);
    const pole = new Mesh(new CylinderGeometry(0.03, 0.03, 0.9, 6), std('#4a4e69'));
    pole.position.set(x, 7.9, 0);
    g.add(flag, pole);
  }
  const top = new Mesh(new ConeGeometry(1.5, 1.6, 4), roof);
  top.position.set(0, 5.0, 0);
  top.rotation.y = Math.PI / 4;
  g.add(top);
  return g;
}

function lighthouse() {
  const g = new Group();
  const bands = ['#ff5a5f', '#ffffff', '#ff5a5f', '#ffffff'];
  bands.forEach((c, i) => {
    const s = new Mesh(new CylinderGeometry(0.9 - i * 0.1, 1.0 - i * 0.1, 1.3, 16), std(c));
    s.position.y = 0.65 + i * 1.3;
    g.add(s);
  });
  const lamp = new Mesh(new SphereGeometry(0.55, 16, 12), new MeshBasicMaterial({ color: '#fff3a0' }));
  lamp.position.y = 5.55;
  const cap = new Mesh(new ConeGeometry(0.85, 0.9, 16), std('#4a4e69'));
  cap.position.y = 6.5;
  g.add(lamp, cap);
  return g;
}

function sailboat() {
  const g = new Group();
  const hull = new Mesh(new CylinderGeometry(1.5, 0.9, 0.7, 4), std('#ff7b54', 0.5));
  hull.rotation.y = Math.PI / 4;
  hull.scale.set(1.5, 1, 0.55);
  hull.position.y = 0.35;
  const mast = new Mesh(new CylinderGeometry(0.05, 0.05, 3.4, 8), std('#6b4423'));
  mast.position.y = 2.1;
  const sail = new Shape();
  sail.moveTo(0, 0); sail.lineTo(1.6, 0); sail.lineTo(0, 3);
  const sail1 = new Mesh(new ShapeGeometry(sail), new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: DoubleSide }));
  sail1.position.set(0.1, 0.8, 0);
  const sail2 = new Mesh(new ShapeGeometry(sail), new MeshStandardMaterial({ color: '#ffe066', roughness: 0.6, side: DoubleSide }));
  sail2.scale.x = -0.7; sail2.scale.y = 0.75;
  sail2.position.set(-0.1, 0.8, 0);
  g.add(hull, mast, sail1, sail2);
  return g;
}

/**
 * Merge every mesh under `root` into ONE vertex-coloured mesh. Scenery is static, so this
 * turns hundreds of draw calls into one - important on tablets and older laptops.
 */
const BAKED = { front: null, double: null };
function bake(root, { doubleSided = false } = {}) {
  root.updateMatrixWorld(true);
  const geos = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    const c = o.material.color;
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new BufferAttribute(col, 3));
    geos.push(g);
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const key = doubleSided ? 'double' : 'front';
  BAKED[key] ??= new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: doubleSided ? DoubleSide : 0 });
  return new Mesh(merged, BAKED[key]);
}

let cloudMat = null;
function cloud(rng, scale) {
  const g = new Group();
  const mat = new MeshStandardMaterial({ color: '#ffffff' });
  for (const [x, y, r] of [[0, 0, 1.2], [1.3, -0.15, 1.0], [-1.3, -0.2, 0.9], [0.6, 0.55, 0.9], [-0.5, 0.45, 0.8]]) {
    const s = new Mesh(new SphereGeometry(r * (0.9 + rng() * 0.2), 12, 8), mat);
    s.position.set(x, y, 0);
    s.scale.z = 0.5;
    g.add(s);
  }
  const merged = bake(g).geometry;
  disposeGroup(g);
  cloudMat ??= new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
  const mesh = new Mesh(merged, cloudMat);
  mesh.scale.setScalar(scale);
  return mesh;
}

function disposeGroup(g) {
  g.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
  });
}

// ---------------------------------------------------------------- the backdrop

export class Backdrop {
  constructor() {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 0, 20);
    this.scene.add(new AmbientLight(0xffffff, 2.0));
    const sun = new DirectionalLight(0xffffff, 1.8);
    sun.position.set(-6, 10, 10);
    this.scene.add(sun);

    this.dynamic = new Group();
    this.scene.add(this.dynamic);
    this.anims = [];
    this.clouds = [];
    this.t = 0;
    this.starPoints = null;
  }

  setTheme(theme) {
    this.scene.remove(this.dynamic);
    disposeGroup(this.dynamic);
    this.dynamic = new Group();
    this.scene.add(this.dynamic);
    this.anims = [];
    this.clouds = [];
    const rng = rand(theme.prop.length * 977 + 13);
    const g = this.dynamic;
    this.statics = new Group(); // everything that never moves; baked into one mesh at the end

    // sun / moon
    const sunColor = theme.stars ? '#fff7d6' : '#fff3a0';
    const sun = new Mesh(new CircleGeometry(2.1, 40), new MeshBasicMaterial({ color: sunColor }));
    sun.position.set(-11, 6.4, -30);
    const glow = new Mesh(new CircleGeometry(3.6, 40), new MeshBasicMaterial({ color: sunColor, transparent: true, opacity: 0.28 }));
    glow.position.set(-11, 6.4, -30.1);
    g.add(glow, sun);
    this.anims.push((t) => glow.scale.setScalar(1 + Math.sin(t * 0.8) * 0.06));

    // stars for the evening worlds
    if (theme.stars) {
      const pos = [];
      for (let i = 0; i < 110; i++) pos.push((rng() - 0.5) * 70, 1 + rng() * 17, -35);
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
      this.starPoints = new Points(geo, new PointsMaterial({ color: '#ffffff', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
      g.add(this.starPoints);
      this.anims.push((t) => { this.starPoints.material.opacity = 0.65 + Math.sin(t * 2.2) * 0.3; });
    }

    // clouds
    for (let i = 0; i < 8; i++) {
      const c = cloud(rng, 0.8 + rng() * 0.9);
      c.position.set((rng() - 0.5) * 60, 1.5 + rng() * 8, -14 - rng() * 14);
      c.userData.speed = 0.12 + rng() * 0.25;
      g.add(c);
      this.clouds.push(c);
    }

    this.buildGround(theme, rng);

    g.add(bake(this.statics));
    disposeGroup(this.statics);
    this.statics = null;
  }

  buildGround(theme, rng) {
    const g = this.statics;
    const base = new Color(theme.ground);
    const far = base.clone().lerp(new Color(theme.skyBottom), 0.55);
    const mid = base.clone().lerp(new Color(theme.skyBottom), 0.25);

    if (theme.prop === 'mountain') {
      for (const [x, r, h, z, c] of [
        [-16, 9, 11, -26, '#5d6aa5'], [-2, 11, 14, -30, '#6a76b0'], [15, 10, 12.5, -27, '#5d6aa5'],
        [-8, 7, 8, -20, '#7a86b8'], [8, 7.5, 9, -21, '#7a86b8'], [24, 8, 9.5, -22, '#6a76b0'], [-26, 8, 9, -22, '#6a76b0'],
      ]) {
        const m = mountain(r, h, c);
        m.position.set(x, -9.5, z);
        g.add(m);
      }
    }
    if (theme.prop === 'castle') {
      const c = castle();
      c.position.set(11, -6.7, -16);
      c.scale.setScalar(1.1);
      g.add(c);
    }

    if (theme.prop === 'harbor') {
      this.buildSea(theme);
    } else {
      // rolling hills: far, mid, near layers
      const layers = [
        { z: -22, y: -8.2, c: far, spread: 14, r: [9, 13] },
        { z: -14, y: -7.6, c: mid, spread: 11, r: [7, 10] },
        { z: -6, y: -8.0, c: base, spread: 9, r: [6, 9] },
      ];
      layers.forEach((L, li) => {
        for (let x = -40; x <= 40; x += L.spread) {
          const r = L.r[0] + rng() * (L.r[1] - L.r[0]);
          const h = new Mesh(new SphereGeometry(r, 24, 12), std(li === 2 ? theme.ground2 : L.c, 0.9));
          h.scale.y = 0.42;
          h.position.set(x + (rng() - 0.5) * 3, L.y - rng() * 0.8, L.z);
          g.add(h);
        }
      });
    }

    this.buildProps(theme, rng);
  }

  buildSea(theme) {
    const g = this.dynamic; // animated, so not baked
    const layers = [
      { z: -20, y: -4.8, c: new Color(theme.ground).lerp(new Color(theme.skyBottom), 0.55), amp: 0.25 },
      { z: -12, y: -5.8, c: new Color(theme.ground).lerp(new Color(theme.skyBottom), 0.25), amp: 0.3 },
      { z: -6, y: -6.8, c: new Color(theme.ground), amp: 0.38 },
      { z: -3, y: -8.0, c: new Color(theme.ground2), amp: 0.45 },
    ];
    layers.forEach((L, i) => {
      const s = new Shape();
      s.moveTo(-60, -20);
      for (let x = -60; x <= 60; x += 1) s.lineTo(x, Math.sin(x * 0.75 + i) * L.amp);
      s.lineTo(60, -20);
      s.closePath();
      const m = new Mesh(new ShapeGeometry(s), new MeshStandardMaterial({ color: L.c, roughness: 0.4, side: DoubleSide }));
      m.position.set(0, L.y, L.z);
      g.add(m);
      this.anims.push((t) => {
        m.position.x = Math.sin(t * 0.45 + i * 1.7) * 1.3;
        m.position.y = L.y + Math.sin(t * 0.9 + i) * 0.1;
      });
    });
  }

  buildProps(theme, rng) {
    const g = this.statics;
    const place = (obj, x, y, z, s = 1) => { obj.position.set(x, y, z); obj.scale.multiplyScalar(s); g.add(obj); return obj; };
    // Boats bob, so each one is baked into its own mesh instead of the static scenery.
    const animated = (obj, x, y, z, s, bob) => {
      const holder = new Group();
      holder.add(obj);
      const mesh = bake(holder, { doubleSided: true });
      disposeGroup(holder);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(s);
      this.dynamic.add(mesh);
      this.anims.push((t) => bob(mesh, t));
    };

    switch (theme.prop) {
      case 'meadow': {
        const colors = ['#ff6b9d', '#ffd23f', '#ffffff', '#c77dff', '#ff9f1c'];
        for (let i = 0; i < 40; i++) {
          const near = i % 3 === 0;
          const f = flower(colors[i % colors.length], rng);
          place(f, -26 + rng() * 52, near ? -7.2 : -6.2, near ? -4 : -9, near ? 1.3 : 1.1);
        }
        // rainbow
        ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach((c, i) => {
          const arc = new Mesh(new TorusGeometry(15 - i * 0.7, 0.36, 6, 48, Math.PI), new MeshStandardMaterial({ color: new Color(c).lerp(new Color('#ffffff'), 0.2), roughness: 1 }));
          arc.position.set(11, -8, -32);
          g.add(arc);
        });
        break;
      }
      case 'orchard':
        for (let i = 0; i < 7; i++) {
          const far = i % 2 === 0;
          place(roundTree(1, far ? '#3fae4f' : '#58c35f', true, rng), -24 + i * 8 + rng() * 3, far ? -6.3 : -7.2, far ? -11 : -5, far ? 1.35 : 1.0);
        }
        break;
      case 'harbor':
        animated(sailboat(), -7, -5.3, -9, 1.5, (m, t) => { m.position.y = -5.3 + Math.sin(t * 1.2) * 0.18; m.rotation.z = Math.sin(t * 0.9) * 0.07; });
        animated(sailboat(), 13, -5.4, -15, 1.0, (m, t) => { m.position.y = -5.4 + Math.sin(t * 1.1 + 2) * 0.15; m.rotation.z = Math.sin(t * 0.8 + 1) * 0.06; });
        place(lighthouse(), 20, -7.5, -14, 1.3);
        break;
      case 'castle':
        for (let i = 0; i < 8; i++) place(roundTree(0.8, i % 2 ? '#5fc98a' : '#78d69a', false, rng), -26 + i * 7 + rng() * 2, -6.4, -9, 1);
        break;
      case 'forest':
        for (let i = 0; i < 16; i++) place(pine(0.9 + rng() * 0.6, i % 3 ? '#2f8f4e' : '#3aa65c'), -30 + i * 4 + rng() * 2, -6.2 - (i % 2) * 0.9, -8 - (i % 2) * 5, 1);
        for (let i = 0; i < 6; i++) place(mushroom(0.9 + rng() * 0.6), -22 + i * 9 + rng() * 3, -7.7, -3.5, 1);
        break;
      case 'mountain':
        for (let i = 0; i < 12; i++) place(pine(0.7 + rng() * 0.5, '#2c6e5a'), -28 + i * 5 + rng() * 2, -7.0, -9 - rng() * 3, 1);
        break;
      default:
    }
  }

  update(dt) {
    this.t += dt;
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 32) c.position.x = -32;
    }
    for (const a of this.anims) a(this.t);
  }

  render(renderer, w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
    renderer.render(this.scene, this.camera);
  }
}
