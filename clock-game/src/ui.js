// Thin DOM layer: renders screens and panels. All game rules live in game.js.
import { LEVELS } from './levels.js';
import { formatDigital } from './clockTime.js';

const $ = (id) => document.getElementById(id);

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Hour in red, minute in blue: the same colours as the hands. */
export function digitalHTML(h, m) {
  const [hh, mm] = formatDigital(h, m).split(':');
  return `<span class="d-h">${hh}</span><span class="d-c">:</span><span class="d-m">${mm}</span>`;
}

export class UI {
  constructor() {
    this.app = $('app');
    this.el = {
      back: $('btnBack'), levelTitle: $('levelTitle'), pips: $('pips'), streak: $('streak'), starTotal: $('starTotal'),
      sound: $('btnSound'), voice: $('btnVoice'),
      bubble: $('bubble'), bubbleText: $('bubbleText'), say: $('btnSay'),
      clockSpot: $('clockSpot'), mascotSpot: $('mascotSpot'),
      nameInput: $('nameInput'), nameRow: $('nameRow'),
      mapGrid: $('mapGrid'), mapTitle: $('mapTitle'),
      lessonDots: $('lessonDots'), lessonHint: $('lessonHint'), lessonNext: $('btnLessonNext'), lessonSkip: $('btnLessonSkip'),
      qPrompt: $('qPrompt'), qTarget: $('qTarget'), qOptions: $('qOptions'), hint: $('btnHint'), check: $('btnCheck'), next: $('btnNext'),
      resTitle: $('resTitle'), resStars: $('resStars'), resText: $('resText'), resNext: $('btnResNext'), resAgain: $('btnResAgain'), resMap: $('btnResMap'),
      sbDigital: $('sbDigital'), sbPhrase: $('sbPhrase'), sbNums: $('sbNums'), sbTicks: $('sbTicks'), sbWedge: $('sbWedge'),
    };
    this.currentText = '';
  }

  // ------------------------------------------------------------------ chrome

  /** Switch screen and show the right pieces of the top bar. */
  show(screen, { title = '' } = {}) {
    this.app.dataset.screen = screen;
    const e = this.el;
    const inGame = screen === 'lesson' || screen === 'quiz';
    e.back.classList.toggle('hidden', screen === 'title');
    e.levelTitle.classList.toggle('hidden', screen === 'title');
    e.levelTitle.textContent = title;
    e.pips.classList.toggle('hidden', screen !== 'quiz');
    e.streak.classList.toggle('hidden', screen !== 'quiz');
    e.starTotal.classList.toggle('hidden', screen === 'title' || screen === 'sandbox');
    if (!inGame) e.qOptions.innerHTML = '';
  }

  setStars(n) { this.el.starTotal.querySelector('span').textContent = n; }

  setStreak(n) {
    this.el.streak.querySelector('span').textContent = n;
    this.el.streak.style.opacity = n > 1 ? 1 : 0.45;
  }

  setToggle(btn, on) { btn.setAttribute('aria-pressed', String(on)); }

  /** The speech bubble next to Tock. Pass null to hide it. */
  say(html) {
    const b = this.el.bubble;
    if (!html) {
      b.classList.add('empty');
      this.currentText = '';
      return;
    }
    this.currentText = html;
    this.el.bubbleText.innerHTML = html;
    b.classList.remove('empty');
    b.classList.remove('pop');
    void b.offsetWidth; // restart the animation
    b.classList.add('pop');
  }

  // ------------------------------------------------------------------ map

