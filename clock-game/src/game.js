// Game flow: title -> world map -> lesson -> quiz -> results, plus free play.
import { LEVELS } from './levels.js';
import { formatDigital, mod, phrase, sameTime } from './clockTime.js';
import { makeQuestions, praise, readHint, setHint, starsFor, tryAgain } from './questions.js';
import { setSound, setVoice, sfx, speak, stopSpeaking } from './audio.js';
import { digitalHTML, esc } from './ui.js';

const pickOne = (a) => a[(Math.random() * a.length) | 0];
const AUTO_NEXT_MS = 2900;

export class Game {
  constructor(stage, ui, progress) {
    this.stage = stage;
    this.clock = stage.clock;
    this.mascot = stage.mascot;
    this.ui = ui;
    this.progress = progress;
    this.timers = new Set();
    this.screen = 'title';
    this.themeId = null;
    this.level = LEVELS[0];
    this.levelIdx = 0;
    this.questions = [];
    this.results = [];
    this.qi = 0;
    this.streak = 0;

    setSound(progress.sound);
    setVoice(progress.voice);
    ui.setToggle(ui.el.sound, progress.sound);
    ui.setToggle(ui.el.voice, progress.voice);
    ui.setStars(progress.totalStars);

    this.bindClock();
    this.bindUI();
  }

  // ------------------------------------------------------------------ helpers

  later(fn, ms) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
    this.timers.add(id);
    return id;
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  /** Tock says something (speech bubble + optional voice + mood). */
  say(html, { mood, voice = true } = {}) {
    this.ui.say(html);
    if (html && voice) speak(html);
    if (mood) this.mascot.setMood(mood, mood === 'happy' ? 1.6 : mood === 'sad' ? 1.5 : 2);
  }

  get name() { return this.progress.name; }
  get nameBit() { return this.name ? `, ${esc(this.name)}` : ''; }

  applyTheme(theme, id) {
    if (this.themeId === id) return;
    this.themeId = id;
    const root = document.documentElement.style;
    root.setProperty('--sky-top', theme.skyTop);
    root.setProperty('--sky-bottom', theme.skyBottom);
    this.stage.backdrop.setTheme(theme);
    this.clock.setTheme(theme.rim);
  }

  /** Reset everything the previous screen may have left on the clock. */
  resetClock({ face, wedge = false, snap = 5 } = {}) {
    this.clock.setRealTime(false);
    this.clock.setInteractive('none');
    this.clock.setFocus(null);
    this.clock.setWedge(wedge);
    this.clock.setSnap(snap);
    if (face) this.clock.setFace(face);
  }

  burst(from = 'clock', opts = {}) {
    const r = from === 'clock' ? this.stage.clockRect : this.stage.mascotRect;
    this.stage.confetti.burst(r.left + r.width / 2, r.top + r.height / 2, opts);
  }

  // ------------------------------------------------------------------ wiring

