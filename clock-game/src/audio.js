// Sound effects (synthesised with WebAudio - no files to load) and read-aloud voice.

let ctx = null;
const state = { sound: true, voice: true };

export const setSound = (on) => { state.sound = on; };
export const setVoice = (on) => {
  state.voice = on;
  if (!on) stopSpeaking();
};

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.18, slideTo = null } = {}) {
  const ac = audio();
  if (!ac || !state.sound) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5;

export const sfx = {
  /** The hand moved to a new minute: a short wooden "tick". */
  tick(pitch = 1) { tone(900 * pitch, 0, 0.05, { type: 'square', gain: 0.035 }); },
  click() { tone(660, 0, 0.07, { type: 'triangle', gain: 0.12 }); },
  grab() { tone(440, 0, 0.08, { type: 'triangle', gain: 0.1, slideTo: 620 }); },
  correct() {
    [C5, E5, G5, C6].forEach((f, i) => tone(f, i * 0.085, 0.28, { type: 'triangle', gain: 0.16 }));
  },
  // Gentle two-note "boop": discouraging sounds put kids off.
  wrong() {
    tone(330, 0, 0.16, { type: 'sine', gain: 0.16, slideTo: 280 });
    tone(262, 0.15, 0.22, { type: 'sine', gain: 0.16, slideTo: 220 });
  },
  star(i = 0) { tone([C5, E5, G5][i % 3] * 2, 0, 0.4, { type: 'triangle', gain: 0.15 }); },
  win() {
    [C5, C5, G5, E5, G5, C6, E6].forEach((f, i) => tone(f, i * 0.11, 0.34, { type: 'triangle', gain: 0.16 }));
  },
  pop() { tone(500, 0, 0.12, { type: 'sine', gain: 0.14, slideTo: 900 }); },
};

// -------------------------------------------------------------------- voice

let voiceChoice = null;

function pickVoice() {
  if (voiceChoice) return voiceChoice;
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  voiceChoice =
    voices.find((v) => /^en/i.test(v.lang) && /(samantha|karen|google us english|zira|aria|female)/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null;
  return voiceChoice;
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/** Strips tags so lesson HTML can be read aloud. */
export function speak(text) {
  if (!state.voice || !('speechSynthesis' in window) || !text) return;
  try {
    const synth = window.speechSynthesis;
    const clean = text.replace(/<[^>]+>/g, '').replace(/(\d+):(\d\d)/g, '$1 $2').replace(/\s+/g, ' ');
    const say = () => {
      const u = new SpeechSynthesisUtterance(clean);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || 'en-US';
      u.rate = 0.92;
      u.pitch = 1.15;
      synth.speak(u);
    };
    // Chrome can drop an utterance queued right after cancel(), so give it a beat.
    if (synth.speaking || synth.pending) {
      synth.cancel();
      setTimeout(say, 80);
    } else say();
  } catch { /* ignore */ }
}

// Voices load asynchronously in some browsers.
try { window.speechSynthesis?.addEventListener?.('voiceschanged', () => { voiceChoice = null; }); } catch { /* ignore */ }
