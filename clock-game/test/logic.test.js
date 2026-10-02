import test from 'node:test';
import assert from 'node:assert/strict';
import {
  angleFromXY, dragHourHand, dragMinuteHand, formatDigital, handSeparation,
  hourAngle, nearestEquivalent, norm12, phrase,
} from '../src/clockTime.js';
import { LEVELS } from '../src/levels.js';
import { makeQuestions, readOptions, starsFor } from '../src/questions.js';

// Deterministic RNG so failures are reproducible.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

test('formatting and phrases', () => {
  assert.equal(formatDigital(0, 5), '12:05');
  assert.equal(formatDigital(3, 30), '3:30');
  assert.equal(norm12(0), 12);
  assert.equal(phrase(3, 0), "3 o'clock");
  assert.equal(phrase(3, 15), 'quarter past 3');
  assert.equal(phrase(3, 30), 'half past 3');
  assert.equal(phrase(3, 45), 'quarter to 4');
  assert.equal(phrase(11, 45), 'quarter to 12');
  assert.equal(phrase(11, 50), '10 to 12');
  assert.equal(phrase(2, 10), '10 past 2');
  assert.equal(phrase(2, 7), '7 minutes past 2');
  assert.equal(phrase(2, 53), '7 minutes to 3');
});

test('hand angles', () => {
  assert.equal(hourAngle(3, 0), 90);
  assert.equal(hourAngle(3, 30), 105);
  assert.equal(hourAngle(0, 0), 0);
  assert.equal(angleFromXY(0, 1), 0); // straight up
  assert.equal(angleFromXY(1, 0), 90); // right = 3 o'clock
  assert.equal(angleFromXY(0, -1), 180);
  assert.equal(angleFromXY(-1, 0), 270);
  assert.equal(nearestEquivalent(10, 355), 370);
  assert.equal(nearestEquivalent(350, 5), -10);
});

test('dragging the minute hand carries into the hour like a real clock', () => {
  let t = { hour: 3, minute: 55 };
  t = dragMinuteHand(t, 0, 5); // pointer swings past 12
  assert.deepEqual(t, { hour: 4, minute: 0 });
  t = dragMinuteHand(t, 330, 5); // and back again (330° = 55 min)
  assert.deepEqual(t, { hour: 3, minute: 55 });
  // wraps the whole way round the 12-hour dial
  assert.deepEqual(dragMinuteHand({ hour: 11, minute: 58 }, 6, 1), { hour: 0, minute: 1 });
  assert.deepEqual(dragMinuteHand({ hour: 0, minute: 1 }, 354, 1), { hour: 11, minute: 59 });
  // snapping
  assert.deepEqual(dragMinuteHand({ hour: 2, minute: 0 }, 93, 5), { hour: 2, minute: 15 });
  assert.deepEqual(dragMinuteHand({ hour: 2, minute: 50 }, 359, 5), { hour: 3, minute: 0 });
});

test('dragging the hour hand keeps the minutes', () => {
  assert.deepEqual(dragHourHand({ hour: 3, minute: 0 }, 150), { hour: 5, minute: 0 });
  // at half past, the hand rests half way between numbers
  assert.deepEqual(dragHourHand({ hour: 3, minute: 30 }, 105), { hour: 3, minute: 30 });
  assert.deepEqual(dragHourHand({ hour: 3, minute: 30 }, 135), { hour: 4, minute: 30 });
  assert.deepEqual(dragHourHand({ hour: 0, minute: 0 }, 355), { hour: 0, minute: 0 });
});

test('read options: unique, include the answer, include the swapped-hands trap', () => {
  const rng = seeded(7);
  for (const level of LEVELS.filter((l) => l.plan.includes('read'))) {
    for (let i = 0; i < 200; i++) {
      const h = 1 + Math.floor(rng() * 12);
      const m = level.minutes[Math.floor(rng() * level.minutes.length)];
      const { options, correctIndex } = readOptions(level, h, m, rng);
      assert.equal(options.length, level.optionCount, level.id);
      assert.equal(new Set(options.map((o) => o.label)).size, options.length, `${level.id} duplicates`);
      assert.equal(options[correctIndex].label, formatDigital(h, m));
    }
  }
  // 3:00 read as "12:15" is the classic mistake
  const o3 = readOptions(LEVELS[1], 3, 0, seeded(1)).options.map((o) => o.label);
  assert.ok(o3.includes('12:15'));
});

test('every level produces a full, sensible round (many random seeds)', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 100; seed++) {
      const qs = makeQuestions(level, seeded(seed));
      assert.equal(qs.length, level.plan.length);
      const seen = new Set();
      for (const q of qs) {
        if (q.type === 'read' || q.type === 'set') {
          const key = `${q.type}:${q.h}:${q.m}`;
          assert.ok(!seen.has(key), `${level.id} repeated ${key}`);
          seen.add(key);
          assert.ok(q.m >= 0 && q.m < 60 && q.h >= 1 && q.h <= 12);
          if (level.minutes) assert.ok(level.minutes.includes(q.m));
        }
        if (q.type === 'set') {
          assert.notEqual(q.start.minute, q.m);
          assert.notEqual(norm12(q.start.hour), norm12(q.h));
        }
        if (q.type === 'identify') assert.ok(handSeparation(q.h, q.m) >= 60);
        if (q.type === 'pointsAt') {
          assert.ok(q.options.includes(q.answer));
          assert.equal(new Set(q.options).size, q.options.length);
          assert.equal(q.options.length, level.optionCount);
          assert.notEqual(q.h, 12);
        }
      }
    }
  }
});

test('star rating always gives at least one star', () => {
  assert.equal(starsFor(0, 6), 1);
  assert.equal(starsFor(3, 6), 2);
  assert.equal(starsFor(5, 6), 3);
  assert.equal(starsFor(6, 6), 3);
});
