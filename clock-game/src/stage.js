// Owns the WebGL renderer and draws every 3D "widget" into the on-screen rectangle of the
// DOM element it belongs to. CSS decides the layout; the 3D follows it.
import { WebGLRenderer } from 'three';
import { Backdrop } from './backdrop.js';
import { ClockWidget } from './clock3d.js';
import { Confetti } from './effects.js';
import { MascotWidget } from './mascot.js';

const MIN_SIZE = 12;

export class Stage {
  /**
   * @param {HTMLElement} host      element that receives the <canvas>
   * @param {{clock: HTMLElement, mascot: HTMLElement}} spots  DOM boxes the widgets render into
   */
  constructor(host, spots) {
    this.spots = spots;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = true;
    host.appendChild(this.renderer.domElement);

    this.backdrop = new Backdrop();
    this.clock = new ClockWidget(this.renderer);
    this.mascot = new MascotWidget();
    this.confetti = new Confetti();

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.last = performance.now();
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.W, this.H);
  }

  /** The clock's on-screen box (CSS px), used for pointer maths. */
  get clockRect() { return this.spots.clock.getBoundingClientRect(); }
  get mascotRect() { return this.spots.mascot.getBoundingClientRect(); }

  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (document.hidden) return;

    this.backdrop.update(dt);
    this.clock.update(dt);
    this.mascot.update(dt);
    this.confetti.update(dt);

    const r = this.renderer;
    r.clear();
    this.backdrop.render(r, this.W, this.H);
    const cr = this.clockRect;
    if (cr.width > MIN_SIZE && cr.height > MIN_SIZE) this.clock.render(r, cr, this.H);
    const mr = this.mascotRect;
    if (mr.width > MIN_SIZE && mr.height > MIN_SIZE) this.mascot.render(r, mr, this.H);
    this.confetti.render(r, this.W, this.H);
  }
}
