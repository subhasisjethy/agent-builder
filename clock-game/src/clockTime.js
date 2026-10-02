// Pure helpers for clock maths. No DOM / WebGL in here so they can be unit-tested.
//
// Conventions
//  - `hour` is stored as 0..11 (0 means "12"); use norm12() / formatDigital() for display.
//  - `minute` is 0..59.
//  - Angles are degrees measured clockwise from 12 o'clock.

export const mod = (n, m) => ((n % m) + m) % m;

/** 0 -> 12, 13 -> 1 ... always returns 1..12 */
export const norm12 = (h) => mod(h, 12) || 12;

export const formatDigital = (h, m) => `${norm12(h)}:${String(m).padStart(2, '0')}`;

export function phrase(h, m) {
  const hr = norm12(h);
  const next = norm12(h + 1);
  if (m === 0) return `${hr} o'clock`;
  if (m === 15) return `quarter past ${hr}`;
  if (m === 30) return `half past ${hr}`;
  if (m === 45) return `quarter to ${next}`;
  if (m < 30) return `${m} ${m % 5 === 0 ? '' : 'minutes '}past ${hr}`;
  const rest = 60 - m;
  return `${rest} ${rest % 5 === 0 ? '' : 'minutes '}to ${next}`;
}

export const hourAngle = (h, m) => (mod(h, 12) + m / 60) * 30;
export const minuteAngle = (m) => m * 6;

/** Angle clockwise from 12 for a point (x right, y up). Result in [0, 360). */
export function angleFromXY(x, y) {
  const a = (Math.atan2(x, y) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}

/** The value equal to `target` (mod 360) that is closest to `ref`. */
export const nearestEquivalent = (target, ref) => target + 360 * Math.round((ref - target) / 360);

export const snap = (v, step) => Math.round(v / step) * step;

/**
 * The minute hand was dragged so that it points at `angle`.
 * Returns the new time. Wrapping past 12 carries into the hour exactly like a real
 * clock does (59 -> 0 moves the hour on by one, and the reverse going backwards).
 */
export function dragMinuteHand(time, angle, step = 1) {
  const target = mod(snap(angle / 6, step), 60);
  let delta = target - time.minute;
  if (delta > 30) delta -= 60;
  if (delta < -30) delta += 60;
  const total = mod(mod(time.hour, 12) * 60 + time.minute + delta, 720);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** The hour hand was dragged to `angle`. The minute stays put; the hour snaps. */
export function dragHourHand(time, angle) {
  const hour = mod(Math.round(angle / 30 - time.minute / 60), 12);
  return { hour, minute: time.minute };
}

export const sameTime = (a, b) => mod(a.hour, 12) === mod(b.hour, 12) && a.minute === b.minute;

/** Smallest angle between the hour and minute hands, 0..180. */
export function handSeparation(h, m) {
  const d = Math.abs(hourAngle(h, m) - minuteAngle(m)) % 360;
  return d > 180 ? 360 - d : d;
}
