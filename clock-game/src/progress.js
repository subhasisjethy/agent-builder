// Saved progress (stars per level, player name, sound settings) in localStorage.
// Every access is wrapped: storage can be unavailable (private mode, file:// quirks).
import { LEVELS } from './levels.js';

const KEY = 'clockQuest.v1';

const blank = () => ({ name: '', stars: {}, sound: true, voice: true });

export class Progress {
  constructor() {
    this.data = blank();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...blank(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    // ?unlock=all lets a parent jump to any level.
    this.unlockAll = new URLSearchParams(location.search).get('unlock') === 'all';
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  get name() { return this.data.name; }
  set name(v) { this.data.name = v.trim().slice(0, 14); this.save(); }

  get sound() { return this.data.sound; }
  set sound(v) { this.data.sound = !!v; this.save(); }
  get voice() { return this.data.voice; }
  set voice(v) { this.data.voice = !!v; this.save(); }

  stars(levelId) { return this.data.stars[levelId] ?? 0; }

  /** Keeps the best result. Returns true if it improved. */
  record(levelId, stars) {
    if (stars <= this.stars(levelId)) return false;
    this.data.stars[levelId] = stars;
    this.save();
    return true;
  }

  get totalStars() { return LEVELS.reduce((sum, l) => sum + this.stars(l.id), 0); }
  get maxStars() { return LEVELS.length * 3; }
  get allDone() { return LEVELS.every((l) => this.stars(l.id) > 0); }

  /** A level opens once the one before it has at least one star. */
  isUnlocked(index) {
    return this.unlockAll || index === 0 || this.stars(LEVELS[index - 1].id) > 0;
  }

  reset() {
    const { sound, voice } = this.data;
    this.data = { ...blank(), sound, voice };
    this.save();
  }
}