  bindClock() {
    const spot = this.ui.el.clockSpot;
    const clock = this.clock;
    clock.on('change', (time, hand) => {
      sfx.tick(hand === 'minute' ? 1 : 0.7);
      this.onClockChange(time, hand);
    });
    clock.on('grab', () => { sfx.grab(); spot.classList.add('grabbing'); });
    clock.on('release', () => { spot.classList.remove('grabbing'); });
    clock.on('tap', (hand) => this.onTapHand(hand));

    spot.addEventListener('pointerdown', (e) => {
      if (clock.pointerDown(e.clientX, e.clientY, spot.getBoundingClientRect(), e.pointerType === 'touch')) {
        spot.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    spot.addEventListener('pointermove', (e) => {
      const rect = spot.getBoundingClientRect();
      if (clock.drag) { clock.pointerMove(e.clientX, e.clientY, rect); return; }
      // hover cursor
      let cls = '';
      if (clock.mode !== 'none' && !clock.realTime) {
        const p = clock.localPoint(e.clientX, e.clientY, rect);
        if (p && clock.pickHand(p, false)) cls = clock.mode === 'tap' ? 'tap' : 'grab';
      }
      spot.classList.toggle('grab', cls === 'grab');
      spot.classList.toggle('tap', cls === 'tap');
    });
    const end = () => clock.pointerUp();
    spot.addEventListener('pointerup', end);
    spot.addEventListener('pointercancel', end);
    spot.addEventListener('lostpointercapture', end);
  }

  bindUI() {
    const e = this.ui.el;
    const on = (el, fn) => el.addEventListener('click', () => { sfx.click(); fn(); });

    on(document.getElementById('btnPlay'), () => { this.saveName(); this.goMap(); });
    on(document.getElementById('btnFree'), () => { this.saveName(); this.goSandbox(); });
    on(document.getElementById('btnReset'), () => {
      if (confirm('Start again from the beginning? This clears all stars.')) {
        this.progress.reset();
        this.ui.setStars(0);
        e.nameInput.value = '';
        this.goTitle();
      }
    });
    e.nameInput.addEventListener('change', () => this.saveName());
    e.nameInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { this.saveName(); this.goMap(); } });

    on(e.back, () => this.back());
    on(e.lessonNext, () => this.nextLessonStep());
    on(e.lessonSkip, () => this.startQuiz());
    on(e.hint, () => this.showHint());
    on(e.check, () => this.checkSet());
    on(e.next, () => this.nextQuestion());
    on(e.resNext, () => this.startLevel(this.levelIdx + 1));
    on(e.resAgain, () => this.startQuiz());
    on(e.resMap, () => this.goMap());

    e.sound.addEventListener('click', () => {
      this.progress.sound = !this.progress.sound;
      setSound(this.progress.sound);
      this.ui.setToggle(e.sound, this.progress.sound);
      sfx.click();
    });
    e.voice.addEventListener('click', () => {
      this.progress.voice = !this.progress.voice;
      setVoice(this.progress.voice);
      this.ui.setToggle(e.voice, this.progress.voice);
      if (this.progress.voice) speak(this.ui.currentText);
    });
    e.say.addEventListener('click', () => { if (this.progress.voice) speak(this.ui.currentText); else { setVoice(true); speak(this.ui.currentText); setVoice(false); } });

    // Tock giggles when poked.
    e.mascotSpot.addEventListener('click', () => {
      sfx.pop();
      this.mascot.setMood('happy', 1.1);
    });

    // Free play controls
    on(document.getElementById('sbRead'), () => {
      const t = this.clock.time;
      speak(`It is ${phrase(t.hour, t.minute)}. ${formatDigital(t.hour, t.minute).replace(':', ' ')}`);
    });
    on(document.getElementById('sbNow'), () => {
      const d = new Date();
      this.clock.setTime(d.getHours(), d.getMinutes());
      this.updateReadout();
    });
    const face = () => {
      const ticks = e.sbTicks.checked || e.sbNums.checked ? 'minutes' : 'hours';
      this.clock.setFace({ ticks, minuteNumbers: e.sbNums.checked });
      this.clock.setWedge(e.sbWedge.checked);
    };
    for (const c of [e.sbNums, e.sbTicks, e.sbWedge]) c.addEventListener('change', face);

    document.addEventListener('keydown', (ev) => this.onKey(ev));
    window.addEventListener('pointermove', (ev) => {
      const r = this.stage.mascotRect;
      if (!r.width) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      this.mascot.setLook(Math.max(-1, Math.min(1, (ev.clientX - cx) / 300)), Math.max(-1, Math.min(1, -(ev.clientY - cy) / 300)));
    });
  }

  saveName() {
    const v = this.ui.el.nameInput.value.trim();
    if (v !== this.progress.name) this.progress.name = v;
  }

  onKey(ev) {
    if (ev.target instanceof HTMLInputElement && ev.target.type === 'text') return;
    if (this.screen !== 'quiz') return;
    if (/^[1-4]$/.test(ev.key)) {
      const b = this.ui.option(Number(ev.key) - 1);
      if (b && !b.disabled) b.click();
    } else if (ev.key === 'Enter') {
      const { check, next } = this.ui.el;
      if (!next.classList.contains('hidden')) next.click();
      else if (!check.classList.contains('hidden')) check.click();
    }
  }

  back() {
    if (this.screen === 'map') this.goTitle();
    else if (this.screen === 'sandbox') this.goTitle();
    else this.goMap();
  }

  // ------------------------------------------------------------------ title / map / sandbox

  goTitle() {
    this.enter('title');
    this.applyTheme(LEVELS[0].theme, LEVELS[0].id);
    this.resetClock({ face: { ticks: 'minutes', minuteNumbers: false } });
    this.clock.setRealTime(true); // the title clock shows the real time
    this.ui.show('title');
    this.ui.el.nameInput.value = this.progress.name;
    this.say(this.name ? `Hi${this.nameBit}! I'm Tock. Ready to learn the clock?` : "Hi! I'm Tock. Let's learn to read the clock together!", { mood: 'wave', voice: false });
  }

  goMap() {
    this.enter('map');
    this.applyTheme(LEVELS[0].theme, LEVELS[0].id);
    this.resetClock();
    this.ui.setStars(this.progress.totalStars);
    this.ui.renderMap(this.progress, (i) => this.startLevel(i), this.name);
    this.ui.show('map', { title: 'World map' });
    this.say(this.progress.totalStars === 0 ? 'Start with world 1. Tap it!' : 'Where to next?', { mood: 'wave', voice: false });
  }

  goSandbox() {
    this.enter('sandbox');
    this.applyTheme(LEVELS[0].theme, LEVELS[0].id);
    const e = this.ui.el;
    e.sbNums.checked = e.sbTicks.checked = e.sbWedge.checked = false;
    this.resetClock({ face: { ticks: 'hours', minuteNumbers: false }, snap: 1 });
    this.clock.setInteractive('both');
    const d = new Date();
    this.clock.setTime(d.getHours(), d.getMinutes(), true);
    this.ui.show('sandbox', { title: 'Free play' });
    this.updateReadout();
    this.say('Drag the hands to make any time you like! Tap 🔊 to hear it.', { mood: 'happy', voice: false });
  }

  updateReadout() {
    const t = this.clock.time;
    this.ui.renderReadout(t.hour, t.minute, phrase(t.hour, t.minute));
  }

  /** Common reset when entering a screen. */
  enter(screen) {
    this.clearTimers();
    stopSpeaking();
    this.screen = screen;
    this.clock.setFocus(null);
    document.getElementById('side').scrollTop = 0;
  }

  // ------------------------------------------------------------------ levels & lessons

  startLevel(i) {
    if (i >= LEVELS.length || !this.progress.isUnlocked(i)) return this.goMap();
    this.levelIdx = i;
    this.level = LEVELS[i];
    this.applyTheme(this.level.theme, this.level.id);
    this.startLesson();
  }

  startLesson() {
    this.enter('lesson');
    const lvl = this.level;
    this.resetClock({ face: { ticks: lvl.face.ticks, minuteNumbers: lvl.face.minuteNumbers }, wedge: lvl.face.wedge, snap: lvl.snap });
    this.lessonStep = 0;
    this.ui.show('lesson', { title: `${this.levelIdx + 1}. ${lvl.name}` });
    this.clock.setTime(lvl.lesson[0].time[0], lvl.lesson[0].time[1], true);
    this.showLessonStep();
  }

  showLessonStep() {
    const lvl = this.level;
    const step = lvl.lesson[this.lessonStep];
    this.stepDone = !step.try;
    this.clock.setTime(step.time[0], step.time[1]);
    this.clock.setFocus(step.focus ?? null);
    this.clock.setInteractive(step.interactive ?? 'none');
    this.clock.turned = 0;
    this.say(step.text, { mood: this.lessonStep === 0 ? 'wave' : 'idle' });
    this.ui.renderLesson(this.lessonStep, lvl.lesson.length, {
      canNext: this.stepDone,
      last: this.lessonStep === lvl.lesson.length - 1,
      hint: step.try ? '👆 Try it to carry on!' : '',
    });
  }

  nextLessonStep() {
    if (this.lessonStep >= this.level.lesson.length - 1) return this.startQuiz();
    this.lessonStep++;
    this.showLessonStep();
  }

  checkLessonTry() {
    const step = this.level.lesson[this.lessonStep];
    if (this.stepDone || !step.try) return;
    const t = this.clock.time;
    const ok = step.try.type === 'turn'
      ? this.clock.turned >= step.try.minutes
      : sameTime(t, { hour: step.try.target[0], minute: step.try.target[1] });
    if (!ok) return;
    this.stepDone = true;
    this.clock.setFocus(null);
    sfx.correct();
    this.clock.bounce();
    this.clock.ring();
    this.burst('clock', { count: 60, stars: 8 });
    this.say(step.try.doneText, { mood: 'happy' });
    this.ui.renderLesson(this.lessonStep, this.level.lesson.length, {
      canNext: true, last: this.lessonStep === this.level.lesson.length - 1, hint: '',
    });
  }

  // ------------------------------------------------------------------ quiz

  startQuiz() {
    this.enter('quiz');
    const lvl = this.level;
    this.resetClock({ face: { ticks: lvl.face.ticks, minuteNumbers: lvl.face.minuteNumbers }, wedge: lvl.face.wedge, snap: lvl.snap });
    this.questions = makeQuestions(lvl);
    this.results = [];
    this.qi = 0;
    this.streak = 0;
    this.ui.show('quiz', { title: `${this.levelIdx + 1}. ${lvl.name}` });
    this.ui.setStreak(0);
    this.showQuestion();
  }

  get q() { return this.questions[this.qi]; }

  showQuestion() {
    this.clearTimers();
    const q = this.q;
    this.attempts = 0;
    this.answered = false;
    this.ui.renderPips(this.questions.length, this.results, this.qi);
    this.clock.setFocus(null);
    this.mascot.setMood('think', 99);

    const nudge = this.qi === 0 ? "Ready? Here we go!" : null;
    let spoken;
    switch (q.type) {
      case 'read':
        this.clock.setInteractive('none');
        this.clock.setTime(q.h, q.m);
        this.ui.renderQuestion({ prompt: 'What time is it?', options: q.options.map((o) => digitalHTML(o.h, o.m)) }, (i) => this.answerRead(i));
        spoken = 'What time is it?';
        break;
      case 'set':
        this.clock.setInteractive('both');
        this.clock.setTime(q.start.hour, q.start.minute);
        this.ui.renderQuestion({ prompt: 'Set the clock to', target: digitalHTML(q.h, q.m), check: true }, () => {});
        spoken = `Set the clock to ${phrase(q.h, q.m)}`;
        break;
      case 'identify':
        this.clock.setInteractive('tap');
        this.clock.setTime(q.h, q.m);
        this.ui.renderQuestion({ prompt: `Tap the <span class="hl-${q.hand}">${q.hand.toUpperCase()} hand</span>` }, () => {});
        spoken = `Tap the ${q.hand} hand`;
        break;
      case 'pointsAt':
        this.clock.setInteractive('none');
        this.clock.setTime(q.h, 0);
        this.ui.renderQuestion({
          prompt: `Which number is the <span class="hl-hour">HOUR hand</span> pointing at?`,
          options: q.options.map((n) => String(n)), numeric: true,
        }, (i) => this.answerPointsAt(i));
        spoken = 'Which number is the hour hand pointing at?';
        break;
      default:
    }
    this.ui.say(nudge);
    speak(spoken);
  }

  showHint() {
    const q = this.q;
    if (!q || this.answered) return;
    let text;
    if (q.type === 'read') { text = readHint(q.h, q.m); this.clock.setFocus('both'); }
    else if (q.type === 'set') { text = setHint(q.h, q.m); }
    else if (q.type === 'identify') {
      text = q.hand === 'hour' ? 'The <b class="hl-hour">hour hand</b> is the <b>short</b> one.' : 'The <b class="hl-minute">minute hand</b> is the <b>long</b> one.';
      this.clock.setFocus(q.hand);
    } else { text = 'Look at the <b class="hl-hour">short red hand</b>. Which number is it pointing at?'; this.clock.setFocus('hour'); }
    this.say(text, { mood: 'think' });
    this.mascot.setMood('think', 99);
    this.later(() => this.clock.setFocus(null), 3500);
  }

  // ---- answers

  answerRead(i) {
    const q = this.q;
    if (this.answered) return;
    const ok = i === q.correctIndex;
    this.judge(ok, {
      onRight: () => this.ui.markRight(i),
      onWrong: () => this.ui.markWrong(i),
      reveal: () => { this.ui.markRight(q.correctIndex); this.ui.lockOptions(); },
      hint: readHint(q.h, q.m),
      explain: `It's <b>${formatDigital(q.h, q.m)}</b>: ${phrase(q.h, q.m)}.`,
      speakExplain: `It's ${phrase(q.h, q.m)}.`,
    });
  }

  answerPointsAt(i) {
    const q = this.q;
    if (this.answered) return;
    this.judge(q.options[i] === q.answer, {
      onRight: () => this.ui.markRight(i),
      onWrong: () => this.ui.markWrong(i),
      reveal: () => { this.ui.markRight(q.options.indexOf(q.answer)); this.ui.lockOptions(); },
      hint: 'The <b class="hl-hour">short red hand</b> is the one that tells the hour. Which number is it on?',
      explain: `The <b class="hl-hour">hour hand</b> points at <b>${q.answer}</b>.`,
      speakExplain: `The hour hand points at ${q.answer}.`,
    });
  }

  onTapHand(hand) {
    const q = this.q;
    if (this.screen !== 'quiz' || !q || q.type !== 'identify' || this.answered) return;
    const word = (h) => (h === 'hour' ? 'short' : 'long');
    this.judge(hand === q.hand, {
      onRight: () => {},
      onWrong: () => {},
      reveal: () => this.clock.setFocus(q.hand),
      hint: `That's the <b class="hl-${hand}">${hand} hand</b>. Look for the <b>${word(q.hand)}</b> one!`,
      wrongFocus: q.hand,
      explain: `Yes! The <b class="hl-${q.hand}">${q.hand} hand</b> is the <b>${word(q.hand)}</b> one.`,
      speakExplain: `The ${q.hand} hand is the ${word(q.hand)} one.`,
    });
  }

  checkSet() {
    const q = this.q;
    if (this.screen !== 'quiz' || !q || q.type !== 'set' || this.answered) return;
    const t = this.clock.time;
    const hourOk = mod(t.hour, 12) === mod(q.h, 12);
    const minOk = t.minute === q.m;
    let hint;
    let wrongFocus = 'both';
    if (hourOk && !minOk) { hint = 'The <b class="hl-hour">hour hand</b> is right! Now check the <b class="hl-minute">long minute hand</b>.'; wrongFocus = 'minute'; }
    else if (!hourOk && minOk) { hint = 'The <b class="hl-minute">minute hand</b> is right! Now check the <b class="hl-hour">short hour hand</b>.'; wrongFocus = 'hour'; }
    else hint = setHint(q.h, q.m);
    this.judge(hourOk && minOk, {
      onRight: () => this.clock.setInteractive('none'),
      onWrong: () => {},
      reveal: () => { this.clock.setInteractive('none'); this.clock.setTime(q.h, q.m); },
      hint,
      wrongFocus,
      explain: `That's <b>${formatDigital(q.h, q.m)}</b>: ${phrase(q.h, q.m)}.`,
      speakExplain: `That's ${phrase(q.h, q.m)}.`,
    });
  }

  /**
   * Shared scoring: one retry with a hint, then show the answer. Kids always move on.
   * result 1 = right first time, 2 = right second time, 0 = shown the answer.
   */
  judge(ok, { onRight, onWrong, reveal, hint, explain, speakExplain, wrongFocus = null }) {
    this.attempts++;
    if (ok) {
      this.answered = true;
      this.results[this.qi] = this.attempts === 1 ? 1 : 2;
      this.streak = this.attempts === 1 ? this.streak + 1 : 0;
      this.ui.setStreak(this.streak);
      onRight();
      this.ui.renderPips(this.questions.length, this.results, this.qi + 1);
      this.celebrate();
      const line = `${pickOne(praise)} ${explain}`;
      this.ui.say(line);
      speak(`${pickOne(praise)} ${speakExplain}`);
      this.ui.showNext(this.qi === this.questions.length - 1 ? 'Finish ▶' : 'Next ▶');
      this.later(() => this.nextQuestion(), AUTO_NEXT_MS);
      return;
    }
    // wrong
    this.streak = 0;
    this.ui.setStreak(0);
    sfx.wrong();
    this.clock.shake();
    onWrong();
    if (this.attempts === 1) {
      this.say(`${pickOne(tryAgain)} ${hint}`, { mood: 'sad' });
      this.clock.setFocus(wrongFocus);
      this.later(() => this.clock.setFocus(null), 3500);
      return;
    }
    // second miss: show the answer and move on gently
    this.answered = true;
    this.results[this.qi] = 0;
    reveal();
    this.ui.renderPips(this.questions.length, this.results, this.qi + 1);
    this.say(`No worries! ${explain} You'll get the next one!`, { mood: 'idle' });
    this.mascot.setMood('idle');
    this.ui.showNext(this.qi === this.questions.length - 1 ? 'Finish ▶' : 'Next ▶');
  }

  celebrate() {
    sfx.correct();
    this.clock.bounce();
    this.clock.ring();
    this.mascot.setMood('happy', 1.6);
    this.burst('clock', { count: 70, stars: 6 });
    this.burst('mascot', { count: 24, power: 450, angle: -Math.PI / 2, spread: Math.PI });
  }

  nextQuestion() {
    if (this.screen !== 'quiz' || !this.answered) return;
    this.clearTimers();
    if (this.qi >= this.questions.length - 1) return this.finishLevel();
    this.qi++;
    this.showQuestion();
  }

  onClockChange() {
    if (this.screen === 'lesson') this.checkLessonTry();
    else if (this.screen === 'sandbox') this.updateReadout();
  }

  // ------------------------------------------------------------------ results

  finishLevel() {
    this.enter('results');
    this.clock.setInteractive('none');
    const total = this.questions.length;
    const firstTry = this.results.filter((r) => r === 1).length;
    const stars = starsFor(firstTry, total);
    const wasDone = this.progress.allDone;
    this.progress.record(this.level.id, stars);
    this.ui.setStars(this.progress.totalStars);

    const lastLevel = this.levelIdx === LEVELS.length - 1;
    const master = this.progress.allDone && !wasDone;
    let title;
    if (master) title = '🏆 Clock Master!';
    else title = stars === 3 ? (firstTry === total ? 'Perfect!' : 'Fantastic!') : stars === 2 ? 'Great job!' : 'Good try!';
    const text = master
      ? `You finished every world${this.nameBit}! You can read the clock. Tock is SO proud of you!`
      : stars === 3
        ? `${firstTry} out of ${total} right on the first try${this.nameBit}. You're a clock whiz!`
        : `You got ${firstTry} out of ${total} on the first try. ${stars === 2 ? 'So close to 3 stars!' : 'Practice makes perfect. Try again?'}`;
    this.ui.renderResults({
      stars, title, text,
      hasNext: !lastLevel, nextLabel: 'Next world ▶',
    });
    this.ui.show('results', { title: this.level.name });
    this.ui.say(null);
    this.mascot.setMood('happy', 4);
    sfx.win();
    this.stage.confetti.rain(master ? 260 : 140);
    this.ui.revealStars(stars, (i) => { sfx.star(i); this.burst('mascot', { count: 18, power: 380, stars: 3 }); });
    speak(`${title.replace(/[^\w ]/g, '')} ${text.replace(/<[^>]+>/g, '')}`);
  }
}