  renderMap(progress, onPick, name) {
    const e = this.el;
    e.mapTitle.textContent = name ? `Pick a world, ${name}!` : 'Pick a world!';
    const nextIdx = LEVELS.findIndex((l, i) => progress.isUnlocked(i) && progress.stars(l.id) === 0);
    e.mapGrid.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const locked = !progress.isUnlocked(i);
      const stars = progress.stars(lvl.id);
      const b = document.createElement('button');
      b.className = `world${locked ? ' locked' : ''}${i === nextIdx ? ' next' : ''}`;
      b.style.setProperty('--rim', lvl.theme.rim);
      b.disabled = locked;
      b.setAttribute('aria-label', `${lvl.name}${locked ? ' (locked)' : `, ${stars} of 3 stars`}`);
      b.innerHTML =
        `<span class="num">${i + 1}</span><span class="em">${locked ? '🔒' : lvl.emoji}</span>` +
        `<span class="nm">${lvl.name}</span><span class="bl">${lvl.blurb}</span>` +
        `<span class="st">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></span>`;
      b.addEventListener('click', () => onPick(i));
      e.mapGrid.appendChild(b);
    });
  }

  // ------------------------------------------------------------------ lesson

  renderLesson(i, total, { canNext, last, hint }) {
    const e = this.el;
    e.lessonDots.innerHTML = Array.from({ length: total }, (_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('');
    e.lessonHint.textContent = hint || '';
    e.lessonNext.disabled = !canNext;
    e.lessonNext.textContent = last ? "Let's play! ▶" : 'Next ▶';
    e.lessonNext.classList.toggle('bounce', canNext);
  }

  // ------------------------------------------------------------------ quiz

  renderPips(total, results, current) {
    this.el.pips.innerHTML = Array.from({ length: total }, (_, i) => {
      const r = results[i];
      const cls = r === undefined ? (i === current ? 'now' : '') : `p${r}`;
      return `<i class="pip ${cls}"></i>`;
    }).join('');
  }

  /**
   * @param {{prompt:string, target?:string, options?:string[], numeric?:boolean, check?:boolean}} q
   * @param {(index:number)=>void} onPick
   */
  renderQuestion(q, onPick) {
    const e = this.el;
    e.qPrompt.innerHTML = q.prompt;
    e.qTarget.innerHTML = q.target || '';
    e.qOptions.innerHTML = '';
    e.qOptions.classList.toggle('nums', !!q.numeric);
    (q.options || []).forEach((html, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.dataset.index = i;
      b.innerHTML = `<span class="key">${i + 1}</span>${html}`;
      b.addEventListener('click', () => onPick(i));
      e.qOptions.appendChild(b);
    });
    e.check.classList.toggle('hidden', !q.check);
    e.next.classList.add('hidden');
    e.hint.classList.remove('hidden');
    e.hint.disabled = false;
    e.check.disabled = false;
  }

  option(i) { return this.el.qOptions.children[i]; }

  markWrong(i) { this.option(i)?.classList.add('wrong'); }
  markRight(i) { this.option(i)?.classList.add('right'); }
  lockOptions() { [...this.el.qOptions.children].forEach((b) => { b.disabled = true; b.style.pointerEvents = 'none'; }); }

  /** After a question is finished: swap Hint/Check for a Next button. */
  showNext(label = 'Next ▶') {
    const e = this.el;
    e.next.textContent = label;
    e.next.classList.remove('hidden');
    e.next.classList.add('bounce');
    e.check.classList.add('hidden');
    e.hint.classList.add('hidden');
  }

  // ------------------------------------------------------------------ results

  renderResults({ stars, title, text, hasNext, nextLabel }) {
    const e = this.el;
    e.resTitle.textContent = title;
    e.resText.innerHTML = text;
    e.resNext.classList.toggle('hidden', !hasNext);
    e.resNext.textContent = nextLabel;
    e.resStars.innerHTML = [0, 1, 2].map((i) => `<span data-i="${i}" class="${i < stars ? '' : 'off'}">★</span>`).join('');
  }

  /** Pop the earned stars in one at a time; calls onStar(i) as each lands. */
  revealStars(stars, onStar) {
    const spans = [...this.el.resStars.children];
    spans.slice(0, stars).forEach((s, i) => setTimeout(() => { s.classList.add('on'); onStar(i); }, 500 + i * 450));
  }

  // ------------------------------------------------------------------ sandbox

  renderReadout(h, m, words) {
    this.el.sbDigital.innerHTML = digitalHTML(h, m);
    this.el.sbPhrase.textContent = words;
  }
}
