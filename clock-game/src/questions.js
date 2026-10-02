// Builds the questions for one round of a level, plus hints and encouragement text.
import { formatDigital, handSeparation, mod, norm12, phrase } from './clockTime.js';

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A time (h in 1..12) from the level's minute pool that has not been used this round yet. */
function pickTime(level, rng, used) {
  for (let i = 0; i < 80; i++) {
    const h = 1 + Math.floor(rng() * 12);
    const m = pick(level.minutes, rng);
    const key = `${h}:${m}`;
    if (!used.has(key)) {
      used.add(key);
      return { h, m };
    }
  }
  return { h: 1 + Math.floor(rng() * 12), m: pick(level.minutes, rng) };
}

/**
 * Wrong answers for a "what time is it?" question. They are chosen to match real
 * mistakes kids make: mixing up the two hands, being one hour out (the hour hand sits
 * *between* numbers), and mis-counting the minutes.
 */
export function readOptions(level, h, m, rng = Math.random) {
  const correct = formatDigital(h, m);
  const seen = new Set([correct]);
  const out = [];
  const add = (hh, mm) => {
    const label = formatDigital(hh, mod(mm, 60));
    if (seen.has(label)) return false;
    seen.add(label);
    out.push({ h: norm12(hh), m: mod(mm, 60), label });
    return true;
  };
  const want = Math.max(2, (level.optionCount ?? 4)) - 1;

  // 1. Swapped hands: read the long hand as the hour and vice-versa.
  if (m % 5 === 0) add(m === 0 ? 12 : m / 5, mod(h, 12) * 5);

  // 2. Hour out by one, then 3. other minute readings from the level.
  const rest = shuffle([[h + 1, m], [h - 1, m]], rng).concat(
    shuffle((level.distract ? level.distract(m) : [0, 15, 30, 45]).map((mm) => [h, mm]), rng),
  );
  for (const [hh, mm] of rest) {
    if (out.length >= want) break;
    add(hh, mm);
  }
  // Safety net: top up with random times.
  while (out.length < want) add(1 + Math.floor(rng() * 12), Math.floor(rng() * 12) * 5);

  const options = shuffle(out.slice(0, want).concat({ h: norm12(h), m, label: correct }), rng);
  return { options, correctIndex: options.findIndex((o) => o.label === correct) };
}

function makeSet(level, rng, used) {
  const { h, m } = pickTime(level, rng, used);
  // Start from a clock where *both* hands need moving, so kids practise both.
  const startMinutes = [0, 15, 30, 45].filter((x) => x !== m);
  let sh;
  do sh = 1 + Math.floor(rng() * 12); while (norm12(sh) === norm12(h));
  return { type: 'set', h, m, start: { hour: mod(sh, 12), minute: pick(startMinutes, rng) } };
}

function makeIdentify(level, rng, used, hand) {
  for (let i = 0; i < 80; i++) {
    const h = 1 + Math.floor(rng() * 12);
    const m = pick([0, 15, 30, 45], rng);
    const key = `${h}:${m}`;
    if (!used.has(key) && handSeparation(h, m) >= 60) {
      used.add(key);
      return { type: 'identify', hand, h, m };
    }
  }
  return { type: 'identify', hand, h: 3, m: 0 };
}

function makePointsAt(level, rng, used) {
  let h;
  do h = 1 + Math.floor(rng() * 11); while (used.has(`p${h}`));
  used.add(`p${h}`);
  const nums = shuffle([h, norm12(h + 1), norm12(h - 1), 12], rng).filter((n, i, a) => a.indexOf(n) === i);
  const options = shuffle([h, ...nums.filter((n) => n !== h).slice(0, (level.optionCount ?? 3) - 1)], rng);
  return { type: 'pointsAt', hand: 'hour', h, m: 0, answer: h, options };
}

export function makeQuestions(level, rng = Math.random) {
  const used = new Set();
  let handFlip = rng() < 0.5;
  return level.plan.map((type) => {
    if (type === 'identify') {
      handFlip = !handFlip;
      return makeIdentify(level, rng, used, handFlip ? 'hour' : 'minute');
    }
    if (type === 'pointsAt') return makePointsAt(level, rng, used);
    if (type === 'set') return makeSet(level, rng, used);
    const { h, m } = pickTime(level, rng, used);
    return { type: 'read', h, m, ...readOptions(level, h, m, rng) };
  });
}

// ---------------------------------------------------------------- text helpers

const numberWord = (m) => (m === 0 ? '12' : String(m / 5));

export function readHint(h, m) {
  if (m === 0) return `The <b class="hl-minute">long hand</b> points at 12, so it is an o'clock time. Which number is the <b class="hl-hour">short hand</b> on?`;
  if (m === 30) return `The <b class="hl-minute">long hand</b> is on the 6: half past! The <b class="hl-hour">short hand</b> has just passed one number. Which one?`;
  if (m === 15) return `The <b class="hl-minute">long hand</b> is on the 3: quarter past. The <b class="hl-hour">short hand</b> has just passed one number. Which one?`;
  if (m === 45) return `The <b class="hl-minute">long hand</b> is on the 9: quarter to. The <b class="hl-hour">short hand</b> is almost at the next number.`;
  if (m % 5 === 0) return `The <b class="hl-minute">long hand</b> is on the ${m / 5}. Count by fives: ${Array.from({ length: m / 5 }, (_, i) => (i + 1) * 5).join(', ')}.`;
  const n = Math.floor(m / 5);
  const marks = m % 5;
  return `Count by fives to the number before the <b class="hl-minute">long hand</b> (${n * 5}), then count ${marks} tiny mark${marks === 1 ? '' : 's'}.`;
}

export function setHint(h, m) {
  let minuteText;
  if (m % 5 === 0) minuteText = `the <b>${numberWord(m)}</b>`;
  else {
    const marks = m % 5;
    minuteText = `${marks} tiny mark${marks === 1 ? '' : 's'} after the <b>${numberWord(Math.floor(m / 5) * 5)}</b>`;
  }
  return `Put the <b class="hl-hour">short red hand</b> on <b>${norm12(h)}</b>. Then put the <b class="hl-minute">long blue hand</b> on ${minuteText}.`;
}

export const praise = ['Awesome!', 'You got it!', 'Super clock reader!', 'Tick-tock-tastic!', 'Brilliant!', 'Yes! Nice one!', 'Wonderful!', 'Right on time!'];
export const tryAgain = ['Almost! Look again.', 'Oops! Have another go.', 'Not quite. You can do it!', 'Hmm, take another look.'];

export const describeTime = (h, m) => ({ digital: formatDigital(h, m), words: phrase(h, m) });

/** Stars for a finished round: always at least one so nobody ends empty-handed. */
export function starsFor(firstTryCorrect, total) {
  const ratio = firstTryCorrect / total;
  if (ratio >= 5 / 6) return 3;
  if (ratio >= 3 / 6) return 2;
  return 1;
}
